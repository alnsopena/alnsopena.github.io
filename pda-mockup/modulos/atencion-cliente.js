/* Módulo: Atención al cliente (parte 1)
   Pantallas: Liberación de la Carga, Instrucciones, Direccionamiento Permanente, Reporte de Comisiones por Pagar.
   La parte 2 (atencion-cliente-2.js) trae Direccionamiento de Vacíos, Sobreestadía, Daño de Contenedores,
   Gestión de Suspensiones y Aprobación de Usuarios Web. Ambas comparten window.AC (helpers del módulo).
   Todo en memoria, datos ficticios sobre CC.datos. Guía: docs/CONVENCIONES_v37.md */
(function(){
'use strict';
const AC = window.AC = window.AC || {};
const esc = x => CC.esc(x);
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const G = 'Atención al cliente';

/* ============================================================
   HELPERS DEL MÓDULO (window.AC)
============================================================ */
AC.esc = esc;
AC.ahora = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
AC.hoy = () => AC.ahora().slice(0,10);
AC.sumarDias = (iso, n) => { const [y,m,d] = iso.slice(0,10).split('-').map(Number); const t = new Date(y, m-1, d+n); return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`; };
AC.f = iso => iso ? CC.fecha(iso) : '-';
AC.fh = iso => iso ? CC.fecha(iso) + (iso.length > 10 ? ' ' + iso.slice(11,16) : '') : '-';
AC.yo = () => (CC.usuario() || 'Usuario').replace(/\s*\(.*\)$/, '');
AC.clon = x => JSON.parse(JSON.stringify(x));
AC.norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
AC.tiene = (v, q) => !q || AC.norm(v).includes(AC.norm(q));
AC.v = id => { const e = $(id); return e ? String(e.value||'').trim() : ''; };
AC.slug = s => AC.norm(s).replace(/[^a-z0-9]+/g,'').slice(0,18);
AC.errConnect = txt => CC.marca('Modifica', 'Error de Connect', txt);

/* Callbacks para onclick sin funciones globales sueltas */
const CBS = {}; let seq = 0;
AC.cb = f => { const k = 'k' + (++seq); CBS[k] = f; return `acCb('${k}')`; };
window.acCb = k => { const f = CBS[k]; if(f) f(); };

/* Diálogos apilables (uno encima de otro) */
AC.dlg = (html, tam) => {
  document.querySelectorAll('.ac-dlg:not(.show)').forEach(e => e.remove());
  const n = document.querySelectorAll('.ac-dlg.show').length;
  const bg = document.createElement('div'); bg.className = 'modal-bg show ac-dlg'; bg.style.zIndex = Math.min(995, 950 + n*5);
  bg.innerHTML = `<div class="modal fac-modal fac-zone ${tam||''}"></div>`; bg.firstChild.innerHTML = html;
  document.body.appendChild(bg); return bg;
};
AC.repintar = (bg, html) => { if(bg && bg.firstChild){ const s = bg.firstChild.scrollTop; bg.firstChild.innerHTML = html; bg.firstChild.scrollTop = s; } };
AC.cerrar = () => { const l = [...document.querySelectorAll('.ac-dlg.show')]; const t = l.pop(); if(t) t.remove(); };
window.acCerrar = AC.cerrar;
AC.cab = (t, sub, x) => `<div class="ac-dh"><div><h3>${t}</h3>${sub?`<div class="fac-sub">${sub}</div>`:''}</div><button type="button" class="ac-x" title="Cerrar" onclick="${x||'acCerrar()'}">×</button></div>`;
AC.pie = (...b) => `<div class="fac-btns">${b.filter(Boolean).join('')}</div>`;
AC.btn = (t, on, cls, extra) => `<button type="button" class="cc-btn ${cls||''}" onclick="${on}" ${extra||''}>${t}</button>`;
AC.link = (t, on, extra) => `<button type="button" class="fac-link" onclick="${on}" ${extra||''}>${t}</button>`;
AC.tabs = (lista, act, fn) => `<div class="fac-tabs">${lista.map(([k,t,dis])=>`<button type="button" data-tab="${k}" class="${k===act?'on':''}" ${dis?'disabled':''} onclick="${fn}('${k}')">${t}</button>`).join('')}</div>`;
AC.lista = (id, val, opciones, ph, attrs) => `<input id="${id}" list="${id}_dl" value="${esc(val||'')}" placeholder="${esc(ph||'')}" ${attrs||''}><datalist id="${id}_dl">${opciones.map(o=>`<option value="${esc(o)}">`).join('')}</datalist>`;
AC.tabla = (cols, filas, vacio, trAttr) => `<div class="fac-scroll"><table class="fac-tbl"><thead><tr>${cols.map(c=>`<th>${c.t}</th>`).join('')}</tr></thead><tbody>${filas.length
  ? filas.map((f,i)=>`<tr ${trAttr?trAttr(f,i):''}>${cols.map(c=>`<td>${c.v?c.v(f,i):esc(f[c.k]??'')}</td>`).join('')}</tr>`).join('')
  : `<tr><td colspan="${cols.length}" class="fac-empty">${vacio||'No se encontraron resultados con los criterios seleccionados.'}</td></tr>`}</tbody></table></div>`;
AC.chips = (estados, act) => `<div class="cc-chips">${estados.map(e=>`<span class="cc-chip ${e===act?'on':''}">${esc(e)}</span>`).join('')}</div>`;

AC.confirmar = (titulo, mensaje, ok, boton) => AC.dlg(AC.cab(titulo) + `<p class="ac-p">${mensaje}</p>`
  + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn(boton||'Confirmar', `acCerrar();${AC.cb(ok)}`, '', 'data-ac="confirmar"')), 'sm');

/* Motivo obligatorio. o: {titulo, texto, etiqueta, placeholder, error, min, max, boton} */
AC.pedirMotivo = (o, ok) => {
  const id = 'acMot' + (++seq), max = o.max || 500, min = o.min || 1;
  const bg = AC.dlg(AC.cab(o.titulo) + (o.texto?`<p class="ac-p">${o.texto}</p>`:'')
    + `<div class="fac-f"><label>${o.etiqueta||'Motivo'} *</label><textarea id="${id}" rows="4" maxlength="${max}" placeholder="${esc(o.placeholder||'')}" oninput="acMotivoAyuda('${id}',${min})"></textarea>
       <div class="ac-mut" id="${id}_h">${min>1?`El motivo debe tener al menos ${min} caracteres`:''}</div></div>`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn(o.boton||'Aceptar', AC.cb(()=>{
        const v = AC.v(id);
        if(v.length < min){ CC.toast(o.error || (min>1 ? `El motivo debe tener al menos ${min} caracteres` : 'El motivo es obligatorio.'), 'error'); return; }
        AC.cerrar(); ok(v);
      }), '', 'data-ac="motivo-ok"')), 'sm');
  setTimeout(()=>{ const t = $(id); if(t) t.focus(); }, 30);
  return bg;
};
window.acMotivoAyuda = (id, min) => { const n = AC.v(id).length, h = $(id+'_h'); if(h && min>1) h.textContent = n >= min ? 'El motivo cumple con los requisitos' : `Faltan ${min-n} caracteres mínimos`; };

/* Archivos simulados (no se lee el disco: cada clic agrega un archivo ficticio) */
let nArch = 0;
AC.archivo = (base, ext) => { nArch++; return { nombre:`${base}_${String(nArch).padStart(3,'0')}.${ext||'pdf'}`, tam:`${120 + (nArch*37) % 900} KB`, fecha:AC.ahora(), usuario:AC.yo() }; };
AC.descargar = nombre => CC.toast(`Descarga simulada: ${nombre}`, 'info');
/* Diálogo "Adjuntar Documentos". o: {titulo, unico, base, ext} ; ok(archivos) */
AC.adjuntar = (o, ok) => {
  const st = { files:[] }; let bg = null;
  const add = AC.cb(()=>{ if(o.unico && st.files.length){ CC.toast('Solo se permite adjuntar un archivo','error'); return; } st.files.push(AC.archivo(o.base||'Documento', o.ext||'pdf')); AC.repintar(bg, html()); });
  const html = () => AC.cab(o.titulo || 'Adjuntar Documentos', st.files.length ? `${st.files.length} Archivo${st.files.length>1?'s':''}` : '')
    + `<div class="ac-row" style="justify-content:flex-end;margin-bottom:10px">${AC.btn('Subir Archivos', add, 'ghost', 'data-ac="subir"')}</div>`
    + (st.files.length
      ? AC.tabla([{t:'Archivo', v:f=>`${esc(f.nombre)} <span class="ac-mut">${esc(f.tam)}</span>`}, {t:'Fecha', v:f=>AC.fh(f.fecha)}, {t:'Usuario', v:f=>`<span class="fac-pill">${esc(f.usuario||'Usuario')}</span>`},
          {t:'Acciones', v:(f,i)=>AC.link('Quitar', AC.cb(()=>{ st.files.splice(i,1); AC.repintar(bg, html()); }))}], st.files)
      : `<div class="ac-empty"><b>Suba archivos PDF e imágenes para comenzar</b><p>Suba archivos PDF e imágenes para comenzar</p>${AC.btn('Seleccione Archivos', add, '', 'data-ac="seleccionar"')}</div>`)
    + `<div class="ac-mut" style="margin-top:8px">Simulación del prototipo: cada clic agrega un archivo ficticio (PDF, JPG o PNG, hasta 10 MB).</div>`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{
        if(!st.files.length){ CC.toast('Selecciona un archivo','error'); return; }
        AC.cerrar(); ok(st.files); CC.toast('Archivos subidos correctamente','success');
      }), '', 'data-ac="guardar-adj"'));
  bg = AC.dlg(html(), 'md');
};

/* Correo simulado */
AC.correo = (lista, titulo) => { const l = Array.isArray(lista) ? lista : [lista];
  AC.dlg(AC.cab(titulo || 'Correo enviado', 'Simulación del prototipo: así llega el correo.') + l.map(m=>`<div class="ac-mail"><dl><dt>Para</dt><dd>${esc(m.para)}</dd>${m.cc?`<dt>CC</dt><dd>${esc(m.cc)}</dd>`:''}<dt>Asunto</dt><dd><b>${esc(m.asunto)}</b></dd>${m.adjuntos?`<dt>Adjuntos</dt><dd>${esc(m.adjuntos)}</dd>`:''}</dl><div class="ac-body">${esc(m.cuerpo)}</div></div>`).join('')
    + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-correo"')), 'md'); };
AC.correoDe = nombre => `atencion@${AC.slug(nombre)}.example`;

/* MEMO de devolución en PDF (vista previa simulada) */
AC.memoSeq = 4120;
AC.nuevoMemo = () => `MEMO-2026-${String(++AC.memoSeq).padStart(6,'0')}`;
AC.memoPdf = m => AC.dlg(AC.cab(`MEMO de devolución ${esc(m.numero)}`, 'Vista previa del PDF (simulación). Un MEMO por depósito.')
  + `<div class="fac-pdf"><div class="fp-top"><div class="fp-logo">COSMOS</div><div class="fp-co"><b>COSMOS AGENCIA MARÍTIMA</b><br>Constancia de devolución de contenedores vacíos</div><div class="fp-box">MEMO<br>${esc(m.numero)}</div></div>
    <div class="fp-grid" style="margin-top:14px"><div class="fp-kv"><span class="k">BL</span><span>${esc(m.bl)}</span><span class="k">Consignatario</span><span>${esc(m.consignatario||'-')}</span><span class="k">Nave / Viaje</span><span>${esc(m.nave||'-')} / ${esc(m.viaje||'-')}</span></div>
    <div class="fp-kv"><span class="k">Fecha de emisión</span><span>${AC.fh(m.fecha)}</span><span class="k">Depósito</span><span>${esc(m.dep)}</span><span class="k">Dirección</span><span>${esc(m.dir||'-')}</span></div></div>
    <table><thead><tr><th>Contenedor</th><th>Tipo / tamaño</th><th>Depósito de devolución</th></tr></thead><tbody>${m.conts.map(c=>`<tr><td>${esc(c.num)}</td><td>${esc(AC.isoTxt(c.tipo))}</td><td>${esc(m.dep)}</td></tr>`).join('')}</tbody></table>
    <p style="margin-top:12px">El contenedor debe devolverse vacío en el depósito indicado. Este documento lo descarga el cliente desde el Portal Externo.</p>
    <table class="fp-sign"><tr><td><div>Atención al Cliente</div></td><td><div>Depósito</div></td><td><div>Transportista</div></td></tr></table></div>`
  + AC.pie(AC.btn('Descargar PDF', AC.cb(()=>AC.descargar(`${m.numero}.pdf`)), 'ghost'), AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-memo"')), 'lg');

/* Datos maestros ficticios del módulo */
AC.depositos = [
  {codigo:'3014', razon:'DEPÓSITO VACÍOS CALLAO NORTE S.A.C.', ruc:'20610050011', dir:'Av. Industrial 1250, Callao'},
  {codigo:'3022', razon:'ALMACÉN TEMPORAL PUERTO SUR S.A.', ruc:'20610050022', dir:'Av. Los Puertos 3400, Callao'},
  {codigo:'3035', razon:'CONTAINER YARD LIMA ESTE S.A.C.', ruc:'20610050033', dir:'Av. Las Torres 820, Lurigancho'},
  {codigo:'3047', razon:'TERMINAL DE VACÍOS VENTANILLA S.A.C.', ruc:'20610050044', dir:''}
];
AC.dep = k => AC.depositos.find(d=>d.codigo===k || d.razon===k);
AC.agentes = ['AGENCIA DE ADUANAS PACÍFICO S.A.C.','ADUANAS Y DESPACHOS DEL CALLAO S.A.','CORPORACIÓN ADUANERA LIMA S.A.C.'].map((n,i)=>({doc:`2061006${String(i+1).padStart(4,'0')}`, nombre:n}));
AC.operadores = ['OPERADOR LOGÍSTICO ANDINO S.A.C.','LOGÍSTICA INTEGRAL DEL PUERTO S.A.'].map((n,i)=>({doc:`2061007${String(i+1).padStart(4,'0')}`, nombre:n}));
AC.iso = [['22G1','22G1 · 20 Dry Van'],['42G1','42G1 · 40 Dry Van'],['45G1','45G1 · 40 High Cube'],['45R1','45R1 · 40 Reefer High Cube']];
AC.isoDe = tipo => ({'20DV':'22G1','40DV':'42G1','40HC':'45G1','40RH':'45R1'})[tipo] || tipo;
AC.isoTxt = code => (AC.iso.find(x=>x[0]===code) || [code, code||'-'])[1];
AC.familia = code => ({'22G1':'20 DRY','42G1':'40 DRY','45G1':'40 HC','45R1':'40 REEFER'})[code] || 'ESPECIAL';
AC.sucursales = ['Callao','Paita'];
AC.unidades = ['Días calendario','Días hábiles'];
AC.fechasIni = ['Fecha de descarga','Fecha de arribo','Fecha de retiro'];
AC.lineaNombre = c => (CC.datos.lineas.find(l=>l.codigo===c) || {nombre:c}).nombre;
let blsCache = null;
AC.bls = () => blsCache || (blsCache = CC.datos.blImportacion.map((b,i)=>{
  const vj = CC.datos.viajes.find(v=>v.numero===b.viaje && v.nave===b.nave);
  return Object.assign({}, b, { puerto:(vj && vj.puerto) || 'Callao', eta:(vj && vj.eta) || '2026-11-10', hijo: b.tipo==='House B/L' ? b.numero.slice(0,4)+'H'+b.numero.slice(5) : '',
    agente:AC.agentes[i % 3].nombre, operador:AC.operadores[i % 2].nombre });
}));
AC.contsDe = bl => CC.datos.contenedores.filter(c=>c.bl===bl);

/* ============================================================
   1. LIBERACIÓN DE LA CARGA
============================================================ */
const LIB = { f:{sol:'',bl:'',hijo:'',estado:'Pendiente',nave:'',viaje:'',cons:'',agente:'',desde:'',hasta:''}, avanz:false, pagina:1, tam:10,
  lista:null, vista:'buscar', act:null, modo:'', tab:'info', sucio:false, seq:108 };
AC.lib = () => { libSeed(); return LIB; }; /* lectura para pruebas */
const LIB_ESTADOS = ['Pendiente','En proceso','Aprobado','Rechazado'];
const LIB_EMISION = ['Original','Telex release','Seaway bill'];
const LIB_TIPOS_ADJ = ['BL Endosado','Carta de Responsabilidad','DNI/ID del Representante'];
const LIB_OTRO = 'M. Torres';
const libId = n => `LC2026${String(n).padStart(6,'0')}`;
function libSeed(){
  if(LIB.lista) return;
  const bls = AC.bls(), est = ['Pendiente','Pendiente','En proceso','Aprobado','Rechazado','Pendiente','Pendiente','Aprobado'];
  LIB.lista = est.map((e,i)=>{ const b = bls[i % bls.length];
    const r = { id:libId(101+i), estado:e, bl:b.numero, hijo:b.hijo, nave:b.nave, viaje:b.viaje, puerto:b.puerto, consignatario:b.consignatario,
      agente: i===5 ? '' : b.agente, manifiesto:b.manifiesto, entidad:AC.depositos[i % 2].razon, tipoDir:'Permanente', tipoEmision:LIB_EMISION[i % 3], operador:b.operador, obs:'',
      creado:`2026-11-${pad(5+i)}T${pad(8+i)}:15`, creadoPor: i % 2 ? 'importador@clientedemo.example' : 'R. Salas', origen: i % 2 ? 'Portal Externo' : 'Connect',
      bloqueadoPor: e==='En proceso' ? LIB_OTRO : '', fechaBloqueo: e==='En proceso' ? `2026-11-${pad(5+i)}T10:02` : '',
      val:{ linea: i!==6, pagos:true, sobre: i!==1, dias:true },
      contenedores: AC.contsDe(b.numero).map((c,k)=>({ num:c.numero, tipo:AC.isoDe(c.tipo), dep: (i===6 && k===1) ? '' : AC.depositos[(i+k) % 3].razon,
        origen: (i===6 && k===1) ? 'Sin depósito' : ['Preasignación','Instrucción de BL','Prioridad de Depósito'][(i+k) % 3], memo:'' })),
      adjuntos:[Object.assign({tipo:'BL Endosado'}, AC.archivo('BL_Endosado','pdf'))], memos:[], hist:[] };
    if(e==='Aprobado'){ libEmitir(r); r.memos.forEach(m=>m.semilla = true); r.fechaVb = `${AC.sumarDias(r.creado, 1)}T16:20`; }
    return r; });
}
/* HU-ATC-02 (I-045): Visto Bueno generado = liberación de la carga aprobada. Devuelve {id, fecha, bl} o null */
AC.vbDe = num => { libSeed();
  const r = LIB.lista.find(x=>x.estado==='Aprobado' && x.contenedores.some(c=>c.num===num));
  return r ? { id:r.id, bl:r.bl, fecha: r.fechaVb || ((r.memos[0]||{}).fecha) || r.creado } : null; };
function libDeposito(c){ if(c.dep) return c; const d = typeof AC.depositoInstruccion==='function' ? AC.depositoInstruccion(c.num) : null; return d ? Object.assign({}, c, {dep:d.dep, origen:d.origen}) : c; }
function libValidaciones(r){
  const susp = typeof AC.suspensionVigente==='function' && AC.suspensionVigente(r.consignatario);
  const sinDep = r.contenedores.filter(c=>!libDeposito(c).dep);
  return [
    ['BL liberado por la línea', r.val.linea, 'BL aprobado por la línea', 'BL no ha sido aprobado por la línea'],
    ['Pagos por documentación realizados', r.val.pagos, 'Pagos por documentación aprobados', 'Pagos por documentación pendientes o no aprobados'],
    ['Sin sobreestadía', r.val.sobre, 'Contenedor sin sobreestadía', 'Contenedor tiene sobreestadía pendiente de pago'],
    ['Sin suspensiones vigentes', !susp, 'No hay suspensiones vigentes', 'Existen suspensiones vigentes para el cliente o consignatario'],
    ['Días libres vigentes', r.val.dias, 'Días libres vigentes', 'Días libres no vigentes o expirados'],
    ['Agente de aduana asignado', !!r.agente, 'Agente de aduana asignado', 'Falta el agente de aduana del BL. Regularice el dato antes de generar el memo de devolución'],
    ['Depósito asignado a todos los contenedores', !sinDep.length, 'Todos los contenedores tienen depósito',
      `${sinDep.length} contenedor(es) sin instrucción aplicable: ${sinDep.slice(0,5).map(c=>c.num).join(', ')}${sinDep.length>5?` y ${sinDep.length-5} más`:''}`]
  ].map(([n,ok,si,no])=>({n, ok, m: ok ? si : no}));
}
function libEmitir(r){
  const grupos = {};
  r.contenedores.forEach(c=>{ const d = libDeposito(c); if(!d.dep) return; c.dep = d.dep; c.origen = d.origen; (grupos[d.dep] = grupos[d.dep] || []).push(c); });
  r.memos = Object.keys(grupos).map(dep=>{ const numero = AC.nuevoMemo(); grupos[dep].forEach(c=>c.memo = numero);
    return {numero, dep, dir:(AC.dep(dep)||{}).dir, conts:grupos[dep], bl:r.bl, consignatario:r.consignatario, nave:r.nave, viaje:r.viaje, fecha:AC.ahora()}; });
}
const libBloqueadoOtro = r => r.estado==='En proceso' && r.bloqueadoPor && r.bloqueadoPor !== AC.yo();
const libFinal = r => r.estado==='Aprobado' || r.estado==='Rechazado';
function libFiltrar(){
  const f = LIB.f;
  return LIB.lista.filter(r => AC.tiene(r.id, f.sol) && AC.tiene(r.bl, f.bl) && AC.tiene(r.hijo, f.hijo) && (!f.estado || r.estado===f.estado)
    && AC.tiene(r.nave, f.nave) && (!f.viaje || AC.tiene(`${r.viaje} - ${r.nave} - ${r.puerto}`, f.viaje)) && AC.tiene(r.consignatario, f.cons) && AC.tiene(r.agente, f.agente)
    && (!f.desde || r.creado.slice(0,10) >= f.desde) && (!f.hasta || r.creado.slice(0,10) <= f.hasta));
}
function libLeer(){ const f = LIB.f; [['sol','libFSol'],['bl','libFBl'],['hijo','libFHijo'],['estado','libFEst'],['nave','libFNave'],['viaje','libFViaje'],['cons','libFCons'],['agente','libFAg'],['desde','libFDesde'],['hasta','libFHasta']].forEach(([k,id])=>{ if($(id)) f[k] = AC.v(id); }); }
window.libBuscar = () => { libLeer(); LIB.pagina = 1; CC.refrescar('screenAcLiberacion'); if(!libFiltrar().length) CC.toast('No se encontraron liberaciones con los filtros seleccionados.','info'); };
window.libLimpiar = () => { LIB.f = {sol:'',bl:'',hijo:'',estado:'Pendiente',nave:'',viaje:'',cons:'',agente:'',desde:'',hasta:''}; LIB.pagina = 1; CC.refrescar('screenAcLiberacion'); };
window.libPagina = (p, t) => { if(t) LIB.tam = t; LIB.pagina = p; CC.refrescar('screenAcLiberacion'); };
window.libAvanz = () => { libLeer(); LIB.avanz = !LIB.avanz; CC.refrescar('screenAcLiberacion'); };
window.libExportar = () => CC.exportarExcel('Liberaciones_de_carga', 'Liberaciones',
  ['Número de solicitud','Estado','Bloqueado por','Fecha de Bloqueo','Número de BL','Número de Hijo BL','Nave','Viaje','Puerto operativo','Consignatario','Agente aduanal','Fecha de creación','Creado por','Origen'],
  libFiltrar().slice(0,1000).map(r=>[r.id, r.estado, r.bloqueadoPor, AC.fh(r.fechaBloqueo), r.bl, r.hijo, r.nave, r.viaje, r.puerto, r.consignatario, r.agente, AC.fh(r.creado), r.creadoPor, r.origen]));
window.libEliminar = id => AC.confirmar('Confirmación', '¿Deseas eliminar esta liberación de carga?', ()=>{ LIB.lista = LIB.lista.filter(r=>r.id!==id); CC.refrescar('screenAcLiberacion'); CC.toast('La liberación de carga se eliminó correctamente','success'); });

function libBuscarHtml(){
  libSeed(); const f = LIB.f, filas = libFiltrar();
  const naves = [...new Set(LIB.lista.map(r=>r.nave))], viajes = [...new Set(LIB.lista.map(r=>`${r.viaje} - ${r.nave} - ${r.puerto}`))];
  const avz = LIB.avanz ? `<div class="fac-span4"><div class="fac-sec" style="margin-top:4px">Filtros avanzados <span class="ac-mut">Usa estos filtros para refinar tu búsqueda</span></div><div class="fac-g3">
      ${CC.campo('Consignatario', CC.selector(CC.datos.socios.consignatarios.map(c=>c.razonSocial), f.cons, 'id="libFCons"', 'Ingresa el consignatario'))}
      ${CC.campo('Agente aduanal', CC.selector(AC.agentes.map(a=>a.nombre), f.agente, 'id="libFAg"', 'Ingresa el agente aduanal'))}
      ${CC.campo('Rango de fecha de creación', `<div class="ac-row"><input type="date" id="libFDesde" value="${esc(f.desde)}" style="flex:1"><input type="date" id="libFHasta" value="${esc(f.hasta)}" style="flex:1"></div>`)}</div></div>` : '';
  return CC.filtros({ id:'libF', titulo:'Búsqueda de liberaciones de carga', sub:'Ingresa uno o más filtros para encontrar una liberación existente.', cols:3,
      acciones: AC.btn('Nuevo', 'libNuevo()', '', 'id="libNuevo"'),
      campos:[
        CC.campo('Número de solicitud', `<input id="libFSol" maxlength="25" placeholder="Ingresa el número de solicitud" value="${esc(f.sol)}">`),
        CC.campo('Número de BL', `<input id="libFBl" maxlength="25" placeholder="Ingresa el número de BL" value="${esc(f.bl)}">`),
        CC.campo('Número de Hijo BL', `<input id="libFHijo" maxlength="25" placeholder="Ingresa el número de Hijo BL" value="${esc(f.hijo)}">`),
        CC.campo('Estado', CC.selector(LIB_ESTADOS, f.estado, 'id="libFEst"', 'Selecciona un estado')),
        CC.campo('Nave', AC.lista('libFNave', f.nave, naves, 'Ingresa la nave', 'maxlength="100"')),
        CC.campo('Viaje', AC.lista('libFViaje', f.viaje, viajes, 'Ingresa el viaje', 'maxlength="10"')),
        `<div class="fac-span4">${AC.link(LIB.avanz ? 'Ocultar filtros avanzados' : 'Filtros avanzados', 'libAvanz()', 'id="libAvz"')}</div>`, avz],
      buscar:'libBuscar()', limpiar:'libLimpiar()' })
    + CC.tablaResultados({ id:'libRes', filas, pagina:LIB.pagina, tam:LIB.tam, fnPagina:'libPagina', exportar:'libExportar()', vacio:'No se encontraron liberaciones con los filtros seleccionados.',
      columnas:[
        {t:'Número de solicitud', v:r=>AC.link(r.id, `libAbrir('${r.id}')`, `data-lib="${r.id}"`)}, {t:'Estado', v:r=>CC.chipEstado(r.estado)},
        {t:'Bloqueado por', v:r=>esc(r.bloqueadoPor||'-')}, {t:'Fecha de Bloqueo', v:r=>AC.fh(r.fechaBloqueo)}, {t:'Número de BL', k:'bl'}, {t:'Número de Hijo BL', v:r=>esc(r.hijo||'-')},
        {t:'Nave', k:'nave'}, {t:'Viaje', k:'viaje'}, {t:'Puerto operativo', k:'puerto'}, {t:'Consignatario', k:'consignatario'}, {t:'Agente aduanal', v:r=>esc(r.agente||'-')},
        {t:'Fecha de creación', v:r=>AC.fh(r.creado)}, {t:'Creado por', k:'creadoPor'}, {t:'Origen', k:'origen'},
        {t:'Acciones', v:r=>AC.link('Eliminar', `libEliminar('${r.id}')`, 'title="Eliminar"')}] });
}

/* Nuevo: diálogo Selección de BL */
window.libNuevo = () => {
  libSeed(); const st = { q:'', sel:null }; let bg;
  const elegibles = () => AC.bls().filter(b=>b.indicador==='Importación' && AC.tiene(b.numero, st.q));
  const html = () => { const l = elegibles();
    return AC.cab('Nueva solicitud de liberación · Selección de BL', 'Precarga los datos desde un BL existente')
      + `<p class="ac-p">Busca el BL maestro que deseas liberar</p><div class="fac-g3">${CC.campo('Número de BL', `<input id="libSelQ" placeholder="Ingresa el número de BL" value="${esc(st.q)}">`)}</div>
      <div class="fac-btns" style="position:static">${AC.btn('Limpiar', AC.cb(()=>{ st.q=''; AC.repintar(bg, html()); }), 'ghost')}${AC.btn('Buscar', AC.cb(()=>{ st.q = AC.v('libSelQ'); AC.repintar(bg, html()); }))}</div>
      <div class="ac-row" style="margin:10px 0 6px"><b>BL encontrados</b><span class="ac-mut">Selecciona uno para precargar el formulario</span><span class="ac-sp"></span><span class="ac-mut">Total: ${l.length}</span></div>
      ${l.length ? AC.tabla([{t:'', v:b=>`<input type="radio" name="libSelBl" ${st.sel===b.numero?'checked':''}>`}, {t:'Número de BL', k:'numero'}, {t:'Número de Hijo BL', v:b=>esc(b.hijo||'-')}, {t:'NAVE - VIAJE', v:b=>esc(`${b.nave} - ${b.viaje}`)}], l, '',
          b=>`style="cursor:pointer" data-bl="${esc(b.numero)}" onclick="${AC.cb(()=>{ st.sel = b.numero; AC.repintar(bg, html()); })}"`)
        : `<div class="ac-empty"><b>No se encontraron BL</b><p>No se encontraron BL elegibles. Solo se listan BL de Importación, en estado ‘Listo para facturar’</p></div>`}
      ${st.sel ? `<p class="ac-p" style="margin-top:8px">BL seleccionado: <b>${esc(st.sel)}</b></p>` : ''}
      <div class="ac-mut">Podrás cambiar tu selección más adelante.</div>`
      + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{ if(!st.sel) return; AC.cerrar(); libCrearDesde(st.sel); }), '', `data-ac="lib-sel-guardar" ${st.sel?'':'disabled'}`));
  };
  bg = AC.dlg(html(), 'lg');
};
function libCrearDesde(numero){
  const b = AC.bls().find(x=>x.numero===numero);
  LIB.act = { id:'', estado:'Pendiente', bl:b.numero, hijo:b.hijo, nave:b.nave, viaje:b.viaje, puerto:b.puerto, consignatario:b.consignatario, agente:b.agente, manifiesto:b.manifiesto,
    entidad:AC.depositos[0].razon, tipoDir:'Permanente', tipoEmision:'', operador:b.operador, obs:'', val:{linea:true, pagos:true, sobre:true, dias:true},
    contenedores: AC.contsDe(b.numero).map((c,k)=>({num:c.numero, tipo:AC.isoDe(c.tipo), dep:AC.depositos[k % 3].razon, origen:'Preasignación', memo:''})), adjuntos:[], memos:[], hist:[] };
  LIB.modo = 'crear'; LIB.tab = 'info'; LIB.sucio = false; LIB.vista = 'detalle'; libPintar();
}
window.libAbrir = id => {
  libSeed(); const r = LIB.lista.find(x=>x.id===id); if(!r) return;
  if(r.estado==='Pendiente'){ r.estado = 'En proceso'; r.bloqueadoPor = AC.yo(); r.fechaBloqueo = AC.ahora(); r.hist.push({ts:Date.now(), user:AC.yo(), prev:'Pendiente', next:'En proceso', comment:'Bloqueo al abrir la solicitud'}); }
  LIB.act = r; LIB.modo = 'editar'; LIB.tab = 'info'; LIB.vista = 'detalle'; libPintar();
};
function libPintar(){
  CC.refrescar('screenAcLiberacion');
  if(LIB.vista==='detalle') CC.barra(LIB.modo==='crear' ? 'Nueva liberación de carga' : 'Detalle de la liberación', ['Servicio al cliente','Liberación de carga', LIB.modo==='crear' ? 'Nueva liberación de carga' : 'Detalle de la liberación'], 'libVolver()');
}
window.libVolver = () => {
  if(LIB.modo==='crear' && (LIB.sucio || AC.v('libObs') || AC.v('libEmi'))) { AC.confirmar('Cambios sin guardar', 'Tienes cambios sin guardar. ¿Deseas descartarlos?', libSalir); return; }
  libSalir();
};
function libSalir(){ LIB.vista = 'buscar'; LIB.act = null; CC.abrir('screenAcLiberacion'); }
window.libTab = t => { libLeerForm(); LIB.tab = t; libPintar(); };
function libLeerForm(){ const r = LIB.act; if(!r) return; if($('libObs')) r.obs = AC.v('libObs'); if($('libEmi') && LIB.modo==='crear') r.tipoEmision = AC.v('libEmi'); }

function libDetalleHtml(){
  const r = LIB.act, crear = LIB.modo==='crear', otro = !crear && libBloqueadoOtro(r), fin = !crear && libFinal(r), editable = !otro && !fin;
  const tabs = [['info','Información de Solicitud'],['adj','Adjuntos']].concat(crear ? [] : [['dep','Depósitos de devolución']]).concat(libEdiVer(r) ? [['edi','MEMO y EDI']] : []);
  if(LIB.tab==='edi' && !libEdiVer(r)) LIB.tab = 'info';
  let cuerpo = '';
  if(LIB.tab==='info'){
    const val = (!crear && (r.estado==='Pendiente' || r.estado==='En proceso')) ? libValidaciones(r) : null;
    const ok = val && val.every(v=>v.ok);
    cuerpo = `<div class="fac-g3">
      ${crear ? '' : CC.campoLectura('Número de solicitud', r.id)}
      ${CC.campoLectura('Número de BL', r.bl)}${CC.campoLectura('Número de BL Hijo', r.hijo || '-')}${CC.campoLectura('Nave', r.nave)}
      ${CC.campoLectura('Consignatario', r.consignatario)}${CC.campoLectura('Viaje', r.viaje)}${CC.campoLectura('Número de manifiesto', r.manifiesto)}
      ${CC.campoLectura('Entidad receptora', r.entidad)}${CC.campoLectura('Tipo de direccionamiento', r.tipoDir)}${CC.campoLectura('Agente de aduanas', r.agente || '-')}
      ${CC.campo('Tipo de emisión *', CC.selector(LIB_EMISION, r.tipoEmision, `id="libEmi" ${crear ? 'onchange="libSucio()"' : 'disabled'}`, 'Selecciona el tipo de emisión'))}
      ${CC.campoLectura('Operador logístico', r.operador)}
      ${CC.campo('Observaciones', `<textarea id="libObs" maxlength="400" rows="2" ${editable ? 'oninput="libSucio()"' : 'disabled'}>${esc(r.obs)}</textarea>`, 'fac-span4')}</div>`
      + (val ? `<div class="fac-sec">Estado de Validaciones</div>${val.map(v=>`<div class="ac-val ${v.ok?'ok':'ko'}" data-val="${v.ok?'ok':'ko'}"><b>${v.ok?'✓':'✗'} ${esc(v.n)}</b><span>${esc(v.m)}</span></div>`).join('')}
          <p class="ac-p"><b>Estado general: ${ok ? 'Listo para aprobar' : 'No cumple con los requisitos'}</b></p>` : '')
      + (otro ? `<div class="fac-note warn" id="libLock">Esta solicitud está siendo atendida por ${esc(r.bloqueadoPor)}</div>` : '');
    LIB._ok = ok;
  } else if(LIB.tab==='adj'){
    cuerpo = `<div class="ac-row"><div><b>Adjuntos</b><div class="ac-mut">Gestiona los documentos de respaldo de esta liberación.</div></div><span class="ac-sp"></span>${editable ? AC.btn('Agregar', 'libAdjAgregar()', 'ghost', 'id="libAdjAdd"') : ''}</div>`
      + (r.adjuntos.length ? AC.tabla([
          {t:'Nombre de archivo', v:a=>`${esc(a.nombre)}<div class="ac-mut">${AC.fh(a.fecha)}</div>`}, {t:'Tipo', v:a=>esc(a.tipo || 'Sin especificar')},
          {t:'Acciones', v:(a,i)=>`<div class="fac-rowacts">${AC.link('Descargar', AC.cb(()=>AC.descargar(a.nombre)))}${editable ? AC.link('Eliminar', `libAdjEliminar(${i})`) : ''}</div>`}], r.adjuntos)
        : `<div class="ac-empty"><b>Aún no tienes adjuntos</b><p>Agrega el BL, cartas o identificaciones requeridas para la solicitud.</p>${editable ? AC.btn('Agregar', 'libAdjAgregar()') : ''}</div>`);
  } else if(LIB.tab==='edi'){
    cuerpo = libEdiHtml(r);
  } else {
    cuerpo = `<b>Depósitos de devolución</b><div class="fac-note">Solo informativo. El MEMO se emite con el botón Aprobar de siempre: un MEMO por depósito.</div>`
      + (r.contenedores.length ? AC.tabla([{t:'Contenedor', k:'num'}, {t:'Tipo / tamaño', v:c=>esc(`${c.tipo} · ${AC.familia(c.tipo)}`)},
          {t:'Depósito', v:c=>esc(libDeposito(c).dep || '-')}, {t:'Origen', v:c=>esc(libDeposito(c).origen)}, {t:'MEMO', v:c=>esc(c.memo || '-')}], r.contenedores)
        : `<div class="ac-empty"><b>Sin contenedores elegibles</b><p>Esta solicitud no tiene contenedores elegibles para asignarles un depósito.</p></div>`)
      + (r.memos.length ? `<div ${CC.propuesta('Sin ticket','Ver MEMO emitido desde Connect')} style="margin-top:12px"><div class="fac-sec">MEMO emitidos (PDF)</div><div class="ac-row">${r.memos.map((m,i)=>AC.btn(`Ver ${esc(m.numero)}`, `libMemo(${i})`, 'ghost', `data-memo="${esc(m.numero)}"`)).join('')}</div></div>` : '');
  }
  const bot = [];
  if(editable){
    if(!crear && LIB.tab==='info' && (r.estado==='Pendiente' || r.estado==='En proceso')) bot.push(LIB._ok ? AC.btn('Aprobar', 'libAprobar()', '', 'id="libAprobar"') : AC.btn('Rechazar', 'libRechazar()', 'pink', 'id="libRechazar"'));
    bot.push(AC.btn('Cancelar', 'libVolver()', 'ghost'));
    bot.push(`${crear ? '' : AC.errConnect('Guardar en edición')}${AC.btn('Guardar', 'libGuardar()', '', 'id="libGuardar"')}`);
  } else bot.push(AC.btn('Cancelar', 'libVolver()', 'ghost'));
  return `<div class="fac-card" id="libDet"><div class="fac-head"><h3>${crear ? 'Nueva liberación de carga' : 'Detalle de la liberación'}</h3>${AC.chips(LIB_ESTADOS, crear ? '' : r.estado)}</div>
    ${AC.tabs(tabs, LIB.tab, 'libTab').replace('data-tab="edi" class="', `data-tab="edi" data-prop="${esc(CC.textoPropuesta(LIB_EDI_TK, 'MEMO y EDI'))}" class="cc-prop `)}${cuerpo}<div class="fac-btns">${bot.join('')}</div></div>`;
}
window.libSucio = () => { LIB.sucio = true; };

/* ---------- Propuesta HU-ATC-04 · I-123: pestaña MEMO y EDI (solo lectura) y correo técnico de error ----------
   La configuración EDI de cada depósito sale de Data Maestra > Socio (Configuración SFTP > EDI MEMO). Estados simulados. */
const LIB_EDI_TK = 'HU-ATC-04 · I-123';
const LIB_EDI_ST = {sent:['Enviado','aprobada'], retry:['Pendiente','pendiente'], err:['Error','rechazada'], noedi:['Sin EDI','anulada']};
const libEdiVer = r => !!(r && r.memos && r.memos.length && CC.verPropuestas);
const libEdiCfg = dep => { const p = typeof PARTNERS!=='undefined' ? PARTNERS.find(x=>x.largo===dep) : null; return p && p.edi && p.edi.on ? p.edi : null; };
function libEdi(m){
  if(m.edi) return m.edi;
  const c = libEdiCfg(m.dep);
  if(!c) return m.edi = {st:'noedi'};
  const n = +String(m.numero).slice(-6), st = m.semilla ? ['sent','retry','err'][n % 3] : 'sent';
  const ts = m.fecha.replace(/\D/g,'') + '30', correl = (+c.correl||0) + 1 + (n % 7);
  const azure = c.canal==='Storage de Azure de Cosmos';
  return m.edi = { st, rcv:c.receptor, variante:c.variante, canal:c.canal, carpeta:c.carpeta, when:m.fecha, file: `Memo_${ts}_${correl}.EDI`,
    intento: st==='retry' ? 'intento 2 de 5' : st==='err' ? 'intento 5 de 5' : '',
    motivo: st==='err' ? (azure ? 'No se pudo escribir en el Storage de Azure de Cosmos.' : 'No se pudo conectar al SFTP del depósito (tiempo de espera agotado).') + ' Cosmos (TI) lo reenvía tras corregir.' : '',
    trx: `7c1f2e9a-4b0d-4a3e-9e55-${String(n).padStart(12,'0')}` };
}
function libEdiTip(m, e){
  if(e.st==='noedi') return `Sin EDI\nEl depósito no es receptor de EDI MEMO. El MEMO se avisa como hoy.`;
  return [`Último envío EDI de ${m.numero}`, `Receptor: ${e.rcv} (${e.variante})`, `Canal: ${e.canal}`, `Fecha y hora: ${AC.fh(e.when)}`,
    `Estado: ${LIB_EDI_ST[e.st][0]}${e.intento ? ` (${e.intento})` : ''}`, `Archivo: ${e.file}`].concat(e.motivo ? [`Motivo: ${e.motivo}`] : []).join('\n');
}
function libEdiHtml(r){
  const filas = r.memos.map((m,i)=>({m, i, e:libEdi(m)}));
  return `<div ${CC.propuesta(LIB_EDI_TK, 'MEMO y EDI')} id="libEdi"><b>MEMO y EDI</b>
    <div class="fac-note">MEMO que generó la aprobación de la solicitud, uno por depósito, y el último envío EDI de cada uno. Es de solo lectura. Pase el cursor sobre el estado para ver el detalle.</div>`
    + AC.tabla([{t:'N.º MEMO', v:x=>`<b>${esc(x.m.numero)}</b>`}, {t:'Depósito', v:x=>esc(x.m.dep)}, {t:'Vence', v:x=>AC.f(AC.sumarDias(x.m.fecha, 7))},
        {t:'Contenedores', v:x=>`${x.m.conts.length}<div class="ac-mut">${esc(x.m.conts.map(c=>c.num).join(', '))}</div>`},
        {t:'Último envío EDI', v:x=>`<span class="ac-edi-st ${x.e.st} ac-edi" tabindex="0" data-edist="${x.e.st}" data-tip="${esc(libEdiTip(x.m, x.e))}">${LIB_EDI_ST[x.e.st][0]}${x.e.intento && x.e.st==='retry' ? ' · ' + x.e.intento : ''}</span>`
          + (x.e.st==='err' ? `<div style="margin-top:4px">${AC.link('Ver correo de error', `libEdiCorreo(${x.i})`, 'data-edi-correo')}</div>` : '')}], filas)
    + `<div class="ac-edi-ley">${[['sent','El archivo quedó en la carpeta del receptor'],['retry','Se reintenta solo'],['err','Cosmos (TI) lo reenvía tras corregir'],['noedi','El depósito no es receptor']]
        .map(([k,t])=>`<span><span class="ac-edi-st ${k}">${LIB_EDI_ST[k][0]}</span> ${t}</span>`).join('')}</div></div>`;
}
window.libEdiCorreo = i => {
  const m = LIB.act.memos[i], e = libEdi(m), fecha = (e.when||'').slice(0,10).replace(/-/g,'/');
  const det = { memo:m.numero, receptor:e.rcv, intento:'1 de 5', estado:'Error', archivos: m.conts.map((c,k)=>({ archivo:e.file.replace(/_(\d+)\.EDI$/, (_,x)=>`_${+x + k}.EDI`), contenedor:c.num, error:e.motivo.split('.')[0] })) };
  AC.dlg(AC.cab('Correo técnico de error del EDI MEMO', 'Vista previa. Se envía un solo correo por MEMO y receptor, en el primer error; los intentos siguientes no lo repiten.')
    + `<div class="ac-mail" id="libEdiMail"><div class="ac-mail-h"><div><b>De</b> Notificaciones de Connect</div><div><b>Para</b> Lista de TI de Cosmos <span class="ac-mut">(la define Cosmos)</span></div>
        <div><b>Asunto</b> Error en el envío de EDI MEMO a un depósito</div></div>
      <div class="ac-mail-b"><p>Se produjo un error en un proceso de integración.</p><table class="ac-kv">
        <tr><td>Integración</td><td>EDI</td></tr><tr><td>Proceso</td><td>Envío de EDI MEMO</td></tr><tr><td>MEMO</td><td>${esc(m.numero)} · ${esc(m.dep)}</td></tr>
        <tr><td>Transacción</td><td>${esc(e.trx)}</td></tr><tr><td>Detalle</td><td>audit/edi/memo-outbound/${esc(fecha)}/${esc(e.trx)}.json</td></tr></table>
        <p class="ac-mut">Los intentos siguientes de esta transacción no generan otro correo.</p></div></div>
      <div class="fac-sec">Detalle en el registro de auditoría <span class="ac-mut">(el correo solo trae su ruta)</span></div><pre class="ac-json">${esc(JSON.stringify(det, null, 2))}</pre>`
    + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-correo-edi"')), 'lg');
};
window.addEventListener('cc:propuestas', ()=>{ if(LIB.vista==='detalle' && LIB.act && document.getElementById('libDet')) libPintar(); });
window.libMemo = i => AC.memoPdf(LIB.act.memos[i]);
window.libAdjAgregar = () => {
  const st = { archivo:null }; let bg;
  const html = () => AC.cab('Agregar adjunto')
    + `<div class="fac-g2">${CC.campo('Tipo de adjunto <span class="ac-mut">Opcional</span>', CC.selector(LIB_TIPOS_ADJ, st.tipo || '', 'id="libAdjTipo"', 'Sin tipo'))}
      ${CC.campo('Archivo *', `<div class="ac-row">${AC.btn('Seleccionar archivo', AC.cb(()=>{ st.tipo = AC.v('libAdjTipo'); st.archivo = AC.archivo((st.tipo||'Documento').replace(/[^A-Za-z]+/g,'_'), 'pdf'); AC.repintar(bg, html()); }), 'ghost', 'data-ac="sel-archivo"')}
        <span class="ac-mut">${st.archivo ? esc(st.archivo.nombre) + ' ' + AC.link('Quitar', AC.cb(()=>{ st.tipo = AC.v('libAdjTipo'); st.archivo = null; AC.repintar(bg, html()); })) : 'No se ha seleccionado archivo'}</span></div>`)}</div>`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{
        if(!st.archivo){ CC.toast('Selecciona un archivo','error'); return; }
        LIB.act.adjuntos.push(Object.assign({tipo:AC.v('libAdjTipo')}, st.archivo)); LIB.sucio = true; libLeerForm(); AC.cerrar(); libPintar();
      }), '', 'data-ac="adj-guardar"'));
  bg = AC.dlg(html());
};
window.libAdjEliminar = i => { const a = LIB.act.adjuntos[i]; AC.confirmar('Confirmar eliminación', `¿Estás seguro de que deseas eliminar el archivo ${esc(a.nombre)}?`, ()=>{ libLeerForm(); LIB.act.adjuntos.splice(i,1); libPintar(); }); };
window.libGuardar = () => {
  libLeerForm(); const r = LIB.act;
  if(LIB.modo==='crear'){
    if(!r.adjuntos.some(a=>a.tipo==='BL Endosado')){ CC.toast('Agrega un archivo de BL Endosado antes de continuar.','error'); return; }
    if(!r.tipoEmision){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
    r.id = libId(++LIB.seq); r.creado = AC.ahora(); r.creadoPor = AC.yo(); r.origen = 'Connect'; r.bloqueadoPor = ''; r.fechaBloqueo = '';
    r.hist.push({ts:Date.now(), user:AC.yo(), prev:'', next:'Pendiente', comment:'Creación'}); LIB.lista.unshift(r);
    CC.toast('La liberación de carga se creó correctamente','success'); LIB.f.estado = 'Pendiente'; libSalir(); return;
  }
  r.hist.push({ts:Date.now(), user:AC.yo(), prev:r.estado, next:r.estado, comment:'Actualización de observaciones'});
  CC.toast('La liberación de carga se actualizó correctamente','success'); libPintar();
};
window.libAprobar = () => AC.confirmar('Confirmar aprobación', '¿Estás seguro de que deseas aprobar esta solicitud de liberación de carga? Se enviará automáticamente un correo de aprobación al cliente y a la terminal.', ()=>{
  const r = LIB.act;
  if(!libValidaciones(r).every(v=>v.ok)){ CC.toast('No se puede aprobar: Algunas validaciones no se cumplen. Por favor revisa el estado de validaciones.','error'); return; }
  libEmitir(r); const prev = r.estado; r.estado = 'Aprobado'; r.bloqueadoPor = ''; r.fechaBloqueo = '';
  r.hist.push({ts:Date.now(), user:AC.yo(), prev, next:'Aprobado', comment:`MEMO emitidos: ${r.memos.map(m=>m.numero).join(', ')}`});
  CC.toast('La liberación de carga se aprobó correctamente. Se ha enviado el correo de aprobación al cliente y a la terminal.','success');
  LIB.tab = 'dep'; libPintar();
  AC.correo({ para:`${AC.correoDe(r.consignatario)}; operaciones@terminal.example`, asunto:`Autorización de Liberación de Visto Bueno - ${r.id}`,
    cuerpo:`Estimado cliente:\n\nSe aprobó la solicitud de liberación ${r.id} del BL ${r.bl} (nave ${r.nave}, viaje ${r.viaje}).\nMEMO de devolución emitidos: ${r.memos.map(m=>`${m.numero} (${m.dep})`).join(', ')}.\nPuede descargar la constancia desde el Portal Externo.\n\nAtención al Cliente` });
}, 'Confirmar');
window.libRechazar = () => AC.confirmar('Confirmar rechazo', '¿Estás seguro de que deseas rechazar esta solicitud de liberación de carga?', ()=>{
  const r = LIB.act, prev = r.estado; r.estado = 'Rechazado'; r.bloqueadoPor = ''; r.fechaBloqueo = '';
  r.hist.push({ts:Date.now(), user:AC.yo(), prev, next:'Rechazado', comment:'Rechazo manual desde UI'});
  CC.toast('La liberación de carga se rechazó correctamente','success'); libPintar();
});

CC.registrarPantalla({
  id:'screenAcLiberacion', grupo:G, opcion:'Liberación de la Carga', titulo:'Liberación de carga',
  migas:['Servicio al cliente','Liberación de carga','Búsqueda de liberaciones de carga'],
  html: () => LIB.vista==='detalle' && LIB.act ? libDetalleHtml() : libBuscarHtml(),
  alAbrir: () => { if(LIB.vista!=='buscar'){ LIB.vista = 'buscar'; LIB.act = null; CC.refrescar('screenAcLiberacion'); } },
  guia:[{t:'Liberación de la carga', steps:[{el:'#libF', h:'Buscar', p:'Filtra por solicitud, BL, estado, nave o viaje. Por defecto muestra las pendientes.'},
    {el:'#libRes', h:'Resultados', p:'Abre una solicitud con su número: se bloquea a tu nombre y muestra las validaciones.'}]}]
});

/* ============================================================
   2. INSTRUCCIONES (Consulta Instrucciones BL y diálogo Días Libres)
============================================================ */
const INS = { f:{bl:'',cont:''}, res:null, pagina:1, tam:10, data:null, d:null, bg:null };
const INS_SERV = [
  {n:'Cambio de depósito de devolución', moneda:'USD', tarifa:85, unidad:'contenedor', memo:true, editable:false},
  {n:'Extensión de días libres', moneda:'USD', tarifa:45, unidad:'contenedor', memo:false, editable:true},
  {n:'Reemisión de MEMO de devolución', moneda:'USD', tarifa:25, unidad:'BL', memo:true, editable:false},
  {n:'Inspección de contenedor', moneda:'USD', tarifa:null, unidad:'contenedor', memo:false, editable:false}
];
const INS_MOTIVOS = ['Venta','Leasing','Otro'];
function insSeed(){
  if(INS.data) return;
  INS.data = AC.bls().map((b,i)=>({ bl:b.numero, nave:b.nave, viaje:b.viaje, puerto:b.puerto, eta:`${b.eta}T08:00`, descarga:`${AC.sumarDias(b.eta,1)}T14:30`,
    conts: AC.contsDe(b.numero).map((c,k)=>({ num:c.numero, tipo:AC.isoDe(c.tipo), dias:c.diasLibres, usados:Math.min(c.diasLibres, 3+k*4), unidad:'Días calendario', fini:'Fecha de descarga',
      devol:'', estado:'Pendiente', modo:'', motivo:'', desc:'', sustento:'', elegible:true, hist:[] })),
    adjuntos: i % 2 ? [AC.archivo('Instruccion_cliente','pdf')] : [], servicios:[] }));
  const d0 = INS.data[0], d1 = INS.data[1], d2 = INS.data[2];
  if(d0 && d0.conts[1]){ const c = d0.conts[1]; Object.assign(c, {devol:`${AC.sumarDias(d0.descarga,6)}T11:20`, estado:'Devuelto', modo:'Manual', motivo:'Otro', desc:'Devuelto en depósito por acuerdo con la línea', sustento:'EIR_devolucion.pdf'});
    c.hist.push({accion:'Registro', usuario:'R. Salas', fecha:`${AC.sumarDias(d0.descarga,6)}T16:05`, anterior:'-', nuevo:c.devol, motivo:'Otro', desc:c.desc, cambio:'', modo:'Manual', sustento:'EIR_devolucion.pdf'}); }
  if(d1 && d1.conts[0]) Object.assign(d1.conts[0], {devol:`${AC.sumarDias(d1.descarga,4)}T09:40`, estado:'Devuelto', modo:'EDI', motivo:'', sustento:''});
  if(d2 && d2.conts[1]) Object.assign(d2.conts[1], {estado:'', elegible:false});
  if(d0){ d0.servicios.push(
    {fecha:'2026-11-12T10:30', usuario:'R. Salas', servicio:'Cambio de depósito de devolución', memo:{dep:AC.depositos[1].razon, conts:[d0.conts[0].num], numero:''}, moneda:'USD', monto:85, estandar:85, estado:'Pendiente de pago', detalle:'', comentario:'Cliente solicita devolver en un depósito más cercano', sustento:'Solicitud_cliente.pdf', liquidacion:false},
    {fecha:'2026-11-08T15:10', usuario:'R. Salas', servicio:'Extensión de días libres', memo:null, moneda:'USD', monto:90, estandar:90, estado:'Pagado', detalle:'F001-000245', comentario:'Extensión de 2 días', sustento:'Correo_cliente.pdf', liquidacion:false}); }
}
const insEta = iso => { const [d,t] = iso.split('T'), [y,m,dd] = d.split('-').map(Number); let [h,mi] = (t||'00:00').split(':').map(Number); const ap = h>=12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${m}/${dd}/${String(y).slice(2)}, ${h}:${pad(mi)} ${ap}`; };
function insFiltrar(){ const f = INS.f; return INS.data.filter(b=>AC.tiene(b.bl, f.bl) && (!f.cont || b.conts.some(c=>AC.tiene(c.num, f.cont)))); }
window.insBuscar = () => { INS.f = {bl:AC.v('insFBl'), cont:AC.v('insFCont')}; if(!INS.f.bl && !INS.f.cont){ CC.toast('Ingrese al menos un filtro','info'); return; }
  INS.res = insFiltrar(); INS.pagina = 1; CC.refrescar('screenAcInstrucciones'); if(!INS.res.length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); };
window.insLimpiar = () => { INS.f = {bl:'',cont:''}; INS.res = null; CC.refrescar('screenAcInstrucciones'); };
window.insPagina = (p, t) => { if(t) INS.tam = t; INS.pagina = p; CC.refrescar('screenAcInstrucciones'); };
function insBuscarHtml(){
  insSeed();
  return CC.filtros({ id:'insF', titulo:'Consulta Instrucciones BL', sub:'Ingrese datos para buscar', cols:3,
      campos:[CC.campo('Número BL', AC.lista('insFBl', INS.f.bl, INS.data.map(b=>b.bl), 'Elegir Número BL', 'maxlength="35"')),
        CC.campo('Contenedor', AC.lista('insFCont', INS.f.cont, INS.data.flatMap(b=>b.conts.map(c=>c.num)), 'Ingresar Contenedor', 'maxlength="11"'))],
      buscar:'insBuscar()', limpiar:'insLimpiar()' })
    + (INS.res && INS.res.length ? CC.tablaResultados({ id:'insRes', filas:INS.res, pagina:INS.pagina, tam:INS.tam, fnPagina:'insPagina',
      columnas:[{t:'Número BL', k:'bl'}, {t:'Nave', k:'nave'}, {t:'Viaje', k:'viaje'}, {t:'Puerto Operativo', k:'puerto'}, {t:'ETA', v:b=>insEta(b.eta)},
        {t:'Acción', v:b=>`<button type="button" class="fac-link" title="Editar" data-ins="${esc(b.bl)}" onclick="insAbrir('${esc(b.bl)}')">✎ Días libres</button>`}] }) : '');
}

/* Diálogo Días Libres */
window.insAbrir = bl => { insSeed(); const b = INS.data.find(x=>x.bl===bl); INS.d = { b, edit:false, tab:'cont', filtro:'Todos', copia:null, nuevos:0, selAdj:[] }; INS.bg = AC.dlg(insHtml(), 'xl'); };
const insRe = () => AC.repintar(INS.bg, insHtml());
function insHtml(){
  const d = INS.d, b = d.b;
  let cuerpo = '';
  if(d.tab==='cont'){
    const vis = b.conts.map((c,i)=>Object.assign({_i:i}, c)).filter(c=>d.filtro==='Todos' || c.estado===d.filtro);
    cuerpo = `<div class="ac-row" style="margin-bottom:8px">${d.edit ? AC.btn('Actualización Masiva', 'insMasiva()', 'ghost', 'id="insMasiva"') : ''}<span class="ac-sp"></span>
      <label class="ac-mut">Filtrar por estado ${CC.selector(['Todos','Pendiente','Devuelto'], d.filtro, 'id="insFiltro" onchange="insFiltro(this.value)"')}</label><span class="ac-mut">Mostrando ${vis.length} de ${b.conts.length}</span></div>`
      + `<div class="ac-tbl-in">${AC.tabla([
        {t:'', v:()=>`<input type="checkbox" ${d.edit?'':'disabled'}>`}, {t:'Contenedor', k:'num'}, {t:'Tamaño/Tipo de Contenedor', v:c=>esc(AC.isoTxt(c.tipo))},
        {t:'Días Libres', v:c=>d.edit ? `<input type="number" min="0" value="${esc(c.dias)}" onchange="insSet(${c._i},'dias',this.value)">` : esc(c.dias)},
        {t:'Días Libres Usados', k:'usados'},
        {t:'Unidad', v:c=>d.edit ? CC.selector(AC.unidades, c.unidad, `onchange="insSet(${c._i},'unidad',this.value)"`, 'Elegir Tipo de Unidad') : esc(c.unidad)},
        {t:'Fecha inicial de cálculo', v:c=>d.edit ? CC.selector(AC.fechasIni, c.fini, `onchange="insSet(${c._i},'fini',this.value)"`, 'Elegir fecha inicial de cálculo') : esc(c.fini)},
        {t:'Fecha de devolución', v:c=>AC.fh(c.devol)}, {t:'Estado', v:c=>c.estado ? CC.chipEstado(c.estado, c.estado==='Devuelto'?'aprobada':'pendiente') : ''},
        {t:'Modo de ingreso', v:c=>esc(c.modo)},
        {t:'Acción', v:c=>{ if(!(c.elegible || c.estado==='Devuelto')) return ''; const a = [];
          if(c.elegible && c.estado==='Pendiente') a.push(AC.link('Registrar', `insDevol(${c._i},'registrar')`, `data-accion="registrar"`));
          if(c.estado==='Devuelto' && c.modo==='Manual'){ a.push(AC.link('Corregir', `insDevol(${c._i},'corregir')`)); a.push(AC.link('Anular', `insAnularDevol(${c._i})`)); }
          a.push(AC.link('Historial', `insHistorial(${c._i})`)); return `<div class="fac-rowacts">${a.join('')}</div>`; }}], vis)}</div>`;
  } else if(d.tab==='adj'){
    cuerpo = (d.edit ? `<div class="ac-row" style="margin-bottom:8px">${AC.btn('Subir Archivos', 'insSubir()', 'ghost', 'id="insSubir"')}${AC.btn('Eliminar', 'insAdjEliminar()', 'pink', d.selAdj.length ? '' : 'disabled')}</div>` : '')
      + AC.tabla([{t:'', v:(a,i)=>`<input type="checkbox" ${d.edit?'':'disabled'} ${d.selAdj.includes(i)?'checked':''} onchange="insSelAdj(${i},this.checked)">`}, {t:'Archivo', k:'nombre'}, {t:'Fecha', v:a=>AC.fh(a.fecha)},
          {t:'Usuario', v:a=>esc(a.usuario || 'Usuario Desconocido')}, {t:'Acciones', v:a=>AC.link('⤓', AC.cb(()=>AC.descargar(a.nombre)), 'title="Descargar Archivo"')}], b.adjuntos, 'No hay archivos adjuntos.');
  } else {
    cuerpo = `<div class="ac-row" style="margin-bottom:8px"><span class="ac-p" style="margin:0">Servicios con cobro que aplican solo a este BL. Se aplican al registrarse; no se editan.</span><span class="ac-sp"></span>${AC.btn('Registrar servicio', 'insServicio()', 'ghost', 'id="insServ"')}</div>`
      + (b.servicios.length ? AC.tabla([
        {t:'Fecha', v:s=>AC.fh(s.fecha)}, {t:'Usuario', k:'usuario'}, {t:'Servicio', k:'servicio'},
        {t:'Nuevo MEMO', v:s=>s.memo ? `${esc(s.memo.dep)}<div class="ac-mut">${esc(s.memo.conts.join(', '))}</div>${s.memo.numero ? esc(s.memo.numero) : '<span class="ac-mut">Se genera al pagar</span>'}` : '-'},
        {t:'Monto', v:s=>`<span style="${s.estado==='Exonerado'?'text-decoration:line-through':''}">${esc(s.moneda)} ${CC.dinero(s.monto)}</span>${s.monto!==s.estandar?`<div class="ac-mut">Estándar ${CC.dinero(s.estandar)}</div>`:''}`},
        {t:'Estado', v:s=>`${CC.chipEstado(s.estado, s.estado==='Pagado'?'aprobada':s.estado==='Anulado'?'anulada':s.estado==='Exonerado'?'aprobada':'pendiente')}${s.detalle?`<div class="ac-mut">${esc(s.detalle)}</div>`:''}`},
        {t:'Comentario', v:s=>`${esc(s.comentario)}<div>${AC.link(esc(s.sustento), AC.cb(()=>AC.descargar(s.sustento)))}</div>`},
        {t:'Acciones', v:(s,i)=>{ const ok = s.estado==='Pendiente de pago' && !s.liquidacion; const tip = s.estado==='Anulado' ? 'Anulado' : s.liquidacion ? 'El cliente lo incluyó en una liquidación' : 'Ya se pagó o se exoneró';
          return `<button type="button" class="cc-btn ghost" style="padding:6px 12px" ${ok?'':`disabled title="${tip}"`} onclick="insAnularServ(${i})">Anular</button>`; }}],
        b.servicios, '', s=>s.estado==='Anulado' ? 'class="ac-anulado"' : '') : `<div class="ac-empty">Este BL no tiene servicios adicionales.</div>`);
  }
  return AC.cab(`Días Libres ${AC.errConnect('Tilde en el título')}`, '', 'insX()')
    + `<div class="fac-sec" style="margin-top:0">Información General</div><div class="ac-row" style="gap:28px;font-size:13.5px"><span>BL: <b>${esc(b.bl)}</b></span><span>Nave: <b>${esc(b.nave)}</b></span><span>Viaje: <b>${esc(b.viaje)}</b></span></div>`
    + AC.tabs([['cont','Contenedores'],['adj','Adjuntos'],['serv','Servicios adicionales']], d.tab, 'insTab') + cuerpo
    + AC.pie(...(d.edit ? [AC.btn('Cancelar','insCancelar()','ghost'), `${AC.errConnect('Exige un archivo nuevo')}${AC.btn('Guardar','insGuardar()','','id="insGuardar"')}`]
                        : [AC.btn('Editar','insEditar()','ghost','id="insEditar"'), AC.btn('Cerrar','acCerrar()','')]));
}
window.insTab = t => { INS.d.tab = t; insRe(); };
window.insFiltro = v => { INS.d.filtro = v; insRe(); };
window.insSet = (i, k, v) => { const c = INS.d.b.conts[i]; c[k] = k==='dias' ? (v==='' ? '' : Number(v)) : v; };
window.insSelAdj = (i, on) => { const s = INS.d.selAdj; if(on && !s.includes(i)) s.push(i); if(!on) s.splice(s.indexOf(i),1); insRe(); };
window.insEditar = () => { const d = INS.d; d.copia = AC.clon({conts:d.b.conts, adjuntos:d.b.adjuntos}); d.edit = true; d.nuevos = 0; insRe(); };
window.insCancelar = () => { const d = INS.d; d.b.conts = d.copia.conts; d.b.adjuntos = d.copia.adjuntos; d.edit = false; d.selAdj = []; insRe(); };
window.insX = () => { if(INS.d.edit) AC.confirmar('Cerrar sin guardar', 'Hay cambios sin guardar. ¿Está seguro de que desea cerrar?', ()=>{ insCancelar(); AC.cerrar(); }); else AC.cerrar(); };
window.insGuardar = () => {
  const d = INS.d;
  if(!d.nuevos){ CC.toast('Se requiere un nuevo archivo para justificar la modificación.','error'); return; }
  if(d.b.conts.some(c=>c.dias==='' || c.dias<0 || !c.unidad || !c.fini)){ CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
  d.edit = false; d.selAdj = []; AC.cerrar(); CC.toast('Instrucciones guardadas exitosamente.','success');
};
window.insSubir = () => AC.adjuntar({base:'Sustento_dias_libres', ext:'pdf'}, files=>{ INS.d.b.adjuntos.push(...files); INS.d.nuevos += files.length; insRe(); });
window.insAdjEliminar = () => AC.confirmar('Confirmar eliminación', '¿Está seguro de que desea eliminar el archivo seleccionado?', ()=>{ const d = INS.d; d.b.adjuntos = d.b.adjuntos.filter((a,i)=>!d.selAdj.includes(i)); d.selAdj = []; insRe(); });
window.insMasiva = () => {
  const st = { archivo:null }; let bg;
  const html = () => AC.cab('Actualización masiva')
    + `<div class="fac-g2">${CC.campo('Tamaño/Tipo de Contenedor *', CC.selector(AC.iso, st.tipo||'', 'id="insMT"', 'Elegir Tamaño/Tipo Contenedor'))}
      ${CC.campo('Días Libres *', `<input type="number" min="0" id="insMD" value="${esc(st.dias??'')}">`)}
      <div ${CC.propuesta('I-044','HU-ATC-05 · Unidad y fecha en el masivo','fac-span4')} id="insMProp" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px;border-radius:8px">
        ${CC.campo('Unidad de Conteo', CC.selector(AC.unidades, st.unidad||'', 'id="insMU"', 'Mantener la unidad actual'))}
        ${CC.campo('Fecha Inicial de Cálculo', CC.selector(AC.fechasIni, st.fini||'', 'id="insMF"', 'Mantener la fecha actual'))}
        <div class="ac-mut" style="grid-column:1/-1">Si deja un campo vacío, cada contenedor conserva su valor actual (por definir con negocio, PEN-I044-01). Las opciones de fecha dependen de la línea naviera.</div></div>
      ${CC.campo('Archivo *', `<div class="ac-row"><input disabled value="${esc(st.archivo ? st.archivo.nombre : '')}" style="flex:1">${AC.btn('Subir Archivo', AC.cb(()=>{ st.tipo = AC.v('insMT'); st.dias = AC.v('insMD'); st.unidad = AC.v('insMU'); st.fini = AC.v('insMF');
          AC.adjuntar({unico:true, base:'Actualizacion_masiva', ext:'pdf'}, f=>{ st.archivo = f[0]; AC.repintar(bg, html()); }); }), 'ghost', 'data-ac="masiva-archivo"')}</div>`, 'fac-span4')}</div>`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{
        const tipo = AC.v('insMT'), dias = AC.v('insMD'), unidad = CC.verPropuestas ? AC.v('insMU') : '', fini = CC.verPropuestas ? AC.v('insMF') : '';
        if(!tipo || dias==='' || Number(dias)<0 || !st.archivo){ CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
        const af = INS.d.b.conts.filter(c=>c.tipo===tipo);
        if(!af.length){ CC.toast(`No hay contenedores afectados para ${AC.isoTxt(tipo)}.`,'error'); return; }
        AC.confirmar('Confirmar Actualización Masiva', `¿Desea aplicar la actualización en la grilla para los contenedores de Tamaño/Tipo Contenedor ${esc(AC.isoTxt(tipo))}?`, ()=>{
          af.forEach(c=>{ c.dias = Number(dias); if(unidad) c.unidad = unidad; if(fini) c.fini = fini; }); INS.d.b.adjuntos.push(st.archivo); INS.d.nuevos++; AC.cerrar(); insRe();
          CC.toast(`${unidad || fini ? 'Días libres, unidad y fecha inicial' : 'Días libres'} aplicados a ${af.length} contenedor(es). Falta Guardar.`,'info'); }, 'Aceptar');
      }), '', 'data-ac="masiva-guardar"'));
  bg = AC.dlg(html(), 'md');
};
window.insDevol = (i, modo) => {
  const b = INS.d.b, c = b.conts[i], corr = modo==='corregir', st = { sustento: corr ? c.sustento : '' };
  const [fd, hd] = c.devol ? c.devol.split('T') : ['',''];
  AC.dlg(AC.cab(corr ? 'Corregir devolución' : 'Registrar devolución') + `<div class="ac-row" style="gap:24px;margin-bottom:10px"><span>Contenedor: <b>${esc(c.num)}</b></span><span>Fecha de descarga: <b>${AC.fh(b.descarga)}</b></span></div>
    <div class="fac-g2">${CC.campo('Fecha de devolución *', `<input type="date" id="insDF" min="${b.descarga.slice(0,10)}" max="${AC.hoy()}" value="${esc(fd)}">`)}
      ${CC.campo('Hora (opcional)', `<input type="time" id="insDH" value="${esc(hd)}">`)}
      ${CC.campo('Motivo *', CC.selector(INS_MOTIVOS, corr ? c.motivo : '', 'id="insDM"', 'Elegir motivo'))}
      ${CC.campo('Descripción (obligatoria si el motivo es Otro)', `<textarea id="insDD" rows="2" maxlength="500" placeholder="Ingresar descripción">${esc(corr ? c.desc : '')}</textarea>`)}
      ${corr ? CC.campo('Motivo del cambio *', `<textarea id="insDC" rows="2" maxlength="500" placeholder="Ingresar el motivo del cambio"></textarea>`, 'fac-span4') : ''}
      ${CC.campo(`Sustento${corr ? '' : ' *'}`, `<div class="ac-row">${AC.btn('Seleccionar archivo', AC.cb(()=>{ st.sustento = AC.archivo('Sustento_devolucion','pdf').nombre; $('insDS').textContent = st.sustento; }), 'ghost', 'data-ac="sel-sustento"')}<span id="insDS" class="ac-mut">${esc(st.sustento || 'Ningún archivo seleccionado')}</span></div>
        <div class="ac-mut">Un archivo de cualquier tipo, de hasta 50 MB.${corr ? ' Si no adjunta uno nuevo, se conserva el sustento vigente.' : ''}</div>`, 'fac-span4')}</div>`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{
      const f = AC.v('insDF'), h = AC.v('insDH'), m = AC.v('insDM'), ds = AC.v('insDD'), cm = corr ? AC.v('insDC') : '', ahora = AC.ahora();
      const err = !f ? 'Ingrese la fecha de devolución.' : f < b.descarga.slice(0,10) ? 'La fecha no puede ser anterior a la fecha de descarga.' : f > AC.hoy() ? 'La fecha no puede ser posterior a hoy.'
        : (h && f===b.descarga.slice(0,10) && h < b.descarga.slice(11,16)) ? 'La hora no puede ser anterior a la hora de descarga.' : (h && f===AC.hoy() && h > ahora.slice(11,16)) ? 'La hora no puede ser posterior a la hora actual.'
        : !m ? 'Seleccione el motivo.' : (m==='Otro' && !ds) ? 'Ingrese la descripción del motivo Otro.' : (corr && !cm) ? 'Ingrese el motivo del cambio.' : (!corr && !st.sustento) ? 'Adjunte el sustento.' : '';
      if(err){ CC.toast(err,'error'); return; }
      const nuevo = `${f}T${h || '00:00'}`;
      c.hist.push({accion: corr ? 'Corrección' : 'Registro', usuario:AC.yo(), fecha:ahora, anterior: corr ? c.devol : '-', nuevo, motivo:m, desc:ds, cambio:cm, modo:'Manual', sustento:st.sustento});
      Object.assign(c, {devol:nuevo, estado:'Devuelto', modo:'Manual', motivo:m, desc:ds, sustento:st.sustento});
      AC.cerrar(); insRe(); CC.toast(corr ? 'Devolución corregida.' : 'Devolución registrada.','success');
    }), '', 'data-ac="devol-guardar"')), 'md');
};
window.insAnularDevol = i => {
  const c = INS.d.b.conts[i];
  AC.dlg(AC.cab('Anular devolución') + `<div class="ac-row" style="gap:24px;margin-bottom:10px"><span>Contenedor: <b>${esc(c.num)}</b></span><span>Fecha de devolución vigente: <b>${AC.fh(c.devol)}</b></span></div>
    <p class="ac-p">Se anulará la devolución registrada y el contenedor dejará de figurar como devuelto.</p>
    ${CC.campo('Motivo del cambio *', '<textarea id="insAM" rows="3" maxlength="500" placeholder="Ingresar el motivo de la anulación"></textarea>')}`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Anular', AC.cb(()=>{
      const m = AC.v('insAM'); if(!m){ CC.toast('Ingrese el motivo del cambio.','error'); return; }
      c.hist.push({accion:'Anulación', usuario:AC.yo(), fecha:AC.ahora(), anterior:c.devol, nuevo:'-', motivo:c.motivo, desc:c.desc, cambio:m, modo:'Manual', sustento:''});
      Object.assign(c, {devol:'', estado: c.elegible ? 'Pendiente' : '', modo:''}); AC.cerrar(); insRe(); CC.toast('Devolución anulada.','success');
    }), 'pink', 'data-ac="anular-devol"')), 'sm');
};
window.insHistorial = i => { const c = INS.d.b.conts[i];
  AC.dlg(AC.cab('Historial de la devolución', `Contenedor: ${esc(c.num)}`) + AC.tabla([{t:'Acción', k:'accion'}, {t:'Usuario', k:'usuario'}, {t:'Fecha y hora', v:h=>AC.fh(h.fecha)},
      {t:'Valor anterior', v:h=>h.anterior==='-' ? '-' : AC.fh(h.anterior)}, {t:'Valor nuevo', v:h=>h.nuevo==='-' ? '-' : AC.fh(h.nuevo)}, {t:'Motivo', v:h=>`${esc(h.motivo||'-')}${h.desc?`<div class="ac-mut">${esc(h.desc)}</div>`:''}`},
      {t:'Motivo del cambio', v:h=>esc(h.cambio||'-')}, {t:'Modo de ingreso', k:'modo'}, {t:'Sustento', v:h=>h.sustento ? AC.link(esc(h.sustento), AC.cb(()=>AC.descargar(h.sustento))) : '-'}],
    c.hist, 'Este contenedor no tiene cambios registrados') + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-hist"')), 'lg'); };
window.insServicio = () => {
  const b = INS.d.b, pend = b.conts.filter(c=>c.estado==='Pendiente' && c.elegible), st = { serv:'', memo:false, exon:false, sustento:'', conts:[], dep:'', coment:'', motExon:'', monto:'' }; let bg;
  const leer = () => { if($('insSC')) st.coment = AC.v('insSC'); if($('insSE')) st.motExon = AC.v('insSE'); if($('insSD')) st.dep = AC.v('insSD'); if($('insSM')) st.monto = AC.v('insSM');
    st.conts = [...document.querySelectorAll('.insSCont:checked')].map(x=>x.value); };
  const sv = () => INS_SERV.find(s=>s.n===st.serv);
  const cant = () => { const s = sv(); return !s ? 0 : s.unidad==='BL' ? 1 : (st.memo ? st.conts.length : pend.length) || 0; };
  const html = () => { const s = sv();
    const info = !s ? '' : s.tarifa==null ? `<div class="fac-note err fac-span4">Sin tarifa vigente para este servicio en este BL. No se puede registrar.</div>`
      : `<div class="fac-note fac-span4">Monto de la tarifa: ${s.moneda} ${CC.dinero(s.tarifa)} / ${s.unidad} (más IGV 18 %) · Cantidad: ${cant()}<br>El monto es informativo: el sistema lo calcula al registrar.</div>`;
    return AC.cab('Registrar servicio adicional', `BL: ${esc(b.bl)} · Tipo de BL: Importación`)
      + `<div class="fac-g2">${CC.campo('Servicio *', CC.selector(INS_SERV.map(x=>x.n), st.serv, `id="insSS" onchange="${AC.cb(()=>{ leer(); st.serv = AC.v('insSS'); const x = sv(); st.memo = !!(x && x.memo); st.monto = x && x.tarifa!=null ? String(x.tarifa*Math.max(1,cant())) : ''; AC.repintar(bg, html()); })}"`, 'Elegir servicio'), 'fac-span4')}
        ${info}
        ${s && s.editable ? CC.campo('Monto a cobrar (sin IGV) *', `<input type="number" step="0.01" id="insSM" value="${esc(st.monto)}">`) : ''}
        <div class="fac-f fac-span4"><label class="fac-chk"><input type="checkbox" id="insSMemo" ${st.memo?'checked':''} onchange="${AC.cb(()=>{ leer(); st.memo = $('insSMemo').checked; if(!st.memo){ st.dep=''; st.conts=[]; } AC.repintar(bg, html()); })}"> Nuevo MEMO</label></div>
        ${st.memo ? CC.campo('Nuevo depósito *', CC.selector(AC.depositos.map(x=>x.razon), st.dep, 'id="insSD"', 'Elegir depósito'))
          + CC.campo('Contenedores a los que aplica *', pend.length ? pend.map(c=>`<label class="fac-chk"><input type="checkbox" class="insSCont" value="${esc(c.num)}" ${st.conts.includes(c.num)?'checked':''}> ${esc(c.num)}</label>`).join(' ') : '<span class="ac-mut">El BL no tiene contenedores pendientes de devolución.</span>') : ''}
        ${CC.campo('Motivo / comentario *', `<textarea id="insSC" rows="2" maxlength="500" placeholder="Ingresar el motivo o comentario">${esc(st.coment)}</textarea>`, 'fac-span4')}
        ${CC.campo('Sustento *', `<div class="ac-row">${AC.btn('Seleccionar archivo', AC.cb(()=>{ leer(); st.sustento = AC.archivo('Sustento_servicio','pdf').nombre; AC.repintar(bg, html()); }), 'ghost', 'data-ac="sel-sustento"')}<span class="ac-mut">${esc(st.sustento || 'Ningún archivo seleccionado')}</span></div><div class="ac-mut">Un archivo de cualquier tipo, de hasta 50 MB.</div>`, 'fac-span4')}
        <div class="fac-f fac-span4"><label class="fac-chk"><input type="checkbox" id="insSX" ${st.exon?'checked':''} onchange="${AC.cb(()=>{ leer(); st.exon = $('insSX').checked; AC.repintar(bg, html()); })}"> Exonerar el cobro</label></div>
        ${st.exon ? CC.campo('Motivo de la exoneración *', `<textarea id="insSE" rows="2" maxlength="500" placeholder="Ingresar el motivo de la exoneración">${esc(st.motExon)}</textarea>`, 'fac-span4') : ''}</div>`
      + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{
          leer(); const x = sv(), monto = x && x.editable ? Number(st.monto) : (x && x.tarifa!=null ? x.tarifa*Math.max(1,cant()) : 0);
          const err = !x ? 'Seleccione el servicio.' : (x.editable && !(monto > 0)) ? 'Ingrese un monto mayor que cero.' : (st.memo && !st.dep) ? 'Seleccione el nuevo depósito.'
            : (st.memo && !st.conts.length) ? 'Seleccione al menos un contenedor.' : !st.coment ? 'Ingrese el motivo o comentario.' : !st.sustento ? 'Adjunte el sustento.'
            : (st.exon && !st.motExon) ? 'Ingrese el motivo de la exoneración.'
            : b.servicios.some(o=>o.servicio===x.n && o.estado==='Pendiente de pago' && (!o.memo || o.memo.conts.join()===st.conts.join())) ? 'El BL ya tiene el mismo servicio pendiente de pago para estos contenedores.' : '';
          if(err){ CC.toast(err,'error'); return; }
          const estandar = x.tarifa*Math.max(1,cant());
          b.servicios.unshift({fecha:AC.ahora(), usuario:AC.yo(), servicio:x.n, memo: st.memo ? {dep:st.dep, conts:st.conts.slice(), numero: st.exon ? AC.nuevoMemo() : ''} : null,
            moneda:x.moneda, monto, estandar, estado: st.exon ? 'Exonerado' : 'Pendiente de pago', detalle: st.exon ? st.motExon : '', comentario:st.coment, sustento:st.sustento, liquidacion:false});
          AC.cerrar(); insRe(); CC.toast(st.exon ? 'Servicio registrado.' : 'Quedó pendiente de pago en el Portal Externo.','success');
        }), '', `data-ac="serv-guardar" ${s && s.tarifa==null ? 'disabled' : ''}`));
  };
  bg = AC.dlg(html(), 'md');
};
window.insAnularServ = i => {
  const s = INS.d.b.servicios[i];
  AC.dlg(AC.cab('Anular servicio') + `<p class="ac-p">Se anulará el servicio «${esc(s.servicio)}», que todavía no tiene pago.</p>${s.memo ? `<p class="ac-p">También se anula su cambio de depósito hacia ${esc(s.memo.dep)}.</p>` : ''}
    <p class="ac-p">El cobro desaparece del Portal Externo y el registro queda en la lista como Anulado, con su motivo.</p>
    ${CC.campo('Motivo de la anulación *', '<textarea id="insXM" rows="3" maxlength="500" placeholder="Ingresar el motivo de la anulación"></textarea>')}`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Anular servicio', AC.cb(()=>{
      const m = AC.v('insXM'); if(!m){ CC.toast('Ingrese el motivo de la anulación.','error'); return; }
      s.estado = 'Anulado'; s.detalle = m; AC.cerrar(); insRe(); CC.toast('Servicio anulado.','success');
    }), 'pink', 'data-ac="anular-serv"')), 'sm');
};

CC.registrarPantalla({
  id:'screenAcInstrucciones', grupo:G, opcion:'Instrucciones', titulo:'Consulta Instrucciones BL',
  migas:['Inicio','Instrucciones','Buscar Instrucciones BL'],
  html: insBuscarHtml,
  guia:[{t:'Instrucciones BL', steps:[{el:'#insF', h:'Buscar', p:'Elige un BL o un contenedor y pulsa Buscar.'},
    {el:'#insF', h:'Días libres', p:'Con el lápiz abres los días libres del BL: contenedores, adjuntos y servicios adicionales.'}]}]
});

/* ============================================================
   3. DIRECCIONAMIENTO PERMANENTE
============================================================ */
const DP = { f:{cliente:''}, buscado:false, lista:null, vista:'lista', act:null, modo:'', tab:'det', sel:[], selAdj:[], aviso:'', pagina:1, tam:10, seq:5 };
const DP_CARGA = ['Contenerizada','Carga suelta','Rodante','Granel'];
function dpSeed(){
  if(DP.lista) return;
  const fila = (linea, carga, iso, dep, desde, hasta, fecha) => ({linea, carga, iso, dep, desde, hasta, usuario:'R. Salas', fecha});
  DP.lista = [
    {id:1, cliente:'', sistema:true, detalles:[fila('ZIM','Contenerizada','','3014','2026-01-01','2026-12-31','2026-01-02T09:00')], adjuntos:[]},
    {id:2, cliente:'ANDES MINING EXPORT S.A.', detalles:[fila('ZIM','Contenerizada','42G1','3022','2026-06-01','2026-12-31','2026-05-28T11:20'), fila('MSK','Carga suelta','','3014','2026-06-01','2026-12-31','2026-05-28T11:20')], adjuntos:[AC.archivo('Carta_cliente','pdf')]},
    {id:3, cliente:'PACIFIC CHEMICALS LTD', detalles:[fila('ZIM','Contenerizada','45R1','3035','2026-03-01','2026-09-30','2026-02-20T16:45')], adjuntos:[]},
    {id:4, cliente:'IMPORTADORA LIMA NORTE S.A.C.', detalles:[fila('NAP','Granel','','3022','2026-08-01','2027-01-31','2026-07-30T10:05')], adjuntos:[]}
  ];
}
const dpClientes = () => CC.datos.socios.consignatarios.map(c=>c.razonSocial);
const dpCliente = r => r.sistema ? 'Defecto del Sistema' : r.cliente;
window.dpBuscar = () => { DP.f.cliente = AC.v('dpFCli'); DP.buscado = true; DP.pagina = 1; DP.aviso = ''; CC.refrescar('screenAcDirPermanente'); };
window.dpLimpiar = () => { DP.f.cliente = ''; DP.buscado = false; DP.aviso = ''; CC.refrescar('screenAcDirPermanente'); };
window.dpPagina = (p, t) => { if(t) DP.tam = t; DP.pagina = p; CC.refrescar('screenAcDirPermanente'); };
const DP_LOCK = '<span title="Este registro es el defecto del sistema y no puede ser modificado ni eliminado" class="ac-mut" data-lock="1"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg></span>';
function dpListaHtml(){
  dpSeed();
  const filas = DP.lista.filter(r=>AC.tiene(dpCliente(r), DP.f.cliente));
  return CC.filtros({ id:'dpF', titulo:'Consulta Direccionamiento Permanente', sub:'Ingrese datos para buscar', cols:3,
      campos:[CC.campo('Cliente', AC.lista('dpFCli', DP.f.cliente, dpClientes(), 'Ingresar Cliente', 'maxlength="200"'))], buscar:'dpBuscar()', limpiar:'dpLimpiar()' })
    + (DP.aviso ? `<div class="fac-note warn" id="dpAviso" style="margin-bottom:12px">${esc(DP.aviso)}</div>` : '')
    + (DP.buscado ? CC.tablaResultados({ id:'dpRes', filas, pagina:DP.pagina, tam:DP.tam, fnPagina:'dpPagina', vacio:'No se encontraron resultados',
        acciones: AC.btn('Nuevo', 'dpNuevo()', '', 'id="dpNuevo"'),
        columnas:[{t:'Cliente', v:r=>esc(dpCliente(r))},
          {t:'Acciones', v:r=>r.sistema ? DP_LOCK : `<div class="fac-rowacts">${AC.link('Editar', `dpEditar(${r.id})`, `data-dp="${r.id}"`)}${AC.link('Eliminar', `dpAnular(${r.id})`)}</div>`}] }) : '');
}
window.dpNuevo = () => { DP.act = {id:0, cliente: dpClientes().includes(DP.f.cliente) ? DP.f.cliente : '', detalles:[], adjuntos:[]}; DP.modo = 'crear'; dpForm(); };
window.dpEditar = id => { const r = DP.lista.find(x=>x.id===id); if(r.sistema){ CC.toast('El registro defecto del sistema no puede ser modificado','error'); return; } DP.act = AC.clon(r); DP.modo = 'editar'; dpForm(); };
function dpForm(){ DP.vista = 'form'; DP.tab = 'det'; DP.sel = []; DP.selAdj = []; dpPintar(); }
function dpPintar(){ CC.refrescar('screenAcDirPermanente'); if(DP.vista==='form'){ const t = DP.modo==='crear' ? 'Nuevo Direccionamiento Permanente' : 'Editar Direccionamiento Permanente'; CC.barra(t, ['Inicio','Direccionamiento Permanente', t], 'dpCancelar()'); } }
window.dpAnular = id => AC.confirmar('Confirmación de Anulación', '¿Estás seguro de que deseas anular este direccionamiento permanente? Los detalles pasarán a estado ANULADO.', ()=>{
  DP.lista = DP.lista.filter(r=>r.id!==id); CC.refrescar('screenAcDirPermanente'); CC.toast('Direccionamiento Permanente anulado exitosamente.','success'); });
window.dpTab = t => { dpLeer(); DP.tab = t; dpPintar(); };
function dpLeer(){ if($('dpCli')) DP.act.cliente = AC.v('dpCli'); }
window.dpSet = (i, k, v, re) => { const d = DP.act.detalles[i]; d[k] = v; if(k==='carga' && v!=='Contenerizada') d.iso = ''; if(re){ dpLeer(); dpPintar(); } };
window.dpSel = (i, on) => { DP.sel = on ? [...new Set(DP.sel.concat(i))] : DP.sel.filter(x=>x!==i); dpLeer(); dpPintar(); };
window.dpSelTodo = on => { DP.sel = on ? DP.act.detalles.map((d,i)=>i) : []; dpLeer(); dpPintar(); };
window.dpAgregar = () => { dpLeer(); DP.act.detalles.push({linea:'', carga:'', iso:'', dep:'', desde:'', hasta:'', usuario:'', fecha:''}); dpPintar(); };
window.dpEliminarFilas = () => AC.confirmar('Confirmación', `¿Estás seguro de que deseas eliminar las filas seleccionadas? ${AC.errConnect('Texto decía archivos')}`, ()=>{ dpLeer(); DP.act.detalles = DP.act.detalles.filter((d,i)=>!DP.sel.includes(i)); DP.sel = []; dpPintar(); });
window.dpSubir = () => AC.adjuntar({base:'Sustento_direccionamiento', ext:'pdf'}, f=>{ dpLeer(); DP.act.adjuntos.push(...f); dpPintar(); });
window.dpSelAdj = (i, on) => { DP.selAdj = on ? [...new Set(DP.selAdj.concat(i))] : DP.selAdj.filter(x=>x!==i); dpLeer(); dpPintar(); };
window.dpEliminarAdj = () => AC.confirmar('Confirmación', '¿Estás seguro de que deseas eliminar los archivos seleccionados?', ()=>{ dpLeer(); DP.act.adjuntos = DP.act.adjuntos.filter((a,i)=>!DP.selAdj.includes(i)); DP.selAdj = []; dpPintar(); });
function dpFormHtml(){
  const r = DP.act, t = DP.modo==='crear' ? 'Nuevo Direccionamiento Permanente' : 'Editar Direccionamiento Permanente';
  const depOpt = k => AC.depositos.map(d=>[d.codigo, d[k]]);
  const cuerpo = DP.tab==='det'
    ? `<div class="ac-row" style="margin-bottom:8px">${AC.btn('Agregar','dpAgregar()','ghost','id="dpAgregar"')}${AC.btn('Eliminar','dpEliminarFilas()','pink', DP.sel.length ? '' : 'disabled')}</div><div class="ac-tbl-in">`
      + AC.tabla([
        {t:`<input type="checkbox" onchange="dpSelTodo(this.checked)" ${DP.sel.length && DP.sel.length===r.detalles.length ? 'checked' : ''}>`, v:(d,i)=>`<input type="checkbox" ${DP.sel.includes(i)?'checked':''} onchange="dpSel(${i},this.checked)">`},
        {t:'Línea *', v:(d,i)=>CC.selector(CC.datos.lineas.map(l=>[l.codigo, l.nombre]), d.linea, `onchange="dpSet(${i},'linea',this.value)"`, 'Ingresar Línea')},
        {t:'Tipo de Carga *', v:(d,i)=>CC.selector(DP_CARGA, d.carga, `onchange="dpSet(${i},'carga',this.value,1)"`, 'Elegir Tipo de Carga')},
        {t:'Tamaño/Tipo Contenedor', v:(d,i)=>d.carga==='Contenerizada' ? CC.selector(AC.iso, d.iso, `onchange="dpSet(${i},'iso',this.value)"`, 'Elegir Tamaño/Tipo Contenedor') : '<span class="ac-mut">-</span>'},
        {t:'Código de Aduana *', v:(d,i)=>CC.selector(depOpt('codigo'), d.dep, `onchange="dpSet(${i},'dep',this.value,1)"`, 'Ingresar Código de Aduana')},
        {t:'Razón Social *', v:(d,i)=>CC.selector(depOpt('razon'), d.dep, `onchange="dpSet(${i},'dep',this.value,1)" style="width:230px"`, 'Ingresar Razón Social')},
        {t:'RUC *', v:(d,i)=>CC.selector(depOpt('ruc'), d.dep, `onchange="dpSet(${i},'dep',this.value,1)"`, 'Ingresar RUC')},
        {t:'Vigencia Desde *', v:(d,i)=>`<input type="date" value="${esc(d.desde)}" onchange="dpSet(${i},'desde',this.value,1)">`},
        {t:'Vigencia Hasta *', v:(d,i)=>`<input type="date" value="${esc(d.hasta)}" style="${d.desde && d.hasta && d.desde > d.hasta ? 'border-color:#C62828' : ''}" onchange="dpSet(${i},'hasta',this.value,1)">`},
        {t:'Usuario', v:d=>esc(d.usuario || '-')}, {t:'Fecha de registro', v:d=>AC.fh(d.fecha)}], r.detalles, 'Sin filas. Use Agregar.') + '</div>'
    : `<div class="ac-row" style="margin-bottom:8px">${AC.btn('Subir Archivos','dpSubir()','ghost','id="dpSubir"')}${AC.btn('Eliminar','dpEliminarAdj()','pink', DP.selAdj.length ? '' : 'disabled')}</div>`
      + AC.tabla([{t:'', v:(a,i)=>`<input type="checkbox" ${DP.selAdj.includes(i)?'checked':''} onchange="dpSelAdj(${i},this.checked)">`}, {t:'Nombre', k:'nombre'}, {t:'Fecha', v:a=>AC.fh(a.fecha)}, {t:'Usuario', v:a=>esc(a.usuario || 'Usuario')},
        {t:'Acciones', v:a=>AC.link('⤓', AC.cb(()=>AC.descargar(a.nombre)), 'title="Descargar"')}], r.adjuntos, 'Sin archivos adjuntos.');
  return `<div class="fac-card" id="dpForm"><div class="fac-head"><h3>${t}</h3></div><div class="fac-g3">${CC.campo('Cliente', CC.selector(dpClientes(), r.cliente, 'id="dpCli" maxlength="200"', 'Ingresar Cliente'))}</div>
    ${AC.tabs([['det','Direccionamiento Permanente'],['adj','Adjuntos']], DP.tab, 'dpTab')}${cuerpo}
    <div class="fac-btns">${AC.btn('Cancelar','dpCancelar()','ghost')}${AC.btn('Guardar','dpGuardar()','','id="dpGuardar"')}</div></div>`;
}
window.dpCancelar = () => AC.confirmar('Confirmación', `¿Estás seguro de que desea cancelar la ${DP.modo==='crear' ? 'creación' : 'edición'} del direccionamiento del cliente?`, ()=>{ DP.vista = 'lista'; DP.act = null; CC.abrir('screenAcDirPermanente'); });
window.dpGuardar = () => {
  dpLeer(); const r = DP.act, k = d => [d.linea, d.carga, d.iso, d.dep, d.desde, d.hasta].join('|');
  if(r.detalles.some((d,i)=>r.detalles.findIndex(x=>k(x)===k(d))!==i)){ CC.toast('Existen Direccionamientos Permanentes duplicados','error'); return; }
  if(r.detalles.some(d=>d.desde && d.hasta && d.desde > d.hasta)){ CC.toast('Existen Fechas de Vigencia inválidas','error'); return; }
  if(!r.cliente || !r.detalles.length || r.detalles.some(d=>!d.linea || !d.carga || !d.dep || !d.desde || !d.hasta)){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  r.detalles.forEach(d=>{ if(!d.usuario){ d.usuario = AC.yo(); d.fecha = AC.ahora(); } });
  const crear = DP.modo==='crear';
  if(crear){ r.id = ++DP.seq; DP.lista.push(r); } else DP.lista[DP.lista.findIndex(x=>x.id===r.id)] = r;
  const bls = AC.bls().filter(b=>b.consignatario===r.cliente).map(b=>b.numero);
  DP.aviso = bls.length ? `Existen direccionamientos para los siguientes BLs: ${bls.join(', ')}` : '';
  DP.vista = 'lista'; DP.act = null; DP.buscado = true; CC.abrir('screenAcDirPermanente');
  CC.toast(crear ? 'Direccionamiento Permanente creado exitosamente.' : 'Direccionamiento Permanente modificado exitosamente.','success');
};
CC.registrarPantalla({
  id:'screenAcDirPermanente', grupo:G, opcion:'Direccionamiento Permanente', titulo:'Direccionamiento Permanente',
  migas:['Inicio','Direccionamiento Permanente','Buscar Direccionamiento Permanente'],
  html: () => DP.vista==='form' && DP.act ? dpFormHtml() : dpListaHtml(),
  alAbrir: () => { if(DP.vista!=='lista'){ DP.vista = 'lista'; DP.act = null; CC.refrescar('screenAcDirPermanente'); } },
  guia:[{t:'Direccionamiento permanente', steps:[{el:'#dpF', h:'Buscar', p:'Busca por cliente. El registro "Defecto del Sistema" no se modifica.'}]}]
});

/* ============================================================
   4. REPORTE DE COMISIONES POR PAGAR (Connect: "Reporte de Participaciones por Pagar")
============================================================ */
const CO = { f:{linea:'',viaje:'',nave:'',cliente:'',desde:'',hasta:''}, res:null, pagina:1, tam:10, data:null };
function coSeed(){
  if(CO.data) return;
  const bls = AC.bls(), emb = CC.datos.socios.embarcadores, conceptos = [['Visto bueno','VB-IMP'],['THC destino','THC-DES'],['Manejo documentario','DOC-IMP'],['Gate in','GATE-IN']];
  CO.data = Array.from({length:18}, (_,i)=>{ const b = bls[i % bls.length], ln = i % 3 === 2 ? 'MSK' : 'ZIM', cli = emb[i % emb.length], [conc, tar] = conceptos[i % 4];
    const cant = 1 + i % 3, precio = [65, 120, 45, 30][i % 4], venta = cant*precio, igv = Math.round(venta*18)/100, total = venta + igv;
    const p = x => Math.round(venta*x*100)/100, hbl = b.tipo==='House B/L';
    return { linea:AC.lineaNombre(ln), cod:ln, viaje:b.viaje, nave:b.nave, puerto:b.puerto, ruc:cli.ruc, cliente:cli.razonSocial, mbl:b.numero, hbl:b.hijo || '-', tipoBl:b.tipo, nbl:b.numero,
      tarifa:tar, concepto:conc, cc:'CC-ATC-01', actividad:'Importación', condicion:i % 2 ? 'Crédito' : 'Contado', moneda:'USD', cantidad:cant, precio, venta, igv, total,
      zimM: ln==='ZIM' && !hbl ? p(.05) : 0, tmgM: !hbl ? p(.02) : 0, cosM: !hbl ? p(.03) : 0, zimH: ln==='ZIM' && hbl ? p(.05) : 0, tmgH: hbl ? p(.02) : 0, cosH: hbl ? p(.03) : 0,
      factura:`F001-${String(300+i).padStart(6,'0')}`, fFactura:`2026-11-${pad(1 + i % 20)}`, embarcador:cli.razonSocial, consignatario:b.consignatario, notificante:b.consignatario, consolidador:'-', operador:b.operador };
  });
}
function coLeer(){ CO.f = {linea:AC.v('coFLin'), viaje:AC.v('coFViaje'), nave:AC.v('coFNave'), cliente:AC.v('coFCli'), desde:AC.v('coFDesde'), hasta:AC.v('coFHasta')}; }
window.coViaje = () => { coLeer(); const v = CC.datos.viajes.find(x=>`${x.numero} - ${x.nave} | ${x.puerto}`===CO.f.viaje); if(v) CO.f.nave = v.nave; CC.refrescar('screenAcComisiones'); };
window.coBuscar = () => { coLeer(); const f = CO.f;
  if(!f.linea || !f.desde || !f.hasta){ CC.toast('Los campos Línea y Fechas son obligatorios.','error'); return; }
  coSeed(); CO.res = CO.data.filter(r=>r.linea===f.linea && r.fFactura >= f.desde && r.fFactura <= f.hasta && (!f.viaje || f.viaje.startsWith(r.viaje+' ')) && AC.tiene(r.nave, f.nave) && AC.tiene(r.cliente, f.cliente));
  CO.pagina = 1; CC.refrescar('screenAcComisiones'); if(!CO.res.length) CC.toast('No se encontraron resultados con los criterios seleccionados','info'); };
window.coLimpiar = () => { CO.f = {linea:'',viaje:'',nave:'',cliente:'',desde:'',hasta:''}; CO.res = null; CC.refrescar('screenAcComisiones'); };
window.coPagina = (p, t) => { if(t) CO.tam = t; CO.pagina = p; CC.refrescar('screenAcComisiones'); };
const CO_COLS = [['Línea','linea'],['Viaje','viaje'],['Nave','nave'],['RUC Cliente','ruc'],['Cliente','cliente'],['MBL','mbl'],['HBL','hbl'],['Tipo BL','tipoBl'],['N° BL','nbl'],['Tarifa','tarifa'],['Concepto','concepto'],
  ['Centro Costo','cc'],['Actividad','actividad'],['Condición de Pago','condicion'],['Moneda','moneda'],['Cantidad','cantidad',1],['Precio','precio',1],['Venta','venta',1],['IGV (18%)','igv',1],['Total','total',1],
  ['Part. ZIM (MBL)','zimM',1],['Part. TMG (MBL)','tmgM',1],['Part. COSMOS (MBL)','cosM',1],['Part. ZIM (HBL)','zimH',1],['Part. TMG (HBL)','tmgH',1],['Part. COSMOS (HBL)','cosH',1],
  ['N° Factura','factura'],['Fecha Factura','fFactura'],['Embarcador','embarcador'],['Consignatario','consignatario'],['Notificante','notificante'],['Consolidador','consolidador'],['Operador Logístico','operador']];
window.coExportar = () => CC.exportarExcel('Comisiones', 'Comisiones', CO_COLS.map(c=>c[0]), (CO.res||[]).slice(0,1000).map(r=>CO_COLS.map(([t,k,n])=>k==='fFactura' ? AC.f(r[k]) : r[k])));
function coHtml(){
  coSeed(); const f = CO.f, viajes = CC.datos.viajes.map(v=>`${v.numero} - ${v.nave} | ${v.puerto}`);
  let res = '';
  if(CO.res){
    const pg = CC.paginar(CO.res, CO.pagina, CO.tam).filas, s = k => pg.reduce((a,r)=>a + r[k], 0);
    res = CC.tablaResultados({ id:'coRes', filas:CO.res, pagina:CO.pagina, tam:CO.tam, fnPagina:'coPagina', exportar:'coExportar()', vacio:'No se encontraron resultados con los criterios seleccionados',
        columnas: CO_COLS.map(([t,k,n])=>({t, v:r=> k==='fFactura' ? AC.f(r[k]) : n && k!=='cantidad' ? CC.dinero(r[k]) : esc(r[k])})) })
      + `<div class="fac-card" id="coTot"><div class="ac-cards"><div>Suma de Ventas<b>${CC.dinero(s('venta'))}</b></div><div>Suma de Total<b>${CC.dinero(s('total'))}</b></div>
        <div>Suma de Comisiones ZIM<b>${CC.dinero(s('zimM') + s('zimH'))}</b></div><div>Suma de Comisiones TMG<b>${CC.dinero(s('tmgM') + s('tmgH'))}</b></div><div>Suma de Comisiones COSMOS<b>${CC.dinero(s('cosM') + s('cosH'))}</b></div></div></div>`;
  }
  return CC.filtros({ id:'coF', titulo:'Reporte de Participaciones por Pagar', sub:'Ingrese datos para buscar', cols:3,
    campos:[CC.campo('Línea *', CC.selector(CC.datos.lineas.map(l=>l.nombre), f.linea, 'id="coFLin"', 'Ingresar Línea')),
      CC.campo('Viaje', CC.selector(viajes, f.viaje, 'id="coFViaje" onchange="coViaje()"', 'Ingresar Viaje')),
      CC.campo('Nave', AC.lista('coFNave', f.nave, CC.datos.naves.map(n=>n.nombre), 'Ingresar Nave', 'maxlength="200"')),
      CC.campo('Cliente', AC.lista('coFCli', f.cliente, CC.datos.socios.embarcadores.map(e=>e.razonSocial), 'Ingresar Cliente', 'maxlength="200"')),
      CC.campo('Fecha *', `<div class="ac-row"><input type="date" id="coFDesde" value="${esc(f.desde)}" title="Desde" style="flex:1"><input type="date" id="coFHasta" value="${esc(f.hasta)}" title="Hasta" style="flex:1"></div>`)],
    buscar:'coBuscar()', limpiar:'coLimpiar()' }) + res;
}
CC.registrarPantalla({
  id:'screenAcComisiones', grupo:G, opcion:'Reporte de Comisiones por Pagar', titulo:'Reporte de Participaciones por Pagar',
  migas:['Inicio','Participaciones','Reporte de Participaciones por Pagar'],
  html: coHtml,
  guia:[{t:'Comisiones por pagar', steps:[{el:'#coF', h:'Filtros', p:'Línea y rango de fechas son obligatorios. Exporta el resultado a Excel.'}]}]
});
})();
