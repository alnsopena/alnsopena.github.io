import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const nacl = require('../tools/weekly-ppt/nacl-fast.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'portafolio-ejecutivo-it', 'assets', 'weekly-ppt-pull');
const PPT_MIME_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const ENVELOPE_MAGIC = Buffer.from('CWP1', 'ascii');
const DRAFT_NAME = /^Portafolio_Proyectos_Borrador_\d{8}_\d{4}(?:_\d+)?\.pptx$/;
const MAX_PPT_BYTES = 10 * 1024 * 1024;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function parsePullKey(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error('PPT_PULL_KEY_B64 debe contener 32 bytes aleatorios en base64.');
  }
  const key = Buffer.from(value, 'base64');
  if (key.length !== nacl.secretbox.keyLength || key.toString('base64') !== value) {
    throw new Error('PPT_PULL_KEY_B64 no es una clave canónica de 32 bytes.');
  }
  return key;
}

export function makePullBundle(pptx, { fileName, runId, runAttempt, keyBase64,
  now = Date.now(), nonce = randomBytes(nacl.secretbox.nonceLength) }) {
  const key = parsePullKey(keyBase64);
  if (!Buffer.isBuffer(pptx) || pptx.length < 1000 || pptx.length > MAX_PPT_BYTES ||
      !pptx.subarray(0, 4).equals(PPT_MIME_MAGIC)) {
    throw new Error('El PPTX está vacío, supera 10 MB o no tiene cabecera ZIP.');
  }
  if (!DRAFT_NAME.test(fileName) || !/^\d{1,20}$/.test(String(runId)) ||
      !/^\d{1,6}$/.test(String(runAttempt)) ||
      !Number.isSafeInteger(now) || now < 0) {
    throw new Error('Metadatos del borrador no válidos.');
  }
  if (!Buffer.isBuffer(nonce) || nonce.length !== nacl.secretbox.nonceLength) {
    throw new Error('Nonce de 24 bytes no válido.');
  }
  const metadata = {
    version: 1,
    run_id: String(runId),
    run_attempt: String(runAttempt),
    file_name: fileName,
    size_bytes: pptx.length,
    sha256: sha256(pptx),
    published_at_ms: now,
  };
  const metadataBytes = Buffer.from(JSON.stringify(metadata), 'ascii');
  const envelope = Buffer.alloc(8 + metadataBytes.length + pptx.length);
  ENVELOPE_MAGIC.copy(envelope, 0);
  envelope.writeUInt32BE(metadataBytes.length, 4);
  metadataBytes.copy(envelope, 8);
  pptx.copy(envelope, 8 + metadataBytes.length);
  const ciphertext = Buffer.from(nacl.secretbox(envelope, nonce, key));
  const manifest = {
    ...metadata,
    cipher_file: `${metadata.run_id}-${metadata.run_attempt}.pptx.sb`,
    nonce_base64: nonce.toString('base64'),
    cipher_size_bytes: ciphertext.length,
    cipher_sha256: sha256(ciphertext),
  };
  return { manifest, ciphertext };
}

export async function publishPullBundle({ input, outputDir = DEFAULT_OUTPUT_DIR,
  keyBase64, runId, runAttempt, now, nonce }) {
  const source = path.resolve(input);
  const destination = path.resolve(outputDir);
  const fileName = path.basename(source);
  const sourceStat = await stat(source);
  if (!sourceStat.isFile()) throw new Error('La entrada no es un archivo PPTX.');
  const pptx = await readFile(source);
  const { manifest, ciphertext } = makePullBundle(pptx, {
    fileName, runId, runAttempt, keyBase64, now, nonce,
  });
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, manifest.cipher_file), ciphertext);
  const manifestPath = path.join(destination, 'latest.json');
  const temporaryPath = path.join(destination, `latest.${manifest.run_id}-${manifest.run_attempt}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(manifest)}\n`, 'utf8');
    await rename(temporaryPath, manifestPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  for (const name of await readdir(destination)) {
    if (/^\d{1,20}-\d{1,6}\.pptx\.sb$/.test(name) && name !== manifest.cipher_file) {
      await unlink(path.join(destination, name));
    }
  }
  return manifest;
}

function cli(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--output-dir'].includes(args[i]) || !args[i + 1]) {
      throw new Error('Uso: node scripts/publish-weekly-ppt-pull.mjs --input <borrador.pptx> [--output-dir <dir>]');
    }
    options[args[i] === '--input' ? 'input' : 'outputDir'] = args[i + 1];
  }
  if (!options.input) throw new Error('Falta --input.');
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  publishPullBundle({
    ...cli(process.argv.slice(2)),
    keyBase64: process.env.PPT_PULL_KEY_B64 ?? '',
    runId: process.env.GITHUB_RUN_ID ?? '',
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? '',
  }).then((manifest) => {
    console.log(`Borrador cifrado para consulta privada: ${manifest.cipher_file}.`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
