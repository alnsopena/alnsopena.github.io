import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { withRiskOrigin } from './risk-origin.mjs';

const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('portafolio-ejecutivo-it/index.html', root), 'utf8');
const modelContext = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(new URL('portafolio-ejecutivo-it/assets/js/risk-diagnostics.js', root), 'utf8'), modelContext);
const model = modelContext.module.exports;
const C = { status: 'status', plan: 'plan', phase: 'phase' };
const val = (i, id) => i?.column_values?.[id] ?? null;
const item = (id, columns = {}, origin) => ({ id, name: 'Proyecto ' + id, ...(origin === undefined ? {} : { origenRiesgo: origin }), column_values: { status: 'En Proceso', ...columns } });
const cut = '2026-10-27T15:00:00Z';

test('snapshot mapping only adds origenRiesgo and never modifies source columns', () => {
  for (const source of [item('old'), item('empty', { color_mm8hkhwx: null }), item('named', { color_mm8hkhwx: ' Área usuaria ' })]) {
    const copy = structuredClone(source), result = withRiskOrigin(source);
    const { origenRiesgo, ...rest } = result;
    assert.deepEqual(source, copy);
    assert.deepEqual(rest, source);
    assert.equal(origenRiesgo, source.id === 'named' ? 'Área usuaria' : '');
  }
});
test('older snapshots are unclassified, never inferred from a vendor or a raw column', () => {
  const old = item('old', { color_mm8hkhwx: 'Proveedor', provider: 'Empresa' });
  assert.equal(model.origin(old), '');
  assert.ok(model.matchesOrigin(old, 'Sin clasificar'));
  const distribution = model.distribution([old, item('other')]);
  assert.equal(distribution.missing, 2);
  assert.equal(distribution.allUnclassified, true);
  assert.equal(model.conclusion([old], cut, C, val), 'Origen sin clasificar en monday');
});
test('three classified projects give exact counts, proportions, filter and conclusion', () => {
  const projects = [item('a', { plan: '2026-10-15' }, 'Proveedor'), item('b', { plan: '2026-10-17' }, 'Proveedor'), item('c', {}, 'Sponsor / Gerencia'), item('d')];
  const result = model.distribution(projects);
  assert.equal(result.groups[0].count, 2);
  assert.equal(result.groups[0].share, 50);
  assert.equal(result.groups[2].count, 1);
  assert.equal(result.groups[2].share, 25);
  assert.equal(result.missing, 1);
  assert.equal(model.conclusion(projects, cut, C, val), '4 en atención · 2 con atraso (promedio 11 días). Dependen: 2 del proveedor, 1 del sponsor / gerencia. 1 sin origen clasificado.');
  assert.deepEqual(projects.filter(i => model.matchesOrigin(i, 'Proveedor')).map(i => i.id), ['a', 'b']);
  assert.deepEqual(projects.filter(i => model.matchesOrigin(i, 'Sin clasificar')).map(i => i.id), ['d']);
  assert.equal(model.conclusion([item('future', { plan: '2026-12-01' }, 'Equipo TI')], cut, C, val), '1 en atención. Dependen: 1 del equipo TI.');
  assert.doesNotMatch(model.conclusion([], cut, C, val), /0|—/);
});
test('calendar delays use the Lima date of the cut, including midnight and leap dates', () => {
  assert.equal(model.daysLate(item('a', { plan: '2026-10-15' }), cut, C, val), 12);
  assert.equal(model.daysLate(item('b', { plan: '2026-10-26' }), '2026-10-27T04:59:59Z', C, val), 0);
  assert.equal(model.daysLate(item('b', { plan: '2026-10-26' }), '2026-10-27T05:00:00Z', C, val), 1);
  assert.equal(model.daysLate(item('c', { plan: '2026-10-22' }), cut, C, val), 5);
  assert.equal(model.daysLate(item('d', { plan: '2026-10-21' }), cut, C, val), 6);
  assert.equal(model.daysLate(item('future', { plan: '2026-10-28' }), cut, C, val), 0);
  assert.equal(model.daysLate(item('closed', { status: 'Cerrado', plan: '2026-01-01' }), cut, C, val), 0);
  assert.equal(model.daysLate(item('missing'), cut, C, val), null);
  assert.equal(model.daysLate(item('invalid', { plan: '2026-02-30' }), cut, C, val), null);
  assert.equal(model.daysLate(item('leap', { plan: '2028-02-28' }), '2028-03-01T12:00:00Z', C, val), 2);
});
test('preventive window counts five weekdays after the cut and uses all eligible active projects', () => {
  const friday = '2026-10-30T15:00:00Z';
  const cases = [
    item('today', { plan: '2026-10-30', phase: 'Ejecución' }),
    item('weekend', { plan: '2026-10-31', phase: 'Ejecución' }),
    item('monday', { plan: '2026-11-02', phase: 'Pruebas UAT' }),
    item('fifth', { plan: '2026-11-06', phase: 'Ejecución' }),
    item('sixth', { plan: '2026-11-09', phase: 'Ejecución' }),
    ...['Despliegue', 'Estabilización', 'Cierre'].map(phase => item(phase, { plan: '2026-11-02', phase })),
    item('closed', { status: 'Cerrado', plan: '2026-11-02', phase: 'Ejecución' }),
    item('missing'),
  ];
  assert.deepEqual(Array.from(model.preventive(cases, friday, C, val), i => i.id), ['monday', 'fifth']);
  assert.deepEqual(Array.from(model.preventive(cases, 'bad-cut', C, val)), []);
  const window = model.businessWindow('2026-12-30T15:00:00Z');
  assert.equal(new Date(window.end * 86400000).toISOString().slice(0, 10), '2027-01-06');
});

function portal() {
  const snapshot = html.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
  const start = html.indexOf("  'use strict';", snapshot.index), end = html.indexOf('  let cosmoGuide=', start);
  const elements = new Map(), storage = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', hidden: false, open: false, dataset: {}, classList: { add() {}, remove() {} }, focus() {}, showModal() { this.open = true; }, close() { this.open = false; } }); return elements.get(id); };
  let data = JSON.parse(snapshot[1]);
  if (process.env.RISK_TEST_SNAPSHOT_PATH) data = JSON.parse(fs.readFileSync(process.env.RISK_TEST_SNAPSHOT_PATH, 'utf8'));
  const context = {
    PMORiskDiagnostics: model, PMOFinance: { project() { return { invalidFields: [] }; } },
    document: { getElementById: id => id === 'snapshot' ? { textContent: JSON.stringify(data) } : element(id), querySelector: () => element('scope') },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    location: { search: '', pathname: '/portafolio-ejecutivo-it/', hash: '' }, history: { replaceState(_s, _t, url) { context.lastUrl = url; } },
    URLSearchParams, Intl, Date, innerWidth: 375, window: { scrollTo() {} },
  };
  vm.runInNewContext(html.slice(start, end) + '\nglobalThis.api={C,val,attentionReasons,filteredAttentionItems,riskAttentionItems,riskDaysLate,riskDelayBadge,riskConclusion,riskPreventiveItems,renderRiskDiagnostics,renderAtencion,setRiskOrigin,clearFilters,loadPreferences,goFiltered};globalThis.setState=x=>Object.assign(state,x);globalThis.getState=()=>state;globalThis.setSnapshot=x=>D=x;globalThis.getSnapshot=()=>D;', context);
  const art = fs.readFileSync(new URL('portafolio-ejecutivo-it/assets/js/pmo-art.js', root), 'utf8');
  const a = art.indexOf('  function viewItems(view)'), b = art.indexOf('  const toProjects', a);
  vm.runInNewContext('const g=name=>eval(name);' + art.slice(a, b) + ';globalThis.artItems=viewItems;', context);
  return { context, api: context.api, elements, storage, data };
}
test('84 existing filter combinations keep exactly the previous project sets when origin is All', () => {
  const { context: p, api, data } = portal(), pm = api.C.pm, priority = api.C.priority;
  const pms = ['', ...new Set(data.items.map(i => api.val(i, pm)).filter(Boolean))].slice(0, 7);
  while (pms.length < 7) pms.push('PM ausente ' + pms.length);
  const priorities = ['', 'Critical ⚠️️', 'High'], issues = ['', 'Bloqueos', 'Riesgos', 'Plazos vencidos'];
  let combinations = 0;
  for (const manager of pms) for (const level of priorities) for (const issue of issues) {
    p.setState({ pm: manager, priority: level, issue, riskOrigin: '' });
    const before = Array.from(api.filteredAttentionItems(), i => i.id), after = Array.from(api.riskAttentionItems(), i => i.id);
    assert.deepEqual(after, before, JSON.stringify({ manager, level, issue }));
    assert.deepEqual(Array.from(p.artItems('atencion'), i => i.id), before);
    combinations++;
  }
  assert.equal(combinations, 84);
});
test('all-unclassified live/old snapshots only show the discrete box, and the old cards remain', () => {
  const { context: p, api, data } = portal();
  const before = Array.from(api.filteredAttentionItems(), i => i.id);
  const markup = api.renderRiskDiagnostics(api.riskAttentionItems());
  assert.equal((markup.match(/class="risk-origin(?: unclassified)?"/g) || []).length, before.length ? 1 : 0);
  assert.match(markup, /Origen pendiente de clasificar en monday/);
  assert.doesNotMatch(markup, /risk-origin-fill|>Proveedor</);
  assert.equal(api.riskConclusion(), 'Origen sin clasificar en monday');
  assert.equal((api.renderAtencion().match(/class="card alert-card"/g) || []).length, before.length);
  assert.equal(data.items.some(i => i.origenRiesgo), false);
  p.setState({ riskOrigin: 'Sin clasificar' });
  assert.deepEqual(Array.from(api.riskAttentionItems(), i => i.id), before);
});
test('all available type, mitigation owner, priority and issue filters keep the old results', () => {
  const { context: p, api } = portal();
  const base = api.filteredAttentionItems(), c = api.C;
  const pms = ['', ...new Set(base.map(i => api.val(i, c.pm)).filter(Boolean))];
  const priorities = ['', ...new Set(base.map(i => api.val(i, c.priority)).filter(Boolean))];
  const owners = ['', ...new Set(base.flatMap(i => (api.val(i, c.mitigationOwner) || '').split(/\s*,\s*/)).filter(Boolean)), 'Sin responsable'];
  for (const pm of pms) for (const priority of priorities) for (const issue of ['', 'Bloqueos', 'Riesgos', 'Plazos vencidos'])
    for (const riskType of ['', 'Operativo', 'Gestión', 'Pendiente de clasificar']) for (const mitigationOwner of owners) {
      p.setState({ pm, priority, issue, riskType, mitigationOwner, riskOrigin: '' });
      assert.deepEqual(Array.from(api.riskAttentionItems(), i => i.id), Array.from(api.filteredAttentionItems(), i => i.id));
    }
});
test('origin cards, URL, storage, reset, preventive filters, detail delay tones and HTML escaping', () => {
  const { context: p, api, elements, storage } = portal(), c = api.C;
  const fixture = (id, extra = {}, origin) => ({ ...item(id, { [c.status]: 'En Proceso', [c.pm]: 'Alonso Pena', [c.priority]: 'High', [c.plan]: '2026-10-15', [c.risk]: 'Riesgo / Alerta', ...extra }, origin), subitems: [], updated_at: cut });
  const projects = [fixture('a', {}, 'Proveedor'), fixture('b', {}, 'Proveedor'), fixture('c', { [c.plan]: '2026-10-22' }, 'Sponsor / Gerencia'), fixture('d'), fixture('soon', { [c.risk]: 'Sin bloqueo', [c.plan]: '2026-10-29', [c.phase]: 'Ejecución' }, 'Equipo TI')];
  const data = p.getSnapshot(); p.setSnapshot({ ...data, items: projects, extracted_at_utc: cut, updates: [] });
  assert.equal(api.riskAttentionItems().length, 4);
  const markup = api.renderRiskDiagnostics(api.riskAttentionItems());
  assert.equal((markup.match(/class="risk-origin(?: unclassified)?"/g) || []).length, 5);
  assert.match(markup, /--share:50%/);
  assert.match(markup, /Próximos 5 días hábiles/);
  assert.match(api.riskDelayBadge(projects[0]), /red/);
  assert.match(api.riskDelayBadge(projects[2]), /amber/);
  assert.equal(api.riskDelayBadge(fixture('no-date', { [c.plan]: null })), '');
  api.setRiskOrigin('Proveedor');
  assert.deepEqual(Array.from(api.riskAttentionItems(), i => i.id), ['a', 'b']);
  assert.match(api.renderRiskDiagnostics(api.riskAttentionItems()), /aria-pressed="true"/);
  assert.match(p.lastUrl, /riskOrigin=Proveedor/);
  assert.equal(JSON.parse(storage.get('portfolio-preferences')).riskOrigin, 'Proveedor');
  p.setState({ riskOrigin: '' }); api.loadPreferences();
  assert.equal(p.getState().riskOrigin, 'Proveedor');
  api.clearFilters();
  assert.equal(p.getState().riskOrigin, '');
  assert.deepEqual(Array.from(api.riskPreventiveItems(), i => i.id), ['soon']);
  p.setState({ pm: 'Otro PM' }); assert.equal(api.riskPreventiveItems().length, 0);
  p.setState({ pm: '', riskOrigin: 'Proveedor' }); assert.equal(api.riskPreventiveItems().length, 0);
  p.setState({ riskOrigin: '' }); api.goFiltered('atencion', { search: 'Proyecto' });
  assert.equal(p.getState().riskOrigin, '');
  const before = elements.get('main').innerHTML;
  assert.doesNotMatch(before, /—/);
  assert.equal(api.riskConclusion().includes('0 con atraso'), false);
  const unsafe = fixture('unsafe', { [c.plan]: '2026-10-28', [c.risk]: 'Sin bloqueo' });
  unsafe.name = '<img src=x onerror=alert(1)>';
  p.setSnapshot({ ...data, items: [unsafe], extracted_at_utc: cut, updates: [] });
  p.setState({ search: '' });
  const escaped = api.renderRiskDiagnostics([]);
  assert.doesNotMatch(escaped, /<img/);
  assert.match(escaped, /&lt;img/);
});
