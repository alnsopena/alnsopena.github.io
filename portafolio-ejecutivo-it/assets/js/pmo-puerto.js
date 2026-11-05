/* Resumen: carga real del barco, sobre la API pública de dibujo Paper FX. */
(function (root) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PAGE = 18;
  const closed = (data, filter) => data.projects.filter(p => !p.active && String(p.status).toLowerCase() === 'cerrado' && String(p.closedYear) === String(data.totals.year) && (!filter || filter(p)));
  const label = p => p.initiativeClass === 'Quick win' ? 'Quick win' : 'Proyecto';
  const dateLabel = p => p.closedAt ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(p.closedAt + 'T12:00:00Z')) : String(p.closedYear);
  // Only berths with active work are drawn; an empty view keeps its route instead of an empty scene.
  const portData = (data, filter) => {
    const used = data.phases.filter(phase => data.projects.some(p => p.active && p.phase === phase && (!filter || filter(p))));
    return { ...data, phases: used.length ? used : data.phases.filter(phase => phase !== 'Cierre') };
  };
  const slots = count => Array.from({ length: count }, (_, index) => ({ col: index % 6, row: Math.floor(index / 6) }));
  const PRIORITIES = [['Critical', 'danger'], ['High', 'warn'], ['Medium', 'navy3'], ['Low', 'steel']];
  const priorityOf = item => PRIORITIES.find(([name]) => String(item.priority || '').toLowerCase().includes(name.toLowerCase()))?.[0] || '';
  const PRIORITY_SCALE = { Critical: 1.6, High: 1.25, Medium: 1, Low: .8 };
  // monday values stay in English for colors and sizes; the reader sees them in Spanish.
  const PRIORITY_LABELS = { Critical: 'Crítica', High: 'Alta', Medium: 'Media', Low: 'Baja' };
  const priorityLabel = value => PRIORITY_LABELS[priorityOf({ priority: value })] || value;
  const priorityScale = item => (item.active && PRIORITY_SCALE[priorityOf(item)]) || 1;
  // Overdue dates are not shown in the dock: only risks and blocks get a flag and a surprised face.
  const faceFlags = item => ({ risk: (item.reasons || []).some(reason => /^(Riesgo|Bloqueo):/.test(reason)) });
  // The engine's face cannot be configured from outside, so the expression is drawn over it, on the same face panel.
  function paintFaces(scene, pen) {
    const pal = root.CosmosFx?.draw?.PAL, ctx = pen?.ctx;
    if (!pal || !ctx || scene.mob) return;
    scene.items.forEach(item => {
      const { risk } = faceFlags(item), at = scene.cur?.[item.id];
      if (!risk || !at) return;
      const u = at.u, patch = (x, y, rx, ry, color) => { ctx.beginPath(); ctx.ellipse(x * u, y * u, rx * u, ry * u, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
      ctx.save(); ctx.translate(at.x, at.y);
      patch(0, -1.42, .42, .22, pal.cream); patch(0, -1.36, .17, .21, pal.ink);
      ctx.restore();
    });
  }
  // Quick win = 20-foot container, project = 40-foot. Both keep the engine box's height, face and ink;
  // the short one lays its ribs out again at its own width, so it is not a squeezed long box.
  const isShort = p => p?.initiativeClass === 'Quick win';
  const SHORT_HALF = 1.9, LONG_HALF = 3;
  // Stowage: long containers go below and short ones on top, as on a real stack (never a 40 on a 20).
  const stowOrder = items => items.filter(p => !isShort(p)).concat(items.filter(isShort));
  // Dock: the engine's slots stay where they are; within each berth they are handed out in stowage order.
  const stowDock = scene => Object.entries(scene.byPhase || {}).forEach(([phase, items]) => {
    const places = items.map(p => scene.pos[p.id]), order = stowOrder(items);
    order.forEach((p, index) => { scene.pos[p.id] = places[index]; });
    scene.byPhase[phase] = order;
  });
  const hasFog = p =>!!(p && (p.noFinPlan != null ? p.noFinPlan : p.noForecast));
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  // "14 proyectos y 11 quick wins", only when both kinds are present (a single kind is already the total).
  // Berth plate: "N iniciativas" when kinds mix, otherwise the single kind with its own number.
  const countLabel = items => { const qw = items.filter(isShort).length, pr = items.length - qw; return qw && pr ? plural(items.length, 'iniciativa', 'iniciativas') : qw ? plural(qw, 'quick win', 'quick wins') : plural(pr, 'proyecto', 'proyectos'); };
  const mixLabel = items => { const qw = items.filter(isShort).length, pr = items.length - qw; return qw && pr ? plural(pr, 'proyecto', 'proyectos') + ' y ' + plural(qw, 'quick win', 'quick wins') : ''; };
  const TAU = Math.PI * 2, clamp01 = v => Math.max(0, Math.min(1, v));
  const mixHex = (a, b, t) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = s => Math.round((x >> s & 255) + ((y >> s & 255) - (x >> s & 255)) * clamp01(t)); return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1); };
  const rgba = (hex, alpha) => { const v = parseInt(hex.slice(1), 16); return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + alpha + ')'; };
  // Same rounded rectangle and ellipse outlines the engine feeds its pen.
  const rr = (x, y, w, h, r, n = 4) => { r = Math.min(r, w / 2, h / 2); const pts = [], arc = (cx, cy, from) => { for (let i = 0; i <= n; i++) { const a = from + i / n * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }; arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI); return pts; };
  const ell = (cx, cy, rx, ry, n = 20) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * TAU) * rx, cy + Math.sin(i / n * TAU) * ry]);
  // Short container with the signature of CosmosFx.draw.box (x = center, y = bottom, u = unit).
  function shortBox(pen, x, y, u, o = {}) {
    const pal = root.CosmosFx.draw.PAL, ctx = pen.ctx, unit = .6 * u, body = o.col || pal.steel, rib = mixHex(body, pal.ink, .45), half = SHORT_HALF * u;
    if (!o.noShadow) { ctx.beginPath(); ctx.ellipse(x, y + .05 * u, half + .1 * u, .45 * u, 0, 0, TAU); ctx.fillStyle = rgba(pal.ink, .12); ctx.fill(); }
    ctx.save(); ctx.translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u); if (o.rot) ctx.rotate(o.rot);
    const sq = o.sq || 0; ctx.scale(1 + .5 * sq, 1 - .6 * sq);
    pen.shape(rr(-half, -3.6 * u, 2 * half, 3.6 * u, .45 * u, 2), { unit, fill: body, pool: mixHex(body, '#FFFFFF', .3), settle: rib, sw: 1, edge: .25 });
    // One rib per side, centered between the face and the edge (the long box has two at the same spacing).
    for (const side of [-1, 1]) pen.line([[side * 1.53 * u, -3.1 * u], [side * 1.53 * u, -.5 * u]], { unit: .8 * unit, sw: .55, col: rib, curv: 0, alpha: .6, rim: false });
    if (o.face !== false) {
      pen.shape(rr(-1.15 * u, -2.95 * u, 2.3 * u, 2.2 * u, .4 * u, 2), { unit: .7 * unit, fill: pal.cream, sw: .7, shadow: false, tex: 0, edge: 0 });
      const blink = clamp01(o.blink || 0);
      for (const side of [-1, 1]) {
        if (o.eyes === 'arc') pen.line([[(.45 * side - .28) * u, -2.05 * u], [.45 * side * u, -2.35 * u], [(.45 * side + .28) * u, -2.05 * u]], { unit: .6 * unit, sw: 1.1 });
        else { ctx.beginPath(); ctx.ellipse((.45 * side + .15 * (o.lookX || 0)) * u, -2.15 * u, .18 * u, Math.max(.04 * u, .28 * u * (1 - blink)), 0, 0, TAU); ctx.fillStyle = pal.ink; ctx.fill(); }
      }
      pen.line([[-.3 * u, -1.5 * u], [0, -1.3 * u], [.3 * u, -1.5 * u]], { unit: .6 * unit, sw: .9 });
    }
    ctx.restore();
  }
  // The engine's fog (no Fin Plan), moved so it hugs the short box's lower-left corner as it does on the long one.
  function shortFog(pen, x, y, u, time) {
    const i = .55 * u, cx = x - (SHORT_HALF - .8) * u, cy = y + .3 * u, alpha = pen.alpha;
    pen.alpha = .85 * alpha;
    for (let n = 0; n < 3; n++) pen.shape(ell(cx + 1.5 * (n - 1) * i + .3 * Math.sin(.8 * time + n) * i, cy - .5 * i - n % 2 * .4 * i, 1.3 * i, .7 * i, 12), { unit: .4 * i, fill: root.CosmosFx.draw.PAL.cream, ink: null, shadow: false, tex: .1, edge: 0 });
    pen.alpha = alpha;
  }
  // Legend icons drawn to the engine's proportions (6 × 3.6 and 3.8 × 3.6 units, same face).
  const containerIcon = short => {
    const w = short ? 14 : 21, c = w / 2, half = (short ? SHORT_HALF : LONG_HALF) * 3.06, ribs = short ? [4.7] : [4.6, 7];
    return '<svg width="' + w + '" height="14" viewBox="0 0 ' + w + ' 14" aria-hidden="true"><rect x="' + (c - half).toFixed(2) + '" y="2" width="' + (2 * half).toFixed(2) + '" height="11" rx="1.4" fill="#E6DCCB" stroke="#162631" stroke-width="1"/>' +
      '<path d="' + ribs.flatMap(r => [c - r, c + r]).map(x => 'M' + x.toFixed(2) + ' 3.5v8').join('') + '" stroke="#162631" stroke-opacity=".45" stroke-width=".8"/>' +
      '<rect x="' + (c - 3.5) + '" y="4" width="7" height="6.7" rx="1.2" fill="#FFF8EC" stroke="#162631" stroke-width=".7"/><circle cx="' + (c - 1.38) + '" cy="6.4" r=".6" fill="#162631"/><circle cx="' + (c + 1.38) + '" cy="6.4" r=".6" fill="#162631"/>' +
      '<path d="M' + (c - .9) + ' 8.4q.9 .8 1.8 0" fill="none" stroke="#162631" stroke-width=".6" stroke-linecap="round"/></svg>';
  };
  const SHAPE_LEGEND = [[true, 'Contenedor corto: quick win'], [false, 'Contenedor largo: proyecto']];
  const FLAG_LEGEND = /^(Bloqueo|Riesgo|Plazo vencido)/;
  const FLAG_TEXT = { block: 'Bloqueo', risk: 'Riesgo', late: 'Plazo vencido' };
  const priorityColor = item => root.CosmosFx?.draw?.PAL?.[(PRIORITIES.find(([name]) => name === priorityOf(item)) || [, 'navy3'])[1]] || '#003d53';
  // Same berths and order as the dock: phases in board order, projects before quick wins (stowage), then blocks, overdue dates, risks and name.
  const activeByPhase = (data, filter) => {
    const items = data.projects.filter(p => p.active && (!filter || filter(p))), rank = p => ({ block: 0, late: 1, risk: 2 }[p.risk] ?? 3);
    const phases = portData(data, filter).phases.concat([...new Set(items.map(p => p.phase))]).filter((phase, index, all) => all.indexOf(phase) === index);
    return phases.map(phase => ({ phase, items: stowOrder(items.filter(p => p.phase === phase).sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name), 'es'))) })).filter(g => g.items.length);
  };
  const flagIcon = color => '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1v12" stroke="#162631" stroke-width="1.4" stroke-linecap="round"/><path d="M3 1.5l9 3-9 3z" fill="' + color + '" stroke="#162631" stroke-width=".9" stroke-linejoin="round"/></svg>';

  function priorityDock(scene) {
    if (scene.priorityDock) return scene;
    scene.priorityDock = true;
    const draw = scene.draw, legend = scene._legend;
    scene.draw = function () {
      const items = this.items;
      // Paint-only copies: the engine colors by status, so real values stay for hit testing, tooltips and every other module.
      // Top rows paint first so a lower container's flag stays in front of the one above it.
      const rowY = item => this.pos?.[item.id]?.y ?? 0;
      // Quick wins: the engine's fog is turned off on the copy and drawn next to shortBox, at the short box's corner.
      this.items = items.map(item => ({ ...item, status: priorityOf(item) || 'En Proceso', risk: item.risk === 'late' ? null : item.risk, ...(isShort(item) ? { noFinPlan: false, noForecast: false, shortFog: hasFog(item) } : {}) })).sort((a, b) => rowY(a) - rowY(b));
      const time = arguments[2] || 0;
      this.boxFor = item => isShort(item) ? (pen, x, y, u, o) => { shortBox(pen, x, y, u, o); if (item.shortFog && this.o?.fog !== false) shortFog(pen, x, y, u, time); } : null;
      try { return draw.apply(this, arguments); } finally { this.items = items; this.boxFor = null; paintFaces(this, arguments[0]); }
    };
    // Same area as the engine's hit test, narrowed to the short container's real width.
    scene.hitTest = function (x, y) {
      for (const item of this.items) {
        const at = this.cur?.[item.id];
        if (!at) continue;
        const half = (isShort(item) ? SHORT_HALF : LONG_HALF) * at.u;
        if (x > at.x - half && x < at.x + half && y > at.y - 3.8 * at.u && y < at.y + .2 * at.u) return item;
      }
      return null;
    };
    scene._legend = function () {
      legend.apply(this, arguments);
      const statuses = new Set(this.items.map(item => item.status)).size;
      if (!this.leg) return;
      [...this.leg.children].slice(0, statuses).forEach(entry => entry.remove());
      const used = PRIORITIES.filter(([name]) => this.items.some(item => priorityOf(item) === name));
      if (used.length) this.leg.insertAdjacentHTML('afterbegin', used.map(([name, color]) => '<span><i style="background:' + root.CosmosFx?.draw?.PAL?.[color] + '"></i>' + PRIORITY_LABELS[name] + '</span>').join(''));
      this.leg.querySelectorAll?.('span').forEach(entry => {
        const swatch = entry.querySelector('i');
        if (swatch && FLAG_LEGEND.test(entry.textContent)) swatch.outerHTML = flagIcon(swatch.style.background);
        if (/^Plazo vencido/.test(entry.textContent)) entry.remove();
      });
      // Container length: only the kinds in view (dock or ship), so the initiative scope filter is respected.
      const kinds = this.items.concat(this.d ? closed(this.d, this.o?.filter) : []), shapes = SHAPE_LEGEND.filter(([short]) => kinds.some(p => isShort(p) === short));
      if (shapes.length) this.leg.insertAdjacentHTML('beforeend', shapes.map(([short, text]) => '<span>' + containerIcon(short) + text + '</span>').join(''));
    };
  }

  function ambientMotion(scene, env = root) {
    const paint = scene.paint, destroy = scene.destroy, doc = env.document;
    const reduced = env.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => scene.wake(.2);
    const observer = new env.IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); });
    observer.observe(scene.cv);
    scene.busy = () => visible && scene.el.isConnected && !doc.hidden && !reduced.matches && !scene.quiet;
    scene.paint = function () { if (visible && this.el.isConnected && !doc.hidden) return paint.apply(this, arguments); };
    doc.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    scene.destroy = function () {
      observer.disconnect(); doc.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync);
      return destroy.apply(this, arguments);
    };
  }

  function enhance(scene) {
    if (!scene || scene.deliveryLayer || !root.CosmosFx?.draw?.ship) return scene;
    const draw = root.CosmosFx.draw, pal = draw.PAL;
    priorityDock(scene);
    scene.countLabel = countLabel;
    const original = { setData: scene.setData, layout: scene.layout, height: scene.height, tip: scene.tipHTML, destroy: scene.destroy };
    const layer = scene.deliveryLayer = document.createElement('div'); layer.className = 'pav-delivery-layer';
    scene.wrap.appendChild(layer);
    const foot = document.createElement('div'); foot.className = 'pav-delivery-foot';
    scene.el.appendChild(foot);
    let page = 0, selected = null, buttons = [], list = [];
    const tooltipId = 'pav-delivery-tooltip'; scene.tip.id = tooltipId; scene.tip.setAttribute('role', 'tooltip');
    scene._placeTip = function (point) {
      const width = this.tip.offsetWidth || 200, height = this.tip.offsetHeight || 60;
      const x = point.x + 14 + width > this.w - 4 ? point.x - width - 14 : point.x + 14;
      const y = point.y - height - 12 < 4 ? point.y + 16 : point.y - height - 12;
      this.tip.style.left = Math.max(4, Math.min(this.w - width - 4, x)) + 'px';
      this.tip.style.top = this.cv.offsetTop + Math.max(4, Math.min(this.h - height - 4, y)) + 'px';
    };
    const show = (project, button) => {
      selected = project;
      buttons.forEach(b => b.classList.toggle('is-selected', b.dataset.id === project.id));
      scene.hover = project;
      const x = parseFloat(button.style.left) || scene.w / 2, y = parseFloat(button.style.top) || scene.h / 2;
      scene.showTip(project, { x, y }); scene.tip.setAttribute('aria-hidden', 'false'); scene.wake(.4);
    };
    const hide = () => { selected = null; scene.hover = null; buttons.forEach(b => b.classList.remove('is-selected')); scene.showTip(null); scene.tip.setAttribute('aria-hidden', 'true'); scene.wake(.3); };
    const onEscape = event => { if (event.key === 'Escape') hide(); };
    scene.wrap.addEventListener('keydown', onEscape);
    const select = p => scene.o.onSelect && scene.o.onSelect(p.id, p);
    function paintControls() {
      list = closed(scene.d, scene.o.filter);
      page = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE) - 1));
      const visible = list.slice(page * PAGE, (page + 1) * PAGE);
      layer.innerHTML = visible.map(p => '<button type="button" class="pav-cargo-hit" data-id="' + esc(p.id) + '" aria-label="' + esc(label(p) + ' cerrado: ' + p.name + '. Cierre: ' + dateLabel(p)) + '" aria-describedby="' + tooltipId + '"><span class="pav-cargo-sr">' + esc(p.name) + '</span></button>').join('');
      buttons = [...layer.querySelectorAll('button')];
      buttons.forEach((button, index) => {
        const p = visible[index];
        button.addEventListener('pointerenter', () => show(p, button));
        button.addEventListener('pointerleave', () => { if (document.activeElement !== button && !button.dataset.pinned) hide(); });
        button.addEventListener('focus', () => show(p, button));
        button.addEventListener('blur', () => { delete button.dataset.pinned; hide(); });
        button.addEventListener('click', () => { buttons.forEach(b => delete b.dataset.pinned); button.dataset.pinned = 'true'; show(p, button); });
        button.addEventListener('dblclick', () => select(p));
      });
      const first = page * PAGE + 1, last = Math.min((page + 1) * PAGE, list.length);
      const openActive = !!foot.querySelector('.pav-active-list[open]'), openDelivery = !!foot.querySelector('.pav-delivery-list[open]'), docked = activeByPhase(scene.d, scene.o.filter), dockedCount = docked.reduce((sum, g) => sum + g.items.length, 0);
      // The banner on the ship and the summary KPI already carry the year's total.
      foot.innerHTML = (list.length > PAGE ? '<div class="pav-delivery-pages"><button type="button" data-page="-1" ' + (!page ? 'disabled' : '') + ' aria-label="Ver contenedores anteriores">←</button><span aria-live="polite">' + first + '–' + last + ' de ' + list.length + '</span><button type="button" data-page="1" ' + (last === list.length ? 'disabled' : '') + ' aria-label="Ver siguientes contenedores">→</button></div>' : '') +
        '<details class="pav-active-list"' + (openActive ? ' open' : '') + '><summary>Ver ' + dockedCount + ' iniciativas activas por fase</summary><div>' + (docked.map(g => '<section><h3>' + esc(g.phase) + ' · ' + g.items.length + '</h3>' + g.items.map(p => '<button type="button" data-active="' + esc(p.id) + '"><strong><i style="background:' + esc(priorityColor(p)) + '" aria-hidden="true"></i>' + esc(p.name) + '</strong><span>' + esc([label(p), priorityLabel(p.priority), FLAG_TEXT[p.risk], p.pmFirst].filter(Boolean).join(' · ')) + '</span></button>').join('') + '</section>').join('') || '<p>Sin iniciativas activas en este ámbito.</p>') + '</div></details>' +
        '<details class="pav-delivery-list"' + (openDelivery ? ' open' : '') + '><summary>Ver ' + list.length + ' iniciativas entregadas' + (mixLabel(list) ? ': ' + mixLabel(list) : '') + '</summary><div>' + (list.map((p, index) => '<button type="button" data-delivery="' + index + '"><span class="pav-delivery-kind">' + esc(label(p)) + '</span><strong>' + esc(p.name) + '</strong><span>Cierre: ' + esc(dateLabel(p)) + ' · Abrir ficha ↗</span></button>').join('') || '<p>Sin cierres registrados en este año y ámbito.</p>') + '</div></details>';
      foot.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { page += Number(button.dataset.page); hide(); paintControls(); scene.wake(.4); const next = foot.querySelector('[data-page="' + button.dataset.page + '"]:not(:disabled)') || foot.querySelector('[data-page]:not(:disabled)'); next?.focus(); }));
      foot.querySelectorAll('[data-delivery]').forEach(button => button.addEventListener('click', () => select(list[Number(button.dataset.delivery)])));
      // Listing a dock container lights it up in the scene, so the name and its place are read together.
      foot.querySelectorAll('[data-active]').forEach(button => {
        const project = scene.d.projects.find(p => p.id === button.dataset.active), light = () => scene.highlight(button.dataset.active);
        button.addEventListener('pointerenter', light); button.addEventListener('focus', light);
        button.addEventListener('click', () => project && select(project));
      });
      // Keyboard access to active containers stays in the vendor's accessible list.
      scene.tipHTML = project => list.some(p => p.id === project.id) ? '<b>' + esc(project.name) + '</b>' + esc(label(project)) + ' · Cerrado<br><i>Cierre:</i> ' + esc(dateLabel(project)) : activeTip(project) + (project.priority ? '<br><i>Prioridad:</i> ' + esc(priorityLabel(project.priority)) : '');
      return visible;
    }
    // The engine's tip with the kind first: "Quick win · En Proceso · Ejecución".
    const activeTip = project => { const html = original.tip.call(scene, project), cut = html.indexOf('</b>') + 4; return cut > 3 ? html.slice(0, cut) + esc(label(project)) + ' · ' + html.slice(cut) : html; };
    scene.height = function (width) { return original.height.call(this, width) + (width < 600 ? 110 : 40); };
    scene.layout = function () {
      original.layout.call(this);
      stowDock(this);
      if (this.mob) { this.seaY += 75; return; }
      if (!this.bx.length) return;
      const shipL = Math.min(390, Math.max(218, this.w * .32));
      const end = this.bx.at(-1)[0] + this.bx.at(-1)[1], nextEnd = this.w - 18 - 1.08 * shipL, ratio = (nextEnd - 18) / (end - 18);
      this.bx = this.bx.map(([x, width]) => [18 + (x - 18) * ratio, width * ratio]);
      Object.values(this.pos).forEach(p => { p.x = 18 + (p.x - 18) * ratio; p.u *= Math.min(1, ratio); });
      this.shipL = shipL; this.shipX = this.w - 18 - .54 * shipL;
    };
    scene.setData = function (data, first) {
      original.setData.call(this, portData(data, this.o.filter), first);
      // The vendor's accessible list also names the kind, so it matches the container's length.
      if (this.sr) {
        const heading = this.sr.querySelector('div'); if (heading) heading.textContent = 'Iniciativas en el puerto';
        this.sr.querySelectorAll('button[data-id]').forEach(button => { const p = this.find(button.dataset.id); if (p) button.textContent = label(p) + ': ' + button.textContent; });
      }
      hide(); paintControls(); return this;
    };
    scene._ship = function (pen, time, y, length) {
      const mobile = this.mob, quiet = this.quiet;
      const size = mobile ? Math.min(360, this.w * .84) : length;
      const x = mobile ? this.w / 2 : this.shipX;
      const baseline = (mobile ? this.seaY + 64 : y) + (quiet ? 0 : 2 * Math.sin(1.6 * time));
      const rot = quiet ? 0 : .009 * Math.sin(1.2 * time);
      draw.ship(pen, x, baseline, size, { noCargo: true, rot, name: 'ENTREGADOS' });
      const visible = list.slice(page * PAGE, (page + 1) * PAGE), ctx = pen.ctx;
      layer.style.top = this.cv.offsetTop + 'px'; layer.style.height = this.h + 'px';
      const width = .085 * size, height = .052 * size;
      ctx.save(); ctx.translate(x, baseline); ctx.rotate(rot);
      // One container per bay, centered; long ones are stowed in the lower tiers.
      const bays = slots(visible.length), bayOf = new Map(stowOrder(visible).map((p, index) => [p.id, index])), unit = width / 6, tops = [];
      visible.forEach((project, index) => {
        const { col, row } = bays[bayOf.get(project.id)], short = isShort(project), left = -.3 * size + col * .091 * size, top = -.088 * size - (row + 1) * height;
        const cx = left + width / 2, cy = top + height / 2, boxW = short ? 2 * SHORT_HALF * unit : width, button = buttons[index];
        // Every delivery in the same closed-green: the kind is told by length alone.
        (short ? shortBox : draw.box)(pen, cx, top + height, unit, { col: pal.ok, eyes: 'arc', noShadow: true });
        if (row === Math.floor((visible.length - 1 - col) / 6)) tops.push({ x: cx, y: top, u: unit });
        if (button) Object.assign(button.style, { left: (x + cx * Math.cos(rot) - cy * Math.sin(rot)) + 'px', top: (baseline + cx * Math.sin(rot) + cy * Math.cos(rot)) + 'px', width: boxW + 'px', height: height + 'px', transform: 'translate(-50%,-50%) rotate(' + rot + 'rad)' });
      });
      const pole = Math.min(.40 * size, this.w - x - 14);
      // Seasonal dressing (pmo-fiestas.js) goes over the cargo and under the banner.
      this.onShip?.(pen, { size, pole, tops });
      // Banner: the year's total and, below it, the split by kind when both are on board.
      const title = list.length + ' entregados ' + this.d.totals.year, sub = mixLabel(list);
      ctx.font = '600 11px Figtree, "Segoe UI", sans-serif';
      const subW = sub ? ctx.measureText(sub).width : 0;
      ctx.font = '800 13px Figtree, "Segoe UI", sans-serif';
      const bannerH = sub ? 40 : 26, bannerW = Math.max(ctx.measureText(title).width, subW) + 24, bannerX = pole, bannerY = -.44 * size;
      pen.line([[bannerX, -.09 * size], [bannerX, bannerY - 6]], { unit: 1.4, sw: 1, curv: 0 });
      pen.shape([[bannerX, bannerY], [bannerX - bannerW, bannerY], [bannerX - bannerW + 7, bannerY + bannerH / 2], [bannerX - bannerW, bannerY + bannerH], [bannerX, bannerY + bannerH]], { unit: 1.2, fill: pal.sand, pool: pal.cream, sw: .9, j: .2 });
      ctx.fillStyle = pal.navy; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(title, bannerX - bannerW + 13, bannerY + 13);
      if (sub) { ctx.font = '600 11px Figtree, "Segoe UI", sans-serif'; ctx.fillText(sub, bannerX - bannerW + 13, bannerY + 29); }
      ctx.restore();
      if (selected) {
        const index = visible.findIndex(p => p.id === selected.id), button = buttons[index];
        if (button) this._placeTip({ x: parseFloat(button.style.left), y: parseFloat(button.style.top) });
      }
    };
    scene.destroy = function () { foot.remove(); return original.destroy.call(this); };
    scene.setData(scene.d, true);
    ambientMotion(scene);
    root.PMOFiestas?.decorate(scene, root.PMOFiestas.current());
    return scene;
  }

  if (root.document && !document.getElementById('pmo-puerto-style')) {
    const style = document.createElement('style'); style.id = 'pmo-puerto-style';
    style.textContent = `.pav-delivery-layer{position:absolute;inset:0;pointer-events:none}.pav-cargo-hit{position:absolute;pointer-events:auto;cursor:help;background:transparent;border:0;border-radius:2px;padding:0;z-index:2}.pav-cargo-hit:hover,.pav-cargo-hit:focus-visible,.pav-cargo-hit.is-selected{outline:3px solid #e9c46a;outline-offset:2px;background:#fff3}.pav-cargo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.pav-puerto .cfx-tip{z-index:4;max-width:min(290px,calc(100% - 8px));overflow-wrap:anywhere;pointer-events:none}.pav-delivery-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;margin-top:12px;color:var(--navy3,#003d53)}.pav-delivery-caption{display:grid;gap:3px;flex:1 1 300px}.pav-delivery-caption strong{font-size:15px}.pav-delivery-caption>span{font-size:12px;color:var(--muted)}.pav-delivery-pages{display:flex;align-items:center;gap:8px;font-size:12px}.pav-delivery-pages button{min-width:44px;min-height:44px;background:#f5efe4;border:1px solid #cba785;color:#003d53;font:700 18px Figtree,sans-serif}.pav-delivery-list,.pav-active-list{width:100%;font-size:13px}.pav-active-list summary{cursor:pointer;padding:10px 0 0;font-weight:700;text-decoration:underline;text-underline-offset:3px}.pav-active-list>div{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:14px;padding:10px 0 4px}.pav-active-list h3{margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6d604b}.pav-active-list section{display:grid;align-content:start;gap:6px}.pav-active-list button{display:grid;gap:2px;min-height:44px;text-align:left;padding:8px 10px;border:1px solid var(--line,#d6dfe3);border-radius:8px;background:#fff;color:#003d53;font:13px Figtree,sans-serif;cursor:pointer;overflow-wrap:anywhere}.pav-active-list button:hover{border-color:#003d53}.pav-active-list strong{display:flex;gap:7px;align-items:baseline}.pav-active-list strong i{flex:none;width:9px;height:9px;border-radius:2px}.pav-active-list button>span{font-size:11px;color:var(--muted);padding-left:16px}.pav-active-list summary:focus-visible,.pav-active-list button:focus-visible{outline:3px solid #cba785;outline-offset:3px}.pav-delivery-list summary{cursor:pointer;padding:10px 0;font-weight:700;text-decoration:underline;text-underline-offset:3px}.pav-delivery-list>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:8px;padding:8px 0}.pav-delivery-list button{display:grid;gap:4px;min-height:72px;text-align:left;padding:12px;border:1px solid var(--line,#d6dfe3);background:#fbfaf6;color:#003d53;font:13px Figtree,sans-serif;cursor:pointer;overflow-wrap:anywhere}.pav-delivery-kind{font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#6d604b}.pav-delivery-list button>span:last-child{font-size:11px;color:var(--muted)}.pav-delivery-foot button:focus-visible,.pav-delivery-list summary:focus-visible{outline:3px solid #cba785;outline-offset:3px}@media(max-width:599px){.pav-delivery-caption>span{line-height:1.5}.pav-delivery-list summary{min-height:44px;display:list-item;align-content:center}}`;
    document.head.appendChild(style);
  }
  const api = { enhance, rr, ell, closed, portData, activeByPhase, slots, stowOrder, stowDock, mixLabel, countLabel, isShort, shortBox, containerIcon, label, priorityOf, priorityLabel, priorityScale, priorityColor, flagIcon, faceFlags, priorityDock, ambientMotion, pageSize: PAGE };
  root.PMOPuerto = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
