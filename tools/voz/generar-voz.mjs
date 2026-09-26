#!/usr/bin/env node
/*
 * Genera la voz del parte (Azure, voz es-US-PalomaNeural) para el Portafolio Ejecutivo de IT.
 *
 * 1. Abre el portal en un navegador sin ventana (Playwright) y le pide al motor las frases de esta semana:
 *    CosmosFx.voiceScript(PMOData.build()). Así el texto hablado sale de los MISMOS datos y reglas del portal.
 * 2. Por cada frase nueva pide el MP3 a Azure. Las frases que no cambian (por ejemplo "Buen día") se reutilizan.
 * 3. Escribe assets/voz/manifest.json y borra los MP3 que ya no se usan.
 *
 * Uso:
 *   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=eastus node tools/voz/generar-voz.mjs \
 *     --portal portafolio-ejecutivo-it/index.html --out portafolio-ejecutivo-it/assets/voz
 * Opciones: --voice es-US-PalomaNeural  --rate -3%  --force (regenera todo)  --dry (solo lista las frases)
 * Requiere Node 18+ y playwright (npm i --no-save playwright && npx playwright install chromium).
 */
import { mkdir, readFile, writeFile, readdir, unlink, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const PORTAL = resolve(opt('portal', 'portafolio-ejecutivo-it/index.html'));
const OUT = resolve(opt('out', 'portafolio-ejecutivo-it/assets/voz'));
const VOICE = opt('voice', process.env.AZURE_SPEECH_VOICE || 'es-US-PalomaNeural');
const RATE = opt('rate', '-3%');
const FORCE = !!opt('force', false), DRY = !!opt('dry', false);
const KEY = process.env.AZURE_SPEECH_KEY, REGION = process.env.AZURE_SPEECH_REGION;
const ENDPOINT = process.env.AZURE_TTS_ENDPOINT || (REGION ? `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1` : '');
const PRICE_PER_MILLION = 16;   // USD aprox. voces neurales de Azure (pago por uso); solo para el resumen

const log = (...a) => console.log('[voz]', ...a);
const exists = p => access(p).then(() => true, () => false);
const xml = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const lang = VOICE.split('-').slice(0, 2).join('-');
const ssml = text => `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${xml(VOICE)}"><prosody rate="${xml(RATE)}">${xml(text)}</prosody></voice></speak>`;

async function frases() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => { window.PMO_AV = { off: true }; });   // sin animaciones ni botones: solo datos
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(PORTAL).href, { waitUntil: 'load' });
    await page.waitForFunction(() => window.PMOData && window.CosmosFx && window.CosmosFx.voiceScript, null, { timeout: 20000 })
      .catch(() => { throw new Error('El portal no expone PMOData o CosmosFx.voiceScript (¿falta cosmos-paper-fx 2.1 o pmo-data.js?). ' + errors.join(' | ')); });
    return await page.evaluate(voice => {
      const d = PMOData.build();
      return { cut: d.cut, week: d.week && d.week.label, lines: CosmosFx.voiceScript(d).map(t => ({ text: t, say: CosmosFx.speakable(t), key: CosmosFx.voiceKey(t, voice) })) };
    }, VOICE);
  } finally { await browser.close(); }
}

async function sintetizar(text) {
  if (!KEY || !ENDPOINT) throw new Error('Faltan AZURE_SPEECH_KEY y AZURE_SPEECH_REGION.');
  for (let intento = 1; intento <= 4; intento++) {
    const r = await fetch(ENDPOINT, { method: 'POST', body: ssml(text), headers: {
      'Ocp-Apim-Subscription-Key': KEY, 'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'cosmos-portafolio-voz' } });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const detalle = (await r.text().catch(() => '')).slice(0, 200);
    if ((r.status === 429 || r.status >= 500) && intento < 4) { await new Promise(ok => setTimeout(ok, 1500 * intento)); continue; }
    throw new Error(`Azure respondió ${r.status}. ${r.status === 401 ? 'Revisa la clave y la región.' : ''} ${detalle}`);
  }
}

if (!DRY && (!KEY || !ENDPOINT)) { log('Sin AZURE_SPEECH_KEY / AZURE_SPEECH_REGION: se omite la voz (el portal usa la voz del navegador).'); process.exit(0); }
const data = await frases();
log(`${data.lines.length} frases para el corte ${data.cut} (${data.week || ''}), voz ${VOICE}`);
if (DRY) { data.lines.forEach(l => log(l.key, l.say)); process.exit(0); }

await mkdir(OUT, { recursive: true });
let nuevas = 0, chars = 0;
const manifest = { version: 1, voice: VOICE, rate: RATE, cut: data.cut, week: data.week, generated: new Date().toISOString(), lines: {} };
for (const l of data.lines) {
  const file = l.key + '.mp3', path = join(OUT, file);
  if (FORCE || !(await exists(path))) { await writeFile(path, await sintetizar(l.say)); nuevas++; chars += l.say.length; log('nueva', l.key, l.text.slice(0, 70)); }
  manifest.lines[l.key] = { file, text: l.text };
}
const manifestPath = join(OUT, 'manifest.json');
let previous = null;
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}
if (previous && previous.voice === manifest.voice && previous.rate === manifest.rate && previous.cut === manifest.cut && JSON.stringify(previous.lines) === JSON.stringify(manifest.lines)) manifest.generated = previous.generated;
await writeFile(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
const usados = new Set(Object.values(manifest.lines).map(x => x.file)); let borradas = 0;
for (const f of await readdir(OUT)) if (f.endsWith('.mp3') && !usados.has(f)) { await unlink(join(OUT, f)); borradas++; }
log(`listo: ${nuevas} nuevas, ${data.lines.length - nuevas} reutilizadas, ${borradas} borradas. ${chars} caracteres enviados (≈ USD ${(chars / 1e6 * PRICE_PER_MILLION).toFixed(4)}).`);
