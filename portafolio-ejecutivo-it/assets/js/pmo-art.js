/*
 * pmo-art.js v3: escenas de papel para Riesgos y decisiones (mesa de despacho), Portafolio (carta náutica), Cronograma
 * (marea y tablero de arribos), Finanzas (frascos del tesoro) y Mi muelle (pasaporte), en movimiento permanente.
 * Requiere cosmos-paper-fx 2.5+, portal-fx.js (window.cosmosFx) y pmo-data.js. Cargar después de pmo-av.js.
 * Cada diorama REEMPLAZA la fila de gráficos del módulo (section.grid.module-charts). Los gráficos originales no se borran:
 * quedan ocultos y el botón "Ver gráficos" los vuelve a mostrar. Filtros y tablas del portal no se tocan.
 * Los números salen de los MISMOS filtros y funciones del portal (applyCommonFilters, attentionReasons, scheduleBucket,
 * hasFinancialData, filtered, num, val, C). No cambia datos ni indicadores.
 * Apagar todo: window.PMO_ART = { off: true }; o un módulo: window.PMO_ART = { finanzas: false }.
 */
(function () {
  'use strict';
  const cfg = Object.assign({ muelle: true, atencion: true, portafolio: true, cronograma: true, finanzas: true, cardClass: 'card pad' }, window.PMO_ART || {});
  if (cfg.off) return;
  const fx = window.cosmosFx;
  if (!fx || typeof fx.despacho !== 'function' || typeof fx.faro !== 'function' || !window.PMOData) { console.warn('[pmo-art] Falta cosmos-paper-fx 2.5 o PMOData; se omiten las escenas de módulo.'); return; }
  const g = name => { try { return (0, eval)(name); } catch (e) { return undefined; } };
  const safe = (fn, label) => function () { try { return fn.apply(this, arguments); } catch (e) { console.warn('[pmo-art] ' + label + ' omitido.', e); } };
  let data = null, snapshot = null;
  const getData = () => {
    const current = g('D');
    if (!data || current !== snapshot) { data = PMOData.build(); snapshot = current; }
    return data;
  };
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const todayLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const spoken = iso => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00Z'));
  const open = id => { if (typeof window.openProject === 'function') window.openProject(id); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const joinY = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : (a[0] || '');

  // Íconos de leyenda (SVG en línea, mismos colores del diorama)
  const I = {
    box: c => '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="1" y="2" width="16" height="10" rx="2" fill="' + c + '" stroke="#021E2F" stroke-width=".8"/><rect x="3" y="5" width="12" height="4" rx="1" fill="#FFF8EC"/></svg>',
    chain: '<svg viewBox="0 0 18 14" aria-hidden="true"><ellipse cx="5" cy="7" rx="4" ry="2.6" fill="none" stroke="#8E3526" stroke-width="1.6"/><ellipse cx="13" cy="7" rx="4" ry="2.6" fill="none" stroke="#8E3526" stroke-width="1.6"/></svg>',
    booth: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M2 6 9 1l7 5z" fill="#A44737"/><rect x="3" y="6" width="12" height="7" fill="#2E3E47"/><text x="9" y="12.2" font-size="7" font-weight="900" text-anchor="middle" fill="#F2A08F">?</text></svg>',
    hull: c => '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M1 5h16l-3 7H4z" fill="' + c + '" stroke="#021E2F" stroke-width=".8"/></svg>',
    ribs: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M2 12h14M4 12V4M7 12V3M10 12V3M13 12V4" stroke="#7A5A3C" stroke-width="1.4" fill="none"/></svg>',
    flag: c => '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M3 1v12" stroke="#021E2F" stroke-width="1.2"/><path d="M3 2h11l-3 3 3 3H3z" fill="' + c + '"/></svg>',
    sail: c => '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M9 1v10M9 2l6 8H9z" stroke="#021E2F" stroke-width=".8" fill="' + c + '"/><path d="M3 11h13l-2 2H5z" fill="#2B4A5C"/></svg>',
    fog: '<svg viewBox="0 0 18 14" aria-hidden="true"><ellipse cx="6" cy="8" rx="5" ry="3.4" fill="#C9D2D6"/><ellipse cx="12" cy="7" rx="5.5" ry="4" fill="#DCE3E6"/></svg>',
    beam: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M4 13V4h3v9z" fill="#F6EEDD" stroke="#021E2F" stroke-width=".7"/><path d="M7 5 17 1v8z" fill="#F5D98C" opacity=".8"/></svg>',
    buoy: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M6 12 9 2l3 10z" fill="#C0604E" stroke="#021E2F" stroke-width=".7"/><rect x="5" y="11" width="8" height="2" fill="#2B4A5C"/></svg>',
    tank: c => '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="3" y="1" width="12" height="12" rx="3" fill="#F6EEDD" stroke="#021E2F" stroke-width=".8"/><rect x="4" y="7" width="10" height="5" rx="1.5" fill="' + c + '"/></svg>',
    line: c => '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M1 7h16" stroke="' + c + '" stroke-width="2" stroke-dasharray="3 2"/></svg>',
    pipe: '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="1" y="5" width="16" height="5" rx="2" fill="#8FA3AC"/><path d="M3 7.5h3M9 7.5h3" stroke="#FFF8EC" stroke-width="1.4"/></svg>',
    stamp: '<svg viewBox="0 0 18 14" aria-hidden="true"><circle cx="9" cy="7" r="5.5" fill="none" stroke="#2F755F" stroke-width="1.6"/></svg>',
    dash: '<svg viewBox="0 0 18 14" aria-hidden="true"><circle cx="9" cy="7" r="5.5" fill="none" stroke="#9AA7AD" stroke-width="1.3" stroke-dasharray="2 2"/></svg>',
    ribbon: c => '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="2" y="1" width="14" height="12" rx="1.5" fill="#FBF6EC" stroke="#021E2F" stroke-width=".8"/><rect x="2" y="1" width="14" height="4" fill="' + c + '"/></svg>',
    detenido: '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="1.5" y="3" width="15" height="8" fill="none" stroke="#B2493A" stroke-width="1.4" transform="rotate(-10 9 7)"/></svg>',
    ask: '<svg viewBox="0 0 18 14" aria-hidden="true"><circle cx="9" cy="7" r="5.6" fill="#FDF1EE" stroke="#162631" stroke-width=".8"/><text x="9" y="10" font-size="8" font-weight="900" text-anchor="middle" fill="#B2493A">?</text></svg>',
    gate: '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="3" y="1" width="3" height="9" rx="1" fill="#1F2A30"/><circle cx="4.5" cy="3.5" r="1.2" fill="#FF6E5A"/><rect x="9" y="3" width="4" height="11" fill="#7A5A3C" stroke="#021E2F" stroke-width=".6"/><path d="M13 9h5v5h-5z" fill="#A9C7CF"/></svg>',
    anchor: '<svg viewBox="0 0 18 14" aria-hidden="true"><g fill="none" stroke="#2F755F" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="2.6" r="1.4"/><path d="M9 4v8.5M6 6h6M4 8.5c.5 3 3 3.8 5 3.8s4.5-.8 5-3.8"/></g></svg>',
    hullMini: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M2 6h6v7H5z" fill="#8FA3AC" stroke="#021E2F" stroke-width=".6"/><path d="M9 6v7M11.5 6v7M14 6v6M2 6h14" stroke="#8C6A48" stroke-width="1.2"/></svg>',
    tide: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M1 13V9c3-5 5-5 8-1s5 1 8-3v8z" fill="#8FB7C4" stroke="#003D53" stroke-width="1"/></svg>',
    lighthouse: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M3 13 4.3 3h3.4L9 13z" fill="#FFF8EC" stroke="#021E2F" stroke-width=".6"/><path d="M3.6 9h4.8M4 6h4" stroke="#B2493A" stroke-width="1.6"/><path d="M8 3.5 17 .5v6z" fill="#F5D98C" opacity=".85"/></svg>',
    flapY: '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="1" y="1" width="16" height="12" rx="2" fill="#14252F"/><text x="9" y="10" font-size="8" font-weight="800" text-anchor="middle" fill="#F5D98C">7D</text></svg>',
    flapR: '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x="1" y="1" width="16" height="12" rx="2" fill="#14252F"/><text x="9" y="10" font-size="7" font-weight="800" text-anchor="middle" fill="#F2A08F">VEN</text></svg>',
    coins: (c, e) => '<svg viewBox="0 0 18 14" aria-hidden="true"><ellipse cx="9" cy="10" rx="6" ry="2.4" fill="' + c + '" stroke="' + e + '"/><ellipse cx="9" cy="6.5" rx="6" ry="2.4" fill="' + c + '" stroke="' + e + '"/></svg>',
    crane: '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M4 14V2h11" stroke="#A9825F" stroke-width="2" fill="none"/><path d="M12 2v6" stroke="#162631" stroke-width=".8"/><path d="M10 8h4l1 4h-6z" fill="#B8946A" stroke="#162631" stroke-width=".6"/></svg>'
  };

  // Mismo conjunto de proyectos que muestra cada módulo (réplica exacta de los filtros del portal).
  function viewItems(view) {
    const D = g('D'), st = g('state') || {}, nq = g('normalizeQuery') || (s => String(s || '').toLowerCase()), acf = g('applyCommonFilters'), ar = g('attentionReasons'), sb = g('scheduleBucket'), act = g('active');
    const search = i => !st.search || nq(i.name).includes(nq(st.search));
    if (view === 'atencion') {
      const issue = i => !st.issue || (st.issue === 'Bloqueos' && ar(i).some(x => x.startsWith('Bloqueo:'))) || (st.issue === 'Riesgos' && ar(i).some(x => x.startsWith('Riesgo:'))) || (st.issue === 'Plazos vencidos' && ar(i).includes('Fin Plan vencido'));
      return acf(D.items.filter(i => ar(i).length), { priority: true, pm: true }).filter(search).filter(issue);
    }
    if (view === 'portafolio') return g('filtered')();
    if (view === 'cronograma') return acf(D.items.filter(act), { pm: true, phase: true }).filter(search).filter(i => !st.schedule || sb(i) === st.schedule);
    if (view === 'finanzas') return acf(D.items.filter(g('hasFinancialData')), { status: true, priority: true, pm: true }).filter(search);
    return null;
  }
  const toProjects = items => { const d = getData(); if (!items) return d.projects; const ids = new Set(items.map(i => String(i.id))); return d.projects.filter(p => ids.has(p.id)); };
  const countBy = (arr, fn) => { const m = {}; arr.forEach(x => { const k = fn(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };

  // ------------------------------------------------------------------ titulares (el mensaje de cada módulo)
  function headAtencion(ps, items) {
    const val = g('val'), C = g('C') || {}, n = ps.length;
    const blk = ps.filter(p => (p.reasons || []).some(r => r.startsWith('Bloqueo:'))).length, rsk = ps.filter(p => (p.reasons || []).some(r => r.startsWith('Riesgo:'))).length,
      late = ps.filter(p => (p.reasons || []).includes('Fin Plan vencido')).length;
    const prio = val && C.priority ? countBy(items || [], i => val(i, C.priority) || 'Sin prioridad') : [];
    return {
      title: 'La mesa de despacho',
      sub: 'Cada expediente requiere seguimiento. La compuerta permanece cerrada mientras haya asuntos pendientes.',
      msg: n ? '<em>' + plural(n, 'proyecto requiere', 'proyectos requieren') + '</em> atención sobre la mesa' : 'Mesa despejada: ningún proyecto requiere atención',
      pills: [blk && { text: plural(blk, 'bloqueo', 'bloqueos'), tone: 'red' }, rsk && { text: plural(rsk, 'riesgo', 'riesgos'), tone: 'amber' }, late && { text: late + ' con Fin Plan vencido', tone: 'amber' }]
        .concat(prio.map(([k, v]) => ({ text: 'Prioridad ' + k + ': ' + v, tone: /critical/i.test(k) ? 'red' : /high|alta/i.test(k) ? 'amber' : 'blue' }))),
      key: [{ svg: I.ribbon('#B2493A') + I.detenido, text: 'Cinta roja y sello DETENIDO: bloqueo' }, { svg: I.ribbon('#D69A3C'), text: 'Cinta ámbar: riesgo' }, { svg: I.ribbon('#C2633F'), text: 'Cinta óxido: Fin Plan vencido' }, { svg: I.gate, text: 'Compuerta cerrada: atención pendiente' }],
      empty: 'Con estos filtros, ningún proyecto requiere atención'
    };
  }
  function headPortafolio(ps) {
    const by = s => ps.filter(p => String(p.status).toLowerCase() === s).length, closed = by('cerrado'), proc = by('en proceso'), plan = by('planificado'), other = ps.length - closed - proc - plan;
    const act = ps.filter(p => p.active), noPhase = act.filter(p => !p.phase || p.phase === 'Sin fase').length, pm = countBy(act, p => p.pmFirst || 'Sin PM');
    const crit = act.filter(p => /critical/i.test(p.priority || '')).length, flag = act.filter(p => p.risk).length;
    const parts = [closed && plural(closed, 'entregado', 'entregados'), proc && proc + ' en curso', plan && plan + ' por arrancar', other && other + ' en otro estatus'].filter(Boolean);
    return {
      title: 'La carta náutica',
      sub: 'Cada isla es un PM y crece con sus proyectos. El casco muestra la fase: cuanto más completo, más avanzada. Clic en el nombre de una isla filtra la tabla.',
      msg: '<em>' + plural(ps.length, 'proyecto', 'proyectos') + '</em>' + (parts.length ? ': ' + joinY(parts) : ''),
      pills: [closed && { text: 'Cerrado: ' + closed, tone: 'green' }, proc && { text: 'En Proceso: ' + proc, tone: 'blue' }, plan && { text: 'Planificado: ' + plan, tone: 'amber' }, other && { text: 'Otro estatus: ' + other },
        pm[0] && { text: 'Más activos: ' + pm.filter(x => x[1] === pm[0][1]).map(x => x[0].split(' ')[0]).join(' y ') + ' (' + pm[0][1] + ')', tone: 'blue' }, crit && { text: crit + ' activos Critical', tone: 'red' }, flag && { text: flag + ' requieren atención', tone: 'amber' }, noPhase && { text: noPhase + ' sin fase registrada', tone: 'red' }],
      key: [{ svg: I.anchor, text: 'Ancla: entregado' }, { svg: I.hullMini, text: 'Casco a medio construir: en curso, según su fase' }, { svg: I.dash, text: 'Círculo punteado: por zarpar' }, { svg: I.flag('#D69A3C'), text: 'Banderín: bloqueo, riesgo o Fin Plan vencido' }]
    };
  }
  function headCronograma(ps, today) {
    const withPlan = ps.filter(p => p.plan).sort((a, b) => a.plan.localeCompare(b.plan)), next = withPlan.find(p => p.plan >= today);
    const lim = new Date(new Date(today + 'T12:00:00Z').getTime() + 90 * 864e5).toISOString().slice(0, 10);
    const in90 = withPlan.filter(p => p.plan >= today && p.plan <= lim).length, over = withPlan.filter(p => p.plan < today).length, noPlan = ps.filter(p => !p.plan).length, ok = withPlan.length - over, d = getData();
    return {
      title: 'Marea de cierres y tablero de arribos',
      sub: 'El faro marca hoy. La marea sube con los Fin Plan de cada mes y el tablero cuenta los días que faltan para cada arribo.',
      msg: next ? 'Próximo fin planificado: <em>' + esc(next.name) + '</em>, el ' + spoken(next.plan) : 'No hay fines planificados en la vista',
      pills: [ok && { text: 'Fin Plan vigente: ' + ok, tone: 'green' }, over && { text: 'Fin Plan vencido: ' + over, tone: 'red' }, noPlan && { text: 'Sin Fin Plan: ' + noPlan, tone: 'amber' }, { text: plural(in90, 'fin planificado', 'fines planificados') + ' en 90 días', tone: 'blue' }],
      cta: noPlan && d.boardUrl ? { label: 'Completar Fin Plan en monday', href: d.boardUrl } : null,
      key: [{ svg: I.lighthouse, text: 'Faro: hoy' }, { svg: I.tide, text: 'Altura de la marea: cierres del mes' }, { svg: I.flapY, text: 'Amarillo: 7 días o menos' }, { svg: I.flapR, text: 'Rojo: vencido o sin Fin Plan' }]
    };
  }
  // Monday ya no tiene Beneficios proyectados y todavía no registra la moneda. Los importes
  // siguen en la tabla por proyecto: esta escena reutiliza el conteo de cobertura del gráfico.
  function finCoverage(items) {
    const C = g('C'), num = g('num'), hasColumn = g('hasColumn');
    const fields = [
      ['CAPEX', C.capex, '#CBA785'], ['CAPEX comprometido', C.capexCommitted, '#8FAFBF'],
      ['CAPEX ejecutado', C.capexExecuted, '#BDA558'], ['OPEX anual', C.opexAnnual, '#8BA0AA'],
      ['Desviación presup.', C.budgetDeviation, '#9A7B68']
    ].filter(([, id]) => id && hasColumn(id)).map(([label, id, color]) => ({ label, id, count: items.filter(i => num(i, id) !== null).length, color }));
    return { fields, total: items.length };
  }
  function headFinanzas(f) {
    const capex = f.fields.find(x => x.label === 'CAPEX'), d = getData();
    return {
      title: 'Los frascos del registro financiero',
      sub: 'Cada frasco muestra cuántos proyectos tienen el campo completo en monday. Los importes se consultan por proyecto.',
      msg: capex ? '<em>' + capex.count + ' de ' + f.total + '</em> proyectos con CAPEX registrado' : 'No hay campo CAPEX disponible en este corte',
      pills: f.fields.map(x => ({ text: x.label + ': ' + x.count, tone: x.count ? 'blue' : 'amber' })),
      cta: f.fields.some(x => x.count < f.total) && d.boardUrl ? { label: 'Completar datos en monday', href: d.boardUrl } : null,
      key: [{ svg: I.coins('#E3BE62', '#9C7A2E'), text: 'Nivel del frasco: proyectos con dato' }, { svg: I.crane, text: 'Grúa: el registro sigue avanzando' }],
      note: 'La moneda no está definida en monday; por eso no se suman importes.'
    };
  }

  // ------------------------------------------------------------------ montaje: el diorama reemplaza la fila de gráficos
  const classic = {}; // vista → mostrar gráficos originales
  function place(main, view) {
    if (main.querySelector('.pav-art-slot')) return null;
    const charts = main.querySelector('section.grid.module-charts'), s = document.createElement('div'); s.className = 'pav-art-slot';
    if (charts) { charts.before(s); charts.classList.add('pav-charts-classic'); charts.hidden = !classic[view]; }
    else { const anchor = main.querySelector('.module-filters') || main.querySelector('.heading'); if (!anchor) return null; anchor.after(s); }
    return { slot: s, charts };
  }
  function toggleBtn(view, charts) {
    if (!charts) return null;
    return { label: classic[view] ? 'Ocultar gráficos' : 'Ver gráficos', pressed: !!classic[view], onClick: (btn) => { classic[view] = !classic[view]; charts.hidden = !classic[view]; btn.textContent = classic[view] ? 'Ocultar gráficos' : 'Ver gráficos'; btn.setAttribute('aria-pressed', String(!!classic[view])); } };
  }
  function coverageFrascos(slot, f, h, items) {
    const box = document.createElement('section'); box.className = cfg.cardClass + ' pav-scene pav-fin-coverage'; box.setAttribute('aria-label', h.title);
    const acts = (h.actions || []).filter(Boolean);
    box.innerHTML = '<div class="split-title"><div><h2 class="section-title">' + esc(h.title) + '</h2><p class="pav-scene-sub">' + esc(h.sub) + '</p></div>' +
      '<div class="pav-scene-acts">' + acts.map((a, n) => '<button type="button" class="pav-scene-ghost" data-act="' + n + '" aria-pressed="' + !!a.pressed + '">' + esc(a.label) + '</button>').join('') +
      (h.cta ? '<a class="pav-scene-cta" href="' + esc(h.cta.href) + '" target="_blank" rel="noreferrer">' + esc(h.cta.label) + ' ↗</a>' : '') + '</div></div>' +
      '<p class="pav-scene-msg">' + h.msg + '</p><div class="pav-scene-pills">' + (h.pills || []).filter(Boolean).map(x => '<span class="pill ' + esc(x.tone || '') + '">' + esc(x.text) + '</span>').join('') + '</div>' +
      '<div class="pav-fin-stage pav-scene-stage"><div class="pav-fin-crane" aria-hidden="true"><i class="mast"></i><i class="arm"></i><i class="cable"></i><i class="sack"></i></div><div class="pav-fin-jars">' +
      f.fields.map(x => '<button type="button" class="pav-fin-jar" aria-label="' + esc(x.label + ': ' + x.count + ' de ' + f.total + ' proyectos con dato') + '" title="' + esc(x.label + ': ' + x.count + ' de ' + f.total) + '">' +
        '<div class="pav-fin-glass" style="--level:' + (f.total ? Math.round(x.count / f.total * 100) : 0) + '%;--fill-color:' + x.color + '"><i class="pav-fin-fill"></i><strong>' + x.count + '<small> / ' + f.total + '</small></strong></div><span>' + esc(x.label) + '</span></button>').join('') +
      '</div></div><div class="pav-scene-legend"><span>' + I.coins('#E3BE62', '#9C7A2E') + 'Nivel = proyectos con dato</span><span class="pav-scene-note">' + esc(h.note) + '</span></div>';
    slot.appendChild(box);
    box.querySelectorAll('[data-act]').forEach(button => button.addEventListener('click', () => { const action = acts[Number(button.dataset.act)]; if (action && action.onClick) action.onClick(button); }));
    const jars = [...box.querySelectorAll('.pav-fin-jar')], rows = [...document.querySelectorAll('#main .executive-table tbody tr')], num = g('num');
    jars.forEach((jar, index) => {
      const matches = items.map((item, row) => num(item, f.fields[index].id) !== null ? row : -1).filter(row => row >= 0);
      const hot = on => { jar.classList.toggle('pav-fin-hot', on); matches.forEach(row => rows[row] && rows[row].classList.toggle('pav-row-hot', on)); };
      jar.addEventListener('mouseenter', () => hot(true)); jar.addEventListener('mouseleave', () => hot(false));
      jar.addEventListener('focus', () => hot(true)); jar.addEventListener('blur', () => hot(false));
      jar.addEventListener('click', () => { if (matches.length === 1) open(items[matches[0]].id); else if (rows.length) rows[0].closest('table').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    });
    rows.forEach((row, index) => {
      row.addEventListener('mouseenter', () => jars.forEach((jar, field) => jar.classList.toggle('pav-fin-hot', num(items[index], f.fields[field].id) !== null)));
      row.addEventListener('mouseleave', () => jars.forEach(jar => jar.classList.remove('pav-fin-hot')));
    });
    const stage = box.querySelector('.pav-fin-stage'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const syncMotion = () => stage.classList.toggle('is-visible', visible && !document.hidden && !reduced.matches && !fx.reduced);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); syncMotion(); }) : null;
    if (io) io.observe(stage);
    document.addEventListener('visibilitychange', syncMotion);
    if (reduced.addEventListener) reduced.addEventListener('change', syncMotion);
    syncMotion();
    return { box, destroy() { if (io) io.disconnect(); document.removeEventListener('visibilitychange', syncMotion); if (reduced.removeEventListener) reduced.removeEventListener('change', syncMotion); box.remove(); } };
  }
  const told = {}; // un aviso de Cosmo por módulo y sesión
  function tell(view, text) { if (told[view] || !text) return; told[view] = 1; try { if (sessionStorage.getItem('pav-art-told-' + view)) return; sessionStorage.setItem('pav-art-told-' + view, '1'); } catch (e) { } setTimeout(() => { try { fx.emit('status', { text }); } catch (e) { } }, 1600); }
  const strip = html => String(html || '').replace(/<[^>]+>/g, '');

  // ------------------------------------------------------------------ Mi muelle: el pasaporte del puerto (solo sus proyectos)
  let personalObs = null, personalCurrent = null;
  function mountMuelle(main) {
    const dock = main.querySelector('#pav-personal-dock') || main.querySelector('.pav-muelle-slot'); if (!dock) return;
    const paint = safe(() => {
      const d = getData(); let st = {}; try { st = JSON.parse(localStorage.getItem(((fx.o && fx.o.storageKey) || 'cosmos-fx') + '-muelle') || '{}'); } catch (e) { }
      const who = st.who, person = who && window.CosmosFx.muellePeople ? window.CosmosFx.muellePeople(d).find(x => x.key === who) : null;
      const cut = String((g('D') || {}).extracted_at_utc || '');
      const prev = main.querySelector('.pav-art-personal'); if (prev && prev.dataset.who === String(who || '') && prev.dataset.cut === cut) return; if (prev) { if (prev._c) prev._c.destroy(); personalCurrent = null; prev.remove(); }
      if (!person) return;
      const mine = d.projects.filter(p => person.ids.includes(p.id)), act = mine.filter(p => p.active), yr = String(d.totals.year);
      const fmt = iso => iso ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso + 'T12:00:00Z')) : '';
      const done = mine.filter(p => !p.active && String(p.closedYear) === yr).map(p => Object.assign({}, p, { closedLabel: fmt(p.closedAt) || yr }));
      const roles = person.roles || [], role = roles.includes('sponsor') && roles.includes('pm') ? 'Sponsor y PM' : roles.includes('sponsor') ? 'Sponsor' : roles.includes('pm') ? 'Project manager' : 'Persona con actividad';
      const decide = act.filter(p => p.risk).length, noPlan = act.filter(p => p.noFinPlan).length;
      const slot2 = document.createElement('div'); slot2.className = 'pav-art-personal'; slot2.dataset.who = who; slot2.dataset.cut = cut; slot2.style.marginTop = '18px'; dock.after(slot2);
      slot2._c = fx.pasaporte(slot2, { pasaporte: { name: person.name, alias: st.alias, role, year: yr, cutLabel: d.cutLabel, done, active: act, decide } }, {
        cardClass: cfg.cardClass, onSelect: open,
        head: { title: 'Tu pasaporte del puerto', sub: 'Un sello por cada proyecto tuyo ejecutado en ' + yr + '. Los círculos punteados esperan su sello.',
          msg: '<em>' + plural(done.length, 'sello', 'sellos') + '</em> en ' + yr + (act.length ? ' y ' + plural(act.length, 'proyecto', 'proyectos') + ' por sellar' : ''),
          pills: [{ text: role, tone: 'blue' }, decide && { text: plural(decide, 'espera una decisión', 'esperan una decisión'), tone: 'red' }, noPlan && { text: noPlan + ' sin Fin Plan', tone: 'amber' }],
          key: [{ svg: I.stamp, text: 'Sello: ejecutado en el año' }, { svg: I.dash, text: 'Punteado: activo, por sellar' }, { svg: I.flag('#A44737'), text: '"!": riesgo o bloqueo' }] } });
      personalCurrent = slot2._c;
    }, 'pasaporte');
    paint();
    if (personalObs) personalObs.disconnect();
    personalObs = new MutationObserver(() => { clearTimeout(personalObs.t); personalObs.t = setTimeout(paint, 120); }); personalObs.observe(dock, { childList: true, subtree: true });
  }
  let current = null;
  function mount() {
    const main = document.getElementById('main'), view = (g('state') || {}).view; if (!main) return;
    if (current && !document.body.contains(current.box)) { current.destroy(); current = null; }
    if (personalCurrent && (view !== 'muelle' || !document.body.contains(personalCurrent.box))) { personalCurrent.destroy(); personalCurrent = null; }
    if (view !== 'muelle' && personalObs) { personalObs.disconnect(); personalObs = null; }
    if (!cfg[view]) return;
    if (view === 'muelle') return mountMuelle(main);
    if (!['atencion', 'portafolio', 'cronograma', 'finanzas'].includes(view)) return;
    const items = viewItems(view), pl = place(main, view); if (!pl) return;
    const st = g('state') || {}, filteredView = ['search', 'status', 'priority', 'pm', 'phase', 'schedule', 'issue'].some(k => st[k]);
    const o = { cardClass: cfg.cardClass, onSelect: open };
    const mark = h => { if (filteredView) { h.pills = [{ text: 'Vista filtrada' }].concat(h.pills || []); if (h.empty && !items.length) h.msg = h.empty; } const t = toggleBtn(view, pl.charts); if (t) h.actions = [t]; return h; };
    let h;
    if (view === 'atencion') { const ps = toProjects(items); h = mark(headAtencion(ps, items)); const dossiers = ps.map(p => Object.assign({}, p, { actionOwner: p.action || '' })); current = fx.despacho(pl.slot, { items: dossiers }, Object.assign(o, { head: h })); }
    else if (view === 'portafolio') { const ps = toProjects(items); h = mark(headPortafolio(ps)); const phases = g('orderedPhases') ? g('orderedPhases')({}).map(r => r[0]) : getData().phases;
      current = fx.carta(pl.slot, { items: ps, phases }, Object.assign(o, { head: h, onPM: grp => { const cnt = {}; grp.list.forEach(p => cnt[p.pm] = (cnt[p.pm] || 0) + 1); const pm = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; if (pm && typeof window.setFilter === 'function') window.setFilter('pm', pm); } })); }
    else if (view === 'cronograma') { const ps = toProjects(items), today = todayLima(); h = mark(headCronograma(ps, today)); current = fx.arribos(pl.slot, { items: ps, today }, Object.assign(o, { head: h })); }
    else if (view === 'finanzas') { const f = finCoverage(items || []); h = mark(headFinanzas(f)); current = coverageFrascos(pl.slot, f, h, items || []); }
    if (h) tell(view, strip(h.msg));
  }
  const css = document.createElement('style'); css.id = 'pmo-art-style';
  css.textContent = `.pav-art-slot{margin:0 0 18px}body.committee-mode .pav-art-slot{margin-bottom:24px}.pav-charts-classic[hidden]{display:none!important}
.pav-scene-acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.pav-scene-ghost{min-height:34px;padding:0 12px;border:1px solid #b7c5cc;background:#f7fafb;color:#17354a;font:700 12px/1.1 Figtree,'Segoe UI',sans-serif;cursor:pointer;transition:background-color .18s ease,border-color .18s ease,color .18s ease}
.pav-scene-ghost:hover{background:#eaf0f3;border-color:#7893a2}
.pav-scene-ghost:focus-visible{outline:3px solid #CBA785;outline-offset:2px}
.pav-scene-ghost[aria-pressed="true"]{background:#003d53;border-color:#003d53;color:#fff}
.pav-scene-cta{display:inline-flex;align-items:center;min-height:34px;color:#244a60;font-size:12px;font-weight:700;text-decoration-thickness:1px;text-underline-offset:3px}
.pav-scene-legend{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin-top:14px}
.pav-scene-legend>span:first-child{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto}
.pav-scene-legend>span:first-child svg{display:block;width:18px;height:14px;max-width:18px;max-height:14px;flex:0 0 18px}
.pav-scene-note{margin-left:auto;text-align:right;max-width:min(720px,65%)}
.pav-fin-stage{position:relative;min-height:305px;padding:80px 16px 18px;background:linear-gradient(150deg,#f4efe5,#e9ddca);border:1px solid #d4c2a9}
.pav-fin-jars{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:end;gap:14px;height:206px;position:relative;z-index:1}
.pav-fin-jar{min-width:0;display:grid;justify-items:center;align-content:end;gap:7px;text-align:center;font:700 12px/1.2 Figtree,'Segoe UI',sans-serif;color:#17354a;border:0;background:transparent;cursor:pointer}
.pav-fin-jar.pav-fin-hot .pav-fin-glass{outline:3px solid #003d53;outline-offset:3px;transform:translateY(-4px)}
.pav-fin-jar:focus-visible{outline:3px solid #CBA785;outline-offset:3px}
.pav-fin-jar>span{min-height:28px;display:grid;align-items:start}
.pav-fin-glass{position:relative;width:min(100%,116px);height:152px;border:3px solid #4d6167;border-top:10px solid #9f7a54;border-radius:8px 8px 18px 18px;overflow:hidden;background:rgba(255,255,255,.48);box-shadow:inset 4px 0 10px rgba(255,255,255,.75),5px 7px 0 rgba(32,48,54,.12)}
.pav-fin-fill{position:absolute;left:0;right:0;bottom:0;height:var(--level);background:var(--fill-color);opacity:.82;box-shadow:inset 0 7px 0 rgba(255,255,255,.22)}
.pav-fin-fill:after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 8px 3px at 9px 9px,rgba(255,255,255,.45) 98%,transparent) 0 0/28px 18px;opacity:.65}
.pav-fin-glass strong{position:absolute;inset:0;display:grid;place-content:center;font:800 26px/1 Figtree,'Segoe UI',sans-serif;color:#112b40;text-shadow:0 1px 0 #fff,0 0 9px #fff;font-variant-numeric:tabular-nums}
.pav-fin-glass strong small{font-size:13px}
.pav-fin-crane{position:absolute;left:14px;top:6px;width:190px;height:85px;z-index:2;pointer-events:none;color:#9e7855}
.pav-fin-crane .mast{position:absolute;left:12px;top:0;width:9px;height:75px;background:currentColor}
.pav-fin-crane .arm{position:absolute;left:13px;top:3px;width:164px;height:8px;background:currentColor;transform-origin:8px 50%}
.pav-fin-crane .cable{position:absolute;left:154px;top:10px;width:2px;height:34px;background:#334b53;transform-origin:top}
.pav-fin-crane .sack{position:absolute;left:141px;top:39px;width:27px;height:25px;background:#b99568;clip-path:polygon(17% 0,83% 0,100% 100%,0 100%);box-shadow:inset 0 4px 0 #e2c9a5}
.pav-fin-stage.is-visible .pav-fin-crane .cable,.pav-fin-stage.is-visible .pav-fin-crane .sack{animation:pav-fin-load 4.5s ease-in-out infinite}
.pav-fin-stage.is-visible .pav-fin-fill:after{animation:pav-fin-shimmer 7s linear infinite}
@keyframes pav-fin-load{0%,100%{transform:translateY(-4px)}50%{transform:translateY(13px)}}
@keyframes pav-fin-shimmer{to{background-position:28px 0}}
@media(max-width:680px){.pav-fin-jars{grid-template-columns:repeat(3,minmax(0,1fr));height:auto;row-gap:18px}.pav-fin-stage{padding-top:82px}.pav-fin-glass{height:126px}}
@media(max-width:420px){.pav-fin-jars{grid-template-columns:repeat(2,minmax(0,1fr))}.pav-fin-crane{transform:scale(.8);transform-origin:left top}.pav-scene-note{margin-left:0;max-width:none;text-align:left}}
@media(prefers-reduced-motion:reduce){.pav-fin-crane .cable,.pav-fin-crane .sack,.pav-fin-fill:after{animation:none!important}}
@media print{.pav-charts-classic[hidden]{display:grid!important}.pav-fin-stage{display:none}}`;
  document.head.appendChild(css);
  const after = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { const r = o.apply(this, arguments); safe(fn, name)(); return r; }; };
  after('render', mount);
  safe(mount, 'montaje')();
  window.pmoArt = { mount, viewItems };
})();
