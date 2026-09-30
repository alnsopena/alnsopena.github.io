import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { upload } from './upload-weekly-ppt-drive.mjs';

const ROOT_ID = '12eFLOouq6IvpvJ37wkNXYX0BHQilHyiD';
const DRAFT_ID = 'draftFolder123456789';

test('sube un borrador nuevo solo a Borradores automáticos de la unidad compartida', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cosmos-ppt-upload-'));
  const filePath = path.join(directory, 'Portafolio_Proyectos_Borrador_2026-09-29_0910.pptx');
  const payload = Buffer.alloc(1500);
  payload.write('PK');
  await writeFile(filePath, payload);
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const logMessages = [];
  const previousAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  const calls = [];
  process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    type: 'service_account', client_email: 'test@example.test', private_key: privateKey,
  });
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    if (url.pathname === '/token') {
      assert.match(String(options.body), /jwt-bearer/);
      return Response.json({ access_token: 'mock-token' });
    }
    assert.equal(options.headers.authorization, 'Bearer mock-token');
    if (url.pathname === `/drive/v3/files/${ROOT_ID}`) {
      assert.equal(url.searchParams.get('supportsAllDrives'), 'true');
      return Response.json({ id: ROOT_ID, mimeType: 'application/vnd.google-apps.folder', driveId: 'sharedDrive123' });
    }
    if (url.pathname === '/drive/v3/files' && options.method !== 'POST') {
      assert.match(url.searchParams.get('q'), /Borradores automáticos/);
      return Response.json({ files: [{ id: DRAFT_ID, capabilities: { canAddChildren: true } }] });
    }
    if (url.pathname === '/upload/drive/v3/files' && options.method === 'POST') {
      const metadata = JSON.parse(options.body);
      assert.deepEqual(metadata.parents, [DRAFT_ID]);
      assert.match(metadata.name, /Borrador/);
      return new Response(null, { headers: { location: 'https://www.googleapis.com/upload/drive/v3/files/session-test' } });
    }
    assert.equal(url.pathname, '/upload/drive/v3/files/session-test');
    assert.equal(options.method, 'PUT');
    assert.equal(options.body.length, payload.length);
    return Response.json({ id: 'uploaded123', name: path.basename(filePath),
      parents: [DRAFT_ID], webViewLink: 'https://drive.google.com/file/d/uploaded123/view' });
  };
  try {
    console.log = (...parts) => logMessages.push(parts.join(' '));
    await upload(filePath, ROOT_ID);
    assert.equal(calls.length, 5);
    assert.match(logMessages.join('\n'), /Borrador guardado en Drive/);
  } finally {
    console.log = originalLog;
    globalThis.fetch = originalFetch;
    if (previousAccount === undefined) delete process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
    else process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON = previousAccount;
    await rm(directory, { recursive: true, force: true });
  }
});
