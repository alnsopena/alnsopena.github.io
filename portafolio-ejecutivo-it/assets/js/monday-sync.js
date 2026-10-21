/* PMO-authenticated dispatch; only the published cut for this request can finish it. */
(function () {
  'use strict';
  const KEY = 'cosmos-monday-sync-v1';
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  const serviceOrigin = origin => /^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin) || origin === 'https://script.google.com';
  function matches(snapshot, request, boardId) {
    const p = snapshot && snapshot.publication;
    return !!(request.verified === true && p && p.request_id === request.id && /^[1-9]\d{0,19}$/.test(p.run_id) && /^[1-9]\d*$/.test(p.run_attempt) &&
      (!request.runId || request.runId === p.run_id) && (!request.runAttempt || request.runAttempt === p.run_attempt) &&
      String(snapshot.board_id) === String(boardId || '18396270726') && Array.isArray(snapshot.items) && snapshot.items.length > 0 && Number.isFinite(Date.parse(snapshot.extracted_at_utc)));
  }
  // Export validation for tests without mounting a browser UI.
  if (typeof module === 'object' && module.exports) { module.exports = { uuid, serviceOrigin, matches }; return; }
  let request = null, popup = null, bridge = null, bridgeOrigin = '', snapshotTimer = null, elapsedTimer = null, polling = false, deadline = 0;
  let configPromise = null;
  function config() {
    if (!configPromise) configPromise = fetch('assets/ppt-config.json', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('No se pudo consultar la conexión con el servicio PMO.');
      const data = await response.json(), url = new URL(data.dispatch_url || '');
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.search || url.hash || url.username || url.password || url.port ||
          !/^\/(?:macros\/s|a\/macros\/cosmos\.com\.pe\/s)\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) throw new Error('La sincronización con Monday todavía no está configurada.');
      return url.href;
    }).catch(error => { configPromise = null; throw error; });
    return configPromise;
  }
  function persist() { try { if (request) sessionStorage.setItem(KEY, JSON.stringify(request)); else sessionStorage.removeItem(KEY); } catch (_) {} }
  function panel() {
    let el = document.getElementById('monday-sync-panel');
    if (!el) {
      el = document.createElement('aside'); el.id = 'monday-sync-panel'; el.className = 'monday-sync-panel';
      el.setAttribute('aria-label', 'Sincronización con Monday');
      el.innerHTML = '<header><strong id="monday-sync-title">Sincronizando Monday</strong><button id="monday-sync-close" type="button" aria-label="Cerrar estado de sincronización" hidden>×</button></header><p id="monday-sync-message" role="status" aria-live="polite"></p><div class="monday-sync-bar" aria-hidden="true"><i></i></div><ol><li>Solicitud enviada</li><li>Consultar Monday</li><li>Publicar actualizaciones</li><li>Cargar el nuevo corte</li></ol><footer><span id="monday-sync-elapsed"></span><button id="monday-sync-service" type="button">Ver servicio seguro</button></footer>';
      document.body.appendChild(el);
      document.getElementById('monday-sync-close').onclick = () => { el.hidden = true; };
      document.getElementById('monday-sync-service').onclick = openService;
    }
    el.hidden = false; return el;
  }
  function render(phase, message) {
    const el = panel(), failed = phase === 'failed', done = phase === 'done', delayed = phase === 'delayed';
    el.dataset.phase = phase; el.setAttribute('aria-busy', String(!failed && !done && !delayed));
    document.getElementById('monday-sync-title').textContent = done ? 'Sincronización finalizada' : failed ? 'No se pudo sincronizar' : delayed ? 'Sincronización demorada' : 'Sincronizando Monday';
    document.getElementById('monday-sync-message').textContent = message;
    document.getElementById('monday-sync-close').hidden = !failed && !done && !delayed;
    document.getElementById('monday-sync-service').hidden = done || failed;
    const stage = ({ connecting: 0, queued: 1, running: 1, publishing: 2, loading: 3, done: 4 })[phase] ?? 1;
    el.querySelectorAll('li').forEach((li, index) => { li.dataset.state = index < stage ? 'done' : index === stage ? 'active' : 'pending'; });
    const button = document.getElementById('refresh-data-button');
    const busy = !failed && !done && !delayed;
    button.disabled = busy; button.classList.toggle('is-loading', busy); button.setAttribute('aria-busy', String(busy)); button.dataset.state = failed ? 'error' : done ? 'success' : '';
    document.getElementById('refresh-data-label').textContent = done ? 'Actualizado' : failed ? 'Reintentar sincronización' : delayed ? 'Comprobar sincronización' : 'Sincronizando…';
    if (typeof setRefreshStatus === 'function') setRefreshStatus('', '');
  }
  function updateElapsed() {
    const el = document.getElementById('monday-sync-elapsed');
    if (el && request) { const seconds = Math.max(0, Math.floor((Date.now() - request.startedAt) / 1000)); el.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') + ' transcurridos'; }
  }
  function stop() { clearTimeout(snapshotTimer); clearInterval(elapsedTimer); snapshotTimer = elapsedTimer = null; }
  function fail(message) { stop(); render('failed', message); request = null; bridge = null; persist(); }
  async function openService() {
    if (!request) return;
    // Open during the user's click so browsers can authorize the corporate login.
    popup = window.open('about:blank', 'cosmos-monday-sync', 'popup,width=660,height=680');
    if (!popup) { render('connecting', 'El navegador bloqueó la ventana de COSMOS. Permite las ventanas emergentes y pulsa “Ver servicio seguro”.'); return; }
    bridge = null; bridgeOrigin = '';
    try {
      const base = await config();
      if (!request) return;
      const url = new URL(base); url.searchParams.set('mode', 'sync'); url.searchParams.set('request_id', request.id);
      popup.location.href = url.href;
    } catch (error) { if (popup && !popup.closed) popup.close(); fail(error.message); }
  }
  async function pollSnapshot() {
    if (!request) return;
    if (polling) { snapshotTimer = setTimeout(pollSnapshot, 1000); return; }
    if (Date.now() > deadline) {
      stop(); request.phase = 'delayed'; persist(); render('delayed', 'Todavía no se confirmó la publicación. Tus datos anteriores se conservan. Pulsa “Comprobar sincronización” para seguir esta misma solicitud.'); return;
    }
    polling = true; const currentId = request.id;
    try {
      const url = new URL(window.location.href); url.hash = ''; url.searchParams.set('__sync_check', currentId + '-' + Date.now());
      const response = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const embedded = doc.getElementById('snapshot');
      if (!embedded) throw new Error('MISSING_SNAPSHOT');
      const snapshot = JSON.parse(embedded.textContent);
      if (request && request.id === currentId && matches(snapshot, request, D.board_id)) {
        render('loading', 'Cargando el nuevo corte y sus actualizaciones…');
        applyMondaySnapshot(snapshot);
        stop(); render('done', 'Monday sincronizado. Actualizaciones cargadas. Corte: ' + fmtDT(snapshot.extracted_at_utc));
        request = null; bridge = null; persist();
        if (popup && !popup.closed) popup.close();
      }
    } catch (_) { /* A temporary fetch failure never replaces the last successful cut. */ }
    finally { polling = false; if (request && request.phase !== 'delayed' && request.id === currentId) snapshotTimer = setTimeout(pollSnapshot, 10000); }
  }
  function monitor() { deadline = Date.now() + 10 * 60 * 1000; clearInterval(elapsedTimer); elapsedTimer = setInterval(updateElapsed, 1000); updateElapsed(); clearTimeout(snapshotTimer); snapshotTimer = setTimeout(pollSnapshot, 1000); }
  function start() {
    if (request && request.phase !== 'delayed') { panel(); if (popup && !popup.closed) popup.focus(); return; }
    if (!request) request = { id: crypto.randomUUID(), startedAt: Date.now(), phase: 'connecting' };
    else request.phase = 'connecting';
    persist(); render('connecting', 'Conectando con el servicio seguro. Si Google lo solicita, usa tu cuenta autorizada de COSMOS.');
    monitor(); return openService();
  }
  window.addEventListener('message', event => {
    const data = event.data;
    if (!request || !data || data.type !== 'cosmos:monday-sync' || data.requestId !== request.id || !serviceOrigin(event.origin)) return;
    if (data.phase === 'ready') {
      if (bridge && (event.source !== bridge || event.origin !== bridgeOrigin)) return;
      bridge = event.source; bridgeOrigin = event.origin;
      bridge.postMessage({ type: 'cosmos:monday-sync-start', requestId: request.id }, bridgeOrigin); return;
    }
    if (!bridge || event.source !== bridge || event.origin !== bridgeOrigin) return;
    if (data.phase === 'failed' || data.ok === false) { fail(typeof data.message === 'string' ? data.message : 'La sincronización no terminó. Puedes reintentar.'); return; }
    if (data.runId && /^[1-9]\d{0,19}$/.test(data.runId)) request.runId = data.runId;
    if (data.runAttempt && /^[1-9]\d*$/.test(data.runAttempt)) request.runAttempt = data.runAttempt;
    if (data.phase === 'published' && request.runId && request.runAttempt) request.verified = true;
    if (['connecting', 'queued', 'running', 'publishing', 'published', 'retrying'].includes(data.phase)) {
      request.phase = data.phase; persist();
      const labels = { connecting: 'Enviando la solicitud…', queued: 'Solicitud enviada. Esperando turno…', running: 'Consultando Monday y preparando las actualizaciones…', publishing: 'Publicando el nuevo corte…', published: 'Publicación completada. Comprobando y cargando el nuevo corte…', retrying: 'Comprobando el progreso de la sincronización…' };
      render(data.phase === 'published' ? 'loading' : data.phase, labels[data.phase]);
      if (data.phase === 'published') { clearTimeout(snapshotTimer); pollSnapshot(); }
    }
  });
  window.PMOMondaySync = { start };
  config().catch(() => {});
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && uuid(saved.id) && Number.isSafeInteger(saved.startedAt) && saved.startedAt <= Date.now() && Date.now() - saved.startedAt < 86400000) {
      request = saved; request.phase = 'loading'; persist(); render('loading', 'Recuperando la sincronización pendiente. Comprobando su publicación…'); monitor();
    }
  } catch (_) {}
})();
