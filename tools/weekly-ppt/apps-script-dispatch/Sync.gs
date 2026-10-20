/** Synchronization uses the existing PMO identity gate and Actions-only credential. */
function requestMondaySync(requestId) {
  let email;
  try { email = requirePmoUser_(); } catch (_) {
    return { ok: false, phase: 'failed', message: 'Tu cuenta no está autorizada en el servicio PMO.' };
  }
  if (!validRequestId_(requestId)) return { ok: false, phase: 'failed', message: 'Solicitud inválida.' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, phase: 'failed', message: 'El servicio está ocupado. Intenta de nuevo.' };
  try {
    const props = PropertiesService.getScriptProperties();
    const token = String(props.getProperty('GITHUB_DISPATCH_TOKEN') || '').trim();
    if (!token) return { ok: false, phase: 'failed', message: 'El servicio PMO no tiene configurada su conexión.' };
    const previous = readSyncRequest_(props, requestId);
    if (previous) return { ok: true, phase: 'queued', requestId: requestId };
    const last = Number(props.getProperty('LAST_MONDAY_SYNC_MS') || 0);
    if (Date.now() - last < 30000) return { ok: false, phase: 'failed', message: 'Ya se envió una sincronización. Espera 30 segundos antes de solicitar otra.' };
    const response = UrlFetchApp.fetch(PMO_DISPATCH.apiBase + '/actions/workflows/' + PMO_DISPATCH.workflow + '/dispatches', {
      method: 'post', contentType: 'application/json', headers: githubHeaders_(token),
      payload: JSON.stringify({ ref: 'main', inputs: { generate_ppt: 'false', request_id: requestId } }),
      muteHttpExceptions: true, followRedirects: false,
    });
    const status = response.getResponseCode();
    if (status !== 200 && status !== 204) return { ok: false, phase: 'failed', message: githubError_(status) };
    let runId = '';
    if (status === 200) {
      try {
        const id = String(JSON.parse(response.getContentText()).workflow_run_id || '');
        if (validRunId_(id)) runId = id;
      } catch (_) { /* Find the uniquely named run on the next status request. */ }
    }
    props.setProperty('SYNC_REQUEST_' + requestId, JSON.stringify({ requestedAtMs: Date.now(), requestedBy: email, runId: runId }));
    props.setProperty('LAST_MONDAY_SYNC_MS', String(Date.now()));
    pruneSyncRequests_(props);
    return { ok: true, phase: 'queued', requestId: requestId };
  } catch (_) {
    return { ok: false, phase: 'failed', message: 'No se pudo iniciar la sincronización. Tus datos actuales se conservan.' };
  } finally { lock.releaseLock(); }
}

function getMondaySyncStatus(requestId) {
  try { requirePmoUser_(); } catch (_) {
    return { ok: false, phase: 'failed', message: 'Tu cuenta no está autorizada en el servicio PMO.' };
  }
  const props = PropertiesService.getScriptProperties();
  const record = readSyncRequest_(props, requestId);
  if (!record) return { ok: false, phase: 'failed', message: 'No se encontró esta solicitud de sincronización.' };
  const token = String(props.getProperty('GITHUB_DISPATCH_TOKEN') || '').trim();
  if (!token) return { ok: true, phase: 'retrying', message: 'No se pudo consultar el progreso. Reintentando…' };
  try {
    let run;
    if (record.runId) {
      run = checkedSyncRun_(githubJson_(PMO_DISPATCH.apiBase + '/actions/runs/' + record.runId, token), requestId);
    } else {
      const since = new Date(record.requestedAtMs - 86400000).toISOString().slice(0, 10);
      const prefix = PMO_DISPATCH.apiBase + '/actions/workflows/' + PMO_DISPATCH.workflow + '/runs?event=workflow_dispatch&branch=main&created=' + encodeURIComponent('>=' + since) + '&per_page=100&page=';
      for (let page = 1; page <= 5; page++) {
        const result = githubJson_(prefix + page, token);
        if (!result || !Array.isArray(result.workflow_runs)) throw new Error('BAD_RUN_LIST');
        const candidate = result.workflow_runs.find(function (r) { return r && r.display_title === 'PMO SYNC ' + requestId; });
        if (candidate) { run = checkedSyncRun_(candidate, requestId); break; }
        if (result.workflow_runs.length < 100) break;
      }
      if (run) {
        record.runId = String(run.id);
        props.setProperty('SYNC_REQUEST_' + requestId, JSON.stringify(record));
      }
    }
    if (!run) return { ok: true, phase: 'queued', message: 'Solicitud enviada. Esperando turno…' };
    const base = { ok: true, runId: String(run.id), runAttempt: String(run.run_attempt) };
    if (run.status === 'completed') return Object.assign(base, run.conclusion === 'success'
      ? { phase: 'published', message: 'Publicación completada. Comprobando el nuevo corte…' }
      : { phase: 'failed', message: 'La sincronización no terminó correctamente. Tus datos anteriores se conservan. Puedes reintentar.' });
    if (run.status === 'queued' || run.status === 'waiting' || run.status === 'pending') return Object.assign(base, { phase: 'queued', message: 'Solicitud en cola. Esperando turno…' });
    const jobs = githubJson_(PMO_DISPATCH.apiBase + '/actions/runs/' + run.id + '/jobs?filter=latest&per_page=100', token);
    const publishing = jobs && Array.isArray(jobs.jobs) && jobs.jobs.some(function (job) { return job.name === 'deploy'; });
    return Object.assign(base, { phase: publishing ? 'publishing' : 'running', message: publishing ? 'Publicando el nuevo corte…' : 'Consultando Monday y preparando las actualizaciones…' });
  } catch (_) {
    return { ok: true, phase: 'retrying', message: 'No se pudo comprobar el progreso. Volveremos a intentarlo.' };
  }
}

function checkedSyncRun_(run, requestId) {
  if (!run || !validRunId_(String(run.id || '')) || run.display_title !== 'PMO SYNC ' + requestId ||
      run.event !== 'workflow_dispatch' || run.head_branch !== 'main' || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) throw new Error('RUN_MISMATCH');
  return run;
}
function readSyncRequest_(props, requestId) {
  if (!validRequestId_(requestId)) return null;
  try {
    const r = JSON.parse(props.getProperty('SYNC_REQUEST_' + requestId) || 'null');
    return r && Number.isSafeInteger(r.requestedAtMs) && r.requestedAtMs <= Date.now() + 60000 && typeof r.requestedBy === 'string' && (!r.runId || validRunId_(r.runId)) ? r : null;
  } catch (_) { return null; }
}
function pruneSyncRequests_(props) {
  const entries = [];
  Object.keys(props.getProperties()).filter(function (key) { return key.indexOf('SYNC_REQUEST_') === 0; }).forEach(function (key) {
    const r = readSyncRequest_(props, key.slice(13));
    if (!r || Date.now() - r.requestedAtMs > 86400000) props.deleteProperty(key);
    else entries.push({ key: key, time: r.requestedAtMs });
  });
  entries.sort(function (a, b) { return b.time - a.time; }).slice(50).forEach(function (entry) { props.deleteProperty(entry.key); });
}
