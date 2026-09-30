import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Code.gs'), 'utf8');
const folderId = '1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD';
const manifest = { file_name: 'Borrador.pptx', size_bytes: 1234, sha256: 'a'.repeat(64) };
const runKey = '123456-1';
const file = {
  id: 'file123', name: manifest.file_name, size: String(manifest.size_bytes),
  md5Checksum: 'b'.repeat(32), parents: [folderId],
};

function load(update) {
  const context = createContext({
    Drive: { Files: { update } },
  });
  runInContext(source, context, { filename: 'Code.gs' });
  return context;
}

test('publica metadatos del borrador para otro proyecto Apps Script', () => {
  let calls = 0;
  const context = load((resource, id, media, options) => {
    calls += 1;
    assert.equal(id, file.id);
    assert.equal(media, null);
    assert.equal(options.supportsAllDrives, true);
    assert.equal(resource.properties.pmoRunKey, runKey);
    return { ...file, properties: resource.properties };
  });
  const marked = context.pullMarkDelivery_(file, manifest, runKey);
  assert.equal(calls, 1);
  assert.equal(marked.properties.pmoSha256, manifest.sha256);
});

test('un reintento conserva los metadatos sin actualizar Drive', () => {
  const context = load(() => { throw new Error('No debe actualizar'); });
  const marked = context.pullMarkDelivery_({
    ...file, properties: { pmoRunKey: runKey, pmoSha256: manifest.sha256 },
  }, manifest, runKey);
  assert.equal(marked.id, file.id);
});

test('un archivo marcado para otro borrador no se reclama', () => {
  const context = load(() => { throw new Error('No debe actualizar'); });
  assert.throws(() => context.pullMarkDelivery_({
    ...file, properties: { pmoRunKey: 'other-1' },
  }, manifest, runKey), /PULL_DUPLICATE_RUN_CONFLICT/);
});
