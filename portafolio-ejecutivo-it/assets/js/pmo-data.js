/*
 * PMOData: contrato de datos para los componentes audiovisuales de COSMOS Paper FX.
 * Lee el snapshot de monday (D) y las funciones que YA existen en el portal
 * (val, num, C, active, attentionReasons, scheduleBucket, closureInfo, regularizationIssues,
 *  weeklyMilestones, orderedPhases, pmColor). No recalcula indicadores: solo los reúne.
 * Si alguna función no existe, esa parte del contrato queda vacía y el componente lo tolera.
 */
(function () {
  'use strict';
  const has = name => typeof window[name] === 'function' || (typeof globalThis[name] === 'function');
  const call = (name, ...a) => { try { const f = window[name] || (0, eval)(name); return typeof f === 'function' ? f(...a) : null; } catch (e) { return null; } };
  const tz = 'America/Lima';
  const dLabel = x => { if (!x) return ''; const d = new Date(String(x).length === 10 ? x + 'T12:00:00Z' : x); return isNaN(d) ? '' : new Intl.DateTimeFormat('es-PE', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric' }).format(d); };
  const dSpoken = x => { if (!x) return ''; const d = new Date(String(x).length === 10 ? x + 'T12:00:00Z' : x); return isNaN(d) ? '' : new Intl.DateTimeFormat('es-PE', { timeZone: tz, day: 'numeric', month: 'long' }).format(d); };
  const personFromEmail = s => {
    if (!s) return '';
    return String(s).split(/\s*,\s*/).map(x => /@/.test(x) ? x.split('@')[0].split(/[._-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : x).join(', ');
  };
  const weekLabel = (a, b) => { const f = new Intl.DateTimeFormat('es-PE', { timeZone: tz, day: 'numeric', month: 'long' }); const pa = f.formatToParts(a), pb = f.formatToParts(b), m = x => x.find(y => y.type === 'month').value, d = x => x.find(y => y.type === 'day').value; return m(pa) === m(pb) ? d(pa) + ' al ' + d(pb) + ' de ' + m(pb) : f.format(a) + ' al ' + f.format(b); };
  const firstPm = s => String(s || '').split(/\s*,\s*/)[0] || '';

  function build() {
    const G = (0, eval)('({D, C, val, num, active})');   // constantes del script principal del portal
    const { D, C, val, num, active } = G;
    const now = new Date(D.extracted_at_utc), year = now.getFullYear(), weekStart = new Date(now.getTime() - 7 * 86400000);
    const isBlock = r => r.startsWith('Bloqueo:');
    const projects = D.items.map(i => {
      const reasons = active(i) ? (call('attentionReasons', i) || []) : [];
      const plan = val(i, C.plan), forecast = val(i, C.forecast), closure = call('closureInfo', i);
      const issues = call('regularizationIssues', i) || [];
      const pm = val(i, C.pm) || '';
      return {
        id: String(i.id), name: i.name, url: i.url, status: val(i, C.status) || 'Sin estatus', active: active(i),
        phase: val(i, C.phase) || 'Sin fase', pm, pmFirst: firstPm(pm), pmColor: pm && has('pmColor') ? call('pmColor', firstPm(pm)) : null,
        sponsor: val(i, C.sponsor) || '', sponsorName: personFromEmail(val(i, C.sponsor)), priority: val(i, C.priority) || '',
        progress: num(i, C.progress), plan, planLabel: dLabel(plan), forecast, forecastLabel: dLabel(forecast),
        schedule: active(i) ? call('scheduleBucket', i) : null, noForecast: active(i) && !forecast,
        risk: reasons.some(isBlock) ? 'block' : reasons.some(r => r.startsWith('Riesgo:')) ? 'risk' : reasons.length ? 'late' : null,
        reasons, action: val(i, C.action) || '', actionOwner: val(i, C.actionOwner) || '', actionDate: val(i, C.actionDate) || '',
        provider: val(i, C.provider) || '', type: val(i, C.type) || '', situation: C.situation ? (val(i, C.situation) || '') : '',
        closedAt: closure && closure.date ? closure.date : null, closedYear: closure ? closure.year : null,
        issues: issues.map(x => ({ category: x.category, field: x.field, critical: !!x.critical }))
      };
    });
    const projectByItemId = new Map();
    D.items.forEach(item => {
      projectByItemId.set(String(item.id), String(item.id));
      (item.subitems || []).forEach(sub => projectByItemId.set(String(sub.id), String(item.id)));
    });
    const contributorMap = new Map();
    const addContributor = (name, itemId) => {
      const projectId = projectByItemId.get(String(itemId || ''));
      const cleanName = String(name || '').trim();
      if (!projectId || !cleanName || /miembro eliminado/i.test(cleanName)) return;
      const key = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (!key) return;
      const person = contributorMap.get(key) || { name: cleanName, ids: new Set() };
      person.ids.add(projectId);
      contributorMap.set(key, person);
    };
    (D.updates || []).forEach(update => {
      addContributor(update.creator && update.creator.name, update.item_id);
      (update.replies || []).forEach(reply => addContributor(reply.creator && reply.creator.name, update.item_id));
    });
    const contributors = [...contributorMap.values()]
      .map(person => ({ name: person.name, ids: [...person.ids] }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const act = projects.filter(p => p.active);
    // fases en el orden del tablero de monday
    const phaseMap = {}; act.forEach(p => { phaseMap[p.phase] = (phaseMap[p.phase] || 0) + 1; });
    let phases = (call('orderedPhases', phaseMap) || Object.entries(phaseMap)).map(x => x[0]);
    if (phaseMap['Sin fase'] && !phases.includes('Sin fase')) phases = ['Sin fase', ...phases];
    // decisiones: proyectos activos con motivos de atención (misma regla del portal)
    const decisions = act.filter(p => p.reasons.length).map(p => ({
      projectId: p.id, project: p.name, level: p.risk, reasons: p.reasons, action: p.action, owner: p.actionOwner, pm: p.pmFirst,
      date: p.actionDate, dateLabel: dLabel(p.actionDate), dateSpoken: dSpoken(p.actionDate)
    })).sort((a, b) => ({ block: 0, late: 1, risk: 2 }[a.level] ?? 3) - ({ block: 0, late: 1, risk: 2 }[b.level] ?? 3));
    const upcoming = act.filter(p => p.plan).sort((a, b) => a.plan.localeCompare(b.plan)).slice(0, 5)
      .map(p => ({ projectId: p.id, project: p.name, pm: p.pmFirst, pmColor: p.pmColor, date: p.plan, dateLabel: p.planLabel, dateSpoken: dSpoken(p.plan) }));
    const milestones = (call('weeklyMilestones', D.items) || []).map(m => ({ projectId: String(m.project.id), project: m.project.name, text: m.text, date: m.date, dateLabel: dLabel(m.date), author: m.author, pm: firstPm(val(m.project, C.pm)) }));
    const closedThisWeek = projects.filter(p => p.closedAt && new Date(p.closedAt + 'T12:00:00-05:00') >= weekStart && new Date(p.closedAt + 'T12:00:00-05:00') <= now);
    // aduana: un proyecto queda "despachado" cuando no tiene pendientes críticos en monday
    const groups = {};
    projects.forEach(p => {
      const key = p.pmFirst || 'PM sin dato', g = groups[key] || (groups[key] = { key, color: p.pmColor, total: 0, cleared: 0, projects: [] });
      const crit = p.issues.filter(x => x.critical).map(x => x.field), all = p.issues.map(x => x.field);
      g.total++; if (!crit.length) g.cleared++;
      g.projects.push({ id: p.id, name: p.name, status: p.status, cleared: !crit.length, critical: crit, missing: all });
    });
    const aduanaGroups = Object.values(groups).sort((a, b) => (b.total - b.cleared) - (a.total - a.cleared) || a.key.localeCompare(b.key, 'es'));
    const aduana = {
      mode: 'critical', groups: aduanaGroups, totalProjects: projects.length,
      clearedProjects: aduanaGroups.reduce((s, g) => s + g.cleared, 0),
      pendingProjects: aduanaGroups.reduce((s, g) => s + g.total - g.cleared, 0),
      criticalValues: projects.reduce((s, p) => s + p.issues.filter(x => x.critical).length, 0),
      allValues: projects.reduce((s, p) => s + p.issues.length, 0)
    };
    const closedYear = projects.filter(p => !p.active && String(p.closedYear) === String(year)).length;
    return {
      cut: D.extracted_at_utc, cutLabel: dLabel(D.extracted_at_utc), cutSpoken: dSpoken(D.extracted_at_utc),
      week: { from: weekStart.toISOString(), to: now.toISOString(), label: weekLabel(weekStart, now) },
      totals: {
        total: projects.length, active: act.length, closedYear, year,
        risk: act.filter(p => p.risk === 'risk').length, block: act.filter(p => p.risk === 'block').length,
        attention: decisions.length, noForecast: act.filter(p => p.noForecast).length
      },
      phases, projects, decisions, upcoming, milestones, closedThisWeek, aduana, contributors,
      baseline: call('baselineSummary', D.items), boardUrl: D.board && D.board.url
    };
  }
  window.PMOData = { build };
})();
