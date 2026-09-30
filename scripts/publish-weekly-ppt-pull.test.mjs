import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';
import { makePullBundle, parsePullKey } from './publish-weekly-ppt-pull.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = randomBytes(32).toString('base64');
const NAME = 'Portafolio_Proyectos_Borrador_20260930_0900.pptx';
const PPTX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), randomBytes(2048)]);

function signed(bytes) {
  return Array.from(bytes, (byte) => byte > 127 ? byte - 256 : byte);
}

async function receiver(bundle, key = KEY) {
  const files = [];
  const code = await readFile(path.join(ROOT, 'tools/weekly-ppt/apps-script-pull/Code.gs'), 'utf8');
  const vendor = await readFile(path.join(ROOT, 'tools/weekly-ppt/apps-script-pull/TweetNaCl.gs'), 'utf8');
  const context = createContext({
    Date,
    PropertiesService: { getScriptProperties() { return {
      getProperty(name) { assert.equal(name, 'PPT_PULL_KEY_B64'); return key; },
    }; } },
    LockService: { getScriptLock() { return { tryLock() { return true; }, releaseLock() {} }; } },
    UrlFetchApp: { fetch(url, options) {
      assert.equal(options.followRedirects, false);
      const body = url.includes('/latest.json?') ? Buffer.from(JSON.stringify(bundle.manifest)) : bundle.ciphertext;
      return { getResponseCode() { return 200; }, getContent() { return signed(body); } };
    } },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5' },
      computeDigest(algorithm, bytes) {
        return signed(createHash(algorithm).update(Buffer.from(bytes.map((byte) => byte & 255))).digest());
      },
      base64Decode(value) { return signed(Buffer.from(value, 'base64')); },
      base64Encode(value) { return Buffer.from(value.map((byte) => byte & 255)).toString('base64'); },
      newBlob(bytes, mimeType, name) {
        return { bytes, mimeType, name,
          getDataAsString() { return Buffer.from(bytes.map((byte) => byte & 255)).toString('utf8'); } };
      },
    },
    Drive: { Files: {
      get(id) {
        if (id === '1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD') {
          return { id, mimeType: 'application/vnd.google-apps.folder', driveId: 'shared_1' };
        }
        return files.find((file) => file.id === id);
      },
      list(options) {
        assert.equal(options.corpora, 'drive');
        assert.equal(options.driveId, 'shared_1');
        const run = options.q.match(/value='([0-9]+-[0-9]+)'/);
        const name = options.q.match(/name = '([^']+)'/);
        return { files: files.filter((file) => run ? file.appProperties.pmoRunKey === run[1] : file.name === name?.[1]) };
      },
      create(metadata, blob) {
        assert.deepEqual([...metadata.parents], ['1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD']);
        const content = Buffer.from(blob.bytes.map((byte) => byte & 255));
        const file = { id: `file_${files.length + 1}`, name: metadata.name,
          size: String(content.length), parents: metadata.parents,
          md5Checksum: createHash('md5').update(content).digest('hex'),
          appProperties: metadata.appProperties, properties: metadata.properties, content };
        files.push(file);
        return file;
      },
    } },
  });
  runInContext(vendor, context);
  runInContext(code, context);
  return { files, pull: () => context.pullLatestWeeklyPpt() };
}

test('cifra el PPTX y el Apps Script lo autentica, guarda y reconoce el reintento', async () => {
  const bundle = makePullBundle(PPTX, { fileName: NAME, runId: '123', runAttempt: '2',
    keyBase64: KEY, nonce: Buffer.alloc(24, 7) });
  assert.equal(bundle.manifest.cipher_file, '123-2.pptx.sb');
  assert.equal(bundle.ciphertext.includes(PPTX), false);
  const app = await receiver(bundle);
  const first = app.pull();
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.deepEqual(app.files[0].content, PPTX);
  const again = app.pull();
  assert.equal(again.duplicate, true);
  assert.equal(app.files.length, 1);
});

test('rechaza alteración de ciphertext y una clave distinta', async () => {
  const bundle = makePullBundle(PPTX, { fileName: NAME, runId: '124', runAttempt: '1',
    keyBase64: KEY });
  const altered = { manifest: { ...bundle.manifest }, ciphertext: Buffer.from(bundle.ciphertext) };
  altered.ciphertext[40] ^= 1;
  const app = await receiver(altered);
  assert.throws(() => app.pull(), /PULL_CIPHER_HASH_MISMATCH/);
  assert.equal(app.files.length, 0);
  const wrongKey = await receiver(bundle, randomBytes(32).toString('base64'));
  assert.throws(() => wrongKey.pull(), /PULL_AUTHENTICATION_FAILED/);
});

test('rechaza metadatos públicos alterados y claves mal formadas', async () => {
  const bundle = makePullBundle(PPTX, { fileName: NAME, runId: '125', runAttempt: '1',
    keyBase64: KEY });
  const altered = { ...bundle, manifest: { ...bundle.manifest, file_name: NAME.replace('0900', '0901') } };
  const app = await receiver(altered);
  assert.throws(() => app.pull(), /PULL_METADATA_MISMATCH/);
  assert.throws(() => parsePullKey('password-which-is-long-but-not-random'));
  assert.throws(() => makePullBundle(Buffer.from('not a PPTX'), {
    fileName: NAME, runId: '126', runAttempt: '1', keyBase64: KEY,
  }));
});
