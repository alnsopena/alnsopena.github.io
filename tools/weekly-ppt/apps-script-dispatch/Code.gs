/**
 * Despachador privado para pedir y seguir la PPT semanal.
 * Publicar como Web app: ejecutar como propietario; acceso: dominio COSMOS.
 * El PAT permanece exclusivamente en las propiedades de este Apps Script.
 */
const PMO_DISPATCH = Object.freeze({
  domain: 'cosmos.com.pe',
  apiBase: 'https://api.github.com/repos/alnsopena/alnsopena.github.io',
  workflow: 'publicar-portafolio.yml',
  manifestUrl: 'https://alnsopena.github.io/portafolio-ejecutivo-it/assets/weekly-ppt-pull/latest.json',
  folderId: '1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD',
  pptMimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  cooldownMs: 90 * 1000,
  delayedMs: 90 * 60 * 1000,
  restoreMs: 24 * 60 * 60 * 1000,
  retentionMs: 30 * 24 * 60 * 60 * 1000,
  maxRecords: 100,
});

function doGet() {
  try {
    requirePmoUser_();
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('COSMOS · PPT semanal');
  } catch (_) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><html lang="es"><meta charset="utf-8"><title>Acceso restringido</title>' +
      '<body style="font:16px Arial,sans-serif;padding:3rem;color:#142c3c">' +
      '<h1>Acceso restringido</h1><p>Usa una cuenta PMO autorizada de COSMOS.</p></body></html>'
    ).setTitle('Acceso restringido');
  }
}

/** Una solicitud aceptada aún no significa que el borrador esté listo. */
function requestDraft() {
  let email;
  try {
    email = requirePmoUser_();
  } catch (_) {
    return { ok: false, message: 'No tienes autorización para generar borradores.' };
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { ok: false, message: 'Hay otra solicitud en curso. Intenta de nuevo en un minuto.' };
  }
  try {
    const props = PropertiesService.getScriptProperties();
    const token = String(props.getProperty('GITHUB_DISPATCH_TOKEN') || '').trim();
    if (!token) return { ok: false, message: 'Falta configurar el servicio de generación.' };

    // El pull de Drive solo lee el último manifest. No iniciar otro borrador
    // hasta que el anterior llegue a Drive, falle o exceda el plazo.
    const activeId = props.getProperty('ACTIVE_DRAFT_REQUEST_ID');
    const active = readRequest_(props, activeId);
    if (active && Date.now() - active.requestedAtMs < PMO_DISPATCH.delayedMs) {
      const state = statusForRequest_(activeId, active, token);
      if (!['ready', 'failed', 'delayed'].includes(state.phase)) {
        return { ok: true, requestId: activeId,
          message: 'Ya hay un borrador en curso. Continuaremos consultando esa solicitud.' };
      }
    }

    const now = Date.now();
    const last = Number(props.getProperty('LAST_DISPATCH_MS') || 0);
    if (Number.isFinite(last) && now - last >= 0 && now - last < PMO_DISPATCH.cooldownMs) {
      return { ok: false, message: 'Ya se solicitó un borrador hace menos de 90 segundos.' };
    }
    const recentRuns = githubJson_(PMO_DISPATCH.apiBase + '/actions/workflows/' +
      PMO_DISPATCH.workflow + '/runs?per_page=100', token);
    if (!recentRuns || !Array.isArray(recentRuns.workflow_runs)) {
      throw new Error('BAD_RUN_LIST');
    }
    if (recentRuns.workflow_runs.some(function (run) {
      return run && run.status !== 'completed';
    })) {
      return { ok: false,
        message: 'Hay una publicación en curso. Intenta de nuevo cuando termine.' };
    }

    const requestId = Utilities.getUuid().toLowerCase();
    if (!validRequestId_(requestId)) {
      return { ok: false, message: 'No se pudo preparar la solicitud. Intenta de nuevo.' };
    }
    const response = UrlFetchApp.fetch(PMO_DISPATCH.apiBase + '/actions/workflows/' +
      PMO_DISPATCH.workflow + '/dispatches', {
      method: 'post',
      contentType: 'application/json',
      headers: githubHeaders_(token),
      payload: JSON.stringify({
        ref: 'main',
        inputs: { generate_ppt: 'true', request_id: requestId },
      }),
      muteHttpExceptions: true,
      followRedirects: false,
    });
    const status = response.getResponseCode();
    if (status !== 200 && status !== 204) {
      return { ok: false, message: githubError_(status) };
    }

    let runId = '';
    if (status === 200) {
      try {
        const candidate = String(JSON.parse(response.getContentText()).workflow_run_id || '');
        if (validRunId_(candidate)) runId = candidate;
      } catch (_) {
        // El título único también permite encontrar un despacho sin ID.
      }
    }
    props.setProperty(requestKey_(requestId), JSON.stringify({
      requestedAtMs: now, requestedBy: email, runId: runId,
    }));
    props.setProperty('LAST_REQUEST_FOR_' + email, requestId);
    props.setProperty('ACTIVE_DRAFT_REQUEST_ID', requestId);
    props.setProperty('LAST_DISPATCH_MS', String(now));
    pruneRequests_(props);
    return { ok: true, requestId: requestId,
      message: 'Solicitud aceptada. Comprobaremos la entrega del borrador en Drive.' };
  } catch (_) {
    // No devolver ni registrar la excepción: UrlFetch puede incluir cabeceras sensibles.
    return { ok: false, message: 'No se pudo enviar la solicitud. Intenta de nuevo.' };
  } finally {
    lock.releaseLock();
  }
}

/** Recupera la solicitud activa, incluso tras recargar o desde otro PMO. */
function getLatestDraftRequest() {
  let email;
  try {
    email = requirePmoUser_();
  } catch (_) {
    return { ok: false, message: 'No tienes autorización para consultar borradores.' };
  }
  const props = PropertiesService.getScriptProperties();
  const activeId = props.getProperty('ACTIVE_DRAFT_REQUEST_ID');
  const active = readRequest_(props, activeId);
  if (active && Date.now() - active.requestedAtMs < PMO_DISPATCH.restoreMs) {
    return { ok: true, requestId: activeId };
  }
  const personalId = props.getProperty('LAST_REQUEST_FOR_' + email);
  const personal = readRequest_(props, personalId);
  if (personal && Date.now() - personal.requestedAtMs < PMO_DISPATCH.restoreMs) {
    return { ok: true, requestId: personalId };
  }
  return { ok: true, requestId: null };
}

/** Solo declara listo un PPTX de esta ejecución que ya existe en Drive. */
function getDraftStatus(requestId) {
  try {
    requirePmoUser_();
  } catch (_) {
    return { ok: false, phase: 'error',
      message: 'No tienes autorización para consultar borradores.' };
  }
  const props = PropertiesService.getScriptProperties();
  const record = readRequest_(props, requestId);
  if (!record) {
    return { ok: false, phase: 'error',
      message: 'No se encontró esta solicitud. Recarga la página.' };
  }
  const token = String(props.getProperty('GITHUB_DISPATCH_TOKEN') || '').trim();
  if (!token) {
    return { ok: true, phase: 'error', retryable: true,
      message: 'No se pudo consultar el avance. Volveremos a intentarlo.' };
  }
  return statusForRequest_(requestId, record, token);
}

function statusForRequest_(requestId, record, token) {
  let run;
  try {
    run = findRequestedRun_(requestId, record, token);
  } catch (_) {
    return { ok: true, phase: 'error', retryable: true,
      message: 'No se pudo consultar el avance. Volveremos a intentarlo.' };
  }
  if (!run) return delayedOr_(record, 'queued', 'La solicitud está en espera de iniciar.');

  const runId = String(run.id);
  const runAttempt = String(run.run_attempt);
  let file;
  try {
    file = findDeliveredDraft_(runId + '-' + runAttempt);
  } catch (_) {
    return { ok: true, phase: 'error', retryable: true,
      message: 'No se pudo comprobar la carpeta de borradores. Volveremos a intentarlo.' };
  }
  if (file) {
    return { ok: true, phase: 'ready', message: 'El borrador está listo en Drive.',
      fileName: file.name,
      fileUrl: 'https://drive.google.com/file/d/' + file.id + '/view' };
  }
  if (run.status === 'completed' && run.conclusion !== 'success') {
    return { ok: true, phase: 'failed',
      message: 'La generación terminó sin entregar un borrador. Solicita uno nuevo o avisa a PMO.' };
  }
  if (run.status !== 'completed') {
    return delayedOr_(record, 'running', 'Se está generando el borrador.');
  }
  // latest.json es orientativo: otra ejecución puede reemplazarlo.
  const manifest = latestManifest_();
  const published = manifest && manifest.run_id === runId &&
    manifest.run_attempt === runAttempt;
  return delayedOr_(record, 'delivering', published
    ? 'El borrador se generó; estamos esperando su entrega a Drive.'
    : 'La generación terminó; estamos comprobando la entrega a Drive.');
}

function delayedOr_(record, phase, message) {
  if (Date.now() - record.requestedAtMs >= PMO_DISPATCH.delayedMs) {
    return { ok: true, phase: 'delayed',
      message: 'La entrega tarda más de lo habitual. Puedes comprobar el estado de nuevo más tarde.' };
  }
  return { ok: true, phase: phase, message: message };
}

function findRequestedRun_(requestId, record, token) {
  if (record.runId) {
    return checkedRun_(githubJson_(PMO_DISPATCH.apiBase + '/actions/runs/' +
      record.runId, token), requestId);
  }
  const since = new Date(record.requestedAtMs - 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const prefix = PMO_DISPATCH.apiBase + '/actions/workflows/' + PMO_DISPATCH.workflow +
    '/runs?event=workflow_dispatch&branch=main&created=' +
    encodeURIComponent('>=' + since) + '&per_page=100&page=';
  for (let page = 1; page <= 5; page++) {
    const response = githubJson_(prefix + page, token);
    if (!response || !Array.isArray(response.workflow_runs)) throw new Error('BAD_RUN_LIST');
    const match = response.workflow_runs.find(function (candidate) {
      return candidate && candidate.display_title === 'PMO PPT ' + requestId;
    });
    if (match) {
      const run = checkedRun_(match, requestId);
      record.runId = String(run.id);
      PropertiesService.getScriptProperties().setProperty(requestKey_(requestId),
        JSON.stringify(record));
      return run;
    }
    if (response.workflow_runs.length < 100) break;
  }
  return null;
}

function checkedRun_(run, requestId) {
  if (!run || !validRunId_(String(run.id || '')) ||
      run.display_title !== 'PMO PPT ' + requestId ||
      run.event !== 'workflow_dispatch' || run.head_branch !== 'main' ||
      !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1 ||
      typeof run.status !== 'string' || !run.status) {
    throw new Error('RUN_MISMATCH');
  }
  return run;
}

function githubJson_(url, token) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get', headers: githubHeaders_(token), muteHttpExceptions: true,
    followRedirects: false,
  });
  if (response.getResponseCode() !== 200) throw new Error('RUN_HTTP');
  return JSON.parse(response.getContentText());
}

function githubHeaders_(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': '2026-03-10',
  };
}

function findDeliveredDraft_(runKey) {
  const folder = Drive.Files.get(PMO_DISPATCH.folderId, {
    fields: 'id,mimeType,driveId', supportsAllDrives: true,
  });
  if (!folder || folder.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error('DRAFT_FOLDER_UNAVAILABLE');
  }
  const options = {
    q: "'" + PMO_DISPATCH.folderId + "' in parents and trashed = false and " +
      "properties has { key='pmoRunKey' and value='" + runKey + "' }",
    fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,size,parents,properties)',
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: folder.driveId ? 'drive' : 'user',
  };
  if (folder.driveId) options.driveId = folder.driveId;
  const result = Drive.Files.list(options);
  if (!result || result.nextPageToken || result.incompleteSearch ||
      !Array.isArray(result.files) || result.files.length > 1) {
    throw new Error('DRAFT_SEARCH_INCOMPLETE');
  }
  const file = result.files[0];
  if (!file) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(file.id || '') ||
      !/^Portafolio_Proyectos_Borrador_\d{8}_\d{4}(?:_\d+)?\.pptx$/.test(file.name || '') ||
      file.mimeType !== PMO_DISPATCH.pptMimeType ||
      !Number.isSafeInteger(Number(file.size)) || Number(file.size) < 1000 ||
      !(file.parents || []).includes(PMO_DISPATCH.folderId) ||
      !file.properties || file.properties.pmoRunKey !== runKey ||
      !/^[0-9a-f]{64}$/.test(file.properties.pmoSha256 || '')) {
    throw new Error('DRAFT_FILE_INVALID');
  }
  return file;
}

function latestManifest_() {
  try {
    const response = UrlFetchApp.fetch(PMO_DISPATCH.manifestUrl + '?v=' + Date.now(), {
      method: 'get', muteHttpExceptions: true, followRedirects: false,
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (response.getResponseCode() !== 200) return null;
    const body = response.getContentText();
    if (body.length > 4096) return null;
    const manifest = JSON.parse(body);
    if (manifest.version !== 1 || !validRunId_(manifest.run_id) ||
        !/^\d{1,6}$/.test(manifest.run_attempt || '') ||
        !/^Portafolio_Proyectos_Borrador_\d{8}_\d{4}(?:_\d+)?\.pptx$/.test(manifest.file_name || '') ||
        !Number.isSafeInteger(manifest.size_bytes) || manifest.size_bytes < 1000 ||
        !/^[0-9a-f]{64}$/.test(manifest.sha256 || '')) return null;
    return manifest;
  } catch (_) {
    return null;
  }
}

function requestKey_(requestId) {
  return 'DRAFT_REQUEST_' + requestId;
}

function pruneRequests_(props) {
  try {
    const all = props.getProperties();
    const recent = [];
    const stale = [];
    Object.keys(all).forEach(function (key) {
      if (!/^DRAFT_REQUEST_[0-9a-f-]{36}$/.test(key)) return;
      let created = 0;
      try { created = JSON.parse(all[key]).requestedAtMs; } catch (_) { /* remove below */ }
      if (!Number.isSafeInteger(created) ||
          Date.now() - created > PMO_DISPATCH.retentionMs) {
        stale.push(key);
      } else {
        recent.push({ key: key, created: created });
      }
    });
    recent.sort(function (a, b) { return b.created - a.created; });
    recent.slice(PMO_DISPATCH.maxRecords).forEach(function (item) {
      stale.push(item.key);
    });
    stale.forEach(function (key) { props.deleteProperty(key); });
  } catch (_) {
    // La limpieza nunca debe ocultar un despacho ya aceptado.
  }
}

function readRequest_(props, requestId) {
  if (!validRequestId_(requestId)) return null;
  try {
    const record = JSON.parse(props.getProperty(requestKey_(requestId)) || 'null');
    if (!record || !Number.isSafeInteger(record.requestedAtMs) ||
        record.requestedAtMs > Date.now() + 60 * 1000 ||
        typeof record.requestedBy !== 'string' ||
        (record.runId && !validRunId_(record.runId))) return null;
    return record;
  } catch (_) {
    return null;
  }
}

function validRequestId_(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

function validRunId_(value) {
  return typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value);
}

function requirePmoUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email || !email.endsWith('@' + PMO_DISPATCH.domain)) {
    throw new Error('Acceso denegado');
  }
  const raw = PropertiesService.getScriptProperties().getProperty('PMO_ALLOWED_EMAILS') || '';
  const allowed = raw.split(/[\s,;]+/).map(function (entry) {
    return entry.trim().toLowerCase();
  }).filter(Boolean);
  if (allowed.indexOf(email) === -1) throw new Error('Acceso denegado');
  return email;
}

function githubError_(status) {
  if (status === 401 || status === 403) {
    return 'El servicio de generación rechazó la credencial. Avisa al administrador.';
  }
  if (status === 404 || status === 422) {
    return 'El servicio de generación no aceptó la solicitud. Avisa al administrador.';
  }
  return 'El servicio de generación devolvió HTTP ' + status + '. Intenta de nuevo.';
}
