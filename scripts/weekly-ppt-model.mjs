// The weekly deck consumes the same immutable extraction as the portal.
// No model calls, extra monday requests or inferred health states are used.
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function plain(value) {
  if (value == null || typeof value === 'object') return '';
  return String(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/[\u2013\u2014]/g, ', ').replace(/\s+/g, ' ').trim();
}
export function excerpt(value, max = 140) {
  const s = plain(value); if (s.length <= max) return s;
  const head = s.slice(0, max - 1); const space = head.lastIndexOf(' ');
  return head.slice(0, space > max * .65 ? space : max - 1).trim() + '…';
}
export function numeric(value) {
  if (value == null || typeof value === 'object' || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/%$/, '').trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function isoDate(value) {
  const s = plain(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const n = Date.parse(s + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === s ? s : '';
}
export function formatDate(value) { const s = isoDate(value); return s ? `${s.slice(8)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : 'Por definir'; }
export function cutDate(cut) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(cut.extracted_at_utc));
}
export function formatCut(cut) { return formatDate(cutDate(cut)); }
export const isClosed = status => normalize(status) === 'cerrado';
export const isDone = status => ['listo', 'cerrado', 'completado'].includes(normalize(status));
export function riskLevel(risk) {
  const s = normalize(risk);
  return s.startsWith('sin ') ? 'none' : s.includes('bloqueo') ? 'block' : /riesgo|alerta/.test(s) ? 'alert' : 'unknown';
}
export function inReportingWeek(instant, cut) {
  const t = Date.parse(instant), a = Date.parse(cut.reporting_week?.start_at_utc), b = Date.parse(cut.reporting_week?.end_at_utc);
  return Number.isFinite(t) && t >= a && t < b;
}
function read(item, schema, id, titles = []) {
  const cols = schema ?? [];
  const current = cols.find(c => c.id === id) ?? cols.find(c => titles.some(t => normalize(c.title) === normalize(t)));
  return current ? plain(item.column_values?.[current.id]) : '';
}
export function projectFields(item, cut, map) {
  const cols = cut.board.columns, r = (id, titles) => read(item, cols, id, titles);
  return {
    status: r('status'), pm: r('multiple_person_mm087pe3'), phase: r('color_mm6kg2n5'),
    progress: numeric(r('numeric_mkzrc075')), plannedProgress: numeric(r('numeric_mm7nz991')),
    provider: r('text_mm6b5rqp'), start: isoDate(r('date_mkzt74dd')),
    goLive: isoDate(r('date_mkzrb4nr')), actualFinish: isoDate(r('date_mm6d8mx')),
    risk: r('color_mm6zdfgs'), riskText: r('text_mm7fvxjn'),
    mitigation: r('long_text_mm6zs5rc'), mitigationOwner: r('multiple_person_mm89w189'),
    priority: r('color_mkzzg1vp'), initiative: r('color_mm89s93s'),
    budget: numeric(r('numeric_mm6kwqt3')), paid: numeric(r('numeric_mm6j1jmr')),
    opex: numeric(r('numeric_mm6j8yx')), currency: r('color_mm845zc0'),
    area: r(map.project.area, ['Área usuaria']), decision: r(map.project.decision, ['Decisión gerencial']),
    decider: r(map.project.decider, ['Quién decide']), decisionDue: isoDate(r(map.project.decision_due, ['Fecha límite decisión'])),
  };
}
export function updateEntries(item, cut) {
  const end = Date.parse(cut.extracted_at_utc), entries = [];
  for (const update of item.updates ?? []) {
    entries.push({ id: update.id, text: plain(update.text_body), at: update.created_at, author: update.creator?.name ?? '' });
    for (const reply of update.replies ?? []) entries.push({ id: reply.id, text: plain(reply.text_body), at: reply.created_at, author: reply.creator?.name ?? '' });
  }
  return entries.filter(e => e.text && Number.isFinite(Date.parse(e.at)) && Date.parse(e.at) <= end)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
export function latestUpdate(item, cut) { return updateEntries(item, cut)[0] ?? null; }
export function situationText(item, cut) {
  const update = latestUpdate(item, cut);
  if (!update) return 'Por definir en bitácora';
  const date = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit' }).format(new Date(update.at));
  // Skip only a dated heading when it precedes a bullet; keep actual evidence.
  const text = update.text.replace(/^\d{1,2}\/\d{1,2}(?:\/\d{4})?\s*:?\s*[^*]{0,100}?\.\s*\*\s*/, '').replace(/^\*\s*/, '');
  return `${date}: ${excerpt(text, 146)}`;
}
export function timeline(value) {
  if (value && typeof value === 'object') return { start: isoDate(value.from), finish: isoDate(value.to) };
  if (typeof value === 'string' && value.trim().startsWith('{')) { try { return timeline(JSON.parse(value)); } catch {} }
  const dates = String(value ?? '').match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return { start: isoDate(dates[0]), finish: isoDate(dates[1] ?? dates[0]) };
}
export function subitemRecords(item, cut, map) {
  const cols = cut.board.subItemColumns ?? [], today = cutDate(cut), m = map.subitem;
  return (item.subitems ?? []).map(sub => {
    const kind = read(sub, cols, m.kind, ['Tipo de registro']);
    const baselineColumn = cols.find(c => c.id === m.baseline) ?? cols.find(c => normalize(c.title) === 'cronograma base');
    const base = timeline(sub.column_values?.[baselineColumn?.id]);
    const actual = isoDate(read(sub, cols, m.actual_finish, ['Fin real']));
    const status = read(sub, cols, m.status), warnings = [];
    if (actual && actual > today) warnings.push('Fin real posterior al corte');
    if (actual && !isDone(status)) warnings.push('Fin real sin estado Listo');
    if (base.start && base.finish && base.start > base.finish) warnings.push('Cronograma base invertido');
    return { id: String(sub.id), name: sub.name, kind, owner: read(sub, cols, m.owner), status,
      baselineStart: base.start, baselineFinish: base.finish,
      forecastStart: isoDate(read(sub, cols, m.forecast_start)), forecastFinish: isoDate(read(sub, cols, m.forecast_finish)),
      actualFinish: actual && actual <= today && isDone(status) ? actual : '', warnings };
  }).filter(r => ['hito', 'accion', 'actividad'].includes(normalize(r.kind)));
}
export function milestoneDelay(record) {
  const finish = record.actualFinish || record.forecastFinish;
  if (!record.baselineFinish || !finish) return '';
  const days = Math.round((Date.parse(finish) - Date.parse(record.baselineFinish)) / 86400000);
  return `${record.actualFinish ? 'Real' : 'Previsto'}: ${days > 0 ? '+' : ''}${days} ${Math.abs(days) === 1 ? 'día' : 'días'}`;
}
export function money(value, currency) {
  if (value == null) return 'Por definir';
  const amount = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value);
  return ['USD', 'PEN'].includes(currency) ? `${amount} ${currency}` : `${amount} · moneda por definir`;
}
export function paidRatio(fields) {
  return fields.budget > 0 && fields.paid != null ? `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(fields.paid / fields.budget * 100)}% del CAPEX` : 'Porcentaje por definir';
}
function score(item, data, cut) {
  const risk = riskLevel(data.risk), updates = updateEntries(item, cut).filter(e => inReportingWeek(e.at, cut));
  const days = data.goLive ? (Date.parse(data.goLive) - Date.parse(cutDate(cut))) / 86400000 : Infinity;
  const events = (cut.activity?.events ?? []).some(e => String(e.item_id) === String(item.id) && e.classification === 'business_change' && e.before_text && e.after_text && e.before_text !== e.after_text && inReportingWeek(e.at_utc, cut));
  return (risk === 'block' ? 9 : risk === 'alert' ? 4 : 0) + (data.decision || data.mitigation ? 4 : 0)
    + (normalize(data.priority).includes('critical') ? 2 : normalize(data.priority).includes('high') ? 1 : 0)
    + (days < 0 ? 3 : days <= 30 ? 2 : 0) + (updates.length ? 3 : 0) + (events ? 2 : 0);
}
export function chooseProjects(cut, config, map) {
  const byId = new Map(cut.projects.map(i => [String(i.id), i]));
  const excluded = new Set((config.excluded_project_ids ?? []).map(String));
  const maximum = Math.min(16, Math.max(1, Number(config.maximum_projects) || 8)), selected = [];
  for (const id of (config.pinned_project_ids ?? []).map(String)) {
    if (!byId.has(id) || excluded.has(id)) throw new Error(`Selección PMO inválida: ${id}`);
    if (!selected.some(p => String(p.id) === id)) selected.push(byId.get(id));
  }
  if (selected.length > maximum) throw new Error('La selección PMO excede maximum_projects');
  const candidates = cut.projects.filter(i => !excluded.has(String(i.id)) && !selected.some(p => String(p.id) === String(i.id)))
    .map(item => ({ item, data: projectFields(item, cut, map) }))
    .filter(({ data }) => normalize(data.initiative) !== 'quick win')
    .filter(({ data }) => !isClosed(data.status) || Boolean(config.include_recently_closed && data.actualFinish && inReportingWeek(data.actualFinish + 'T12:00:00Z', cut)))
    .map(entry => ({ ...entry, score: score(entry.item, entry.data, cut) }))
    .filter(entry => entry.score > (normalize(entry.data.priority).includes('critical') ? 2 : normalize(entry.data.priority).includes('high') ? 1 : 0))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'es'));
  return [...selected, ...candidates.slice(0, maximum - selected.length).map(c => c.item)];
}
export function projectModel(item, cut, map) {
  const fields = projectFields(item, cut, map), records = subitemRecords(item, cut, map), missing = [];
  for (const [key, label] of [['pm', 'PM'], ['provider', 'Proveedor'], ['phase', 'Fase'], ['area', 'Área usuaria'], ['goLive', 'Go-Live'], ['decision', 'Decisión gerencial']]) if (!fields[key]) missing.push(label);
  for (const [key, label] of [['progress', 'Avance real'], ['plannedProgress', 'Avance planificado'], ['budget', 'Presupuesto CAPEX'], ['paid', 'CAPEX ejecutado'], ['opex', 'OPEX anual']]) if (fields[key] == null) missing.push(label);
  if (!['USD', 'PEN'].includes(fields.currency)) missing.push('Moneda');
  const noDecision = /^(ninguna(?: esta semana)?|no aplica|sin decision(?:es)? pendiente(?:s)?)$/.test(normalize(fields.decision));
  if (fields.decision && !noDecision) { if (!fields.decider) missing.push('Quién decide'); if (!fields.decisionDue) missing.push('Fecha límite decisión'); }
  const milestones = records.filter(r => normalize(r.kind) === 'hito');
  const actions = records.filter(r => normalize(r.kind) === 'accion' && !isDone(r.status));
  const activities = records.filter(r => normalize(r.kind) === 'actividad');
  if (!milestones.length) missing.push('Hitos en subelementos');
  if (!actions.length) missing.push('Próximas acciones');
  for (const r of records) { if (!r.owner && normalize(r.kind) === 'accion') missing.push(`Responsable: ${r.name}`); if (normalize(r.kind) === 'accion' && !r.forecastFinish) missing.push(`Fecha: ${r.name}`); }
  return { item, fields, missing, noDecision, milestones, actions, activities, records, latest: latestUpdate(item, cut), situation: situationText(item, cut), movements: updateEntries(item, cut).filter(e => inReportingWeek(e.at, cut)).length };
}
