import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePullKey } from './publish-weekly-ppt-pull.mjs';

export function validatePptDispatchUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port ||
      url.username || url.password || url.search || url.hash ||
      !/^\/(?:macros\/s|a\/macros\/cosmos\.com\.pe\/s)\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) {
    throw new Error('La URL de despacho no es un despliegue HTTPS /exec válido.');
  }
  return url.href;
}

export function makePptConfig({ pullKey, pullVerified, dispatchUrl }) {
  let delivery = 'local';
  if (pullVerified === 'true') {
    try {
      parsePullKey(pullKey);
      delivery = 'cloud';
    } catch {
      // Una confirmación manual sin la clave activa no habilita el aviso cloud.
    }
  }
  let dispatch_url = null;
  if (dispatchUrl?.trim()) {
    try {
      dispatch_url = validatePptDispatchUrl(dispatchUrl.trim());
    } catch {
      // Un enlace mal configurado no debe llegar a la web pública.
    }
  }
  return { delivery, dispatch_url };
}

export async function writePptConfig(output, env = process.env) {
  const config = makePptConfig({
    pullKey: env.PPT_PULL_KEY_B64,
    pullVerified: env.COSMOS_PPT_PULL_VERIFIED,
    dispatchUrl: env.COSMOS_PPT_DISPATCH_URL,
  });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(config)}\n`, 'utf8');
  return config;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4 || process.argv[2] !== '--output') {
    console.error('Uso: node scripts/write-ppt-config.mjs --output <ppt-config.json>');
    process.exitCode = 1;
  } else {
    writePptConfig(process.argv[3]).then((config) => {
      console.log(`Configuración pública PPT: ${config.delivery}; enlace de despacho ${config.dispatch_url ? 'configurado' : 'no configurado'}.`);
    }).catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
