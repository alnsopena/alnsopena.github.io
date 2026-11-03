/*
 * pmo-av.js: monta los componentes audiovisuales de COSMOS Paper FX v2 sobre el portal actual.
 * Requiere, en este orden: cosmos-paper-fx.min.js, portal-fx.js (crea window.cosmosFx), pmo-data.js, este archivo.
 * No altera datos, indicadores ni filtros: solo lee PMOData.build() y agrega piezas visuales.
 * Todo se puede desactivar con window.PMO_AV = { off: true } antes de cargar el script.
 */
(function () {
  'use strict';
  const cfg = Object.assign({
    puerto: true,          // Puerto de la cartera en Resumen
    aduanaResumen: false,  // Aduana compacta retirada del Resumen ejecutivo
    aduanaPmo: true,       // Aduana por PM en Regularización (vista PMO)
    toolbar: true,         // Parte semanal y Comité guiado en la barra superior
    botadura: true,        // celebración de proyectos cerrados nuevos al abrir el portal
    muelle: true,          // Mi muelle como módulo independiente
    comite: true,          // H · Comité guiado (botón en la barra y en modo comité)
    pantalla: true,        // I · Pantalla de oficina: se abre con …/portafolio-ejecutivo-it/#pantalla
    logo: 'assets/cosmos-logo-white.png',
    voz: 'assets/voz/manifest.json',   // audios pregenerados (voz Paloma). Sin frases en el manifiesto, se usa la voz del navegador

    url: location.host + location.pathname.replace(/index\.html$/, ''),
    fullUrl: location.origin + location.pathname.replace(/index\.html$/, '')
  }, window.PMO_AV || {});
  if (cfg.off) return;
  const fx = window.cosmosFx;
  if (!fx || !window.PMOData || typeof fx.puerto !== 'function') { console.warn('[pmo-av] Falta cosmosFx v2 o PMOData; se omiten los componentes.'); return; }
  // Every dock the engine draws (Comité guiado, pantalla de oficina) uses the Resumen's priority colors and flags.
  const basePuerto = fx.puerto.bind(fx);
  fx.puerto = function () {
    const scene = basePuerto.apply(null, arguments);
    if (window.PMOPuerto && window.PMOPuerto.priorityDock) { window.PMOPuerto.priorityDock(scene); if (scene.d && scene.setData) scene.setData(window.PMOPuerto.portData(scene.d, scene.o && scene.o.filter), true); else if (scene._legend) scene._legend(); if (scene.wake) scene.wake(.3); }
    return scene;
  };

  const $ = s => document.querySelector(s);
  const g = name => { try { return (0, eval)(name); } catch (e) { return undefined; } };   // variables `let` del portal
  const safe = (fn, label) => function () { try { return fn.apply(this, arguments); } catch (e) { console.warn('[pmo-av] ' + label + ' omitido.', e); } };
  let data = null, snapshot = null, initiativeScope = null;
  const getData = () => {
    const current = g('D'), scope = (g('state') || {}).initiativeScope || 'all';
    if (!data || current !== snapshot || scope !== initiativeScope) { data = PMOData.build(); snapshot = current; initiativeScope = scope; }
    return data;
  };

  // ------------------------------------------------------------------ estilos (usa las variables del portal)
  const css = `
.pav-card{margin-top:18px}
.pav-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px}
.pav-head p{margin:4px 0 0;color:var(--muted);font-size:13px;line-height:1.45;max-width:640px}
.pav-btn{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 13px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--navy3,#003d53);font:700 13px/1 Figtree,"Segoe UI",system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.pav-btn:hover{border-color:var(--navy3,#003d53)}
.pav-btn:focus-visible,.pav-tool:focus-visible{outline:3px solid var(--sand);outline-offset:2px}
.pav-btn svg,.pav-tool svg{width:16px;height:16px;flex:none}
.pav-link{background:none;border:0;padding:0;color:var(--navy3,#003d53);font:700 13px Figtree,"Segoe UI",system-ui,sans-serif;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.pav-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;color:var(--muted);font-size:12.5px}
.pav-tools{display:flex;gap:8px}
.pav-tool{min-height:40px;display:inline-flex;align-items:center;gap:7px;padding:0 13px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:transparent;color:#fff;font:700 14px/1 Figtree,"Segoe UI",system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.pav-tool:hover{background:rgba(255,255,255,.08)}
.pav-tool[aria-pressed=true]{background:var(--sand);border-color:var(--sand);color:#021e2f}
.pav-tools.pav-side{flex-direction:column;gap:6px;margin:14px 0 0;padding:14px 0 0;border-top:1px solid var(--line)}
.pav-side .pav-tool{color:var(--navy3,#003d53);border-color:var(--line);background:#fff;min-height:38px;font-size:13px}
.pav-side .pav-tool:hover{background:#f3f6f7}
.pav-side .pav-tool[aria-pressed=true]{background:var(--sand);border-color:var(--sand);color:#021e2f}
@media(max-width:800px){.pav-tool .pav-t{display:none}.pav-tool{min-height:36px;width:38px;justify-content:center;padding:0}.pav-head{flex-direction:column}.pav-foot{flex-direction:column;align-items:flex-start}}
body.committee-mode .pav-tools .pav-tool:not(#pav-comite){display:none}
body.committee-mode #pav-comite{background:var(--sand);border-color:var(--sand);color:#021e2f}
body.committee-mode .pav-card,body.committee-mode .pav-muelle-slot{display:none}
.pav-muelle-slot{margin:0 0 18px}
.cfx-muelle{grid-template-columns:minmax(0,1fr)!important}.cfx-muelle .cfx-mu-cosmo{display:none!important}.cfx-muelle .cfx-mu-list,.cfx-muelle .cfx-mu-actions{grid-column:1}.cfx-muelle label[for="cfx-mu-alias"],.cfx-muelle #cfx-mu-alias{display:none!important}
.pav-muelle-slot{container-type:inline-size}
.pav-mu-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:18px 32px;align-items:start}
.pav-mu-hello{display:flex;flex-direction:column;gap:6px;min-width:0}
.pav-mu-hello .cfx-mu-actions{margin-top:8px}
.pav-mu-side{min-width:0;padding-top:16px;border-top:1px solid var(--line,#e3e8eb)}
.pav-mu-side .split-title{align-items:flex-start;margin-bottom:10px}
.pav-mu-side .section-title{font-size:16px;margin:0}
.pav-mu-list{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:6px}
.pav-mu-row{display:grid;gap:3px;width:100%;text-align:left;border:1px solid #E3E8EB;background:#fff;border-radius:10px;padding:9px 12px;font:600 13.5px/1.35 Figtree,"Segoe UI",system-ui,sans-serif;color:#021E2F;cursor:pointer}
.pav-mu-row:hover{border-color:#003D53}
.pav-mu-row:focus-visible{outline:3px solid var(--sand,#CBA785);outline-offset:2px}
.pav-mu-name{display:flex;align-items:baseline;gap:8px;min-width:0;overflow-wrap:anywhere}
.pav-mu-name i{flex:none;width:9px;height:9px;border-radius:50%;transform:translateY(-1px)}
.pav-mu-why{display:flex;align-items:center;gap:6px;padding-left:17px;color:#5F7079;font-weight:500;font-size:12.5px}
.pav-mu-why svg{flex:none}
.pav-mu-side .clear-filters{min-height:36px;font-size:13px}
.cfx-muelle .pav-mu-note{max-width:none;margin-top:14px}
@container (min-width:760px){.pav-mu-grid.has-side{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}.pav-mu-grid.has-side .pav-mu-side{padding:0 0 0 28px;border-top:0;border-left:1px solid var(--line,#e3e8eb)}}
@media print{.pav-tools,.pav-card,.pav-muelle-slot{display:none}}`;
  const st = document.createElement('style'); st.id = 'pmo-av-style'; st.textContent = css; document.head.appendChild(st);

  const ICON = {
    parte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor"/></svg>',
    comite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M10 8.5l4 1.5-4 1.5z"/></svg>',
    tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="12" rx="2"/><path d="M8 21h8M9 2.5l3 2.5 3-2.5"/></svg>',
    pulso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg>',
    detener: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg>'
  };

  // ------------------------------------------------------------------ barra superior
  function toolbar() {
    const host = $('.top-actions'); if (!host || $('.pav-tools')) return;
    const box = document.createElement('div'); box.className = 'pav-tools';
    const mk = (id, icon, text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pav-tool'; b.id = id; b.innerHTML = icon + '<span class="pav-t">' + text + '</span>'; b.setAttribute('aria-label', text); b.title = text; b.addEventListener('click', safe(fn, text)); box.appendChild(b); return b; };
    mk('pav-parte', ICON.parte, 'Resumen semanal', openParte);
    if (cfg.comite && fx.comite) mk('pav-comite', ICON.comite, 'Comité guiado', openComite);
    // En pantallas medianas la barra superior no tiene espacio: los botones pasan al menú lateral.
    const mq = matchMedia('(min-width:801px) and (max-width:1240px)'), side = $('.sidebar .scope');
    const place = () => { const inSide = mq.matches && side && !document.body.classList.contains('committee-mode') && !document.body.classList.contains('nav-collapsed'); box.classList.toggle('pav-side', !!inSide); if (inSide) side.before(box); else host.prepend(box); };
    place(); mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place);
    new MutationObserver(place).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (fx.sound && !fx.sound.enabled) fx.sound.setEnabled(true);
  }
  function openParte() {
    stopPulse();
    if (typeof window.toggleChat === 'function' && $('#project-chat:not([hidden])')) window.toggleChat(false);
    const back = document.activeElement;
    fx.parte(getData(), { logo: cfg.logo, url: cfg.url, voice: true }).then(() => back && back.focus && back.focus({ preventScroll: true }));
  }

  // ------------------------------------------------------------------ H · comité guiado
  function openComite() {
    stopPulse();
    if (typeof window.toggleChat === 'function' && $('#project-chat:not([hidden])')) window.toggleChat(false);
    fx.comite(getData(), {});
  }
  // ------------------------------------------------------------------ I · pantalla de oficina (#pantalla)
  let pantallaOn = false;
  function maybePantalla() {
    if (!cfg.pantalla || !fx.pantalla || !/^#pantalla\b/.test(location.hash || '')) return false;
    pantallaOn = true; fx.pantalla(getData(), { logo: cfg.logo, url: cfg.fullUrl, autostart: 20 }).done.then(() => { pantallaOn = false; });
    return true;
  }
  addEventListener('hashchange', safe(maybePantalla, 'pantalla'));

  // ------------------------------------------------------------------ piezas en las vistas
  const open = id => { if (typeof window.openProject === 'function') window.openProject(id); };
  function card(cls, title, text, btn) {
    const c = document.createElement('section'); c.className = 'card pad pav-card ' + cls;
    c.innerHTML = '<div class="pav-head"><div><h2 class="section-title">' + title + '</h2><p>' + text + '</p></div>' + (btn || '') + '</div><div class="pav-slot"></div>';
    return c;
  }
  let puerto = null, muelle = null, muelleObserver = null;
  const mineFilter = person => person ? (p => person.ids.includes(p.id)) : null;
  function setPuertoFilter(person) {
    if (!puerto || !puerto.el.isConnected) return; puerto.o.filter = mineFilter(person); puerto.update(getData());
  }
  function clearMuelleAlias() {
    try {
      const key = (fx.o && fx.o.storageKey || 'cosmos-fx') + '-muelle';
      const prefs = JSON.parse(localStorage.getItem(key) || '{}');
      if ('alias' in prefs) { delete prefs.alias; localStorage.setItem(key, JSON.stringify(prefs)); }
    } catch (_) { /* almacenamiento opcional del navegador */ }
  }
  const personKey = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '.');
  function selectedMuelleOnly() { try { return !!JSON.parse(localStorage.getItem((fx.o && fx.o.storageKey || 'cosmos-fx') + '-muelle') || '{}').only; } catch (_) { return false; } }
  function selectedMuellePerson(d) {
    try {
      const prefs = JSON.parse(localStorage.getItem((fx.o && fx.o.storageKey || 'cosmos-fx') + '-muelle') || '{}');
      if (!prefs.who) return null;
      const people = new Map();
      const add = (name, role, id) => {
        String(name || '').split(/\s*,\s*/).filter(Boolean).forEach(label => {
          const key = personKey(label); if (!key || !id) return;
          const person = people.get(key) || { key, name: label, roles: new Set(), ids: new Set() };
          person.roles.add(role); person.ids.add(String(id)); people.set(key, person);
        });
      };
      d.projects.forEach(project => { add(project.sponsorName, 'sponsor', project.id); add(project.pm, 'pm', project.id); });
      (d.contributors || []).forEach(person => (person.ids || []).forEach(id => add(person.name, 'contributor', id)));
      const person = people.get(prefs.who);
      if (!person) return null;
      const found = { ...person, roles: [...person.roles], ids: [...person.ids] };
      return { ...found, ids: PMOData.personProjects ? PMOData.personProjects(d, found).map(p => p.id) : found.ids };
    } catch (_) { return null; }
  }
  // ------------------------------------------------------------------ Mi muelle: same rules, order and texts as the Resumen
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const muelleKey = () => (fx.o && fx.o.storageKey || 'cosmos-fx') + '-muelle';
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  function muelleSummary(d, person) {
    const items = new Map((g('initiativeItems')() || []).map(i => [String(i.id), i])), item = p => items.get(p.id), order = g('attentionOrder'), past = g('past');
    const mine = PMOData.personProjects(d, person), act = mine.filter(p => p.active);
    const decide = act.filter(p => p.reasons.length && item(p)).sort((a, b) => order(item(a), item(b)));
    // "Next" means from the cut onwards, like Próximas entregas; overdue plans are already in decide.
    const next = act.filter(p => p.plan && !past(p.plan)).sort((a, b) => a.plan.localeCompare(b.plan) || a.name.localeCompare(b.name, 'es'))[0] || null;
    return { mine, act, decide, next, item, done: mine.filter(p => p.delivered), noPlan: act.filter(p => p.noFinPlan).length, crit: act.reduce((s, p) => s + p.issues.filter(x => x.critical).length, 0) };
  }
  function muelleRow(p, item) {
    const P = window.PMOPuerto, i = item(p), level = p.risk === 'block' || p.risk === 'risk' ? p.risk : null, pal = (window.CosmosFx && CosmosFx.draw && CosmosFx.draw.PAL) || {};
    const color = P && P.priorityColor ? P.priorityColor(p) : '#003d53', prio = p.priority && P ? P.priorityLabel(p.priority) : '';
    const flag = level && P && P.flagIcon ? P.flagIcon(level === 'block' ? pal.danger || '#B2493A' : pal.warn || '#C8963E') : '';
    return '<li><button type="button" class="pav-mu-row" data-id="' + esc(p.id) + '"><span class="pav-mu-name"><i style="background:' + esc(color) + '" aria-hidden="true"></i>' + esc(p.name) + '</span><span class="pav-mu-why">' + flag + '<span>' + g('attentionWhy')(i) + (prio ? ' · Prioridad ' + esc(String(prio).toLowerCase()) : '') + '</span></span></button></li>';
  }
  // Replaces the engine's welcome (this = the muelle scene): two columns, greeting on the left and decisions on the right.
  function muelleWelcome(card, box, person) {
    const prefs = this._get(), d = this.d, m = muelleSummary(d, person), first = prefs.alias || person.name.split(' ')[0], year = d.totals.year, a = m.decide.length;
    const hour = Number(new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
    const hello = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    const line = !m.act.length ? 'No tienes proyectos activos en este corte.' : a ? (a === 1 ? '1 de tus proyectos espera una decisión.' : a + ' de tus proyectos esperan una decisión.') : 'Ninguno de tus proyectos espera una decisión.';
    const roles = person.roles || [], pm = roles.includes('pm'), sponsor = roles.includes('sponsor');
    const role = sponsor && pm ? 'sponsor y PM' : sponsor ? 'sponsor' : pm ? 'PM' : 'persona con actividad';
    const chips = [m.act.length && [plural(m.act.length, 'proyecto activo', 'proyectos activos'), '#003D53'],
      m.done.length && [plural(m.done.length, 'ejecutado', 'ejecutados') + ' en ' + year, '#3F8F6B'],
      m.next && ['Próxima entrega: ' + m.next.name + ', ' + m.next.planLabel, '#CBA785'],
      m.noPlan && [m.noPlan + ' sin Fin Plan', '#9AA7AD'],
      m.crit && [plural(m.crit, 'dato crítico pendiente', 'datos críticos pendientes') + ' en monday', '#B2493A']].filter(Boolean);
    const pms = [...new Set(m.decide.map(p => p.pm))], filters = pms.length === 1 && pms[0] ? { pm: pms[0] } : {};
    const side = a ? '<aside class="pav-mu-side" aria-label="Esperan una decisión"><div class="split-title"><div><h3 class="section-title">Esperan una decisión</h3><p class="section-note">Del asunto más grave al menos grave.</p></div><span class="count">' + a + '</span></div><ul class="pav-mu-list">' + m.decide.slice(0, 3).map(p => muelleRow(p, m.item)).join('') + '</ul>' + (a > 3 ? '<p class="brief-more">Y ' + (a - 3) + ' más.</p>' : '') + '<button type="button" class="clear-filters" data-a="atencion">Ver en Riesgos y decisiones</button></aside>' : '';
    box.innerHTML = '<div class="pav-mu-grid' + (side ? ' has-side' : '') + '"><div class="pav-mu-hello"><h2>' + hello + ', ' + esc(first) + '. ' + esc(line) + '</h2><p>Tu muelle como ' + role + ': ' + plural(m.mine.length, 'proyecto', 'proyectos') + ' del tablero. Datos del corte ' + esc(d.cutLabel || '') + '.</p>' +
      '<div class="cfx-mu-chips">' + chips.map(c => '<span class="cfx-mu-chip"><i style="background:' + c[1] + '"></i>' + esc(c[0]) + '</span>').join('') + '</div>' +
      '<div class="cfx-mu-actions">' + (pm && this.o.onPortfolio ? '<button type="button" class="cfx-mu-btn" data-a="port">Ver mis proyectos en Portafolio</button>' : '') + '<button type="button" class="cfx-mu-link" data-a="change">No soy ' + esc(first) + '</button></div></div>' + side + '</div>';
    box.querySelectorAll('.pav-mu-row').forEach(b => b.addEventListener('click', () => this.o.onSelect && this.o.onSelect(b.dataset.id)));
    const port = box.querySelector('[data-a=port]'); if (port) port.addEventListener('click', () => this.o.onPortfolio(person));
    const risks = box.querySelector('[data-a=atencion]'); if (risks) risks.addEventListener('click', () => window.goFiltered('atencion', filters));
    box.querySelector('[data-a=change]').addEventListener('click', () => { this._set({ who: null, alias: null, only: false }); if (this.o.onFilter) this.o.onFilter(null); this.render(); });
    const note = document.createElement('p'); note.className = 'cfx-mu-note pav-mu-note'; note.textContent = 'Mi muelle es una vista personal guardada en este navegador; no es un inicio de sesión.'; card.appendChild(note);
  }
  // One alphabetical list without repeats: a sponsor who is also PM appears once.
  function muellePicker(base) {
    return function (box) {
      base.call(this, box);
      const select = box.querySelector('select'), seen = new Set(); if (!select) return;
      const people = this.people.filter(p => !seen.has(p.key) && seen.add(p.key)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
      select.innerHTML = '<option value="">Soy…</option>' + people.map(p => '<option value="' + esc(p.key) + '">' + esc(p.name) + '</option>').join('');
    };
  }
  // ?myPm=Nombre opens that person's dock (accents and case ignored); an unknown name shows the picker.
  function muelleFromUrl(d) {
    let wanted = ''; try { wanted = new URLSearchParams(location.search).get('myPm') || ''; } catch (_) { return; }
    if (!wanted.trim() || !window.CosmosFx || !CosmosFx.muellePeople) return;
    const person = CosmosFx.muellePeople(d).find(p => p.key === personKey(wanted));
    try { const prefs = JSON.parse(localStorage.getItem(muelleKey()) || '{}'); if (prefs.who === (person ? person.key : null) && !prefs.dismissed) return; localStorage.setItem(muelleKey(), JSON.stringify(Object.assign(prefs, { who: person ? person.key : null, alias: null, dismissed: 0 }))); } catch (_) { /* almacenamiento opcional del navegador */ }
  }
  // The URL keeps the chosen person so a reload or a copied link opens the same dock.
  function syncMuellePm(person) {
    const state = g('state'); if (!state) return;
    const name = person ? person.name : '';
    if ((state.myPm || '') === name) return;
    state.myPm = name; try { localStorage.setItem('portfolio-my-pm', name); } catch (_) { /* almacenamiento opcional del navegador */ }
    if (typeof window.syncUrl === 'function') window.syncUrl();
  }
  function mountMuelleCard(slot, d) {
    if (!cfg.muelle || !fx.muelle || !slot || slot.dataset.mounted === 'true') return;
    slot.dataset.mounted = 'true';
    clearMuelleAlias();
    muelleFromUrl(d);
    const removeCopyLink = () => slot.querySelectorAll('.cfx-mu-actions button[data-a="link"]').forEach(button => button.remove());
    if (muelleObserver) muelleObserver.disconnect();
    muelleObserver = new MutationObserver(removeCopyLink);
    muelleObserver.observe(slot, { childList: true, subtree: true });
    muelle = fx.muelle(slot, d, {
        cardClass: 'card pad', onSelect: open,
        onFilter: person => setPuertoFilter(person),
        onPortfolio: person => { const pms = {}; d.projects.filter(p => person.ids.includes(p.id) && p.pm && p.pm.includes(person.name)).forEach(p => pms[p.pm] = (pms[p.pm] || 0) + 1); const pm = Object.keys(pms).sort((a, b) => pms[b] - pms[a])[0] || person.name; window.goFiltered('portafolio', { pm }); },
        onChange: person => { syncMuellePm(person); if (person && puerto && puerto.el.isConnected) { puerto.o.filter = muelle.onlyMine ? mineFilter(person) : null; puerto.update(d); person.ids.forEach((id, k) => setTimeout(() => puerto.highlight(id), 900 + k * 180)); } }
      });
    // The engine renders in its constructor: the first time, patch its class and draw again with the portal's rules.
    const proto = Object.getPrototypeOf(muelle);
    if (proto && !proto.pavAligned) { proto.pavAligned = true; proto._welcome = muelleWelcome; proto._picker = muellePicker(proto._picker); muelle.render(); }
    removeCopyLink();
  }
  function mountMuellePage(main) {
    const slot = main.querySelector('#pav-personal-dock');
    if (slot) mountMuelleCard(slot, getData());
  }
  // ------------------------------------------------------------------ pulso: suena cada vez que se entra a Resumen y se corta al salir
  const AUTO_OVERLAYS = '.cfx-bot', USER_OVERLAYS = '.cfx-parte,.cfx-cm,.cfx-px,dialog[open]';
  const pulse = { on: false, token: 0, cancel: null };
  const inResumen = () => ((g('state') || {}).view || 'resumen') === 'resumen' && puerto && puerto.el.isConnected && puerto.el.getClientRects().length > 0;   // hidden in committee mode
  function paintPulseButtons() {
    document.querySelectorAll('[data-pav=pulso]').forEach(b => { b.innerHTML = (pulse.on ? ICON.detener : ICON.pulso) + (pulse.on ? 'Detener pulso' : 'Escuchar el pulso'); b.setAttribute('aria-pressed', String(pulse.on)); });
  }
  function startPulse() {
    cancelAutoPulse();
    if (pulse.on || !inResumen()) return;
    const token = ++pulse.token; pulse.on = true; paintPulseButtons();
    puerto.pulse({ force: true, onEnd: () => { if (token === pulse.token) { pulse.on = false; paintPulseButtons(); } } });
  }
  function stopPulse() {
    cancelAutoPulse();
    if (!pulse.on) return;
    pulse.token++; pulse.on = false; paintPulseButtons();
    // The notes are scheduled ahead on the shared AudioContext: closing it is the only way to cut them. The engine builds a new one on the next sound.
    const s = fx.sound;
    if (s && s.ctx) { try { s.ctx.close(); } catch (_) { /* ya cerrado */ } s.ctx = s.master = s.comp = s.rec = s.verb = s.verbGain = s.voiceGain = null; }
  }
  function cancelAutoPulse() { if (pulse.cancel) { pulse.cancel(); pulse.cancel = null; } }
  // Browsers only allow sound after a first gesture on the page: until then the pulse waits for the first click or key.
  function autoPulse() {
    cancelAutoPulse();
    let timer = 0, tries = 0;
    const off = () => { document.removeEventListener('pointerdown', once, true); document.removeEventListener('keydown', once, true); clearTimeout(timer); };
    const play = () => {
      timer = 0;
      if (!inResumen() || pulse.on || document.querySelector(USER_OVERLAYS)) { off(); pulse.cancel = null; return; }
      if (fx.introRunning || document.querySelector(AUTO_OVERLAYS)) { if (++tries < 50) timer = setTimeout(play, 1200); return; }
      startPulse();
    };
    const once = e => {
      document.removeEventListener('pointerdown', once, true); document.removeEventListener('keydown', once, true);
      if (e.target && e.target.closest && e.target.closest('[data-pav=pulso]')) { pulse.cancel = null; return; }   // the button itself starts it
      timer = setTimeout(play, 350);
    };
    pulse.cancel = off;
    const ua = navigator.userActivation, ctx = fx.sound && fx.sound.ctx;
    if ((ua && ua.hasBeenActive) || (ctx && ctx.state === 'running')) timer = setTimeout(play, 1200);
    else { document.addEventListener('pointerdown', once, true); document.addEventListener('keydown', once, true); }
  }
  function mountResumen(main, entering) {
    const d = getData(), kpis = main.querySelector('.grid.kpis');
    if (cfg.puerto && kpis && !main.querySelector('.pav-puerto')) {
      const c = card('pav-puerto', 'Puerto de la cartera',
        'En el muelle, las iniciativas activas por fase. En el barco, los proyectos y quick wins entregados en el año. Toca un contenedor o abre las listas de abajo para ver cada nombre.',
        '<button type="button" class="pav-btn" data-pav="pulso">' + ICON.pulso + 'Escuchar el pulso</button>');
      kpis.after(c);
      const person = selectedMuellePerson(d), onlyMine = selectedMuelleOnly(), pu = puerto = fx.puerto(c.querySelector('.pav-slot'), d, { onSelect: open, filter: person && onlyMine ? mineFilter(person) : null });
      if (window.PMOPuerto) window.PMOPuerto.enhance(pu);
      if (person) person.ids.forEach((id, k) => setTimeout(() => pu.highlight(id), 1400 + k * 180));
      const b = c.querySelector('[data-pav=pulso]');
      paintPulseButtons();
      b.addEventListener('click', safe(() => { if (pulse.on) stopPulse(); else startPulse(); }, 'pulso'));
      if (entering) autoPulse();
    }
    if (cfg.aduanaResumen && d.aduana && d.aduana.totalProjects && !main.querySelector('.pav-aduana-mini')) {
      const anchor = main.querySelector('.decision-list') || main.querySelector('.executive-charts') || kpis; if (!anchor) return;
      const c = card('pav-aduana-mini', 'Aduana de datos',
        'Un proyecto se despacha cuando sus datos críticos están completos en monday. Completarlos mejora cada decisión de este portal.', '');
      anchor.after(c);
      fx.aduana(c.querySelector('.pav-slot'), d, { compact: true, onSelect: open });
      const f = document.createElement('div'); f.className = 'pav-foot';
      f.innerHTML = '<span>Fuente: campos críticos de monday.com en el corte ' + (d.cutLabel || '') + '.</span>' +
        (g('pmoUnlocked') ? '<button type="button" class="pav-link" data-pav="reg">Ver pendientes por PM</button>' : '<a class="pav-link" target="_blank" rel="noreferrer" href="' + (d.boardUrl || '#') + '">Completar en monday</a>');
      c.appendChild(f);
      const r = f.querySelector('[data-pav=reg]'); if (r) r.addEventListener('click', () => window.go('regularizacion'));
    }
  }
  function mountRegularizacion(main) {
    const d = getData(); if (!cfg.aduanaPmo || !d.aduana || !d.aduana.totalProjects || main.querySelector('.pav-aduana')) return;
    const anchor = main.querySelector('.grid.kpis') || main.querySelector('.regularization-intro') || main.querySelector('.module-filters'); if (!anchor) return;
    const c = card('pav-aduana', 'Aduana de datos por PM',
      'Cada carril es un PM. Los proyectos cruzan la barrera cuando no les falta ningún dato crítico.', '');
    anchor.after(c);
    fx.aduana(c.querySelector('.pav-slot'), d, { onSelect: open });
    if (cfg.pantalla && fx.pantalla) {
      const f = document.createElement('div'); f.className = 'pav-foot';
      f.innerHTML = '<span>Pantalla de oficina: el Puerto, las actualizaciones y los cierres en bucle para una TV, con código QR al portal.</span><a class="pav-link" target="_blank" rel="noreferrer" href="' + cfg.fullUrl + '#pantalla">Abrir pantalla de oficina</a>';
      c.appendChild(f);
    }
  }
  let lastView = null;
  function mount() {
    const main = $('#main'), view = (g('state') || {}).view || 'resumen'; if (!main) return;
    const entering = view !== lastView; lastView = view;
    if (view !== 'resumen') stopPulse();
    if (view === 'muelle') mountMuellePage(main);
    else { if (muelleObserver) { muelleObserver.disconnect(); muelleObserver = null; } if (view === 'resumen') mountResumen(main, entering); else if (view === 'regularizacion') mountRegularizacion(main); }
  }
  const after = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { const r = o.apply(this, arguments); safe(fn, name)(); return r; }; };
  after('render', mount);

  // ------------------------------------------------------------------ botadura de cierres nuevos
  function botadura() {
    if (pantallaOn || !cfg.botadura || document.hidden || document.body.classList.contains('committee-mode')) return;
    if (pulse.on) { setTimeout(safe(botadura, 'botadura'), 2500); return; }   // the celebration waits for the pulse to finish
    const list = fx.newClosures(getData(), { firstVisitWeek: true });
    if (list.length) fx.botadura(list.slice(0, 3));
  }

  if (cfg.voz && fx.voice.useLibrary) fx.voice.useLibrary(cfg.voz);
  safe(() => { if (cfg.toolbar) toolbar(); mount(); }, 'montaje')();
  setTimeout(safe(botadura, 'botadura'), fx.introRunning ? 4600 : 1600);
  safe(maybePantalla, 'pantalla')();
  window.pmoAv = { data: getData, mount, parte: openParte, comite: openComite, pantalla: () => { location.hash = 'pantalla'; }, botadura: (list) => fx.botadura(list || getData().closedThisWeek) };
})();
