/* ============================================================
   MARCO v37: window.CC
   Menú real de Connect, registro de pantallas de los módulos,
   helpers comunes e interruptor "Ver propuestas".
   Lo usan index.html (portal interno) y portal.html (portal externo).
   Guía: docs/CONVENCIONES_v37.md (fuera del repo).
============================================================ */
(function(){
'use strict';
const W = window, D = document;
const CC = W.CC = W.CC || {};
CC.version = 'v37';
CC.portal = (D.body && D.body.dataset.portal) || 'interno';
const $ = id => D.getElementById(id);

/* ---------- Íconos (trazos SVG de 24x24) ---------- */
const IC = {
  dash:'<path d="M4 20V10M10 20V4M16 20v-7M3 20h18"/>',
  pda:'<circle cx="12" cy="12" r="8"/><path d="M9 9h4a2 2 0 0 1 0 4h-3v3"/>',
  plantilla:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 9v11"/>',
  nave:'<path d="M3 17l2 3h14l2-3"/><path d="M5 17V9h14v8M12 9V4M9 6h6"/>',
  ruta:'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/>',
  tarifa:'<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.9 2.5 2-1 2-2.5 2c-1.2 0-2.2-.6-2.6-1.6M12 6.5v11"/>',
  doc:'<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/>',
  docs:'<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 13h8M8 16h6"/>',
  reloj:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  persona:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 3.8-6 7-6s6 2 7 6"/>',
  check:'<path d="M9 12l2 2 4-4"/><rect x="4" y="4" width="16" height="16" rx="3"/>',
  caja:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  alerta:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  pausa:'<circle cx="12" cy="12" r="8"/><path d="M10 9v6M14 9v6"/>',
  moneda:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  grafico:'<path d="M5 20V8M12 20V4M19 20v-9"/>',
  tabla:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14M15 5v14"/>',
  lista:'<path d="M4 6h16M4 12h10M4 18h7M16 16l2 2 4-4"/>',
  firma:'<path d="M4 18c3 0 4-8 7-8s1 6 4 6 3-3 5-3"/><path d="M4 21h16"/>',
  llave:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/>'
};

/* ---------- Menú real de Connect (confirmado en QA) ----------
   g: grupo · o: opción · s: subgrupo · fn: llamada existente (texto)
   prop: ticket si la opción es propuesta (no está en Connect)
   Si no hay fn ni pantalla registrada, se busca en CC_SUBMENU (pantallas que ya existen).
   Lo que no tiene pantalla abre "En construcción". */
CC.MENU_INTERNO = [
  {g:'Dashboard', ic:IC.dash, ops:[{o:'Dashboard', fn:'openOperationalDashboard()', libre:true}]},
  {g:'PDA', ic:IC.pda, ops:[{o:'PDA'},{o:'PDA Plantilla', fn:'openTemplateManager()', ic:IC.plantilla}]},
  {g:'Agenciamiento', ic:IC.nave, ops:[{o:'Viaje'},{o:'Itinerario', ic:IC.ruta}]},
  {g:'Tarifa', ic:IC.tarifa, ops:[{o:'Tarifa'}]},
  {g:'Documentación', ic:IC.doc, ops:[
    {s:'Importación', o:'Documentos'},{s:'Importación', o:'Transbordo', ic:IC.ruta},{s:'Importación', o:'Direccionamiento', ic:IC.ruta},
    {s:'Exportación', o:'Documentos'},{s:'Exportación', o:'Cutoff', ic:IC.reloj}]},
  {g:'Atención al cliente', ic:IC.persona, ops:[
    {o:'Instrucciones', ic:IC.lista},{o:'Liberación de la Carga', ic:IC.check},{o:'Direccionamiento Permanente', ic:IC.ruta},
    {o:'Direccionamiento de Vacíos', ic:IC.caja},{o:'Sobreestadía', ic:IC.reloj},{o:'Daño de Contenedores', ic:IC.alerta},
    {o:'Gestión de Suspensiones', ic:IC.pausa},{o:'Reporte de Comisiones por Pagar', ic:IC.grafico},{o:'Aprobación de Usuarios Web', ic:IC.persona}]},
  {g:'Liquidación', ic:IC.tabla, ops:[{o:'Provisiones'},{o:'Documentos Contables'}]},
  {g:'Cobranzas', ic:IC.moneda, ops:[{o:'Validación de pagos'},{o:'Medios de pago', prop:'I-158'},{o:'Reportes', prop:'I-181'}]},
  {g:'Data Maestra', ic:IC.lista, ops:[{o:'Catálogo'},{o:'Organización'},{o:'Socio'},{o:'Servicios'},{o:'Nave'},{o:'Tipo de cambio'},{o:'Series'},{o:'Plantilla Email'},{o:'Días No Laborables'}]},
  {g:'Seguridad', ic:IC.llave, ops:[{o:'Usuarios'},{o:'Roles y Permisos'}]}
];
CC.MENU_EXTERNO = [
  {g:'Mandato Electrónico', ic:IC.firma, ops:[{o:'Mandato Electrónico'}]},
  {g:'Importaciones', ic:IC.doc, ops:[{o:'Direccionamiento de Carga', ic:IC.ruta}]},
  {g:'Exportaciones', ic:IC.docs, ops:[{o:'Matriz', ic:IC.tabla}]},
  {g:'Liberaciones y trámites', ic:IC.check, ops:[{o:'Desglose', ic:IC.lista},{o:'Solicitud de Liberación de carga', ic:IC.check},{o:'Autorización de Liberación de Línea', ic:IC.firma}]},
  {g:'Liquidaciones y Pagos', ic:IC.moneda, ops:[{o:'Cálculo de Sobreestadía', ic:IC.reloj},{o:'Pago', ic:IC.moneda}]}
];
CC.menu = CC.portal==='externo' ? CC.MENU_EXTERNO : CC.MENU_INTERNO;

/* ---------- Kit mínimo para portal.html (en index ya existen y no se tocan) ---------- */
function kitPortal(){
  const def = (n, f) => { if(typeof W[n]==='undefined') W[n] = f; };
  def('esc', x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  def('normTxt', x => String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase());
  def('fmtDate', iso => { if(!iso) return '-'; const [y,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${y}`; });
  def('closeModal', id => { const m = $(id); if(m) m.classList.remove('show'); });
  let tt; def('toast', (msg, type='') => { const el = $('toast'); el.textContent = msg; el.className = 'toast show '+type; clearTimeout(tt); tt = setTimeout(()=>el.className='toast '+type, 2800); });
  def('curUser', () => ($('currentUser')||{}).value || '');
  def('PAGEBAR', {}); def('GUIDES', {});
  def('updatePagebar', id => { const [t, c] = PAGEBAR[id] || ['Portal externo',['Inicio']]; W.facSetBar(id, t, c); });
  def('setMenuOn', () => {});
  def('showScreen', id => {
    D.querySelectorAll('.modal-bg.show').forEach(m=>m.classList.remove('show'));
    D.querySelectorAll('section.panel').forEach(p=>p.classList.toggle('active', p.id===id));
    W.updatePagebar(id); W.setMenuOn(id); W.scrollTo({top:0,behavior:'smooth'});
  });
  def('facEnter', id => W.showScreen(id));
  def('facSetBar', (screen, title, crumbs, backFn) => {
    const t = $('ccPbTitle'), c = $('ccCrumbs');
    if(t) t.innerHTML = backFn ? `<button type="button" class="cc-back" onclick="${backFn}" title="Volver a la búsqueda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></button>${title}` : title;
    if(c) c.innerHTML = crumbs.map((x,i)=> i===crumbs.length-1 ? `<b>${x}</b>` : x).join(' / ');
  });
  def('pagerHtml', (total, page, size, fn) => {
    const pages = Math.max(1, Math.ceil(total/size));
    const b = (lbl, p, dis, t) => `<button type="button" title="${t}" ${dis?'disabled':''} onclick="${fn}(${p})">${lbl}</button>`;
    return `<span>Items por página</span><select onchange="${fn}(1,Number(this.value))">${[10,25,50,100].map(n=>`<option ${n===size?'selected':''}>${n}</option>`).join('')}</select>
    <span class="pg-n">${page} de ${pages}</span>${b('«',1,page<=1,'Primera página')}${b('‹',page-1,page<=1,'Página anterior')}${b('›',page+1,page>=pages,'Siguiente página')}${b('»',pages,page>=pages,'Última página')}`;
  });
  def('fF', (label, inner, cls) => `<div class="fac-f ${cls||''}"><label>${label}</label>${inner}</div>`);
  def('fRo', (label, val, cls) => W.fF(label, `<input disabled value="${W.esc(val??'')}">`, cls));
  def('fSel', (opts, val, attrs, ph) => `<select ${attrs||''}>${ph!=null?`<option value="">${W.esc(ph)}</option>`:''}${opts.map(o=>{ const [v,l] = Array.isArray(o)?o:[o,o]; return `<option value="${W.esc(v)}" ${String(v)===String(val??'')?'selected':''}>${W.esc(l)}</option>`; }).join('')}</select>`);
  def('fMoney', n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}));
  def('fmTxt', (kind, hu, tk, pen) => (pen ? `Propuesta TI, por validar · ${pen}` : kind) + ` · ${hu} · ${tk}`);
  def('fm', (kind, hu, tk, pen) => `<span class="chg-tag">${W.fmTxt(kind,hu,tk,pen)}</span>`);
  def('fb', (kind, hu, tk, pen) => `data-chg="${W.fmTxt(kind,hu,tk,pen)}"`);
  def('facOpen', (html, size) => { const b = $('facModalBox'); b.className = 'modal fac-modal fac-zone '+(size||''); b.innerHTML = html; $('facModal').classList.add('show'); b.scrollTop = 0; });
  def('facClose', () => W.closeModal('facModal'));
  def('openHistModal', rows => {
    $('histBody').innerHTML = rows.length ? rows.map(r=>`<tr><td>${new Date(r.ts).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).replace(',','')}</td><td>${W.esc(r.user||'')}</td><td>${W.esc(r.prev||'')}</td><td>${W.esc(r.next||'')}</td><td>${W.esc(r.comment||'')}</td></tr>`).join('')
      : '<tr><td colspan="5" style="color:#8D9BA2;padding:16px">Sin movimientos registrados.</td></tr>';
    $('historyModal').classList.add('show');
  });
  let motivoCb = null;
  def('openReason', (title, btn, cb) => { motivoCb = cb; $('tfReasonTitle').textContent = title; $('tfReasonBtn').textContent = btn; $('tfReasonTxt').value = ''; $('tfReasonModal').classList.add('show'); setTimeout(()=>$('tfReasonTxt').focus(), 40); });
  CC._confirmarMotivo = () => { const txt = $('tfReasonTxt').value.trim(); if(!txt){ W.toast('El motivo es obligatorio','error'); return; } W.closeModal('tfReasonModal'); const cb = motivoCb; motivoCb = null; if(cb) cb(txt); };
  def('facXlsx', (file, sheet, cols, rows, foot) => {
    try{
      const widths = cols.map((c,i)=>Math.min(46, Math.max(10, String(c).length+2, ...rows.map(r=>String(r[i]??'').length+2))));
      const cell = v => typeof v==='number' ? {v, s:2} : (v??'');
      const body = [cols.map(c=>({v:c, s:3})), ...rows.map(r=>r.map(cell))];
      if(foot) body.push(foot.map((v,i)=> v==='' ? '' : {v, s: typeof v==='number' ? 4 : 1}));
      const a = D.createElement('a'); a.href = URL.createObjectURL(buildXlsx([{name:sheet.replace(/[\\/?*:\[\]]/g,' ').slice(0,31), rows:body, widths}]));
      a.download = `${file}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.xlsx`;
      D.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
      W.toast(`Excel descargado: ${rows.length} filas`,'success');
    }catch(err){ console.error(err); W.toast('No se pudo exportar el Excel','error'); }
  });
  const app = D.querySelector('.app') || D.body, add = (id, html) => { if(!$(id)) D.body.insertAdjacentHTML('beforeend', html); };
  add('facModal', '<div class="modal-bg" id="facModal"><div class="modal fac-modal fac-zone" id="facModalBox"></div></div>');
  add('historyModal', `<div class="modal-bg" id="historyModal"><div class="modal cc-hist"><h3>Historial</h3><div class="cc-hist-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Estado Anterior</th><th>Nuevo Estado</th><th>Comentario / Motivo</th></tr></thead><tbody id="histBody"></tbody></table></div><div class="cc-hist-foot"><button type="button" class="cc-hist-close" onclick="closeModal('historyModal')">Cerrar</button></div></div></div>`);
  add('tfReasonModal', `<div class="modal-bg" id="tfReasonModal"><div class="modal"><h3 id="tfReasonTitle">Motivo</h3><div class="field"><label>Motivo *</label><textarea id="tfReasonTxt" rows="3"></textarea></div><div class="actions"><button class="btn btn-ghost" onclick="closeModal('tfReasonModal')">Cancelar</button><button class="btn btn-danger" id="tfReasonBtn" onclick="CC._confirmarMotivo()">Confirmar</button></div></div></div>`);
  add('toast', '<div class="toast" id="toast"></div>');
  add('ccDropdown', '<div class="cc-dd" id="ccDropdown"></div>');
  D.addEventListener('click', e=>{ const dd = $('ccDropdown'); if(dd && dd.classList.contains('show') && !e.target.closest('#ccDropdown') && !e.target.closest('.cc-menu')) dd.classList.remove('show'); });
  W.addEventListener('scroll', ()=>$('ccDropdown')?.classList.remove('show'), {passive:true});
  void app;
}
if(typeof W.showScreen !== 'function') kitPortal();

/* ---------- Menú: armado, desplegable y navegación ---------- */
const svg = ic => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ic}</svg>`;
const grupo = g => CC.menu.find(x=>x.g===g);
const legado = (g, op) => { try{ const L = (typeof CC_SUBMENU!=='undefined' ? CC_SUBMENU : {})[g] || []; return L.find(x=>x[0]===(op.s ? `${op.s} > ${op.o}` : op.o)) || null; }catch(e){ return null; } };
const visibles = grp => grp.ops.filter(o=>CC.verPropuestas || !o.prop);
CC.opcion = (g, o, s) => { const grp = grupo(g); return grp && grp.ops.find(x=>x.o===o && (x.s||'')===(s||'')); };

function ejecutar(grp, op){
  $('ccDropdown')?.classList.remove('show');
  if(op.pantalla){ CC.abrir(op.pantalla); return; }
  const L = legado(grp.g, op), fn = op.fn || (L && L[1]);
  if(fn && fn!=='vyOut()'){
    const libre = op.libre || (L && L[3]);
    if(!libre && typeof state!=='undefined' && !state.categoryType){ W.toast('Elige primero Marítimo o Terrestre','error'); return; }
    (new Function(fn))(); return;
  }
  CC.enConstruccion(grp.g, op.o, op.s);
}
CC.ir = (g, o, s) => { const grp = grupo(g), op = CC.opcion(g, o, s); if(op) ejecutar(grp, op); };

CC.abrirGrupo = function(name, btn){
  const dd = $('ccDropdown'), grp = grupo(name);
  if(!grp){ dd.classList.remove('show'); W.toast(`${name}: fuera del alcance de este prototipo`,'info'); return; }
  if(name==='PDA' && typeof state!=='undefined' && ($('screenDashboard')?.classList.contains('active') || D.querySelector('section.panel.active.fac-screen')) && !state.categoryType){ dd.classList.remove('show'); W.showScreen('screenType'); return; }
  const ops = visibles(grp);
  if(ops.length===1){ ejecutar(grp, ops[0]); return; }
  if(dd.classList.contains('show') && dd.dataset.menu===name){ dd.classList.remove('show'); return; }
  const subs = ops.some(o=>o.s), wide = !subs && ops.length > 4;
  const boton = op => { const L = legado(grp.g, op); return `<button type="button" class="${op.prop?'cc-prop':''}" data-cc-op="${grp.ops.indexOf(op)}"${op.prop?` title="Propuesta · ${op.prop} · no está en Connect"`:''}>${svg(op.ic || (L&&L[2]) || grp.ic)}${esc(op.o)}</button>`; };
  dd.dataset.menu = name; dd.classList.toggle('wide', wide); dd.classList.toggle('subs', subs);
  dd.innerHTML = subs
    ? [...new Set(ops.map(o=>o.s))].map(s=>`<div class="cc-dd-sub"><div class="cc-dd-h">${esc(s)}</div>${ops.filter(o=>o.s===s).map(boton).join('')}</div>`).join('')
    : ops.map(boton).join('');
  const r = (btn || D.querySelector(`[data-menu="${name}"]`)).getBoundingClientRect();
  dd.style.left = (wide ? 16 : Math.max(8, r.left)) + 'px'; dd.style.top = (r.bottom + 4) + 'px';
  dd.classList.add('show');
};
function enlazarDesplegable(){
  const dd = $('ccDropdown'); if(!dd || dd.dataset.cc) return; dd.dataset.cc = '1';
  dd.addEventListener('click', e=>{ const b = e.target.closest('button[data-cc-op]'); if(!b) return; const grp = grupo(dd.dataset.menu); if(grp) ejecutar(grp, grp.ops[+b.dataset.ccOp]); });
}
function pintarMenu(){
  const nav = $('ccMenu'); if(!nav) return;
  const chev = '<svg class="cc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
  if(!nav.querySelector('button[data-menu]'))
    nav.innerHTML = CC.menu.map(x=>`<button type="button" data-menu="${esc(x.g)}" onclick="ccMenu('${esc(x.g)}',this)"><svg class="cc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${x.ic}</svg>${esc(x.g)}${chev}</button>`).join('');
  nav.querySelectorAll('button[data-menu]').forEach(b=>{ const grp = grupo(b.dataset.menu); b.classList.toggle('cc-directo', !!grp && visibles(grp).length===1); });
}
CC.marcarGrupo = g => D.querySelectorAll('#ccMenu button[data-menu]').forEach(b=>b.classList.toggle('on', b.dataset.menu===g));

/* ---------- Registro de pantallas ---------- */
CC._pantallas = {}; CC._grupoDe = {};
function seccion(id, prop){
  let s = $(id);
  if(!s){
    const ult = [...D.querySelectorAll('section.panel')].pop();
    s = D.createElement('section'); s.id = id; s.className = 'panel fac-screen fac-zone' + (prop ? ' cc-prop' : '');
    if(ult) ult.after(s); else (D.querySelector('.app') || D.body).appendChild(s);
  }
  return s;
}
/* def: { id, grupo, opcion, subgrupo, titulo, migas, html, alAbrir, guia, propuesta, libre } */
CC.registrarPantalla = function(def){
  if(!def || !/^screen[A-Z]\w*$/.test(def.id||'')) throw new Error('CC.registrarPantalla: id debe ser "screenAlgo"');
  if(CC._pantallas[def.id]) console.warn('CC: se reemplaza la pantalla', def.id);
  const titulo = def.titulo || def.opcion || def.id;
  seccion(def.id, def.propuesta);
  if(typeof def.html==='string') $(def.id).innerHTML = def.html;
  PAGEBAR[def.id] = [titulo, def.migas || ['Inicio', def.opcion || titulo, titulo].filter((x,i,a)=>a.indexOf(x)===i)];
  if(def.guia) GUIDES[def.id] = def.guia;
  if(def.grupo){
    let grp = grupo(def.grupo);
    if(!grp){ grp = {g:def.grupo, ic:IC.docs, ops:[]}; CC.menu.push(grp); }
    if(def.opcion){
      let op = CC.opcion(def.grupo, def.opcion, def.subgrupo);
      if(!op){ op = {o:def.opcion}; if(def.subgrupo) op.s = def.subgrupo; if(def.propuesta) op.prop = def.propuesta===true ? 'propuesta' : def.propuesta; grp.ops.push(op); }
      op.pantalla = def.id;
    }
    CC._grupoDe[def.id] = def.grupo;
  }
  CC._pantallas[def.id] = def;
  if(CC._iniciado) pintarMenu();
  return { id:def.id, abrir:(...a)=>CC.abrir(def.id, ...a), refrescar:()=>CC.refrescar(def.id) };
};
CC.refrescar = function(id){
  const def = CC._pantallas[id], s = $(id); if(!def || !s) return;
  if(typeof def.html==='function') s.innerHTML = def.html(s);
};
CC.abrir = function(id, ...args){
  const def = CC._pantallas[id]; if(!def){ W.toast('Pantalla no registrada: '+id,'error'); return; }
  CC.refrescar(id);
  W.facEnter(id);
  if(typeof def.alAbrir==='function') def.alAbrir($(id), ...args);
};
CC.enConstruccion = function(g, o, s){
  const id = 'screenEnConstruccion', sec = seccion(id);
  CC._grupoDe[id] = g;
  PAGEBAR[id] = [o, ['Inicio', s ? `${g} / ${s}` : g, o]];
  sec.innerHTML = `<div class="fac-card cc-obra"><div class="cc-obra-ic">${svg(IC.reloj)}</div><h3>${esc(o)}</h3>
    <p>En construcción. Esta opción existe en Connect y se sumará al prototipo.</p><div class="cc-obra-ruta">${esc(g)}${s?` / ${esc(s)}`:''} / ${esc(o)}</div></div>`;
  W.facEnter(id);
};

/* ---------- Interruptor "Ver propuestas" (solo en memoria) ---------- */
CC.verPropuestas = true;
CC.alternarPropuestas = function(v){
  CC.verPropuestas = typeof v==='boolean' ? v : !CC.verPropuestas;
  D.body.classList.toggle('cc-sin-prop', !CC.verPropuestas);
  const b = $('propToggle'); if(b){ b.classList.toggle('on', CC.verPropuestas); b.setAttribute('aria-pressed', String(CC.verPropuestas)); }
  $('ccDropdown')?.classList.remove('show');
  pintarMenu();
  const act = D.querySelector('section.panel.active');
  if(!CC.verPropuestas && act && act.classList.contains('cc-prop')) CC.inicio();
  W.dispatchEvent(new CustomEvent('cc:propuestas', {detail:CC.verPropuestas}));
};
CC.inicio = () => { if(typeof W.backToLanding==='function') W.backToLanding(); else W.showScreen('screenInicio'); };

/* ---------- Helpers para los módulos (envoltorios de lo que ya existe) ---------- */
CC.esc = x => W.esc(x);
CC.toast = (msg, tipo) => W.toast(msg, tipo||'');
CC.usuario = () => W.curUser();
CC.fecha = iso => W.fmtDate(iso);
CC.dinero = n => W.fMoney(n);
CC.campo = (label, inner, cls) => W.fF(label, inner, cls);
CC.campoLectura = (label, val, cls) => W.fRo(label, val, cls);
CC.selector = (opciones, valor, attrs, placeholder) => W.fSel(opciones, valor, attrs, placeholder);
CC.paginador = (total, pagina, tam, fnNombre) => `<div class="cc-pager" style="border:none">${W.pagerHtml(total, pagina, tam, fnNombre)}</div>`;
CC.paginar = (lista, pagina, tam) => { const paginas = Math.max(1, Math.ceil(lista.length/tam)), p = Math.min(Math.max(1,pagina), paginas); return {filas:lista.slice((p-1)*tam, p*tam), pagina:p, paginas}; };
/* Filtros estilo Connect: { id, titulo, sub, campos:[html de CC.campo], cols:2|3|4, buscar:'fn()', limpiar:'fn()', acciones:html } */
CC.filtros = o => `<div class="fac-card" ${o.id?`id="${o.id}"`:''}><div class="fac-head"><div><h3>${o.titulo||'Buscar'}</h3><div class="fac-sub">${o.sub||'Ingresar datos para buscar'}</div></div>${o.acciones?`<div class="fac-acts">${o.acciones}</div>`:''}</div>
  <div class="fac-g${o.cols||3}">${(o.campos||[]).join('')}</div>
  <div class="fac-btns">${o.buscar?`<button type="button" class="cc-btn" onclick="${o.buscar}">Buscar</button>`:''}${o.limpiar?`<button type="button" class="cc-btn" onclick="${o.limpiar}">Limpiar</button>`:''}</div></div>`;
/* Tabla de resultados con "Items por página":
   { id, titulo, columnas:[{t:'Título', k:'campo' | v:(fila)=>html}], filas, pagina, tam, fnPagina:'nombreGlobal', exportar:'fn()', acciones:html, vacio } */
CC.tablaResultados = o => {
  const tam = o.tam || 10, pg = CC.paginar(o.filas||[], o.pagina||1, tam), cols = o.columnas||[];
  const celda = (c, f) => c.v ? c.v(f) : esc(f[c.k] ?? '');
  return `<div class="fac-card" ${o.id?`id="${o.id}"`:''}><div class="fac-head"><h3>${o.titulo||'Resultados'} (${(o.filas||[]).length})</h3>${o.acciones?`<div class="fac-acts">${o.acciones}</div>`:''}</div>
  <div class="fac-scroll"><table class="fac-tbl"><thead><tr>${cols.map(c=>`<th>${c.t}</th>`).join('')}</tr></thead><tbody>
  ${pg.filas.map(f=>`<tr>${cols.map(c=>`<td>${celda(c,f)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length||1}" class="fac-empty">${o.vacio||'No se encontraron resultados con los filtros especificados.'}</td></tr>`}
  </tbody></table></div>
  <div class="fac-btns" style="justify-content:space-between;align-items:center">${o.exportar?`<button type="button" class="cc-btn" onclick="${o.exportar}">Exportar</button>`:'<span></span>'}${o.fnPagina?CC.paginador((o.filas||[]).length, pg.pagina, tam, o.fnPagina):''}</div></div>`;
};
/* Chip que muestra solo el estado activo. tono: aprobada | pendiente | rechazada | anulada (si no se da, se deduce) */
CC.chipEstado = (estado, tono) => {
  const n = W.normTxt(estado);
  const t = tono || (/anulad|cancel|inactiv|suspend/.test(n) ? 'anulada' : /rechaz|error|observ/.test(n) ? 'rechazada' : /aprob|valid|activ|vigente|liber|pagad|ok|homolog/.test(n) ? 'aprobada' : 'pendiente');
  return `<span class="cc-chip on st-${t}">${esc(estado)}</span>`;
};
CC.motivo = (titulo, boton, cb) => W.openReason(titulo, boton, cb);
CC.historial = filas => W.openHistModal(filas||[]);
CC.exportarExcel = (archivo, hoja, columnas, filas, pie) => W.facXlsx(archivo, hoja, columnas, filas, pie);
CC.modal = (html, tam) => W.facOpen(html, tam);
CC.cerrarModal = () => W.facClose();
CC.barra = (titulo, migas, volverFn) => W.facSetBar(null, titulo, migas, volverFn);
/* Marcas: fm() es la marca morada con HU y ticket; se ve con "Cambios vs Connect: sí" y se oculta con "Ver propuestas" apagado */
CC.marca = (tipo, hu, ticket, pen) => W.fm(tipo, hu, ticket, pen);
CC.marcaBloque = (tipo, hu, ticket, pen) => W.fb(tipo, hu, ticket, pen);
CC.textoPropuesta = (ticket, texto) => ['Propuesta', ticket, texto].filter(Boolean).join(' · ');
/* Atributos para un elemento que ES propuesta: <div ${CC.propuesta('I-123','Filtro nuevo')}>…</div> */
CC.propuesta = (ticket, texto, clases) => `class="cc-prop${clases?' '+clases:''}" data-prop="${esc(CC.textoPropuesta(ticket, texto))}"`;
/* Etiqueta en línea (pegada a un título o botón) */
CC.etiquetaPropuesta = (ticket, texto) => `<span class="chg-tag cc-prop">${esc(CC.textoPropuesta(ticket, texto))}</span>`;

/* ---------- Arranque ---------- */
CC.iniciar = function(){
  if(CC._iniciado) return; CC._iniciado = true;
  W.ccMenu = CC.abrirGrupo;
  const orig = W.setMenuOn;
  W.setMenuOn = function(id){ const g = CC._grupoDe[id]; if(g) CC.marcarGrupo(g); else if(orig) orig(id); };
  enlazarDesplegable(); pintarMenu();
  if(CC.portal==='externo' && !D.body.classList.contains('chg-on')) D.body.classList.add('chg-on');
};
})();
