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
const financeModel = loadFactory('finance-model.js');
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
const script = html.slice(start, end) + '\n globalThis.guideTest={initiativeClass,initiativeItems,scopedSnapshot,setInitiativeScope,initiativeSelector,renderResumen,openProject,C,val,num,auditSummary,auditGroupMatch,setAuditFilter,projectAuditMarkup,boardAuditIssues,milestoneValue,fieldValue,portfolioBaseItems,filtered,setPortfolioScope,portfolioScopeBar,riskInfo,riskDetails,hasReportedRisk,filteredAttentionItems,clearFilters,goFiltered,progressInfo,progressPercent,progressDelta,progressSummary,portTable,renderCronograma,fmtDate,fmtNum,financeInfo,financeMoney,go,nav,render,refreshMondayData,financeAmountChart,financeExecutionChart,financeExcessChart,renderFinanzas,renderAtencion,regularizationIssues,projectUpdateEntries,shortAnswer,weeklyMilestones,weeklyCard,weekStartLima,cutIsStale,attentionReasons,closureInfo,closureLabel,closureSourceLabel,past};';
const context = {
  document: { getElementById: id => id === 'snapshot' ? { textContent: snapshot[1] } : null },
  localStorage: { getItem: () => null, setItem: () => {} },
  location: { search: '', pathname: '/', hash: '' },
  URLSearchParams, Intl, Date, Set, Map, Number, String, Object, Array,
  PMOFinance: financeModel,
};
vm.runInNewContext(script, context);
const h = context.guideTest;

// Comparison uses the two reported percentages, not phase or schedule dates.
const progressItem = (real, planned) => ({id:'comparison',name:'Comparison',column_values:{[h.C.progress]:real,[h.C.progressPlan]:planned,[h.C.plan]:'2099-12-31'}});
for (const [real, planned, delta] of [[65,100,-35],[70,60,10],[0,0,0],[0,40,-40],[100,100,0],[35.5,40,-4.5],[null,40,null],[65,null,null],['',40,null],['abc',40,null],[-1,40,null],[65,101,null]]) {
  const item=progressItem(real,planned),result=h.progressInfo(item),markup=h.progressSummary(item);
  assert.equal(result.delta,delta,`Comparison ${real}/${planned}`);
  assert.doesNotMatch(markup,/NaN|Infinity|undefined/);
  if(delta===null) assert.match(markup,/Diferencia: Sin dato/);
}
assert.equal(h.C.plan,'date_mkzrb4nr');
assert.equal(h.progressPercent(0),'0%');
assert.equal(h.progressDelta(-35),'−35 p.p.');
assert.equal(h.progressDelta(10),'+10 p.p.');
assert.equal(h.progressDelta(0),'0 p.p.');
const comparisonTable=h.portTable([progressItem(65,100)]);
assert.equal((comparisonTable.match(/−35 p.p./g)||[]).length,2,'Desktop and mobile must show the same difference');

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
assert.match(finance, /Moneda por confirmar/);
for (const title of ['Presupuesto CAPEX original', 'CAPEX registrado', 'OPEX anual previsto', 'Exceso CAPEX registrado']) assert.ok(finance.includes(title));
assert.doesNotMatch(finance, /Campos financieros con dato|Importes registrados por proyecto|<table/);
assert.doesNotMatch(finance, /Beneficios proyectados|\$\s*\d|USD\s*\d/);
assert.doesNotMatch(h.renderAtencion(), /<span>Responsable<\/span>/);
assert.ok(D.items.every(item => h.regularizationIssues(item).every(issue => !/Beneficios proyectados|Responsable acción/.test(issue.field))));
const guidedFinance = guide.answer({ type: 'answer', topic: 'project-finances', id: financialProject.id });
assert.match(guidedFinance.text, /Moneda por confirmar/);
assert.doesNotMatch(guidedFinance.text, /Beneficios proyectados|\$\s*\d|USD\s*\d/);
const knowledge = createKnowledge(D, h.C, h);
const freeFinance = knowledge.projectAnswer(financialProject, 'cuanto cuesta');
assert.match(freeFinance.text, /Moneda por confirmar/);
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
const artSource = fs.readFileSync(new URL('../portafolio-ejecutivo-it/assets/js/pmo-art.js', import.meta.url), 'utf8');
const artStart = artSource.indexOf('  const g = '), artEnd = artSource.indexOf('  const plural = ', artStart);
assert.ok(artStart >= 0 && artEnd > artStart);
const artContext = vm.createContext({ window: {}, PMOData: { build: () => ({ cut: vm.runInContext('D.extracted_at_utc', artContext) }) } });
vm.runInContext('let D={extracted_at_utc:"corte-1"};\n' + artSource.slice(artStart, artEnd) + '\nglobalThis.read=getData;globalThis.setCut=x=>D={extracted_at_utc:x};', artContext);
assert.equal(artContext.read().cut, 'corte-1');
artContext.setCut('corte-2');
assert.equal(artContext.read().cut, 'corte-2', 'Las escenas de Riesgos, Portafolio y Cronograma deben usar el nuevo corte');
for(const cachedContext of [avContext,artContext]){
  const prior=cachedContext.read();
  vm.runInContext('let state={initiativeScope:"quick-wins"}',cachedContext);
  assert.notEqual(cachedContext.read(),prior,'Cambiar la clase de iniciativa debe invalidar la caché audiovisual');
}

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
assert.equal(h.cutIsStale('2026-10-14T12:00:00Z', Date.parse('2026-10-14T13:00:00Z')), false);
assert.equal(h.cutIsStale('2026-10-13T11:47:50Z', Date.parse('2026-10-14T13:00:00Z')), true, 'Un corte antiguo no debe anunciar Datos al día');
assert.equal(h.cutIsStale('invalid', Date.now()), true);

// The same rules must work across currencies, confirmed zeros and missing amounts.
context.originalFinanceSnapshot = structuredClone(D);
context.mixedFinanceSnapshot = structuredClone(D);
for (const [id, title] of [[h.C.currency, 'Moneda'], [h.C.taxBasis, 'IGV en importes']]) {
  context.mixedFinanceSnapshot.board.columns.push({ id, title, type: 'status' });
}
const financialFixture = (id, name, values) => ({ id, name, column_values: {
  [h.C.status]: 'En Proceso', [h.C.pm]: 'Alonso Pena', ...values,
} });
context.mixedFinanceSnapshot.items = [
  financialFixture('usd', 'Proyecto USD', { [h.C.capex]: '500', [h.C.capexExecuted]: '400', [h.C.capexCommitted]: '200', [h.C.opexAnnual]: '0', [h.C.currency]: 'USD', [h.C.taxBasis]: 'Sin IGV' }),
  financialFixture('pen', 'Proyecto PEN', { [h.C.capex]: '500', [h.C.capexExecuted]: '100', [h.C.capexCommitted]: '200', [h.C.opexAnnual]: '0', [h.C.currency]: 'PEN', [h.C.taxBasis]: 'Con IGV' }),
  financialFixture('zero', 'Cero confirmado', { [h.C.capex]: '500', [h.C.capexExecuted]: '0', [h.C.capexCommitted]: '0', [h.C.opexAnnual]: '0' }),
  financialFixture('missing', 'Pendiente de completar', { [h.C.capex]: '200', [h.C.currency]: 'USD' }),
];
vm.runInNewContext('D=mixedFinanceSnapshot;state.financeCurrency="";', context);
const mixed = h.renderFinanzas();
assert.match(mixed, /US\$ 500/);
assert.match(mixed, /S\/ 500/);
assert.doesNotMatch(mixed, /US\$ 1,000|S\/ 1,000/, 'Never aggregate USD and PEN');
assert.equal(h.financeInfo(context.mixedFinanceSnapshot.items[2]).registered, 0);
assert.equal(h.financeInfo(context.mixedFinanceSnapshot.items[3]).registered, null);
assert.ok(h.regularizationIssues(context.mixedFinanceSnapshot.items[2]).some(issue => /moneda/.test(issue.field)));
assert.ok(h.regularizationIssues(context.mixedFinanceSnapshot.items[2]).some(issue => /IGV/.test(issue.field)));
assert.ok(!h.regularizationIssues(context.mixedFinanceSnapshot.items[2]).some(issue => /CAPEX pagado|CAPEX pendiente/.test(issue.field)), 'Confirmed zero is not missing');
const noExpense = financialFixture('internal', 'Sin gasto confirmado', { [h.C.capex]: '0', [h.C.capexExecuted]: '0', [h.C.capexCommitted]: '0', [h.C.opexAnnual]: '0' });
assert.ok(!h.regularizationIssues(noExpense).some(issue => issue.category === 'Finanzas'), 'All confirmed zeros must not require currency or tax work with no amounts');
vm.runInNewContext('state.financeCurrency="PEN";', context);
assert.match(h.renderFinanzas(), /S\/ 500/);
assert.doesNotMatch(h.renderFinanzas(), /US\$/);
vm.runInNewContext('D=originalFinanceSnapshot;state.financeCurrency="";', context);

// Exercise the actual manual refresh, then render each module from its new cut.
// This also checks that an open project sheet and Cosmo use the same replacement.
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, classList: { add() {}, remove() {} }, setAttribute() {}, focus() {}, close() { this.open = false; } });
  return elements.get(id);
};
context.document = { getElementById: element, querySelector: () => element('scope') };
context.window = { location: { href: 'https://alnsopena.github.io/portafolio-ejecutivo-it/?view=finanzas' }, dispatchEvent() {} };
context.URL = URL;
context.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
context.innerWidth = 390;
context.createCosmoGuide = createGuide;
context.chatPath = [{ type: 'home' }];
context.cosmoGuide = null;
context.baseSnapshot = structuredClone(D);
const latest = structuredClone(D);
latest.extracted_at_utc = new Date().toISOString();
const latestConnect = latest.items.find(item => item.id === cosmos.id);
Object.assign(latestConnect.column_values, {
  [h.C.capex]: '999999', [h.C.capexExecuted]: '12345', [h.C.capexCommitted]: '54321',
  [h.C.opexAnnual]: '34567', [h.C.budgetDeviation]: '9876', [h.C.progress]: '97', [h.C.progressPlan]: '100',
  [h.C.currency]: 'USD', [h.C.taxBasis]: 'Sin IGV',
  [h.C.risk]: 'Riesgo / Alerta', [h.C.action]: 'Decisión renovada para comité',
  [h.C.phase]: 'Ejecución', [h.C.plan]: '2099-12-31',
});
latest.updates.unshift({ id: 'refresh-test', item_id: cosmos.id, text_body: 'Comentario nuevo del corte actualizado.', created_at: latest.extracted_at_utc, creator: { name: 'Pierre Lozano' }, replies: [] });
context.fetch = async url => String(url).includes('ppt-config.json') ? { ok: false } : { ok: true, text: async () => '<script type="application/json" id="snapshot">' + JSON.stringify(latest) + '</script>' };
context.DOMParser = class { parseFromString() { return { getElementById: () => ({ textContent: JSON.stringify(latest) }) }; } };
element('project-dialog').open = true;
element('project-dialog').dataset.projectId = cosmos.id;
vm.runInNewContext('D=baseSnapshot;state={...state,view:"finanzas",search:"",status:"",priority:"",pm:"",phase:"",schedule:"",issue:""}', context);
await h.refreshMondayData();
assert.ok(element('main').innerHTML.includes(h.fmtNum(999999)), 'The visible finance charts must use the new amount');
assert.ok(element('main').innerHTML.includes('US$ ' + h.fmtNum(66666)), 'Registered CAPEX is recomputed from the new paid and outstanding inputs');
assert.doesNotMatch(element('main').innerHTML, /9,876/, 'The view must not trust an inconsistent formula or historical manual deviation');
assert.ok(element('dialog-content').innerHTML.includes('97%') && element('dialog-content').innerHTML.includes(h.fmtNum(999999)), 'The open project sheet must update as well');
assert.ok(context.cosmoGuide.answer({ type: 'answer', topic: 'project-finances', id: cosmos.id }).text.includes(h.fmtNum(999999)), 'Cosmo must answer from the new cut');
assert.equal(h.projectUpdateEntries(latestConnect)[0].text, 'Comentario nuevo del corte actualizado.');
assert.equal(element('refresh-data-button').disabled, false);
assert.equal(element('refresh-data-button').dataset.state, 'success');
assert.equal(element('secondary-nav').hidden, true);
assert.equal(element('ppt-mobile-entry').hidden, false);
assert.equal(element('pmo-mobile-entry').hidden, true);
assert.ok(element('nav').innerHTML.includes('PPT semanal'));

assert.match(element('dialog-content').innerHTML,/−3 p.p./);
assert.match(context.cosmoGuide.answer({type:'answer',topic:'project-status',id:cosmos.id}).text,/Avance planificado: 100%/);
assert.match(context.cosmoGuide.answer({type:'answer',topic:'project-status',id:cosmos.id}).text,/−3 p.p./);

const dataSource = fs.readFileSync(new URL('../portafolio-ejecutivo-it/assets/js/pmo-data.js', import.meta.url), 'utf8');
vm.runInNewContext(dataSource, context);
const audiovisual = context.window.PMOData.build();
assert.equal(audiovisual.cut, latest.extracted_at_utc);
assert.equal(audiovisual.projects.find(p => p.id === cosmos.id).progressPlan,100);
assert.equal(audiovisual.projects.find(p => p.id === cosmos.id).progressDelta,-3);
assert.equal(audiovisual.projects.find(p => p.id === cosmos.id).financials.capex, 999999, 'Mi muelle and the visual adapters must receive the new project values');
assert.ok(audiovisual.milestones.some(m => m.projectId === cosmos.id && m.text.includes('Comentario nuevo')));

h.go('resumen');
assert.ok(element('main').innerHTML.includes('Comentario nuevo del corte actualizado.'));
h.go('atencion');
assert.ok(element('main').innerHTML.includes('Decisión renovada para comité'));
h.go('portafolio');
assert.ok(element('port-body').innerHTML.includes('97%'));
assert.match(element('port-body').innerHTML,/−3 p.p./);
h.go('cronograma');
assert.match(element('main').innerHTML,/−3 p.p./);
assert.ok(element('main').innerHTML.includes(h.fmtDate('2099-12-31')));
h.go('ppt');
assert.ok(element('main').innerHTML.includes('PPT semanal'), 'PPT must be accessible without unlocking regularization');
h.go('regularizacion');
assert.ok(element('main').innerHTML.includes('PPT semanal'), 'Regularization must remain locked');

const emptyExecution = h.financeExecutionChart([{ id: 'zero', name: 'No baseline', column_values: { [h.C.capex]: '0', [h.C.capexExecuted]: '0' } }]);
assert.doesNotMatch(emptyExecution, /NaN|Infinity/);
assert.match(emptyExecution, /Falta confirmar CAPEX pagado o pendiente/);
// Risk workflow: do not infer mitigation ownership from the PM, or require it for closed/no-risk projects.
context.riskCut = structuredClone(latest);
for (const [id,title,type] of [[h.C.riskType,'Tipo de riesgo','status'],[h.C.mitigationOwner,'Responsable de mitigación','people']]) {
  context.riskCut.board.columns.push({id,title,type});
}
const riskFixture=(id,values)=>({id,name:'Riesgo '+id,updated_at:latest.extracted_at_utc,subitems:[],column_values:{[h.C.status]:'En Proceso',[h.C.risk]:'Riesgo / Alerta',[h.C.pm]:'Alonso Pena',[h.C.plan]:'2099-12-31',...values}});
context.riskCut.items=[
  riskFixture('operativo',{[h.C.riskType]:'Operativo',[h.C.mitigationOwner]:'Juan Pablo Arbulú',[h.C.situation]:'Servicio interrumpido',[h.C.action]:'Restaurar el servicio'}),
  riskFixture('gestion',{[h.C.riskType]:'Gestión',[h.C.mitigationOwner]:'Valeria Hermoza',[h.C.risk]:'Bloqueo crítico',[h.C.action]:'Obtener aprobación'}),
  riskFixture('pendiente',{}),
  riskFixture('plazo',{[h.C.risk]:'Sin bloqueo',[h.C.plan]:'2020-01-01'}),
  riskFixture('cerrado',{[h.C.status]:'Cerrado'}),
];
vm.runInNewContext('D=riskCut;state={...state,view:"atencion",riskType:"",mitigationOwner:"",pm:"",priority:"",search:"",issue:""}',context);
const riskIds=()=>Array.from(h.filteredAttentionItems(),i=>i.id);
assert.equal(riskIds().length,4);
const pending=context.riskCut.items[2],dueOnly=context.riskCut.items[3];
assert.equal(h.riskInfo(pending).owner,null,'The PM is not a fallback mitigation owner');
assert.match(h.riskDetails(pending),/Pendiente de clasificar/);
assert.match(h.riskDetails(pending),/Sin responsable/);
for(const field of ['Tipo de riesgo','Responsable de mitigación','Acción / decisión']) {
  assert.ok(h.regularizationIssues(pending).some(x=>x.field===field&&x.critical));
  assert.ok(!h.regularizationIssues(dueOnly).some(x=>x.field===field));
  assert.ok(!h.regularizationIssues(context.riskCut.items[4]).some(x=>x.field===field));
}
assert.ok(!h.regularizationIssues(context.riskCut.items[0]).some(x=>['Tipo de riesgo','Responsable de mitigación','Acción / decisión'].includes(x.field)));
const riskGuide=createGuide(context.riskCut,h.C,h);
const riskAnswer=riskGuide.answer({type:'answer',topic:'project-risk',id:'operativo'});
assert.match(riskAnswer.text,/Tipo de riesgo: Operativo/);
assert.match(riskAnswer.text,/Responsable de mitigación: Juan Pablo Arbulú/);
assert.match(riskAnswer.text,/Servicio interrumpido/);
assert.match(riskGuide.answer({type:'answer',topic:'project-risk',id:'pendiente'}).text,/Sin responsable/);
vm.runInNewContext('state.riskType="Operativo"',context);
assert.deepEqual(riskIds(),['operativo']);
vm.runInNewContext('state.mitigationOwner="Valeria Hermoza"',context);
assert.deepEqual(riskIds(),[],'Type and owner filters intersect');
vm.runInNewContext('state.riskType="Gestión"',context);
assert.deepEqual(riskIds(),['gestion']);
vm.runInNewContext('state.riskType="Pendiente de clasificar";state.mitigationOwner="Sin responsable"',context);
assert.deepEqual(riskIds(),['pendiente'],'Overdue without a risk and closed projects are excluded from missing-risk filters');
const viewItemsStart=artSource.indexOf('  function viewItems(view)'),viewItemsEnd=artSource.indexOf('  const toProjects',viewItemsStart);
vm.runInNewContext('const g=name=>eval(name);'+artSource.slice(viewItemsStart,viewItemsEnd)+';globalThis.artFiltered=viewItems;',context);
assert.deepEqual(Array.from(context.artFiltered('atencion'),i=>i.id),riskIds(),'Diagram and cards share the same risk filters');
h.clearFilters();
assert.equal(riskIds().length,4);
h.goFiltered('atencion',{riskType:'Operativo'});
assert.deepEqual(riskIds(),['operativo']);
h.goFiltered('atencion',{mitigationOwner:'Valeria Hermoza'});
assert.deepEqual(riskIds(),['gestion'],'Navigation resets a previous risk type filter');
const escaped=h.riskDetails(riskFixture('xss',{[h.C.situation]:'<img src=x onerror=alert(1)>',[h.C.mitigationOwner]:'<b>owner</b>'}));
assert.doesNotMatch(escaped,/<img|<b>/);
assert.match(escaped,/&lt;img/);
// Refresh updates the open sheet, Cosmo and adapters without reload.
const riskLatest=structuredClone(context.riskCut);
riskLatest.extracted_at_utc=new Date(Date.now()+1000).toISOString();
riskLatest.items[0].column_values[h.C.riskType]='Gestión';
riskLatest.items[0].column_values[h.C.mitigationOwner]='Walter Gonzales';
context.DOMParser=class{parseFromString(){return{getElementById:()=>({textContent:JSON.stringify(riskLatest)})}}};
element('project-dialog').open=true;element('project-dialog').dataset.projectId='operativo';
await h.refreshMondayData();
assert.match(element('dialog-content').innerHTML,/Walter Gonzales/);
assert.match(context.cosmoGuide.answer({type:'answer',topic:'project-risk',id:'operativo'}).text,/Tipo de riesgo: Gestión/);
const updatedRiskData=context.window.PMOData.build();
assert.equal(updatedRiskData.projects.find(p=>p.id==='operativo').mitigationOwner,'Walter Gonzales');
assert.equal(updatedRiskData.decisions.find(p=>p.projectId==='operativo').owner,'Walter Gonzales');
// Pending progress is audited only for active projects, and zero remains a valid value.
context.auditCut=structuredClone(riskLatest);
if(!context.auditCut.board.columns.some(c=>c.id===h.C.progressPlan))context.auditCut.board.columns.push({id:h.C.progressPlan,title:'% Avance Plan',type:'numbers'});
vm.runInNewContext('D=auditCut',context);
const auditItem=(real,plan,status='En Proceso')=>({id:'audit',name:'Audit',column_values:{[h.C.status]:status,[h.C.progress]:real,[h.C.progressPlan]:plan}});
const progressIssues=item=>h.regularizationIssues(item).filter(x=>/Avance Real|Avance Plan/.test(x.field));
assert.equal(progressIssues(auditItem(0,0)).length,0);
assert.equal(progressIssues(auditItem(100,100)).length,0);
assert.deepEqual(Array.from(progressIssues(auditItem(null,'')),x=>x.field),['% Avance Real','% Avance Plan']);
for(const invalid of [-1,101,'abc','Infinity']) {
  const issues=progressIssues(auditItem(invalid,invalid));
  assert.equal(issues.length,2);assert.ok(issues.every(x=>x.critical&&x.field.includes('0–100')));
}
assert.equal(progressIssues(auditItem(null,null,'Cerrado')).length,0);
// Quick scopes share the portfolio data pipeline with table, chart and mobile cards.
context.scopeCut=structuredClone(context.auditCut);
context.scopeCut.items=[
 {id:'active',name:'Proyecto A',column_values:{[h.C.status]:'En Proceso',[h.C.pm]:'Alonso Pena'}},
 {id:'planned',name:'Proyecto B',column_values:{[h.C.status]:'Planificado',[h.C.pm]:'Alonso Pena'}},
 {id:'closed',name:'Proyecto C',column_values:{[h.C.status]:'Cerrado',[h.C.pm]:'Alonso Pena'}},
];
vm.runInNewContext('D=scopeCut;state={...state,view:"portafolio",status:"",priority:"",pm:"",search:"",portfolioScope:"all"}',context);
const portfolioIds=()=>Array.from(h.filtered(),i=>i.id);
assert.deepEqual(portfolioIds(),['active','planned','closed']);
h.setPortfolioScope('active');assert.deepEqual(portfolioIds(),['active','planned']);
assert.deepEqual(Array.from(context.artFiltered('portafolio'),i=>i.id),portfolioIds());
h.setPortfolioScope('closed');assert.deepEqual(portfolioIds(),['closed']);
assert.match(h.portfolioScopeBar(),/aria-pressed="true"[^>]*>Cerrados/);
vm.runInNewContext('state.search="Proyecto C";state.pm="Alonso Pena"',context);
h.setPortfolioScope('active');assert.equal(portfolioIds().length,0,'Search and PM are preserved');
h.clearFilters();assert.equal(portfolioIds().length,3);
h.setPortfolioScope('active');h.goFiltered('portafolio',{status:'Cerrado'});
assert.deepEqual(portfolioIds(),['closed'],'Navigation from a closed-project KPI resets the active scope');
// Audit checks diagnose source data without changing project status, dates or owners.
context.qualityCut=structuredClone(riskLatest);
context.qualityCut.items=[
 riskFixture('risk-empty',{[h.C.situation]:null}),
 riskFixture('deleted-pm',{[h.C.pm]:'Miembro eliminado',[h.C.risk]:'Sin bloqueo'}),
 riskFixture('date-order',{[h.C.start]:'2026-10-20',[h.C.plan]:'2026-10-19',[h.C.real]:'2026-10-18',[h.C.risk]:'Sin bloqueo'}),
 riskFixture('invalid-date',{[h.C.start]:'2026-02-30',[h.C.risk]:'Sin bloqueo'}),
 riskFixture('valid',{[h.C.priority]:'High',[h.C.sponsor]:'Sponsor',[h.C.progress]:0,[h.C.progressPlan]:0,[h.C.risk]:'Sin bloqueo',[h.C.phase]:'Ejecución',[h.C.start]:'2026-10-01',[h.C.plan]:'2026-10-31',[h.C.capex]:0,[h.C.capexExecuted]:0,[h.C.capexCommitted]:0,[h.C.opexAnnual]:0}),
];
context.qualityCut.items.forEach(i=>{if(!(h.C.start in i.column_values))i.column_values[h.C.start]='2026-10-01'});
context.qualityCut.items[0].column_values[h.C.riskType]='Gestión';
vm.runInNewContext('D=qualityCut;state={...state,view:"portafolio",portfolioScope:"all",auditFilter:"",status:"",priority:"",pm:"",search:""}',context);
assert.ok(h.regularizationIssues(context.qualityCut.items[0]).some(x=>x.field==='Descripción del riesgo'));
assert.ok(h.regularizationIssues(context.qualityCut.items[1]).some(x=>x.field==='PM no vigente (miembro eliminado)'));
const dateIssues=h.regularizationIssues(context.qualityCut.items[2]);
assert.ok(dateIssues.some(x=>x.field==='Inicio posterior a Fin Plan'));
assert.ok(dateIssues.some(x=>x.field==='Fin Real anterior a Inicio'));
assert.ok(h.regularizationIssues(context.qualityCut.items[3]).some(x=>x.field==='Revisar fecha inválida: Inicio'));
assert.equal(h.regularizationIssues(context.qualityCut.items[4]).length,0);
const beforeQuality=JSON.stringify(context.qualityCut);
h.setAuditFilter('Con pendientes');
assert.deepEqual(portfolioIds(),['risk-empty','deleted-pm','date-order','invalid-date']);
assert.deepEqual(Array.from(context.artFiltered('portafolio'),i=>i.id),portfolioIds());
h.setAuditFilter('Fechas');
assert.deepEqual(portfolioIds(),['date-order','invalid-date']);
h.setAuditFilter('Responsables');
assert.deepEqual(portfolioIds(),['risk-empty','deleted-pm']);
const qualitySummary=h.auditSummary(context.qualityCut.items);
assert.equal(qualitySummary.find(x=>x.label==='Fechas').count,2,'Count projects, not the number of invalid date pairs');
assert.match(h.projectAuditMarkup(context.qualityCut.items[2]),/Inicio posterior a Fin Plan/);
assert.equal(JSON.stringify(context.qualityCut),beforeQuality,'Audit rendering cannot alter source data');
h.clearFilters();assert.equal(portfolioIds().length,5);
h.setAuditFilter('Riesgos');h.goFiltered('portafolio',{status:'Cerrado'});
assert.equal(vm.runInNewContext('state.auditFilter',context),'','KPI navigation resets the quality filter');
// Missing formula references are a board configuration issue, not thirty duplicated item issues.
context.milestoneCut=structuredClone(context.qualityCut);
context.milestoneCut.board.columns=context.milestoneCut.board.columns.filter(c=>![h.C.milestonesCommitted,h.C.milestonesOnTime,h.C.milestonesRate].includes(c.id));
context.milestoneCut.board.columns.push({id:h.C.milestonesRate,title:'% Hitos en fecha',type:'formula',settings:{formula:'ROUND(({'+h.C.milestonesOnTime+'}/{'+h.C.milestonesCommitted+'})*100,1)'}});
vm.runInNewContext('D=milestoneCut',context);
const milestoneItem={column_values:{[h.C.milestonesRate]:'0'}};
assert.equal(h.boardAuditIssues().length,1);
assert.equal(h.milestoneValue(milestoneItem),'No calculable','A broken formula must not be presented as zero');
assert.equal(h.fieldValue(milestoneItem,{id:h.C.milestonesRate,type:'formula'}),'No calculable');
context.milestoneCut.board.columns.push({id:h.C.milestonesCommitted,title:'Comprometidos',type:'numbers'},{id:h.C.milestonesOnTime,title:'Cumplidos',type:'numbers'});
assert.equal(h.boardAuditIssues().length,0);
assert.equal(h.milestoneValue(milestoneItem),'0%','Zero is valid when dependencies exist');
assert.equal(h.milestoneValue({column_values:{[h.C.milestonesRate]:''}}),'No calculable');
assert.equal(h.milestoneValue({column_values:{[h.C.milestonesRate]:'#ERROR'}}),'No calculable');
// Optional private fixture checks the current connected board without committing its data.
if(process.env.PMO_AUDIT_FIXTURE){
 const fixture=JSON.parse(fs.readFileSync(process.env.PMO_AUDIT_FIXTURE,'utf8').replace(/^\uFEFF/,''));
 context.connectedAuditCut={...D,board:fixture.board,items:fixture.items};
 vm.runInNewContext('D=connectedAuditCut;state={...state,view:"portafolio",portfolioScope:"all",auditFilter:"",status:"",priority:"",pm:"",search:""}',context);
 const snapshotBefore=JSON.stringify(context.connectedAuditCut);
 h.go('portafolio');
 assert.ok(element('main').innerHTML.includes('Datos por revisar en Monday'));
 assert.equal(h.boardAuditIssues().length,1);
 console.log('Auditoría del tablero actual:',JSON.stringify({projects:fixture.items.length,groups:Array.from(h.auditSummary(fixture.items)),schemaIssues:h.boardAuditIssues().length}));
 for(const group of ['Con pendientes',...['Avance','Riesgos','Responsables','Fechas','Cierre']]){h.setAuditFilter(group);assert.deepEqual(Array.from(context.artFiltered('portafolio'),i=>i.id),portfolioIds())}
 h.clearFilters();
 assert.equal(JSON.stringify(context.connectedAuditCut),snapshotBefore);
}
console.log('Portal: Finanzas estandarizadas, monedas separadas, PPT visible y actualización integral de módulos, ficha, Cosmo y datos audiovisuales verificados.');

// Initiative scope applies to KPIs, cards, diagrams and Cosmo without altering the cut.
context.initiativeCut=structuredClone(D);
context.initiativeCut.board.columns.push({id:h.C.initiativeClass,title:'Clase de iniciativa',type:'status'},{id:'qw-history-budget',title:'QW origen · Capex aprobado',type:'numbers'});
context.initiativeCut.items=[
 {id:'legacy-project',name:'Proyecto anterior',subitems:[],column_values:{[h.C.status]:'En Proceso',[h.C.progress]:'0'}},
 {id:'new-project',name:'Proyecto clasificado',subitems:[],column_values:{[h.C.initiativeClass]:'Proyecto',[h.C.status]:'Cerrado',[h.C.progress]:'100'}},
 {id:'quick-win',name:'Quick win migrado',subitems:[],column_values:{[h.C.initiativeClass]:'Quick win',[h.C.status]:'En Proceso',[h.C.progress]:'30','qw-history-budget':'99999'}},
];
context.initiativeCut.updates=[{item_id:'quick-win',text_body:'Se completó una entrega',created_at:context.initiativeCut.extracted_at_utc}];
vm.runInNewContext('D=initiativeCut;state={...state,view:"resumen",initiativeScope:"all",portfolioScope:"all",auditFilter:"",status:"",priority:"",pm:"",search:""}',context);
const initiativeBefore=JSON.stringify(context.initiativeCut);
assert.equal(h.initiativeItems().length,3);
assert.equal(h.val({column_values:{[h.C.pm]:{personsAndTeams:[]}}},h.C.pm),null,'An empty people object is missing, never [object Object]');
h.setInitiativeScope('quick-wins');
assert.deepEqual(Array.from(h.initiativeItems(),i=>i.id),['quick-win']);
assert.deepEqual(Array.from(context.window.PMOData.build().projects,i=>i.id),['quick-win']);
assert.equal(context.window.PMOData.build().milestones.length,1);
assert.deepEqual(portfolioIds(),['quick-win']);
assert.deepEqual(Array.from(context.artFiltered('portafolio'),i=>i.id),['quick-win']);
assert.match(h.renderResumen(),/Iniciativas activas/);
assert.doesNotMatch(h.renderFinanzas(),/99,999/,'Original QW amounts must not enter homologated finances');
assert.equal(context.cosmoGuide.options({type:'project-groups'}).reduce((sum,x)=>sum+Number(x.label.match(/\d+$/)?.[0]||0),0),1);
h.setPortfolioScope('closed');assert.equal(portfolioIds().length,0);
h.setInitiativeScope('projects');
assert.deepEqual(portfolioIds(),['legacy-project','new-project']);
assert.equal(context.window.PMOData.build().milestones.length,0,'QW activity must not leak into project-only summaries');
assert.equal(context.window.PMOData.build().totals.total,2);
assert.equal(context.cosmoGuide.options({type:'project-groups'}).reduce((sum,x)=>sum+Number(x.label.match(/\d+$/)?.[0]||0),0),2);
h.setInitiativeScope('all');assert.equal(portfolioIds().length,3);
assert.equal(JSON.stringify(context.initiativeCut),initiativeBefore);
if(process.env.PMO_AUDIT_FIXTURE){
 context.migratedCut={...D,...JSON.parse(fs.readFileSync(process.env.PMO_AUDIT_FIXTURE,'utf8').replace(/^\uFEFF/,''))};
 vm.runInNewContext('D=migratedCut;state.initiativeScope="all"',context);
 assert.equal(h.initiativeItems().length,52);
 h.setInitiativeScope('projects');assert.equal(h.initiativeItems().length,30);
 h.setInitiativeScope('quick-wins');assert.equal(h.initiativeItems().length,22);
 assert.equal(h.initiativeItems().filter(i=>h.val(i,h.C.status)==='Cerrado').length,13);
 assert.equal(context.window.PMOData.build().totals.total,22);
 h.openProject('12005154883',true);
 assert.match(element('dialog-content').innerHTML,/Datos originales de Quick Wins/);
 assert.match(element('dialog-content').innerHTML,/480/);
 assert.match(element('dialog-content').innerHTML,/No se suman a los indicadores financieros/);
 h.setInitiativeScope('all');
}
console.log('Quick wins: scope, audiovisual totals, Cosmo, preserved history and financial isolation verified.');
