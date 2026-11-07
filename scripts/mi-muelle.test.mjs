import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Mi muelle: the greeting's total adds up, removed monday users never get a dock, and the texts use the portal's words.
// PMO_PUERTO_FIXTURE=<snapshot.json|index.html> runs the same checks on another cut (and the named cases of Ola 1).
const base = new URL('../portafolio-ejecutivo-it/', import.meta.url);
const source = name => fs.readFileSync(new URL('assets/js/' + name, base), 'utf8');
const load = name => { const context = { module: { exports: {} } }; vm.runInNewContext(source(name), context); return context.module.exports; };
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
const live = process.env.PMO_PUERTO_FIXTURE;
if (live) {
  const fixture = fs.readFileSync(live, 'utf8').replace(/^﻿/, '');
  context.fixture = JSON.parse(fixture.startsWith('<') ? fixture.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/)[1] : fixture);
  vm.runInNewContext('D=fixture', context);
}
const P = context.PMOData;
// The dock's people, as the engine lists them (CosmosFx.muellePeople): PM and sponsors by name, one entry per person.
const key = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '.');
function people(d) {
  const map = new Map();
  const add = (names, role, id) => String(names || '').split(/\s*,\s*/).filter(Boolean).forEach(name => {
    if (/miembro eliminado/i.test(name)) return;
    const k = key(name), p = map.get(k) || { key: k, name, roles: [], ids: [] };
    if (!p.roles.includes(role)) p.roles.push(role); p.ids.push(id); map.set(k, p);
  });
  d.projects.forEach(p => { add(p.sponsorName, 'sponsor', p.id); add(p.pm, 'pm', p.id); });
  return [...map.values()];
}

test('las partes del saludo suman el total en cada cartera', () => {
  for (const scope of ['all', 'projects', 'quick-wins']) {
    vm.runInNewContext('state.initiativeScope=' + JSON.stringify(scope), context);
    const d = P.build(), list = people(d);
    if (scope === 'all') assert.ok(list.length > 0, 'hay personas en el corte');
    for (const person of list) {
      const c = P.muelleCounts(d, person), parts = [c.active, c.delivered, c.earlier, c.noDate];
      assert.equal(parts.reduce((s, x) => s + x.length, 0), c.total, scope + ' ' + person.name + ': activas + entregadas + anteriores + sin fecha = total');
      assert.equal(new Set(parts.flat().map(p => p.id)).size, c.total, scope + ' ' + person.name + ': ninguna iniciativa se cuenta dos veces');
      assert.ok(c.delivered.every(p => p.delivered && !p.active), person.name + ': entregadas = «Entregados <año>»');
      assert.ok(c.noDate.every(p => !p.active && !p.delivered && (p.closedYear == null || Number(p.closedYear) >= d.totals.year)), person.name + ': sin fecha de cierre');
    }
  }
  vm.runInNewContext('state.initiativeScope="all"', context);
});

test('PM no vigente y Miembro eliminado nunca tienen muelle', () => {
  for (const name of ['PM no vigente', 'pm.no.vigente', 'PM NO VIGENTE', 'Miembro eliminado', 'miembro.eliminado']) assert.equal(P.isRemovedPerson(name), true, name);
  for (const name of ['Carlos Caycho Martinez', 'carlos.caycho.martinez', 'PM', '', null]) assert.equal(P.isRemovedPerson(name), false, String(name));
  // Every way into a dock applies the same rule: picker, link (?myPm= and #muelle=), saved choice, passport and Cosmo's bubble.
  const av = source('pmo-av.js'), art = source('pmo-art.js'), fx = source('portal-fx.js');
  const body = (src, name) => { const i = src.indexOf('function ' + name); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n  }', i)); };
  assert.match(body(av, 'muelleFromUrl'), /isRemovedPerson\(wanted\)/);
  assert.match(body(av, 'muelleFromUrl'), /muelleUnknown = !person/);
  assert.match(body(av, 'muellePicker'), /isRemovedPerson\(p\.key\)/);
  assert.match(body(av, 'dropRemovedMuelle'), /isRemovedPerson\(prefs\.who\)/);
  assert.match(body(av, 'dropRemovedMuelle'), /muelle=/);
  assert.match(body(av, 'selectedMuellePerson'), /isRemovedPerson\(prefs\.who\)/);
  assert.match(av, /Object\.defineProperty\(proto, 'person'[\s\S]{0,200}isRemovedPerson/);
  assert.match(body(art, 'mountMuelle'), /isRemovedPerson\(st\.who\)/);
  assert.match(body(fx, 'muellePerson'), /isRemovedPerson\(prefs\.who\)/);
  assert.match(av, /No encontramos a ese nombre en este corte\. Elige el tuyo\./);
  assert.match(av, /Elegir mi muelle/);
});

test('vocabulario: iniciativas si se mezclan tipos, y singulares correctos', () => {
  const pr = { initiativeClass: 'Proyecto' }, qw = { initiativeClass: 'Quick win' };
  const mix = P.kindOf([pr, qw]), onlyPr = P.kindOf([pr, pr]), onlyQw = P.kindOf([qw]);
  assert.equal(mix.many, 'iniciativas'); assert.equal(onlyPr.many, 'proyectos'); assert.equal(onlyQw.many, 'quick wins');
  assert.equal(P.countOf(1, mix), '1 iniciativa'); assert.equal(P.countOf(17, mix), '17 iniciativas');
  assert.equal(P.countOf(1, onlyQw), '1 quick win'); assert.equal(P.countOf(2, onlyPr), '2 proyectos');
  assert.equal(P.agree(1, mix, 'activo'), 'activa'); assert.equal(P.agree(8, mix, 'entregado'), 'entregadas'); assert.equal(P.agree(1, mix, 'cerrado'), 'cerrada');
  assert.equal(P.agree(1, onlyQw, 'activo'), 'activo'); assert.equal(P.agree(2, onlyPr, 'cerrado'), 'cerrados');
  assert.deepEqual(JSON.parse(JSON.stringify(P.passportFigures(1, 1, 1, mix, 2026))), [[1, 'activa'], [1, 'entregada en 2026'], [1, 'espera decisión']]);
  assert.deepEqual(JSON.parse(JSON.stringify(P.passportFigures(8, 8, 4, onlyPr, 2026))), [[8, 'activos'], [8, 'entregados en 2026'], [4, 'esperan decisión']]);
  // The greeting builds its words from these helpers, not from fixed "proyectos".
  const av = source('pmo-av.js'), welcome = av.slice(av.indexOf('function muelleWelcome'), av.indexOf('function muelleFocus'));
  assert.doesNotMatch(welcome, /'proyecto activo'|de tus proyectos|plural\(m\.mine\.length, 'proyecto'/);
  assert.match(welcome, /sin fecha de cierre/);
  assert.doesNotMatch(welcome, /brief-more/, '«Y N más» va en el botón');
});

test('botón a Riesgos y decisiones: dice lo que se verá si no puede filtrar', () => {
  const av = source('pmo-av.js'), welcome = av.slice(av.indexOf('function muelleWelcome'), av.indexOf('function muelleFocus'));
  assert.match(welcome, /exact = !!filters\.pm && seen === a/);
  assert.match(welcome, /'Ver en Riesgos y decisiones'/);
  assert.match(welcome, /' en Riesgos y decisiones'/);
});

test('pasaporte del motor: rótulos, sellos y tooltip parchados', () => {
  const fx = source('cosmos-paper-fx.min.js');
  assert.ok(!fx.includes('"Ejecutado"+(t.closedLabel'), 'el tooltip del sello no dice «Ejecutado el 2026»');
  assert.equal(fx.split('"Entregado"+(t.closedLabel?(/^\\d{4}$/.test(t.closedLabel)?" en ":" el ")').length - 1, 2);
  assert.ok(fx.includes('const C=h.figures||'), 'las cifras aceptan los rótulos del portal');
  assert.ok(!fx.includes('"por decidir"'), 'mismo rótulo en escritorio y celular');
  assert.ok(fx.includes('1===h.decide?"espera decisión":"esperan decisión"'));
  assert.ok(fx.includes('this.stampLines&&this.stampLines(e,Pt(c.name),i)'), 'nombres de sello sin cortar');
  assert.ok(fx.includes('$t=["#2F755F","#1F5E7A","#003D53","#6E5C83","#9C7550"]') && !fx.includes('"#8E3B2F","#6E5C83"'), 'sin rojo en los sellos');
});

if (live) test('corte de Ola 1: total = partes para los casos de la auditoría', () => {
  vm.runInNewContext('state.initiativeScope="all"', context);
  const d = P.build(), list = people(d), find = n => list.find(p => p.key === key(n));
  const expected = { 'Juan Pablo Arbulú': [17, 8, 8, 1], 'Walter Gonzales': [10, 2, 7, 1], 'Giancarlo Cabello': [15, 9, 5, 1], 'Milagros Cheel': [17, 10, 6, 1], 'Pierre Lozano': [2, 1, 0, 1] };
  for (const [name, [total, act, del, rest]] of Object.entries(expected)) {
    const c = P.muelleCounts(d, find(name));
    assert.deepEqual([c.total, c.active.length, c.delivered.length, c.noDate.length + c.earlier.length], [total, act, del, rest], name);
    assert.equal(c.kind.many, 'iniciativas', name);
  }
});
