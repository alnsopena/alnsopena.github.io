import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_HTML = path.join(ROOT, '_site', 'portafolio-ejecutivo-it', 'index.html');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'weekly-baseline.json');
const TRACKED_COLUMNS = [
  'status',
  'color_mkzzg1vp',
  'multiple_person_mm087pe3',
  'color_mm6kg2n5',
  'numeric_mkzrc075',
  'date_mkzrb4nr',
  'date_mm6zv2hs',
  'date_mm6d8mx',
  'color_mm6zdfgs',
  'color_mm6zq06e',
];

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
const baseline = {
  extracted_at_utc: snapshot.extracted_at_utc,
  items: snapshot.items.map((item) => ({
    id: String(item.id),
    name: item.name,
    column_values: Object.fromEntries(
      TRACKED_COLUMNS.map((column) => [column, item.column_values?.[column] ?? null]),
    ),
  })),
};

snapshot.weekly_baseline = baseline;
await writeFile(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
await writeFile(OUTPUT_HTML, replaceSnapshot(html, snapshot), 'utf8');
console.log(`Corte semanal actualizado: ${baseline.extracted_at_utc} · ${baseline.items.length} proyectos.`);
