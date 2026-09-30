import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { makePptConfig, validatePptDispatchUrl, writePptConfig } from './write-ppt-config.mjs';

const validUrl = 'https://script.google.com/macros/s/AKfycbx123/exec';
const corporateUrl = 'https://script.google.com/a/macros/cosmos.com.pe/s/AKfycbwBaq-LaF3dw4rR1D4sOqe6mfN08BkUnlcMsGfTNUxR1sp7JBlJkxKQjMWcJALXE7Jv8g/exec';
const pullKey = Buffer.alloc(32, 7).toString('base64');

test('acepta el despliegue estándar y el corporativo de Cosmos solamente', () => {
  assert.equal(validatePptDispatchUrl(validUrl), validUrl);
  assert.equal(validatePptDispatchUrl(corporateUrl), corporateUrl);
  assert.deepEqual(makePptConfig({ dispatchUrl: corporateUrl }),
    { delivery: 'local', dispatch_url: corporateUrl });
  for (const invalid of [
    'https://script.google.com/a/macros/otro.com.pe/s/AKfycbx123/exec',
    'https://script.google.com.evil.example/macros/s/AKfycbx123/exec',
    'http://script.google.com/macros/s/AKfycbx123/exec',
    'https://script.google.com/a/macros/cosmos.com.pe/s/AKfycbx123/exec?mode=unsafe',
    'https://script.google.com/a/macros/cosmos.com.pe/s/AKfycbx123/dev',
  ]) {
    assert.deepEqual(makePptConfig({ dispatchUrl: invalid }),
      { delivery: 'local', dispatch_url: null }, invalid);
  }
});

test('config público anuncia cloud solo tras verificación real y no publica la clave', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cosmos-ppt-config-'));
  try {
    const output = path.join(dir, 'assets', 'ppt-config.json');
    const config = await writePptConfig(output, {
      PPT_PULL_KEY_B64: pullKey,
      COSMOS_PPT_PULL_VERIFIED: 'true',
      COSMOS_PPT_DISPATCH_URL: validUrl,
    });
    assert.deepEqual(config, { delivery: 'cloud', dispatch_url: validUrl });
    const raw = await readFile(output, 'utf8');
    assert.equal(raw.includes(pullKey), false);
    assert.equal(raw.includes('PPT_PULL_KEY_B64'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('despacho funciona sin entrega pull y claves inválidas no anuncian cloud', () => {
  assert.deepEqual(makePptConfig({ pullKey, dispatchUrl: validUrl }),
    { delivery: 'local', dispatch_url: validUrl });
  assert.deepEqual(makePptConfig({ pullKey: 'not-a-32-byte-key', pullVerified: 'true',
    dispatchUrl: validUrl }),
    { delivery: 'local', dispatch_url: validUrl });
  assert.deepEqual(makePptConfig({ pullKey, pullVerified: 'true',
    dispatchUrl: 'https://example.org/redirect' }),
    { delivery: 'cloud', dispatch_url: null });
});
