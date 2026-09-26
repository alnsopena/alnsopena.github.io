import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const createGuide = require('../portafolio-ejecutivo-it/assets/js/cosmo-guide.js');
const html = fs.readFileSync(new URL('../portafolio-ejecutivo-it/index.html', import.meta.url), 'utf8');
const snapshot = html.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
assert.ok(snapshot, 'Debe existir un corte de monday');
const D = JSON.parse(snapshot[1]);
const start = html.indexOf("  'use strict';", snapshot.index);
const end = html.indexOf('  const cosmoGuide=', start);
assert.ok(start >= 0 && end > start, 'Deben existir las funciones base del portal');
const mainEnd = html.indexOf('  </script>', end);
assert.ok(mainEnd > end);
new vm.Script(html.slice(start, mainEnd));
const script = html.slice(start, end) + '\n globalThis.guideTest={C,val,num,fmtDate,fmtNum,projectUpdateEntries,shortAnswer,weeklyMilestones,attentionReasons,closureInfo,closureLabel,closureSourceLabel,past};';
const context = {
  document: { getElementById: id => id === 'snapshot' ? { textContent: snapshot[1] } : null },
  localStorage: { getItem: () => null, setItem: () => {} },
  location: { search: '', pathname: '/', hash: '' },
  URLSearchParams, Intl, Date, Set, Map, Number, String, Object, Array,
};
vm.runInNewContext(script, context);
const h = context.guideTest;
const guide = createGuide(D, h.C, h);
const options = page => guide.options(page);
const answer = topic => guide.answer({ type: 'answer', topic });
const byName = name => D.items.find(item => item.name === name);
const cosmos = byName('Cosmos Connect');
const labor = byName('Labor & Trace');
const closed = byName('Portal de Proveedores');

const home = options({ type: 'home' });
assert.equal(home.length, 5);
assert.ok(home.some(x => x.label === 'Hitos logrados esta semana'));
assert.ok(home.some(x => x.page.type === 'project-groups'));
assert.ok(!home.some(x => /PM|escribir/i.test(x.label)), 'No debe existir una ruta por PM ni redacción libre');
assert.ok(!html.includes('id="chat-input"'), 'La caja de texto debe desaparecer');

const groups = options({ type: 'project-groups' });
assert.equal(groups.length, 3);
assert.equal(groups.reduce((sum, x) => sum + Number(x.label.match(/\d+$/)?.[0] || 0), 0), D.items.length);
assert.ok(options({ type: 'project-list', status: 'En Proceso' }).some(x => x.page.id === cosmos.id));
assert.ok(options({ type: 'project-list', status: 'Cerrado' }).some(x => x.page.id === closed.id));

const cosmosTopics = options({ type: 'project', id: cosmos.id }).map(x => x.page.topic);
assert.ok(cosmosTopics.includes('project-status'));
assert.ok(cosmosTopics.includes('project-risk'));
assert.ok(cosmosTopics.includes('project-update'));
assert.ok(!cosmosTopics.includes('project-closure'));
assert.ok(!cosmosTopics.includes('project-finances'), 'No ofrecer finanzas vacías');
assert.ok(options({ type: 'project', id: closed.id }).some(x => x.page.topic === 'project-closure'));
assert.ok(options({ type: 'project', id: labor.id }).some(x => x.page.topic === 'project-action'));

const status = guide.answer({ type: 'answer', topic: 'project-status', id: cosmos.id });
assert.match(status.text, /En Proceso/);
assert.match(status.text, /65%/);
assert.equal(status.module, 'portafolio');
assert.equal(status.filters.search, cosmos.name);

const risk = guide.answer({ type: 'answer', topic: 'project-risk', id: cosmos.id });
assert.match(risk.text, /Bloqueo crítico/);
assert.equal(risk.module, 'atencion');
assert.equal(risk.filters.search, cosmos.name);

const action = guide.answer({ type: 'answer', topic: 'project-action', id: labor.id });
assert.match(action.text, /pendiente de firma/);
assert.equal(action.module, 'portafolio');

const update = guide.answer({ type: 'answer', topic: 'project-update', id: cosmos.id });
assert.equal(update.openProjectId, cosmos.id);
assert.ok(update.source.includes('bitácora'));

const hits = answer('weekly-hits');
assert.equal(hits.module, 'resumen');
assert.match(hits.text, /Addon de Reconociliaciones|Mejoras Facturación|Marcación Paita/);
assert.ok(!/PMO ejecutó|PMO entregó/i.test(hits.text), 'No atribuir trabajo sin evidencia');

const portfolio = answer('portfolio-status');
assert.match(portfolio.text, new RegExp(String(D.items.length) + ' proyectos'));
const blocks = answer('attention-blocks');
assert.match(blocks.text, /Cosmos Connect/);
assert.equal(blocks.module, 'atencion');
assert.equal(blocks.filters.issue, 'Bloqueos');

assert.ok(html.includes('function chatGoBack()'));
assert.ok(html.includes('function chatGoHome()'));
assert.ok(html.includes('function chatOpenModule(answer)'));
console.log('Cosmo guiado: rutas, respuestas, datos y enlaces verificados.');
