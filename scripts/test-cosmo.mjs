import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const createCosmoKnowledge = require('../portafolio-ejecutivo-it/assets/js/cosmo-knowledge.js');
const html = fs.readFileSync(new URL('../portafolio-ejecutivo-it/index.html', import.meta.url), 'utf8');
const snapshot = html.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
assert.ok(snapshot, 'La instantánea de monday debe estar presente');
const start = html.indexOf("  'use strict';", snapshot.index);
const end = html.indexOf("  document.getElementById('cut-label')", start);
assert.ok(start >= 0 && end > start, 'El motor del portal debe estar presente');
const context = {
  document: { getElementById: id => id === 'snapshot' ? { textContent: snapshot[1] } : null },
  localStorage: { getItem: () => null, setItem: () => {} },
  location: { search: '', pathname: '/', hash: '' },
  URLSearchParams, Intl, Date, Set, Map, Number, String, Object, Array,
  createCosmoKnowledge,
};
vm.runInNewContext(html.slice(start, end) + '\n globalThis.testCosmo={ask:trainedAnswerChat,context:chatContext,D,C,findProject:cosmoBrain.findProject};', context);
const { ask, context: chat, D, C, findProject } = context.testCosmo;
const get = (name, id) => D.items.find(item => item.name === name)?.column_values?.[id];

let answer = ask('¿Qué proyectos tiene Valeria?');
assert.match(answer.text, /Valeria Hermoza/);
assert.match(answer.text, /5 proyecto/);
assert.ok(answer.text.includes(D.items.find(i => i.column_values[C.pm] === 'Valeria Hermoza').name));

answer = ask('¿Cómo va Connect?');
assert.equal(answer.project?.name, 'Cosmos Connect');
assert.ok(answer.text.includes(get('Cosmos Connect', C.status)));

answer = ask('¿Qué risgos tiene conect?');
assert.equal(answer.project?.name, 'Cosmos Connect');
assert.ok(answer.text.includes(get('Cosmos Connect', C.risk) || 'sin dato'));

answer = ask('¿Quién es su PM?');
assert.equal(answer.project?.name, 'Cosmos Connect');
assert.ok(answer.text.includes(get('Cosmos Connect', C.pm)));

answer = ask('¿Cuánto cuenta Connect?');
assert.equal(answer.project?.name, 'Cosmos Connect');
assert.match(answer.text, /financieros|Costo proyectado/i);

answer = ask('¿Qué proyectos tiene Valeria?');
assert.equal(answer.project, undefined, 'Una consulta de cartera debe salir del contexto anterior');
assert.match(answer.text, /5 proyecto/);

answer = ask('¿Cómo van los proyectos?');
assert.match(answer.text, new RegExp(String(D.items.length) + ' proyecto'));
assert.match(answer.text, /Cosmos Connect/);

answer = ask('¿Qué proyectos tienen riesgos o bloqueos?');
assert.match(answer.text, /riesgo o bloqueo/);
assert.match(answer.text, /Cosmos Connect/);

answer = ask('¿Qué proyectos están en UAT?');
assert.match(answer.text, /1 proyecto/);
assert.match(answer.text, /Cosmos Connect/);

answer = ask('¿Qué riesgos tiene Labor & Trace?');
assert.equal(answer.project?.name, 'Labor & Trace');
assert.match(answer.text, /Sin bloqueo/);

answer = ask('¿Qué pasó con la firma en Labor & Trace?');
assert.equal(answer.project?.name, 'Labor & Trace');
assert.match(answer.text, /bitácora|bitacora/i);
assert.match(answer.text, /firma/i);

answer = ask('¿Cuándo termina Labor & Trace?');
assert.equal(answer.project?.name, 'Labor & Trace');
assert.match(answer.text, /Fin Plan/);

answer = ask('¿Cuándo se cerró Cosmos Connect?');
assert.equal(answer.project?.name, 'Cosmos Connect');
assert.match(answer.text, /cierre efectivo|no hay un cierre/);

answer = ask('¿Cuál es la última actualización de Labor & Trace?');
assert.equal(answer.project?.name, 'Labor & Trace');
assert.match(answer.text, /Última actualización/);

assert.equal(findProject('¿Cómo va conect?').project?.name, 'Cosmos Connect');
assert.equal(chat.project, D.items.find(i => i.name === 'Labor & Trace').id);
console.log('Cosmo: 15 escenarios con datos reales aprobados.');
