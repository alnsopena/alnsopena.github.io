import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';
import { deliverWeeklyPptCloud, makeDeliveryPayload, validateAppsScriptUrl } from './deliver-weekly-ppt-cloud.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'Portafolio_Proyectos_Borrador_20260930_0900.pptx';
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbx123/exec';
const SECRET = 'test-only-secret-with-more-than-32-characters';
const pptx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(1200, 13)]);

function signedBytes(buffer) {
  return [...buffer].map((value) => value > 127 ? value - 256 : value);
}

async function mockAppsScript() {
  const files = [];
  const code = await readFile(path.join(ROOT, 'tools/weekly-ppt/apps-script/Code.gs'), 'utf8');
  const context = createContext({
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(value) { return { text: value, setMimeType() { return this; } }; },
    },
    PropertiesService: { getScriptProperties() { return { getProperty() { return SECRET; } }; } },
    LockService: { getScriptLock() { return { tryLock() { return true; }, releaseLock() {} }; } },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5' },
      computeDigest(algorithm, value) {
        return signedBytes(createHash(algorithm).update(Buffer.from(value.map((byte) => byte & 255))).digest());
      },
      computeHmacSha256Signature(value, key) {
        return signedBytes(createHmac('sha256', key).update(value, 'utf8').digest());
      },
      base64Decode(value) { return signedBytes(Buffer.from(value, 'base64')); },
      newBlob(bytes, mimeType, name) { return { bytes, mimeType, name }; },
    },
    Drive: {
      Files: {
        get(id, options) {
          assert.equal(options.supportsAllDrives, true);
          if (id === '1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD') {
            return { id, mimeType: 'application/vnd.google-apps.folder', driveId: 'shared_drive_1' };
          }
          return files.find((file) => file.id === id) || null;
        },
        list(options) {
          assert.equal(options.corpora, 'drive');
          assert.equal(options.driveId, 'shared_drive_1');
          const runMatch = options.q.match(/value='([0-9]+-[0-9]+)'/);
          if (runMatch) return { files: files.filter((file) => file.runKey === runMatch[1]) };
          const nameMatch = options.q.match(/name = '([^']+)'/);
          return { files: files.filter((file) => file.name === nameMatch?.[1]) };
        },
        create(metadata, blob, options) {
          assert.equal(options.supportsAllDrives, true);
          assert.deepEqual([...metadata.parents], ['1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD']);
          const bytes = Buffer.from(blob.bytes.map((byte) => byte & 255));
          const file = {
            id: `mock_file_${files.length + 1}`,
            name: metadata.name,
            parents: metadata.parents,
            size: String(bytes.length),
            md5Checksum: createHash('md5').update(bytes).digest('hex'),
            runKey: metadata.appProperties.pmoRunKey,
          };
          files.push(file);
          return file;
        },
      },
    },
  });
  runInContext(code, context);
  return { files, post: (payload) => JSON.parse(context.doPost({
    contentLength: Buffer.byteLength(JSON.stringify(payload)),
    postData: { type: 'application/json; charset=utf-8', contents: JSON.stringify(payload) },
  }).text) };
}

test('receptor sube al borrador fijo y un reintento no crea una segunda PPT', async () => {
  const receiver = await mockAppsScript();
  const payload = makeDeliveryPayload(pptx, {
    fileName: NAME, runId: '100', runAttempt: '1', secret: SECRET,
    nonce: '0123456789abcdef0123456789abcdef',
  });
  const first = receiver.post(payload);
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(receiver.files.length, 1);
  const second = receiver.post(payload);
  assert.equal(second.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(receiver.files.length, 1);
});

test('receptor rechaza firma alterada, cuerpo alterado y peticiones viejas', async () => {
  const receiver = await mockAppsScript();
  const payload = makeDeliveryPayload(pptx, {
    fileName: NAME, runId: '101', runAttempt: '1', secret: SECRET,
    nonce: 'fedcba9876543210fedcba9876543210',
  });
  assert.equal(receiver.post({ ...payload, file_name: NAME.replace('0900', '0901') }).code, 'INVALID_SIGNATURE');
  const altered = { ...payload, pptx_base64: payload.pptx_base64.replace(/A/, 'B') };
  assert.equal(receiver.post(altered).code, 'INVALID_HASH');
  assert.equal(receiver.post({ ...payload, issued_at_ms: Date.now() - 6 * 60 * 1000 }).code, 'INVALID_REQUEST');
  assert.equal(receiver.files.length, 0);
});

test('no duplica el mismo borrador que ya llegó desde la tarea de Windows', async () => {
  const receiver = await mockAppsScript();
  const first = makeDeliveryPayload(pptx, { fileName: NAME, runId: '103', runAttempt: '1',
    secret: SECRET, nonce: '11111111111111111111111111111111' });
  const nextRun = makeDeliveryPayload(pptx, { fileName: NAME, runId: '104', runAttempt: '1',
    secret: SECRET, nonce: '22222222222222222222222222222222' });
  assert.equal(receiver.post(first).ok, true);
  const result = receiver.post(nextRun);
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, true);
  assert.equal(receiver.files.length, 1);
});

test('no sobrescribe un PPT distinto que comparta el nombre del borrador', async () => {
  const receiver = await mockAppsScript();
  const first = makeDeliveryPayload(pptx, { fileName: NAME, runId: '105', runAttempt: '1',
    secret: SECRET, nonce: '33333333333333333333333333333333' });
  const otherPptx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(1200, 14)]);
  const second = makeDeliveryPayload(otherPptx, { fileName: NAME, runId: '106', runAttempt: '1',
    secret: SECRET, nonce: '44444444444444444444444444444444' });
  assert.equal(receiver.post(first).ok, true);
  assert.equal(receiver.post(second).code, 'NAME_CONFLICT');
  assert.equal(receiver.files.length, 1);
});

test('uploader Node y receptor Apps Script comparten protocolo y verifican recibo', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cosmos-cloud-ppt-'));
  try {
    const input = path.join(dir, NAME);
    await writeFile(input, pptx);
    const receiver = await mockAppsScript();
    const result = await deliverWeeklyPptCloud({
      input, endpoint: ENDPOINT, secret: SECRET, runId: '102', runAttempt: '2',
      fetchImpl: async (_url, options) => ({
        ok: true, status: 200,
        json: async () => receiver.post(JSON.parse(options.body)),
      }),
    });
    assert.equal(result.file_name, NAME);
    assert.equal(result.run_key, '102-2');
    assert.equal(receiver.files.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('solo permite URLs exactas del despliegue Apps Script', () => {
  assert.equal(validateAppsScriptUrl(ENDPOINT), ENDPOINT);
  for (const url of [
    'http://script.google.com/macros/s/a/exec',
    'https://script.google.com.evil.test/macros/s/a/exec',
    'https://script.google.com/macros/s/a/dev',
    'https://script.google.com/macros/s/a/exec?token=abc',
  ]) assert.throws(() => validateAppsScriptUrl(url));
});
