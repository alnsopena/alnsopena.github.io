import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');

function setup({ email = 'pmo@cosmos.com.pe', allow = 'pmo@cosmos.com.pe', token = 'TEST-TOKEN', code = 200 } = {}) {
  const values = new Map([
    ['PMO_ALLOWED_EMAILS', allow],
    ['GITHUB_DISPATCH_TOKEN', token],
  ]);
  const requests = [];
  let locked = false;
  const context = vm.createContext({
    Session: { getActiveUser: () => ({ getEmail: () => email }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key) => values.get(key),
      setProperty: (key, value) => values.set(key, value),
    }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => { locked = true; return true; },
      releaseLock: () => { locked = false; },
    }) },
    UrlFetchApp: { fetch: (url, options) => {
      requests.push({ url, options });
      return {
        getResponseCode: () => code,
        getContentText: () => JSON.stringify({
          html_url: 'https://github.com/alnsopena/alnsopena.github.io/actions/runs/123',
        }),
      };
    } },
    HtmlService: {
      createHtmlOutputFromFile: () => ({ setTitle() { return this; } }),
      createHtmlOutput: () => ({ setTitle() { return this; } }),
    },
  });
  vm.runInContext(source, context, { filename: 'Code.gs' });
  return { context, values, requests, isLocked: () => locked };
}

test('PMO autorizado despacha solo generate_ppt=true en main', () => {
  const { context, requests, isLocked } = setup();
  const result = context.requestDraft();
  assert.equal(result.ok, true);
  assert.equal(result.runUrl, 'https://github.com/alnsopena/alnsopena.github.io/actions/runs/123');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.github.com/repos/alnsopena/alnsopena.github.io/actions/workflows/publicar-portafolio.yml/dispatches');
  assert.deepEqual(JSON.parse(requests[0].options.payload), { ref: 'main', inputs: { generate_ppt: 'true' } });
  assert.equal(requests[0].options.headers.Authorization, 'Bearer TEST-TOKEN');
  assert.equal(isLocked(), false);
  assert.doesNotMatch(JSON.stringify(result), /TEST-TOKEN/);
});

test('sin identidad, fuera de dominio o fuera de allowlist falla cerrado', () => {
  for (const options of [
    { email: '' },
    { email: 'pmo@otro.com' },
    { email: 'otro@cosmos.com.pe' },
    { allow: '' },
  ]) {
    const { context, requests } = setup(options);
    assert.equal(context.requestDraft().ok, false);
    assert.equal(requests.length, 0);
  }
});

test('se impiden despachos duplicados inmediatos', () => {
  const { context, requests } = setup();
  assert.equal(context.requestDraft().ok, true);
  assert.equal(context.requestDraft().ok, false);
  assert.equal(requests.length, 1);
});

test('GitHub rechazado no se presenta como borrador generado', () => {
  const { context, requests, values } = setup({ code: 403 });
  const result = context.requestDraft();
  assert.equal(result.ok, false);
  assert.equal(requests.length, 1);
  assert.equal(values.has('LAST_DISPATCH_MS'), false);
  assert.doesNotMatch(JSON.stringify(result), /TEST-TOKEN/);
});

test('manifest y carpetas son las previstas', () => {
  const manifest = JSON.parse(readFileSync(new URL('./appsscript.json', import.meta.url), 'utf8'));
  const html = readFileSync(new URL('./Index.html', import.meta.url), 'utf8');
  assert.equal(manifest.timeZone, 'America/Lima');
  assert.match(html, /1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD/);
  assert.match(html, /12eFLOouq6IvpvJ37wkNXYX0BHQilHyiD/);
  assert.doesNotMatch(html, /GITHUB_DISPATCH_TOKEN|TEST-TOKEN/);
});
