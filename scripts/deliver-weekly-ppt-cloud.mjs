import { createHash, createHmac, randomBytes } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_PPT_BYTES = 10 * 1024 * 1024;
export const DRAFT_NAME = /^Portafolio_Proyectos_Borrador_\d{8}_\d{4}(?:_\d+)?\.pptx$/;

export function validateAppsScriptUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port ||
      url.username || url.password || url.search || url.hash ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) {
    throw new Error('La URL de Apps Script no es un despliegue HTTPS /exec válido.');
  }
  return url.href;
}

export function canonicalDeliveryString(payload) {
  return [
    'COSMOS_WEEKLY_PPT_V1',
    payload.issued_at_ms,
    payload.run_id,
    payload.run_attempt,
    payload.nonce,
    payload.file_name,
    payload.size_bytes,
    payload.sha256,
  ].join('\n');
}

export function makeDeliveryPayload(bytes, { fileName, runId, runAttempt, secret,
  now = Date.now(), nonce = randomBytes(16).toString('hex') }) {
  if (!Buffer.isBuffer(bytes)) throw new Error('Se esperan bytes de PPTX.');
  if (bytes.length < 1000 || bytes.length > MAX_PPT_BYTES ||
      !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    throw new Error('El PPTX está vacío, excede 10 MB o no tiene cabecera ZIP.');
  }
  if (!DRAFT_NAME.test(fileName)) throw new Error('Nombre de borrador no válido.');
  if (!/^\d{1,20}$/.test(String(runId)) || !/^\d{1,6}$/.test(String(runAttempt))) {
    throw new Error('Identidad de ejecución de GitHub Actions no válida.');
  }
  if (!/^[0-9a-f]{32}$/.test(nonce)) throw new Error('Nonce no válido.');
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('Falta un secreto HMAC de al menos 32 caracteres.');
  }
  const payload = {
    version: 1,
    issued_at_ms: now,
    run_id: String(runId),
    run_attempt: String(runAttempt),
    nonce,
    file_name: fileName,
    size_bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    pptx_base64: bytes.toString('base64'),
  };
  payload.signature = createHmac('sha256', secret)
    .update(canonicalDeliveryString(payload), 'utf8').digest('hex');
  return payload;
}

export async function deliverWeeklyPptCloud({ input, endpoint, secret, runId, runAttempt,
  fetchImpl = fetch, now, nonce }) {
  const url = validateAppsScriptUrl(endpoint);
  const fileName = path.basename(input);
  const bytes = await readFile(input);
  const payload = makeDeliveryPayload(bytes, { fileName, runId, runAttempt, secret, now, nonce });
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Apps Script devolvió HTTP ${response.status}.`);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Apps Script no devolvió una confirmación JSON válida.');
  }
  if (result?.ok !== true || result.run_key !== `${payload.run_id}-${payload.run_attempt}` ||
      result.file_name !== payload.file_name || Number(result.size_bytes) !== payload.size_bytes ||
      result.sha256 !== payload.sha256 || !/^[A-Za-z0-9_-]+$/.test(result.file_id ?? '')) {
    throw new Error(`Apps Script no confirmó el borrador: ${String(result?.code ?? 'respuesta inválida')}.`);
  }
  return result;
}

function cli(args) {
  if (args.length !== 2 || args[0] !== '--input' || !args[1]) {
    throw new Error('Uso: node scripts/deliver-weekly-ppt-cloud.mjs --input <borrador.pptx>');
  }
  return args[1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deliverWeeklyPptCloud({
    input: cli(process.argv.slice(2)),
    endpoint: process.env.PPT_DELIVERY_WEBAPP_URL ?? '',
    secret: process.env.PPT_DELIVERY_HMAC_SECRET ?? '',
    runId: process.env.GITHUB_RUN_ID ?? '',
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? '',
  }).then(async (result) => {
    console.log(`Borrador entregado a Drive: ${result.file_name} (${result.size_bytes} bytes).`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      const line = `Borrador guardado en [Drive](https://drive.google.com/file/d/${result.file_id}/view) · ${result.file_name}\n`;
      await appendFile(process.env.GITHUB_STEP_SUMMARY, line);
    }
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
