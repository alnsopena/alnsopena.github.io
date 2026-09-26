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
    aduanaResumen: true,   // Aduana compacta en Resumen
    aduanaPmo: true,       // Aduana por PM en Regularización (vista PMO)
    toolbar: true,         // botones Parte semanal / Escuchar resumen / Sonido en la barra superior
    botadura: true,        // celebración de proyectos cerrados nuevos al abrir el portal
    muelle: true,          // G · Mi muelle: recibimiento personal en Resumen
    comite: true,          // H · Comité guiado (botón en la barra y en modo comité)
    pantalla: true,        // I · Pantalla de oficina: se abre con …/portafolio-ejecutivo-it/#pantalla
    logo: 'assets/cosmos-logo-white.png',
    voz: 'assets/voz/manifest.json',   // audios pregenerados (voz Paloma). Si no existe, se usa la voz del navegador

    url: location.host + location.pathname.replace(/index\.html$/, ''),
    fullUrl: location.origin + location.pathname.replace(/index\.html$/, '')
  }, window.PMO_AV || {});
  if (cfg.off) return;
  const fx = window.cosmosFx;
  if (!fx || !window.PMOData || typeof fx.puerto !== 'function') { console.warn('[pmo-av] Falta cosmosFx v2 o PMOData; se omiten los componentes.'); return; }

  const $ = s => document.querySelector(s);
  const g = name => { try { return (0, eval)(name); } catch (e) { return undefined; } };   // variables `let` del portal
  const safe = (fn, label) => function () { try { return fn.apply(this, arguments); } catch (e) { console.warn('[pmo-av] ' + label + ' omitido.', e); } };
  let data = null;
  const getData = () => { if (!data) data = PMOData.build(); return data; };   // el snapshot es estático: se arma una vez

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
@media(min-width:1241px) and (max-width:1560px){#pav-voz .pav-t,#pav-sonido .pav-t{display:none}#pav-voz,#pav-sonido{padding:0 11px}}
body.committee-mode .pav-tools .pav-tool:not(#pav-comite){display:none}
body.committee-mode #pav-comite{background:var(--sand);border-color:var(--sand);color:#021e2f}
body.committee-mode .pav-card,body.committee-mode .pav-muelle-slot{display:none}
.pav-muelle-slot{margin:0 0 18px}
@media print{.pav-tools,.pav-card,.pav-muelle-slot{display:none}}`;
  const st = document.createElement('style'); st.id = 'pmo-av-style'; st.textContent = css; document.head.appendChild(st);

  const ICON = {
    parte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor"/></svg>',
    voz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h2M8 8v8M12 5v14M16 8v8M20 11v2"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
    sonOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/></svg>',
    sonOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    comite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M10 8.5l4 1.5-4 1.5z"/></svg>',
    tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="12" rx="2"/><path d="M8 21h8M9 2.5l3 2.5 3-2.5"/></svg>',
    pulso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg>'
  };

  // ------------------------------------------------------------------ barra superior
  let bVoz, bSon;
  function toolbar() {
    const host = $('.top-actions'); if (!host || $('.pav-tools')) return;
    const box = document.createElement('div'); box.className = 'pav-tools';
    const mk = (id, icon, text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pav-tool'; b.id = id; b.innerHTML = icon + '<span class="pav-t">' + text + '</span>'; b.setAttribute('aria-label', text); b.title = text; b.addEventListener('click', safe(fn, text)); box.appendChild(b); return b; };
    mk('pav-parte', ICON.parte, 'Parte semanal', openParte);
    bVoz = mk('pav-voz', ICON.voz, 'Escuchar resumen', toggleVoz);
    bSon = mk('pav-sonido', ICON.sonOff, 'Sonido', () => fx.sound.setEnabled(!fx.sound.enabled));
    bSon.setAttribute('aria-pressed', 'false');
    if (cfg.comite && fx.comite) mk('pav-comite', ICON.comite, 'Comité guiado', openComite);
    // En pantallas medianas la barra superior no tiene espacio: los botones pasan al menú lateral.
    const mq = matchMedia('(min-width:801px) and (max-width:1240px)'), side = $('.sidebar .scope');
    const place = () => { const inSide = mq.matches && side && !document.body.classList.contains('committee-mode'); box.classList.toggle('pav-side', !!inSide); if (inSide) side.before(box); else host.prepend(box); };
    place(); mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place);
    new MutationObserver(place).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    fx.sound.onChange(syncSon); syncSon();
  }
  function syncSon() {
    if (!bSon) return; const on = !!fx.sound.enabled;
    bSon.setAttribute('aria-pressed', String(on)); bSon.innerHTML = (on ? ICON.sonOn : ICON.sonOff) + '<span class="pav-t">Sonido</span>';
    bSon.setAttribute('aria-label', on ? 'Sonido activado. Desactivar' : 'Sonido desactivado. Activar'); bSon.title = on ? 'Desactivar sonido' : 'Activar sonido';
  }
  function setVoz(on) { if (!bVoz) return; bVoz.setAttribute('aria-pressed', String(on)); bVoz.innerHTML = (on ? ICON.stop : ICON.voz) + '<span class="pav-t">' + (on ? 'Detener' : 'Escuchar resumen') + '</span>'; bVoz.setAttribute('aria-label', on ? 'Detener resumen hablado' : 'Escuchar resumen'); }
  function toggleVoz() {
    if (fx.voice.speaking) { fx.voice.stop(); setVoz(false); return; }
    setVoz(true); fx.voice.speak(CosmosFx.briefing(getData()), { onEnd: () => setVoz(false) });
  }
  function openParte() {
    if (fx.voice.speaking) { fx.voice.stop(); setVoz(false); }
    if (typeof window.toggleChat === 'function' && $('#project-chat:not([hidden])')) window.toggleChat(false);
    const back = document.activeElement;
    fx.parte(getData(), { logo: cfg.logo, url: cfg.url }).then(() => back && back.focus && back.focus({ preventScroll: true }));
  }

  // ------------------------------------------------------------------ H · comité guiado
  function openComite() {
    if (fx.voice.speaking) { fx.voice.stop(); setVoz(false); }
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
  let puerto = null, muelle = null;
  const mineFilter = person => person ? (p => person.ids.includes(p.id)) : null;
  function setPuertoFilter(person) {
    if (!puerto || !puerto.el.isConnected) return; puerto.o.filter = mineFilter(person); puerto.update(getData());
  }
  function mountResumen(main) {
    const d = getData(), kpis = main.querySelector('.grid.kpis');
    if (cfg.muelle && fx.muelle && kpis && !main.querySelector('.pav-muelle-slot')) {
      const slot = document.createElement('div'); slot.className = 'pav-muelle-slot'; kpis.before(slot);
      muelle = fx.muelle(slot, d, {
        cardClass: 'card pad', onSelect: open,
        onFilter: person => setPuertoFilter(person),
        onPortfolio: person => { const pms = {}; d.projects.filter(p => person.ids.includes(p.id) && p.pm && p.pm.includes(person.name)).forEach(p => pms[p.pm] = (pms[p.pm] || 0) + 1); const pm = Object.keys(pms).sort((a, b) => pms[b] - pms[a])[0] || person.name; window.goFiltered('portafolio', { pm }); },
        onChange: person => { if (person && puerto && puerto.el.isConnected) { puerto.o.filter = muelle.onlyMine ? mineFilter(person) : null; puerto.update(d); person.ids.forEach((id, k) => setTimeout(() => puerto.highlight(id), 900 + k * 180)); } }
      });
    }
    if (cfg.puerto && kpis && !main.querySelector('.pav-puerto')) {
      const c = card('pav-puerto', 'Puerto de la cartera',
        'Cada contenedor es un proyecto activo, atracado en su fase. Pasa el cursor o toca uno para ver el detalle.',
        '<button type="button" class="pav-btn" data-pav="pulso">' + ICON.pulso + 'Escuchar el pulso</button>');
      kpis.after(c);
      const person = muelle && muelle.person, pu = puerto = fx.puerto(c.querySelector('.pav-slot'), d, { onSelect: open, filter: person && muelle.onlyMine ? mineFilter(person) : null });
      if (person) person.ids.forEach((id, k) => setTimeout(() => pu.highlight(id), 1400 + k * 180));
      const b = c.querySelector('[data-pav=pulso]');
      b.addEventListener('click', safe(() => { b.disabled = true; pu.pulse({ force: true, onEnd: () => { b.disabled = false; } }); }, 'pulso'));
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
      f.innerHTML = '<span>Pantalla de oficina: el Puerto, los logros y los cierres en bucle para una TV, con código QR al portal.</span><a class="pav-link" target="_blank" rel="noreferrer" href="' + cfg.fullUrl + '#pantalla">Abrir pantalla de oficina</a>';
      c.appendChild(f);
    }
  }
  function mount() {
    const main = $('#main'), view = (g('state') || {}).view || 'resumen'; if (!main) return;
    if (view === 'resumen') mountResumen(main);
    else if (view === 'regularizacion') mountRegularizacion(main);
  }
  const after = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { const r = o.apply(this, arguments); safe(fn, name)(); return r; }; };
  after('render', mount);

  // ------------------------------------------------------------------ botadura de cierres nuevos
  function botadura() {
    if (pantallaOn || !cfg.botadura || document.hidden || document.body.classList.contains('committee-mode')) return;
    const list = fx.newClosures(getData(), { firstVisitWeek: true });
    if (list.length) fx.botadura(list.slice(0, 3));
  }

  if (cfg.voz && fx.voice.useLibrary) fx.voice.useLibrary(cfg.voz);
  safe(() => { if (cfg.toolbar) toolbar(); mount(); }, 'montaje')();
  setTimeout(safe(botadura, 'botadura'), fx.introRunning ? 4600 : 1600);
  safe(maybePantalla, 'pantalla')();
  window.pmoAv = { data: getData, mount, parte: openParte, comite: openComite, pantalla: () => { location.hash = 'pantalla'; }, botadura: (list) => fx.botadura(list || getData().closedThisWeek) };
})();
