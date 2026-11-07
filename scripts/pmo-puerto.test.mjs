import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import './pmo-fiestas.test.mjs';
import './mi-muelle.test.mjs';

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
  // Container length follows the initiative class; the split never changes the total and matches Comité guiado's count.
  const shortCount = actual.filter(puerto.isShort).length, mix = puerto.mixLabel(actual);
  assert.equal(shortCount, actual.filter(p => p.initiativeClass === 'Quick win').length);
  const comite = vm.runInNewContext('(()=>{const m=resumenModel(),done=m.closed.filter(i=>{const c=closureInfo(i);return c&&String(c.year)===m.currentYear&&c.quarter>=1&&c.quarter<=4});return{total:m.executedCurrent,done:done.length,qw:done.filter(i=>initiativeClass(i)==="Quick win").length}})()', context);
  assert.equal(comite.done, comite.total, scope + ': the committee split adds up to Entregados');
  assert.equal(comite.qw, shortCount, scope + ': committee and ship count the same quick wins');
  if (scope === 'all' && shortCount && shortCount < actual.length) assert.equal(mix, (actual.length - shortCount) + ' proyecto' + (actual.length - shortCount === 1 ? '' : 's') + ' y ' + shortCount + ' quick win' + (shortCount === 1 ? '' : 's'));
  else assert.equal(mix, '', scope + ': a single kind is already the total');
  const stowed = puerto.stowOrder(actual);
  assert.equal(stowed.length, actual.length);
  assert.ok(stowed.findIndex(puerto.isShort) === -1 || stowed.slice(stowed.findIndex(puerto.isShort)).every(puerto.isShort), 'ship: long containers in the lower tiers');
  puerto.activeByPhase(data).forEach(g => { const first = g.items.findIndex(puerto.isShort); assert.ok(first === -1 || g.items.slice(first).every(puerto.isShort), scope + ': list follows dock stowage in ' + g.phase); });
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
  _legend() { this.leg = { children: ['Planificado', 'Propuesto', 'Riesgo', 'Atraso', 'Neblina'].map(label => ({ remove() { remainingLegend.push(label); } })), insertAdjacentHTML() {} }; }
};
puerto.priorityDock(dock); dock.draw(); dock._legend();
assert.deepEqual(Array.from(paintItems, item => item.status), ['En Proceso', 'En Proceso']);
assert.deepEqual(Array.from(paintItems, item => [item.phase, item.risk, item.noFinPlan]), activeItems.map(item => [item.phase, item.risk === 'late' ? null : item.risk, item.noFinPlan]), 'overdue gets no flag in the dock');
assert.equal(dock.items, activeItems); assert.equal(JSON.stringify(activeItems), sourceItems);
assert.deepEqual(remainingLegend, ['Planificado', 'Propuesto'], 'remove only status colors; retain risk, delay and fog legends');

const ranked = [{ id: 'a', status: 'En Proceso', priority: 'Critical ⚠️️' }, { id: 'b', status: 'Stand by', priority: 'High' }, { id: 'c', status: 'En Proceso', priority: 'Medium' }, { id: 'd', status: 'En Proceso', priority: 'Low' }, { id: 'e', status: 'En Proceso', priority: '' }];
let rankedPaint, legendHtml = '';
const rankedDock = {
  items: ranked,
  draw() { rankedPaint = this.items; },
  _legend() { this.leg = { children: [{ remove() {} }, { remove() {} }], insertAdjacentHTML(position, html) { legendHtml += html; } }; }
};
puerto.priorityDock(rankedDock); rankedDock.draw(); rankedDock._legend();
assert.deepEqual(Array.from(rankedPaint, item => item.status), ['Critical', 'High', 'Medium', 'Low', 'En Proceso'], 'paint each container by its monday priority');
assert.equal(ranked[1].status, 'Stand by', 'never alter real status values');
const sizes = ['Critical ⚠️️', 'High', 'Medium', 'Low'].map(priority => puerto.priorityScale({ active: true, priority }));
assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a), 'higher priority means a larger chart icon');
assert.equal(new Set(sizes).size, 4);
assert.equal(puerto.priorityScale({ active: false, priority: 'Critical' }), 1, 'closed projects keep their size');
assert.equal(puerto.priorityScale({ active: true, priority: '' }), 1);
assert.deepEqual({ ...puerto.faceFlags({ reasons: ['Fin Plan vencido'] }) }, { risk: false }, 'overdue: normal face');
assert.deepEqual({ ...puerto.faceFlags({ reasons: ['Riesgo: Riesgo / Alerta'] }) }, { risk: true }, 'risk: open mouth');
assert.deepEqual({ ...puerto.faceFlags({ reasons: ['Bloqueo: Bloqueo', 'Fin Plan vencido'] }) }, { risk: true }, 'block: open mouth');
assert.deepEqual({ ...puerto.faceFlags({}) }, { risk: false });
rankedDock.pos = { a: { y: 90 }, b: { y: 50 } }; rankedDock.draw();
assert.deepEqual(Array.from(rankedPaint, item => item.id).slice(0, 3), ['c', 'd', 'e'], 'paint unplaced items without moving their order');
assert.equal(rankedPaint.findIndex(item => item.id === 'b') < rankedPaint.findIndex(item => item.id === 'a'), true, 'paint upper rows first so flags stay visible');
assert.deepEqual(legendHtml.match(/(Crítica|Alta|Media|Baja)/g), ['Crítica', 'Alta', 'Media', 'Baja'], 'legend lists priorities in board order, in Spanish');
assert.doesNotMatch(legendHtml, /Critical|High|Medium|Low/, 'monday values are not shown in English');
assert.deepEqual(['Critical ⚠️️', 'High', 'Medium', 'Low', 'Sin prioridad'].map(puerto.priorityLabel), ['Crítica', 'Alta', 'Media', 'Baja', 'Sin prioridad']);

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

// Quick win = short (20-foot) container, project = long (40-foot): dock, ship, hit test and legend.
const qwA = { id: 'q1', name: 'A', initiativeClass: 'Quick win', status: 'En Proceso', noFinPlan: true }, prB = { id: 'p1', name: 'B', initiativeClass: 'Proyecto', status: 'En Proceso' }, qwC = { id: 'q2', name: 'C', initiativeClass: 'Quick win', status: 'En Proceso' }, prD = { id: 'p2', name: 'D', initiativeClass: 'Proyecto', status: 'En Proceso' };
assert.deepEqual(Array.from(puerto.stowOrder([qwA, prB, qwC, prD]), p => p.id), ['p1', 'p2', 'q1', 'q2'], 'stowage keeps each kind in its order');
const berth = { byPhase: { Ejecución: [qwA, prB, qwC, prD] }, pos: { q1: { x: 1 }, p1: { x: 2 }, q2: { x: 3 }, p2: { x: 4 } } };
puerto.stowDock(berth);
assert.deepEqual([berth.pos.p1.x, berth.pos.p2.x, berth.pos.q1.x, berth.pos.q2.x], [1, 2, 3, 4], 'dock: projects take the lower slots, same slot set');
assert.deepEqual(Array.from(berth.byPhase['Ejecución'], p => p.id), ['p1', 'p2', 'q1', 'q2']);
const phased = puerto.activeByPhase({ phases: ['Ejecución'], projects: [qwA, prB].map(p => ({ ...p, active: true, phase: 'Ejecución' })) });
assert.deepEqual(Array.from(phased[0].items, p => p.id), ['p1', 'q1'], 'accessible list order matches the dock');

let boxCalls = [], shortLegend = '';
const mixed = {
  items: [qwA, prB], o: {}, cur: { q1: { x: 100, y: 200, u: 10 }, p1: { x: 300, y: 200, u: 10 } },
  draw() { boxCalls = this.items.map(item => [item.id, typeof this.boxFor(item), item.noFinPlan, item.shortFog]); },
  _legend() { this.leg = { children: [{ remove() {} }], insertAdjacentHTML(position, html) { if (position === 'beforeend') shortLegend += html; } }; }
};
puerto.priorityDock(mixed); mixed.draw(null, 0, 1); mixed._legend();
assert.deepEqual(boxCalls, [['q1', 'function', false, true], ['p1', 'object', undefined, undefined]], 'quick wins get the short painter and its own fog; projects keep the engine box');
assert.equal(mixed.boxFor, null, 'the painter hook only lives during the dock draw');
assert.equal(qwA.noFinPlan, true, 'real items keep their Fin Plan flag');
assert.equal(mixed.hitTest(100 + 18, 190)?.id, 'q1');
assert.equal(mixed.hitTest(100 + 20, 190), null, 'outside the short container there is nothing to hit');
assert.equal(mixed.hitTest(300 + 28, 190)?.id, 'p1');
assert.equal(mixed.hitTest(100, 230), null);
assert.deepEqual(shortLegend.match(/Contenedor (corto|largo): (quick win|proyecto)/g), ['Contenedor corto: quick win', 'Contenedor largo: proyecto']);
assert.match(shortLegend, /<svg width="14"[\s\S]*<svg width="21"/, 'short icon is narrower than the long one');
let onlyShort = '';
const qwOnly = { items: [qwC], o: {}, draw() {}, _legend() { this.leg = { children: [{ remove() {} }], insertAdjacentHTML(position, html) { if (position === 'beforeend') onlyShort += html; } }; } };
puerto.priorityDock(qwOnly); qwOnly._legend();
assert.match(onlyShort, /Contenedor corto/); assert.doesNotMatch(onlyShort, /Contenedor largo/, 'legend follows the scope filter');
assert.doesNotMatch(legendHtml, /Contenedor corto/, 'no short-container entry without quick wins');

// shortBox: a 3.8 × 3.6 unit body (the engine box is 6 × 3.6), one rib per side and the same face.
const shapes = [], lines = [], ctxCalls = [];
const fakeCtx = new Proxy({}, { get: (_, name) => (...args) => ctxCalls.push(name) , set: () => true });
const pen = { ctx: fakeCtx, shape: (pts, opt) => shapes.push({ pts, opt }), line: (pts, opt) => lines.push({ pts, opt }) };
const fxContext = { module: { exports: {} }, CosmosFx: { draw: { PAL: { steel: '#4F7A8B', ink: '#162631', cream: '#FFF8EC' } } } };
vm.runInNewContext(source('pmo-puerto.js'), fxContext);
fxContext.module.exports.shortBox(pen, 0, 0, 10, { col: '#2F755F' });
const bbox = pts => ({ w: Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0])), h: Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1])) });
assert.deepEqual(bbox(shapes[0].pts), { w: 38, h: 36 }, 'short body: 3.8 by 3.6 units');
assert.deepEqual(bbox(shapes[1].pts), { w: 23, h: 22 }, 'same face panel as the long container');
assert.equal(lines.filter(l => l.opt.alpha === .6).length, 2, 'one rib per side');
assert.ok(ctxCalls.includes('ellipse') && ctxCalls.includes('save') && ctxCalls.includes('restore'), 'shadow and eyes, balanced canvas state');
const bundle = fs.readFileSync(new URL('assets/js/cosmos-paper-fx.min.js', base), 'utf8');
assert.match(bundle, /\(this\.boxFor&&this\.boxFor\(e\)\|\|k\.box\)\(t,c,h-m,n\.u,/, 'engine hook from scripts/patch-paper-fx-labels.mjs');
assert.equal(bundle.split('this.countLabel?this.countLabel(this.byPhase[s]||[])').length - 1, 2, 'desktop and mobile berth plates use the count hook');
assert.deepEqual([[qwA, prB, qwC], [prB], [prB, prD], [qwA], [qwA, qwC]].map(puerto.countLabel), ['3 iniciativas', '1 proyecto', '2 proyectos', '1 quick win', '2 quick wins']);
console.log('Puerto: cierre efectivo, clases, año, filtro personal, carga única, fuente intacta y contenedores corto/largo verificados.', totals);
