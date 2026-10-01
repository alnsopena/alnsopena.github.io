import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const loadFactory = name => {
  const source = fs.readFileSync(new URL('../portafolio-ejecutivo-it/assets/js/' + name, import.meta.url), 'utf8');
  const context = { module: { exports: {} } };
  vm.runInNewContext(source, context);
  return context.module.exports;
};
const createGuide = loadFactory('cosmo-guide.js');
const createKnowledge = loadFactory('cosmo-knowledge.js');
const html = fs.readFileSync(new URL('../portafolio-ejecutivo-it/index.html', import.meta.url), 'utf8');
const snapshot = html.match(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/);
assert.ok(snapshot, 'Debe existir un corte de monday');
const D = JSON.parse(snapshot[1]);
const start = html.indexOf("  'use strict';", snapshot.index);
const end = html.indexOf('  let cosmoGuide=', start);
assert.ok(start >= 0 && end > start, 'Deben existir las funciones base del portal');
const mainEnd = html.indexOf('  </script>', end);
assert.ok(mainEnd > end);
new vm.Script(html.slice(start, mainEnd));
const script = html.slice(start, end) + '\n globalThis.guideTest={C,val,num,fmtDate,fmtNum,renderFinanzas,renderAtencion,regularizationIssues,projectUpdateEntries,shortAnswer,weeklyMilestones,weeklyCard,weekStartLima,attentionReasons,closureInfo,closureLabel,closureSourceLabel,past};';
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
const withAction = D.items.find(item => h.val(item, h.C.action));
const closed = D.items.find(item => h.val(item, h.C.status) === 'Cerrado');
const financialProject = D.items.find(item => [h.C.capex, h.C.capexCommitted, h.C.capexExecuted, h.C.opexAnnual, h.C.budgetDeviation].some(id => h.num(item, id) !== null));
assert.ok(cosmos && withAction && closed && financialProject, 'El corte debe incluir proyectos para los casos funcionales');

const home = options({ type: 'home' });
assert.equal(home.length, 4);
assert.ok(home.some(x => x.label === 'Actualizaciones de esta semana'));
assert.ok(home.some(x => x.page.type === 'project-groups'));
assert.ok(!home.some(x => /PM|escribir/i.test(x.label)), 'No debe existir una ruta por PM ni redacción libre');
assert.ok(!html.includes('id="chat-input"'), 'La caja de texto debe desaparecer');

const groups = options({ type: 'project-groups' });
assert.ok(groups.length >= 1);
assert.equal(groups.reduce((sum, x) => sum + Number(x.label.match(/\d+$/)?.[0] || 0), 0), D.items.length);
assert.ok(options({ type: 'project-list', status: h.val(cosmos, h.C.status) }).some(x => x.page.id === cosmos.id));
assert.ok(options({ type: 'project-list', status: 'Cerrado' }).some(x => x.page.id === closed.id));

const cosmosTopics = options({ type: 'project', id: cosmos.id }).map(x => x.page.topic);
assert.ok(options({ type: 'project', id: cosmos.id }).some(x => x.label === 'Última actualización'));
assert.ok(cosmosTopics.includes('project-status'));
if (h.val(cosmos, h.C.risk) || h.val(cosmos, h.C.action)) assert.ok(cosmosTopics.includes('project-risk'));
assert.ok(cosmosTopics.includes('project-update'));
assert.equal(cosmosTopics.includes('project-closure'), h.val(cosmos, h.C.status) === 'Cerrado');
assert.ok(cosmosTopics.includes('project-finances'));
assert.ok(options({ type: 'project', id: closed.id }).some(x => x.page.topic === 'project-closure'));
assert.ok(options({ type: 'project', id: withAction.id }).some(x => x.page.topic === 'project-action'));

const status = guide.answer({ type: 'answer', topic: 'project-status', id: cosmos.id });
assert.ok(status.text.includes(h.val(cosmos, h.C.status)));
assert.ok(status.text.includes(h.num(cosmos, h.C.progress) + '%'));
assert.equal(status.module, 'portafolio');
assert.equal(status.filters.search, cosmos.name);

const risk = guide.answer({ type: 'answer', topic: 'project-risk', id: cosmos.id });
assert.match(risk.text, /Riesgo \/ bloqueo/);
assert.equal(risk.module, h.attentionReasons(cosmos).length ? 'atencion' : 'portafolio');
assert.equal(risk.filters.search, cosmos.name);

const action = guide.answer({ type: 'answer', topic: 'project-action', id: withAction.id });
assert.match(action.text, /Acción o decisión requerida/);
assert.equal(action.module, h.attentionReasons(withAction).length ? 'atencion' : 'portafolio');
assert.equal(action.filters.search, withAction.name);

const closure = guide.answer({ type: 'answer', topic: 'project-closure', id: closed.id });
assert.equal(closure.module, 'portafolio');
assert.equal(closure.openProjectId, closed.id);

const update = guide.answer({ type: 'answer', topic: 'project-update', id: cosmos.id });
assert.equal(update.openProjectId, cosmos.id);
assert.ok(update.source.includes('bitácora'));
assert.ok(update.text.includes(h.projectUpdateEntries(cosmos)[0].text.slice(0, 12)) || update.text.includes('Registro del'));

const hits = answer('weekly-hits');
assert.equal(hits.module, 'resumen');
assert.ok(hits.text.length > 0);
assert.ok(!/PMO ejecutó|PMO entregó/i.test(hits.text), 'No atribuir trabajo sin evidencia');

const portfolio = answer('portfolio-status');
assert.match(portfolio.text, new RegExp(String(D.items.length) + ' proyectos'));
const blocks = answer('attention-blocks');
assert.equal(blocks.module, 'atencion');
assert.equal(blocks.filters.issue, 'Bloqueos');

const finance = h.renderFinanzas();
assert.match(finance, /Moneda pendiente de identificar/);
assert.doesNotMatch(finance, /Beneficios proyectados|\$\s*\d|USD\s*\d/);
assert.doesNotMatch(h.renderAtencion(), /<span>Responsable<\/span>/);
assert.ok(D.items.every(item => h.regularizationIssues(item).every(issue => !/Beneficios proyectados|Responsable acción/.test(issue.field))));
const guidedFinance = guide.answer({ type: 'answer', topic: 'project-finances', id: financialProject.id });
assert.match(guidedFinance.text, /Moneda no identificada/);
assert.doesNotMatch(guidedFinance.text, /Beneficios proyectados|\$\s*\d|USD\s*\d/);
const knowledge = createKnowledge(D, h.C, h);
const freeFinance = knowledge.projectAnswer(financialProject, 'cuanto cuesta');
assert.match(freeFinance.text, /Moneda no identificada/);
assert.doesNotMatch(freeFinance.text, /Beneficios proyectados|\$\s*\d|USD\s*\d/);
assert.match(knowledge.projectAnswer(financialProject, 'beneficios').text, /no ofrece una cifra verificable/);

const avSource = fs.readFileSync(new URL('../portafolio-ejecutivo-it/assets/js/pmo-av.js', import.meta.url), 'utf8');
const avStart = avSource.indexOf('  const g = '), avEnd = avSource.indexOf('  // ------------------------------------------------------------------ estilos', avStart);
assert.ok(avStart >= 0 && avEnd > avStart);
const avContext = vm.createContext({ window: {}, PMOData: { build: () => ({ cut: vm.runInContext('D.extracted_at_utc', avContext) }) } });
vm.runInContext('let D={extracted_at_utc:"corte-1"};\n' + avSource.slice(avStart, avEnd) + '\nglobalThis.read=getData;globalThis.setCut=x=>D={extracted_at_utc:x};', avContext);
assert.equal(avContext.read().cut, 'corte-1');
avContext.setCut('corte-2');
assert.equal(avContext.read().cut, 'corte-2', 'El resumen audiovisual debe usar el nuevo corte después de Actualizar datos');

assert.ok(html.includes('function chatGoBack()'));
assert.ok(html.includes('function chatGoHome()'));
assert.ok(html.includes('function chatOpenModule(answer)'));
const fixtureProject = { id: 'fixture-1', name: 'Proyecto prueba', subitems: [{ id: 'fixture-sub' }], column_values: {} };
const fixtureOld = { id: 'fixture-2', name: 'Proyecto sin comentario semanal', subitems: [], column_values: {} };
context.syntheticCut = {
  ...D, extracted_at_utc: '2026-10-01T12:00:00Z', items: [fixtureProject, fixtureOld], updates: [
    { item_id: 'fixture-1', created_at: '2026-09-28T05:00:00Z', text_body: 'Se aprobó un hito.', creator: { name: 'PM' }, replies: [{ created_at: '2026-10-01T11:00:00Z', text_body: 'Queda pendiente una validación.', creator: { name: 'Equipo' } }] },
    { item_id: 'fixture-sub', created_at: '2026-09-30T10:00:00Z', text_body: 'Se completó un despliegue.', creator: { name: 'PM' }, replies: [] },
    { item_id: 'fixture-2', created_at: '2026-09-28T04:59:00Z', text_body: 'Comentario anterior a esta semana.', creator: { name: 'PM' }, replies: [] },
  ]
};
vm.runInNewContext('D=syntheticCut', context);
const weekly = h.weeklyMilestones(context.syntheticCut.items);
assert.equal(weekly.length, 1, 'Una entrada por proyecto y solo desde el lunes de Lima');
assert.equal(weekly[0].text, 'Queda pendiente una validación.', 'Debe prevalecer el comentario más reciente, aunque no sea un logro');
assert.equal(weekly[0].author, 'Equipo', 'También cuentan las respuestas de la bitácora');
assert.match(h.weeklyCard(context.syntheticCut.items), /Actualizaciones de esta semana/);
console.log('Cosmo guiado y finanzas: rutas, campos vigentes, importes sin moneda supuesta y enlaces verificados.');
