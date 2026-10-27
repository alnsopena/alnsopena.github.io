/* Diagnóstico adicional. No decide qué proyectos requieren atención. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PMORiskDiagnostics = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const origins = ['Proveedor', 'Área usuaria', 'Sponsor / Gerencia', 'Equipo TI'];
  const unclassified = 'Sin clasificar', dayMs = 86400000;
  function origin(item) {
    const text = typeof item?.origenRiesgo === 'string' ? item.origenRiesgo.trim() : '';
    return origins.includes(text) ? text : '';
  }
  function matchesOrigin(item, selected) {
    return !selected || (selected === unclassified ? !origin(item) : origin(item) === selected);
  }
  function dayNumber(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const stamp = Date.parse(date + 'T00:00:00Z');
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === date ? stamp / dayMs : null;
  }
  function cutDay(cut) {
    if (typeof cut !== 'string' || !cut.trim()) return null;
    const date = new Date(cut);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const get = type => parts.find(part => part.type === type).value;
    return dayNumber(get('year') + '-' + get('month') + '-' + get('day'));
  }
  function daysLate(item, cut, C, val) {
    if (val(item, C.status) === 'Cerrado') return 0;
    const plan = dayNumber(val(item, C.plan)), today = cutDay(cut);
    return plan === null || today === null ? null : Math.max(today - plan, 0);
  }
  function shortDate(date) {
    const day = dayNumber(date);
    return day === null ? '' : new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(new Date(day * dayMs));
  }
  function businessWindow(cut) {
    const start = cutDay(cut);
    if (start === null) return null;
    let end = start, weekdays = 0;
    while (weekdays < 5) {
      end++;
      const day = new Date(end * dayMs).getUTCDay();
      if (day !== 0 && day !== 6) weekdays++;
    }
    return { start, end };
  }
  function preventive(items, cut, C, val) {
    const window = businessWindow(cut), excluded = ['Despliegue', 'Estabilización', 'Cierre'];
    if (!window) return [];
    return items.filter(item => {
      const plan = dayNumber(val(item, C.plan));
      const weekday = plan === null ? null : new Date(plan * dayMs).getUTCDay();
      return val(item, C.status) !== 'Cerrado' && plan !== null && weekday !== 0 && weekday !== 6 && plan > window.start && plan <= window.end && !excluded.includes(val(item, C.phase));
    }).sort((a, b) => val(a, C.plan).localeCompare(val(b, C.plan)) || a.name.localeCompare(b.name, 'es'));
  }
  function distribution(items) {
    const total = items.length;
    const groups = origins.map(label => {
      const count = items.filter(item => origin(item) === label).length;
      return { label, count, share: total ? count / total * 100 : 0 };
    });
    const missing = items.filter(item => !origin(item)).length;
    return { total, groups, missing, allUnclassified: total > 0 && missing === total };
  }
  function conclusion(items, cut, C, val) {
    const counts = distribution(items);
    if (!counts.total) return 'Sin expedientes en atención';
    if (counts.allUnclassified) return 'Origen sin clasificar en monday';
    const late = items.map(item => daysLate(item, cut, C, val)).filter(days => days > 0);
    const start = counts.total + ' en atención' + (late.length ? ' · ' + late.length + ' con atraso (promedio ' + Math.round(late.reduce((a, b) => a + b, 0) / late.length) + ' días)' : '');
    const articles = ['del proveedor', 'del área usuaria', 'del sponsor / gerencia', 'del equipo TI'];
    const dependencies = counts.groups.flatMap((group, index) => group.count ? [group.count + ' ' + articles[index]] : []);
    return start + (dependencies.length ? '. Dependen: ' + dependencies.join(', ') : '') + (counts.missing ? '. ' + counts.missing + ' sin origen clasificado' : '') + '.';
  }
  return { origins, unclassified, origin, matchesOrigin, dayNumber, cutDay, shortDate, daysLate, businessWindow, preventive, distribution, conclusion };
});
