import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseProjects, projectModel, normalize, isDone } from './weekly-ppt-model.mjs';
import { loadStandardSlides, renderStandardDeck, coverSlide, summarySlide, projectSlide, annexSlide, guideSlide } from './weekly-ppt-template.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'tools', 'weekly-ppt');
const DEFAULT_INPUT = path.join(ROOT, '_build', 'weekly-cut.json');
const DEFAULT_OUTPUT = path.join(ROOT, '_build', 'weekly-ppt');
const CONFIG = path.join(BRAND, 'selection.json');
const TEMPLATE = path.join(BRAND, 'formato-estandar.pptx');
const FIELD_MAP = path.join(BRAND, 'field-map.json');
const BOARD_URL = 'https://cosmos-digital-transformation.monday.com/boards/18396270726';
const PORTAL_URL = 'https://alnsopena.github.io/portafolio-ejecutivo-it/';

function cli(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!['--input', '--output-dir', '--config'].includes(key) || !argv[i + 1]) throw new Error(`Argumento inválido: ${key}`);
    result[key === '--output-dir' ? 'outputDir' : key.slice(2)] = path.resolve(argv[++i]);
  }
  return result;
}
async function uniqueOutput(dir, cut) {
  const local = cut.extracted_at_lima ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(cut.extracted_at_utc)).replace(' ', 'T');
  const stamp = local.slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
  for (let i = 0; i < 100; i++) {
    const candidate = path.join(dir, `Portafolio_Proyectos_Borrador_${stamp}${i ? '_' + (i + 1) : ''}.pptx`);
    try { await stat(candidate); } catch (error) { if (error.code === 'ENOENT') return candidate; throw error; }
  }
  throw new Error('No se encontró un nombre libre para el borrador');
}
function sourceNotes(cut, extra = '') {
  return `Fuente: ${BOARD_URL}\nPortal con cortes posteriores: ${PORTAL_URL}\nID de corte: ${cut.cut_id}\nExtracción UTC: ${cut.extracted_at_utc}\nSemana revisada: ${JSON.stringify(cut.reporting_week ?? {})}\n${extra}`;
}
function projectNotes(cut, m) {
  return sourceNotes(cut, [
    `Proyecto: ${m.item.name} (${m.item.id})`, `Fuente de la ficha: ${BOARD_URL}/pulses/${m.item.id}`,
    'Datos leídos, sin inferir salud ni fechas: ' + JSON.stringify(m.fields),
    'Última bitácora al corte: ' + JSON.stringify(m.latest),
    'Bitácora íntegra: ' + JSON.stringify(m.item.updates ?? []),
    'Subelementos tipificados íntegros: ' + JSON.stringify(m.records),
    'Por completar: ' + m.missing.join(', '),
    'Solo se muestran cuatro hitos más Go-Live, cuatro próximas acciones y hasta ocho actividades en un único anexo. El resto conserva aquí su detalle.',
    'Go-Live toma Fin Plan. Fin Real del proyecto es cierre efectivo y no se usa como fecha de producción de un hito.',
    'Los puntos porcentuales comparan avance. Los días comparan fechas base y reales o previstas del mismo hito.',
  ].join('\n'));
}
export async function generateWeeklyPpt(options = {}) {
  const input = path.resolve(options.input ?? DEFAULT_INPUT), outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT);
  const [cut, config, map, templates] = await Promise.all([
    readFile(input, 'utf8').then(JSON.parse), readFile(options.config ?? CONFIG, 'utf8').then(JSON.parse),
    readFile(FIELD_MAP, 'utf8').then(JSON.parse), loadStandardSlides(TEMPLATE),
  ]);
  if (cut.schema_version !== 1 || !Array.isArray(cut.projects) || !cut.extracted_at_utc || !Number.isFinite(Date.parse(cut.extracted_at_utc))) throw new Error('Corte semanal incompleto o versión de esquema no compatible');
  if (cut.cut_id !== `${cut.board?.id ?? map.board_id}:${cut.extracted_at_utc}`) throw new Error('El ID del corte no coincide con el tablero y la extracción que alimentan el portal');
  if (cut.activity?.coverage?.complete !== true) throw new Error('La bitácora semanal de monday no tiene cobertura completa; no se genera un borrador');
  if (!cut.board?.columns?.length) throw new Error('El corte no contiene el esquema actual de columnas de monday');
  const selected = chooseProjects(cut, config, map), models = selected.map(item => projectModel(item, cut, map));
  const reviewed = Boolean(config.reviewed_reporting_week === cut.reporting_week?.key && config.reviewed_cut_id === cut.cut_id);
  const slides = [{ base: 1, xml: coverSlide(templates.get(1), cut, reviewed), notes: sourceNotes(cut, `Selección ${reviewed ? 'revisada' : 'por revisar'} por PMO. Borrador automático, no sustituye una versión final.`) }];
  const summaryPages = Math.max(1, Math.ceil(models.length / 12));
  for (let page = 0; page < summaryPages; page++) slides.push({ base: 2, xml: summarySlide(templates.get(2), cut, models, models.slice(page * 12, page * 12 + 12), page + 1, summaryPages), notes: sourceNotes(cut, `Conteos sobre los mismos ${models.length} proyectos de la selección ejecutiva. IDs: ${selected.map(i => i.id).join(', ')}. No son totales de todo el tablero ni estados de salud calculados.`) });
  for (const model of models) {
    slides.push({ base: 3, xml: projectSlide(templates.get(3), cut, model), notes: projectNotes(cut, model) });
    if (model.activities.some(r => (r.forecastStart && r.forecastFinish && r.forecastStart <= r.forecastFinish) || (r.baselineStart && r.baselineFinish && r.baselineStart <= r.baselineFinish))) slides.push({ base: 5, xml: annexSlide(templates.get(5), cut, model), notes: projectNotes(cut, model) });
  }
  slides.push({ base: 6, xml: guideSlide(templates.get(6), cut), notes: sourceNotes(cut, 'Guía ajustada a las definiciones confirmadas el 27/10/2026. No se crea ni se calcula una columna Salud.') });
  await mkdir(outputDir, { recursive: true });
  const output = await uniqueOutput(outputDir, cut);
  await writeFile(output, await renderStandardDeck(TEMPLATE, slides));
  const qa = { template_version: 2, cut_id: cut.cut_id, source: input, output, extracted_at_utc: cut.extracted_at_utc, reporting_week: cut.reporting_week ?? null,
    selection_reviewed_by_pmo: reviewed, slide_count: slides.length, currency_totals_omitted: true, final_untouched: true,
    projects: models.map(m => ({ id: String(m.item.id), name: m.item.name, missing: m.missing, movements: m.movements,
      milestones: m.milestones.length, actions: m.actions.length, activities: m.activities.length, latest_update_id: m.latest?.id ?? null,
      warnings: m.records.flatMap(r => r.warnings.map(w => `${r.name}: ${w}`)),
      completed_without_actual: m.records.filter(r => isDone(r.status) && !r.actualFinish).map(r => r.name),
      omitted_from_visible_slide: { milestones: Math.max(0, m.milestones.filter(r => !/^(go live|salida (a |en )?produccion)$/.test(normalize(r.name))).length - 4), actions: Math.max(0, m.actions.length - 4), activities: Math.max(0, m.activities.length - 8) },
    })) };
  await writeFile(path.join(outputDir, 'latest-path.txt'), output + '\n', 'utf8');
  await writeFile(path.join(outputDir, 'latest-qa.json'), JSON.stringify(qa, null, 2), 'utf8');
  return qa;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generateWeeklyPpt(cli(process.argv.slice(2)))
  .then(qa => console.log(JSON.stringify({ output: qa.output, slide_count: qa.slide_count, reviewed: qa.selection_reviewed_by_pmo })))
  .catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
