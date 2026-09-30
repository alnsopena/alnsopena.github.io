param(
  [ValidateRange(1, [long]::MaxValue)]
  [long]$ArtifactId
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.IO.Compression.FileSystem
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$repository = 'alnsopena/alnsopena.github.io'
$artifactName = 'weekly-ppt-encrypted'
$apiRoot = "https://api.github.com/repos/$repository"
$thumbprint = 'A4AA3760017B7F02712D520A9E5CFA15F739A3E7'
$driveFolder = 'G:\Unidades compartidas\COSMOS IT & Transformación\2. Project Management Office\Estatus semanal\Borradores automáticos'
$dataFolder = Join-Path $env:LOCALAPPDATA 'CosmosWeeklyPpt'
$statePath = Join-Path $dataFolder 'state.json'
$logPath = Join-Path $dataFolder 'sync.log'
$script:githubToken = $null
$stage = 'inicio'
$workFolder = $null
$driveStaging = $null

[void][IO.Directory]::CreateDirectory($dataFolder)

function Write-Log([string]$message) {
  $line = '{0} {1}' -f ([DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')), $message
  [IO.File]::AppendAllText($logPath, $line + [Environment]::NewLine, [Text.Encoding]::UTF8)
  Write-Output $message
}

function Get-GitCredentialToken {
  $previousInteractive = [Environment]::GetEnvironmentVariable('GCM_INTERACTIVE', 'Process')
  try {
    [Environment]::SetEnvironmentVariable('GCM_INTERACTIVE', 'never', 'Process')
    $request = "protocol=https`nhost=github.com`n`n"
    $lines = @($request | & git -C (Split-Path -Parent $PSScriptRoot) -c credential.interactive=never credential fill 2>$null)
    if ($LASTEXITCODE -ne 0) { return $null }
    foreach ($line in $lines) {
      if ($line.StartsWith('password=')) { return $line.Substring('password='.Length) }
    }
    return $null
  } catch {
    return $null
  } finally {
    [Environment]::SetEnvironmentVariable('GCM_INTERACTIVE', $previousInteractive, 'Process')
  }
}

function New-ApiHeaders {
  $headers = @{
    'Accept' = 'application/vnd.github+json'
    'User-Agent' = 'COSMOS-Weekly-PPT-Sync'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  if ($script:githubToken) { $headers['Authorization'] = "Bearer $script:githubToken" }
  return $headers
}

function Get-GitHubJson([string]$uri) {
  try {
    return Invoke-RestMethod -Method Get -Uri $uri -Headers (New-ApiHeaders) -TimeoutSec 90
  } catch {
    $response = $_.Exception.Response
    if ($script:githubToken -and $response -and [int]$response.StatusCode -eq 401) {
      $script:githubToken = $null
      return Invoke-RestMethod -Method Get -Uri $uri -Headers (New-ApiHeaders) -TimeoutSec 90
    }
    throw
  }
}

function Assert-EligibleArtifact($artifact) {
  if (-not $artifact -or $artifact.name -cne $artifactName -or $artifact.expired -or -not $artifact.workflow_run.id) {
    throw 'El artefacto indicado no está disponible con el nombre esperado.'
  }
  $run = Get-GitHubJson "$apiRoot/actions/runs/$($artifact.workflow_run.id)"
  if ($run.status -cne 'completed' -or $run.conclusion -cne 'success' -or
      $run.head_branch -cne 'main' -or $run.repository.full_name -cne $repository) {
    throw 'El artefacto no pertenece a una ejecución exitosa de main.'
  }
  return $artifact
}

function Get-VerifiedStateId {
  if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) { return [long]0 }
  try {
    $state = [IO.File]::ReadAllText($statePath) | ConvertFrom-Json
    if ([long]$state.artifact_id -le 0 -or
        $state.file_name -cnotmatch '^Portafolio_Proyectos_Borrador_[0-9]{8}_[0-9]{4}(?:_[0-9]+)?\.pptx$' -or
        $state.sha256 -cnotmatch '^[A-F0-9]{64}$') { return [long]0 }
    $file = Join-Path $driveFolder $state.file_name
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { return [long]0 }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash -cne $state.sha256) { return [long]0 }
    return [long]$state.artifact_id
  } catch {
    return [long]0
  }
}

function Find-Artifacts([long]$minimumId) {
  if ($ArtifactId -gt 0) {
    return @(Assert-EligibleArtifact (Get-GitHubJson "$apiRoot/actions/artifacts/$ArtifactId"))
  }
  $cutoff = [DateTime]::UtcNow.AddDays(-90)
  $eligible = New-Object 'System.Collections.Generic.List[object]'
  for ($page = 1; $page -le 20; $page++) {
    $result = Get-GitHubJson "$apiRoot/actions/artifacts?name=$artifactName&per_page=100&page=$page"
    $artifacts = @($result.artifacts | Where-Object { $_ -and $_.name -ceq $artifactName -and -not $_.expired } |
      Sort-Object -Property id -Descending)
    $allOlder = $artifacts.Count -gt 0
    foreach ($artifact in $artifacts) {
      if ([DateTimeOffset]::Parse($artifact.created_at).UtcDateTime -lt $cutoff) { continue }
      $allOlder = $false
      if ([long]$artifact.id -le $minimumId) { continue }
      if (-not $artifact.workflow_run.id) { continue }
      $run = Get-GitHubJson "$apiRoot/actions/runs/$($artifact.workflow_run.id)"
      if ($run.status -ceq 'completed' -and $run.conclusion -ceq 'success' -and
          $run.head_branch -ceq 'main' -and $run.repository.full_name -ceq $repository) {
        $eligible.Add($artifact)
      }
    }
    if (@($result.artifacts).Count -lt 100 -or $allOlder) { break }
  }
  return @($eligible | Sort-Object -Property id)
}

function Download-Artifact([long]$id, [string]$destination) {
  $uri = "$apiRoot/actions/artifacts/$id/zip"
  $location = $null
  for ($attempt = 0; $attempt -lt 2; $attempt++) {
    $request = [Net.HttpWebRequest][Net.WebRequest]::Create($uri)
    $request.Method = 'GET'
    $request.AllowAutoRedirect = $false
    $request.Timeout = 90000
    $request.UserAgent = 'COSMOS-Weekly-PPT-Sync'
    $request.Accept = 'application/vnd.github+json'
    $request.Headers.Add('X-GitHub-Api-Version', '2022-11-28')
    if ($script:githubToken) { $request.Headers.Add('Authorization', "Bearer $script:githubToken") }
    $response = $null
    try {
      try { $response = [Net.HttpWebResponse]$request.GetResponse() }
      catch [Net.WebException] {
        if ($_.Exception.Response) { $response = [Net.HttpWebResponse]$_.Exception.Response }
        else { throw }
      }
      $status = [int]$response.StatusCode
      if ($status -eq 302) { $location = $response.Headers['Location']; break }
      if ($script:githubToken -and ($status -eq 401 -or $status -eq 403)) {
        $script:githubToken = $null
        continue
      }
      throw 'GitHub no autorizó la descarga del artefacto.'
    } finally {
      if ($response) { $response.Close() }
    }
  }
  $signedUri = $null
  if (-not [Uri]::TryCreate($location, [UriKind]::Absolute, [ref]$signedUri) -or
      $signedUri.Scheme -cne 'https' -or $signedUri.UserInfo) {
    throw 'GitHub devolvió una dirección de descarga inválida.'
  }
  # The signed URL is downloaded without the GitHub token. Never log this URL.
  Invoke-WebRequest -Method Get -Uri $signedUri -OutFile $destination -UseBasicParsing `
    -Headers @{ 'User-Agent' = 'COSMOS-Weekly-PPT-Sync' } -TimeoutSec 180 | Out-Null
  if ((Get-Item -LiteralPath $destination).Length -lt 100) {
    throw 'El ZIP del artefacto está vacío o incompleto.'
  }
}

function Read-EncryptedPpt([string]$zipPath, [string]$cmsPath) {
  $archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $files = @($archive.Entries | Where-Object { $_.Name })
    if ($files.Count -ne 1 -or $files[0].FullName -cne $files[0].Name -or
        $files[0].Name -cnotmatch '^Portafolio_Proyectos_Borrador_[0-9]{8}_[0-9]{4}(?:_[0-9]+)?\.pptx\.cms$') {
      throw 'El artefacto debe contener exactamente un PPTX cifrado con el nombre esperado.'
    }
    $entry = $files[0]
    if ($entry.Length -lt 100 -or $entry.Length -gt 100MB) {
      throw 'El PPTX cifrado tiene un tamaño inesperado.'
    }
    $inputStream = $entry.Open()
    $outputStream = [IO.File]::Open($cmsPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $inputStream.CopyTo($outputStream) }
    finally { $outputStream.Dispose(); $inputStream.Dispose() }
    return $entry.Name.Substring(0, $entry.Name.Length - '.cms'.Length)
  } finally {
    $archive.Dispose()
  }
}

function Decrypt-Ppt([string]$cmsPath, $certificate) {
  $cms = New-Object Security.Cryptography.Pkcs.EnvelopedCms
  $cms.Decode([IO.File]::ReadAllBytes($cmsPath))
  $certificates = New-Object Security.Cryptography.X509Certificates.X509Certificate2Collection
  [void]$certificates.Add($certificate)
  $cms.Decrypt($certificates)
  $plain = $cms.ContentInfo.Content
  if (-not $plain -or $plain.Length -lt 1000 -or $plain.Length -gt 100MB -or
      $plain[0] -ne 0x50 -or $plain[1] -ne 0x4B -or $plain[2] -ne 0x03 -or $plain[3] -ne 0x04) {
    throw 'El contenido descifrado no parece un PPTX válido.'
  }
  return ,$plain
}

function Get-BytesSha256([byte[]]$bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '') }
  finally { $sha.Dispose() }
}

function Remove-TemporaryFiles([string]$folder, [string]$staging) {
  if ($staging -and (Test-Path -LiteralPath $staging -PathType Leaf)) {
    Remove-Item -LiteralPath $staging -Force -ErrorAction SilentlyContinue
  }
  if ($folder) {
    foreach ($temporary in @('artifact.zip', 'presentation.cms')) {
      $file = Join-Path $folder $temporary
      if (Test-Path -LiteralPath $file -PathType Leaf) {
        Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
      }
    }
    if (Test-Path -LiteralPath $folder -PathType Container) {
      Remove-Item -LiteralPath $folder -Force -ErrorAction SilentlyContinue
    }
  }
}

try {
  $stage = 'carpeta de Drive'
  if (-not (Test-Path -LiteralPath $driveFolder -PathType Container)) {
    throw 'La carpeta de Drive no está disponible en G:.'
  }
  $lastSyncedId = Get-VerifiedStateId
  $stage = 'conexión a GitHub'
  $script:githubToken = Get-GitCredentialToken
  $artifacts = @(Find-Artifacts $lastSyncedId)
  if ($artifacts.Count -eq 0) {
    if ($lastSyncedId -eq 0) { throw 'No hay un artefacto vigente de una ejecución exitosa de main.' }
    Write-Log ("Sin artefactos nuevos; último verificado: {0}." -f $lastSyncedId)
    return
  }

  $stage = 'certificado local'
  $certificate = Get-Item -LiteralPath ("Cert:\CurrentUser\My\$thumbprint") -ErrorAction Stop
  if (-not $certificate.HasPrivateKey) { throw 'El certificado local no tiene clave privada.' }

  foreach ($artifact in $artifacts) {
    if ([long]$artifact.id -eq $lastSyncedId) {
      Write-Log ("Artefacto {0}: ya verificado en Drive." -f $artifact.id)
      continue
    }
    try {
      $stage = "descarga y descifrado del artefacto $($artifact.id)"
      $workFolder = Join-Path $dataFolder ('work-' + [guid]::NewGuid().ToString('N'))
      [void][IO.Directory]::CreateDirectory($workFolder)
      $zipPath = Join-Path $workFolder 'artifact.zip'
      $cmsPath = Join-Path $workFolder 'presentation.cms'
      Download-Artifact ([long]$artifact.id) $zipPath
      $pptName = Read-EncryptedPpt $zipPath $cmsPath
      $plain = Decrypt-Ppt $cmsPath $certificate
      $expectedHash = Get-BytesSha256 $plain
      $storedName = $pptName
      $destination = Join-Path $driveFolder $storedName
      if ((Test-Path -LiteralPath $destination -PathType Leaf) -and
          (Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash -cne $expectedHash) {
        $storedName = '{0}_{1}.pptx' -f [IO.Path]::GetFileNameWithoutExtension($pptName), $artifact.id
        $destination = Join-Path $driveFolder $storedName
      }

      $stage = "copia a Drive del artefacto $($artifact.id)"
      if (Test-Path -LiteralPath $destination -PathType Leaf) {
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash -cne $expectedHash) {
          throw 'Ya existe un PPTX distinto con el nombre alternativo en Drive.'
        }
        $result = 'ya estaba copiado'
      } else {
        $driveStaging = Join-Path $driveFolder ('.' + $storedName + '.' + [guid]::NewGuid().ToString('N') + '.partial')
        $output = [IO.File]::Open($driveStaging, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try { $output.Write($plain, 0, $plain.Length) }
        finally { $output.Dispose() }
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $driveStaging).Hash -cne $expectedHash) {
          throw 'La copia temporal en Drive no coincide con el PPTX descifrado.'
        }
        if (Test-Path -LiteralPath $destination -PathType Leaf) {
          if ((Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash -cne $expectedHash) {
            throw 'Apareció un PPTX distinto con el mismo nombre en Drive.'
          }
          $result = 'ya estaba copiado'
        } else {
          [IO.File]::Move($driveStaging, $destination)
          $driveStaging = $null
          if ((Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash -cne $expectedHash) {
            throw 'El PPTX final en Drive no coincide con el descifrado.'
          }
          $result = 'copiado en G:'
        }
      }

      $stage = "registro local del artefacto $($artifact.id)"
      $state = @{
        artifact_id = [long]$artifact.id
        run_id = [long]$artifact.workflow_run.id
        file_name = $storedName
        sha256 = $expectedHash
        copied_at_utc = [DateTime]::UtcNow.ToString('o')
      }
      [IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
      $lastSyncedId = [long]$artifact.id
      Write-Log ("Artefacto {0}: {1} ({2})." -f $artifact.id, $storedName, $result)
    } finally {
      $plain = $null
      Remove-TemporaryFiles $workFolder $driveStaging
      $workFolder = $null
      $driveStaging = $null
    }
  }
} catch {
  Write-Log ("ERROR en {0}: {1}" -f $stage, $_.Exception.GetType().Name)
  throw "Falló la sincronización del PPT en $stage. Revise $logPath."
} finally {
  $script:githubToken = $null
  if ($workFolder -or $driveStaging) { Remove-TemporaryFiles $workFolder $driveStaging }
}
