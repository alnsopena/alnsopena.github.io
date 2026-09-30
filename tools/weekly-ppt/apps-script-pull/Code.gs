/**
 * Pull privado de la PPT semanal. No se despliega como web app: un activador
 * cada 15 minutos, creado por una cuenta corporativa con acceso a Drive, lo ejecuta.
 */
const PPT_PULL = Object.freeze({
  manifestUrl: 'https://alnsopena.github.io/portafolio-ejecutivo-it/assets/weekly-ppt-pull/latest.json',
  assetBaseUrl: 'https://alnsopena.github.io/portafolio-ejecutivo-it/assets/weekly-ppt-pull/',
  folderId: '1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD',
  mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  maxPptBytes: 10 * 1024 * 1024,
  maxManifestBytes: 4096,
  maxAgeMs: 120 * 24 * 60 * 60 * 1000,
});

function pullFail_(code) {
  throw new Error(code);
}

function pullHex_(bytes) {
  return bytes.map(function (value) {
    return (value & 255).toString(16).padStart(2, '0');
  }).join('');
}

function pullDigest_(algorithm, bytes) {
  return pullHex_(Utilities.computeDigest(algorithm, bytes));
}

function pullKey_() {
  const value = PropertiesService.getScriptProperties().getProperty('PPT_PULL_KEY_B64');
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) pullFail_('PULL_KEY_NOT_CONFIGURED');
  const bytes = Utilities.base64Decode(value);
  if (bytes.length !== 32 || Utilities.base64Encode(bytes) !== value) {
    pullFail_('PULL_KEY_INVALID');
  }
  return Uint8Array.from(bytes, function (byte) { return byte & 255; });
}

function pullFetch_(url, maxBytes) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    followRedirects: false,
    muteHttpExceptions: true,
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (response.getResponseCode() !== 200) pullFail_('PULL_HTTP_' + response.getResponseCode());
  const bytes = response.getContent();
  if (!bytes.length || bytes.length > maxBytes) pullFail_('PULL_RESPONSE_SIZE');
  return bytes;
}

function pullManifest_() {
  const bytes = pullFetch_(PPT_PULL.manifestUrl + '?v=' + Date.now(), PPT_PULL.maxManifestBytes);
  let manifest;
  try {
    manifest = JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8'));
  } catch (_) {
    pullFail_('PULL_MANIFEST_INVALID');
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
      manifest.version !== 1 ||
      typeof manifest.run_id !== 'string' ||
      !/^\d{1,20}$/.test(manifest.run_id) ||
      typeof manifest.run_attempt !== 'string' ||
      !/^\d{1,6}$/.test(manifest.run_attempt) ||
      typeof manifest.file_name !== 'string' ||
      !/^Portafolio_Proyectos_Borrador_\d{8}_\d{4}(?:_\d+)?\.pptx$/.test(manifest.file_name) ||
      !Number.isSafeInteger(manifest.size_bytes) || manifest.size_bytes < 1000 ||
      manifest.size_bytes > PPT_PULL.maxPptBytes ||
      !/^[0-9a-f]{64}$/.test(manifest.sha256) ||
      !Number.isSafeInteger(manifest.published_at_ms) ||
      manifest.published_at_ms > Date.now() + 10 * 60 * 1000 ||
      Date.now() - manifest.published_at_ms > PPT_PULL.maxAgeMs ||
      typeof manifest.cipher_file !== 'string' ||
      manifest.cipher_file !== manifest.run_id + '-' + manifest.run_attempt + '.pptx.sb' ||
      typeof manifest.nonce_base64 !== 'string' ||
      !/^[A-Za-z0-9+/]{32}$/.test(manifest.nonce_base64) ||
      !Number.isSafeInteger(manifest.cipher_size_bytes) ||
      manifest.cipher_size_bytes < manifest.size_bytes + 24 ||
      manifest.cipher_size_bytes > manifest.size_bytes + 4096 ||
      !/^[0-9a-f]{64}$/.test(manifest.cipher_sha256)) {
    pullFail_('PULL_MANIFEST_INVALID');
  }
  return manifest;
}

function pullListDraftFiles_(extraQuery, pageSize) {
  const folder = Drive.Files.get(PPT_PULL.folderId, {
    fields: 'id,mimeType,driveId', supportsAllDrives: true,
  });
  if (!folder || folder.mimeType !== 'application/vnd.google-apps.folder') {
    pullFail_('PULL_FOLDER_NOT_FOUND');
  }
  const options = {
    q: "'" + PPT_PULL.folderId + "' in parents and trashed = false and " + extraQuery,
    fields: 'nextPageToken,incompleteSearch,files(id,name,size,md5Checksum,parents,appProperties,properties)',
    pageSize: pageSize,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: folder.driveId ? 'drive' : 'user',
  };
  if (folder.driveId) options.driveId = folder.driveId;
  const result = Drive.Files.list(options);
  if (result.nextPageToken || result.incompleteSearch) pullFail_('PULL_DRIVE_SEARCH_INCOMPLETE');
  return result.files || [];
}

function pullFindRun_(runKey) {
  const files = pullListDraftFiles_(
    "appProperties has { key='pmoRunKey' and value='" + runKey + "' }", 2);
  if (files.length > 1) pullFail_('PULL_DUPLICATE_RUN_CONFLICT');
  return files[0] || null;
}

function pullCheckFile_(file, manifest, md5) {
  if (!file || !/^[A-Za-z0-9_-]+$/.test(file.id || '') ||
      file.name !== manifest.file_name || Number(file.size) !== manifest.size_bytes ||
      !(file.parents || []).includes(PPT_PULL.folderId) ||
      (md5 && file.md5Checksum !== md5)) {
    pullFail_('PULL_STORAGE_VERIFICATION_FAILED');
  }
}

/** El otro proyecto Apps Script solo puede leer properties, no appProperties. */
function pullMarkDelivery_(file, manifest, runKey) {
  if (file.properties?.pmoRunKey && file.properties.pmoRunKey !== runKey) {
    pullFail_('PULL_DUPLICATE_RUN_CONFLICT');
  }
  if (file.properties?.pmoRunKey === runKey &&
      file.properties?.pmoSha256 === manifest.sha256) return file;
  const updated = Drive.Files.update({
    properties: { pmoRunKey: runKey, pmoSha256: manifest.sha256 },
  }, file.id, null, {
    fields: 'id,name,size,md5Checksum,parents,properties', supportsAllDrives: true,
  });
  pullCheckFile_(updated, manifest, file.md5Checksum);
  if (updated.properties?.pmoRunKey !== runKey ||
      updated.properties?.pmoSha256 !== manifest.sha256) {
    pullFail_('PULL_STORAGE_VERIFICATION_FAILED');
  }
  return updated;
}

function pullDecrypt_(manifest, key) {
  const cipherSigned = pullFetch_(PPT_PULL.assetBaseUrl + manifest.cipher_file,
    manifest.cipher_size_bytes);
  if (cipherSigned.length !== manifest.cipher_size_bytes ||
      pullDigest_(Utilities.DigestAlgorithm.SHA_256, cipherSigned) !== manifest.cipher_sha256) {
    pullFail_('PULL_CIPHER_HASH_MISMATCH');
  }
  const nonceSigned = Utilities.base64Decode(manifest.nonce_base64);
  if (nonceSigned.length !== nacl.secretbox.nonceLength) pullFail_('PULL_NONCE_INVALID');
  const nonce = Uint8Array.from(nonceSigned, function (byte) { return byte & 255; });
  const cipher = Uint8Array.from(cipherSigned, function (byte) { return byte & 255; });
  const plaintext = nacl.secretbox.open(cipher, nonce, key);
  if (!plaintext) pullFail_('PULL_AUTHENTICATION_FAILED');
  if (plaintext.length < 8 || plaintext[0] !== 0x43 || plaintext[1] !== 0x57 ||
      plaintext[2] !== 0x50 || plaintext[3] !== 0x31) pullFail_('PULL_ENVELOPE_INVALID');
  const metadataLength = ((plaintext[4] << 24) | (plaintext[5] << 16) |
    (plaintext[6] << 8) | plaintext[7]) >>> 0;
  if (metadataLength < 2 || metadataLength > 2048 ||
      plaintext.length < 8 + metadataLength + 1000) pullFail_('PULL_ENVELOPE_INVALID');
  let metadata;
  try {
    const chars = Array.from(plaintext.subarray(8, 8 + metadataLength));
    metadata = JSON.parse(String.fromCharCode.apply(null, chars));
  } catch (_) {
    pullFail_('PULL_ENVELOPE_INVALID');
  }
  for (const field of ['version', 'run_id', 'run_attempt', 'file_name',
    'size_bytes', 'sha256', 'published_at_ms']) {
    if (metadata[field] !== manifest[field]) pullFail_('PULL_METADATA_MISMATCH');
  }
  const pptx = plaintext.subarray(8 + metadataLength);
  if (pptx.length !== manifest.size_bytes || pptx[0] !== 0x50 ||
      pptx[1] !== 0x4b || pptx[2] !== 0x03 || pptx[3] !== 0x04) {
    pullFail_('PULL_PPTX_INVALID');
  }
  const signed = Array.from(pptx, function (byte) { return byte > 127 ? byte - 256 : byte; });
  if (pullDigest_(Utilities.DigestAlgorithm.SHA_256, signed) !== manifest.sha256) {
    pullFail_('PULL_PPTX_HASH_MISMATCH');
  }
  return { bytes: signed, md5: pullDigest_(Utilities.DigestAlgorithm.MD5, signed) };
}

/** Ejecutar una vez como el propietario corporativo para crear el activador. */
function installPullTrigger() {
  pullKey_();
  const existing = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'pullLatestWeeklyPpt';
  });
  if (existing.length > 1) pullFail_('PULL_MULTIPLE_TRIGGERS');
  if (!existing.length) {
    ScriptApp.newTrigger('pullLatestWeeklyPpt').timeBased().everyMinutes(15).create();
  }
  return { ok: true, alreadyInstalled: existing.length === 1 };
}

/** También se puede ejecutar manualmente para comprobar la configuración. */
function pullLatestWeeklyPpt() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) pullFail_('PULL_BUSY_RETRY');
  try {
    const key = pullKey_();
    const manifest = pullManifest_();
    const runKey = manifest.run_id + '-' + manifest.run_attempt;
    const existing = pullFindRun_(runKey);
    if (existing) {
      pullCheckFile_(existing, manifest, existing.appProperties?.pmoMd5);
      if (existing.appProperties?.pmoSha256 !== manifest.sha256 ||
          !existing.appProperties?.pmoMd5) pullFail_('PULL_DUPLICATE_RUN_CONFLICT');
      pullMarkDelivery_(existing, manifest, runKey);
      return { ok: true, duplicate: true, fileId: existing.id, runKey: runKey };
    }
    const decoded = pullDecrypt_(manifest, key);
    const sameName = pullListDraftFiles_("name = '" + manifest.file_name + "'", 100);
    const matching = sameName.find(function (file) {
      return Number(file.size) === manifest.size_bytes && file.md5Checksum === decoded.md5;
    });
    if (matching) {
      pullCheckFile_(matching, manifest, decoded.md5);
      pullMarkDelivery_(matching, manifest, runKey);
      return { ok: true, duplicate: true, fileId: matching.id, runKey: runKey };
    }
    if (sameName.length) pullFail_('PULL_NAME_CONFLICT');
    const blob = Utilities.newBlob(decoded.bytes, PPT_PULL.mimeType, manifest.file_name);
    const created = Drive.Files.create({
      name: manifest.file_name,
      mimeType: PPT_PULL.mimeType,
      parents: [PPT_PULL.folderId],
      appProperties: {
        pmoRunKey: runKey,
        pmoSha256: manifest.sha256,
        pmoMd5: decoded.md5,
      },
      properties: { pmoRunKey: runKey, pmoSha256: manifest.sha256 },
    }, blob, {
      fields: 'id', supportsAllDrives: true,
    });
    if (!created || !/^[A-Za-z0-9_-]+$/.test(created.id || '')) {
      pullFail_('PULL_STORAGE_VERIFICATION_FAILED');
    }
    const stored = Drive.Files.get(created.id, {
      fields: 'id,name,size,md5Checksum,parents,appProperties,properties', supportsAllDrives: true,
    });
    pullCheckFile_(stored, manifest, decoded.md5);
    if (stored.appProperties?.pmoRunKey !== runKey ||
        stored.appProperties?.pmoSha256 !== manifest.sha256 ||
        stored.properties?.pmoRunKey !== runKey ||
        stored.properties?.pmoSha256 !== manifest.sha256) {
      pullFail_('PULL_STORAGE_VERIFICATION_FAILED');
    }
    return { ok: true, duplicate: false, fileId: stored.id, runKey: runKey };
  } finally {
    lock.releaseLock();
  }
}
