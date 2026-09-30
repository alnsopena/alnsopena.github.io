import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { encryptWeeklyPpt } from './encrypt-weekly-ppt.mjs';

const run = promisify(execFile);
const opensslAvailable = spawnSync('openssl', ['version'], { stdio: 'ignore' }).status === 0;

test('cifra y recupera sin cambios los bytes binarios de un PPTX', { skip: !opensslAvailable }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'weekly-ppt-cms-'));
  try {
    const input = path.join(directory, 'Portafolio_Proyectos_Borrador_20260929_0905.pptx');
    const certificate = path.join(directory, 'recipient.pem');
    const key = path.join(directory, 'recipient.key');
    const restored = path.join(directory, 'restored.pptx');
    const contents = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x0d, 0x0a]), randomBytes(4096)]);
    await writeFile(input, contents);
    await run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=weekly-ppt-test', '-keyout', key, '-out', certificate]);
    const encrypted = await encryptWeeklyPpt({ input, certificate, outputDir: path.join(directory, 'encrypted') });
    assert.equal(path.basename(encrypted), `${path.basename(input)}.cms`);
    assert.notDeepEqual(await readFile(encrypted), contents);
    await run('openssl', ['cms', '-decrypt', '-binary', '-inform', 'DER', '-in', encrypted,
      '-recip', certificate, '-inkey', key, '-out', restored]);
    assert.deepEqual(await readFile(restored), contents);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rechaza archivos que no sean PPTX antes de cifrar', async () => {
  await assert.rejects(encryptWeeklyPpt({ input: 'cut.json' }), /Solo se cifra un borrador \.pptx/);
});
