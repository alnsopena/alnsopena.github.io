/* Puente entre el portal actual y COSMOS Paper FX. Ninguna reacción altera los datos. */
(function () {
  'use strict';

  if (!window.CosmosFx || typeof window.CosmosFx.create !== 'function') return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const mobileBar = $('#mobile-bar');
  const mobileBarHeight = mobileBar ? mobileBar.getBoundingClientRect().height || 64 : 64;

  // Cosmo's proactive bubble: one good and true fact about the screen (cosmo-guide.js highlight), or nothing.
  // Warnings stay in each screen's content; the bubble never opens on its own with bad news.
  const currentView = () => { try { return state.view || 'resumen'; } catch (error) { return 'resumen'; } };
  function muellePerson() {
    try {
      const prefs = JSON.parse(localStorage.getItem((fx.o && fx.o.storageKey || 'cosmos-fx') + '-muelle') || '{}');
      if (!prefs.who || prefs.dismissed || !window.pmoAv || !window.PMOData || !window.CosmosFx.muellePeople) return null;
      const d = window.pmoAv.data(), person = window.CosmosFx.muellePeople(d).find(p => p.key === prefs.who);
      return person ? { person: person.name, ids: window.PMOData.personProjects(d, person).map(p => p.id) } : null;
    } catch (error) { return null; }
  }
  function positiveText(view) {
    try {
      if (typeof cosmoGuide === 'undefined' || !cosmoGuide || typeof cosmoGuide.highlight !== 'function') return '';
      return cosmoGuide.highlight(view, view === 'muelle' ? (muellePerson() || {}) : {}) || '';
    } catch (error) { console.warn('[cosmos-paper-fx] Dato positivo omitido.', error); return ''; }
  }
  const reducedMotion = () => !!(fx && fx.reduced) || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const told = new Set();
  let positiveTimer = 0;

  // A smaller dock covers less of the last table column; on mobile it sits right above the bottom bar.
  const DOCK = { right: 18, bottom: 16, size: 64 }, DOCK_MOBILE = { right: 8, bottom: mobileBarHeight + 8, size: 46 };
  let fx;
  try {
    fx = window.cosmosFx = window.CosmosFx.create({
      dock: DOCK,
      dockMobile: DOCK_MOBILE,
      intro: 'session',
      motion: 'auto',
      idleFps: 0,
      peekAfter: 9,
      sleepAfter: 75,
      onCosmoClick: () => { window.toggleChat(); return { mood: 'happy' }; },
      label: 'Abrir asistente Cosmo',
      announce: false
    });
  } catch (error) {
    console.warn('[cosmos-paper-fx] La capa visual no pudo iniciarse.', error);
    return;
  }
  // Sin interruptor visible, se recupera una preferencia anterior que lo hubiera apagado.
  if (!fx.isEnabled()) fx.setEnabled(true);
  fx.hit.setAttribute('aria-controls', 'project-chat');
  fx.hit.setAttribute('aria-expanded', 'false');

  const emit = (event, data) => {
    try { fx.emit(event, data || {}); }
    catch (error) { console.warn('[cosmos-paper-fx] Reacción omitida.', error); }
  };
  const after = (name, reaction) => {
    const original = window[name];
    if (typeof original !== 'function') return false;
    window[name] = function () {
      const result = original.apply(this, arguments);
      try { reaction.apply(this, arguments); }
      catch (error) { console.warn('[cosmos-paper-fx] Adaptador omitido.', error); }
      return result;
    };
    return true;
  };

  const filterEmpty = element => /coincidencias|filtros aplicados|estos filtros|sin información financiera para los filtros|no hay pendientes/i.test(element.textContent);
  const findFilterEmpty = () => $$('#main .empty,#main .chart-empty').find(filterEmpty);
  const hasFilterEmpty = () => !!findFilterEmpty();
  function decorate() {
    if (!fx.isEnabled()) return;
    const empty = findFilterEmpty();
    if (empty && !empty.querySelector('.cfx-slot')) {
      const slot = document.createElement('div');
      slot.className = 'cfx-slot cfx-slot-empty';
      slot.setAttribute('aria-hidden', 'true');
      empty.prepend(slot);
      emit('empty', { el: slot });
    }
    const quiet = $('#main .milestone-board .empty');
    if (quiet) {
      const board = quiet.closest('.milestone-board');
      if (board && !board.querySelector('.cfx-slot-calma')) {
        const slot = document.createElement('div');
        slot.className = 'cfx-slot cfx-slot-calma';
        slot.setAttribute('aria-hidden', 'true');
        quiet.before(slot);
        fx.vignette(slot, 'calma');
      }
    }
  }

  const filterElement = () => $('.module-filters') || $('.executive-toolbar') || $('#main');
  const filterValue = (key, value) => ['status', 'priority', 'schedule', 'issue'].includes(key) ? value : '';
  after('render', decorate);
  after('renderPortBody', decorate);
  after('go', () => { if (!hasFilterEmpty()) emit('view'); schedulePositive(currentView()); });
  after('setFilter', (key, value) => {
    const el = filterElement();
    if (!value) emit('filter:clear', { el });
    else if (!hasFilterEmpty()) emit('filter', { el, value: filterValue(key, value) });
  });
  after('clearFilters', () => emit('filter:clear', { el: filterElement() }));
  after('setInitiativeScope', () => schedulePositive(currentView(), { force: true, delay: 700 }));
  after('setExecutivePreset', value => {
    if (value) emit('filter', { el: filterElement(), value });
    else emit('filter:clear', { el: filterElement() });
  });
  after('setRegGroup', value => emit('filter', { el: $('.group-toggle'), value }));
  after('copyViewLink', () => emit('success'));
  after('openProject', id => {
    if (!fx.isEnabled()) return;
    const head = $('#project-dialog .dialog-head');
    if (!head) return;
    const slot = document.createElement('div');
    slot.className = 'cfx-slot cfx-slot-crane';
    slot.setAttribute('aria-hidden', 'true');
    head.appendChild(slot);
    const item = D.items.find(project => String(project.id) === String(id));
    emit('project', { el: slot, status: item ? val(item, C.status) : '', onDark: true });
  });

  const chatOpen = () => !!$('#project-chat:not([hidden])');

  // The bubble never stays over the data: it closes after a few seconds or once the reader scrolls away.
  const say = fx.say.bind(fx);
  let sayY = 0;
  fx.say = function (text, options) {
    sayY = window.scrollY || 0;
    const opts = Object.assign({}, options);
    opts.ms = Math.min(opts.ms || 2200 + 35 * String(text || '').length, 5000);
    return say(text, opts);
  };
  window.addEventListener('scroll', () => { if (Math.abs((window.scrollY || 0) - sayY) > 140) fx.bubble.classList.remove('on'); }, { passive: true });
  // Any tap or key also clears it, so it never sits over what the reader is about to use.
  ['pointerdown', 'keydown'].forEach(type => document.addEventListener(type, () => fx.bubble.classList.remove('on'), { passive: true, capture: true }));

  // Fold Cosmo into a small tab. Captions and guided scenes live in the same root, so only the dock and bubble hide.
  const FOLD_KEY = 'portfolio-cosmo-folded';
  let folded = false;
  try { folded = localStorage.getItem(FOLD_KEY) === '1'; } catch (error) {}
  const fold = document.createElement('button');
  fold.type = 'button';
  fold.className = 'cosmo-min-toggle';
  function placeFold() {
    const dock = window.innerWidth < 800 ? DOCK_MOBILE : DOCK, height = 1.62 * dock.size;
    // Beside Cosmo's shoulder, clear of the bubble that opens above the dock.
    fold.style.setProperty('--cm-right', (folded ? dock.right + 6 : Math.max(4, dock.right - 6)) + 'px');
    fold.style.setProperty('--cm-bottom', (folded ? dock.bottom : dock.bottom + Math.round(height * .5)) + 'px');
  }
  function syncFold() {
    const label = folded ? 'Mostrar a Cosmo' : 'Ocultar a Cosmo';
    fold.classList.toggle('is-min', folded);
    fold.setAttribute('aria-label', label);
    fold.title = label;
    fold.innerHTML = folded ? '<span aria-hidden="true">‹</span> Cosmo' : '<span aria-hidden="true">–</span>';
    fx.root.classList.toggle('cosmo-folded', folded);
    placeFold();
  }
  fold.addEventListener('click', () => {
    folded = !folded;
    try { localStorage.setItem(FOLD_KEY, folded ? '1' : '0'); } catch (error) {}
    if (folded && chatOpen()) window.toggleChat(false);
    if (folded) fx.bubble.classList.remove('on');
    syncFold();
  });
  window.addEventListener('resize', placeFold);
  document.body.appendChild(fold);
  syncFold();

  // Once per screen and session, a moment after entering it; never over the chat, a dialog, a guided scene or committee mode.
  function schedulePositive(view, opts = {}) {
    clearTimeout(positiveTimer);
    if (!opts.force && told.has(view)) return;
    positiveTimer = window.setTimeout(() => {
      if (fx.introRunning) { schedulePositive(view, Object.assign({}, opts, { delay: 900 })); return; }
      if (currentView() !== view || !fx.isEnabled() || folded || chatOpen() || document.hidden || document.body.classList.contains('committee-mode') || $('dialog[open],.cfx-parte,.cfx-cm,.cfx-px')) return;
      if (!opts.force) {
        told.add(view);
        try { if (sessionStorage.getItem('cosmo-positive-' + view)) return; sessionStorage.setItem('cosmo-positive-' + view, '1'); } catch (error) {}
      }
      const text = positiveText(view);
      if (!text) return;
      if (reducedMotion()) fx.say(text);
      else emit('status', { text });
    }, opts.delay === undefined ? 1500 : opts.delay);
  }

  const updateVisibility = () => fx.setVisible(!document.body.classList.contains('committee-mode'));
  after('toggleFullscreen', () => {
    if (document.body.classList.contains('committee-mode') && chatOpen()) window.toggleChat(false);
    updateVisibility();
  });
  after('toggleChat', () => {
    const open = chatOpen();
    if (open && typeof window.closeMore === 'function') window.closeMore();
    fx.hit.setAttribute('aria-expanded', String(open));
    fx.hit.setAttribute('aria-label', open ? 'Cerrar asistente Cosmo' : 'Abrir asistente Cosmo');
    if (!open && document.activeElement?.classList.contains('chat-close')) fx.hit.focus({ preventScroll: true });
  });
  after('openMore', () => {
    if (!$('#more-sheet').hidden && chatOpen()) window.toggleChat(false);
  });
  document.addEventListener('fullscreenchange', updateVisibility);
  window.addEventListener('portfolio:data-updated', () => schedulePositive(currentView(), { force: true, delay: 700 }));
  window.addEventListener('beforeprint', () => fx.setVisible(false));
  window.addEventListener('afterprint', updateVisibility);

  // El portal no expone setTheme(); observar el cambio real permite conectar el evento
  // si la preferencia de tema llega desde el alojamiento o una versión posterior.
  if (!after('setTheme', () => emit('theme'))) {
    let theme = document.documentElement.getAttribute('data-theme');
    new MutationObserver(() => {
      const next = document.documentElement.getAttribute('data-theme');
      if (next !== theme) { theme = next; emit('theme'); }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  updateVisibility();
  decorate();
  emit('intro');
  schedulePositive(currentView(), { delay: fx.introRunning ? 3300 : 900 });
})();
