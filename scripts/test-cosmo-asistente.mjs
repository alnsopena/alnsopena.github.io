// Cosmo sin IA: pregunta libre, "Qué cambió desde el lunes", alertas calculadas y globo proactivo positivo.
// Lo ejecuta scripts/test-cosmo.mjs (workflow de publicación), que le pasa el portal ya cargado.
import assert from 'node:assert/strict';
import vm from 'node:vm';

export async function run({ D: embedded, h, createGuide, createKnowledge, html, context }) {
  const C = h.C;
  const col = (values) => ({ [C.status]: 'En Proceso', [C.phase]: 'Ejecución', ...values });
  const item = (id, name, values) => ({ id, name, url: 'https://example.invalid/' + id, subitems: [], column_values: col(values) });
  const base = (id, name, values) => ({ id, name, column_values: col(values) });

  // A Tuesday cut with Monday's baseline. Dates are in Lima.
  const fixture = {
    ...structuredClone(embedded),
    extracted_at_utc: '2026-11-03T15:00:00Z',
    closure_history: {},
    items: [
      item('alfa', 'Proyecto Alfa', { [C.pm]: 'Ana Torres', [C.progress]: '30', [C.progressPlan]: '60', [C.plan]: '2026-11-06', [C.capex]: '1000' }),
      item('beta', 'Proyecto Beta', { [C.pm]: 'Ana Torres, Luis Rojas', [C.status]: 'Cerrado', [C.phase]: 'Cierre', [C.real]: '2026-11-02', [C.plan]: '2026-11-10' }),
      item('gamma', 'Proyecto Gamma', { [C.pm]: 'Luis Rojas', [C.status]: 'Propuesto', [C.phase]: 'Propuesta' }),
      item('delta', 'Implementación Wifi Fortinet', { [C.pm]: 'Ana Torres', [C.risk]: 'Bloqueo crítico', [C.plan]: '2026-12-15', [C.progress]: '50', [C.progressPlan]: '50' }),
    ],
    updates: [
      { item_id: 'alfa', created_at: '2026-11-03T13:00:00Z', text_body: 'Se aprobó el diseño.', creator: { name: 'Ana Torres' }, replies: [] },
      { item_id: 'delta', created_at: '2026-10-01T13:00:00Z', text_body: 'Arranque de la instalación.', creator: { name: 'Ana Torres' }, replies: [] },
      { item_id: 'beta', created_at: '2026-11-02T16:00:00Z', text_body: 'Pase a producción.', creator: { name: 'Luis Rojas' }, replies: [] },
    ],
    weekly_baseline: {
      extracted_at_utc: '2026-11-02T14:00:00Z',
      items: [
        base('alfa', 'Proyecto Alfa', { [C.pm]: 'Ana Torres', [C.phase]: 'Planificación', [C.risk]: 'Riesgo / Alerta', [C.plan]: '2026-10-30' }),
        base('beta', 'Proyecto Beta', { [C.pm]: 'Ana Torres, Luis Rojas', [C.plan]: '2026-11-10' }),
        base('delta', 'Implementación Wifi Fortinet', { [C.pm]: 'Ana Torres', [C.plan]: '2026-12-15' }),
      ],
    },
  };
  context.cosmoFixture = fixture;
  vm.runInNewContext('D=cosmoFixture;state.initiativeScope="all"', context);
  const guide = createGuide(fixture, C, h), knowledge = createKnowledge(fixture, C, h, guide);
  const ids = rows => Array.from(rows, x => String((x.item || x).id));

  // ---------------------------------------------------------------- Qué cambió desde el lunes
  const ch = guide.weeklyChanges();
  assert.deepEqual(ids(ch.closed), ['beta']);
  assert.deepEqual(ids(ch.added), ['gamma']);
  assert.deepEqual(ids(ch.phase), ['alfa']);
  assert.equal(ch.phase[0].advanced, true, 'Planificación → Ejecución es avanzar de fase');
  assert.deepEqual(ids(ch.riskResolved), ['alfa']);
  assert.deepEqual(ids(ch.riskNew), ['delta']);
  assert.deepEqual(ids(ch.planMoved), ['alfa']);
  const changes = guide.answer({ type: 'answer', topic: 'weekly-changes' });
  for (const section of ['Cerradas (1)', 'Nuevas en el tablero (1)', 'Cambio de fase (1)', 'Riesgos o bloqueos nuevos (1)', 'Riesgos o bloqueos resueltos (1)', 'Fin Plan movido (1)']) assert.ok(changes.text.includes(section), section);
  assert.equal(changes.module, 'portafolio');
  const unchanged = { ...fixture, weekly_baseline: { extracted_at_utc: fixture.weekly_baseline.extracted_at_utc, items: structuredClone(fixture.items) } };
  assert.match(createGuide(unchanged, C, h).answer({ type: 'answer', topic: 'weekly-changes' }).text, /^Sin cambios desde el /, 'Sin cambios se dice claro');
  assert.match(createGuide({ ...fixture, weekly_baseline: null }, C, h).answer({ type: 'answer', topic: 'weekly-changes' }).text, /no trae la línea base/);
  // Scope: a quick-wins only guide compares only quick wins.
  assert.equal(createGuide({ ...fixture, items: fixture.items.filter(i => i.id === 'gamma') }, C, h).weeklyChanges().total, 1);

  // ---------------------------------------------------------------- Alertas calculadas
  assert.deepEqual(ids(guide.alerts.stale()), ['delta'], 'Más de 14 días sin bitácora; las propuestas no cuentan');
  assert.deepEqual(ids(guide.alerts.soon()), ['alfa'], 'Fin Plan dentro de 7 días');
  assert.deepEqual(ids(guide.alerts.behind()), ['alfa'], 'Avance real 20 p.p. o más bajo el plan');
  assert.equal(guide.alerts.pmLoad()[0].pm, 'Ana Torres');
  assert.equal(guide.alerts.pmLoad()[0].total, 2);
  assert.match(guide.answer({ type: 'answer', topic: 'alerts-behind' }).text, /20 p\.p\. o más por debajo del planificado/, 'El umbral se dice en el texto');
  assert.match(guide.answer({ type: 'answer', topic: 'alerts-stale' }).text, /más de 14 días/);
  assert.equal(guide.answer({ type: 'answer', topic: 'alerts-soon' }).module, 'cronograma');
  const alertMenu = guide.options({ type: 'alerts' });
  assert.equal(alertMenu.length, 4);
  assert.match(alertMenu[0].label, /· 1$/);
  assert.equal(guide.title({ type: 'alerts' }), 'Alertas calculadas');
  // Same numbers as the portal's own rules.
  assert.ok(guide.alerts.behind().every(x => x.p.delta === h.progressInfo(x.item).delta));
  assert.ok(guide.alerts.stale().every(x => !h.tentativePlan(x.item) && h.active(x.item)));

  // ---------------------------------------------------------------- Globo proactivo positivo
  const hl = (view, opts) => guide.highlight(view, opts);
  assert.equal(hl('resumen'), '1 entregado en 2026 · 1 desde el lunes');
  assert.equal(hl('portafolio'), '1 avanzó de fase desde el lunes');
  assert.equal(hl('cronograma'), '1 entregado a tiempo este mes');
  assert.equal(hl('finanzas'), '1 iniciativa con Presupuesto CAPEX registrado');
  assert.equal(hl('atencion'), '1 riesgo resuelto desde el lunes');
  assert.equal(hl('muelle', { person: 'Ana Torres', ids: ['alfa', 'beta', 'delta'] }), 'Ana: 1 entregado en 2026');
  assert.equal(hl('muelle', {}), '', 'Sin persona elegida, Cosmo no dice nada');
  assert.equal(hl('ppt'), '2 proyectos con actualización esta semana');
  const negative = /vencid|sin PM|sin Fin Plan|requieren atención|bajo el plan|nuevos?\b|atrasad|falta/i;
  for (const view of ['resumen', 'portafolio', 'cronograma', 'finanzas', 'atencion', 'ppt']) assert.doesNotMatch(hl(view), negative, view);
  // Nothing positive and honest: nothing is said.
  const quiet = { ...fixture, weekly_baseline: null, updates: [], items: [item('q1', 'Proyecto Q', { [C.progress]: '10', [C.progressPlan]: '50', [C.risk]: 'Bloqueo crítico' })] };
  context.cosmoFixture = quiet; vm.runInNewContext('D=cosmoFixture', context);
  const quietGuide = createGuide(quiet, C, h);
  for (const view of ['resumen', 'portafolio', 'cronograma', 'finanzas', 'atencion', 'ppt', 'muelle']) assert.equal(quietGuide.highlight(view, { person: 'Ana Torres', ids: ['q1'] }), '', 'Sin dato positivo en ' + view);
  context.cosmoFixture = fixture; vm.runInNewContext('D=cosmoFixture', context);

  // ---------------------------------------------------------------- Pregunta libre
  const ask = (q, ctx = {}) => knowledge.ask(q, ctx);
  let r = ask('cómo va wifi fortinet');
  assert.equal(r.project.id, 'delta');
  assert.match(r.title, /estado y avance/);
  assert.equal(r.text, guide.answer({ type: 'answer', topic: 'project-status', id: 'delta' }).text, 'Mismo texto que el menú');
  assert.ok(r.module && r.filters.search === 'Implementación Wifi Fortinet');
  r = ask('qué vence esta semana');
  assert.match(r.text, /Proyecto Alfa/);
  assert.equal(r.module, 'cronograma');
  assert.doesNotMatch(r.text, /Gamma/, 'Las propuestas tienen Fin Plan tentativo');
  r = ask('riesgos de ana');
  assert.equal(r.module, 'atencion');
  assert.match(r.text, /Implementación Wifi Fortinet/);
  assert.doesNotMatch(r.text, /Proyecto Alfa/, 'El riesgo de Alfa se resolvió');
  r = ask('riesgos de luis');
  assert.match(r.text, /^No hay proyectos con riesgo o bloqueo de Luis Rojas/, 'Varios PM en una celda cuentan para cada uno');
  r = ask('qué cambió desde el lunes');
  assert.equal(r.title, 'Qué cambió desde el lunes');
  r = ask('qué cambió en alfa');
  assert.match(r.text, /Fase: Planificación → Ejecución/);
  r = ask('proyectos sin actualizar');
  assert.match(r.text, /Implementación Wifi Fortinet/);
  r = ask('quién tiene más proyectos');
  assert.match(r.text, /Ana Torres \(2\)/);
  r = ask('avance bajo el plan');
  assert.match(r.text, /Proyecto Alfa/);
  r = ask('alertas');
  assert.equal(r.suggest.length, 4);
  r = ask('bloqeos de fortinet');
  assert.equal(r.project.id, 'delta', 'Corrige errores de tipeo');
  assert.match(r.text, /Bloqueo crítico/);
  r = ask('cuanto cuesta alfa');
  assert.match(r.text, /Presupuesto CAPEX original/);
  assert.equal(r.module, 'finanzas');
  // Follow-up questions keep the project in context.
  const ctx = {};
  ask('cómo va alfa', ctx);
  assert.equal(ctx.project, 'alfa');
  r = ask('y quién es su PM', ctx);
  assert.match(r.text, /Ana Torres/);
  // Not understood: closest menu options, and the e-mail only when the question is about a project.
  r = ask('xyz qwerty', { project: 'alfa' });
  assert.equal(r.project, undefined, 'Una pregunta que no se entiende no se pega al proyecto anterior');
  assert.equal(r.understood, false);
  assert.ok(r.suggest.length >= 2 && r.suggest.every(s => s.label && s.page));
  assert.ok(!r.offerEmail);
  r = ask('cuál es el clima en alfa');
  assert.equal(r.project.id, 'alfa');
  assert.equal(r.understood, false);
  assert.equal(r.offerEmail, true);
  assert.equal(r.question, 'cuál es el clima en alfa', 'La consulta al responsable lleva la pregunta escrita');
  assert.ok(r.suggest.some(s => s.page.topic === 'project-status'));
  r = ask('cuántos entregados este año', { project: 'delta' });
  assert.match(r.text, /^1 entregado en 2026/);
  r = ask('riesgos de fecha');
  assert.ok(r.text);
  assert.equal(ask('   '), null);
  r = ask('mis proyectos');
  assert.match(r.text, /Mi muelle/);
  r = ask('mis proyectos', { myPm: 'Luis Rojas' });
  assert.match(r.text, /Proyecto Beta/);

  // Embedded cut: real project names, typos and the INACTIVE_PM label.
  context.cosmoEmbedded = embedded; vm.runInNewContext('D=cosmoEmbedded', context);
  const realGuide = createGuide(embedded, C, h), real = createKnowledge(embedded, C, h, realGuide);
  const connect = embedded.items.find(i => i.name === 'Cosmos Connect');
  assert.equal(real.ask('¿Qué risgos tiene conect?').project.id, connect.id);
  assert.equal(real.ask('¿Cómo va Connect?').project.id, connect.id);
  for (const q of ['qué vence esta semana', 'qué cambió desde el lunes', 'alertas', 'quién tiene más proyectos', 'cuantos cerrados hay', 'hola']) {
    const a = real.ask(q);
    assert.ok(a && a.title && a.text, q);
    assert.doesNotMatch(a.text, /undefined|NaN|\[object Object\]/, q);
  }
  for (const view of ['resumen', 'portafolio', 'cronograma', 'finanzas', 'atencion', 'ppt']) assert.doesNotMatch(realGuide.highlight(view), /undefined|NaN/, view);
  assert.ok(!real.findPm('proyectos de pm no vigente') || real.findPm('proyectos de pm no vigente') === h.inactivePm);

  // Portal wiring: free question box, suggestions and proactive bubble.
  assert.ok(html.includes('function chatAsk(event)'));
  assert.ok(html.includes("page.type==='ask'"), 'La pregunta libre se muestra con chatAnswerCard');
  assert.ok(html.includes('answer.suggest?.length'));
  assert.ok(html.includes('prepareProjectEmail(answer.project,answer.question||answer.title)'));
  console.log('Cosmo: pregunta libre, cambios desde el lunes, alertas calculadas y globo positivo verificados.');
}
