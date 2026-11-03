import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base = new URL('../portafolio-ejecutivo-it/', import.meta.url);
const source = name => fs.readFileSync(new URL('assets/js/' + name, base), 'utf8');
const load = name => { const context = { module: { exports: {} } }; vm.runInNewContext(source(name), context); return context.module.exports; };
const puerto = load('pmo-puerto.js');
const html = fs.readFileSync(new URL('index.html', base), 'utf8');
const snapshot = html.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
const start = html.indexOf("  'use strict';", snapshot.index), end = html.indexOf('  let cosmoGuide=', start);
const context = {
  document: { getElementById: id => id === 'snapshot' ? { textContent: snapshot[1] } : null },
  localStorage: { getItem: () => null, setItem() {} }, location: { search: '', pathname: '/', hash: '' },
  URLSearchParams, Intl, Date, Set, Map, Number, String, Object, Array,
  PMOFinance: load('finance-model.js'), PMORiskDiagnostics: load('risk-diagnostics.js')
};
context.window = context;
vm.runInNewContext(html.slice(start, end), context);
vm.runInNewContext(source('pmo-data.js'), context);
if (process.env.PMO_PUERTO_FIXTURE) {
  const fixture = fs.readFileSync(process.env.PMO_PUERTO_FIXTURE, 'utf8').replace(/^\uFEFF/, '');
  context.fixture = JSON.parse(fixture.startsWith('<') ? fixture.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/)[1] : fixture);
  vm.runInNewContext('D=fixture', context);
}
const totals = {};
for (const scope of ['all', 'projects', 'quick-wins']) {
  vm.runInNewContext('state.initiativeScope=' + JSON.stringify(scope), context);
  const data = context.PMOData.build(), before = JSON.stringify(data);
  const expected = vm.runInNewContext('initiativeItems().filter(i=>val(i,C.status)==="Cerrado"&&String(closureInfo(i)?.year)===String(new Date(D.extracted_at_utc).getFullYear())).map(i=>String(i.id))', context);
  const actual = puerto.closed(data);
  assert.deepEqual(Array.from(actual, p => p.id), Array.from(expected), scope + ': cargo must exactly match effective closures');
  if (scope !== 'all') assert.ok(actual.every(p => p.initiativeClass === (scope === 'projects' ? 'Proyecto' : 'Quick win')));
  assert.equal(new Set(actual.map(p => p.id)).size, actual.length);
  assert.equal(puerto.closed(data, p => p.id === actual[0]?.id).length, actual.length ? 1 : 0, 'personal filter must also constrain cargo');
  const adapted = puerto.portData(data);
  assert.equal(JSON.stringify(data), before, 'scene must not mutate the source contract');
  assert.equal(adapted.projects, data.projects);
  if (!data.projects.some(p => p.active && p.phase === 'Cierre')) assert.ok(!adapted.phases.includes('Cierre'));
  totals[scope] = actual.length;
}
assert.equal(totals.all, totals.projects + totals['quick-wins']);
const edge = { totals: { year: 2026 }, phases: ['Propuesta', 'Cierre'], projects: [
  { id: 'active', active: true, phase: 'Cierre', status: 'En Proceso', closedYear: 2026 },
  { id: 'prior-year', active: false, status: 'Cerrado', closedYear: 2025 },
  { id: 'undated', active: false, status: 'Cerrado', closedYear: null },
  { id: 'cancelled', active: false, status: 'Cancelado', closedYear: 2026 }
] };
assert.equal(puerto.closed(edge).length, 0, 'never invent a closure from inactive status, missing year or another year');
assert.deepEqual(puerto.portData(edge).phases, ['Cierre'], 'hide free berths and keep active closing work in its actual phase');
assert.deepEqual(puerto.portData({ phases: ['Propuesta', 'Cierre'], projects: [] }).phases, ['Propuesta'], 'an empty view keeps its route');
assert.equal(new Set(puerto.slots(puerto.pageSize).map(p => p.col + ':' + p.row)).size, puerto.pageSize);
assert.equal(puerto.slots(0).length, 0);

const activeItems = [{ id: 'planned', status: 'Planificado', phase: 'Planificación', risk: 'risk', noFinPlan: true }, { id: 'proposed', status: 'Propuesto', phase: 'Propuesta', risk: 'late' }];
const sourceItems = JSON.stringify(activeItems), remainingLegend = [];
let paintItems;
const dock = {
  items: activeItems,
  draw() { paintItems = this.items; },
  _legend() { this.leg = { children: ['Planificado', 'Propuesto', 'Riesgo', 'Atraso', 'Neblina'].map(label => ({ remove() { remainingLegend.push(label); } })) }; }
};
puerto.priorityDock(dock); dock.draw(); dock._legend();
assert.deepEqual(Array.from(paintItems, item => item.status), ['En Proceso', 'En Proceso']);
assert.deepEqual(Array.from(paintItems, item => [item.phase, item.risk, item.noFinPlan]), activeItems.map(item => [item.phase, item.risk, item.noFinPlan]));
assert.equal(dock.items, activeItems); assert.equal(JSON.stringify(activeItems), sourceItems);
assert.deepEqual(remainingLegend, ['Planificado', 'Propuesto'], 'remove only status colors; retain risk, delay and fog legends');

const ranked = [{ id: 'a', status: 'En Proceso', priority: 'Critical ⚠️️' }, { id: 'b', status: 'Stand by', priority: 'High' }, { id: 'c', status: 'En Proceso', priority: 'Medium' }, { id: 'd', status: 'En Proceso', priority: 'Low' }, { id: 'e', status: 'En Proceso', priority: '' }];
let rankedPaint, legendHtml = '';
const rankedDock = {
  items: ranked,
  draw() { rankedPaint = this.items; },
  _legend() { this.leg = { children: [{ remove() {} }, { remove() {} }], insertAdjacentHTML(position, html) { legendHtml = html; } }; }
};
puerto.priorityDock(rankedDock); rankedDock.draw(); rankedDock._legend();
assert.deepEqual(Array.from(rankedPaint, item => item.status), ['Critical', 'High', 'Medium', 'Low', 'En Proceso'], 'paint each container by its monday priority');
assert.equal(ranked[1].status, 'Stand by', 'never alter real status values');
const sizes = ['Critical ⚠️️', 'High', 'Medium', 'Low'].map(priority => puerto.priorityScale({ active: true, priority }));
assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a), 'higher priority means a larger chart icon');
assert.equal(new Set(sizes).size, 4);
assert.equal(puerto.priorityScale({ active: false, priority: 'Critical' }), 1, 'closed projects keep their size');
assert.equal(puerto.priorityScale({ active: true, priority: '' }), 1);
rankedDock.pos = { a: { y: 90 }, b: { y: 50 } }; rankedDock.draw();
assert.deepEqual(Array.from(rankedPaint, item => item.id).slice(0, 3), ['c', 'd', 'e'], 'paint unplaced items without moving their order');
assert.equal(rankedPaint.findIndex(item => item.id === 'b') < rankedPaint.findIndex(item => item.id === 'a'), true, 'paint upper rows first so flags stay visible');
assert.deepEqual(legendHtml.match(/(Critical|High|Medium|Low)/g), ['Critical', 'High', 'Medium', 'Low'], 'legend lists priorities in board order');

let intersection, paints = 0, disconnected = false;
const listeners = new Map(), media = { matches: false, addEventListener() {}, removeEventListener() {} };
const doc = { hidden: false, addEventListener(event, fn) { listeners.set(event, fn); }, removeEventListener(event) { listeners.delete(event); } };
const moving = { el: { isConnected: true }, cv: {}, quiet: false, wake() {}, paint() { paints++; }, destroy() {} };
puerto.ambientMotion(moving, { document: doc, matchMedia: () => media, IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} disconnect() { disconnected = true; } } });
assert.equal(moving.busy(100), false);
intersection([{ isIntersecting: true }]);
assert.equal(moving.busy(100000), true, 'visible port stays animated beyond idle timeout without pointer events');
moving.paint(); assert.equal(paints, 1);
doc.hidden = true; assert.equal(moving.busy(100001), false); moving.paint(); assert.equal(paints, 1);
doc.hidden = false; intersection([{ isIntersecting: false }]); assert.equal(moving.busy(100002), false); moving.paint(); assert.equal(paints, 1);
intersection([{ isIntersecting: true }]); media.matches = true; assert.equal(moving.busy(100003), false);
media.matches = false; moving.quiet = true; assert.equal(moving.busy(100004), false);
moving.quiet = false; moving.el.isConnected = false; assert.equal(moving.busy(100005), false);
moving.destroy(); assert.equal(disconnected, true); assert.equal(listeners.size, 0);
console.log('Puerto: cierre efectivo, clases, año, filtro personal, carga única y fuente intacta verificados.', totals);
