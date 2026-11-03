/* Cosmo: respuestas verificables sobre la instantánea de monday. Sin llamadas a IA ni a la red.
   `ask` entiende preguntas escritas (con errores de tipeo) y responde con el mismo formato del menú guiado. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createCosmoKnowledge = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCosmoKnowledge(D, C, h, guide) {
  const norm = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();
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
  const value = (item, key) => h.val(item, C[key]);
  const number = (item, key) => h.num(item, C[key]);
  const date = (item, key) => h.fmtDate(value(item, key));
  const isActive = item => typeof h.active === 'function' ? h.active(item) : value(item, 'status') !== 'Cerrado';
  const isBlocked = item => { const r = norm(value(item, 'risk')); return r.includes('bloqueo') && !r.includes('sin bloqueo'); };
  const isRisk = item => { const r = norm(value(item, 'risk')); return r.includes('riesgo') || r.includes('alerta'); };
  const inactivePm = h.inactivePm || 'PM no vigente';
  const pmNames = item => String(value(item, 'pm') || '').split(/\s*,\s*/).filter(Boolean);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const projectWords = new Set(['proyecto', 'proyectos', 'portal', 'cosmos', 'mejoras', 'servicio', 'servicios', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'para', 'it', 'tecnologica', 'tecnologico', 'automaticas', 'automatica', 'fase', 'implementacion', 'implementancion']);
  const questionWords = new Set(['que','cual','cuales','como','cuando','quien','quienes','donde','dime','muestrame','informame','tiene','tienen','esta','estan','sobre','por','con','sin','al','un','una','es','son','hay','va','van','estado','estatus','situacion','fase','avance','avances','riesgo','riesgos','bloqueo','bloqueos','fecha','fechas','cierre','cerrado','cerrados','responsable','pm','sponsor','prioridad','proveedor','hito','hitos','actualizacion','actualizaciones','actualizado','actualizados','actualizar','ultima','ultimo','ultimos','reciente','semana','mes','ano','hoy','manana','dias','proximo','proximos','proxima','trimestre','fin','plan','forecast','presupuesto','costo','cuesta','cuanto','cuantos','cuantas','beneficio','beneficios','decision','accion','acciones','pendiente','pendientes','proyecto','proyectos','portafolio','cartera','capex','opex','desviacion','finanzas','ejecutado','ejecutada','comprometido','comprometida','proyectados','proyectadas','anual','vence','vencen','vencer','vencido','vencidos','cambio','cambios','cambiaron','cambiado','lunes','alerta','alertas','debajo','bajo','atrasado','atrasados','entregado','entregados','mis','mios','todos','todas','iniciativa','iniciativas','activos','activas']);
  // Words Cosmo understands; a one-letter typo in a query word is mapped to them.
  const VOCAB = ['riesgo', 'riesgos', 'bloqueo', 'bloqueos', 'avance', 'presupuesto', 'proyecto', 'proyectos', 'actualizacion', 'actualizaciones', 'cronograma', 'vence', 'vencen', 'vencidos', 'cambio', 'cambios', 'alertas', 'finanzas', 'responsable', 'estado', 'situacion', 'planificados', 'cerrados', 'entregados', 'sponsor', 'proveedor', 'prioridad', 'bitacora', 'semana', 'cuesta', 'cuanto', 'iniciativas', 'decision', 'decisiones'];
  const normalizedNames = D.items.map(item => ({ item, name: norm(item.name), tokens: [...new Set(words(item.name).filter(w => w.length >= 3 && !projectWords.has(w)))] }));
  const uniqueToken = new Map();
  normalizedNames.forEach(row => row.tokens.forEach(token => uniqueToken.set(token, (uniqueToken.get(token) || 0) + 1)));
  const canonical = value => norm(value).replace(/\b(risgos|riegos|resgos)\b/g, 'riesgos').replace(/\b(risgo|riego)\b/g, 'riesgo').replace(/\bcuanto cuenta\b/g, 'cuanto cuesta')
    .split(' ').map(w => w.length < 5 || VOCAB.includes(w) || uniqueToken.has(w) ? w : (VOCAB.find(v => near(w, v)) || w)).join(' ');

  function findProject(question) {
    const q = canonical(question), padded = ' ' + q + ' ';
    const direct = normalizedNames.filter(row => row.name && padded.includes(' ' + row.name + ' ')).sort((a, b) => b.name.length - a.name.length);
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

  // One person per name, also when monday lists two PMs in the same cell.
  function findPm(q, context = {}) {
    if (context.myPm && has(q, /\b(mis|mios|mias|mi muelle)\b/)) return context.myPm;
    const names = [...new Set(D.items.flatMap(pmNames))].filter(name => name !== inactivePm || has(q, /\bno vigente\b/));
    const padded = ' ' + q + ' ';
    const exact = names.find(name => padded.includes(' ' + norm(name) + ' '));
    if (exact) return exact;
    const candidate = names.filter(name => words(name).some(w => w.length >= 4 && padded.includes(' ' + w + ' ')));
    return candidate.length === 1 ? candidate[0] : null;
  }
  const ledBy = (item, pm) => pmNames(item).includes(pm);

  const listing = (rows, format, cap = 8) => rows.slice(0, cap).map(i => '• ' + format(i)).join('\n') + (rows.length > cap ? '\n• y ' + (rows.length - cap) + ' más.' : '');
  const result = (text, project, offerEmail = false, meta = {}) => ({ text, project, offerEmail, ...meta });
  const missing = (project, field) => result('El campo ' + field + ' de ' + project.name + ' no está registrado en monday en este corte.', project, true, { topic: 'field' });

  function statusText(project) {
    if (guide) return guide.answer({ type: 'answer', topic: 'project-status', id: project.id }).text;
    const p = h.progressInfo(project);
    return ['Estatus: ' + (value(project, 'status') || 'Sin dato'), 'Avance real: ' + h.progressPercent(p.real), 'Avance planificado: ' + h.progressPercent(p.planned), 'Diferencia (real − plan): ' + h.progressDelta(p.delta)].join('\n');
  }

  function updateAnswer(project, q) {
    const entries = h.projectUpdateEntries(project), meta = { topic: 'update' };
    if (!entries.length) return result('No hay actualizaciones de bitácora asociadas a ' + project.name + ' en este corte.', project, true, meta);
    if (has(q, /\bultimos 7 dias\b/)) {
      const cutoff = new Date(new Date(D.extracted_at_utc).getTime() - 7 * 86400000);
      const recent = entries.find(entry => new Date(entry.date) >= cutoff);
      return recent ? result('Última actualización de ' + project.name + ' en los últimos siete días (' + h.fmtDate(recent.date) + '):\n' + h.shortAnswer(recent.text, 480), project, false, meta) : result('No hay comentarios de bitácora de ' + project.name + ' en los últimos siete días.', project, false, meta);
    }
    if (has(q, /\b(esta semana|hitos? recientes?|hitos? de la semana|actualizaciones de esta semana)\b/)) {
      const recent = h.weeklyMilestones([project])[0];
      return recent ? result('Última actualización de ' + project.name + ' esta semana (' + h.fmtDate(recent.date) + '):\n' + h.shortAnswer(recent.text, 480), project, false, meta) : result('No hay comentarios de bitácora de ' + project.name + ' registrados esta semana.', project, false, meta);
    }
    const topic = words(q).filter(w => w.length >= 4 && !questionWords.has(w) && !projectWords.has(w) && !words(project.name).includes(w) && !['bitacora', 'registro', 'detalle', 'paso', 'pasado', 'ocurrio', 'ocurre', 'dijo', 'dice', 'ultima', 'ultimas', 'ultimo'].includes(w));
    if (topic.length && has(q, /\b(sobre|respecto|bitacora|mencion|dijo|paso|ocurrio|detalle|actualizacion|ultima|ultimo)\b/)) {
      const matches = entries.map(entry => ({ entry, score: topic.reduce((sum, token) => sum + (words(entry.text).includes(token) ? 1 : 0), 0) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score || new Date(b.entry.date) - new Date(a.entry.date));
      if (matches.length) { const x = matches[0].entry; return result('En la bitácora de ' + project.name + ' encontré esto (' + h.fmtDate(x.date) + (x.author ? ', ' + x.author : '') + '):\n' + h.shortAnswer(x.text, 480), project, false, meta); }
      return result('No encuentro una actualización de ' + project.name + ' sobre ese tema en la bitácora incluida en este corte.', project, true, meta);
    }
    const x = entries[0];
    return result('Última actualización de ' + project.name + ' (' + h.fmtDate(x.date) + (x.author ? ', ' + x.author : '') + '):\n' + h.shortAnswer(x.text, 480), project, false, meta);
  }

  function projectChanges(project) {
    const ch = guide && guide.weeklyChanges();
    if (!ch) return result('Este corte no trae la línea base del lunes; no puedo comparar ' + project.name + '.', project, false, { topic: 'changes' });
    const id = String(project.id), mine = key => ch[key].filter(x => String(x.item.id) === id);
    const lines = [
      ...mine('added').map(() => 'Entró al tablero después del lunes.'),
      ...mine('closed').map(x => 'Estado: ' + x.from + ' → Cerrado'),
      ...mine('status').map(x => 'Estado: ' + x.from + ' → ' + x.to),
      ...mine('phase').map(x => 'Fase: ' + x.from + ' → ' + x.to),
      ...mine('riskNew').map(x => 'Riesgo / bloqueo: ' + x.from + ' → ' + x.to),
      ...mine('riskResolved').map(x => 'Riesgo / bloqueo: ' + x.from + ' → ' + x.to),
      ...mine('planMoved').map(x => 'Fin Plan: ' + (x.from ? h.fmtDate(x.from) : 'sin fecha') + ' → ' + (x.to ? h.fmtDate(x.to) : 'sin fecha')),
    ];
    return result(lines.length ? project.name + ' desde el ' + h.fmtDate(ch.since) + ':\n' + lines.join('\n') : project.name + ' no cambió desde el ' + h.fmtDate(ch.since) + ' en estado, fase, riesgo ni Fin Plan.', project, false, { topic: 'changes' });
  }

  function projectAnswer(project, question) {
    const q = canonical(question), risk = value(project, 'risk'), action = value(project, 'action');
    if (has(q, /\b(regulariz|faltan? (datos|campos)|datos? (faltantes?|pendientes?)|completar en monday|actualizar en monday)/)) {
      const issues = h.regularizationIssues(project);
      return result(issues.length ? 'Pendientes de regularizar en monday para ' + project.name + ' (' + issues.length + '):\n' + listing(issues, issue => issue.category + ' · ' + issue.field, 12) : 'No detecto campos pendientes según las reglas actuales de regularización para ' + project.name + '.', project, false, { topic: 'field' });
    }
    if (has(q, /\b(cambio|cambios|cambiaron|cambiado|desde el lunes)\b/)) return projectChanges(project);
    if (has(q, /\b(hitos?|bitacora|actualizacion|actualizaciones|novedad|novedades|ultima noticia|ultimo movimiento|que paso|que se hizo)\b/) || has(q, /\b(avance reciente|avances recientes)\b/)) return updateAnswer(project, q);
    if (has(q, /\b(accion|acciones|decision|decisiones|compromiso de accion|que se requiere)\b/)) {
      if (!action) return missing(project, 'Acción / decisión requerida');
      return result('Acción / decisión requerida para ' + project.name + ': ' + h.shortAnswer(action, 430), project, false, { topic: 'risk' });
    }
    if (has(q, /\b(sponsor|patrocinador|patrocina)\b/)) return value(project, 'sponsor') ? result('El sponsor de ' + project.name + ' es ' + value(project, 'sponsor') + '.', project, false, { topic: 'field' }) : missing(project, 'Sponsor');
    if (has(q, /\b(pm|project manager|lider|lidera|encargad[oa]|responsable|quien lo lleva|quien lleva)\b/)) return value(project, 'pm') ? result('El PM asignado a ' + project.name + ' es ' + value(project, 'pm') + '.', project, value(project, 'pm') === inactivePm, { topic: 'field' }) : missing(project, 'PM');
    if (has(q, /\b(proveedor|empresa proveedora)\b/)) return value(project, 'provider') ? result('El proveedor registrado para ' + project.name + ' es ' + value(project, 'provider') + '.', project, false, { topic: 'field' }) : missing(project, 'Proveedor');
    if (has(q, /\b(prioridad|critico|critica)\b/)) return value(project, 'priority') ? result('La prioridad de ' + project.name + ' es ' + value(project, 'priority') + '.', project, false, { topic: 'field' }) : missing(project, 'Prioridad');
    if (has(q, /\b(tipo|categoria)\b/)) return value(project, 'type') ? result('El tipo de ' + project.name + ' es ' + value(project, 'type') + '.', project, false, { topic: 'field' }) : missing(project, 'Tipo');
    if (has(q, /\b(riesgo|riesgos|bloqueo|bloqueado|bloqueos|impedimento|problema|problemas)\b/)) {
      if (!risk || norm(risk) === 'sin evaluar') return result('El riesgo o bloqueo de ' + project.name + ' figura como ' + (risk || 'sin dato') + ' en monday. No puedo confirmar que esté libre de riesgos.', project, true, { topic: 'risk' });
      return result('Riesgo / bloqueo de ' + project.name + ': ' + risk + (action ? '\nAcción o decisión requerida: ' + h.shortAnswer(action, 300) : ''), project, false, { topic: 'risk' });
    }
    if (has(q, /\b(presupuesto|costo|coste|cuesta|finanzas?|capex|opex|beneficios?|inversion|gasto|gastado)\b/)) {
      if (has(q, /\bbeneficios?\b/)) return result('El tablero actual no ofrece una cifra verificable de beneficios para ' + project.name + '.', project, true, { topic: 'finance' });
      const f = h.financeInfo(project);
      const fields = [['Presupuesto CAPEX original', 'capex'], ['CAPEX pagado', 'capexExecuted'], ['CAPEX pendiente de pago', 'capexCommitted'], ['CAPEX registrado', 'registered'], ['Exceso CAPEX registrado', 'excess'], ['OPEX anual previsto', 'opexAnnual']];
      if (['capex', 'capexCommitted', 'capexExecuted', 'opexAnnual'].every(key => f[key] === null)) return result('Los campos financieros de ' + project.name + ' no tienen datos en este corte.', project, true, { topic: 'finance' });
      const requested = /capex (ejecutado|pagado)/.test(q) ? fields.filter(([, key]) => key === 'capexExecuted') : /capex (comprometido|pendiente)/.test(q) ? fields.filter(([, key]) => key === 'capexCommitted') : /\bopex\b/.test(q) ? fields.filter(([, key]) => key === 'opexAnnual') : /desviacion|exceso/.test(q) ? fields.filter(([, key]) => key === 'excess') : fields;
      return result(project.name + '\n' + requested.map(([label, key]) => label + ': ' + h.financeMoney(project, f[key])).join('\n') + '\n' + (f.currency ? 'Moneda: ' + f.currency : 'Moneda por confirmar') + '\n' + (f.taxBasis || 'IGV por confirmar'), project, requested.some(([, key]) => f[key] === null), { topic: 'finance' });
    }
    if (has(q, /\b(fin real|cierre efectivo|fecha de cierre|cuando cerro|cuando se cerro|despleg|produccion|ejecutado|entregado|entrego)/)) {
      if (value(project, 'status') !== 'Cerrado') return result(project.name + ' figura como ' + (value(project, 'status') || 'sin estado') + ' en monday; no hay un cierre efectivo confirmado.', project, false, { topic: 'dates' });
      const closure = h.closureInfo(project);
      if (!closure) return missing(project, 'Fin Real / cierre efectivo');
      const when = closure.date ? h.fmtDate(closure.date) : closure.year ? 'año ' + closure.year + (closure.quarter ? ', trimestre ' + closure.quarter : '') : 'Sin dato';
      return result('El cierre efectivo de ' + project.name + ' está registrado como ' + when + '. Fuente: ' + h.closureSourceLabel(project) + '.', project, false, { topic: 'dates' });
    }
    if (has(q, /\b(forecast|proyeccion de fin|fecha estimada|fin estimado)\b/)) return result('Fin Forecast ya no forma parte del seguimiento actual en Monday. Fin Plan de ' + project.name + ': ' + date(project, 'plan') + '. Cierre efectivo: ' + h.closureLabel(project) + '.', project, false, { topic: 'dates' });
    if (has(q, /\b(fin plan|fecha planificada|fecha comprometida|plazo|cuando termina|cuando acaba|cuando finaliza|para cuando|vence|vencido)\b/)) return value(project, 'plan') ? result('El Fin Plan de ' + project.name + ' es ' + date(project, 'plan') + '.' + (h.past(value(project, 'plan')) && isActive(project) ? ' La fecha está vencida en el corte actual.' : ''), project, false, { topic: 'dates' }) : missing(project, 'Fin Plan');
    if (has(q, /\b(inicio|empezo|comenzo|arranco)\b/)) return value(project, 'start') ? result('El inicio de ' + project.name + ' es ' + date(project, 'start') + '.', project, false, { topic: 'dates' }) : missing(project, 'Inicio');
    if (has(q, /\b(fechas?|cronograma|calendario)\b/)) return result(project.name + '\nInicio: ' + date(project, 'start') + '\nFin Plan: ' + date(project, 'plan') + '\nCierre efectivo: ' + h.closureLabel(project) + ' (' + h.closureSourceLabel(project) + ').', project, false, { topic: 'dates' });
    if (has(q, /\b(fase|etapa)\b/)) return value(project, 'phase') ? result('La fase actual de ' + project.name + ' es ' + value(project, 'phase') + '.', project, false, { topic: 'field' }) : missing(project, 'Fase actual');
    if (has(q, /(porcentaje|%|\bavance\b|\bprogreso\b|\bcuanto lleva\b)/)) {
      const p = h.progressInfo(project);
      if (p.real === null) return missing(project, '% Avance Real');
      return result('Avance de ' + project.name + ': ' + h.progressPercent(p.real) + ' real' + (p.planned === null ? '; % Avance Plan sin dato.' : ' vs. ' + h.progressPercent(p.planned) + ' planificado (' + h.progressDelta(p.delta) + ').'), project, false, { topic: 'field' });
    }
    if (has(q, /\b(situacion|estado|estatus|como va|como esta|como van|en que va|que tal va|que pasa con|resumen|hablame|cuentame)\b/) || q === norm(project.name) || !words(q).some(w => !normalizedNames.find(r => r.item === project).tokens.some(t => near(t, w)) && !questionWords.has(w) && !projectWords.has(w))) return result(statusText(project), project, false, { topic: 'status' });
    if (has(q, /\b(sobre|respecto|que pasa|que ocurrio|detalle)\b/)) return updateAnswer(project, q);
    return result('No encontré un dato verificable para esa pregunta sobre ' + project.name + '. Elige un tema o consulta al responsable.', project, true, { topic: 'unknown' });
  }

  // ------------------------------------------------------------------ cartera
  const todayLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(D.extracted_at_utc));
  const addDays = (iso, days) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  function dueWindow(q) {
    const today = todayLima(), dow = new Date(today + 'T12:00:00Z').getUTCDay(), toSunday = (7 - dow) % 7;
    if (has(q, /\bhoy\b/)) return { from: today, to: today, label: 'hoy' };
    if (has(q, /\bmanana\b/)) return { from: addDays(today, 1), to: addDays(today, 1), label: 'mañana' };
    if (has(q, /\b(proxima|siguiente) semana\b/)) return { from: addDays(today, toSunday + 1), to: addDays(today, toSunday + 7), label: 'la próxima semana' };
    if (has(q, /\b(esta semana|semana)\b/)) return { from: today, to: addDays(today, toSunday), label: 'esta semana (hasta el ' + h.fmtDate(addDays(today, toSunday)) + ')' };
    if (has(q, /\b(proximo|siguiente) mes\b/)) { const d = new Date(today + 'T12:00:00Z'), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, first = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10), last = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10); return { from: first, to: last, label: 'el próximo mes' }; }
    if (has(q, /\b(este mes|mes)\b/)) { const d = new Date(today + 'T12:00:00Z'), last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); return { from: today, to: last, label: 'este mes' }; }
    const n = (q.match(/\b(?:proximos?|siguientes?) (\d{1,3}) dias\b/) || [])[1];
    const days = n ? Math.max(1, Number(n)) : 7;
    return { from: today, to: addDays(today, days), label: 'en los próximos ' + days + ' días' };
  }
  function dueAnswer(q, pm) {
    const win = dueWindow(q), qualifier = pm ? ' de ' + pm : '';
    const rows = (guide ? guide.alerts.due(win.from, win.to) : D.items.filter(i => isActive(i) && value(i, 'plan') && value(i, 'plan') >= win.from && value(i, 'plan') <= win.to)).filter(i => !pm || ledBy(i, pm));
    const late = D.items.filter(i => h.attentionReasons(i).includes('Fin Plan vencido') && (!pm || ledBy(i, pm))).length;
    const text = (rows.length ? plural(rows.length, 'proyecto', 'proyectos') + qualifier + ' con Fin Plan ' + win.label + ':\n' + listing(rows, i => i.name + ' · ' + date(i, 'plan') + (pm ? '' : ' · ' + (value(i, 'pm') || 'PM sin dato')), 6) : 'Ningún proyecto activo' + qualifier + ' tiene Fin Plan ' + win.label + '.') + (late ? '\nAparte, ' + plural(late, 'proyecto tiene', 'proyectos tienen') + ' Fin Plan vencido.' : '');
    return result(text, null, false, { title: 'Fin Plan ' + win.label.replace(/ \(.*\)$/, ''), module: 'cronograma', filters: pm ? { pm } : {}, source: 'Fin Plan y Estatus; las propuestas tienen Fin Plan tentativo' });
  }
  function alertAnswer(topic, pm) {
    if (!guide) return null;
    if (!pm) return guide.answer({ type: 'answer', topic });
    const base = guide.answer({ type: 'answer', topic }), { STALE_DAYS, LOW_PROGRESS } = guide.rules;
    if (topic === 'alerts-stale') {
      const rows = guide.alerts.stale().filter(x => ledBy(x.item, pm));
      return { ...base, filters: { pm }, text: rows.length ? plural(rows.length, 'proyecto activo', 'proyectos activos') + ' de ' + pm + ' sin comentario en la bitácora en más de ' + STALE_DAYS + ' días:\n' + listing(rows, x => x.item.name + ' · ' + (x.last ? 'último ' + h.fmtDate(x.last.date) : 'sin comentarios'), 6) : 'Todos los proyectos activos de ' + pm + ' tienen comentarios en la bitácora de los últimos ' + STALE_DAYS + ' días.' };
    }
    if (topic === 'alerts-behind') {
      const rows = guide.alerts.behind().filter(x => ledBy(x.item, pm));
      return { ...base, filters: { pm }, text: rows.length ? plural(rows.length, 'proyecto', 'proyectos') + ' de ' + pm + ' con avance real ' + LOW_PROGRESS + ' p.p. o más por debajo del plan:\n' + listing(rows, x => x.item.name + ' · ' + h.progressDelta(x.p.delta), 6) : 'Ningún proyecto activo de ' + pm + ' está ' + LOW_PROGRESS + ' p.p. o más por debajo del plan.' };
    }
    return base;
  }

  function portfolioAnswer(question, context = {}) {
    const q = canonical(question), items = D.items, activeItems = items.filter(isActive), closed = items.filter(i => !isActive(i));
    const pm = findPm(q, context);
    let rows = pm ? items.filter(i => ledBy(i, pm)) : items;
    let qualifier = pm ? ' de ' + pm : '', module = 'portafolio', filters = pm ? { pm } : {}, title = pm ? 'Proyectos de ' + pm : 'Cartera', format = i => i.name + ' · ' + (value(i, 'status') || 'Sin estado') + (pm ? '' : ' · ' + (value(i, 'pm') || 'PM sin dato'));
    let filteredBy = !!pm, note = '';
    if (has(q, /\b(bloqueo|bloqueados|bloqueos)\b/) && !has(q, /\briesgos?\b/)) { rows = rows.filter(i => isActive(i) && isBlocked(i)); qualifier = ' con bloqueo' + qualifier; module = 'atencion'; filters = { ...filters, issue: 'Bloqueos' }; title = 'Bloqueos' + (pm ? ' de ' + pm : ''); format = i => i.name + ' · ' + value(i, 'risk'); filteredBy = true; }
    else if (has(q, /\b(riesgo|riesgos|problemas)\b/)) { const late = rows.filter(i => h.attentionReasons(i).includes('Fin Plan vencido')).length; note = late ? '\nAparte, ' + plural(late, 'proyecto tiene', 'proyectos tienen') + ' Fin Plan vencido.' : ''; rows = rows.filter(i => isActive(i) && (isRisk(i) || isBlocked(i))); qualifier = ' con riesgo o bloqueo' + qualifier; module = 'atencion'; filters = { ...filters, issue: 'Riesgos' }; title = 'Riesgos' + (pm ? ' de ' + pm : ''); format = i => i.name + ' · ' + value(i, 'risk') + (pm ? '' : ' · ' + (value(i, 'pm') || 'PM sin dato')); filteredBy = true; }
    else if (has(q, /\b(entregados|entregadas)\b/)) {
      const year = String(new Date(D.extracted_at_utc).getFullYear());
      const done = rows.filter(i => { const c = !isActive(i) && h.closureInfo(i); return c && String(c.year) === year && Number(c.quarter) >= 1 && Number(c.quarter) <= 4; });
      return result(done.length ? plural(done.length, 'entregado', 'entregados') + qualifier + ' en ' + year + ':\n' + listing(done, i => i.name + ' · ' + h.closureLabel(i), 8) : 'Sin entregados' + qualifier + ' en ' + year + ' en este corte.', null, false, { title: 'Entregados ' + year, module: 'portafolio', filters: { ...(pm ? { pm } : {}), portfolioScope: 'closed' }, source: 'Fin Real; en su ausencia, bitácora de cierre' });
    }
    else if (has(q, /\b(cerrados|cerrado|terminados|finalizados)\b/)) { rows = rows.filter(i => !isActive(i)); qualifier = ' cerrados' + qualifier; filters = { ...filters, portfolioScope: 'closed' }; filteredBy = true; }
    else if (has(q, /\b(activos|activo|activas|abiertos|vigentes)\b/)) { rows = rows.filter(isActive); qualifier = ' no cerrados' + qualifier; filteredBy = true; }
    else if (has(q, /\b(criticos|critico|critica|alta prioridad)\b/)) { rows = rows.filter(i => norm(value(i, 'priority')).includes('critical') || norm(value(i, 'priority')).includes('high')); qualifier = ' de prioridad alta o crítica' + qualifier; filteredBy = true; }
    else if (has(q, /\b(planificados|planificado|en proceso|ejecucion|uat|estabilizacion|evaluacion|propuesta|propuestos|planificacion)\b/)) {
      const status = has(q, /\b(planificados|planificado)\b/) ? 'Planificado' : has(q, /\b(en proceso)\b/) ? 'En Proceso' : has(q, /\bpropuestos\b/) ? 'Propuesto' : null;
      const phases = [...new Set(items.map(i => value(i, 'phase')).filter(Boolean))];
      const phase = !status && (phases.find(p => (' ' + q + ' ').includes(' ' + norm(p) + ' ')) || phases.find(p => words(p).some(token => token.length >= 3 && (' ' + q + ' ').includes(' ' + token + ' '))));
      if (status || phase) { rows = rows.filter(i => status ? value(i, 'status') === status : value(i, 'phase') === phase); qualifier = ' en ' + (status || phase) + qualifier; filters = status ? { ...filters, status } : { ...filters, phase }; filteredBy = true; }
    }
    if (has(q, /\b(ejecutados?|desplegados?|produccion|por trimestre|por ano)\b/)) {
      const periods = new Map(); let without = 0;
      closed.forEach(i => { const x = h.closureInfo(i); if (!x?.year) { without++; return; } const key = has(q, /\b(trimestre|trimestral)\b/) ? String(x.year) + (x.quarter ? ' · T' + x.quarter : ' · trimestre sin dato') : String(x.year); periods.set(key, (periods.get(key) || 0) + 1); });
      return result('Proyectos cerrados/desplegados por ' + (has(q, /\b(trimestre|trimestral)\b/) ? 'trimestre' : 'año') + ' según Fin Real o bitácora:\n' + ([...periods].sort((a, b) => b[0].localeCompare(a[0])).map(([key, count]) => '• ' + key + ': ' + count).join('\n') || 'Sin fechas verificables') + (without ? '\n' + without + ' cerrado(s) sin fecha de cierre verificable.' : ''), null, false, { title: 'Despliegues', module: 'resumen', filters: {}, source: 'Fin Real; en su ausencia, bitácora de cierre' });
    }
    if (has(q, /\b(regulariz|faltan datos|campos pendientes|datos faltantes)/)) {
      const gaps = rows.map(i => ({ item: i, issues: h.regularizationIssues(i) })).filter(x => x.issues.length);
      return result('Hay ' + gaps.length + ' proyectos con campos pendientes de regularizar' + qualifier + '. Total de valores pendientes: ' + gaps.reduce((n, x) => n + x.issues.length, 0) + '.\n' + listing(gaps, x => x.item.name + ' · ' + x.issues.length + ' campo(s)', 8), null, false, { title: 'Datos por regularizar', module: 'portafolio', filters, source: 'reglas de regularización del portal' });
    }
    if (has(q, /\b(presupuesto|costo|coste|cuesta|finanzas|beneficios|capex|opex|inversion)\b/)) {
      if (has(q, /\bbeneficios?\b/)) return result('El tablero actual no ofrece una cifra verificable de beneficios para esta cartera.', null, false, { title: 'Beneficios', module: 'finanzas', filters: {} });
      const known = rows.filter(i => ['capex', 'capexCommitted', 'capexExecuted', 'opexAnnual', 'budgetDeviation'].some(key => number(i, key) !== null));
      return result(known.length ? known.length + ' proyecto(s)' + qualifier + ' tienen algún dato financiero registrado. Pregúntame por uno por nombre para ver el detalle; los importes en USD y PEN no se suman.' : 'Ninguno de los ' + rows.length + ' proyectos consultados tiene campos financieros registrados en este corte.', null, false, { title: 'Finanzas' + (pm ? ' de ' + pm : ''), module: 'finanzas', filters: pm ? { pm } : {}, source: 'campos financieros de monday' });
    }
    if (has(q, /\b(ultimos|recientes|hitos|novedades|actualizaciones)\b/) || (has(q, /\bsemana\b/) && !filteredBy)) {
      const hits = h.weeklyMilestones(rows);
      return result(hits.length ? 'Actualizaciones de esta semana' + qualifier + ':\n' + listing(hits, hit => hit.project.name + ' (' + h.fmtDate(hit.date) + '): ' + h.shortAnswer(hit.text, 160), 5) : 'Aún no hay comentarios de bitácora' + qualifier + ' registrados esta semana.', null, false, { title: 'Actualizaciones de esta semana', module: 'resumen', filters: {}, scrollTarget: '.milestone-board', source: 'último comentario de cada proyecto desde el lunes' });
    }
    if (has(q, /\b(vencidos|atrasados|retrasados|fuera de plazo)\b/)) { rows = rows.filter(i => h.attentionReasons(i).includes('Fin Plan vencido')); qualifier = ' con Fin Plan vencido' + qualifier; module = 'atencion'; filters = { ...(pm ? { pm } : {}), issue: 'Plazos vencidos' }; title = 'Plazos vencidos'; format = i => i.name + ' · ' + date(i, 'plan'); filteredBy = true; }
    if (filteredBy || has(q, /\b(cuantos|cuantas|listar|lista|cuales|muestra|proyectos|iniciativas)\b/)) {
      return result(rows.length ? 'Hay ' + plural(rows.length, 'proyecto', 'proyectos') + qualifier + ':\n' + listing(rows, format) + note : 'No hay proyectos' + qualifier + ' en este corte.' + note, null, false, { title, module, filters, source: 'Estatus, PM y Riesgo / Bloqueo' });
    }
    if (has(q, /\b(total|resumen|cartera|portafolio|estado|como vamos|como va)\b/)) return result('El portafolio tiene ' + items.length + ' proyectos: ' + activeItems.length + ' no cerrados y ' + closed.length + ' cerrados. De los no cerrados, ' + activeItems.filter(isRisk).length + ' tienen riesgo o alerta y ' + activeItems.filter(isBlocked).length + ' tienen bloqueo registrado.', null, false, { title: 'Estado del portafolio', module: 'portafolio', filters: {}, source: 'Estatus y Riesgo / Bloqueo' });
    return result('No entendí la pregunta. Prueba con una de estas opciones o escribe, por ejemplo, «cómo va Cosmos Connect» o «qué vence esta semana».', null, false, { topic: 'unknown' });
  }

  // Legacy entry point: plain text answers for one question.
  function answer(question, context = {}) {
    const q = canonical(question), found = findProject(question);
    if (found.ambiguous) return result('Hay varios proyectos que coinciden. ¿A cuál te refieres?\n' + listing(found.ambiguous, i => i.name, 4), null, false, { topic: 'ambiguous', candidates: found.ambiguous });
    const portfolio = has(q, /\b(portafolio|cartera|proyectos|iniciativas|hitos de la semana|actualizaciones de esta semana|cuantos|cuantas|cuales|todos|todas|entregados|entregadas|cerrados|activos)\b/) || !!findPm(q, context);
    let project = found.project, fromContext = false;
    if (!project && !portfolio && context.project) { project = D.items.find(i => String(i.id) === String(context.project)); fromContext = !!project; }
    if (project) {
      const r = projectAnswer(project, question);
      // A question Cosmo cannot place does not stick to the previous project.
      if (!(fromContext && r.topic === 'unknown')) { context.project = String(project.id); return r; }
    }
    context.project = null;
    return portfolioAnswer(question, context);
  }

  // ------------------------------------------------------------------ pregunta libre → tarjeta del chat
  const HOME_HINTS = [
    [/\b(cambio|cambios|cambiaron|lunes)\b/, { label: 'Qué cambió desde el lunes', page: { type: 'answer', topic: 'weekly-changes' } }],
    [/\b(semana|actualizacion|actualizaciones|bitacora|novedades|hitos)\b/, { label: 'Actualizaciones de esta semana', page: { type: 'answer', topic: 'weekly-hits' } }],
    [/\b(riesgo|riesgos|bloqueo|bloqueos|decision|decisiones|accion|acciones|atencion)\b/, { label: 'Asuntos para decidir', page: { type: 'attention' } }],
    [/\b(alerta|alertas|vence|vencen|plazo|fecha|fechas|atrasado|atrasados|debajo|pm)\b/, { label: 'Alertas calculadas', page: { type: 'alerts' } }],
    [/\b(estado|cartera|portafolio|cerrados|planificados|trimestre|cuantos)\b/, { label: 'Estado del portafolio', page: { type: 'portfolio' } }],
  ];
  function suggestions(q, project) {
    if (project && guide) return guide.projectTopics(project).slice(0, 4);
    const hits = HOME_HINTS.filter(([re]) => re.test(q)).map(([, s]) => s);
    const base = hits.length ? hits : [HOME_HINTS[0][1], HOME_HINTS[4][1], HOME_HINTS[2][1]];
    return [...base.slice(0, 3), { label: 'Consultar un proyecto', page: { type: 'project-groups' } }];
  }
  const TOPIC_LABEL = { status: 'estado y avance', update: 'bitácora', risk: 'riesgos y acciones', finance: 'finanzas', dates: 'fechas', field: 'dato del proyecto', changes: 'cambios desde el lunes', unknown: 'consulta' };
  function projectCard(project, r, question) {
    const attention = h.attentionReasons(project).length > 0, base = { project, question, offerEmail: r.offerEmail };
    let link = { module: 'portafolio', filters: { search: project.name, ...(isActive(project) ? {} : { portfolioScope: 'closed' }) }, openProjectId: project.id };
    if (r.topic === 'risk' && attention) link = { module: 'atencion', filters: { search: project.name } };
    if (r.topic === 'finance') link = { module: 'finanzas', filters: { search: project.name } };
    if (r.topic === 'dates' && isActive(project)) link = { module: 'cronograma', filters: { search: project.name } };
    const source = { status: 'Estatus, % Avance Real, % Avance Plan, Fase, Riesgos y Fin Plan', update: 'bitácora del proyecto', risk: 'Riesgo / Bloqueo y Acción / decisión requerida', finance: 'campos financieros de monday', dates: 'Inicio, Fin Plan y Fin Real / bitácora', changes: 'línea base del lunes vs. corte actual' }[r.topic] || 'tablero de proyectos';
    return { title: project.name + ' · ' + (TOPIC_LABEL[r.topic] || 'consulta'), text: r.text, source, ...link, ...base, ...(r.topic === 'unknown' ? { suggest: suggestions('', project), understood: false } : {}) };
  }

  function ask(question, context = {}) {
    const raw = String(question || '').trim().slice(0, 240), q = canonical(raw);
    if (!q) return null;
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|gracias|ok|listo)\b/.test(q) && words(q).length <= 3) return { title: 'Cosmo', text: 'Hola. Pregúntame por un proyecto, un PM, fechas, riesgos o qué cambió desde el lunes.', question: raw, suggest: suggestions('', null) };
    const found = findProject(raw), pm = findPm(q, context);
    if (found.ambiguous) return { title: 'Varios proyectos coinciden', text: '¿A cuál te refieres?', question: raw, suggest: found.ambiguous.map(item => ({ label: item.name, page: { type: 'project', id: item.id } })) };
    if (!found.project && has(q, /\b(mis|mios|mias)\b/) && !context.myPm) return { title: 'Mis proyectos', text: 'Aún no sé quién eres. Elige tu nombre en Mi muelle y vuelve a preguntar.', question: raw, suggest: suggestions(q, null) };
    // Portfolio-wide calculated questions come before the project context of a previous question.
    const followUp = context.project && has(q, /(su|sus|ese|este proyecto|del proyecto)/);
    if (!found.project && !followUp) {
      const ch = has(q, /\b(cambio|cambios|cambiaron|cambiado)\b/) || has(q, /\bdesde el lunes\b/);
      if (ch && guide) { context.project = null; return { ...guide.answer({ type: 'answer', topic: 'weekly-changes' }), question: raw }; }
      let topic = null;
      if (has(q, /\b(sin actualizar|sin actualizacion|sin actualizaciones|desactualizad\w*|sin comentarios?|sin novedades|abandonad\w*)\b/)) topic = 'alerts-stale';
      else if (has(q, /\b(por debajo|bajo el plan|rezagad\w*|avance bajo|atrasados en avance|menos avance)\b/)) topic = 'alerts-behind';
      else if (has(q, /\b(quien tiene mas|mas (proyectos|iniciativas)|mas cargado|mayor carga|carga de trabajo)\b/) || has(q, /\bpms? con mas\b/)) topic = 'alerts-pm';
      if (topic && guide) { context.project = null; return { ...alertAnswer(topic, topic === 'alerts-pm' ? null : pm), question: raw }; }
      if (has(q, /\b(vence|vencen|vencera|venceran|por vencer|terminan|finalizan|fin plan)\b/)) { context.project = null; const r = dueAnswer(q, pm); return { ...r, question: raw }; }
      if (has(q, /\balertas?\b/) && !has(q, /\briesgos?\b/) && guide) {
        context.project = null;
        const { STALE_DAYS, LOW_PROGRESS, SOON_DAYS } = guide.rules;
        return { title: 'Alertas calculadas', text: ['Sin comentario en la bitácora hace más de ' + STALE_DAYS + ' días: ' + guide.alerts.stale().length, 'Fin Plan en los próximos ' + SOON_DAYS + ' días: ' + guide.alerts.soon().length, 'Avance real ' + LOW_PROGRESS + ' p.p. o más bajo el plan: ' + guide.alerts.behind().length].join('\n') + '\nElige una para ver el detalle.', question: raw, suggest: guide.options({ type: 'alerts' }) };
      }
    }
    const r = answer(raw, context);
    if (r.topic === 'ambiguous') return { title: 'Varios proyectos coinciden', text: '¿A cuál te refieres?', question: raw, suggest: r.candidates.map(item => ({ label: item.name, page: { type: 'project', id: item.id } })) };
    if (r.project) return projectCard(r.project, r, raw);
    if (r.topic === 'unknown') return { title: 'No entendí la pregunta', text: r.text, question: raw, understood: false, suggest: suggestions(q, null) };
    return { title: r.title || 'Cartera', text: r.text, module: r.module || 'portafolio', filters: r.filters || {}, source: r.source, scrollTarget: r.scrollTarget, question: raw };
  }

  return { answer, ask, findProject, findPm, projectAnswer, portfolioAnswer, canonical };
});
