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
  const option = (label, page) => ({ label, page });
  const reply = (title, text, module, filters = {}, extra = {}) => ({ title, text, module, filters, ...extra });
  const weeksAgo = new Date(new Date(D.extracted_at_utc).getTime() - 7 * 86400000);
  const projectLink = item => ({ module: 'portafolio', filters: { search: item.name } });
  const statusOptions = [
    ['En Proceso', 'En proceso'],
    ['Planificado', 'Planificados'],
    ['Cerrado', 'Cerrados'],
  ];
  const riskValue = item => String(val(item, 'risk') || '').toLowerCase();
  const blocked = item => { const risk = riskValue(item); return risk.includes('bloqueo') && !risk.includes('sin bloqueo'); };
  const risky = item => /riesgo|alerta/.test(riskValue(item));

  function projectTopics(item) {
    const topics = [option('Estado y avance', { type: 'answer', topic: 'project-status', id: item.id })];
    if (h.projectUpdateEntries(item).length) topics.push(option('Actividad reciente', { type: 'answer', topic: 'project-update', id: item.id }));
    if (h.weeklyMilestones([item]).length) topics.push(option('Hitos de la semana', { type: 'answer', topic: 'project-hits', id: item.id }));
    if (active(item) && (val(item, 'risk') || val(item, 'action'))) topics.push(option('Riesgos y acciones', { type: 'answer', topic: 'project-risk', id: item.id }));
    if (val(item, 'action')) topics.push(option('Decisión requerida', { type: 'answer', topic: 'project-action', id: item.id }));
    if (val(item, 'start') || val(item, 'plan') || val(item, 'forecast') || val(item, 'real')) topics.push(option('Fechas y compromisos', { type: 'answer', topic: 'project-dates', id: item.id }));
    if (!active(item)) topics.push(option('Cierre verificado', { type: 'answer', topic: 'project-closure', id: item.id }));
    if (['budget', 'cost', 'benefits', 'benefitsDone'].some(key => num(item, key) !== null)) topics.push(option('Finanzas y beneficios', { type: 'answer', topic: 'project-finances', id: item.id }));
    return topics;
  }

  function options(page) {
    if (page.type === 'home') return [
      option('Hitos logrados esta semana', { type: 'answer', topic: 'weekly-hits' }),
      option('Actividad reciente', { type: 'answer', topic: 'recent-activity' }),
      option('Estado del portafolio', { type: 'portfolio' }),
      option('Asuntos para decidir', { type: 'attention' }),
      option('Consultar un proyecto', { type: 'project-groups' }),
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
      const lines = ['Estatus: ' + status, 'Avance registrado: ' + (progress === null ? 'Sin dato' : progress + '%')];
      if (val(item, 'phase')) lines.push('Fase: ' + val(item, 'phase'));
      if (val(item, 'situation')) lines.push('Situación registrada: ' + h.shortAnswer(val(item, 'situation'), 260));
      if (val(item, 'plan')) lines.push('Fin Plan: ' + h.fmtDate(val(item, 'plan')));
      answer = reply(item.name + ' · estado y avance', lines.join('\n'), link.module, link.filters, { source: 'Estatus, % Avance, Fase, Situación y Fin Plan' });
    } else if (page.topic === 'project-update') {
      const entry = h.projectUpdateEntries(item)[0];
      answer = reply(item.name + ' · actividad reciente', 'Registro del ' + h.fmtDate(entry.date) + (entry.author ? ' · ' + entry.author : '') + '\n' + h.shortAnswer(entry.text, 410), link.module, link.filters, { source: 'bitácora del proyecto', openProjectId: item.id });
    } else if (page.topic === 'project-hits') {
      const hits = h.weeklyMilestones([item]);
      const inSummary = h.weeklyMilestones(D.items).some(hit => String(hit.project.id) === String(item.id));
      answer = reply(item.name + ' · hitos de la semana', hits.map(hit => '• ' + h.fmtDate(hit.date) + ': ' + hit.text).join('\n'), inSummary ? 'resumen' : 'portafolio', inSummary ? {} : { search: item.name }, { source: 'bitácora y cierre verificado', ...(inSummary ? { scrollTarget: '.milestone-board' } : { openProjectId: item.id }) });
    } else if (page.topic === 'project-risk') {
      const risk = val(item, 'risk');
      const lines = ['Riesgo / bloqueo: ' + (risk || 'Sin evaluar')];
      if (val(item, 'action')) lines.push('Acción o decisión requerida: ' + h.shortAnswer(val(item, 'action'), 320));
      const attention = h.attentionReasons(item).length > 0;
      answer = reply(item.name + ' · riesgos y acciones', lines.join('\n'), attention ? 'atencion' : 'portafolio', { search: item.name }, { source: 'Riesgo / Bloqueo y Acción / decisión requerida', offerEmail: !risk || risk === 'Sin evaluar', project: item });
    } else if (page.topic === 'project-action') {
      const lines = ['Acción o decisión requerida: ' + h.shortAnswer(val(item, 'action'), 360)];
      if (val(item, 'actionOwner')) lines.push('Responsable registrado: ' + val(item, 'actionOwner'));
      if (val(item, 'actionDate')) lines.push('Fecha compromiso: ' + h.fmtDate(val(item, 'actionDate')));
      if (val(item, 'actionStatus')) lines.push('Estado: ' + val(item, 'actionStatus'));
      answer = reply(item.name + ' · decisión requerida', lines.join('\n'), h.attentionReasons(item).length ? 'atencion' : 'portafolio', { search: item.name }, { source: 'Acción / decisión requerida' });
    } else if (page.topic === 'project-dates') {
      const closure = !active(item) ? h.closureLabel(item) : 'Aún no cerrado';
      answer = reply(item.name + ' · fechas', 'Inicio: ' + h.fmtDate(val(item, 'start')) + '\nFin Plan: ' + h.fmtDate(val(item, 'plan')) + '\nForecast: ' + h.fmtDate(val(item, 'forecast')) + '\nCierre efectivo: ' + closure, active(item) ? 'cronograma' : 'portafolio', { search: item.name }, { source: 'Inicio, Fin Plan, Forecast y Fin Real / bitácora' });
    } else if (page.topic === 'project-closure') {
      answer = reply(item.name + ' · cierre', 'Estatus: ' + status + '\nCierre efectivo: ' + h.closureLabel(item) + '\nEvidencia: ' + h.closureSourceLabel(item), 'portafolio', { search: item.name, status: 'Cerrado' }, { source: 'Estatus, Fin Real y bitácora', offerEmail: !h.closureInfo(item), project: item });
    } else if (page.topic === 'project-finances') {
      const fields = [['Presupuesto aprobado', 'budget'], ['Costo proyectado', 'cost'], ['Beneficios comprometidos', 'benefits'], ['Beneficios logrados', 'benefitsDone']];
      answer = reply(item.name + ' · finanzas', fields.map(([label, key]) => label + ': ' + (num(item, key) === null ? 'Sin dato' : 'USD ' + h.fmtNum(num(item, key)))).join('\n'), 'finanzas', { search: item.name }, { source: 'campos financieros ejecutivos' });
    }
    return answer;
  }

  function answer(page) {
    if (page.id) return projectAnswer(page);
    const activeItems = D.items.filter(active), closed = D.items.filter(item => !active(item));
    if (page.topic === 'weekly-hits') {
      const hits = h.weeklyMilestones(D.items);
      return reply('Hitos logrados esta semana', hits.length ? hits.map(hit => '• ' + h.fmtDate(hit.date) + ' · ' + hit.project.name + ': ' + h.shortAnswer(hit.text, 170)).join('\n') : 'No hay hitos con evidencia suficiente en los últimos siete días.', 'resumen', {}, { source: 'bitácora y cierres verificados; ventana móvil de siete días', scrollTarget: '.milestone-board' });
    }
    if (page.topic === 'recent-activity') {
      const entries = activeItems.map(item => ({ item, entry: h.projectUpdateEntries(item)[0] })).filter(x => x.entry && new Date(x.entry.date) >= weeksAgo).sort((a, b) => new Date(b.entry.date) - new Date(a.entry.date));
      return reply('Actividad registrada esta semana', entries.length ? compact(entries, x => h.fmtDate(x.entry.date) + ' · ' + x.item.name + ': ' + h.shortAnswer(x.entry.text, 125), 4) : 'No hay actualizaciones de proyectos activos registradas en los últimos siete días.', 'portafolio', {}, { source: 'bitácora de proyectos activos; últimos siete días' });
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
      const rows = activeItems.filter(item => val(item, 'plan') && h.past(val(item, 'plan')));
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
    if (page.type === 'project-groups') return 'Consultar un proyecto';
    if (page.type === 'project-list') return statusOptions.find(([status]) => status === page.status)?.[1] || page.status || 'Proyectos';
    if (page.type === 'project') return project(page.id)?.name || 'Proyecto';
    return 'Respuesta';
  }
  return { options, answer, title, projectTopics };
});
