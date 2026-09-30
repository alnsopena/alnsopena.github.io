import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAppsScriptUrl } from './deliver-weekly-ppt-cloud.mjs';

export function makePptConfig({ deliveryUrl, deliverySecret, dispatchUrl }) {
  let delivery = 'local';
  if (deliveryUrl?.trim() && deliverySecret?.length >= 32) {
    try {
      validateAppsScriptUrl(deliveryUrl.trim());
      delivery = 'cloud';
    } catch {
      // Publicar modo local cuando el endpoint de entrega no sea válido.
    }
  }
  let dispatch_url = null;
  if (delivery === 'cloud' && dispatchUrl?.trim()) {
    try {
      dispatch_url = validateAppsScriptUrl(dispatchUrl.trim());
    } catch {
      // Un enlace mal configurado no debe llegar a la web pública.
    }
  }
  return { delivery, dispatch_url };
}

export async function writePptConfig(output, env = process.env) {
  const config = makePptConfig({
    deliveryUrl: env.PPT_DELIVERY_WEBAPP_URL,
    deliverySecret: env.PPT_DELIVERY_HMAC_SECRET,
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
