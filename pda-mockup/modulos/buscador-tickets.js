/* ============================================================
   Buscador de tickets (cabecera, junto a "Ver propuestas").
   Escribe "I-014", "014", "HU-FAC-01" o una palabra del título y lleva a la
   pantalla donde está la marca morada del ticket, con un pulso de 2 segundos.
   Índice: CC.TICKET_INDEX (modulos/buscador-indice.js). Cada entrada trae
   { t, hu, x (texto corto), r (ruta), go (cómo llegar), portal (si está en portal.html) }.
   En portal.html solo atiende ?ticket=I-xxx al cargar.
============================================================ */
(function(){
'use strict';
const W = window, D = document, CC = W.CC;
const $ = id => D.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const espera = ms => new Promise(r => setTimeout(r, ms));
const MAX = 8;

/* ---------- Marcas en pantalla ---------- */
const SEL = '.chg-tag,[data-chg],[data-prop],.chg-removed .chg-h,.cc-prop[title]';
const textoMarca = e => e.matches('.chg-tag,.chg-h') ? e.textContent : (e.getAttribute('data-prop') || e.getAttribute('data-chg') || e.getAttribute('title') || '');
const visible = e => { if(!e.getClientRects().length) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
/* Devuelve la marca visible del ticket: primero en un modal abierto, luego en la pantalla activa, luego en cualquier parte */
CC.marcaDeTicket = function(tk){
  const re = new RegExp('(^|[^0-9A-Za-z])' + tk.replace('-', '\\-') + '(?![0-9])');
  const raices = [...D.querySelectorAll('.modal-bg.show')].concat([D.querySelector('section.panel.active'), D.body]).filter(Boolean);
  for(const r of raices){
    const m = [...r.querySelectorAll(SEL)].find(e => re.test(textoMarca(e)) && visible(e));
    if(m) return m;
  }
  return null;
};
CC.resaltarMarca = function(el){
  if(!el) return;
  el.scrollIntoView({block:'center', behavior:'instant'});
  el.classList.remove('cc-pulso'); void el.offsetWidth; el.classList.add('cc-pulso');
  clearTimeout(el._ccPulso); el._ccPulso = setTimeout(() => el.classList.remove('cc-pulso'), 2200);
};
/* Espera a que aparezca la marca (algunas pantallas pintan con setTimeout) y la resalta */
CC.irAMarca = async function(tk, ms){
  const fin = Date.now() + (ms || 2500);
  let el = null;
  while(!(el = CC.marcaDeTicket(tk)) && Date.now() < fin) await espera(100);
  if(el) CC.resaltarMarca(el);
  return el;
};

/* ---------- Ir a un ticket ---------- */
function prepararVista(){
  if(!CC.verPropuestas) CC.alternarPropuestas(true);
  if(!D.body.classList.contains('chg-on')) D.body.classList.add('chg-on');
  D.querySelectorAll('.modal-bg.show').forEach(m => m.classList.remove('show'));
  $('ccDropdown')?.classList.remove('show');
}
CC.irATicket = async function(e){
  if(e.portal && CC.portal !== 'externo'){ location.href = 'portal.html?ticket=' + encodeURIComponent(e.t) + (e.k ? '&k=' + e.k : ''); return null; }
  prepararVista();
  try { await e.go(); } catch(err){ console.warn('Buscador: no se pudo abrir', e.t, err); }
  await espera(150);
  const el = await CC.irAMarca(e.t);
  if(!el) CC.toast('La propuesta de ' + e.t + ' no está visible en esta pantalla.', 'info');
  return el;
};

/* ---------- Búsqueda ---------- */
function buscar(q){
  const idx = CC.TICKET_INDEX || [];
  q = norm(q).trim(); if(!q) return [];
  const num = (q.match(/^(?:i-?)?(\d{1,3})$/) || [])[1];
  const pesos = idx.map(e => {
    const t = norm(e.t), hu = norm(e.hu), x = norm(e.x), r = norm(e.r);
    let p = 0;
    /* "I-014" o "014": exacto. "I-01": prefijo. "14" (sin I-): I-014 primero y luego los que empiezan con 14 */
    if(num){ const exacto = t === 'i-' + num.padStart(3, '0');
      if(exacto && num.length === 3) p = 100; else if(exacto && !q.startsWith('i')) p = 80; else if(t.slice(2).startsWith(num)) p = 60; }
    else if(t === q) p = 100;
    else if(hu && hu === q) p = 90;
    else if(hu && hu.startsWith(q)) p = 70;
    else if(t.startsWith(q)) p = 60;
    else { const ps = q.split(/\s+/); if(ps.every(w => x.includes(w) || r.includes(w) || hu.includes(w))) p = ps.every(w => x.includes(w)) ? 40 : 30; }
    return {e, p};
  }).filter(o => o.p > 0);
  pesos.sort((a, b) => b.p - a.p || a.e.t.localeCompare(b.e.t));
  return pesos.slice(0, MAX).map(o => o.e);
}

/* ---------- Campo en la cabecera ---------- */
let res = [], sel = -1;
function pintarLista(){
  const ul = $('ccTkLista'), inp = $('ccTkBuscar'); if(!ul || !inp) return;
  const q = inp.value.trim();
  if(!q){ ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); return; }
  ul.innerHTML = res.length ? res.map((e, i) => `<li role="option" id="ccTkOp${i}" data-i="${i}" class="${i===sel?'on':''}" aria-selected="${i===sel}">
      <div class="cc-tk-l1"><b>${esc(e.t)}</b>${e.hu ? `<span class="cc-tk-hu">${esc(e.hu)}</span>` : ''}${e.portal ? '<span class="cc-tk-ext">Portal externo</span>' : ''}</div>
      <div class="cc-tk-x">${esc(e.x)}</div><div class="cc-tk-r">${esc(e.r)}</div></li>`).join('')
    : '<li class="cc-tk-vacio" aria-disabled="true">No hay propuestas para ese ticket</li>';
  const r = inp.getBoundingClientRect();
  ul.style.top = Math.round(r.bottom + 6) + 'px'; ul.style.right = Math.max(8, Math.round(innerWidth - r.right)) + 'px';
  ul.hidden = false; inp.setAttribute('aria-expanded', 'true');
  if(sel >= 0) inp.setAttribute('aria-activedescendant', 'ccTkOp' + sel); else inp.removeAttribute('aria-activedescendant');
  const on = ul.querySelector('li.on'); if(on) on.scrollIntoView({block:'nearest'});
}
function cerrar(){ const ul = $('ccTkLista'); if(ul) ul.hidden = true; $('ccTkBuscar')?.setAttribute('aria-expanded', 'false'); sel = -1; }
function elegir(i){
  const e = res[i]; if(!e) return;
  const inp = $('ccTkBuscar'); cerrar(); if(inp){ inp.value = ''; inp.blur(); }
  CC.irATicket(e);
}
function enlazar(){
  const inp = $('ccTkBuscar'), ul = $('ccTkLista'); if(!inp || !ul) return;
  D.body.appendChild(ul);   /* fuera de la cabecera: queda por encima de modales y no se recorta */
  W.addEventListener('resize', cerrar); W.addEventListener('scroll', () => { if(!ul.hidden) pintarLista(); }, {passive:true});
  inp.addEventListener('input', () => { res = buscar(inp.value); sel = res.length ? 0 : -1; pintarLista(); });
  inp.addEventListener('focus', () => { if(inp.value.trim()){ res = buscar(inp.value); pintarLista(); } });
  inp.addEventListener('keydown', ev => {
    if(ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
      ev.preventDefault(); if(!res.length) return;
      if(ul.hidden){ pintarLista(); return; }
      sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + res.length) % res.length; pintarLista();
    } else if(ev.key === 'Enter'){ ev.preventDefault(); if(sel >= 0) elegir(sel); }
    else if(ev.key === 'Escape'){ ev.preventDefault(); if(!ul.hidden) cerrar(); else { inp.value = ''; inp.blur(); } }
  });
  ul.addEventListener('mousedown', ev => { const li = ev.target.closest('li[data-i]'); if(!li) return; ev.preventDefault(); elegir(+li.dataset.i); });
  D.addEventListener('mousedown', ev => { if(!ev.target.closest('.cc-tk,#ccTkLista')) cerrar(); });
  /* "/" lleva al buscador cuando no se está escribiendo en otro campo */
  D.addEventListener('keydown', ev => {
    if(ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const a = D.activeElement;
    if(a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    ev.preventDefault(); inp.focus(); inp.select();
  });
}

/* ---------- Enlace directo: ?ticket=I-xxx (convive con otros parámetros, por ejemplo ?v=...) ----------
   Portal interno: hace lo mismo que elegir el ticket en el buscador; si está en el portal externo, redirige a portal.html.
   Sin marca: abre el buscador con el texto escrito y "No hay propuestas para ese ticket".
   Portal externo: abre la entrada portal del ticket (k = cuál, si hay varias). */
async function desdeUrl(){
  const q = new URLSearchParams(location.search), crudo = (q.get('ticket') || '').trim(); if(!crudo) return;
  const num = (crudo.match(/^(?:i-?)?(\d{1,3})$/i) || [])[1], tk = num ? 'I-' + num.padStart(3, '0') : crudo.toUpperCase();
  const k = q.get('k'), idx = CC.TICKET_INDEX || [];
  await espera(50);
  if(CC.portal === 'externo'){
    const e = idx.find(x => x.t === tk && x.portal && (!k || String(x.k) === k)) || idx.find(x => x.t === tk && x.portal);
    if(e) await CC.irATicket(e); else { prepararVista(); await CC.irAMarca(tk); }
    return;
  }
  const e = idx.find(x => x.t === tk && !x.portal) || idx.find(x => x.t === tk);
  if(e){ await CC.irATicket(e); return; }
  const inp = $('ccTkBuscar'); if(!inp) return;
  inp.value = crudo; inp.focus(); res = buscar(crudo); sel = res.length ? 0 : -1; pintarLista();
}

if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', arrancar); else arrancar();
function arrancar(){ if(CC.portal !== 'externo') enlazar(); desdeUrl(); }
CC._buscarTickets = buscar;
})();
