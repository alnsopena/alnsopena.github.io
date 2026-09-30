import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBaseline, businessWeek, compareBaseline, limaDateTime } from './weekly-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_HTML = path.join(ROOT, '_site', 'portafolio-ejecutivo-it', 'index.html');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'weekly-baseline.json');
const ARCHIVE_DIR = path.join(ROOT, 'scripts', 'weekly-archive');

function readSnapshot(html) {
  const match = html.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No se encontró el corte publicado');
  return JSON.parse(match[1]);
}

function replaceSnapshot(html, snapshot) {
  const serialized = JSON.stringify(snapshot)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  return html.replace(
    /(<script type="application\/json" id="snapshot">)[\s\S]*?(<\/script>)/,
    (_whole, open, close) => `${open}${serialized}${close}`,
  );
}

const html = await readFile(OUTPUT_HTML, 'utf8');
const snapshot = readSnapshot(html);
const cutAt = snapshot.extracted_at_utc;
if (!cutAt) throw new Error('El snapshot no tiene fecha de extracción');
const currentWeek = businessWeek(cutAt).key;
const current = buildBaseline(snapshot, cutAt);
let previous;
try {
  previous = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const previousWeek = previous?.week_key
  ?? (previous?.extracted_at_utc ? businessWeek(previous.extracted_at_utc).key : null);
const local = limaDateTime(cutAt);
const localDay = new Date(`${local.slice(0, 10)}T12:00:00Z`).getUTCDay();
if (localDay === 1 && Number(local.slice(11, 13)) < 9) {
  console.log(`Corte semanal pendiente hasta las 09:00 de Lima; sigue vigente ${previousWeek ?? 'sin línea base'}.`);
} else if (previousWeek === currentWeek) {
  // Idempotente aunque el workflow horario vuelva a ejecutarse o se lance a pedido.
  snapshot.weekly_baseline = previous;
  await writeFile(OUTPUT_HTML, replaceSnapshot(html, snapshot), 'utf8');
  console.log(`Corte semanal ${currentWeek} ya existe; no se reemplaza.`);
} else {
  if (previousWeek && previousWeek > currentWeek) {
    throw new Error(`La línea base ${previousWeek} es posterior al corte ${currentWeek}`);
  }
  if (previous) {
    await mkdir(ARCHIVE_DIR, { recursive: true });
    const archive = {
      schema_version: 1,
      previous_week_key: previousWeek,
      next_week_key: currentWeek,
      archived_at_utc: cutAt,
      prior_baseline: previous,
      comparison: compareBaseline(previous, current),
    };
    const archivePath = path.join(ARCHIVE_DIR, `${previousWeek}.json`);
    try {
      await readFile(archivePath, 'utf8');
      console.log(`Archivo semanal ${previousWeek} ya existe; se conserva.`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // El archivo anterior se persiste antes de reemplazar la línea base.
      await writeFile(archivePath, `${JSON.stringify(archive, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    }
  }
  snapshot.weekly_baseline = current;
  await writeFile(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  await writeFile(OUTPUT_HTML, replaceSnapshot(html, snapshot), 'utf8');
  console.log(`Corte semanal ${currentWeek}: ${current.items.length} proyectos; ${compareBaseline(previous, current).length} cambios frente al anterior.`);
}
