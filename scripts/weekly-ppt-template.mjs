import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { excerpt, plain, formatDate, formatCut, cutDate, money, paidRatio, riskLevel, normalize, milestoneDelay } from './weekly-ppt-model.mjs';

const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const C = { ink: '003D53', muted: '617683', red: 'B6493B', amber: '96631A', green: '20823F', line: 'B3BEC3' };
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const shapeId = shape => shape.match(/<p:cNvPr\b[^>]*\bid="(\d+)"/)?.[1];
const shapes = /<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/g;
function shape(xml, id, mutate) { let found = false; const out = xml.replace(shapes, s => { if (shapeId(s) !== String(id)) return s; found = true; return mutate(s); }); if (!found) throw new Error(`Falta objeto ${id} en plantilla estándar`); return out; }
function drop(xml, ids) { const set = new Set(ids.map(String)); return xml.replace(shapes, s => set.has(shapeId(s)) ? '' : s); }
function styleRun(original, config = {}) {
  let s = original || '<a:rPr sz="1100"><a:solidFill><a:srgbClr val="003D53"/></a:solidFill><a:latin typeface="Figtree"/></a:rPr>';
  if (config.size) s = s.replace(/\bsz="\d+"/, `sz="${Math.round(config.size * 100)}"`);
  if (config.color) s = /<a:solidFill>/.test(s) ? s.replace(/<a:solidFill>[\s\S]*?<\/a:solidFill>/, `<a:solidFill><a:srgbClr val="${config.color}"/></a:solidFill>`) : s.replace('</a:rPr>', `<a:solidFill><a:srgbClr val="${config.color}"/></a:solidFill></a:rPr>`);
  if (config.bold !== undefined) s = /\bb="[01]"/.test(s) ? s.replace(/\bb="[01]"/, `b="${config.bold ? 1 : 0}"`) : s.replace('<a:rPr', `<a:rPr b="${config.bold ? 1 : 0}"`);
  return s;
}
function bodyText(xml, values) {
  const list = Array.isArray(values) ? values : [values];
  return xml.replace(/<([pa]):txBody\b[^>]*>([\s\S]*?)<\/\1:txBody>/, (_, ns, inner) => {
    const paras = inner.match(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g) ?? [];
    const prefix = inner.slice(0, inner.indexOf(paras[0] ?? '<a:p'));
    return `<${ns}:txBody>${prefix}${list.map((value, i) => {
      const v = typeof value === 'object' ? value : { text: value };
      const source = paras[Math.min(i, paras.length - 1)] ?? '';
      const ppr = source.match(/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/)?.[0] ?? '';
      const rpr = source.match(/<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/)?.[0];
      return `<a:p>${ppr}<a:r>${styleRun(rpr, v)}<a:t xml:space="preserve">${esc(v.text)}</a:t></a:r></a:p>`;
    }).join('')}</${ns}:txBody>`;
  });
}
const text = (xml, id, values) => shape(xml, id, s => bodyText(s, values));
function geometry(s, { x, y, w, h }) {
  return s.replace(/<a:xfrm\b[^>]*>([\s\S]*?)<\/a:xfrm>/, (tag, inner) => tag.replace(inner, inner
    .replace(/<a:off\b[^>]*\/>/, t => t.replace(/x="[^"]*"/, a => x == null ? a : `x="${Math.round(x)}"`).replace(/y="[^"]*"/, a => y == null ? a : `y="${Math.round(y)}"`))
    .replace(/<a:ext\b[^>]*\/>/, t => t.replace(/cx="[^"]*"/, a => w == null ? a : `cx="${Math.max(1, Math.round(w))}"`).replace(/cy="[^"]*"/, a => h == null ? a : `cy="${Math.max(1, Math.round(h))}"`))));
}
const move = (xml, id, frame) => shape(xml, id, s => geometry(s, frame));
function fillShape(s, color) { return s.replace(/<p:spPr>([\s\S]*?)<\/p:spPr>/, (all, p) => all.replace(p, /<a:solidFill\b/.test(p) ? p.replace(/<a:solidFill\b[^>]*>[\s\S]*?<\/a:solidFill>/, `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`) : p.replace('</a:prstGeom>', `</a:prstGeom><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`))); }
const fill = (xml, id, color) => shape(xml, id, s => fillShape(s, color));
function table(xml, rows, { height, fontSize = 10, widths } = {}) {
  return xml.replace(/<a:tbl\b[^>]*>[\s\S]*?<\/a:tbl>/, original => {
    const templates = original.match(/<a:tr\b[^>]*>[\s\S]*?<\/a:tr>/g);
    if (!templates?.length) throw new Error('Falta tabla nativa');
    const content = rows.map((row, i) => {
      const base = templates[i === 0 ? 0 : 1 + (i - 1) % Math.min(2, templates.length - 1)];
      let index = 0;
      return base.replace(/h="\d+"/, `h="${Math.round(height ?? 324612)}"`).replace(/<a:tc\b[^>]*>[\s\S]*?<\/a:tc>/g, cell => {
        const values = row[index++];
        const paras = (Array.isArray(values) ? values : [values]).map((v, p) => ({ text: plain(v), size: fontSize, ...(i ? { color: C.ink, bold: index === 1 && p === 0 } : { color: 'FFFFFF', bold: true }) }));
        return bodyText(cell, paras);
      });
    }).join('');
    let prefix = original.slice(0, original.indexOf(templates[0]));
    if (widths) prefix = prefix.replace(/<a:tblGrid>[\s\S]*?<\/a:tblGrid>/, `<a:tblGrid>${widths.map(w => `<a:gridCol w="${w}"/>`).join('')}</a:tblGrid>`);
    return prefix + content + '</a:tbl>';
  });
}
function cut(xml, model) { return text(xml, 6, [{ text: 'Corte  ' + formatCut(model), size: 10, color: 'FFFFFF' }]); }
const undefinedText = value => value || 'Por definir';

export function coverSlide(xml, cutInfo, reviewed) {
  xml = text(xml, 257, 'PORTAFOLIO DE PROYECTOS');
  xml = text(xml, 258, 'Seguimiento semanal');
  xml = text(xml, 259, 'Estado del portafolio, desviaciones y decisiones requeridas');
  xml = text(xml, 261, reviewed ? 'PMO DE NEGOCIO · BORRADOR REVISADO' : 'PMO DE NEGOCIO · BORRADOR POR REVISAR');
  xml = text(xml, 264, 'FECHA DE CORTE · ' + formatCut(cutInfo));
  return text(xml, 270, cutDate(cutInfo).slice(0, 4));
}
export function summarySlide(xml, cutInfo, models, pageModels, page, totalPages) {
  xml = cut(xml, cutInfo);
  xml = text(xml, 4, 'Resumen del portafolio');
  xml = text(xml, 5, 'Selección ejecutiva PMO' + (totalPages > 1 ? ` · ${page}/${totalPages}` : ''));
  const metrics = [[models.length, 'En revisión'], [models.filter(m => normalize(m.fields.status) === 'en proceso').length, 'En Proceso'],
    [models.filter(m => normalize(m.fields.status) === 'planificado').length, 'Planificado'], [models.filter(m => normalize(m.fields.status) === 'cerrado').length, 'Cerrado'],
    [models.filter(m => riskLevel(m.fields.risk) === 'alert').length, 'Riesgo / Alerta'], [models.filter(m => riskLevel(m.fields.risk) === 'block').length, 'Bloqueo crítico']];
  const colors = [C.ink, C.ink, C.muted, C.ink, C.amber, C.red];
  metrics.forEach(([n, label], i) => { xml = text(xml, 9 + 4 * i, String(n)); xml = text(xml, 10 + 4 * i, [{ text: label, size: 9 }]); xml = fill(xml, 8 + 4 * i, colors[i]); });
  const rows = [['Proyecto', 'Etapa', 'Estado y riesgo', 'Avance', 'Go-Live', 'Decisión gerencial'], ...pageModels.map(m => [m.item.name, undefinedText(m.fields.phase), [undefinedText(m.fields.status), undefinedText(m.fields.risk)], m.fields.progress == null ? 'Por definir' : `${m.fields.progress}%`, formatDate(m.fields.goLive), excerpt(undefinedText(m.fields.decision), 100)])];
  if (!pageModels.length) rows.push(['Sin proyectos seleccionados', '', '', '', '', '']);
  xml = table(xml, rows, { height: 370000, fontSize: 10, widths: [2800000, 1560000, 1750000, 900000, 1300000, 3142431] });
  return text(xml, 32, [{ text: 'Fuente: monday.com · Estados, fases y riesgos registrados al corte · Datos pendientes: Por definir', size: 8 }]);
}
export function projectSlide(xml, cutInfo, model) {
  const f = model.fields, tint = riskLevel(f.risk), statusColor = tint === 'block' ? C.red : tint === 'alert' ? C.amber : C.ink;
  xml = cut(xml, cutInfo);
  xml = text(xml, 4, [{ text: excerpt(model.item.name, 70), size: 24 }]);
  xml = text(xml, 5, [{ text: `PM: ${undefinedText(f.pm)} · Proveedor: ${undefinedText(f.provider)} · Área usuaria: ${undefinedText(f.area)}`, size: 10 }]);
  xml = text(xml, 7, [{ text: 'ESTADO', size: 8 }, { text: undefinedText(f.status), size: 15, color: C.ink }, { text: undefinedText(f.risk), size: 8, color: statusColor }]);
  xml = text(xml, 8, [{ text: 'ETAPA', size: 8 }, { text: undefinedText(f.phase), size: 14 }]);
  xml = text(xml, 9, [{ text: 'AVANCE', size: 8 }, { text: f.progress == null ? 'Por definir' : f.progress + '%', size: 18 }, { text: 'avance real', size: 8 }]);
  xml = text(xml, 11, [{ text: 'CAPEX APROBADO', size: 8 }, { text: money(f.budget, f.currency), size: ['USD', 'PEN'].includes(f.currency) ? 15 : 11 }, { text: 'presupuesto aprobado', size: 8 }]);
  xml = text(xml, 12, [{ text: 'EJECUTADO', size: 8 }, { text: money(f.paid, f.currency), size: ['USD', 'PEN'].includes(f.currency) ? 15 : 11 }, { text: paidRatio(f), size: 8 }]);
  xml = text(xml, 13, [{ text: 'OPEX ANUAL', size: 8 }, { text: money(f.opex, f.currency), size: ['USD', 'PEN'].includes(f.currency) ? 15 : 11 }, { text: 'previsto, 12 meses', size: 8 }]);
  // The template's bars compare percentages, never calendar days.
  xml = text(xml, 14, 'Programado'); xml = text(xml, 15, 'Real');
  xml = text(xml, 16, 'Inicio ' + formatDate(f.start));
  const gap = f.plannedProgress != null && f.progress != null ? `${Math.round((f.progress - f.plannedProgress) * 10) / 10} pp frente al plan` : 'Comparación por definir';
  xml = text(xml, 23, [{ text: `Al corte ${formatCut(cutInfo)}: ${gap}`, size: 8 }]);
  xml = xml.replace(/<p:cxnSp\b[^>]*>[\s\S]*?<\/p:cxnSp>/g, '');
  xml = drop(xml, [21, 22]);
  for (const [id, progress] of [[19, f.plannedProgress], [20, f.progress]]) {
    if (progress == null || progress === 0) xml = drop(xml, [id]);
    else xml = move(xml, id, { w: 9052559 * Math.min(100, progress) / 100 });
  }
  if (f.progress != null && f.progress > 0) xml = fill(xml, 20, C.ink);
  if (f.progress != null && f.progress > 0) { xml = move(xml, 10, { w: 1508760 * Math.min(100, f.progress) / 100 }); xml = fill(xml, 10, C.ink); }
  else xml = drop(xml, [10]);
  const goLive = model.milestones.find(r => /^(go live|salida (a |en )?produccion)$/.test(normalize(r.name)));
  const first = model.milestones.filter(r => r !== goLive).slice(0, 4);
  for (let i = 0; i < 5; i++) {
    const label = 26 + i * 3, r = i === 4 ? goLive : first[i];
    if (!r && i !== 4) { xml = drop(xml, [24 + i * 3, 25 + i * 3, label]); continue; }
    const title = i === 4 ? 'Go-Live' : excerpt(r.name, 24);
    const base = i === 4 ? r?.baselineFinish || f.goLive : r.baselineFinish;
    const actual = r?.actualFinish, forecast = i === 4 ? f.goLive : r?.forecastFinish;
    const lines = [title, `Plan ${formatDate(base)}`, actual ? `Real ${formatDate(actual)}` : forecast && forecast !== base ? `Prev. ${formatDate(forecast)}` : 'Real por definir'];
    if (r) { const delay = milestoneDelay(r); if (delay) lines[2] += ` (${delay.replace(/^(Real|Previsto): /, '')})`; }
    xml = text(xml, label, lines.map((t, j) => ({ text: t, size: j ? 7 : 10, bold: j === 0, color: C.ink })));
    xml = text(xml, 25 + i * 3, actual ? '✓' : '');
    xml = fill(xml, 25 + i * 3, actual ? C.green : 'FFFFFF');
  }
  if (!first.length) {
    // A short neutral message occupies the unused milestone area; no fake dates.
    const source = '<p:sp><p:nvSpPr><p:cNvPr id="901" name="Hitos pendientes"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="2400000" y="2800000"/><a:ext cx="6500000" cy="420000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1000"><a:solidFill><a:srgbClr val="617683"/></a:solidFill><a:latin typeface="Figtree"/></a:rPr><a:t>Hitos por definir en monday</a:t></a:r></a:p></p:txBody></p:sp>';
    xml = xml.replace('</p:spTree>', source + '</p:spTree>');
  }
  xml = text(xml, 39, 'Situación actual'); xml = text(xml, 40, [{ text: model.situation, size: 11 }]);
  xml = text(xml, 41, 'Decisión requerida');
  xml = text(xml, 42, [{ text: excerpt(undefinedText(f.decision), 140), size: 11 }, ...(f.decision && !model.noDecision ? [{ text: `Decide: ${undefinedText(f.decider)} · ${formatDate(f.decisionDue)}`, size: 9, bold: true }] : [])]);
  xml = text(xml, 43, 'Riesgo clave');
  xml = text(xml, 44, [{ text: excerpt(f.riskText || (f.risk === 'Sin bloqueo' ? 'Sin bloqueo registrado' : 'Por definir'), 118), size: 11 }, { text: 'Mitigación: ' + excerpt(undefinedText(f.mitigation), 100), size: 9 }, ...(f.mitigationOwner ? [{ text: 'Responsable: ' + f.mitigationOwner, size: 9 }] : [])]);
  xml = text(xml, 45, 'Próximas acciones');
  const actions = model.actions.slice(0, 4), rows = [['Acción', 'Responsable', 'Fecha', 'Estado'], ...actions.map(a => [excerpt(a.name, 90), undefinedText(a.owner), formatDate(a.forecastFinish), undefinedText(a.status)])];
  if (!actions.length) rows.push(['Por definir en subelementos de monday', 'Por definir', 'Por definir', 'Por definir']);
  return table(xml, rows, { height: actions.length > 3 ? 200000 : 256032, fontSize: actions.length > 3 ? 9 : 10 });
}
export function annexSlide(xml, cutInfo, model) {
  xml = cut(xml, cutInfo); xml = text(xml, 4, 'Anexo · ' + excerpt(model.item.name, 55));
  xml = text(xml, 5, 'Cronograma base y previsión vigente registrados en monday');
  const all = model.activities.filter(r => (r.forecastStart && r.forecastFinish && r.forecastStart <= r.forecastFinish) || (r.baselineStart && r.baselineFinish && r.baselineStart <= r.baselineFinish));
  const list = all.slice(0, 8), today = Date.parse(cutDate(cutInfo));
  const dates = list.flatMap(r => [r.baselineStart, r.baselineFinish, r.forecastStart, r.forecastFinish, r.actualFinish]).filter(Boolean).map(Date.parse);
  const lo = Math.min(...dates, today), hi = Math.max(...dates, today, lo + 86400000), x = d => 3291840 + (Date.parse(d) - lo) / (hi - lo) * 8230000;
  for (let i = 0; i < 6; i++) { const date = new Date(lo + (hi - lo) * i / 5).toISOString().slice(0, 10); xml = text(xml, 8 + i * 2, formatDate(date).slice(0, 5)); }
  for (let i = 0; i < 8; i++) {
    const r = list[i], label = 19 + 2 * i, bar = label + 1;
    if (!r) { xml = drop(xml, [label, bar]); continue; }
    const start = r.forecastStart || r.baselineStart, finish = r.forecastFinish || r.baselineFinish;
    xml = text(xml, label, [{ text: excerpt(r.name, 42), size: 10 }, { text: `Prev. ${formatDate(start)} a ${formatDate(finish)}${r.actualFinish ? ' · Fin real ' + formatDate(r.actualFinish) : ''}`, size: 7.5 }]);
    xml = move(xml, bar, { x: x(start), w: Math.max(50000, x(finish) - x(start)), h: 130000 });
    xml = fill(xml, bar, normalize(r.status) === 'detenido' ? C.red : C.ink);
    if (r.actualFinish) {
      const src = [...xml.matchAll(shapes)].map(m => m[0]).find(s => shapeId(s) === String(bar));
      const marker = fillShape(geometry(src.replace(/(<p:cNvPr\b[^>]*\bid=")\d+"/, `$1${1200 + i}"`), { x: x(r.actualFinish) - 25000, w: 50000, h: 190000 }), C.green);
      xml = xml.replace('</p:spTree>', marker + '</p:spTree>');
    }
    if (r.baselineStart && r.baselineFinish && r.baselineStart <= r.baselineFinish) {
      const src = [...xml.matchAll(shapes)].map(m => m[0]).find(s => shapeId(s) === String(bar));
      const cloned = fillShape(geometry(src.replace(/(<p:cNvPr\b[^>]*\bid=")\d+"/, `$1${1000 + i}"`), { x: x(r.baselineStart), y: 1888216 + i * 475488, w: Math.max(50000, x(r.baselineFinish) - x(r.baselineStart)), h: 65000 }), C.line);
      xml = xml.replace('</p:spTree>', cloned + '</p:spTree>');
    }
  }
  xml = text(xml, 36, [{ text: 'Corte ' + formatCut(cutInfo), size: 8 }]);
  xml = move(xml, 36, { x: Math.min(11000000, Math.max(3291840, x(cutDate(cutInfo)) - 380000)), w: 1400000 });
  xml = move(xml, 35, { x: x(cutDate(cutInfo)) });
  xml = xml.replace(/<p:cxnSp\b[^>]*>[\s\S]*?<\/p:cxnSp>/g, '');
  return text(xml, 37, [{ text: `Base en gris · Previsión vigente en navy · Marca verde: fin real${all.length > 8 ? ` · Se muestran 8 de ${all.length} actividades; detalle en notas` : ''}`, size: 10 }]);
}
export function guideSlide(xml, cutInfo) {
  xml = cut(xml, cutInfo); xml = text(xml, 4, 'Guía de llenado de la ficha'); xml = text(xml, 5, 'Mismo formato, datos de monday y un único corte');
  xml = text(xml, 7, 'Estado de monday'); xml = text(xml, 20, 'Fases de monday'); xml = text(xml, 33, 'Reglas'); xml = text(xml, 36, 'Antes de enviar, revisa');
  const states = [['En Proceso', 'Estatus registrado'], ['Planificado', 'Estatus registrado'], ['Stand by', 'Estatus registrado'], ['Propuesto', 'Estatus registrado'], ['To Be Process', 'Estatus registrado'], ['Cerrado', 'Estatus registrado']];
  states.forEach((s, i) => { xml = text(xml, 9 + i * 2, s); xml = fill(xml, 8 + i * 2, C.ink); });
  const phases = ['Propuesta', 'Evaluación', 'Planificación', 'Ejecución', 'Pruebas UAT', 'Despliegue', 'Estabilización', 'Cierre'];
  const circle = [...xml.matchAll(shapes)].map(m => m[0]).find(s => shapeId(s) === '21');
  const label = [...xml.matchAll(shapes)].map(m => m[0]).find(s => shapeId(s) === '22');
  xml = drop(xml, Array.from({ length: 12 }, (_, i) => 21 + i));
  phases.forEach((phase, i) => {
    const y = 1463040 + i * 370000;
    const c = geometry(bodyText(circle.replace(/(<p:cNvPr\b[^>]*\bid=")\d+"/, `$1${1100 + i * 2}"`), [{ text: String(i + 1), size: 10 }]), { y });
    const l = geometry(bodyText(label.replace(/(<p:cNvPr\b[^>]*\bid=")\d+"/, `$1${1101 + i * 2}"`), [{ text: phase, size: 11 }]), { y, h: 290000 });
    xml = xml.replace('</p:spTree>', c + l + '</p:spTree>');
  });
  xml = text(xml, 34, [
    'Una ficha por proyecto seleccionado y máximo un anexo.', 'Fin Plan es el Go-Live. Fin Real es el cierre efectivo.',
    'Estatus, riesgo y ocho fases conservan los valores de monday.', 'Ejecutado es CAPEX pagado. OPEX anual va separado.',
    'Moneda del proyecto: USD o PEN, sin conversiones.', 'Sin dato: Por definir. Nunca asumir cero ni ausencia de riesgo.',
    'Hitos y acciones se mantienen en subelementos.', 'Cronograma base se conserva. Previsto y real son distintos.',
    'Situación: última bitácora al corte. Texto íntegro en notas.'
  ].map(t => ({ text: t, size: 10, color: C.ink, bold: false })));
  xml = text(xml, 37, ['Corte consistente en todas las fichas', 'Importes y moneda revisados', 'Sin ejemplos ni fechas de otras semanas'].map(t => ({ text: t, color: C.ink, size: 10, bold: false })));
  return text(xml, 38, ['Decisión con quién decide y fecha límite', 'Hitos con base, previsión y cierre real', 'Próximas acciones con responsable y fecha'].map(t => ({ text: t, color: C.ink, size: 10, bold: false })));
}
function notesXML(note) {
  return `<?xml version="1.0" encoding="UTF-8"?><p:notes xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Notas de fuentes"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${String(note).split('\n').map(t => `<a:p><a:r><a:t>${esc(t)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;
}
export async function renderStandardDeck(templatePath, slides) {
  const zip = await JSZip.loadAsync(await readFile(templatePath));
  const originals = new Map();
  for (const base of [1, 2, 3, 5, 6]) originals.set(base, await zip.file(`ppt/slides/_rels/slide${base}.xml.rels`).async('string'));
  // Drop all historical slides and notes, including unreferenced package parts.
  for (const name of Object.keys(zip.files)) if (/^ppt\/(?:slides\/|notesSlides\/)/.test(name)) zip.remove(name);
  let contentTypes = await zip.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(/<Override\b[^>]*PartName="\/ppt\/(?:slides|notesSlides)\/[^>]*\/>/g, '');
  let presentation = await zip.file('ppt/presentation.xml').async('string');
  presentation = presentation.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="weekly${i + 1}"/>`).join('')}</p:sldIdLst>`);
  if (!/<p:presentation\b[^>]*\bxmlns:r=/.test(presentation)) presentation = presentation.replace('<p:presentation ', `<p:presentation xmlns:r="${R}" `);
  let rels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  rels = rels.replace(/<Relationship\b[^>]*Type="[^"]*\/slide"[^>]*\/>/g, '');
  for (let i = 0; i < slides.length; i++) {
    const n = i + 1, slide = slides[i];
    let xml = slide.xml.replace('<p:sld ', `<p:sld xmlns:a="${A}" xmlns:r="${R}" `);
    xml = xml.replace(/(<a16:creationId\b[^>]*\bid=")\{[^}]+\}"/g, () => `<a16:creationId id="{${randomUUID().toUpperCase()}}"`);
    // Remove any duplicated root namespace after inserting the shared namespaces.
    xml = xml.replace(/(<p:sld\b[^>]*?)>/, opening => { const seen = new Set(); return opening.replace(/\s+xmlns:([ar])="[^"]*"/g, (m, ns) => seen.has(ns) ? '' : (seen.add(ns), m)); });
    zip.file(`ppt/slides/slide${n}.xml`, xml);
    let slideRels = originals.get(slide.base).replace(/<Relationship\b[^>]*Type="[^"]*\/notesSlide"[^>]*\/>/g, '')
      .replace(/Target="\/(ppt\/[^\"]+)"/g, (_, target) => `Target="${path.posix.relative('ppt/slides', target)}"`)
      .replace('</Relationships>', `<Relationship Id="weeklyNotes" Type="${R}/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/></Relationships>`);
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, slideRels);
    zip.file(`ppt/notesSlides/notesSlide${n}.xml`, notesXML(slide.notes));
    zip.file(`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`, `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="slide" Type="${R}/slide" Target="../slides/slide${n}.xml"/><Relationship Id="master" Type="${R}/notesMaster" Target="../notesMasters/notesMaster1.xml"/></Relationships>`);
    contentTypes = contentTypes.replace('</Types>', `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/notesSlides/notesSlide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/></Types>`);
    rels = rels.replace('</Relationships>', `<Relationship Id="weekly${n}" Type="${R}/slide" Target="slides/slide${n}.xml"/></Relationships>`);
  }
  zip.file('ppt/presentation.xml', presentation); zip.file('ppt/_rels/presentation.xml.rels', rels); zip.file('[Content_Types].xml', contentTypes);
  zip.file('docProps/app.xml', `<?xml version="1.0"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>COSMOS PMO</Application><Slides>${slides.length}</Slides><Notes>${slides.length}</Notes></Properties>`);
  zip.file('docProps/core.xml', '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Portafolio de proyectos, seguimiento semanal</dc:title><dc:creator>PMO de Negocio, COSMOS</dc:creator></cp:coreProperties>');
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
export async function loadStandardSlides(templatePath) {
  const zip = await JSZip.loadAsync(await readFile(templatePath));
  return new Map(await Promise.all([1, 2, 3, 5, 6].map(async n => [n, await zip.file(`ppt/slides/slide${n}.xml`).async('string')])));
}
