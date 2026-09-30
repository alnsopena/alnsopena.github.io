import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
const id = '11111111-2222-4333-8444-555555555555';
const folderId = '1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD';
const fileName = 'Portafolio_Proyectos_Borrador_20260930_0900.pptx';
const clock = { now: Date.parse('2026-09-30T14:00:00Z') };

function setup({
  email = 'pmo@cosmos.com.pe',
  allow = 'pmo@cosmos.com.pe',
  token = 'TEST-TOKEN',
  code = 200,
  runId = '123',
  runStatus = 'in_progress',
  conclusion = null,
  listContainsRun = true,
  openRuns = [],
  driveFiles = [],
  manifest = null,
} = {}) {
  const values = new Map([
    ['PMO_ALLOWED_EMAILS', allow],
    ['GITHUB_DISPATCH_TOKEN', token],
  ]);
  const calls = [];
  let locked = false;
  const config = { runStatus, conclusion, listContainsRun, openRuns, driveFiles, manifest };
  const makeRun = () => ({
    id: Number(runId),
    run_attempt: 1,
    display_title: 'PMO PPT ' + id,
    event: 'workflow_dispatch',
    head_branch: 'main',
    status: config.runStatus,
    conclusion: config.conclusion,
  });
  class FakeDate extends Date {
    static now() { return clock.now; }
  }
  const context = vm.createContext({
    Date: FakeDate,
    Session: { getActiveUser: () => ({ getEmail: () => email }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key) => values.get(key),
      setProperty: (key, value) => values.set(key, value),
      getProperties: () => Object.fromEntries(values),
      deleteProperty: (key) => values.delete(key),
    }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => { locked = true; return true; },
      releaseLock: () => { locked = false; },
    }) },
    Utilities: { getUuid: () => id },
    UrlFetchApp: { fetch: (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/dispatches')) {
        return {
          getResponseCode: () => code,
          getContentText: () => JSON.stringify({ workflow_run_id: Number(runId) }),
        };
      }
      if (url.includes('/actions/runs/')) {
        return { getResponseCode: () => 200,
          getContentText: () => JSON.stringify(makeRun()) };
      }
      if (url.includes('/runs?per_page=100')) {
        return { getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ workflow_runs: config.openRuns }) };
      }
      if (url.includes('/actions/workflows/') && url.includes('/runs?')) {
        return { getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            workflow_runs: config.listContainsRun ? [makeRun()] : [],
          }) };
      }
      if (url.includes('/weekly-ppt-pull/latest.json')) {
        return {
          getResponseCode: () => config.manifest ? 200 : 404,
          getContentText: () => JSON.stringify(config.manifest),
        };
      }
      throw new Error('Unexpected URL: ' + url);
    } },
    Drive: { Files: {
      get: (fileId, options) => {
        calls.push({ fileId, options });
        return { id: folderId, mimeType: 'application/vnd.google-apps.folder',
          driveId: 'shared-drive' };
      },
      list: (options) => {
        calls.push({ driveList: options });
        return { files: config.driveFiles };
      },
    } },
    HtmlService: {
      createHtmlOutputFromFile: () => ({ setTitle() { return this; } }),
      createHtmlOutput: () => ({ setTitle() { return this; } }),
    },
  });
  vm.runInContext(source, context, { filename: 'Code.gs' });
  return { context, values, calls, config, isLocked: () => locked };
}

function deliveredFile({ runKey = '123-1', sha = 'a'.repeat(64), name = fileName } = {}) {
  return {
    id: 'DriveFile_123', name, size: '2048',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    parents: [folderId],
    properties: { pmoRunKey: runKey, pmoSha256: sha },
  };
}

test('despacha con ID único y nunca devuelve el PAT ni un enlace de ejecución', () => {
  const { context, calls, isLocked } = setup();
  const result = context.requestDraft();
  assert.equal(result.ok, true);
  assert.equal(result.requestId, id);
  assert.equal(result.runUrl, undefined);
  const dispatch = calls.find((call) => call.url?.endsWith('/dispatches'));
  assert.deepEqual(JSON.parse(dispatch.options.payload), {
    ref: 'main', inputs: { generate_ppt: 'true', request_id: id },
  });
  assert.equal(dispatch.options.headers.Authorization, 'Bearer TEST-TOKEN');
  assert.equal(isLocked(), false);
  assert.doesNotMatch(JSON.stringify(result), /TEST-TOKEN|github\.com/i);
});

test('sin identidad, fuera de dominio o de allowlist falla cerrado', () => {
  for (const options of [
    { email: '' }, { email: 'pmo@otro.com' },
    { email: 'otro@cosmos.com.pe' }, { allow: '' },
  ]) {
    const { context, calls } = setup(options);
    assert.equal(context.requestDraft().ok, false);
    assert.equal(context.getLatestDraftRequest().ok, false);
    assert.equal(context.getDraftStatus(id).ok, false);
    assert.equal(calls.length, 0);
  }
});

test('204 localiza exactamente el run por título, sin confundir otro dispatch', () => {
  const { context, calls, config } = setup({ code: 204, listContainsRun: false });
  assert.equal(context.requestDraft().ok, true);
  assert.equal(context.getDraftStatus(id).phase, 'queued');
  config.listContainsRun = true;
  assert.equal(context.getDraftStatus(id).phase, 'running');
  assert.ok(calls.some((call) => call.url?.includes('/runs?event=workflow_dispatch')));
  assert.ok(calls.some((call) => call.driveList?.q.includes("value='123-1'")));
});

test('manifest publicado sin archivo en Drive nunca se declara listo', () => {
  const { context, config } = setup();
  assert.equal(context.requestDraft().ok, true);
  config.runStatus = 'completed';
  config.conclusion = 'success';
  config.manifest = {
    version: 1, run_id: '123', run_attempt: '1', file_name: fileName,
    size_bytes: 2048, sha256: 'a'.repeat(64),
  };
  const result = context.getDraftStatus(id);
  assert.equal(result.phase, 'delivering');
  assert.equal(result.fileUrl, undefined);
});

test('solo el PPTX con propiedades del run pedido ofrece enlace directo', () => {
  const { context, config } = setup();
  assert.equal(context.requestDraft().ok, true);
  config.runStatus = 'completed';
  config.conclusion = 'success';
  config.driveFiles = [deliveredFile({ runKey: '999-1' })];
  assert.equal(context.getDraftStatus(id).phase, 'error');
  config.driveFiles = [deliveredFile()];
  const result = context.getDraftStatus(id);
  assert.equal(result.phase, 'ready');
  assert.equal(result.fileUrl, 'https://drive.google.com/file/d/DriveFile_123/view');
});

test('impide segunda solicitud activa y la recupera después de recargar', () => {
  const { context, calls } = setup();
  assert.equal(context.requestDraft().ok, true);
  assert.equal(context.getLatestDraftRequest().requestId, id);
  assert.equal(context.requestDraft().requestId, id);
  assert.equal(calls.filter((call) => call.url?.endsWith('/dispatches')).length, 1);
});

test('no despacha mientras otra publicación está en cola o ejecutándose', () => {
  const { context, calls } = setup({
    openRuns: [{ id: 999, status: 'in_progress' }],
  });
  const result = context.requestDraft();
  assert.equal(result.ok, false);
  assert.equal(calls.filter((call) => call.url?.endsWith('/dispatches')).length, 0);
});

test('elimina solicitudes antiguas sin afectar la solicitud activa', () => {
  const { context, values } = setup();
  values.set('DRAFT_REQUEST_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    JSON.stringify({ requestedAtMs: clock.now - 31 * 24 * 60 * 60_000 }));
  assert.equal(context.requestDraft().ok, true);
  assert.equal(values.has('DRAFT_REQUEST_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), false);
  assert.equal(values.has('DRAFT_REQUEST_' + id), true);
});

test('fallo terminal y timeout permiten dejar atrás el run anterior', () => {
  const { context, config, values } = setup();
  assert.equal(context.requestDraft().ok, true);
  config.runStatus = 'completed';
  config.conclusion = 'failure';
  assert.equal(context.getDraftStatus(id).phase, 'failed');
  clock.now += 91_000;
  values.set('LAST_DISPATCH_MS', String(clock.now - 91_000));
  // UUID del mock es fijo: se verifica que vuelve a llamar a dispatch.
  assert.equal(context.requestDraft().ok, true);
  clock.now += 91 * 60_000;
  config.runStatus = 'in_progress';
  assert.equal(context.getDraftStatus(id).phase, 'delayed');
  clock.now = Date.parse('2026-09-30T14:00:00Z');
});

test('rechazo del despacho no se presenta como borrador generado', () => {
  const { context, values } = setup({ code: 403 });
  const result = context.requestDraft();
  assert.equal(result.ok, false);
  assert.equal(values.has('LAST_DISPATCH_MS'), false);
  assert.doesNotMatch(JSON.stringify(result), /TEST-TOKEN|github\.com/i);
});

test('manifest, UI y scopes mantienen el acceso en servidor', () => {
  const manifest = JSON.parse(readFileSync(new URL('./appsscript.json', import.meta.url), 'utf8'));
  const html = readFileSync(new URL('./Index.html', import.meta.url), 'utf8');
  assert.equal(manifest.timeZone, 'America/Lima');
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/drive.metadata.readonly'));
  assert.ok(!manifest.oauthScopes.includes('https://www.googleapis.com/auth/drive.readonly'));
  assert.equal(manifest.dependencies.enabledAdvancedServices[0].serviceId, 'drive');
  assert.deepEqual(manifest.webapp, { executeAs: 'USER_DEPLOYING', access: 'DOMAIN' });
  assert.match(html, /getDraftStatus/);
  assert.match(html, /getLatestDraftRequest/);
  assert.match(html, /1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD/);
  assert.doesNotMatch(html, /GITHUB_DISPATCH_TOKEN|TEST-TOKEN|github\.com/i);
});
