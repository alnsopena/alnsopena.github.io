/*
 * pmo-icons.js: íconos animados de papel para el menú de módulos y el timón de "Actualizar datos".
 * No depende del motor; si existe window.cosmosFx respeta su interruptor de movimiento. Cargar después de pmo-art.js.
 * Movimiento: el ícono del módulo activo se mueve suave todo el tiempo; los demás se animan al pasar el cursor.
 * El timón se mece en reposo, gira mientras consulta y muestra un check al terminar. Quieto con movimiento reducido.
 * Apagar: window.PMO_ICONS = { off: true }.
 */
(function () {
  'use strict';
  if ((window.PMO_ICONS || {}).off) return;
  const INK = '#162631';
  // Cada ícono: insignia de papel (disco crema con tinta) + ilustración; la parte animada lleva la clase "a".
  const badge = inner => '<svg class="pav-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle class="pav-ico-bg" cx="12" cy="12" r="11"/>' + inner + '</svg>';
  const ICONS = {
    // Mi muelle: pasaporte con sello que golpea
    muelle: badge('<rect x="6.5" y="5" width="11" height="14" rx="1.6" fill="#0B2B3C" stroke="' + INK + '" stroke-width=".9"/><rect x="8" y="6.5" width="8" height="11" rx=".8" fill="#FBF7EE"/><path d="M9.3 9h5.4M9.3 10.6h3.6" stroke="#9AA7AD" stroke-width=".8" stroke-linecap="round"/>' +
      '<g class="a a-stamp" style="--d:2.6s"><circle cx="13.6" cy="14.6" r="2.4" fill="none" stroke="#2F755F" stroke-width="1.1"/><path d="M12.6 14.6l.8.8 1.4-1.6" fill="none" stroke="#2F755F" stroke-width=".9" stroke-linecap="round"/></g>'),
    // Resumen: contenedor colgado del gancho de la grúa que se mece
    resumen: badge('<path d="M4 5.2h16" stroke="#A9825F" stroke-width="1.8" stroke-linecap="round"/><g class="a a-sway" style="--d:3s"><path d="M12 5.4v4" stroke="' + INK + '" stroke-width=".9"/><path d="M10.6 9.4h2.8" stroke="' + INK + '" stroke-width=".9"/>' +
      '<rect x="6.5" y="9.6" width="11" height="8" rx="1.2" fill="#003D53" stroke="' + INK + '" stroke-width=".9"/><rect x="8.6" y="11.3" width="6.8" height="4.4" rx=".9" fill="#FFF8EC"/><circle cx="10.8" cy="13.3" r=".7" fill="' + INK + '"/><circle cx="13.2" cy="13.3" r=".7" fill="' + INK + '"/></g>'),
    // Riesgos y decisiones: semáforo de la compuerta con luz roja que late
    atencion: badge('<path d="M12 18.5V20" stroke="' + INK + '" stroke-width="1.2"/><rect x="8.6" y="4" width="6.8" height="14.5" rx="2.2" fill="#1F2A30" stroke="' + INK + '" stroke-width=".9"/>' +
      '<circle class="a a-glow" style="--d:1.6s" cx="12" cy="8" r="3.6" fill="#FF6E5A" opacity=".35"/><circle class="a a-pulse" style="--d:1.6s" cx="12" cy="8" r="2" fill="#B2493A"/><circle cx="12" cy="14" r="2" fill="#2F3D36"/>'),
    // Portafolio: rosa de los vientos con aguja que tiembla
    portafolio: badge('<path d="M12 3.6l1.6 6.8L12 12l-1.6-1.6z M12 20.4l-1.6-6.8L12 12l1.6 1.6z M3.6 12l6.8-1.6L12 12l-1.6 1.6z M20.4 12l-6.8 1.6L12 12l1.6-1.6z" fill="#CBA785" stroke="' + INK + '" stroke-width=".7" stroke-linejoin="round"/>' +
      '<g class="a a-needle" style="--d:2.4s"><path d="M12 4.8l1.3 7.2h-2.6z" fill="#B2493A" stroke="' + INK + '" stroke-width=".6" stroke-linejoin="round"/><path d="M12 19.2l1.3-7.2h-2.6z" fill="#003D53" stroke="' + INK + '" stroke-width=".6" stroke-linejoin="round"/></g><circle cx="12" cy="12" r="1.2" fill="#FFF8EC" stroke="' + INK + '" stroke-width=".6"/>'),
    // Cronograma: faro con haz que barre
    cronograma: badge('<g class="a a-beam" style="--d:2.8s"><path d="M12 7.2 22 3.4v7.6z" fill="#F5D98C" opacity=".85"/></g><path d="M9 19.5 10 8.5h4l1 11z" fill="#FFF8EC" stroke="' + INK + '" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M9.5 15.5h5M9.8 12h4.4" stroke="#B2493A" stroke-width="1.8"/><rect x="9.8" y="5.8" width="4.4" height="2.8" rx=".6" fill="#FFE9A8" stroke="' + INK + '" stroke-width=".8"/><path d="M9.4 5.9 12 3.6l2.6 2.3z" fill="#003D53" stroke="' + INK + '" stroke-width=".7" stroke-linejoin="round"/><path d="M6 19.6h12" stroke="#8C8577" stroke-width="1.6" stroke-linecap="round"/>'),
    // Finanzas: frasco con monedas y una moneda que cae
    finanzas: badge('<g class="a a-drop" style="--d:2.2s"><ellipse cx="12" cy="4.6" rx="2.2" ry=".9" fill="#E3BE62" stroke="#9C7A2E" stroke-width=".6"/></g><rect x="9.4" y="6.4" width="5.2" height="1.8" rx=".5" fill="#A9825F" stroke="' + INK + '" stroke-width=".7"/>' +
      '<path d="M9.8 8.2 7.4 10.6v7.2a1.6 1.6 0 0 0 1.6 1.6h6a1.6 1.6 0 0 0 1.6-1.6v-7.2l-2.4-2.4z" fill="#EEF4F3" stroke="' + INK + '" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M7.9 14.2h8.2v3.6a1.1 1.1 0 0 1-1.1 1.1H9a1.1 1.1 0 0 1-1.1-1.1z" fill="#E3BE62"/><path d="M8.2 15.6h7.6M8.4 17.2h7.2" stroke="#9C7A2E" stroke-width=".6"/><path d="M7.9 12.6h8.2v1.6H7.9z" fill="#B8CFDA"/>'),
    // Pendiente de regularizar: portapapeles con check que se dibuja
    regularizacion: badge('<rect x="6.8" y="5.4" width="10.4" height="14" rx="1.4" fill="#FBF6EC" stroke="' + INK + '" stroke-width=".9"/><rect x="9.6" y="4.2" width="4.8" height="2.6" rx=".8" fill="#A9825F" stroke="' + INK + '" stroke-width=".7"/>' +
      '<path d="M8.8 10h6.4M8.8 12.4h4" stroke="#9AA7AD" stroke-width=".9" stroke-linecap="round"/><path class="a a-draw" style="--d:2.4s" d="M9.2 15.6l1.8 1.8 3.8-4" fill="none" stroke="#2F755F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9" stroke-dashoffset="0"/>'),
    // PPT semanal: láminas que avanzan, visible solo al desbloquear Gestión PMO
    ppt: badge('<rect x="4.8" y="6.2" width="13" height="11.8" rx="1" fill="#CBA785" stroke="' + INK + '" stroke-width=".8"/>' +
      '<g class="a a-page" style="--d:2.8s"><rect x="7" y="4.2" width="12.2" height="12" rx="1" fill="#FBF6EC" stroke="' + INK + '" stroke-width=".8"/><path d="M9 7h8M9 9.2h6M9 12.1h3.4" stroke="#527d8e" stroke-width="1" stroke-linecap="round"/><rect x="14" y="11.1" width="3" height="3" fill="#2F755F"/></g>'),
    // Más (barra móvil): ancla que se mece
    mas: badge('<g class="a a-sway" style="--d:3s" fill="none" stroke="#003D53" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="6.4" r="1.6"/><path d="M12 8v10.2M9 10.6h6M7 14.2c.4 3.2 2.8 4.2 5 4.2s4.6-1 5-4.2"/></g>')
  };
  const HELM = '<g class="pav-helm"><circle cx="12" cy="12" r="6.3"/><circle cx="12" cy="12" r="2"/>' +
    [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return '<path d="M' + (12 + c * 2).toFixed(2) + ' ' + (12 + s * 2).toFixed(2) + 'L' + (12 + c * 9.6).toFixed(2) + ' ' + (12 + s * 9.6).toFixed(2) + '"/>'; }).join('') +
    '</g><g class="pav-helm-ok"><circle cx="18.6" cy="5.4" r="5.6" fill="#2F755F" stroke="#FFF8EC" stroke-width="1.2"/><path d="M16.2 5.5l1.7 1.7 3.1-3.3" stroke="#fff" stroke-width="1.8"/></g>';

  const CSS = `
.pav-ico{width:24px;height:24px;flex:none;overflow:visible;filter:drop-shadow(.8px 1.2px 0 rgba(22,38,49,.18))}
.pav-ico-bg{fill:#FFF8EC;stroke:${INK};stroke-width:.9}
.nav button.pav-has-ico,.secondary-nav button.pav-has-ico,.sheet-item.pav-has-ico{display:flex;align-items:center;gap:10px}
.nav button.active .pav-ico{filter:drop-shadow(0 0 0 transparent) drop-shadow(1px 1.5px 0 rgba(0,0,0,.25))}
.mobile-bar button.pav-has-ico{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.05}
.mobile-bar button.pav-has-ico .pav-ico{width:22px;height:22px}
.pav-ico .a{transform-box:fill-box;animation:none}
.pav-ico .a-sway{transform-origin:50% 0}
.pav-ico .a-needle{transform-origin:50% 50%}
.pav-ico .a-beam{transform-origin:0% 50%}
.pav-ico .a-stamp{transform-origin:50% 50%}
.pav-ico .a-page{transform-origin:15% 85%}
@keyframes pav-sway{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes pav-stamp{0%,55%,100%{transform:translateY(0) scale(1);opacity:1}70%{transform:translateY(-2.5px) scale(1.18);opacity:.55}82%{transform:translateY(.5px) scale(.94);opacity:1}}
@keyframes pav-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes pav-glow{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.08;transform:scale(1.35)}}
@keyframes pav-needle{0%,100%{transform:rotate(-9deg)}35%{transform:rotate(7deg)}65%{transform:rotate(-3deg)}}
@keyframes pav-beam{0%,100%{transform:scaleX(1) rotate(-6deg);opacity:.9}50%{transform:scaleX(.35) rotate(8deg);opacity:.35}}
@keyframes pav-drop{0%{transform:translateY(-2px);opacity:0}20%{opacity:1}70%{transform:translateY(9px);opacity:1}85%,100%{transform:translateY(10px);opacity:0}}
@keyframes pav-draw{0%{stroke-dashoffset:9}45%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:.2}}
@keyframes pav-page{0%,100%{transform:rotate(0) translateX(0)}50%{transform:rotate(7deg) translateX(1px)}}
.pav-ico .a-sway{--k:pav-sway}.pav-ico .a-stamp{--k:pav-stamp}.pav-ico .a-pulse{--k:pav-pulse}.pav-ico .a-glow{--k:pav-glow;transform-origin:50% 50%}.pav-ico .a-needle{--k:pav-needle}.pav-ico .a-beam{--k:pav-beam}.pav-ico .a-drop{--k:pav-drop}.pav-ico .a-draw{--k:pav-draw}.pav-ico .a-page{--k:pav-page}
/* sutil siempre en el módulo activo; fuerte al pasar el cursor o al enfocar */
.nav button.active .pav-ico .a,.secondary-nav button.active .pav-ico .a,.mobile-bar button[aria-current="page"] .pav-ico .a{animation:var(--k) var(--d,2.6s) ease-in-out infinite}
.nav button:hover .pav-ico .a,.nav button:focus-visible .pav-ico .a,.secondary-nav button:hover .pav-ico .a,.secondary-nav button:focus-visible .pav-ico .a,.mobile-bar button:hover .pav-ico .a,.sheet-item:hover .pav-ico .a,.sheet-item:focus-visible .pav-ico .a{animation:var(--k) calc(var(--d,2.6s) * .5) ease-in-out infinite}
.nav button:hover .pav-ico,.sheet-item:hover .pav-ico{transform:translateY(-1px) rotate(-4deg);transition:transform .2s}
/* timón de Actualizar datos */
#refresh-data-button .refresh-icon.pav-helm-ico{width:19px;height:19px;overflow:visible}
.pav-helm{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;transform-origin:12px 12px;transform-box:view-box;animation:pav-helm-rock 3.2s ease-in-out infinite}
.pav-helm-ok{opacity:0;transform:scale(.3);transform-origin:18.6px 5.4px;transform-box:view-box;fill:none;stroke-linecap:round;stroke-linejoin:round}
@keyframes pav-helm-rock{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(14deg)}}
@keyframes pav-helm-spin{to{transform:rotate(360deg)}}
@keyframes pav-helm-ok{0%{opacity:0;transform:scale(.3)}60%{opacity:1;transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}
@keyframes pav-helm-shake{0%,100%{transform:rotate(0)}20%{transform:rotate(-18deg)}40%{transform:rotate(14deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(4deg)}}
#refresh-data-button:hover .pav-helm{animation:pav-helm-spin 1.6s cubic-bezier(.5,.1,.3,1) infinite}
#refresh-data-button.is-loading .refresh-icon.pav-helm-ico{animation:none}
#refresh-data-button.is-loading .pav-helm{animation:pav-helm-spin .9s linear infinite}
#refresh-data-button[data-state="success"] .pav-helm-ok{animation:pav-helm-ok .45s ease-out forwards}
#refresh-data-button[data-state="error"] .pav-helm{animation:pav-helm-shake .6s ease-in-out 2}
@media (prefers-reduced-motion:reduce){.pav-ico .a,.pav-helm,#refresh-data-button .pav-helm{animation:none!important}.pav-helm-ok{transition:none}#refresh-data-button[data-state="success"] .pav-helm-ok{animation:none!important;opacity:1;transform:none}}
html.pav-still .pav-ico .a,html.pav-still .pav-helm{animation:none!important}
html.pav-still #refresh-data-button.is-loading .pav-helm{animation:pav-helm-spin .9s linear infinite!important}
@media print{.pav-ico{display:none}}`;
  const st = document.createElement('style'); st.id = 'pmo-icons-style'; st.textContent = CSS; document.head.appendChild(st);

  // --- nombres de vista por texto (menú lateral y hoja "Más")
  const BY_LABEL = [[/^mi muelle/i, 'muelle'], [/^resumen/i, 'resumen'], [/^riesgos/i, 'atencion'], [/^portafolio/i, 'portafolio'], [/^cronograma/i, 'cronograma'], [/^finanzas/i, 'finanzas'], [/^ppt semanal/i, 'ppt'], [/pendiente|pmo/i, 'regularizacion']];
  const viewOf = el => { const m = (el.getAttribute('onclick') || '').match(/go\('([a-z]+)'\)/); if (m) return m[1]; const t = el.textContent.trim(); const hit = BY_LABEL.find(([re]) => re.test(t)); return hit ? hit[1] : null; };
  function decorate(root, sel, mobile) {
    if (!root) return;
    root.querySelectorAll(sel).forEach(b => {
      if (b.querySelector('.pav-ico')) return;
      const v = b.dataset.mobileView || (b.id === 'more-button' ? 'mas' : viewOf(b)); if (!v || !ICONS[v]) return;
      b.insertAdjacentHTML('afterbegin', ICONS[v]); b.classList.add('pav-has-ico');
    });
  }
  function paintAll() {
    decorate(document.getElementById('nav'), 'button', false);
    decorate(document.getElementById('secondary-nav'), 'button', false);
    decorate(document.getElementById('mobile-bar'), 'button', true);
    decorate(document.getElementById('more-sheet'), '.sheet-item', false);
  }
  // el portal reescribe el menú en cada render: se vuelve a decorar
  ['nav', 'secondary-nav'].forEach(id => { const el = document.getElementById(id); if (el && 'MutationObserver' in window) new MutationObserver(() => decorate(el, 'button')).observe(el, { childList: true }); });
  paintAll();

  // --- timón de Actualizar datos
  function helm() {
    const btn = document.getElementById('refresh-data-button'); if (!btn) return;
    const svg = btn.querySelector('svg.refresh-icon'); if (!svg || svg.classList.contains('pav-helm-ico')) return;
    svg.classList.add('pav-helm-ico'); svg.innerHTML = HELM;
  }
  helm();

  // --- respeta el interruptor de movimiento de Cosmo
  const fx = window.cosmosFx;
  const still = () => document.documentElement.classList.toggle('pav-still', !!(fx && (fx.reduced || fx.enabled === false)));
  if (fx) { ['setMotion', 'setEnabled'].forEach(k => { const o = fx[k]; if (typeof o === 'function') fx[k] = function () { const r = o.apply(this, arguments); still(); return r; }; }); still(); }
  window.pmoIcons = { refresh: () => { paintAll(); helm(); }, ICONS };
})();
