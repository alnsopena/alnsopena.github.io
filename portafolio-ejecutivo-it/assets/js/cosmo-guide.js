/* Menú ejecutivo de Cosmo. Todas las opciones y respuestas usan el corte de monday. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createCosmoGuide = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCosmoGuide(D, C, h) {
  const val = (item, key) => h.val(item, C[key]);
  const num = (item, key) => h.num(item, C[key]);
  const active = item => val(item, 'status') !== 'Cerrado';
  const project = id => D.items.find(item => String(item.id) === String(id));
  const compact = (rows, format, limit = 6) => rows.slice(0, limit).map(item => '• ' + format(item)).join('\n') + (rows.length > limit ? '\n• y ' + (rows.length - limit) + ' más en el módulo.' : '');
  const option = (label, page, extra) => ({ label, page, ...extra });
  const reply = (title, text, module, filters = {}, extra = {}) => ({ title, text, module, filters, ...extra });
  const projectLink = item => ({ module: 'portafolio', filters: { search: item.name } });
  const statusOptions = [
    ['En Proceso', 'En proceso'],
    ['Planificado', 'Planificados'],
    ['Cerrado', 'Cerrados'],
  ];
  const riskValue = item => String(val(item, 'risk') || '').toLowerCase();
  const blocked = item => { const risk = riskValue(item); return risk.includes('bloqueo') && !risk.includes('sin bloqueo'); };
  const risky = item => /riesgo|alerta/.test(riskValue(item));

  // ------------------------------------------------------------------ reglas calculadas (mismas funciones del portal)
  const DAY = 864e5, STALE_DAYS = 14, LOW_PROGRESS = 20, SOON_DAYS = 7;
  const cutTime = () => new Date(D.extracted_at_utc).getTime();
  const isoIn = days => new Date(cutTime() + days * DAY).toISOString().slice(0, 10);
  const tentative = item => typeof h.tentativePlan === 'function' ? h.tentativePlan(item) : ['Propuesta', 'Evaluación'].includes(val(item, 'phase'));
  const inactivePm = h.inactivePm || 'PM no vigente';
  const firstPm = item => String(val(item, 'pm') || '').split(/\s*,\s*/)[0] || '';
  const pmNames = item => String(val(item, 'pm') || '').split(/\s*,\s*/).filter(Boolean);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const firstName = name => String(name || '').trim().split(/\s+/)[0] || '';
  const level = item => blocked(item) ? 'block' : risky(item) ? 'risk' : null;
  const lastEntry = item => h.projectUpdateEntries(item)[0] || null;
  const yearOfCut = () => String(new Date(D.extracted_at_utc).getFullYear());
  // Same rule as "Entregados <año>" in the Resumen: closed, with a closure year and quarter in the cut's year.
  const delivered = item => { const c = !active(item) && h.closureInfo(item); return !!(c && String(c.year) === yearOfCut() && Number(c.quarter) >= 1 && Number(c.quarter) <= 4); };
  function phaseRank(label) {
    const column = (D.board?.columns || []).find(col => col.id === C.phase), labels = (column?.settings?.labels || []).filter(x => x.label && x.label !== 'Stand by');
    const found = labels.find(x => x.label === label);
    return found ? Number(found.index) : null;
  }

  function staleRows() {
    const cutoff = cutTime() - STALE_DAYS * DAY;
    return D.items.filter(item => active(item) && !tentative(item)).map(item => ({ item, last: lastEntry(item) }))
      .filter(x => !x.last || new Date(x.last.date).getTime() < cutoff)
      .sort((a, b) => (a.last ? new Date(a.last.date).getTime() : 0) - (b.last ? new Date(b.last.date).getTime() : 0) || a.item.name.localeCompare(b.item.name, 'es'));
  }
  function dueRows(from, to) {
    return D.items.filter(item => { const plan = val(item, 'plan'); return active(item) && !tentative(item) && plan && !h.past(plan) && plan >= from && plan <= to; })
      .sort((a, b) => val(a, 'plan').localeCompare(val(b, 'plan')) || a.name.localeCompare(b.name, 'es'));
  }
  const soonRows = () => dueRows('0000-00-00', isoIn(SOON_DAYS));
  function behindRows() {
    return D.items.filter(active).map(item => ({ item, p: h.progressInfo(item) })).filter(x => x.p.delta !== null && x.p.delta <= -LOW_PROGRESS)
      .sort((a, b) => a.p.delta - b.p.delta || a.item.name.localeCompare(b.item.name, 'es'));
  }
  function pmLoad() {
    const counts = new Map();
    D.items.filter(active).forEach(item => {
      const pm = firstPm(item); if (!pm || pm === inactivePm) return;
      const row = counts.get(pm) || { pm, total: 0, inProcess: 0 }; row.total++; if (val(item, 'status') === 'En Proceso') row.inProcess++; counts.set(pm, row);
    });
    return [...counts.values()].sort((a, b) => b.total - a.total || b.inProcess - a.inProcess || a.pm.localeCompare(b.pm, 'es'));
  }

  // Current cut vs. D.weekly_baseline (Monday). Only initiatives in the current scope are compared.
  function weeklyChanges() {
    const base = D.weekly_baseline;
    if (!base || !Array.isArray(base.items)) return null;
    const before = new Map(base.items.map(item => [String(item.id), item]));
    const out = { since: base.extracted_at_utc, status: [], phase: [], riskNew: [], riskResolved: [], planMoved: [], added: [], closed: [] };
    D.items.forEach(item => {
      const old = before.get(String(item.id));
      if (!old) { out.added.push({ item }); return; }
      const s0 = val(old, 'status'), s1 = val(item, 'status');
      if (s0 !== s1) (s1 === 'Cerrado' ? out.closed : out.status).push({ item, from: s0 || 'Sin estado', to: s1 || 'Sin estado' });
      const p0 = val(old, 'phase'), p1 = val(item, 'phase');
      if (p0 !== p1 && s1 !== 'Cerrado') { const r0 = phaseRank(p0), r1 = phaseRank(p1); out.phase.push({ item, from: p0 || 'Sin fase', to: p1 || 'Sin fase', advanced: r0 !== null && r1 !== null && r1 > r0 }); }
      const l0 = active(old) ? level(old) : null, l1 = active(item) ? level(item) : null;
      if (l0 !== l1) {
        const worse = (l1 === 'block' && l0 !== 'block') || (l1 === 'risk' && !l0);
        (worse ? out.riskNew : out.riskResolved).push({ item, from: val(old, 'risk') || 'Sin dato', to: !active(item) ? 'Cerrado' : (val(item, 'risk') || 'Sin dato'), cleared: !l1 });
      }
      const f0 = val(old, 'plan'), f1 = val(item, 'plan');
      if (f0 !== f1 && active(item)) out.planMoved.push({ item, from: f0, to: f1 });
    });
    out.total = out.status.length + out.phase.length + out.riskNew.length + out.riskResolved.length + out.planMoved.length + out.added.length + out.closed.length;
    return out;
  }

  function weeklyChangesAnswer() {
    const ch = weeklyChanges(), src = 'línea base del lunes vs. corte actual';
    if (!ch) return reply('Qué cambió desde el lunes', 'Este corte no trae la línea base del lunes; no puedo comparar.', 'portafolio', {}, { source: src });
    const since = h.fmtDate(ch.since);
    if (!ch.total) return reply('Qué cambió desde el lunes', 'Sin cambios desde el ' + since + ': mismo estado, fase, riesgos y Fin Plan; no hay iniciativas nuevas ni cerradas.', 'portafolio', {}, { source: src });
    const section = (label, rows, format) => rows.length ? label + ' (' + rows.length + ')\n' + compact(rows, format, 4) : '';
    const arrow = (a, b) => a + ' → ' + b;
    const text = ['Desde el ' + since + ':',
      section('Cerradas', ch.closed, x => x.item.name),
      section('Nuevas en el tablero', ch.added, x => x.item.name + ' · ' + (val(x.item, 'status') || 'Sin estado')),
      section('Cambio de estado', ch.status, x => x.item.name + ': ' + arrow(x.from, x.to)),
      section('Cambio de fase', ch.phase, x => x.item.name + ': ' + arrow(x.from, x.to)),
      section('Riesgos o bloqueos nuevos', ch.riskNew, x => x.item.name + ': ' + x.to),
      section('Riesgos o bloqueos resueltos', ch.riskResolved, x => x.item.name + ': ' + arrow(x.from, x.to)),
      section('Fin Plan movido', ch.planMoved, x => x.item.name + ': ' + arrow(x.from ? h.fmtDate(x.from) : 'sin fecha', x.to ? h.fmtDate(x.to) : 'sin fecha')),
    ].filter(Boolean).join('\n');
    return reply('Qué cambió desde el lunes', text, 'portafolio', { portfolioScope: 'all' }, { source: src });
  }

  function alertsAnswer(topic) {
    if (topic === 'alerts-stale') {
      const rows = staleRows();
      return reply('Sin actualización hace más de ' + STALE_DAYS + ' días', rows.length ? plural(rows.length, 'proyecto activo', 'proyectos activos') + ' sin comentario en la bitácora de monday en más de ' + STALE_DAYS + ' días (no incluye propuestas):\n' + compact(rows, x => x.item.name + ' · ' + (x.last ? 'último ' + h.fmtDate(x.last.date) : 'sin comentarios'), 6) : 'Todos los proyectos activos tienen comentarios en la bitácora de los últimos ' + STALE_DAYS + ' días.', 'portafolio', rows.length === 1 ? { search: rows[0].item.name } : {}, { source: 'bitácora del proyecto (comentarios y respuestas)' });
    }
    if (topic === 'alerts-soon') {
      const rows = soonRows();
      return reply('Fin Plan en ' + SOON_DAYS + ' días', rows.length ? plural(rows.length, 'proyecto', 'proyectos') + ' con Fin Plan hasta el ' + h.fmtDate(isoIn(SOON_DAYS)) + ':\n' + compact(rows, item => item.name + ' · ' + h.fmtDate(val(item, 'plan')) + ' · ' + (val(item, 'pm') || 'PM sin dato'), 6) : 'Ningún proyecto activo tiene Fin Plan en los próximos ' + SOON_DAYS + ' días.', 'cronograma', {}, { source: 'Fin Plan y Estatus; las propuestas tienen Fin Plan tentativo' });
    }
    if (topic === 'alerts-behind') {
      const rows = behindRows();
      return reply('Avance bajo el plan', rows.length ? plural(rows.length, 'proyecto', 'proyectos') + ' con avance real ' + LOW_PROGRESS + ' p.p. o más por debajo del planificado:\n' + compact(rows, x => x.item.name + ' · ' + h.progressPercent(x.p.real) + ' real vs. ' + h.progressPercent(x.p.planned) + ' plan (' + h.progressDelta(x.p.delta) + ')', 6) : 'Ningún proyecto activo está ' + LOW_PROGRESS + ' p.p. o más por debajo de su avance planificado.', 'portafolio', rows.length === 1 ? { search: rows[0].item.name } : {}, { source: '% Avance Real y % Avance Plan; umbral de ' + LOW_PROGRESS + ' p.p.' });
    }
    if (topic === 'alerts-pm') {
      const rows = pmLoad(), top = rows.filter(r => rows[0] && r.total === rows[0].total);
      return reply('PM con más iniciativas activas', rows.length ? 'Más iniciativas activas: ' + top.map(r => r.pm).join(' y ') + ' (' + top[0].total + ').\n' + compact(rows, r => r.pm + ': ' + plural(r.total, 'activa', 'activas') + (r.inProcess ? ' · ' + r.inProcess + ' en proceso' : ''), 5) + '\nCuenta el primer PM registrado de cada iniciativa.' : 'No hay iniciativas activas con PM registrado.', 'portafolio', top.length === 1 ? { pm: top[0].pm } : {}, { source: 'Estatus y PM' });
    }
    return null;
  }

  // Cosmo's proactive bubble: one good and true fact per screen, or nothing.
  function highlight(view, opts = {}) {
    const ch = weeklyChanges(), act = D.items.filter(active);
    if (view === 'resumen') {
      const done = D.items.filter(delivered).length, recent = ch ? ch.closed.filter(x => delivered(x.item)).length : 0;
      if (done) return plural(done, 'entregado', 'entregados') + ' en ' + yearOfCut() + (recent ? ' · ' + recent + ' desde el lunes' : '');
      return '';
    }
    if (view === 'portafolio') {
      const advanced = ch ? ch.phase.filter(x => x.advanced).length : 0, closed = ch ? ch.closed.length : 0;
      if (advanced) return plural(advanced, 'avanzó de fase', 'avanzaron de fase') + ' desde el lunes';
      if (closed) return plural(closed, 'cerrada', 'cerradas') + ' desde el lunes';
      const onTrack = act.filter(item => { const d = h.progressInfo(item).delta; return d !== null && d >= 0; }).length;
      return onTrack ? plural(onTrack, 'activo con avance real igual o mayor al plan', 'activos con avance real igual o mayor al plan') : '';
    }
    if (view === 'cronograma') {
      const cut = new Date(D.extracted_at_utc), month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(cut);
      const onTime = D.items.filter(item => { const real = val(item, 'real'), plan = val(item, 'plan'); return !active(item) && real && plan && real.slice(0, 7) === month && real <= plan; }).length;
      if (onTime) return plural(onTime, 'entregado a tiempo', 'entregados a tiempo') + ' este mes';
      const thisMonth = dueRows('0000-00-00', month + '-31').length;
      if (thisMonth) return plural(thisMonth, 'entrega prevista', 'entregas previstas') + ' este mes con Fin Plan vigente';
      const vigente = typeof h.scheduleBucket === 'function' ? act.filter(item => h.scheduleBucket(item) === 'Fin Plan vigente').length : 0;
      return vigente ? vigente + ' con Fin Plan vigente' : '';
    }
    if (view === 'finanzas') {
      const n = D.items.filter(item => num(item, 'capex') !== null).length;
      return n ? plural(n, 'iniciativa con Presupuesto CAPEX registrado', 'iniciativas con Presupuesto CAPEX registrado') : '';
    }
    if (view === 'atencion') {
      const cleared = ch ? ch.riskResolved.filter(x => x.cleared).length : 0;
      if (cleared) return plural(cleared, 'riesgo resuelto', 'riesgos resueltos') + ' desde el lunes';
      return act.length && !act.some(blocked) ? 'Ningún activo con bloqueo registrado' : '';
    }
    if (view === 'muelle') {
      const name = firstName(opts.person);
      if (!name || opts.person === inactivePm || !Array.isArray(opts.ids)) return '';
      const ids = new Set(opts.ids.map(String)), mine = D.items.filter(item => ids.has(String(item.id)));
      const done = mine.filter(delivered).length;
      if (done) return name + ': ' + plural(done, 'entregado', 'entregados') + ' en ' + yearOfCut();
      const updates = h.weeklyMilestones(mine).length;
      return updates ? name + ': ' + plural(updates, 'proyecto actualizado', 'proyectos actualizados') + ' esta semana' : '';
    }
    if (view === 'ppt') {
      const updates = h.weeklyMilestones(D.items).length;
      return updates ? plural(updates, 'proyecto con actualización', 'proyectos con actualización') + ' esta semana' : '';
    }
    return '';
  }

  function projectTopics(item) {
    const topics = [option('Estado y avance', { type: 'answer', topic: 'project-status', id: item.id })];
    if (h.projectUpdateEntries(item).length) topics.push(option('Última actualización', { type: 'answer', topic: 'project-update', id: item.id }));
    if (active(item) && (val(item, 'risk') || val(item, 'action'))) topics.push(option('Riesgos y acciones', { type: 'answer', topic: 'project-risk', id: item.id }));
    if (val(item, 'action')) topics.push(option('Decisión requerida', { type: 'answer', topic: 'project-action', id: item.id }));
    if (val(item, 'start') || val(item, 'plan') || val(item, 'real')) topics.push(option('Fechas y compromisos', { type: 'answer', topic: 'project-dates', id: item.id }));
    if (!active(item)) topics.push(option('Cierre verificado', { type: 'answer', topic: 'project-closure', id: item.id }));
    topics.push(option('Finanzas', { type: 'answer', topic: 'project-finances', id: item.id }));
    return topics;
  }

  function options(page) {
    if (page.type === 'home') return [
      option('Qué cambió desde el lunes', { type: 'answer', topic: 'weekly-changes' }, { wide: true }),
      option('Actualizaciones de esta semana', { type: 'answer', topic: 'weekly-hits' }),
      option('Estado del portafolio', { type: 'portfolio' }),
      option('Asuntos para decidir', { type: 'attention' }),
      option('Alertas calculadas', { type: 'alerts' }),
      option('Consultar un proyecto', { type: 'project-groups' }, { wide: true }),
    ];
    if (page.type === 'alerts') return [
      option('Sin actualización +' + STALE_DAYS + ' días · ' + staleRows().length, { type: 'answer', topic: 'alerts-stale' }),
      option('Fin Plan en ' + SOON_DAYS + ' días · ' + soonRows().length, { type: 'answer', topic: 'alerts-soon' }),
      option('Avance bajo el plan · ' + behindRows().length, { type: 'answer', topic: 'alerts-behind' }),
      option('PM con más activas', { type: 'answer', topic: 'alerts-pm' }),
    ];
    if (page.type === 'portfolio') return [
      option('Panorama general', { type: 'answer', topic: 'portfolio-status' }),
      option('En proceso', { type: 'answer', topic: 'portfolio-in-process' }),
      option('Planificados', { type: 'answer', topic: 'portfolio-planned' }),
      option('Cerrados', { type: 'answer', topic: 'portfolio-closed' }),
      option('Despliegues por trimestre', { type: 'answer', topic: 'portfolio-quarter' }),
    ];
    if (page.type === 'attention') return [
      option('Riesgos y alertas', { type: 'answer', topic: 'attention-risks' }),
      option('Bloqueos', { type: 'answer', topic: 'attention-blocks' }),
      option('Plazos vencidos', { type: 'answer', topic: 'attention-dates' }),
      option('Acciones o decisiones', { type: 'answer', topic: 'attention-actions' }),
    ];
    if (page.type === 'project-groups') {
      const known = new Set(statusOptions.map(([status]) => status));
      const groups = [...statusOptions, ...[...new Set(D.items.map(item => val(item, 'status') || 'Sin estado'))].filter(status => !known.has(status)).map(status => [status, status])];
      return groups.filter(([status]) => D.items.some(item => (val(item, 'status') || 'Sin estado') === status)).map(([status, label]) => option(label + ' · ' + D.items.filter(item => (val(item, 'status') || 'Sin estado') === status).length, { type: 'project-list', status }));
    }
    if (page.type === 'project-list') return D.items.filter(item => (val(item, 'status') || 'Sin estado') === page.status).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(item => option(item.name, { type: 'project', id: item.id }));
    if (page.type === 'project') return projectTopics(project(page.id));
    return [];
  }

  function projectAnswer(page) {
    const item = project(page.id);
    if (!item) return reply('Proyecto no disponible', 'Este proyecto no aparece en el corte actual.', 'portafolio');
    const status = val(item, 'status') || 'Sin dato', progress = num(item, 'progress');
    let answer, link = projectLink(item);
    if (page.topic === 'project-status') {
      const p = h.progressInfo(item);
      const lines = ['Estatus: ' + status, 'Avance real: ' + h.progressPercent(p.real), 'Avance planificado: ' + h.progressPercent(p.planned), 'Diferencia (real − plan): ' + h.progressDelta(p.delta)];
      if (val(item, 'phase')) lines.push('Fase: ' + val(item, 'phase'));
      if (val(item, 'situation')) lines.push('Situación informada: ' + h.shortAnswer(val(item, 'situation'), 260));
      if (val(item, 'plan')) lines.push('Fin Plan: ' + h.fmtDate(val(item, 'plan')));
      answer = reply(item.name + ' · estado y avance', lines.join('\n'), link.module, link.filters, { source: 'Estatus, % Avance Real, % Avance Plan, Fase, Situación y Fin Plan' });
    } else if (page.topic === 'project-update') {
      const entry = h.projectUpdateEntries(item)[0];
      answer = reply(item.name + ' · última actualización', 'Registro del ' + h.fmtDate(entry.date) + (entry.author ? ' · ' + entry.author : '') + '\n' + h.shortAnswer(entry.text, 410) + (!h.weeklyMilestones([item]).length ? '\nNo hay registros de este proyecto esta semana.' : ''), link.module, link.filters, { source: 'bitácora del proyecto', openProjectId: item.id });
    } else if (page.topic === 'project-hits') {
      const hits = h.weeklyMilestones([item]);
      const inSummary = h.weeklyMilestones(D.items).some(hit => String(hit.project.id) === String(item.id));
      answer = reply(item.name + ' · actualización de esta semana', hits.map(hit => '• ' + h.fmtDate(hit.date) + ': ' + h.shortAnswer(hit.text, 410)).join('\n'), inSummary ? 'resumen' : 'portafolio', inSummary ? {} : { search: item.name }, { source: 'último comentario de bitácora de la semana', ...(inSummary ? { scrollTarget: '.milestone-board' } : { openProjectId: item.id }) });
    } else if (page.topic === 'project-risk') {
      const risk = val(item, 'risk');
      const r=h.riskInfo(item);
      const lines = ['Riesgo / bloqueo: ' + (risk || 'Sin evaluar'), 'Tipo de riesgo: ' + (r.type || 'Pendiente de clasificar'), 'Riesgo registrado: ' + (r.description ? h.shortAnswer(r.description,320) : 'Sin descripción registrada'), 'Acción o decisión requerida: ' + (r.action ? h.shortAnswer(r.action,320) : 'Sin acción registrada'), 'Responsable de mitigación: ' + (r.owner || 'Sin responsable')];
      const attention = h.attentionReasons(item).length > 0;
      answer = reply(item.name + ' · riesgos y acciones', lines.join('\n'), attention ? 'atencion' : 'portafolio', { search: item.name }, { source: 'Riesgo / Bloqueo, Riesgos, Tipo de riesgo, Acción / decisión requerida y Responsable de mitigación', offerEmail: !risk || risk === 'Sin evaluar', project: item, ...(!attention ? { openProjectId: item.id } : {}) });
    } else if (page.topic === 'project-action') {
      const lines = ['Acción o decisión requerida: ' + h.shortAnswer(val(item, 'action'), 360), 'Responsable de mitigación: ' + (val(item, 'mitigationOwner') || 'Sin responsable')];
      const attention = h.attentionReasons(item).length > 0;
      answer = reply(item.name + ' · decisión requerida', lines.join('\n'), attention ? 'atencion' : 'portafolio', { search: item.name }, { source: 'Acción / decisión requerida', ...(!attention ? { openProjectId: item.id } : {}) });
    } else if (page.topic === 'project-dates') {
      const closure = !active(item) ? h.closureLabel(item) : 'Aún no cerrado';
      answer = reply(item.name + ' · fechas', 'Inicio: ' + h.fmtDate(val(item, 'start')) + '\nFin Plan: ' + h.fmtDate(val(item, 'plan')) + '\nCierre efectivo: ' + closure, active(item) ? 'cronograma' : 'portafolio', { search: item.name }, { source: 'Inicio, Fin Plan y Fin Real / bitácora', ...(!active(item) ? { openProjectId: item.id } : {}) });
    } else if (page.topic === 'project-closure') {
      answer = reply(item.name + ' · cierre', 'Estatus: ' + status + '\nCierre efectivo: ' + h.closureLabel(item) + '\nEvidencia: ' + h.closureSourceLabel(item), 'portafolio', { search: item.name, status: 'Cerrado' }, { source: 'Estatus, Fin Real y bitácora', offerEmail: !h.closureInfo(item), project: item, openProjectId: item.id });
    } else if (page.topic === 'project-finances') {
      const f = h.financeInfo(item);
      const values = [
        ['Presupuesto CAPEX original', f.capex], ['CAPEX pagado', f.capexExecuted],
        ['CAPEX pendiente de pago', f.capexCommitted], ['CAPEX registrado', f.registered],
        ['Exceso CAPEX registrado', f.excess], ['OPEX anual previsto', f.opexAnnual],
      ].map(([label, amount]) => label + ': ' + h.financeMoney(item, amount)).join('\n');
      answer = reply(item.name + ' · finanzas', values + '\n' + (f.currency ? 'Moneda: ' + f.currency : 'Moneda por confirmar') + '\n' + (f.taxBasis || 'IGV por confirmar'), 'finanzas', { search: item.name }, { source: 'campos financieros de monday; CAPEX registrado = pagado + pendiente, sin OPEX' });
    }
    return answer;
  }

  function answer(page) {
    if (page.id) return projectAnswer(page);
    const activeItems = D.items.filter(active), closed = D.items.filter(item => !active(item));
    if (page.topic === 'weekly-changes') return weeklyChangesAnswer();
    if (String(page.topic).startsWith('alerts-')) return alertsAnswer(page.topic) || reply('Consulta no disponible', 'No hay un dato verificable para esta opción.', 'portafolio');
    if (page.topic === 'weekly-hits') {
      const hits = h.weeklyMilestones(D.items);
      return reply('Actualizaciones de esta semana', hits.length ? compact(hits, hit => h.fmtDate(hit.date) + ' · ' + hit.project.name + ': ' + h.shortAnswer(hit.text, 170), 5) : 'Aún no hay comentarios de bitácora registrados esta semana.', 'resumen', {}, { source: 'último comentario de cada proyecto desde el lunes · corte publicado de monday', scrollTarget: '.milestone-board' });
    }
    if (page.topic === 'recent-activity') {
      const entries = h.weeklyMilestones(activeItems);
      return reply('Actualizaciones de esta semana', entries.length ? compact(entries, x => h.fmtDate(x.date) + ' · ' + x.project.name + ': ' + h.shortAnswer(x.text, 125), 4) : 'Aún no hay comentarios de proyectos activos registrados esta semana.', 'resumen', {}, { source: 'último comentario de cada proyecto activo desde el lunes', scrollTarget: '.milestone-board' });
    }
    if (page.topic === 'portfolio-status') return reply('Estado del portafolio', D.items.length + ' proyectos: ' + activeItems.length + ' no cerrados (' + activeItems.filter(item => val(item, 'status') === 'En Proceso').length + ' en proceso y ' + activeItems.filter(item => val(item, 'status') === 'Planificado').length + ' planificados) y ' + closed.length + ' cerrados.', 'portafolio', {}, { source: 'Estatus de los proyectos' });
    const status = { 'portfolio-in-process': 'En Proceso', 'portfolio-planned': 'Planificado', 'portfolio-closed': 'Cerrado' }[page.topic];
    if (status) { const rows = D.items.filter(item => val(item, 'status') === status); return reply('Proyectos ' + status.toLowerCase(), rows.length + ' proyectos:\n' + compact(rows, item => item.name + (status === 'Cerrado' ? ' · ' + h.closureLabel(item) : ' · ' + (num(item, 'progress') ?? 'Sin dato') + '%'), 7), 'portafolio', { status }, { source: 'Estatus, % Avance y cierre verificado' }); }
    if (page.topic === 'portfolio-quarter') {
      const counts = new Map(); let undated = 0;
      closed.forEach(item => { const info = h.closureInfo(item); if (!info?.year || !info?.quarter) { undated++; return; } const key = info.year + ' · T' + info.quarter; counts.set(key, (counts.get(key) || 0) + 1); });
      return reply('Despliegues por trimestre', [...counts].sort((a, b) => b[0].localeCompare(a[0])).map(([period, count]) => '• ' + period + ': ' + count).join('\n') + (undated ? '\n' + undated + ' cerrado(s) sin trimestre verificable.' : ''), 'resumen', {}, { source: 'Fin Real; en su ausencia, bitácora de cierre', scrollTarget: '.executive-charts .chart-card:nth-child(3)' });
    }
    if (page.topic === 'attention-risks' || page.topic === 'attention-blocks') {
      const isBlock = page.topic === 'attention-blocks', rows = activeItems.filter(isBlock ? blocked : risky);
      return reply(isBlock ? 'Bloqueos registrados' : 'Riesgos y alertas', rows.length ? rows.length + ' proyecto(s):\n' + compact(rows, item => item.name + ' · ' + val(item, 'risk')) : 'No hay proyectos activos en esta categoría en el corte actual.', 'atencion', { issue: isBlock ? 'Bloqueos' : 'Riesgos' }, { source: 'Riesgo / Bloqueo' });
    }
    if (page.topic === 'attention-dates') {
      const rows = activeItems.filter(item => h.attentionReasons(item).includes('Fin Plan vencido'));
      return reply('Plazos vencidos', rows.length ? rows.length + ' proyecto(s) con Fin Plan vencido:\n' + compact(rows, item => item.name + ' · ' + h.fmtDate(val(item, 'plan'))) : 'No hay proyectos activos con Fin Plan vencido en el corte actual.', 'atencion', { issue: 'Plazos vencidos' }, { source: 'Fin Plan y Estatus' });
    }
    if (page.topic === 'attention-actions') {
      const rows = activeItems.filter(item => val(item, 'action'));
      return reply('Acciones o decisiones registradas', rows.length ? rows.length + ' proyecto(s):\n' + compact(rows, item => item.name + ' · ' + h.shortAnswer(val(item, 'action'), 135)) : 'No hay acciones o decisiones registradas para proyectos activos.', 'portafolio', rows.length === 1 ? { search: rows[0].name } : {}, { source: 'Acción / decisión requerida', ...(rows.length === 1 ? { openProjectId: rows[0].id } : {}) });
    }
    return reply('Consulta no disponible', 'No hay un dato verificable para esta opción.', 'portafolio');
  }

  function title(page) {
    if (page.type === 'home') return 'Inicio';
    if (page.type === 'portfolio') return 'Estado del portafolio';
    if (page.type === 'attention') return 'Asuntos para decidir';
    if (page.type === 'alerts') return 'Alertas calculadas';
    if (page.type === 'project-groups') return 'Consultar un proyecto';
    if (page.type === 'project-list') return statusOptions.find(([status]) => status === page.status)?.[1] || page.status || 'Proyectos';
    if (page.type === 'project') return project(page.id)?.name || 'Proyecto';
    return 'Respuesta';
  }
  return { options, answer, title, projectTopics, weeklyChanges, highlight, alerts: { stale: staleRows, soon: soonRows, behind: behindRows, pmLoad, due: dueRows }, rules: { STALE_DAYS, LOW_PROGRESS, SOON_DAYS } };
});
