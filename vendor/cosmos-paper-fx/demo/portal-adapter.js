/*
 * Adaptador de ejemplo: conecta COSMOS Paper FX con el Portafolio Ejecutivo (propuesta v8).
 * No toca la lógica del portal: envuelve funciones existentes y, después de que terminan,
 * avisa a la capa de animación. Si el script de animación no carga, el portal funciona igual.
 */
(function () {
  'use strict';
  if (!window.CosmosFx) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  // 1. La bienvenida de papel reemplaza a la bienvenida anterior del portal.
  document.documentElement.classList.remove('show-intro');
  // Espacios (slots) donde se pintan las viñetas. El portal decide su tamaño; la animación solo los llena.
  const st = document.createElement('style'); st.textContent = `
    .cfx-slot-crane{position:absolute;right:62px;top:0;bottom:0;width:min(230px,38%);pointer-events:none}
    .dialog-head h2,.dialog-head .dialog-meta{display:block;max-width:calc(100% - min(230px,38%) - 8px)}
    .cfx-slot-empty{position:relative;width:100%;max-width:420px;height:112px}
    .cfx-slot-calma{position:relative;height:62px;margin:-6px 0 10px}
    #fx-button[aria-pressed="false"]{opacity:.55}
    @media (max-width:800px){.cfx-slot-crane{right:54px;top:4px;bottom:auto;height:98px;width:36%}.dialog-head h2,.dialog-head .dialog-meta{max-width:60%}}`;
  document.head.appendChild(st);

  // 2. Datos para los globos de Cosmo (se leen de las funciones que ya existen, sin recalcular indicadores).
  const resumen = () => {
    const act = D.items.filter(active).length;
    const att = D.items.filter(i => attentionReasons(i).length).length;
    const blk = D.items.filter(i => attentionReasons(i).some(x => x.startsWith('Bloqueo:'))).length;
    return { act, att, blk, risk: att - blk, text: act + ' proyectos activos · ' + att + ' requieren atención' + (blk ? ' · ' + blk + ' con bloqueo' : '') };
  };

  const fx = window.cosmosFx = CosmosFx.create({
    dock: { right: 22, bottom: 22, size: 84 },
    dockMobile: { right: 10, bottom: 78, size: 58 },      // queda sobre la barra inferior de 64 px
    onCosmoClick: () => ({ text: resumen().text, mood: 'happy' }),
    label: 'Cosmo: ver resumen de la cartera'
  });

  // 3. Envolver funciones del portal: primero corre la original, luego la reacción.
  const after = (name, fn) => {
    const orig = window[name]; if (typeof orig !== 'function') return;
    window[name] = function () { const r = orig.apply(this, arguments); try { fn.apply(this, arguments); } catch (e) { console.warn('[cosmos-fx]', e); } return r; };
  };

  after('render', () => decorate());
  after('go', () => { fx.emit('view'); });
  after('setFilter', (k, v) => {
    const el = document.getElementById('f-' + k) || document.getElementById('search-' + k) || $('.module-filters');
    if (!v) return fx.emit('filter:clear', { el });
    if (!hasEmpty()) fx.emit('filter', { el, value: ['status', 'priority', 'schedule', 'issue'].includes(k) ? v : '' });
  });
  after('clearFilters', () => fx.emit('filter:clear', { el: $('.module-filters') || $('.executive-toolbar') }));
  after('setExecutivePreset', v => { const el = $('.quick-chip[aria-pressed="true"]'); v ? fx.emit('filter', { el }) : fx.emit('filter:clear', { el }); });
  after('copyViewLink', () => fx.emit('success'));
  after('setTheme', () => fx.emit('theme'));
  after('toggleFullscreen', () => fx.setVisible(!document.body.classList.contains('committee-mode')));
  after('openProject', id => {
    const head = $('#project-dialog .dialog-head'); if (!head) return;
    const slot = document.createElement('div'); slot.className = 'cfx-slot cfx-slot-crane'; slot.setAttribute('aria-hidden', 'true'); head.appendChild(slot);
    const item = D.items.find(x => x.id === String(id));
    fx.emit('project', { el: slot, status: item ? val(item, C.status) : '' });
  });
  after('openMore', () => { // interruptor de animaciones en la hoja "Más" (móvil)
    const list = $('#more-sheet .sheet-list:last-of-type'); if (!list || list.querySelector('.cfx-toggle')) return;
    list.insertAdjacentHTML('beforeend', '<button type="button" class="sheet-item cfx-toggle" aria-pressed="' + fx.isEnabled() + '">' + sparkle() + 'Animaciones: ' + (fx.isEnabled() ? 'activadas' : 'desactivadas') + '</button>');
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('.cfx-toggle'); if (!t) return;
    fx.setEnabled(!fx.isEnabled()); t.setAttribute('aria-pressed', fx.isEnabled());
    t.lastChild.textContent = 'Animaciones: ' + (fx.isEnabled() ? 'activadas' : 'desactivadas');
    if (fx.isEnabled()) { fx.emit('wave'); decorate(); }
  });

  // 4. Viñetas dentro del contenido: estado vacío por filtros y "mar en calma" sin cambios semanales.
  const hasEmpty = () => $$('#main .empty').some(isFilterEmpty);
  function isFilterEmpty(el) { return /coincidencias|filtros aplicados|estos filtros/i.test(el.textContent); }
  function decorate() {
    if (!fx.isEnabled()) return;
    $$('#main .empty').filter(isFilterEmpty).slice(0, 1).forEach(el => {
      if (el.querySelector('.cfx-slot')) return;
      el.querySelector('svg.ic') && el.querySelector('svg.ic').remove();
      const slot = document.createElement('div'); slot.className = 'cfx-slot cfx-slot-empty'; slot.setAttribute('aria-hidden', 'true'); el.prepend(slot);
      fx.emit('empty', { el: slot });
    });
    const quiet = $('#main .weekly-card.is-quiet');
    if (quiet && !quiet.querySelector('.cfx-slot')) {
      const slot = document.createElement('div'); slot.className = 'cfx-slot cfx-slot-calma'; slot.setAttribute('aria-hidden', 'true');
      quiet.querySelector('.weekly-head').after(slot); fx.vignette(slot, 'calma');
    }
  }

  // 5. Mirada y reacciones al pasar el mouse (con freno para no saturar).
  let lastHover = 0, lastEl = null;
  document.addEventListener('pointerover', e => {
    const el = e.target.closest('#main .kpis .card, #main .alert-card, #main .chart-card, #main .rowbtn');
    if (!el || el === lastEl || performance.now() - lastHover < 700) return; lastEl = el; lastHover = performance.now();
    const mood = el.classList.contains('tone-danger') || el.classList.contains('sev-high') ? 'alarm' : el.classList.contains('tone-warn') ? 'worried' : null;
    fx.emit('hover', { el, mood });
  }, { passive: true });
  // Guiño: clic en "Ejecutados" celebra lo desplegado en el año.
  document.addEventListener('click', e => {
    const k = e.target.closest('#main .kpis .card'); if (!k || !/Ejecutados/i.test(k.textContent)) return;
    const n = parseInt(k.querySelector('.metric-value').textContent, 10) || 8; fx.emit('celebrate', { el: k, count: n });
  });

  // 6. Botón en el header para activar o desactivar animaciones (control del usuario).
  function sparkle() { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>'; }
  const actions = $('.top-actions');
  if (actions) {
    actions.insertAdjacentHTML('afterbegin', '<button id="fx-button" class="hbtn icon-only" type="button" aria-pressed="' + fx.isEnabled() + '" title="Animaciones" aria-label="Animaciones de Cosmo">' + sparkle() + '</button>');
    $('#fx-button').addEventListener('click', e => {
      fx.setEnabled(!fx.isEnabled()); e.currentTarget.setAttribute('aria-pressed', fx.isEnabled());
      if (fx.isEnabled()) { fx.emit('wave'); decorate(); }
    });
  }

  // 7. Arranque: bienvenida (una vez por sesión) y lectura del estado de la cartera.
  decorate();
  fx.emit('intro');
  setTimeout(() => { const r = resumen(); fx.emit('status', { block: r.blk, risk: r.risk, text: r.text }); }, fx.introRunning ? 3300 : 700);
})();
