import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { makePptConfig, writePptConfig } from './write-ppt-config.mjs';

const validUrl = 'https://script.google.com/macros/s/AKfycbx123/exec';

test('config público solo anuncia cloud con ambos secretos y no los publica', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cosmos-ppt-config-'));
  try {
    const output = path.join(dir, 'assets', 'ppt-config.json');
    const config = await writePptConfig(output, {
      PPT_DELIVERY_WEBAPP_URL: validUrl,
      PPT_DELIVERY_HMAC_SECRET: 'never-publish-this-secret-never-publish',
      COSMOS_PPT_DISPATCH_URL: validUrl,
    });
    assert.deepEqual(config, { delivery: 'cloud', dispatch_url: validUrl });
    const raw = await readFile(output, 'utf8');
    assert.equal(raw.includes('never-publish-this-secret'), false);
    assert.equal(raw.includes('PPT_DELIVERY_WEBAPP_URL'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('config vuelve a local si falta un secreto u host del despacho es ajeno', () => {
  assert.deepEqual(makePptConfig({ deliveryUrl: validUrl, dispatchUrl: validUrl }),
    { delivery: 'local', dispatch_url: null });
  assert.deepEqual(makePptConfig({ deliveryUrl: validUrl,
    deliverySecret: 'test-only-secret-with-more-than-32-characters',
    dispatchUrl: 'https://example.org/redirect' }),
    { delivery: 'cloud', dispatch_url: null });
  assert.deepEqual(makePptConfig({ deliveryUrl: 'https://example.org/receiver',
    deliverySecret: 'test-only-secret-with-more-than-32-characters',
    dispatchUrl: validUrl }),
    { delivery: 'local', dispatch_url: null });
});
