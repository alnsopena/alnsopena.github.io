/* Puente entre el portal actual y COSMOS Paper FX. Ninguna reacción altera los datos. */
(function () {
  'use strict';

  if (!window.CosmosFx || typeof window.CosmosFx.create !== 'function') return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const mobileBar = $('#mobile-bar');
  const mobileBarHeight = mobileBar ? mobileBar.getBoundingClientRect().height || 64 : 64;

  const summary = () => {
    const activeItems = D.items.filter(active);
    const attention = activeItems.filter(item => attentionReasons(item).length).length;
    const block = activeItems.filter(item => attentionReasons(item).some(reason => reason.startsWith('Bloqueo:'))).length;
    const risk = Math.max(0, attention - block);
    return {
      block,
      risk,
      text: `${activeItems.length} activos · ${attention} requieren atención${block ? ` · ${block} con bloqueo` : ''}`
    };
  };

  let fx;
  try {
    fx = window.cosmosFx = window.CosmosFx.create({
      dock: { right: 22, bottom: 22, size: 84 },
      dockMobile: { right: 10, bottom: mobileBarHeight + 14, size: 58 },
      intro: 'session',
      motion: 'auto',
      idleFps: 0,
      peekAfter: 9,
      sleepAfter: 75,
      onCosmoClick: () => ({ text: summary().text, mood: 'happy' }),
      label: 'Cosmo: ver resumen de la cartera',
      announce: false
    });
  } catch (error) {
    console.warn('[cosmos-paper-fx] La capa visual no pudo iniciarse.', error);
    return;
  }

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
  after('go', () => { if (!hasFilterEmpty()) emit('view'); });
  after('setFilter', (key, value) => {
    const el = filterElement();
    if (!value) emit('filter:clear', { el });
    else if (!hasFilterEmpty()) emit('filter', { el, value: filterValue(key, value) });
  });
  after('clearFilters', () => emit('filter:clear', { el: filterElement() }));
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
  const updateVisibility = () => fx.setVisible(!document.body.classList.contains('committee-mode') && !chatOpen());
  after('toggleFullscreen', updateVisibility);
  after('toggleChat', updateVisibility);
  document.addEventListener('fullscreenchange', updateVisibility);
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

  function syncSwitches() {
    for (const button of [$('#fx-button'), $('#fx-mobile-button')]) {
      if (!button) continue;
      button.disabled = false;
      button.setAttribute('aria-pressed', String(fx.isEnabled()));
      button.title = fx.isEnabled() ? 'Desactivar animaciones' : 'Activar animaciones';
    }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('#fx-button,#fx-mobile-button');
    if (!button) return;
    fx.setEnabled(!fx.isEnabled());
    syncSwitches();
    if (fx.isEnabled()) { updateVisibility(); emit('wave'); decorate(); }
    else $$('.cfx-slot').forEach(slot => slot.remove());
  });

  syncSwitches();
  updateVisibility();
  decorate();
  emit('intro');
  window.setTimeout(() => {
    if (fx.isEnabled()) emit('status', summary());
  }, fx.introRunning ? 3300 : 700);
})();
