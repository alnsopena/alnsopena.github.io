import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pptxgen from 'pptxgenjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOARD_URL = 'https://cosmos-digital-transformation.monday.com/boards/18396270726';
const PORTAL_URL = 'https://alnsopena.github.io/portafolio-ejecutivo-it/';
const DEFAULT_INPUT = path.join(ROOT, '_build', 'weekly-cut.json');
const DEFAULT_OUTPUT = path.join(ROOT, '_build', 'weekly-ppt');
const CONFIG = path.join(ROOT, 'tools', 'weekly-ppt', 'selection.json');
const BRAND = path.join(ROOT, 'tools', 'weekly-ppt');
const C = { navy: '021E2F', teal: '003D53', sand: 'CBA785', ink: '143246', muted: '617683', line: 'B6C8CF', pale: 'F4F7F8', white: 'FFFFFF', warning: 'B6493B', amber: 'A76B24' };
const FONT = 'Arial';

function cli(argv) {
  const result = { input: DEFAULT_INPUT, outputDir: DEFAULT_OUTPUT, config: CONFIG };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!['--input', '--output-dir', '--config'].includes(key) || !argv[index + 1]) throw new Error(`Argumento inválido: ${key}`);
    result[key === '--output-dir' ? 'outputDir' : key.slice(2)] = path.resolve(argv[++index]);
  }
  return result;
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function plain(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

function excerpt(value, max = 190) {
  const text = plain(value);
  if (text.length <= max) return text;
  const head = text.slice(0, max - 1);
  const lastSpace = head.lastIndexOf(' ');
  return `${head.slice(0, lastSpace > max * 0.7 ? lastSpace : max - 1).trim()}…`;
}

function columns(cut) {
  return new Map((cut.board?.columns ?? []).map((column) => [normalize(column.title ?? column.name), String(column.id)]));
}

function value(item, cols, titles, fallbackId) {
  const values = item.column_values ?? {};
  for (const title of titles) {
    const id = cols.get(normalize(title));
    if (id && Object.hasOwn(values, id)) return plain(values[id]);
  }
  if (fallbackId && [...cols.values()].includes(fallbackId) && Object.hasOwn(values, fallbackId)) return plain(values[fallbackId]);
  return '';
}

function fields(item, cols) {
  return {
    status: value(item, cols, ['Estatus', 'Estado'], 'status'),
    pm: value(item, cols, ['PM', 'Project Manager'], 'multiple_person_mm087pe3'),
    phase: value(item, cols, ['Fase Actual', 'Fase'], 'color_mm6kg2n5'),
    progress: value(item, cols, ['% Avance', 'Avance'], 'numeric_mkzrc075'),
    plannedFinish: value(item, cols, ['Fin Plan', 'Fin planificado'], 'date_mkzrb4nr'),
    actualFinish: value(item, cols, ['Fin Real', 'Cierre real'], 'date_mm6d8mx'),
    situation: value(item, cols, ['Situación', 'Situacion', 'Situación actual'], 'text_mm7fvxjn'),
    risk: value(item, cols, ['Riesgo / Bloqueo', 'Riesgo', 'Bloqueo'], 'color_mm6zdfgs'),
    decision: value(item, cols, ['Acción / decisión requerida', 'Accion / decision requerida'], 'long_text_mm6zs5rc'),
    priority: value(item, cols, ['Priority', 'Prioridad'], 'color_mkzzg1vp'),
  };
}

function formatDate(iso) {
  const match = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function formatCut(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Fecha de corte no disponible';
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(/\./g, '');
}

function inReportingWeek(iso, cut) {
  const start = Date.parse(cut.reporting_week?.start_at_utc ?? cut.week?.start_at_utc ?? '');
  const end = Date.parse(cut.reporting_week?.end_at_utc ?? cut.week?.end_at_utc ?? '');
  const current = Date.parse(iso ?? '');
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(current) && current >= start && current < end;
}

function weeklyUpdates(item, cut) {
  return (item.updates ?? []).filter((entry) => inReportingWeek(entry.created_at, cut))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function activityLabel(event, cols) {
  if (event.classification !== 'business_change') return '';
  const field = [...cols.entries()].find(([, id]) => id === String(event.column_id))?.[0] ?? '';
  const before = plain(event.before_text);
  const after = plain(event.after_text);
  if (!after || before === after) return '';
  const labels = new Map([
    ['estatus', 'Estado'], ['estado', 'Estado'], ['fase actual', 'Fase'], ['fase', 'Fase'],
    [' avance', 'Avance'], ['avance', 'Avance'], ['fin plan', 'Fin planificado'],
    ['riesgo bloqueo', 'Riesgo'], ['situacion', 'Situación'],
    ['accion decision requerida', 'Decisión requerida'],
  ]);
  const label = labels.get(field);
  if (!label) return '';
  if (label === 'Situación' || label === 'Decisión requerida') return `${label} actualizada`;
  return `${label}: ${excerpt(before || 'sin dato previo', 36)} → ${excerpt(after, 55)}`;
}

function weeklyEvents(item, cut, cols) {
  return (cut.activity?.events ?? []).filter((event) => String(event.item_id) === String(item.id) && inReportingWeek(event.at_utc, cut))
    .map((event) => ({ at: event.at_utc, text: activityLabel(event, cols) }))
    .filter((entry) => entry.text)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function projectMovements(item, cut, cols) {
  const events = weeklyEvents(item, cut, cols);
  const posts = weeklyUpdates(item, cut).map((update) => ({ at: update.created_at, text: excerpt(update.text_body, 150) }))
    .filter((entry) => entry.text);
  return [...events, ...posts].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function statusIsClosed(status) { return normalize(status) === 'cerrado'; }

function candidateScore(item, data, cut, cols) {
  let score = 0;
  const risk = normalize(data.risk);
  if (risk.includes('bloqueo critico')) score += 9;
  else if (risk.includes('bloqueo')) score += 6;
  else if (risk.includes('riesgo')) score += 4;
  if (data.decision) score += 4;
  if (normalize(data.priority).includes('critical')) score += 2;
  if (normalize(data.priority).includes('high')) score += 1;
  const finish = Date.parse(data.plannedFinish);
  const cutDate = Date.parse(cut.extracted_at_utc);
  if (Number.isFinite(finish) && Number.isFinite(cutDate)) {
    const days = (finish - cutDate) / 86_400_000;
    if (days < 0) score += 3;
    else if (days <= 30) score += 2;
  }
  if (weeklyUpdates(item, cut).length) score += 3;
  if (weeklyEvents(item, cut, cols).length) score += 2;
  return score;
}

function hasExecutiveSignal(item, data, cut, cols) {
  const risk = normalize(data.risk);
  const recordedRisk = (risk.includes('bloqueo') || risk.includes('riesgo') || risk.includes('alerta'))
    && !risk.startsWith('sin ') && risk !== 'sin evaluar';
  const finish = Date.parse(data.plannedFinish);
  const extracted = Date.parse(cut.extracted_at_utc);
  const nearFinish = Number.isFinite(finish) && Number.isFinite(extracted)
    && (finish - extracted) / 86_400_000 <= 30;
  return recordedRisk || Boolean(data.decision) || nearFinish
    || weeklyUpdates(item, cut).length > 0 || weeklyEvents(item, cut, cols).length > 0;
}

function chooseProjects(cut, config, cols) {
  const all = cut.projects ?? [];
  const byId = new Map(all.map((item) => [String(item.id), item]));
  const exclude = new Set((config.excluded_project_ids ?? []).map(String));
  const pinned = (config.pinned_project_ids ?? []).map(String);
  const maximum = Math.min(16, Math.max(1, Number(config.maximum_projects) || 8));
  const selected = [];
  for (const id of pinned) {
    if (!byId.has(id)) throw new Error(`Proyecto fijado ${id} no aparece en el corte de monday`);
    if (exclude.has(id)) throw new Error(`Proyecto ${id} figura tanto incluido como excluido`);
    if (!selected.some((item) => String(item.id) === id)) selected.push(byId.get(id));
  }
  if (selected.length > maximum) throw new Error(`La selección PMO excede maximum_projects (${maximum})`);
  const candidates = all.filter((item) => {
    const data = fields(item, cols);
    if (exclude.has(String(item.id)) || selected.some((existing) => String(existing.id) === String(item.id))) return false;
    if (!statusIsClosed(data.status)) return true;
    return Boolean(config.include_recently_closed && data.actualFinish && inReportingWeek(`${data.actualFinish}T12:00:00Z`, cut));
  }).map((item) => ({ item, data: fields(item, cols) }))
    .filter(({ item, data }) => hasExecutiveSignal(item, data, cut, cols))
    .map(({ item, data }) => ({ item, score: candidateScore(item, data, cut, cols) }))
    .sort((a, b) => b.score - a.score || String(a.item.name).localeCompare(String(b.item.name), 'es'));
  // La prioridad por sí sola no justifica una lámina. Una sugerencia necesita
  // un hecho ejecutivo: riesgo, decisión, fecha cercana o actividad reciente.
  selected.push(...candidates.slice(0, maximum - selected.length).map((entry) => entry.item));
  return selected;
}

function addText(slide, text, box, style = {}) {
  slide.addText(String(text ?? ''), {
    x: box.x, y: box.y, w: box.w, h: box.h, fontFace: FONT, fontSize: style.size ?? 15,
    color: style.color ?? C.ink, bold: Boolean(style.bold), margin: 0, breakLine: false,
    valign: 'mid', align: style.align ?? 'left', fit: 'shrink',
    ...(style.italic ? { italic: true } : {}),
  });
}

function line(slide, x1, y1, x2, y2, color = C.line, width = 1) {
  slide.addShape('line', { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, width } });
}

function rect(slide, x, y, w, h, color) {
  slide.addShape('rect', { x, y, w, h, line: { color, transparency: 100 }, fill: { color } });
}

function baseSlide(pptx, title, number, cut) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  rect(slide, 0, 0, 13.333, .1, C.teal);
  addText(slide, title, { x: .73, y: .36, w: 9.5, h: .55 }, { size: 26, color: C.navy, bold: true });
  slide.addImage({ path: path.join(BRAND, 'cosmos-wordmark-dark.png'), x: 10.87, y: .39, w: 1.73, h: .267 });
  line(slide, .73, 1.08, 12.6, 1.08, C.teal, 1.25);
  line(slide, .73, 6.94, 12.6, 6.94, C.line, .75);
  addText(slide, `Corte ${formatCut(cut.extracted_at_utc)} · Fuente monday.com`, { x: .73, y: 7.02, w: 9.5, h: .22 }, { size: 9, color: C.muted });
  slide.addText('Consultar estado actual', { x: 10.22, y: 7.02, w: 1.66, h: .22,
    fontFace: FONT, fontSize: 9, color: C.teal, underline: { color: C.teal },
    margin: 0, hyperlink: { url: PORTAL_URL } });
  addText(slide, String(number).padStart(2, '0'), { x: 12.13, y: 7.02, w: .47, h: .22 }, { size: 9, color: C.muted, align: 'right' });
  return slide;
}

function section(slide, title, x, y, w) {
  addText(slide, title, { x, y, w, h: .27 }, { size: 11, bold: true, color: C.teal });
  line(slide, x, y + .32, x + w, y + .32, C.line, .7);
}

function cover(pptx, cut, reviewed) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  rect(slide, 9.1, 0, 4.233, 7.5, C.sand);
  rect(slide, 9.02, 0, .08, 7.5, C.teal);
  slide.addImage({ path: path.join(BRAND, 'cosmos-wave-footer.png'), x: 0, y: 6.03, w: 9.02, h: 1.48 });
  slide.addImage({ path: path.join(BRAND, 'cosmos-wordmark-dark.png'), x: 9.63, y: .67, w: 3.1, h: .478 });
  rect(slide, .72, .98, .8, .08, C.sand);
  addText(slide, 'PORTAFOLIO DE PROYECTOS', { x: .83, y: 1.27, w: 7.4, h: .32 }, { size: 14, color: C.sand });
  line(slide, 2.07, 1.96, 8.22, 1.96, C.sand, 1.2);
  addText(slide, 'Seguimiento semanal', { x: .83, y: 2.05, w: 7.7, h: .85 }, { size: 36, color: C.white, bold: true });
  addText(slide, 'Estado de la cartera y decisiones para revisión ejecutiva', { x: .83, y: 3.43, w: 7.45, h: .52 }, { size: 17, color: 'D5E2E6' });
  rect(slide, .73, 4.77, .08, .47, C.sand);
  addText(slide, reviewed ? 'BORRADOR · SELECCIÓN REVISADA POR PMO' : 'BORRADOR · SELECCIÓN POR VALIDAR EN PMO', { x: 1.08, y: 4.87, w: 6.9, h: .28 }, { size: 11, color: C.white, bold: true });
  addText(slide, `CORTE ${formatCut(cut.extracted_at_utc).toUpperCase()}`, { x: 9.63, y: 6.48, w: 3.0, h: .3 }, { size: 11, color: C.navy, bold: true });
  slide.addText('Consultar estado actual', { x: 9.63, y: 6.91, w: 2.8, h: .23,
    fontFace: FONT, fontSize: 10, color: C.navy, underline: { color: C.navy },
    margin: 0, hyperlink: { url: PORTAL_URL } });
  slide.addNotes(`Fuente: monday.com, tablero ${BOARD_URL}. Corte UTC: ${cut.extracted_at_utc}. ID de corte: ${cut.cut_id ?? 'sin ID'}. La selección de proyectos requiere revisión del equipo PMO antes de circular una versión final.`);
}

function summary(pptx, cut, allData, selected, cols, reviewed) {
  const slide = baseSlide(pptx, 'Resumen ejecutivo', 2, cut);
  const active = allData.filter((entry) => !statusIsClosed(entry.data.status));
  const attention = active.filter((entry) => /bloqueo|riesgo/i.test(entry.data.risk) && !/sin bloqueo|sin evaluar/i.test(entry.data.risk));
  const decisions = active.filter((entry) => entry.data.decision);
  const metrics = [
    { value: active.length, label: 'Abiertos o planificados' },
    { value: attention.length, label: 'Con riesgo o bloqueo registrado' },
    { value: decisions.length, label: 'Con decisión registrada' },
    { value: selected.length, label: 'En esta revisión' },
  ];
  metrics.forEach((metric, index) => {
    const x = .75 + index * 3.05;
    addText(slide, metric.value, { x, y: 1.37, w: 1.4, h: .76 }, { size: 35, color: C.teal, bold: true });
    addText(slide, metric.label, { x, y: 2.12, w: 2.75, h: .45 }, { size: 13, color: C.muted });
  });
  section(slide, 'ACTUALIZACIONES REGISTRADAS EN LA SEMANA', .75, 2.95, 11.8);
  const items = active.flatMap(({ item }) => projectMovements(item, cut, cols).slice(0, 2)
    .map((movement) => ({ project: item.name, ...movement })))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const distinct = [];
  for (const item of items) {
    if (distinct.some((entry) => entry.project === item.project)) continue;
    distinct.push(item);
    if (distinct.length >= 4) break;
  }
  if (!distinct.length) {
    addText(slide, 'No hay actualizaciones de proyectos registradas para la semana en el corte.', { x: .75, y: 3.55, w: 11.6, h: .6 }, { size: 16 });
  } else {
    distinct.forEach((entry, index) => {
      const y = 3.45 + index * .81;
      addText(slide, entry.project, { x: .77, y, w: 3.55, h: .35 }, { size: 15, color: C.teal, bold: true });
      addText(slide, excerpt(entry.text, 150), { x: 4.34, y, w: 8.18, h: .52 }, { size: 13, color: C.ink });
      line(slide, .75, y + .66, 12.55, y + .66, C.line, .55);
    });
  }
  slide.addNotes(`Resumen calculado con los ${cut.inventory?.projects ?? allData.length} proyectos del corte. No se muestran totales financieros porque monday no registra la moneda por proyecto. Selección ${reviewed ? 'marcada revisada por PMO en la configuración' : 'sugerida automáticamente, pendiente de revisión PMO'}. Ventana de actividad: ${cut.reporting_week?.start_at_utc ?? 'sin inicio'} a ${cut.reporting_week?.end_at_utc ?? 'sin fin'}.`);
}

function agenda(pptx, cut, selected, cols) {
  const slide = baseSlide(pptx, 'Agenda de revisión', 3, cut);
  section(slide, 'PROYECTOS SELECCIONADOS', .75, 1.35, 11.8);
  if (!selected.length) {
    addText(slide, 'No hay proyectos con señales ejecutivas registradas para esta revisión.',
      { x: .75, y: 1.94, w: 11.7, h: .72 }, { size: 19, color: C.ink });
  }
  const perColumn = Math.ceil(selected.length / 2);
  selected.forEach((item, index) => {
    const col = index >= perColumn ? 1 : 0;
    const row = col ? index - perColumn : index;
    const x = .75 + col * 6.05;
    const y = 1.9 + row * 1.1;
    const data = fields(item, cols);
    addText(slide, String(index + 1).padStart(2, '0'), { x, y: y + .06, w: .5, h: .31 }, { size: 12, color: C.sand, bold: true });
    addText(slide, excerpt(item.name, 47), { x: x + .6, y, w: 4.9, h: .52 }, { size: 17, color: C.navy, bold: true });
    addText(slide, [data.phase, data.status].filter(Boolean).join(' · ') || 'Estado no registrado', { x: x + .6, y: y + .5, w: 4.9, h: .27 }, { size: 11, color: C.muted });
    line(slide, x, y + .9, x + 5.45, y + .9, C.line, .55);
  });
  slide.addNotes(`IDs incluidos: ${selected.map((item) => `${item.id}: ${item.name}`).join('; ')}. La agenda puede cambiar editando tools/weekly-ppt/selection.json y regenerando el borrador.`);
}

function projectSlide(pptx, cut, item, number, cols) {
  const data = fields(item, cols);
  const slide = baseSlide(pptx, excerpt(item.name, 57), number, cut);
  const missing = [];
  if (!data.pm) missing.push('PM');
  if (!data.phase) missing.push('Fase');
  if (!data.plannedFinish) missing.push('Fin Plan');
  if (!data.situation) missing.push('Situación');
  if (!data.risk) missing.push('Riesgo / Bloqueo');
  addText(slide, 'ESTADO', { x: .75, y: 1.31, w: 1.45, h: .23 }, { size: 10, color: C.muted, bold: true });
  addText(slide, data.status || 'Sin registro', { x: .75, y: 1.57, w: 1.85, h: .41 }, { size: 16, color: C.navy, bold: true });
  addText(slide, 'FASE', { x: 2.76, y: 1.31, w: 1.1, h: .23 }, { size: 10, color: C.muted, bold: true });
  addText(slide, data.phase || 'Sin registro', { x: 2.76, y: 1.57, w: 2.15, h: .41 }, { size: 16, color: C.navy, bold: true });
  addText(slide, 'AVANCE', { x: 5.03, y: 1.31, w: 1.15, h: .23 }, { size: 10, color: C.muted, bold: true });
  const numericProgress = Number.parseFloat(data.progress.replace(',', '.'));
  addText(slide, Number.isFinite(numericProgress) ? `${numericProgress}%` : 'Sin registro', { x: 5.03, y: 1.57, w: 1.52, h: .41 }, { size: 17, color: C.teal, bold: true });
  addText(slide, 'FIN PLAN', { x: 6.74, y: 1.31, w: 1.4, h: .23 }, { size: 10, color: C.muted, bold: true });
  addText(slide, formatDate(data.plannedFinish) || 'Sin registro', { x: 6.74, y: 1.57, w: 1.5, h: .41 }, { size: 16, color: C.navy, bold: true });
  addText(slide, 'PM', { x: 9.04, y: 1.31, w: .8, h: .23 }, { size: 10, color: C.muted, bold: true });
  addText(slide, excerpt(data.pm || 'Sin registro', 29), { x: 9.04, y: 1.57, w: 3.3, h: .41 }, { size: 15, color: C.navy, bold: true });
  line(slide, .75, 2.11, 12.55, 2.11, C.line, .7);
  if (Number.isFinite(numericProgress)) {
    rect(slide, .75, 2.18, 11.8, .09, 'DCE6E9');
    rect(slide, .75, 2.18, 11.8 * Math.max(0, Math.min(100, numericProgress)) / 100, .09, C.teal);
  }
  section(slide, 'SITUACIÓN REGISTRADA', .75, 2.54, 7.55);
  addText(slide, excerpt(data.situation || 'No hay situación registrada en monday.', 245), { x: .75, y: 2.97, w: 7.45, h: .89 }, { size: 18, color: C.ink });
  section(slide, 'MOVIMIENTOS DE LA SEMANA', .75, 4.13, 7.55);
  const movements = projectMovements(item, cut, cols).slice(0, 3);
  if (!movements.length) {
    addText(slide, 'Sin movimientos registrados en este corte.', { x: .75, y: 4.52, w: 7.4, h: .43 }, { size: 14, color: C.muted });
  } else {
    movements.forEach((movement, index) => {
      addText(slide, `${index + 1}. ${excerpt(movement.text, 112)}`, { x: .75, y: 4.53 + index * .6, w: 7.45, h: .47 }, { size: 13, color: C.ink });
    });
  }
  section(slide, 'RIESGO O BLOQUEO', 8.72, 2.54, 3.82);
  const riskKey = normalize(data.risk);
  const severeRisk = !riskKey.startsWith('sin ') && (riskKey.includes('critico') || riskKey.includes('bloqueo'));
  const alertRisk = !riskKey.startsWith('sin ') && (riskKey.includes('riesgo') || riskKey.includes('alerta'));
  addText(slide, excerpt(data.risk || 'Sin registro en monday', 85), { x: 8.72, y: 2.98, w: 3.78, h: .61 }, { size: 17, color: severeRisk ? C.warning : alertRisk ? C.amber : C.navy, bold: true });
  section(slide, 'ACCIÓN O DECISIÓN REQUERIDA', 8.72, 3.94, 3.82);
  addText(slide, excerpt(data.decision || 'Sin decisión registrada', 190), { x: 8.72, y: 4.37, w: 3.78, h: 1.32 }, { size: 14, color: C.ink });
  if (missing.length) {
    addText(slide, `Por completar en monday: ${missing.join(', ')}`, { x: .75, y: 6.49, w: 11.7, h: .28 }, { size: 10, color: C.muted });
  }
  slide.addNotes([
    `Fuente: ${BOARD_URL}/pulses/${item.id}`,
    `Proyecto ${item.name} (${item.id}). Corte ${cut.extracted_at_utc}.`,
    `Situación íntegra: ${data.situation || 'Sin registro'}`,
    `Riesgo: ${data.risk || 'Sin registro'}`,
    `Acción o decisión: ${data.decision || 'Sin registro'}`,
    ...weeklyUpdates(item, cut).map((update) => `Actualización ${update.created_at}: ${plain(update.text_body)}`),
    ...(missing.length ? [`Campos por completar: ${missing.join(', ')}`] : []),
  ].join('\n'));
  return { id: String(item.id), name: item.name, missing, movements: movements.length };
}

async function uniqueOutput(outputDir, cut) {
  const local = String(cut.extracted_at_lima ?? new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(cut.extracted_at_utc)).replace(' ', 'T'));
  const stamp = local.slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
  for (let index = 0; index < 100; index += 1) {
    const suffix = index ? `_${index + 1}` : '';
    const candidate = path.join(outputDir, `Portafolio_Proyectos_Borrador_${stamp}${suffix}.pptx`);
    try { await stat(candidate); } catch (error) { if (error.code === 'ENOENT') return candidate; throw error; }
  }
  throw new Error('No se encontró un nombre libre para el borrador');
}

export async function generateWeeklyPpt(options = {}) {
  const input = path.resolve(options.input ?? DEFAULT_INPUT);
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT);
  const configPath = path.resolve(options.config ?? CONFIG);
  const [cut, config] = await Promise.all([
    readFile(input, 'utf8').then(JSON.parse),
    readFile(configPath, 'utf8').then(JSON.parse),
  ]);
  if (cut.schema_version !== 1 || !Array.isArray(cut.projects) || !cut.extracted_at_utc) throw new Error('Corte semanal incompleto o versión de esquema no compatible');
  if (cut.cut_id !== `${cut.board?.id ?? '18396270726'}:${cut.extracted_at_utc}`) {
    throw new Error('El ID del corte no coincide con el tablero y la extracción que alimentan el portal');
  }
  if (cut.activity?.coverage?.complete !== true) {
    throw new Error('La bitácora semanal de monday no tiene cobertura completa; no se genera un borrador');
  }
  if (!cut.board?.columns?.length) throw new Error('El corte no contiene el esquema actual de columnas de monday');
  const cols = columns(cut);
  const selected = chooseProjects(cut, config, cols);
  const reviewed = Boolean(config.reviewed_reporting_week && config.reviewed_reporting_week === cut.reporting_week?.key);
  const allData = cut.projects.map((item) => ({ item, data: fields(item, cols) }));
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'PMO de Negocio · COSMOS';
  pptx.subject = 'Seguimiento semanal del portafolio de proyectos IT';
  pptx.title = 'Seguimiento semanal | Portafolio de proyectos';
  pptx.company = 'COSMOS Global Logistics';
  pptx.lang = 'es-PE';
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT, lang: 'es-PE' };
  cover(pptx, cut, reviewed);
  summary(pptx, cut, allData, selected, cols, reviewed);
  agenda(pptx, cut, selected, cols);
  const review = selected.map((item, index) => projectSlide(pptx, cut, item, index + 4, cols));
  await mkdir(outputDir, { recursive: true });
  const output = await uniqueOutput(outputDir, cut);
  await pptx.writeFile({ fileName: output });
  const qa = {
    cut_id: cut.cut_id ?? null,
    source: input,
    output,
    extracted_at_utc: cut.extracted_at_utc,
    reporting_week: cut.reporting_week ?? null,
    selection_reviewed_by_pmo: reviewed,
    projects: review,
    slide_count: 3 + review.length,
    currency_totals_omitted: true,
    final_untouched: true,
  };
  await writeFile(path.join(outputDir, 'latest-path.txt'), `${output}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'latest-qa.json'), JSON.stringify(qa, null, 2), 'utf8');
  return qa;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateWeeklyPpt(cli(process.argv.slice(2)))
    .then((qa) => console.log(JSON.stringify({ output: qa.output, slide_count: qa.slide_count, reviewed: qa.selection_reviewed_by_pmo })))
    .catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
