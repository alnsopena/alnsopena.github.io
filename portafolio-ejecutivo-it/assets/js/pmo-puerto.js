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
  const priorityScale = item => (item.active && PRIORITY_SCALE[priorityOf(item)]) || 1;
  const faceFlags = item => {
    const reasons = item.reasons || [];
    return { late: reasons.includes('Fin Plan vencido'), risk: reasons.some(reason => /^(Riesgo|Bloqueo):/.test(reason)) };
  };
  // The engine's face cannot be configured from outside, so the expression is drawn over it, on the same face panel.
  function paintFaces(scene, pen) {
    const pal = root.CosmosFx?.draw?.PAL, ctx = pen?.ctx;
    if (!pal || !ctx || scene.mob) return;
    scene.items.forEach(item => {
      const { late, risk } = faceFlags(item), at = scene.cur?.[item.id];
      if ((!late && !risk) || !at) return;
      const u = at.u, patch = (x, y, rx, ry, color) => { ctx.beginPath(); ctx.ellipse(x * u, y * u, rx * u, ry * u, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
      ctx.save(); ctx.translate(at.x, at.y);
      if (late) for (const side of [-1, 1]) {
        const x = .45 * side;
        patch(x, -2.15, .32, .4, pal.cream);
        pen.line([[(x - .2) * u, -2.36 * u], [(x + .2) * u, -1.94 * u]], { unit: .36 * u, sw: 1, col: pal.ink, curv: 0, rim: false });
        pen.line([[(x + .2) * u, -2.36 * u], [(x - .2) * u, -1.94 * u]], { unit: .36 * u, sw: 1, col: pal.ink, curv: 0, rim: false });
      }
      if (risk) { patch(0, -1.42, .42, .22, pal.cream); patch(0, -1.36, .17, .21, pal.ink); }
      ctx.restore();
    });
  }
  const FLAG_LEGEND = /^(Bloqueo|Riesgo|Plazo vencido)/;
  const flagIcon = color => '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1v12" stroke="#162631" stroke-width="1.4" stroke-linecap="round"/><path d="M3 1.5l9 3-9 3z" fill="' + color + '" stroke="#162631" stroke-width=".9" stroke-linejoin="round"/></svg>';

  function priorityDock(scene) {
    const draw = scene.draw, legend = scene._legend;
    scene.draw = function () {
      const items = this.items;
      // Paint-only copies: the engine colors by status, so real values stay for hit testing, tooltips and every other module.
      // Top rows paint first so a lower container's flag stays in front of the one above it.
      const rowY = item => this.pos?.[item.id]?.y ?? 0;
      this.items = items.map(item => ({ ...item, status: priorityOf(item) || 'En Proceso' })).sort((a, b) => rowY(a) - rowY(b));
      try { return draw.apply(this, arguments); } finally { this.items = items; paintFaces(this, arguments[0]); }
    };
    scene._legend = function () {
      legend.apply(this, arguments);
      const statuses = new Set(this.items.map(item => item.status)).size;
      if (!this.leg) return;
      [...this.leg.children].slice(0, statuses).forEach(entry => entry.remove());
      const used = PRIORITIES.filter(([name]) => this.items.some(item => priorityOf(item) === name));
      if (used.length) this.leg.insertAdjacentHTML('afterbegin', used.map(([name, color]) => '<span><i style="background:' + root.CosmosFx?.draw?.PAL?.[color] + '"></i>' + name + '</span>').join(''));
      this.leg.querySelectorAll?.('span').forEach(entry => {
        const swatch = entry.querySelector('i');
        if (swatch && FLAG_LEGEND.test(entry.textContent)) swatch.outerHTML = flagIcon(swatch.style.background);
        // A container shows one flag; a late project that is also at risk carries the risk flag.
        if (/^Plazo vencido/.test(entry.textContent) && entry.lastChild) entry.lastChild.textContent = entry.lastChild.textContent.replace('Plazo vencido', 'Solo plazo vencido');
      });
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
      // The banner on the ship and the summary KPI already carry the year's total.
      foot.innerHTML = (list.length > PAGE ? '<div class="pav-delivery-pages"><button type="button" data-page="-1" ' + (!page ? 'disabled' : '') + ' aria-label="Ver contenedores anteriores">←</button><span aria-live="polite">' + first + '–' + last + ' de ' + list.length + '</span><button type="button" data-page="1" ' + (last === list.length ? 'disabled' : '') + ' aria-label="Ver siguientes contenedores">→</button></div>' : '') +
        '<details class="pav-delivery-list"><summary>Ver ' + list.length + ' iniciativas entregadas</summary><div>' + (list.map((p, index) => '<button type="button" data-delivery="' + index + '"><span class="pav-delivery-kind">' + esc(label(p)) + '</span><strong>' + esc(p.name) + '</strong><span>Cierre: ' + esc(dateLabel(p)) + ' · Abrir ficha ↗</span></button>').join('') || '<p>Sin cierres registrados en este año y ámbito.</p>') + '</div></details>';
      foot.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { page += Number(button.dataset.page); hide(); paintControls(); scene.wake(.4); const next = foot.querySelector('[data-page="' + button.dataset.page + '"]:not(:disabled)') || foot.querySelector('[data-page]:not(:disabled)'); next?.focus(); }));
      foot.querySelectorAll('[data-delivery]').forEach(button => button.addEventListener('click', () => select(list[Number(button.dataset.delivery)])));
      // Keyboard access to active containers stays in the vendor's accessible list.
      scene.tipHTML = project => list.some(p => p.id === project.id) ? '<b>' + esc(project.name) + '</b>' + esc(label(project)) + ' · Cerrado<br><i>Cierre:</i> ' + esc(dateLabel(project)) : original.tip.call(scene, project) + (project.priority ? '<br><i>Prioridad:</i> ' + esc(project.priority) : '');
      return visible;
    }
    scene.height = function (width) { return original.height.call(this, width) + (width < 600 ? 110 : 40); };
    scene.layout = function () {
      original.layout.call(this);
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
      slots(visible.length).forEach(({ col, row }, index) => {
        const project = visible[index], left = -.3 * size + col * .091 * size, top = -.088 * size - (row + 1) * height;
        const color = project.initiativeClass === 'Quick win' ? pal.sandDk : pal.ok;
        draw.box(pen, left + width / 2, top + height, width / 6, { col: color, eyes: 'arc', noShadow: true });
        const cx = left + width / 2, cy = top + height / 2, button = buttons[index];
        if (button) Object.assign(button.style, { left: (x + cx * Math.cos(rot) - cy * Math.sin(rot)) + 'px', top: (baseline + cx * Math.sin(rot) + cy * Math.cos(rot)) + 'px', width: width + 'px', height: height + 'px', transform: 'translate(-50%,-50%) rotate(' + rot + 'rad)' });
      });
      const title = list.length + ' ejecutados ' + this.d.totals.year;
      ctx.font = '800 13px Figtree, "Segoe UI", sans-serif';
      const bannerW = ctx.measureText(title).width + 24, bannerX = Math.min(.40 * size, this.w - x - 14), bannerY = -.44 * size;
      pen.line([[bannerX, -.09 * size], [bannerX, bannerY - 6]], { unit: 1.4, sw: 1, curv: 0 });
      pen.shape([[bannerX, bannerY], [bannerX - bannerW, bannerY], [bannerX - bannerW + 7, bannerY + 12], [bannerX - bannerW, bannerY + 26], [bannerX, bannerY + 26]], { unit: 1.2, fill: pal.sand, pool: pal.cream, sw: .9, j: .2 });
      ctx.fillStyle = pal.navy; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(title, bannerX - bannerW + 13, bannerY + 13);
      ctx.restore();
      if (selected) {
        const index = visible.findIndex(p => p.id === selected.id), button = buttons[index];
        if (button) this._placeTip({ x: parseFloat(button.style.left), y: parseFloat(button.style.top) });
      }
    };
    scene.destroy = function () { foot.remove(); return original.destroy.call(this); };
    scene.setData(scene.d, true);
    ambientMotion(scene);
    return scene;
  }

  if (root.document && !document.getElementById('pmo-puerto-style')) {
    const style = document.createElement('style'); style.id = 'pmo-puerto-style';
    style.textContent = `.pav-delivery-layer{position:absolute;inset:0;pointer-events:none}.pav-cargo-hit{position:absolute;pointer-events:auto;cursor:help;background:transparent;border:0;border-radius:2px;padding:0;z-index:2}.pav-cargo-hit:hover,.pav-cargo-hit:focus-visible,.pav-cargo-hit.is-selected{outline:3px solid #e9c46a;outline-offset:2px;background:#fff3}.pav-cargo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.pav-puerto .cfx-tip{z-index:4;max-width:min(290px,calc(100% - 8px));overflow-wrap:anywhere;pointer-events:none}.pav-delivery-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;margin-top:12px;color:var(--navy3,#003d53)}.pav-delivery-caption{display:grid;gap:3px;flex:1 1 300px}.pav-delivery-caption strong{font-size:15px}.pav-delivery-caption>span{font-size:12px;color:var(--muted)}.pav-delivery-pages{display:flex;align-items:center;gap:8px;font-size:12px}.pav-delivery-pages button{min-width:44px;min-height:44px;background:#f5efe4;border:1px solid #cba785;color:#003d53;font:700 18px Figtree,sans-serif}.pav-delivery-list{width:100%;font-size:13px}.pav-delivery-list summary{cursor:pointer;padding:10px 0;font-weight:700;text-decoration:underline;text-underline-offset:3px}.pav-delivery-list>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:8px;padding:8px 0}.pav-delivery-list button{display:grid;gap:4px;min-height:72px;text-align:left;padding:12px;border:1px solid var(--line,#d6dfe3);background:#fbfaf6;color:#003d53;font:13px Figtree,sans-serif;cursor:pointer;overflow-wrap:anywhere}.pav-delivery-kind{font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#6d604b}.pav-delivery-list button>span:last-child{font-size:11px;color:var(--muted)}.pav-delivery-foot button:focus-visible,.pav-delivery-list summary:focus-visible{outline:3px solid #cba785;outline-offset:3px}@media(max-width:599px){.pav-delivery-caption>span{line-height:1.5}.pav-delivery-list summary{min-height:44px;display:list-item;align-content:center}}`;
    document.head.appendChild(style);
  }
  const api = { enhance, closed, portData, slots, label, priorityOf, priorityScale, faceFlags, priorityDock, ambientMotion, pageSize: PAGE };
  root.PMOPuerto = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
