/* Cosmo: respuestas verificables sobre la instantánea de monday. Sin llamadas a IA. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createCosmoKnowledge = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCosmoKnowledge(D, C, h) {
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const canonical = value => norm(value).replace(/\b(risgos|riegos)\b/g, 'riesgos').replace(/\b(risgo|riego)\b/g, 'riesgo').replace(/\bcuanto cuenta\b/g, 'cuanto cuesta');
  const words = value => norm(value).split(' ').filter(Boolean);
  const near = (a, b) => {
    if (a === b) return true;
    if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  };
  const has = (q, re) => re.test(q);
  const blank = value => value === null || value === undefined || String(value).trim() === '';
  const value = (item, key) => h.val(item, C[key]);
  const number = (item, key) => h.num(item, C[key]);
  const date = (item, key) => h.fmtDate(value(item, key));
  const money = (item, key) => number(item, key) === null ? 'Sin dato' : 'USD ' + h.fmtNum(number(item, key));
  const latest = item => h.projectUpdateEntries(item)[0];
  const isBlocked = item => { const r = norm(value(item, 'risk')); return r.includes('bloqueo') && !r.includes('sin bloqueo'); };
  const isRisk = item => { const r = norm(value(item, 'risk')); return r.includes('riesgo') || r.includes('alerta'); };
  const projectWords = new Set(['proyecto', 'proyectos', 'portal', 'cosmos', 'mejoras', 'servicio', 'servicios', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'para', 'it', 'tecnologica', 'tecnologico', 'automaticas', 'automatica']);
  const questionWords = new Set(['que', 'cual', 'cuales', 'como', 'cuando', 'quien', 'quienes', 'donde', 'dime', 'muestrame', 'informame', 'tiene', 'tienen', 'esta', 'estan', 'sobre', 'por', 'con', 'sin', 'al', 'un', 'una', 'es', 'son', 'hay', 'hay', 'estado', 'estatus', 'situacion', 'fase', 'avance', 'avances', 'riesgo', 'riesgos', 'bloqueo', 'bloqueos', 'fecha', 'fechas', 'cierre', 'cerrado', 'cerrados', 'responsable', 'pm', 'sponsor', 'prioridad', 'proveedor', 'hito', 'hitos', 'actualizacion', 'actualizaciones', 'ultima', 'ultimo', 'ultimos', 'reciente', 'semana', 'mes', 'ano', 'trimestre', 'fin', 'plan', 'forecast', 'presupuesto', 'costo', 'beneficio', 'beneficios', 'decision', 'accion', 'acciones', 'pendiente', 'pendientes', 'proyecto', 'proyectos', 'portafolio', 'cartera']);
  const normalizedNames = D.items.map(item => ({ item, name: norm(item.name), tokens: [...new Set(words(item.name).filter(w => w.length >= 3 && !projectWords.has(w)))] }));
  const uniqueToken = new Map();
  normalizedNames.forEach(row => row.tokens.forEach(token => uniqueToken.set(token, (uniqueToken.get(token) || 0) + 1)));

  function findProject(question) {
    const q = canonical(question), padded = ' ' + q + ' ';
    const direct = normalizedNames.filter(row => padded.includes(' ' + row.name + ' ')).sort((a, b) => b.name.length - a.name.length);
    if (direct.length) return { project: direct[0].item };
    const queryTokens = new Set(words(q).filter(w => w.length >= 3 && !questionWords.has(w) && !projectWords.has(w)));
    const ranked = normalizedNames.map(row => {
      const matched = row.tokens.filter(token => [...queryTokens].some(queryToken => near(token, queryToken)));
      const distinctive = matched.filter(token => uniqueToken.get(token) === 1);
      return { ...row, matched, score: matched.length * 2 + distinctive.length * 3 + (matched.length && matched.length === row.tokens.length ? 2 : 0) };
    }).filter(row => row.score > 0).sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || b.name.length - a.name.length);
    if (!ranked.length) {
      const generic = ['portal', 'cosmos', 'facturacion', 'renovacion'].find(token => padded.includes(' ' + token + ' '));
      const candidates = generic ? D.items.filter(item => words(item.name).includes(generic)) : [];
      return candidates.length > 1 ? { ambiguous: candidates.slice(0, 4) } : {};
    }
    if (ranked.length > 1 && ranked[0].score === ranked[1].score) return { ambiguous: ranked.filter(row => row.score === ranked[0].score).slice(0, 4).map(row => row.item) };
    if (ranked[0].matched.length >= 2 || ranked[0].matched.some(token => uniqueToken.get(token) === 1 && token.length >= 4)) return { project: ranked[0].item };
    return {};
  }

  function findPm(q) {
    const names = [...new Set(D.items.map(i => value(i, 'pm')).filter(Boolean))];
    const exact = names.find(name => (' ' + q + ' ').includes(' ' + norm(name) + ' '));
    if (exact) return exact;
    const candidate = names.filter(name => words(name).some(w => w.length >= 4 && (' ' + q + ' ').includes(' ' + w + ' ')));
    return candidate.length === 1 ? candidate[0] : null;
  }

  const listing = (rows, format, cap = 8) => rows.slice(0, cap).map(i => '• ' + format(i)).join('\n') + (rows.length > cap ? '\n• y ' + (rows.length - cap) + ' más.' : '');
  const result = (text, project, offerEmail = false) => ({ text, project, offerEmail });
  const missing = (project, field) => result('El campo ' + field + ' de ' + project.name + ' no está registrado en monday en este corte.', project, true);

  function updateAnswer(project, q) {
    const entries = h.projectUpdateEntries(project);
    if (!entries.length) return result('No hay actualizaciones de bitácora asociadas a ' + project.name + ' en este corte.', project, true);
    if (has(q, /\b(esta semana|ultimos 7 dias|hitos? recientes?|hitos? de la semana)\b/)) {
      const cutoff = new Date(new Date(D.extracted_at_utc).getTime() - 7 * 86400000);
      const hits = entries.filter(entry => new Date(entry.date) >= cutoff).map(entry => ({ entry, milestone: h.milestoneSentence(entry.text) })).filter(x => x.milestone).slice(0, 3);
      return hits.length ? result('Hitos verificados de ' + project.name + ' en los últimos siete días:\n' + hits.map(x => '• ' + h.fmtDate(x.entry.date) + ': ' + x.milestone.text).join('\n'), project) : result('No hay hitos de ' + project.name + ' con evidencia suficiente en la bitácora de los últimos siete días.', project);
    }
    const topic = words(q).filter(w => w.length >= 4 && !questionWords.has(w) && !projectWords.has(w) && !words(project.name).includes(w) && !['bitacora', 'registro', 'detalle', 'paso', 'pasado', 'ocurrio', 'ocurre', 'dijo', 'dice', 'ultima', 'ultimas', 'ultimo'].includes(w));
    if (topic.length && has(q, /\b(sobre|respecto|bitacora|mencion|dijo|paso|ocurrio|detalle|actualizacion|ultima|ultimo)\b/)) {
      const matches = entries.map(entry => ({ entry, score: topic.reduce((sum, token) => sum + (words(entry.text).includes(token) ? 1 : 0), 0) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score || new Date(b.entry.date) - new Date(a.entry.date));
      if (matches.length) { const x = matches[0].entry; return result('En la bitácora de ' + project.name + ' encontré esto (' + h.fmtDate(x.date) + (x.author ? ', ' + x.author : '') + '):\n' + h.shortAnswer(x.text, 480), project); }
      return result('No encuentro una actualización de ' + project.name + ' sobre ese tema en la bitácora incluida en este corte.', project, true);
    }
    const x = entries[0];
    return result('Última actualización de ' + project.name + ' (' + h.fmtDate(x.date) + (x.author ? ', ' + x.author : '') + '):\n' + h.shortAnswer(x.text, 480), project);
  }

  function projectAnswer(project, question) {
    const q = canonical(question), risk = value(project, 'risk'), action = value(project, 'action');
    if (has(q, /\b(regulariz|faltan? (datos|campos)|datos? (faltantes?|pendientes?)|completar en monday|actualizar en monday)\b/)) {
      const issues = h.regularizationIssues(project);
      return result(issues.length ? 'Pendientes de regularizar en monday para ' + project.name + ' (' + issues.length + '):\n' + listing(issues, issue => issue.category + ' · ' + issue.field, 12) : 'No detecto campos pendientes según las reglas actuales de regularización para ' + project.name + '.', project);
    }
    if (has(q, /\b(hitos?|bitacora|actualizacion|actualizaciones|novedad|novedades|ultima noticia|ultimo movimiento|que paso|que se hizo)\b/) || has(q, /\b(avance reciente|avances recientes)\b/)) return updateAnswer(project, q);
    if (has(q, /\b(accion|acciones|decision|decisiones|compromiso de accion|que se requiere)\b/)) {
      if (!action) return missing(project, 'Acción / decisión requerida');
      const parts = ['Acción / decisión requerida para ' + project.name + ': ' + h.shortAnswer(action, 430)];
      if (value(project, 'actionOwner')) parts.push('Responsable: ' + value(project, 'actionOwner'));
      if (value(project, 'actionDate')) parts.push('Compromiso: ' + date(project, 'actionDate'));
      if (value(project, 'actionStatus')) parts.push('Estado: ' + value(project, 'actionStatus'));
      return result(parts.join('\n'), project);
    }
    if (has(q, /\b(sponsor|patrocinador|patrocina)\b/)) return value(project, 'sponsor') ? result('El sponsor de ' + project.name + ' es ' + value(project, 'sponsor') + '.', project) : missing(project, 'Sponsor');
    if (has(q, /\b(pm|project manager|lider|lidera|encargad[oa]|responsable|quien lo lleva|quien lleva)\b/)) return value(project, 'pm') ? result('El PM asignado a ' + project.name + ' es ' + value(project, 'pm') + '.', project) : missing(project, 'PM');
    if (has(q, /\b(proveedor|empresa proveedora)\b/)) return value(project, 'provider') ? result('El proveedor registrado para ' + project.name + ' es ' + value(project, 'provider') + '.', project) : missing(project, 'Proveedor');
    if (has(q, /\b(prioridad|critico|critica)\b/)) return value(project, 'priority') ? result('La prioridad de ' + project.name + ' es ' + value(project, 'priority') + '.', project) : missing(project, 'Prioridad');
    if (has(q, /\b(tipo|categoria)\b/)) return value(project, 'type') ? result('El tipo de ' + project.name + ' es ' + value(project, 'type') + '.', project) : missing(project, 'Tipo');
    if (has(q, /\b(riesgo|riesgos|bloqueo|bloqueado|bloqueos|impedimento|problema)\b/)) {
      if (!risk || norm(risk) === 'sin evaluar') return result('El riesgo o bloqueo de ' + project.name + ' figura como ' + (risk || 'sin dato') + ' en monday. No puedo confirmar que esté libre de riesgos.', project, true);
      return result('Riesgo / bloqueo de ' + project.name + ': ' + risk + (action ? '\nAcción o decisión requerida: ' + h.shortAnswer(action, 300) : ''), project);
    }
    if (has(q, /\b(presupuesto|costo|coste|cuesta|finanzas?|capex|opex|beneficios?|inversion)\b/)) {
      const fields = [['Presupuesto aprobado', 'budget'], ['Costo proyectado', 'cost'], ['Beneficios comprometidos', 'benefits'], ['Beneficios logrados', 'benefitsDone']];
      if (fields.every(([, key]) => number(project, key) === null)) return result('Los campos financieros ejecutivos de ' + project.name + ' no están registrados en monday en este corte.', project, true);
      const requested = has(q, /\b(presupuesto)\b/) ? fields.slice(0, 1) : has(q, /\b(costo|coste|cuesta)\b/) ? fields.slice(1, 2) : has(q, /\b(beneficio|beneficios)\b/) ? fields.slice(2) : fields;
      return result(project.name + '\n' + requested.map(([label, key]) => label + ': ' + money(project, key)).join('\n'), project, requested.some(([, key]) => number(project, key) === null));
    }
    if (has(q, /\b(fin real|cierre efectivo|fecha de cierre|cuando cerro|cuando se cerro|despleg|produccion|ejecutado)\b/)) {
      if (value(project, 'status') !== 'Cerrado') return result(project.name + ' figura como ' + (value(project, 'status') || 'sin estado') + ' en monday; no hay un cierre efectivo confirmado.', project);
      const closure = h.closureInfo(project);
      if (!closure) return missing(project, 'Fin Real / cierre efectivo');
      const when = closure.date ? h.fmtDate(closure.date) : closure.year ? 'año ' + closure.year + (closure.quarter ? ', trimestre ' + closure.quarter : '') : 'Sin dato';
      return result('El cierre efectivo de ' + project.name + ' está registrado como ' + when + '. Fuente: ' + h.closureSourceLabel(project) + '.', project);
    }
    if (has(q, /\b(forecast|proyeccion de fin|fecha estimada|fin estimado)\b/)) return value(project, 'forecast') ? result('El Forecast de ' + project.name + ' es ' + date(project, 'forecast') + '.', project) : missing(project, 'Forecast');
    if (has(q, /\b(fin plan|fecha planificada|fecha comprometida|plazo|cuando termina|cuando acaba|cuando finaliza|para cuando)\b/)) return value(project, 'plan') ? result('El Fin Plan de ' + project.name + ' es ' + date(project, 'plan') + '. ' + (h.past(value(project, 'plan')) && h.active(project) ? 'La fecha está vencida en el corte actual.' : ''), project) : missing(project, 'Fin Plan');
    if (has(q, /\b(inicio|empezo|comenzo|arranco)\b/)) return value(project, 'start') ? result('El inicio de ' + project.name + ' es ' + date(project, 'start') + '.', project) : missing(project, 'Inicio');
    if (has(q, /\b(fechas?|cronograma|calendario)\b/)) return result(project.name + '\nInicio: ' + date(project, 'start') + '\nFin Plan: ' + date(project, 'plan') + '\nForecast: ' + date(project, 'forecast') + '\nCierre efectivo: ' + h.closureLabel(project) + ' (' + h.closureSourceLabel(project) + ').', project);
    if (has(q, /\b(fase|etapa)\b/)) return value(project, 'phase') ? result('La fase actual de ' + project.name + ' es ' + value(project, 'phase') + '.', project) : missing(project, 'Fase actual');
    if (has(q, /\b(porcentaje|%|avance|progreso|cuanto lleva)\b/)) return number(project, 'progress') === null ? missing(project, '% Avance') : result('El avance registrado de ' + project.name + ' es ' + number(project, 'progress') + '%.', project);
    if (has(q, /\b(situacion|estado|estatus|como va|como esta|en que va|que tal va|que pasa con|resumen|hablame)\b/) || q === norm(project.name)) return result(h.projectSummary(project), project);
    const topicHint = has(q, /\b(sobre|respecto|que pasa|que ocurrio|detalle)\b/);
    if (topicHint) return updateAnswer(project, q);
    return result('No encontré un dato verificable para esa pregunta sobre ' + project.name + '. Puedes preguntarme por estado, avance, fase, PM, fechas, riesgos, acciones o bitácora.', project, true);
  }

  function portfolioAnswer(question) {
    const q = canonical(question), items = D.items, activeItems = items.filter(h.active), closed = items.filter(i => !h.active(i));
    const pm = findPm(q);
    let rows = pm ? items.filter(i => value(i, 'pm') === pm) : items;
    let qualifier = pm ? ' de ' + pm : '';
    if (has(q, /\b(riesgos?\s+(?:o|y)\s+bloqueos?|bloqueos?\s+(?:o|y)\s+riesgos?)\b/)) { rows = rows.filter(i => h.active(i) && (isBlocked(i) || isRisk(i))); qualifier = ' con riesgo o bloqueo' + qualifier; }
    else if (has(q, /\b(bloqueo|bloqueados|bloqueos)\b/)) { rows = rows.filter(i => h.active(i) && isBlocked(i)); qualifier = ' con bloqueo' + qualifier; }
    else if (has(q, /\b(riesgo|riesgos|alerta|alertas)\b/)) { rows = rows.filter(i => h.active(i) && isRisk(i)); qualifier = ' con riesgo o alerta' + qualifier; }
    else if (has(q, /\b(cerrados|cerrado|terminados|finalizados)\b/)) { rows = rows.filter(i => !h.active(i)); qualifier = ' cerrados' + qualifier; }
    else if (has(q, /\b(activos|activo|abiertos|vigentes)\b/)) { rows = rows.filter(h.active); qualifier = ' no cerrados' + qualifier; }
    else if (has(q, /\b(criticos|critico|critica|alta prioridad)\b/)) { rows = rows.filter(i => norm(value(i, 'priority')).includes('critical') || norm(value(i, 'priority')).includes('high')); qualifier = ' de prioridad alta o crítica' + qualifier; }
    else if (has(q, /\b(planificados|planificado|en proceso|ejecucion|uat|estabilizacion|evaluacion|propuesta)\b/)) {
      const status = has(q, /\b(planificados|planificado)\b/) ? 'Planificado' : has(q, /\b(en proceso)\b/) ? 'En Proceso' : null;
      const phases = [...new Set(items.map(i => value(i, 'phase')).filter(Boolean))];
      const phase = !status && (phases.find(p => (' ' + q + ' ').includes(' ' + norm(p) + ' ')) || phases.find(p => words(p).some(token => token.length >= 3 && (' ' + q + ' ').includes(' ' + token + ' '))));
      if (status || phase) { rows = rows.filter(i => status ? value(i, 'status') === status : value(i, 'phase') === phase); qualifier = ' en ' + (status || phase) + qualifier; }
    }
    if (has(q, /\b(ejecutados?|desplegados?|produccion|por trimestre|por ano)\b/)) {
      const periods = new Map(); let without = 0;
      closed.forEach(i => { const x = h.closureInfo(i); if (!x?.year) { without++; return; } const key = has(q, /\b(trimestre|trimestral)\b/) ? String(x.year) + (x.quarter ? ' · T' + x.quarter : ' · trimestre sin dato') : String(x.year); periods.set(key, (periods.get(key) || 0) + 1); });
      return result('Proyectos cerrados/desplegados por ' + (has(q, /\b(trimestre|trimestral)\b/) ? 'trimestre' : 'año') + ' según Fin Real o bitácora:\n' + ([...periods].sort((a, b) => b[0].localeCompare(a[0])).map(([key, count]) => '• ' + key + ': ' + count).join('\n') || 'Sin fechas verificables') + (without ? '\n' + without + ' cerrado(s) sin fecha de cierre verificable.' : ''));
    }
    if (has(q, /\b(regulariz|faltan datos|campos pendientes|datos faltantes)\b/)) {
      const gaps = rows.map(i => ({ item: i, issues: h.regularizationIssues(i) })).filter(x => x.issues.length);
      return result('Hay ' + gaps.length + ' proyectos con campos pendientes de regularizar' + qualifier + '. Total de valores pendientes: ' + gaps.reduce((n, x) => n + x.issues.length, 0) + '.\n' + listing(gaps, x => x.item.name + ' · ' + x.issues.length + ' campo(s)', 8));
    }
    if (has(q, /\b(presupuesto|costo|coste|cuesta|finanzas|beneficios)\b/)) {
      const known = rows.filter(i => ['budget', 'cost', 'benefits', 'benefitsDone'].some(key => number(i, key) !== null));
      return result(known.length ? known.length + ' proyecto(s) tienen algún dato financiero ejecutivo registrado. Pídeme uno por nombre para ver el detalle.' : 'Ninguno de los ' + rows.length + ' proyectos consultados tiene campos financieros ejecutivos registrados en este corte.');
    }
    if (has(q, /\b(ultimos|recientes|semana|hitos)\b/)) {
      const hits = h.weeklyMilestones(rows);
      return result(hits.length ? 'Hitos verificados en los últimos siete días:\n' + hits.map(hit => '• ' + hit.project.name + ' (' + h.fmtDate(hit.date) + '): ' + h.shortAnswer(hit.text, 160)).join('\n') : 'No hay hitos recientes con evidencia suficiente para mostrarlos como logro.');
    }
    if (has(q, /\b(vencidos|atrasados|retrasados|fuera de plazo)\b/)) { rows = rows.filter(i => h.active(i) && ['Vencido', 'Forecast retrasado'].includes(h.scheduleBucket(i))); qualifier = ' con plazo vencido o Forecast retrasado' + qualifier; }
    if (pm || rows !== items || has(q, /\b(cuantos|cuantas|listar|lista|cuales|muestra|proyectos)\b/)) {
      return result('Hay ' + rows.length + ' proyecto(s)' + qualifier + (rows.length ? ':\n' + listing(rows, i => i.name + ' · ' + (value(i, 'status') || 'Sin estado') + (pm ? '' : ' · ' + (value(i, 'pm') || 'PM sin dato'))) : '.'));
    }
    if (has(q, /\b(total|resumen|cartera|portafolio|estado)\b/)) return result('El portafolio tiene ' + items.length + ' proyectos: ' + activeItems.length + ' no cerrados y ' + closed.length + ' cerrados. De los no cerrados, ' + activeItems.filter(isRisk).length + ' tienen riesgo o alerta y ' + activeItems.filter(isBlocked).length + ' tienen bloqueo registrado.');
    return result('Puedo consultar proyectos, responsables, fechas, avances, riesgos, decisiones, hitos y la bitácora de monday. Indica un proyecto o pregunta por la cartera.');
  }

  function answer(question, context) {
    const q = canonical(question), found = findProject(question);
    if (found.ambiguous) return result('Hay varios proyectos que coinciden. ¿A cuál te refieres?\n' + listing(found.ambiguous, i => i.name, 4));
    const portfolio = has(q, /\b(portafolio|cartera|proyectos|iniciativas|hitos de la semana)\b/);
    let project = found.project;
    if (!project && !portfolio && context.project) project = D.items.find(i => String(i.id) === String(context.project));
    if (project) { context.project = String(project.id); return projectAnswer(project, question); }
    context.project = null;
    return portfolioAnswer(question);
  }
  return { answer, findProject, projectAnswer, portfolioAnswer };
});
