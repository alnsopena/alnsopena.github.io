/* Módulo: Agenciamiento (Viaje, Itinerario) y Tarifa
   Se carga desde index.html (ya enlazado; no edites el index).
   Base: Cosmos Connect tal cual (docs/inventario/agenciamiento-tarifa.md), con los prototipos del mockup
   marcados como propuesta (cc-prop) para que "Ver propuestas" los oculte.
   Todo en memoria, datos ficticios. Las pantallas Viaje y Tarifa viven en el index (screenVoyages,
   screenTariffs); este archivo pinta su contenido. Itinerario es pantalla nueva (CC.registrarPantalla). */
(function(){
'use strict';
const W = window, D = document;
const $ = id => D.getElementById(id);
const esc = x => CC.esc(x);
const SIN = 'sin ticket';
const P = (txt, cls) => CC.propuesta(SIN, txt, cls);          // bloque propuesta
const TAG = txt => CC.etiquetaPropuesta(SIN, txt);             // etiqueta en línea
const now = () => { const d = new Date(); d.setSeconds(0,0); return new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const usr = () => CC.usuario();
const fdt = iso => iso ? W.vyFmt(iso) : '';
const norm = x => W.normTxt(x);
const dl = (id, arr) => `<datalist id="${id}">${arr.map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>`;
const addH = (iso, h) => { if(!iso) return ''; const d = new Date(iso); d.setTime(d.getTime() + h*3600000); return new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const ICO = {
  hist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
  cmp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v18M16 3v18M3 8h5M16 16h5"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>',
  line:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M8 8v8M16 8v8"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

/* ---------- Diálogo de confirmación genérico (Cancelar / Confirmar) ---------- */
let okCb = null, noCb = null;
W.agOk = () => { const cb = okCb; okCb = null; noCb = null; CC.cerrarModal(); if(cb) cb(); };
W.agNo = () => { const cb = noCb; okCb = null; noCb = null; CC.cerrarModal(); if(cb) cb(); };
function confirmar(titulo, msg, cb, ok, cancel){
  okCb = cb; noCb = cancel || null;
  CC.modal(`<h3>${esc(titulo)}</h3><p class="ag-msg">${esc(msg)}</p>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="agNo()">Cancelar</button><button type="button" class="cc-btn" id="agOkBtn" onclick="agOk()">${esc(ok||'Confirmar')}</button></div>`);
}
/* Paginador con las opciones de Connect (5, 10, 25) */
function pager(total, page, size, fn){
  const pages = Math.max(1, Math.ceil(total/size));
  const b = (l, p, dis, t) => `<button type="button" title="${t}" ${dis?'disabled':''} onclick="${fn}(${p})">${l}</button>`;
  return `<div class="cc-pager" style="border:none"><span>Items por página</span><select onchange="${fn}(1,Number(this.value))">${[5,10,25].map(n=>`<option ${n===size?'selected':''}>${n}</option>`).join('')}</select>
    <span class="pg-n">${page} de ${pages}</span>${b('«',1,page<=1,'Primera página')}${b('‹',page-1,page<=1,'Página anterior')}${b('›',page+1,page>=pages,'Siguiente página')}${b('»',pages,page>=pages,'Última página')}</div>`;
}
const fld = (label, inner, cls) => CC.campo(label, inner, cls);
const sel = (opts, val, attrs, ph) => CC.selector(opts, val, attrs, ph);
function card(titulo, cuerpo, acciones, attrs){
  return `<div class="fac-card ag-card" ${attrs||''}>${titulo||acciones?`<div class="fac-head"><h3>${titulo||''}</h3>${acciones?`<div class="fac-acts">${acciones}</div>`:''}</div>`:''}${cuerpo}</div>`;
}

/* =====================================================================
   VIAJE · Agenciamiento > Viaje (Consulta Viaje / Nuevo Viaje / Edición de Viaje)
===================================================================== */
const ORG = 'COSMOS AGENCIA MARITIMA S.A.C.';          // organización de la sucursal activa (ficticia)
const VY_EST = ['Creado','Direccionamiento cerrado','Anulado'];
const VY_TIPO = ['Liner','Tramp'];
const VY_TIPO_AG = ['Agente Marítimo','Agente Documentario','Agente Protector','Solo Servicios'];
const VY_TIPO_OP = ['Descarga','Embarque','Descarga y Embarque','Abastecimiento','Reparación'];
const VY_LUGAR = ['Muelle','Bahía','Multiboyas'];
const VY_CARGA = ['Contenedores','Granel sólido','Granel líquido','Carga general','Carga rodante'];
const VY_MON = [['USD','Dólar estadounidense'],['PEN','Sol peruano']];
const VY_PLANT = ['Pre Arrival','UIS','Service Requirement'];
const VY_DOCT = ['Requerimiento de Servicio','Certificado','Nota de embarque','Otros'];
const VY_ACT = ['Atraque','Desatraque','Cambio de muelle','Fondeo'];
const VY_TUGS = ['RAM CHASQUI','RAM INTI','RAM PACHA','RAM WAYRA'];
const VY_CATS = ['Arribo','Operaciones','Zarpe'];
const VY_EV = {
  Arribo:['EOSP','PILOT ON BOARD','FIRST LINE','ALL FAST','FREE PRATIQUE','ARRIVAL PILOT STATION','MOORING','DROPPED ANCHOR','NOTICE OF READINESS TENDERED','AUTHORITIES ON BOARD'],
  Operaciones:['STARTED OPERATIONS','COMPLETED OPERATIONS','HOSE CONNECTED','STARTED DISCHARGE','COMPLETE DISCHARGE','STARTED LOADING','COMPLETE LOADING','LASHING COMPLETED'],
  Zarpe:['ETA NEXT PORT','UNMOORING','DISPATCH','UNBERTHED','SAILED','PILOT DISEMBARKED']
};
const VY_UNICOS = ['EOSP','NOTICE OF READINESS TENDERED','SAILED'];
/* Hitos espejo: cambiar el hito crea o cambia el evento enlazado */
const VY_MIRROR = {nor:['Arribo','NOTICE OF READINESS TENDERED','NOR Tendered'], ata:['Arribo','EOSP','ATA'], atb:['Arribo','ALL FAST','ATB'], atd:['Zarpe','SAILED','ATD'], iniOp:['Operaciones','STARTED OPERATIONS','Inicio Operaciones'], finOp:['Operaciones','COMPLETED OPERATIONS','Fin Operaciones']};
const T_LBL = {eta:'ETA', etb:'ETB', etd:'ETD', ata:'ATA', atb:'ATB', atd:'ATD', nor:'NOR Tendered', libre:'Libre Plática', iniOp:'Inicio Operaciones', finOp:'Fin Operaciones', iniDesc:'Inicio Descarga', finDesc:'Fin Descarga', iniEmb:'Inicio Embarque', finEmb:'Fin Embarque'};
const AG = {seeded:false, closed:{}, sub:'Arribo', selAlias:{}, selDocs:{}, selBer:{}, mode:'view', nuevo:null, snap:null, assocTmp:[], sort:{k:'code', d:1}, searched:false, timers:[]};

function muelles(terminal){ return terminal ? ['Muelle 1','Muelle 2','Muelle 3','Muelle 5A','Muelle 11'] : []; }
function terminales(puerto){ return [...new Set([...(TERMINALS_BY_PORT[puerto]||[]), (PORTS.find(p=>p.k===puerto)||{}).terminal].filter(Boolean))]; }
const ptoPe = () => PORTS.map(p=>`${p.code} - ${p.k}`);
const ptoTodos = () => CC.datos.puertos.map(p=>p.nombre);
const clientes = () => [...new Set([...state.clients.map(c=>c.name), ...CC.datos.socios.clientes.map(c=>c.razonSocial)])];
const armadores = () => [...new Set([...SHIPS_CATALOG.map(s=>s.armador).filter(Boolean), ...CC.datos.lineas.map(l=>l.nombre), ...SQ.filter(s=>s.roles.includes('Armador')).map(s=>s.razonSocial)])];
const proveedores = () => [...new Set([...W.homologatedSuppliers(), ...CC.datos.socios.proveedores.map(p=>p.razonSocial)])];
const lineasNav = () => CC.datos.lineas.map(l=>l.nombre);

/* Completa los datos de Connect que el viaje del mockup no traía */
function vx(v){
  if(!v || v._ag) return v;
  const s = SHIPS_CATALOG.find(x=>x.name===v.nave) || {};
  const def = {manif:'', manifSal:'', due:'', capitan:'', capEmail:'', toneladas:'', bandera:s.flag||'', lloyds:String(s.imo||'').replace(/\D/g,''), armPrin:'', fletador:'', corredor:'', servCont:'',
    factPor:'', envLiq:'', moneda:'USD', tc:'', tipoAg:'Agente Marítimo', agente:ORG, tipoOp:'Descarga', lugar:'Muelle', carga:'Carga general', origenPto:'', origenFecha:'', ultPto:'', ultFecha:'',
    destino:'', muelle:'', alias:[], motivoAn:'', bk0171:false, sinBls:false,
    t:{etb:'', ata:'', atb:'', atd:'', nor:'', libre:'', iniOp:'', finOp:'', iniDesc:'', finDesc:'', iniEmb:'', finEmb:'', finEmbOk:false, noDesc:false, coment:''},
    ev:{Arribo:[], Operaciones:[], Zarpe:[]}, evCom:{}, rob:{}, tugs:[], pilots:[], docs:[], berths:[], sun:{p0101:false, p0151:false, t0117:false, t0119:false, sending:''}, mails:{}, hist:[]};
  Object.keys(def).forEach(k=>{ if(v[k]===undefined) v[k] = def[k]; });
  ['eta','etd'].forEach(k=>{ if(v[k]) v[k] = String(v[k]).slice(0,16); });
  v.rows.forEach(r=>{ if(r.citado===undefined) r.citado = false; if(!r.docs) r.docs = []; });
  v._ag = 1; return v;
}
function vySeed(){
  if(AG.seeded) return; AG.seeded = true;
  VOYAGES.forEach(vx);
  const L = VOYAGES.filter(v=>v.estado==='Creado');
  const a = L[0];
  if(a){
    Object.assign(a, {due:'CLL-2026-000118', manif:'01-118-2026-1-0412', capitan:'Capitán Demo Uno', capEmail:'capitan.uno@nave.example', origenPto:'Manzanillo', origenFecha:addH(a.eta,-150),
      ultPto:'Manzanillo', ultFecha:addH(a.eta,-148), destino:'Kingston', toneladas:'18500', bk0171:true});
    Object.assign(a.t, {ata:addH(a.eta,2), atb:addH(a.eta,5), iniOp:addH(a.eta,7)});
    a.ev.Arribo.push({id:'e1', ev:'EOSP', ts:a.t.ata}, {id:'e2', ev:'ALL FAST', ts:a.t.atb}); a.ev.Operaciones.push({id:'e3', ev:'STARTED OPERATIONS', ts:a.t.iniOp});
    a.alias.push({id:'a1', linea:CC.datos.lineas[0].nombre, alias:'MSK-115E'});
    a.hist.push({ts:addH(a.eta,-200), user:'M. Rojas (Agenciamiento)', prev:'', next:'Creado', comment:'Viaje creado.'},
      {ts:addH(a.eta,-190), user:'Sistema', prev:'Pendiente', next:'ERROR', comment:'Solicitud de numeración de manifiesto 0101 rechazada por SUNAT.', sunat:{errores:[['0154','El código de puerto de origen no es válido'],['0221','Falta el número de DUE']]}},
      {ts:addH(a.eta,-150), user:'M. Rojas (Agenciamiento)', prev:'Creado', next:'Creado', comment:'Se ingresó nro. manifiesto 01-118-2026-1-0412'});
  }
  if(L[1]){ L[1].estado = 'Direccionamiento cerrado'; L[1].hist.push({ts:now(), user:'Operaciones', prev:'Creado', next:'Direccionamiento cerrado', comment:'Cierre de direccionamiento.'}); }
  if(L[2]) L[2].agente = 'AGENCIA DEMO DEL PACÍFICO S.A.C.';
  VOYAGES.forEach(v=>{ if(!v.hist.length) v.hist.push({ts:addH(v.eta,-240)||now(), user:'M. Rojas (Agenciamiento)', prev:'', next:v.estado, comment:'Viaje creado.'}); });
}
const cur = () => AG.mode==='new' ? AG.nuevo : vx(W.voyByCode(vy.selId));
const isPend = v => v && (v.estado==='Por homologar' || v.estado==='Rechazado');
const editable = v => AG.mode==='new' || AG.mode==='edit' || (v && v.estado==='Por homologar' && W.canEditVessel());
const anulado = v => v && /^(Anulado|Canceled)$/.test(v.estado);
const agenteOk = v => norm(v.agente)===norm(ORG);
const canV = () => /Agenciamiento|Gerencia|Operaciones/.test(usr());
function vyBls(v){ return CC.datos.blImportacion.concat(CC.datos.blExportacion).filter(b=>norm(b.nave)===norm(v.nave) && b.viaje && norm(b.viaje)===norm(v.nro)); }

/* ---------- Propuestas sobre Viaje: I-013 (quiebres SAP), I-021 (rectificar o anular manifiesto), I-036 (alta rápida de socio) ---------- */
const PQ = (txt, cls) => CC.propuesta('I-013', 'HU-FAC-01 · ' + txt, cls);
const PM = (txt, cls) => CC.propuesta('I-021', 'HU-OPS-01 · ' + txt, cls);
const PS = (txt, cls) => CC.propuesta('I-036', 'HU-DOC-02 · ' + txt, cls);
/* Quiebres creados en SAP y sincronizados a Connect (ficticios). Inactivo: no se ofrece, pero se conserva donde ya se usó. */
const QB_SAP = [
  {cod:'QB-0101', desc:'Turno diurno', activo:true}, {cod:'QB-0102', desc:'Turno nocturno', activo:true}, {cod:'QB-0103', desc:'Domingo y feriado', activo:true},
  {cod:'QB-0104', desc:'Operación en bahía', activo:true}, {cod:'QB-0105', desc:'Operación en muelle', activo:true}, {cod:'QB-0199', desc:'Tarifa 2025', activo:false}];
const QB_SYNC = '20/11/2026 06:00';
function qbDe(nombre){   /* quiebres activos asociados al servicio (simulado y fijo por servicio) */
  const act = QB_SAP.filter(q=>q.activo), n = [...String(nombre||'')].reduce((a,c)=>a+c.charCodeAt(0),0);
  return [act[n % act.length], act[(n+1) % act.length]];
}
const qbTxt = cod => { const q = QB_SAP.find(x=>x.cod===cod); return q ? `${q.cod} · ${q.desc}` : ''; };
function qbHeredar(r){ if(r.pda && r.quiebre===undefined){ r.quiebre = qbDe(r.name)[0].cod; r.qbOrigen = 'PDA'; } }
W.agQbOpts = nombre => { const s = $('sv_qb'); if(s) s.innerHTML = '<option value="">Sin quiebre</option>' + (nombre ? qbDe(nombre).map(q=>`<option value="${q.cod}">${esc(q.cod+' · '+q.desc)}</option>`).join('') : ''); };
/* Socios creados con alta rápida (en memoria; quedan Pendiente de aprobación en Data Maestra) */
const SQ = [];
const sqDe = nombre => SQ.find(s=>norm(s.razonSocial)===norm(nombre));

/* ---------- Consulta Viaje ---------- */
W.openVoyages = function(pre, returnTo){
  vySeed();
  vy.returnTo = returnTo || 'landing';
  const keep = !pre && AG.searched && returnTo==='landing';     // Connect recuerda los filtros al volver
  if(!keep){ vy.f = {code:'', nro:'', nave:'', puertoOp:'', cliente:'', armador:'', tipo:'', etaD:'', etaH:'', etdD:'', etdH:'', estado:'', ...(pre||{})}; vy.page = 1; AG.searched = true; }   // al entrar se listan todos (como la búsqueda recordada); Limpiar oculta los resultados
  D.getElementById('stepsNav').style.display = 'none';
  W.showScreen('screenVoyages'); W.showVyView('list'); W.renderVyList();
};
function vyHasF(){ return Object.values(vy.f||{}).some(x=>String(x||'').trim()); }
W.agVyF = (k, val) => { vy.f[k] = val; const on = vyHasF(); D.querySelectorAll('#vyList .ag-needf').forEach(b=>b.disabled = !on); };
W.agVyPto = el => { if(el.value && !ptoPe().includes(el.value)){ el.value = ''; } W.agVyF('puertoOp', el.value); };
W.setVyFilter = (k, val) => { vy.f[k] = val; vy.page = 1; AG.searched = true; W.renderVyList(); };
W.agVyBuscar = () => { if(!vyHasF()) return; AG.searched = true; vy.page = 1; W.renderVyList(); if(!W.vyFiltered().length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); };
W.clearVyFilters = () => { vy.f = {code:'', nro:'', nave:'', puertoOp:'', cliente:'', armador:'', tipo:'', etaD:'', etaH:'', etdD:'', etdH:'', estado:''}; AG.searched = false; vy.page = 1; W.renderVyList(); };
W.agVyQuick = () => { vy.f.estado = vy.f.estado==='Por homologar' ? '' : 'Por homologar'; AG.searched = !!vy.f.estado || vyHasF(); vy.page = 1; W.renderVyList(); };
W.agVySort = k => { AG.sort = {k, d: AG.sort.k===k ? -AG.sort.d : 1}; W.renderVyList(); };
W.vyFiltered = function(){
  const f = vy.f, q = k => norm(f[k]||'');
  const inR = (val, a, b) => (!a || (val && val.slice(0,10)>=a)) && (!b || (val && val.slice(0,10)<=b));
  const pto = f.puertoOp ? f.puertoOp.split(' - ').slice(1).join(' - ') : '';
  return VOYAGES.map(vx).filter(v=>(!q('code') || norm(v.code).includes(q('code'))) && (!q('nro') || norm(v.nro).includes(q('nro'))) && (!q('nave') || norm(v.nave).includes(q('nave'))) &&
    (!pto || norm(v.puerto)===norm(pto)) && (!q('cliente') || norm(v.cliente).includes(q('cliente'))) && (!q('armador') || norm(v.armador).includes(q('armador'))) &&
    (!f.tipo || v.tipo===f.tipo) && (!f.estado || v.estado===f.estado) && inR(v.eta, f.etaD, f.etaH) && inR(v.etd, f.etdD, f.etdH));
};
W.vyExport = function(){
  CC.exportarExcel('Viajes','Viajes',['Código de Viaje','Número de Viaje','Puerto de Operación','Nombre de la Nave','Cliente','Armador','Tipo de Servicio','ETA','ATA','ETD','ATD','Estado'],
    W.vyFiltered().slice(0,1000).map(v=>[v.code,v.nro,v.puerto,v.nave,v.cliente,v.armador,v.tipo,fdt(v.eta),fdt(v.t.ata),fdt(v.etd),fdt(v.t.atd),v.estado]));
};
W.vyGo = (p, size) => { if(size) vy.size = size; vy.page = p; W.renderVyList(); };
W.renderVyList = function(){
  vySeed();
  const f = vy.f || {}; vy.size = [5,10,25].includes(vy.size) ? vy.size : 10;
  const on = vyHasF(), dis = on ? '' : 'disabled';
  const inp = (k, ph, max, extra) => `<input id="vf_${k}" maxlength="${max}" placeholder="${ph}" value="${esc(f[k]||'')}" oninput="agVyF('${k}',this.value)" onkeydown="if(event.key==='Enter')event.preventDefault()" ${extra||''}>`;
  const rng = (a, b) => `<div class="ag-rng"><input type="date" value="${esc(f[a]||'')}" title="Desde" onchange="agVyF('${a}',this.value)"><span>a</span><input type="date" value="${esc(f[b]||'')}" title="Hasta" onchange="agVyF('${b}',this.value)"></div>`;
  const qn = VOYAGES.filter(v=>v.estado==='Por homologar').length;
  const acts = `<button type="button" id="vyBackBtn" ${P('Volver al flujo del prototipo','cc-btn ghost')} onclick="closeVoyages()">${vy.returnTo==='pda'?'← Volver a la PDA':'← Volver'}</button>
    ${canV() ? `<button type="button" class="cc-btn" id="vyNewBtn" onclick="agVyNuevo()">+ Nuevo</button>` : ''}`;
  let html = `<div class="fac-zone">${dl('agPtosPe', ptoPe())}${dl('agCli', clientes())}${dl('agArm', armadores())}
    <div class="fac-card" id="vyFilters"><div class="fac-head"><div><h3>Buscar Viaje</h3><div class="fac-sub">Ingrese datos para buscar</div></div><div class="fac-acts">${acts}</div></div>
    <div class="fac-g3">
      ${fld('Código de Viaje', inp('code','Ingresar Código Viaje',25))}
      ${fld('Número de Viaje', inp('nro','Ingresar Nro Viaje',10))}
      ${fld('Nombre de la Nave', inp('nave','Ingresar Nave',100))}
      ${fld('Puerto de Operación', `<input id="vf_puertoOp" list="agPtosPe" placeholder="Elegir Puerto de Operación" value="${esc(f.puertoOp||'')}" onchange="agVyPto(this)">`)}
      ${fld('Cliente', inp('cliente','Ingresar Cliente',100,'list="agCli"'))}
      ${fld('Armador', inp('armador','Ingresar Armador',100,'list="agArm"'))}
      ${fld('Tipo de Servicio', sel(VY_TIPO, f.tipo, `id="vf_tipo" onchange="agVyF('tipo',this.value)"`, 'Elegir Tipo Servicio'))}
      ${fld('Rango ETA', rng('etaD','etaH'))}
      ${fld('Rango ETD', rng('etdD','etdH'))}
      ${fld('Estado', `<select id="vf_estado" onchange="agVyF('estado',this.value)"><option value="">Elegir Estado</option>${VY_EST.map(e=>`<option ${f.estado===e?'selected':''}>${e}</option>`).join('')}
        <option class="cc-prop" value="Por homologar" ${f.estado==='Por homologar'?'selected':''}>Por homologar</option><option class="cc-prop" value="Rechazado" ${f.estado==='Rechazado'?'selected':''}>Rechazado</option></select>`)}
    </div>
    <div class="fac-btns">${qn || f.estado==='Por homologar' ? `<button type="button" id="vyQuick" ${CC.propuesta('I-016','Atajo Por homologar','tf-q pend ag-quick'+(f.estado==='Por homologar'?' on':''))} onclick="agVyQuick()">Por homologar <b>${qn}</b></button>` : ''}
      <button type="button" class="cc-btn ag-needf" ${dis} onclick="agVyBuscar()">Buscar</button><button type="button" class="cc-btn ghost ag-needf" ${dis} onclick="clearVyFilters()">Limpiar</button></div></div>`;
  const all = AG.searched ? W.vyFiltered() : [];
  if(all.length){
    const s = AG.sort, val = (v,k) => k==='ata'||k==='atd' ? v.t[k]||'' : String(v[k]??'');
    all.sort((a,b)=>val(a,s.k).localeCompare(val(b,s.k), 'es', {numeric:true}) * s.d);
    const pages = Math.max(1, Math.ceil(all.length/vy.size)); vy.page = Math.min(Math.max(1, vy.page||1), pages);
    const th = (t, k) => `<th class="ag-sort" onclick="agVySort('${k}')">${t}${s.k===k?(s.d>0?' ▲':' ▼'):''}</th>`;
    html += `<div class="fac-card" id="vyRes"><div class="fac-head"><h3>Resultados (${all.length})</h3></div>
      <div class="fac-scroll"><table class="fac-tbl"><thead><tr>${th('Código de Viaje','code')}${th('Número de Viaje','nro')}${th('Puerto de Operación','puerto')}${th('Nombre de la Nave','nave')}${th('Cliente','cliente')}${th('Armador','armador')}
        ${th('Tipo de Servicio','tipo')}${th('ETA','eta')}${th('ATA','ata')}${th('ETD','etd')}${th('ATD','atd')}${th('Estado','estado')}<th class="cc-prop">PDA asociada ${TAG('PDA asociada')}</th></tr></thead><tbody id="vyResults">
      ${all.slice((vy.page-1)*vy.size, vy.page*vy.size).map(v=>`<tr><td><a href="#" class="pda-code-link" onclick="selectVoyage('${v.code}');return false">${v.code}</a></td><td>${esc(v.nro)}</td><td>${esc(v.puerto)}</td><td>${esc(v.nave)}</td>
        <td>${esc(v.cliente)}</td><td>${esc(v.armador)}</td><td>${esc(v.tipo)}</td><td>${fdt(v.eta)}</td><td>${fdt(v.t.ata)}</td><td>${fdt(v.etd)}</td><td>${fdt(v.t.atd)}</td>
        <td>${isPend(v) ? `<span class="cc-prop">${W.ptPill(v.estado)}</span>` : esc(v.estado)}</td><td class="cc-prop">${W.vyPdas(v).map(c=>`<span class="mono">${c}</span>`).join('<br>') || '-'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="fac-btns" style="justify-content:space-between;align-items:center"><button type="button" class="cc-btn" id="vyExp" onclick="vyExport()">Exportar</button>${pager(all.length, vy.page, vy.size, 'vyGo')}</div></div>`;
  }
  $('vyList').innerHTML = html + '</div>';
};
W.showVyView = function(v){
  vy.view = v;
  $('vyList').style.display = v==='list' ? '' : 'none';
  $('vyDetail').style.display = v==='detail' ? '' : 'none';
  if(v==='detail'){
    const t = AG.mode==='new' ? 'Nuevo Viaje' : 'Edición de Viaje';
    CC.barra(t, ['Inicio','Viaje',t], 'backToVyList()');
  } else W.updatePagebar('screenVoyages');
  W.scrollTo({top:0});
};
W.backToVyList = function(){
  if(AG.mode!=='view' && !isPend(cur())){ confirmar('Descartar Cambios','Tienes cambios no guardados. ¿Estás seguro de que deseas descartarlos?', ()=>{ vyRestore(); AG.mode = 'view'; vy.selId = null; W.showVyView('list'); W.renderVyList(); }); return; }
  AG.mode = 'view'; vy.selId = null; W.showVyView('list'); W.renderVyList();
};
W.selectVoyage = function(code){
  vySeed(); const v = vx(W.voyByCode(code)); if(!v) return;
  vy.selId = code; vy.errs = null; AG.mode = 'view'; AG.snap = null; AG.assocTmp = [];
  vy.tab = isPend(v) ? 'info' : (['info','times','ops','docs'].includes(vy.tab) ? vy.tab : 'info');
  if(vy.tab==='info' && !isPend(v) && v.rows.length && vy.tabPref) vy.tab = vy.tabPref;
  W.showVyView('detail'); W.renderVyDetail();
};
W.setVyTab = k => { vy.tab = k; vy.tabPref = k; W.renderVyDetail(); };

/* ---------- "+ Nuevo": diálogo Crear Nuevo Viaje ---------- */
const NV = {modo:'blanco', f:{code:'', nro:'', nave:'', puerto:'', cliente:''}, pick:null, buscado:false};
W.agVyNuevo = function(){ NV.modo = 'blanco'; NV.f = {code:'', nro:'', nave:'', puerto:'', cliente:''}; NV.pick = null; NV.buscado = false; nvDlg(); };
function nvDlg(){
  const f = NV.f, pdas = NV.modo==='pda' && NV.buscado ? nvLista() : [];
  CC.modal(`<h3>Crear Nuevo Viaje</h3><div style="height:10px"></div>
    <div class="fac-radio" id="nvTipo"><label><input type="radio" name="nvT" ${NV.modo==='blanco'?'checked':''} onchange="agNvModo('blanco')"> Iniciar en blanco</label>
      <label><input type="radio" name="nvT" ${NV.modo==='pda'?'checked':''} onchange="agNvModo('pda')"> Usar PDA Aprobada</label></div>
    ${NV.modo==='pda' ? `<div class="fac-g3" style="margin-top:14px">
      ${fld('Código PDA', `<input maxlength="25" placeholder="Ingresar Código PDA" value="${esc(f.code)}" oninput="agNvF('code',this.value)">`)}
      ${fld('Número de Viaje', `<input maxlength="10" placeholder="Ingresar Nro Viaje" value="${esc(f.nro)}" oninput="agNvF('nro',this.value)">`)}
      ${fld('Nave', `<input maxlength="100" list="agNvNaves" placeholder="Ingresar Nave" value="${esc(f.nave)}" oninput="agNvF('nave',this.value)">`)}
      ${fld('Puerto de Operación', `<input maxlength="200" list="agPtosPe2" placeholder="Elegir Puerto de Operación" value="${esc(f.puerto)}" oninput="agNvF('puerto',this.value)">`)}
      ${fld('Cliente', `<input maxlength="100" list="agCli2" placeholder="Ingresar Cliente" value="${esc(f.cliente)}" oninput="agNvF('cliente',this.value)">`)}
      <div class="fac-btns" style="align-self:end;margin:0"><button type="button" class="cc-btn" onclick="agNvBuscar()">Buscar</button><button type="button" class="cc-btn ghost" ${Object.values(f).some(Boolean)||NV.buscado?'':'disabled'} onclick="agNvLimpiar()">Limpiar</button></div></div>
      ${dl('agNvNaves', SHIPS_CATALOG.map(s=>s.name))}${dl('agPtosPe2', ptoPe())}${dl('agCli2', clientes())}
      <div class="am-list ag-amlist" id="nvList">${NV.buscado ? (pdas.length ? pdas.map(p=>`<label class="am-card ${NV.pick===p.code?'on':''}"><input type="radio" name="nvPick" ${NV.pick===p.code?'checked':''} onchange="agNvPick('${p.code}')">
        <span><b>${p.code}</b><small>Viaje - Nave: ${esc(p.viaje)} - ${esc(p.nave)}</small><small>Puerto de Operación: ${esc(p.puerto)}</small><small>Cliente: ${esc(p.cliente)}</small></span>
        <span class="am-side cc-prop">${W.pdaLinesFor(p.code).length} servicios</span></label>`).join('') : '<div class="am-empty">No se encontraron PDAs aprobadas que coincidan con su búsqueda</div>') : ''}</div>` : ''}
    <div class="fac-btns"><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="nvOk" ${NV.modo==='pda' && !NV.pick ? 'disabled' : ''} onclick="agNvCrear()">Crear Viaje</button></div>`, 'md');
}
function nvLista(){
  const f = NV.f, q = k => norm(f[k]||''), pto = q('puerto').split(' - ').pop();
  return W.approvedPdas().filter(p=>(!q('code') || norm(p.code).includes(q('code'))) && (!q('nro') || norm(p.viaje).includes(q('nro'))) && (!q('nave') || norm(p.nave).includes(q('nave'))) &&
    (!pto || norm(p.puerto).includes(pto)) && (!q('cliente') || norm(p.cliente).includes(q('cliente'))));
}
W.agNvModo = m => { NV.modo = m; if(m==='blanco'){ NV.f = {code:'', nro:'', nave:'', puerto:'', cliente:''}; NV.pick = null; NV.buscado = false; } nvDlg(); };
W.agNvF = (k, val) => { NV.f[k] = val; };
W.agNvBuscar = () => { NV.buscado = true; NV.pick = null; nvDlg(); };
W.agNvLimpiar = () => { NV.f = {code:'', nro:'', nave:'', puerto:'', cliente:''}; NV.buscado = false; NV.pick = null; nvDlg(); };
W.agNvPick = c => { NV.pick = c; const b = $('nvOk'); if(b) b.disabled = false; D.querySelectorAll('#nvList .am-card').forEach(x=>x.classList.toggle('on', x.querySelector('input').checked)); };
W.agNvCrear = function(){
  const v = vx({code:'', nro:'', nave:'', trg:'', loa:'', puerto:'', terminal:'', cliente:'', armador:'', tipo:'', eta:'', etd:'', estado:'', rows:[], hist:[]});
  if(NV.modo==='pda' && NV.pick){
    const p = W.approvedPdas().find(x=>x.code===NV.pick), s = SHIPS_CATALOG.find(x=>x.name===p.nave) || {};
    Object.assign(v, {nro:p.viaje, nave:p.nave, trg:s.grt||'', loa:s.loa||'', bandera:s.flag||'', lloyds:String(s.imo||'').replace(/\D/g,''), puerto:p.puerto, cliente:p.cliente, desdePda:p.code});
    W.pdaLinesFor(p.code).forEach((l,i)=>v.rows.push({id:'r'+Date.now()+i, cat:l.cat, name:l.name, ini_est:'', ini:'', fin:'', validado:false, proveedor:l.supplier||'', coord:false, ref:'', files:0, pda:p.code, citado:false, docs:[], nuevo:true}));
  }
  CC.cerrarModal(); AG.nuevo = v; AG.mode = 'new'; vy.selId = null; vy.tab = 'info'; vy.errs = null;
  W.showVyView('detail'); W.renderVyDetail();
};

/* ---------- Avisos amarillos de cabecera ---------- */
function avisos(v){
  if(anulado(v) || AG.mode==='new') return [];
  const t = Date.now(), A = [], h = iso => iso ? (t - new Date(iso).getTime())/3600000 : null;
  if(v.eta && !v.t.ata && h(v.eta) > 48) A.push(['ata','Hace más de 48h que se estimó el arribo. Ingrese ATA para mantener trazabilidad operativa.']);
  if(v.etd && !v.t.atd && h(v.etd) > 48) A.push(['atd','Hace más de 48h que se estimó la partida. Ingrese ATD para mantener trazabilidad operativa.']);
  if(!v.due) A.push(['due','El campo Due es obligatorio para generar el envío del arribo y zarpe.']);
  const falta = v.eta ? -h(v.eta) : null;
  if(falta!=null && falta>0 && falta<=120 && !v.mails['Pre Arrival']) A.push(['pre','Quedan menos de 5 días para el arribo (ETA). Envíe el correo Pre Arrival dirigido al capitán.']);
  if(falta!=null && falta>0 && falta<=48 && !v.mails['UIS']) A.push(['uis','Quedan menos de 48 horas para el arribo (ETA). Envíe el correo UIS dirigido al capitán.']);
  if(v.bk0171 && !v.manifSal) A.push(['bk','Ya se cuenta con reservas transmitidas a SUNAT y tiene pendiente generar el manifiesto de salida.']);
  return A.filter(([k])=>!AG.closed[v.code+k]);
}
W.agVyCerrarAviso = k => { AG.closed[(cur()||{}).code+k] = true; W.renderVyDetail(); };

/* ---------- Mantenimiento: cabecera, pestañas y pie ---------- */
W.renderVyDetail = function(){
  const v = cur(), ed = $('vyEditor'); if(!v){ ed.innerHTML = ''; return; }
  const view = AG.mode==='view', ex = AG.mode!=='new', noAn = !anulado(v), pend = isPend(v), s = v.sun;
  let b = '';
  if(pend){
    if(v.estado==='Por homologar' && W.canEditVessel()) b = `<span ${CC.propuesta('I-016','Homologación del viaje preregistrado desde la PDA')}><button type="button" class="cc-btn ghost" onclick="rejectVoyage()">Rechazar</button> <button type="button" class="cc-btn" onclick="homologateVoyage()">Homologar</button></span>`;
  } else if(ex && view && noAn){
    const tip = t => `title="${esc(t)}"`;
    b += `<button type="button" class="cc-btn" id="vyAssocBtn" onclick="openAssocPda()">Asociar PDA</button>`;
    b += `<button type="button" class="cc-btn" onclick="agVyEmail()">Enviar Email</button>`;
    b += `<button type="button" class="cc-btn" onclick="agVyEditar()">Editar</button>`;
    if(!v.manif){
      if(agenteOk(v)) b += `<button type="button" class="cc-btn" ${s.p0101?`disabled ${tip('Solicitud de manifiesto en curso (Pendiente). Espere la respuesta de SUNAT.')}`:''} onclick="agSun('0101')">Solicitar Nro. de Manifiesto</button>`;
      b += `<button type="button" class="cc-btn" ${s.p0101?'disabled':''} onclick="agManifDlg('01')">Ingresar Nro. de Manifiesto</button>`;
    } else {
      if(!v.manifSal){
        const t0151 = s.p0151 ? `disabled ${tip('La transmisión 0151 aún está en proceso de envío. Espere la respuesta de SUNAT.')}` : '';
        b += `<button type="button" class="cc-btn" ${t0151} onclick="agManifDlg('02')">Ingresar Nro. Manifiesto de Salida</button>`;
        if(agenteOk(v)) b += `<button type="button" class="cc-btn" ${t0151} onclick="agSun('0151')">Solicitar Nro. de Manifiesto de Salida</button>`;
      }
      b += `<button type="button" class="cc-btn" ${s.t0117||s.sending==='0117'?`disabled ${tip(s.t0117?'Aviso de arribo ya transmitido a SUNAT.':'Envío en curso.')}`:''} onclick="agSun('0117')">${s.sending==='0117'?'Enviando…':'Transmitir Aviso de Arribo (0117)'}</button>`;
      const no19 = v.t.noDesc ? `disabled ${tip('El viaje está marcado como «No tiene descarga»: no corresponde transmitir el término de descarga.')}` : s.t0119||s.sending==='0119' ? `disabled ${tip(s.t0119?'Término de descarga ya transmitido a SUNAT.':'Envío en curso.')}` : '';
      b += `<button type="button" class="cc-btn" ${no19} onclick="agSun('0119')">${s.sending==='0119'?'Enviando…':'Transmitir Término de Descarga (0119)'}</button>`;
      if(agenteOk(v)){   /* I-021: solo con manifiesto generado y rol autorizado */
        const mfDis = !/Gerencia/.test(usr()) ? `disabled ${tip('Solo jefatura o supervisión puede rectificar o anular el manifiesto.')}` : (s.p0102||s.p0103) ? `disabled ${tip('Rectificación o anulación en curso. Espere la respuesta de SUNAT.')}` : '';
        b += `<button type="button" ${PM('Rectificar o anular manifiesto','cc-btn')} id="agMfBtn" ${mfDis} onclick="agMfDlg()">${s.p0102||s.p0103?'Enviando…':'Rectificar o Anular Manifiesto'}</button>`;
      }
    }
  }
  if(ex && view && !v.motivoAn && !pend) b += `<button type="button" class="cc-btn pink" onclick="agVyAnular()">Anular</button>`;
  if(ex && AG.mode==='edit') b += `<button type="button" class="cc-btn" onclick="agVyGuardar()">Guardar</button><button type="button" class="cc-btn pink" onclick="agVyCancelar()">Cancelar</button>`;
  const av = avisos(v).map(([k,t])=>`<div class="fac-note warn ag-aviso">${ICO.warn}<span>${esc(t)}</span><button type="button" title="Cerrar" onclick="agVyCerrarAviso('${k}')">${ICO.x}</button></div>`).join('');
  const pre = pend && v.origen ? `<div ${CC.propuesta('I-016','Preregistro del viaje desde la PDA','fac-note warn')}>Preregistrado por ${esc(v.origen.by)} · ${W.fmtDate(v.origen.ts)} · <a href="#" onclick="openPdaFromVoyage('${v.origen.pda}');return false">${esc(v.origen.pda)}</a>${v.estado==='Por homologar'?' · Complete los datos y homologue el viaje.':''}</div>` : '';
  const tabs = [['info','Información General'],['times','Tiempos de Arribo y Zarpe'],['ops','Servicios operativos'],['docs','Documentos adjuntos']]
    .map(([k,l])=>`<button type="button" class="${k===vy.tab?'on':''}" onclick="setVyTab('${k}')">${l}${k==='ops'?` <span class="cc-prop">(${v.rows.length})</span>`:''}</button>`).join('');
  const body = vy.tab==='times' ? tabTiempos(v) : vy.tab==='ops' ? tabServicios(v) : vy.tab==='docs' ? tabDocs(v) : tabInfo(v);
  const pie = AG.mode==='new' ? `<div class="fac-btns"><button type="button" class="cc-btn" onclick="agVyGuardar()">Guardar</button><button type="button" class="cc-btn pink" onclick="agVyCancelar()">Cancelar</button></div>` : '';
  ed.innerHTML = `<div class="fac-zone ag-vy">${av}${pre}
    <div class="fac-card"><div class="fac-head md-cardhead"><div class="tf-title"><h3 class="md-h">${AG.mode==='new'?'Nuevo Viaje':esc(v.code)}</h3><span ${P('Encabezado con nave y número de viaje','fac-sub')}>${esc(v.nave||'')}${v.nro?' · '+esc(v.nro):''}</span></div>
      <div class="fac-acts md-actions">${b}</div></div>
      <div class="fac-tabs md-tabs">${tabs}</div><div class="md-body">${body}</div></div>${pie}</div>`;
};

/* ---------- Pestaña Información General ---------- */
function inpV(v, k, opt){
  opt = opt || {};
  const val = k.startsWith('t.') ? v.t[k.slice(2)] : v[k];
  const lock = opt.lock || !editable(v);
  const type = opt.type ? `type="${opt.type}"` : '';
  const ev = opt.re ? 'onchange' : 'oninput';
  return `<input ${type} ${lock?'disabled':''} ${opt.list?`list="${opt.list}"`:''} ${opt.max?`maxlength="${opt.max}"`:''} placeholder="${esc(opt.ph||'')}" value="${esc(opt.type==='datetime-local' ? String(val||'').slice(0,16) : (val??''))}" ${ev}="agVySet('${k}',this.value${opt.re?',1':''})">`;
}
function selV(v, k, opts, ph, re){
  const lock = !editable(v);
  return sel(opts, v[k], `${lock?'disabled':''} onchange="agVySet('${k}',this.value,${re?1:0})"`, ph);
}
W.agVySet = function(k, val, re){
  const v = cur(); if(!v) return;
  if(k.startsWith('t.')){
    const kk = k.slice(2), was = v.t[kk]; v.t[kk] = val;
    if(VY_MIRROR[kk] && (val||'')!==(was||'')) espejo(v, kk, val);
  } else v[k] = val;
  if(k==='nave'){ const s = SHIPS_CATALOG.find(x=>norm(x.name)===norm(val)); Object.assign(v, s ? {trg:s.grt||'', loa:s.loa||'', bandera:s.flag||'', lloyds:String(s.imo||'').replace(/\D/g,'')} : {trg:'', loa:'', bandera:'', lloyds:''}); if(!s) v.nave = ''; }
  if(k==='puerto'){ v.terminal = ''; v.muelle = ''; }
  if(k==='terminal'){ v.muelle = ''; v.tugs.forEach(t=>t.muelle=''); }
  if(k==='armador' && /servicio contable/i.test(val) && !v.servCont) v.servCont = val;
  if(vy.errs && vy.errs[k]){ delete vy.errs[k]; re = 1; }
  if(re) W.renderVyDetail();
};
function espejo(v, kk, val){
  const [cat, ev0, lbl] = VY_MIRROR[kk], ev = kk==='ata' && v.lugar==='Bahía' ? 'DROPPED ANCHOR' : ev0;
  const L = v.ev[cat], e = L.filter(x=>x.ev===ev).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''))[0];
  if(!val && e){ v.ev[cat] = L.filter(x=>x!==e); CC.toast(`El Evento ${ev} ha sido eliminado en la Categoría ${cat}`,'info'); }
  else if(val && e){ e.ts = val; CC.toast(`El Evento ${ev} ha sido modificado en la Categoría ${cat}`,'info'); }
  else if(val){ L.push({id:'e'+Date.now(), ev, ts:val}); CC.toast(`El Evento ${ev} ha sido agregado a la Categoría ${cat}`,'info'); }
  void lbl;
}
function tabInfo(v){
  const req = editable(v) ? ' *' : '', E = vy.errs || {};
  const err = k => E[k] ? `<div class="f-err">${esc(E[k])}</div>` : '';
  const ro = (l, val) => CC.campoLectura(l, val);
  const histBtn = AG.mode!=='new' ? `<button type="button" class="cc-btn ghost ag-histbtn" ${AG.mode==='view'?'':'disabled'} onclick="agVyHist()">Ver Historial</button>` : '';
  const cab = `<div class="fac-g4">${ro('Número de Manifiesto' + (v.sun.p0101?' (Pendiente)':v.manif?' (Aceptado)':''), v.manif)}${ro('Número manifiesto salida', v.manifSal)}${ro('Código de Viaje', v.code)}
    <div class="fac-f"><label>Estado</label><div class="ag-row"><input disabled value="${esc(v.estado||'')}">${histBtn}</div></div></div>`;
  const sh = W.vesselByName(v.nave);
  const homNave = isPend(v) && sh && sh.estado!=='Homologado' ? `<div ${CC.propuesta('I-016','Homologación de la nave preregistrada','fac-note warn')}>La nave ${esc(v.nave)} está por homologar. <a href="#" onclick="agVyHomNave();return false">Homologar la nave</a></div>` : '';
  const buque = `<div class="fac-sec">Datos del buque</div><div class="fac-g4">
    ${fld('Nro Viaje'+req, inpV(v,'nro',{max:10, ph:'Ingresar Nro Viaje'})+err('nro'))}
    ${fld('Nave'+req, inpV(v,'nave',{list:'agNaves', max:200, ph:'Ingresar Nave', re:1, lock:isPend(v)}))}
    ${ro('TRG', v.trg)}${ro('LOA', v.loa)}${ro('Bandera', v.bandera)}${ro('Código Lloyds', v.lloyds)}
    ${fld('Toneladas', inpV(v,'toneladas',{ph:'Ingresar Toneladas'}))}
    ${fld('Nombre Capitán', inpV(v,'capitan',{max:100, ph:'Ingresar Nombre Capitán'}))}
    ${fld('Email Capitán', inpV(v,'capEmail',{type:'email', max:200, ph:'Ingresar Email Capitán'}))}</div>`;
  const cli = `<div class="fac-sec">Cliente / Facturación</div><div class="fac-g4">
    ${fld('Armador'+req, `<div class="ag-row">${inpV(v,'armador',{list:'agArm2', max:100, ph:'Ingresar Armador'})}${editable(v)?`<button type="button" ${PS('Crear socio','ag-ico')} id="agSocioBtn" title="Crear socio" onclick="agSocioDlg()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>`:''}</div>`
      + (sqDe(v.armador) ? (s => `<div class="cc-prop fac-sub">Socio pendiente de aprobación · creado por ${esc(s.creadoPor)} el ${fdt(s.fecha)} desde ${esc(s.origen)}</div>`)(sqDe(v.armador)) : ''))}
    ${fld('Cliente'+req, inpV(v,'cliente',{list:'agCli3', max:100, ph:'Ingresar Cliente'})+err('cliente'))}
    ${fld('Armador principal', inpV(v,'armPrin',{max:200, ph:'Ingresar Armador principal'}))}
    ${fld('Fletador', inpV(v,'fletador',{list:'agCli3', max:100, ph:'Ingresar Fletador'}))}
    ${fld('Corredor marítimo', inpV(v,'corredor',{list:'agCli3', max:100, ph:'Ingresar Corredor marítimo'}))}
    ${fld('Servicio contable', inpV(v,'servCont',{list:'agCli3', max:100, ph:'Ingresar Servicio contable'}))}
    ${fld('Facturar por cuenta de', inpV(v,'factPor',{max:200, ph:'Ingresar Facturar por cuenta de'}))}
    ${fld('Enviar Liquidación a', inpV(v,'envLiq',{max:200, ph:'Ingresar Enviar Liquidación a'}))}
    ${fld('Moneda', selV(v,'moneda',VY_MON,'Elegir Moneda'))}
    ${fld('Tipo de cambio', inpV(v,'tc',{ph:'Ingresar Tipo de Cambio'}))}</div>`;
  const etdErr = v.eta && v.etd && v.etd < v.eta ? '<div class="f-err">El valor de ETD debe ser posterior a la ETA</div>' : '';
  const hitos = `<div class="fac-sec">Hitos (básicos)</div><div class="fac-g4">
    ${fld('ETA'+req, inpV(v,'eta',{type:'datetime-local', re:1})+err('eta'))}${fld('ETD'+req, inpV(v,'etd',{type:'datetime-local', re:1})+(etdErr||err('etd')))}</div>`;
  const bah = v.lugar==='Bahía', agReq = /Marítimo|Documentario/.test(v.tipoAg);
  const termOpts = terminales(v.puerto);
  const dueBad = v.due && !/^[A-Z]{3}-20\d{2}-\d{6}$/.test(v.due);
  const dueHelp = dueBad ? `<div class="f-err">Tener en consideración lo siguiente:<br>PPP: código del puerto.<br>YYYY: año.<br>NNNNNN: correlativo de 6 dígitos.<br>Ejemplo: CLL-2026-000001</div>` : '';
  const conf = `<div class="fac-sec">Configuración Operativa</div><div class="fac-g4">
    ${fld('Tipo Servicio'+req, selV(v,'tipo',VY_TIPO,'Elegir Tipo Servicio'))}
    ${fld('Tipo Agenciamiento'+req, selV(v,'tipoAg',VY_TIPO_AG,'Elegir Tipo Agenciamiento',1))}
    ${fld('Agente Marítimo'+(agReq?req:''), inpV(v,'agente',{list:'agArm2', max:100, ph:'Ingresar Agente Marítimo', re:1}))}
    ${fld('Tipo Operación'+req, selV(v,'tipoOp',VY_TIPO_OP,'Elegir Tipo Operación'))}
    ${fld('Tipo de Lugar'+req, selV(v,'lugar',VY_LUGAR,'Elegir Tipo de Lugar',1))}
    ${fld('Tipo Carga'+req, selV(v,'carga',VY_CARGA,'Elegir Tipo Carga'))}
    ${fld('Puerto de Origen y Fecha'+req, `<div class="ag-row">${inpV(v,'origenPto',{list:'agPtosAll', ph:'Elegir Puerto de Origen'})}${inpV(v,'origenFecha',{type:'datetime-local', re:1})}</div>`, 'fac-span2')}
    ${fld('Puerto de Operación'+req, inpV(v,'puerto',{list:'agPtosK', max:200, ph:'Elegir Puerto de Operación', re:1, lock:false && 0})+err('puerto'))}
    ${fld('Terminal'+(bah?'':req), `<select ${!editable(v)||!v.puerto?'disabled':''} onchange="agVySet('terminal',this.value,1)"><option value="">Elegir Terminal</option>${termOpts.map(t=>`<option ${t===v.terminal?'selected':''}>${esc(t)}</option>`).join('')}</select>`)}
    ${fld('Muelle', `<div class="ag-row"><select ${!editable(v)||!v.terminal?'disabled':''} onchange="agVySet('muelle',this.value)"><option value="">Elegir Muelle</option>${muelles(v.terminal).map(m=>`<option ${m===v.muelle?'selected':''}>${m}</option>`).join('')}</select>
      <button type="button" class="ag-ico" title="Historial de muelles" ${AG.mode!=='new'&&v.terminal?'':'disabled'} onclick="agVyMuelles()">${ICO.line}</button></div>`)}
    ${fld('Último Puerto Extranjero y Fecha'+req, `<div class="ag-row">${inpV(v,'ultPto',{list:'agPtosAll', ph:'Elegir Último Puerto Extranjero'})}${inpV(v,'ultFecha',{type:'datetime-local', re:1})}</div>`, 'fac-span2')}
    ${fld('Puerto de Destino', inpV(v,'destino',{list:'agPtosAll', ph:'Elegir Puerto de Destino'}))}
    ${fld('Due', inpV(v,'due',{max:15, ph:'PPP-YYYY-NNNNNN', re:1})+dueHelp)}</div>`;
  const ed = editable(v);
  const alias = `<div class="fac-sec ag-sech">Alias por Línea Naviera<span>${ed?`<button type="button" class="cc-btn ghost" onclick="agAliasAdd()">Agregar</button><button type="button" class="cc-btn pink" ${Object.values(AG.selAlias).some(Boolean)?'':'disabled'} onclick="agAliasDel()">Eliminar</button>`:''}</span></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th style="width:36px"><input type="checkbox" ${ed?'':'disabled'} onchange="agAliasAll(this.checked)"></th><th>Línea Naviera</th><th>Alias</th></tr></thead><tbody>
    ${v.alias.map(a=>`<tr><td><input type="checkbox" ${ed?'':'disabled'} ${AG.selAlias[a.id]?'checked':''} onchange="agAliasSel('${a.id}',this.checked)"></td>
      <td>${ed?`<input list="agLineas" maxlength="100" style="width:280px" value="${esc(a.linea)}" oninput="agAliasSet('${a.id}','linea',this.value)">`:esc(a.linea)}</td>
      <td>${ed?`<input maxlength="25" style="width:160px" value="${esc(a.alias)}" oninput="agAliasSet('${a.id}','alias',this.value)">`:esc(a.alias)}</td></tr>`).join('') || '<tr><td colspan="3" class="fac-empty">Sin alias registrados.</td></tr>'}</tbody></table></div>`;
  const mot = anulado(v) ? `<div class="fac-sec">Motivo de anulación</div><div class="fac-f"><textarea rows="4" maxlength="800" disabled>${esc(v.motivoAn)}</textarea></div>` : '';
  return homNave + cab + buque + cli + hitos + conf + alias + mot
    + dl('agNaves', SHIPS_CATALOG.map(s=>s.name)) + dl('agArm2', armadores().concat([ORG])) + dl('agCli3', clientes()) + dl('agPtosAll', ptoTodos()) + dl('agPtosK', PORTS.map(p=>p.k)) + dl('agLineas', lineasNav());
}
W.agVyHomNave = () => { const v = cur(); W.openVessel(v.nave, 'voyage'); };
W.agAliasAdd = () => { cur().alias.push({id:'a'+Date.now(), linea:'', alias:''}); W.renderVyDetail(); };
W.agAliasSel = (id, on) => { AG.selAlias[id] = on; W.renderVyDetail(); };
W.agAliasAll = on => { cur().alias.forEach(a=>AG.selAlias[a.id] = on); W.renderVyDetail(); };
W.agAliasSet = (id, k, val) => { const a = cur().alias.find(x=>x.id===id); if(a) a[k] = val; };
W.agAliasDel = () => confirmar('Confirmación','¿Estás seguro de que deseas eliminar los alias seleccionados?', ()=>{ const v = cur(); v.alias = v.alias.filter(a=>!AG.selAlias[a.id]); AG.selAlias = {}; W.renderVyDetail(); });

/* ---------- Pestaña Tiempos de Arribo y Zarpe ---------- */
function tabTiempos(v){
  const view = AG.mode==='view', ed = editable(v), s = v.sun, tieneEv = VY_CATS.some(c=>v.ev[c].length);
  const lockS = k => (s.t0117 && ['ata','atb'].includes(k)) || (s.t0119 && k==='finDesc');
  const pen = k => lockS(k) && view && canV() ? `<button type="button" class="ag-ico" title="Editar individualmente" onclick="agSunEdit('${k}')">${ICO.edit}</button>` : '';
  const alert = (k, base) => !anulado(v) && v[base] && !v.t[k] && (Date.now()-new Date(v[base]).getTime())/3600000 > 48
    ? `<span class="ag-alert" title="${k==='ata'?'Hace más de 48h que se estimó el arribo. Ingrese ATA para mantener trazabilidad operativa.':'Hace más de 48h que se estimó la partida. Ingrese ATD para mantener trazabilidad operativa.'}">${ICO.warn}</span>` : '';
  const dt = (k, lbl, extra) => fld(lbl||T_LBL[k], `<div class="ag-row">${['eta','etd'].includes(k) ? inpV(v,k,{type:'datetime-local', re:1}) : inpV(v,'t.'+k,{type:'datetime-local', re:1, lock:lockS(k)})}${extra||''}</div>`);
  const chk = (k, lbl, lock) => `<label class="fac-chk ag-chk"><input type="checkbox" ${(!ed||lock)?'disabled':''} ${k==='noDesc'?(v.t.noDesc?'checked':''):(v.t[k]?'checked':'')} onchange="agVyChk('${k}',this.checked)"> ${lbl}</label>`;
  const rep = view ? `<div class="fac-btns" style="margin-top:0;justify-content:flex-start"><button type="button" class="cc-btn" ${!anulado(v)&&tieneEv?'':'disabled'} onclick="agVyReporte('Arribo y Zarpe')">Generar Reporte de Arribo y Zarpe</button></div>` : '';
  const cols = `<div class="ag-g4c">
    <div>${dt('eta')}${dt('etb')}${dt('etd')}</div>
    <div>${dt('ata', 'ATA', alert('ata','eta')+pen('ata'))}${dt('atb', 'ATB', pen('atb'))}${chk('noDesc','No tiene descarga', s.t0117)}${dt('atd','ATD',alert('atd','etd'))}</div>
    <div>${dt('nor')}${dt('libre')}${dt('iniOp')}${dt('finOp')}</div>
    <div>${dt('iniDesc')}${dt('finDesc','Fin Descarga',pen('finDesc'))}${dt('iniEmb')}${dt('finEmb')}${chk('finEmbOk','Fin de Embarque', !!v.t.finEmbConf)}</div></div>
    ${fld('Comentarios', `<textarea rows="4" maxlength="800" ${ed?'':'disabled'} placeholder="Ingresar Comentarios" oninput="agVySet('t.coment',this.value)">${esc(v.t.coment)}</textarea>`)}`;
  const subs = VY_CATS.concat(['Remolcadores & Prácticos']).map(c=>`<button type="button" class="${AG.sub===c?'on':''}" onclick="agVySub('${c}')">${c}</button>`).join('');
  return rep + cols + `<div class="fac-tabs ag-subtabs" style="margin-top:18px">${subs}</div>` + (AG.sub==='Remolcadores & Prácticos' ? tugsPilots(v) : eventos(v, AG.sub));
}
W.agVySub = c => { AG.sub = c; W.renderVyDetail(); };
W.agVyChk = (k, on) => { const v = cur(); v.t[k] = on; if(k==='finEmbOk' && on && !v.t.finEmb){ v.t[k] = false; CC.toast('Debe ingresar la fecha Fin Embarque antes de confirmar el Fin de Embarque','error'); } W.renderVyDetail(); };
W.agVyReporte = n => CC.toast(`Reporte de ${n} generado. Se abre el PDF de muestra en otra pestaña (simulado).`,'success');
function eventos(v, cat){
  const ed = editable(v), lockEv = e => (v.sun.t0117 && ['EOSP','DROPPED ANCHOR','ALL FAST'].includes(e.ev));
  const rob = cat!=='Operaciones' ? `<div class="fac-sec">ROB & Draft</div><div class="fac-g4">${['F.O.','D.O.','F.W.','F.W.D.','A.F.T.'].map(k=>fld(k, `<input ${ed?'':'disabled'} placeholder="Ingresar ${k}" value="${esc((v.rob[cat]||{})[k]||'')}" oninput="agVyRob('${cat}','${k}',this.value)">`)).join('')}</div>` : '';
  return `${ed?`<div class="fac-btns" style="margin-top:0;justify-content:flex-start"><button type="button" class="cc-btn ghost" onclick="agEvAdd('${cat}')">Agregar Evento</button></div>`:''}
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Evento</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>
    ${v.ev[cat].map(e=>`<tr><td>${ed&&!lockEv(e)?`<select onchange="agEvSet('${cat}','${e.id}','ev',this.value)"><option value="">Elegir Evento</option>${VY_EV[cat].map(x=>`<option ${x===e.ev?'selected':''}>${x}</option>`).join('')}</select>`:esc(e.ev)}</td>
      <td>${ed&&!lockEv(e)?`<input type="datetime-local" style="width:200px" value="${esc(e.ts||'')}" onchange="agEvSet('${cat}','${e.id}','ts',this.value)">`:fdt(e.ts)}</td>
      <td>${ed&&!lockEv(e)?`<button type="button" class="ag-ico" title="Eliminar" onclick="agEvDel('${cat}','${e.id}')">${ICO.del}</button>`:''}</td></tr>`).join('') || '<tr><td colspan="3" class="fac-empty">Sin eventos registrados.</td></tr>'}
    </tbody></table></div>
    ${fld('Comentarios', `<textarea rows="3" maxlength="800" ${ed?'':'disabled'} oninput="agVyEvCom('${cat}',this.value)">${esc(v.evCom[cat]||'')}</textarea>`)}${rob}`;
}
W.agVyRob = (c, k, val) => { const v = cur(); (v.rob[c] = v.rob[c] || {})[k] = val; };
W.agVyEvCom = (c, val) => { cur().evCom[c] = val; };
W.agEvAdd = c => { cur().ev[c].push({id:'e'+Date.now(), ev:'', ts:''}); W.renderVyDetail(); };
W.agEvSet = (c, id, k, val) => {
  const v = cur(), e = v.ev[c].find(x=>x.id===id); if(!e) return;
  if(k==='ev' && VY_UNICOS.includes(val) && v.ev[c].some(x=>x!==e && x.ev===val)){ CC.toast(`Solo puede haber un Evento ${val}`,'error'); W.renderVyDetail(); return; }
  e[k] = val;
  const m = Object.entries(VY_MIRROR).find(([kk,[cat,ev]])=>cat===c && (ev===e.ev || (kk==='ata' && e.ev==='DROPPED ANCHOR' && v.lugar==='Bahía')));
  if(m && e.ts && v.t[m[0]]!==e.ts){ v.t[m[0]] = e.ts; CC.toast(`El campo ${m[1][2]} ha sido modificado`,'info'); W.renderVyDetail(); }
};
W.agEvDel = (c, id) => confirmar('Confirmación','¿Estás seguro de que deseas eliminar el evento?', ()=>{ const v = cur(); v.ev[c] = v.ev[c].filter(x=>x.id!==id); W.renderVyDetail(); });
function tugsPilots(v){
  const ed = editable(v);
  const tug = `<div class="fac-sec ag-sech">Remolcadores${ed?`<span><button type="button" class="cc-btn ghost" onclick="agTugAdd()">Agregar Remolcador</button></span>`:''}</div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Actividad</th><th>Remolcador</th><th>Muelle</th>${ed?'<th>Acciones</th>':''}</tr></thead><tbody>
    ${v.tugs.map(t=>`<tr><td>${ed?sel(VY_ACT,t.act,`onchange="agTugSet('${t.id}','act',this.value)"`,'Elegir Actividad'):esc(t.act)}</td><td>${ed?sel(VY_TUGS,t.tug,`onchange="agTugSet('${t.id}','tug',this.value)"`,'Elegir Remolcador'):esc(t.tug)}</td>
      <td>${ed?sel(muelles(v.terminal),t.muelle,`onchange="agTugSet('${t.id}','muelle',this.value)"`,'Elegir Muelle'):esc(t.muelle)}</td>${ed?`<td><button type="button" class="ag-ico" title="Eliminar" onclick="agTugDel('${t.id}')">${ICO.del}</button></td>`:''}</tr>`).join('') || `<tr><td colspan="4" class="fac-empty">Sin remolcadores.</td></tr>`}</tbody></table></div>`;
  const pil = `<div class="fac-sec ag-sech">Prácticos${ed?`<span><button type="button" class="cc-btn ghost" onclick="agPilAdd()">Agregar Práctico</button></span>`:''}</div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Actividad</th><th>Práctico</th>${ed?'<th>Acciones</th>':''}</tr></thead><tbody>
    ${v.pilots.map(t=>`<tr><td>${ed?sel(VY_ACT,t.act,`onchange="agPilSet('${t.id}','act',this.value)"`,'Elegir Actividad'):esc(t.act)}</td><td>${ed?`<input maxlength="100" style="width:240px" placeholder="Ingresar Práctico" value="${esc(t.name)}" oninput="agPilSet('${t.id}','name',this.value)">`:esc(t.name)}</td>
      ${ed?`<td><button type="button" class="ag-ico" title="Eliminar" onclick="agPilDel('${t.id}')">${ICO.del}</button></td>`:''}</tr>`).join('') || `<tr><td colspan="3" class="fac-empty">Sin prácticos.</td></tr>`}</tbody></table></div>`;
  return tug + pil;
}
W.agTugAdd = () => { cur().tugs.push({id:'g'+Date.now(), act:'', tug:'', muelle:''}); W.renderVyDetail(); };
W.agTugSet = (id, k, val) => { const t = cur().tugs.find(x=>x.id===id); if(t) t[k] = val; };
W.agTugDel = id => confirmar('Confirmación','¿Estás seguro de que deseas eliminar el remolcador?', ()=>{ const v = cur(); v.tugs = v.tugs.filter(x=>x.id!==id); W.renderVyDetail(); });
W.agPilAdd = () => { cur().pilots.push({id:'p'+Date.now(), act:'', name:''}); W.renderVyDetail(); };
W.agPilSet = (id, k, val) => { const t = cur().pilots.find(x=>x.id===id); if(t) t[k] = val; };
W.agPilDel = id => confirmar('Confirmación','¿Estás seguro de que deseas eliminar el práctico?', ()=>{ const v = cur(); v.pilots = v.pilots.filter(x=>x.id!==id); W.renderVyDetail(); });

/* ---------- Pestaña Servicios operativos ---------- */
function pvp(v, r){   /* PDA vs Provisión simulado, fijo por servicio */
  const m = (CATALOG_MASTER.maritimo || []).find(x=>x.name===r.name) || {}, rate = Number(m.rate) || 45, n = [...r.name].reduce((a,c)=>a+c.charCodeAt(0),0) % 4;
  const st = !r.pda ? 'NO_PROVISION' : n===0 ? 'MISMATCH' : n===1 ? 'NO_PROVISION' : 'MATCH';
  return {st, rate, cur:m.currency||'USD', unit:m.tariffUnit||m.unit||'Servicio', prov: st==='MATCH' ? rate : st==='MISMATCH' ? rate + 12.5 : null};
}
function tabServicios(v){
  const view = AG.mode==='view', ed = editable(v) && !isPend(v), an = anulado(v), saved = AG.mode!=='new';
  const pdas = W.vyPdas(v);
  const linked = pdas.length ? `<div ${P('Varias PDAs por viaje, Ver PDA y Desasociar','vy-linked')}>${pdas.map(c=>`<span class="vy-pda"><b>${c}</b> · ${v.rows.filter(r=>r.pda===c).length} servicios
      <button type="button" class="link-btn" onclick="openPdaFromVoyage('${c}')">Ver PDA</button>${saved && view?`<button type="button" class="link-btn danger" onclick="unlinkPda('${v.code}','${c}')">Desasociar</button>`:''}</span>`).join('')}</div>` : '';
  const top = `<div class="fac-btns" style="margin-top:0;justify-content:space-between;align-items:center">${linked||'<span></span>'}<span>
    ${view ? `<button type="button" class="cc-btn" ${!an && v.rows.some(r=>r.ini)?'':'disabled'} onclick="agVyReqServ()">Generar Requerimiento de Servicio</button>` : ''}
    ${ed ? `<button type="button" class="cc-btn ghost" onclick="agCatDlg()">Agregar Categoría</button>` : ''}</span></div>`;
  const cats = W.catList().filter(c=>v.rows.some(r=>r.cat===c));
  const sn = b => b ? 'Sí' : 'No';
  const ico = {MATCH:['✓','Coincide','ok'], MISMATCH:['⚑','No coincide','err'], NO_PROVISION:['◷','Sin provisión','wait']};
  const head = `<tr><th>Servicio</th><th>Fecha/Hora Inicio estimada</th><th>Fecha/Hora Inicio</th><th>Fecha/Hora Fin</th><th>Validado</th><th>Proveedor</th><th>Requiere Coordinación</th><th>Referencias</th>
    <th class="num">Cantidad Archivos</th><th>Código PDA</th><th ${PQ('Quiebre SAP por servicio')}>Quiebre SAP</th><th>Documentos adjuntos</th><th>Acciones</th>${saved?'<th>PDA vs Provisión</th>':''}</tr>`;
  return top + (cats.map(c=>{
    const rows = v.rows.filter(r=>r.cat===c), open = ed || vy.open[c]!==false;
    return `<div class="vy-acc ${open?'open':''}"><div class="ag-acch"><button type="button" class="vy-acc-h" ${ed?'':`onclick="vy.open['${c}']=${!open};renderVyDetail()"`}>${esc(W.catLabel(c))} <span class="cc-prop">${rows.length}</span>${ed?'':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>'}</button>
      ${ed?`<button type="button" class="cc-btn ghost" onclick="agSvcDlg('${c}')">Agregar Servicio</button>`:''}</div>
      ${open ? `<div class="fac-scroll vy-tbl"><table class="fac-tbl"><thead>${head}</thead><tbody>${rows.map(r=>{ qbHeredar(r); const p = pvp(v,r), ic = ico[p.st];
        return `<tr class="${r.pda?(r.nuevo?'vy-frompda ag-nuevo':'vy-frompda'):''}"><td>${esc(r.name)}</td><td>${W.vyDate(r.ini_est)}</td><td>${W.vyDate(r.ini)}</td><td>${W.vyDate(r.fin)}</td><td>${sn(r.validado)}</td><td>${esc(r.proveedor||'')}</td>
        <td>${sn(r.coord)}</td><td>${esc(r.ref||'')}</td><td class="num">${r.docs.length||r.files||0}</td>
        <td>${r.pda?`<a href="#" class="pda-code-link" onclick="openPdaFromVoyage('${r.pda}');return false">${r.pda}</a>`:''}</td>
        <td class="cc-prop">${r.quiebre?esc(qbTxt(r.quiebre))+(r.qbOrigen==='PDA'?' <span class="fac-sub">(heredado de la PDA)</span>':''):'<span class="fac-sub">Sin quiebre</span>'}</td>
        <td>${ed?`<button type="button" class="ag-ico" title="Adjuntar Documentos" onclick="agAdjDlg('${r.id}')">${ICO.up}</button>`:`<button type="button" class="ag-ico" title="Documentos Adjuntos" ${r.docs.length?'':'disabled'} onclick="agAdjDlg('${r.id}')">${ICO.eye}</button>`}</td>
        <td><button type="button" class="ag-ico" title="Editar" ${ed?'':'disabled'} onclick="agSvcDlg('${c}','${r.id}')">${ICO.edit}</button><button type="button" class="ag-ico" title="Eliminar" ${ed && !r.validado && !an?'':'disabled'} onclick="agSvcDel('${r.id}')">${ICO.del}</button></td>
        ${saved?`<td><button type="button" class="ag-ico" title="Ver comparación de importes" onclick="agPvp('${r.id}')">${ICO.cmp}</button> <span class="fac-pill ${ic[2]}" title="${ic[1]}">${ic[0]} ${ic[1]}</span></td>`:''}</tr>`; }).join('')}</tbody></table></div>` : ''}</div>`;
  }).join('') || `<div class="fac-empty">Sin servicios. ${ed?'Use "Agregar Categoría" o ':'Use '}"Asociar PDA" para traer los servicios de una PDA aprobada.</div>`);
}
W.agVyReqServ = () => { const v = cur(); if(!v.rows.some(r=>r.ini)){ CC.toast('Es necesario al menos un servicio ejecutado para enviar el requerimiento de servicio.','error'); return; } W.agVyReporte('Requerimiento de Servicio'); };
W.agCatDlg = function(){
  const v = cur(), cats = W.catList();
  W.agCatSel = cats[0];
  const svcs = c => W.masterCatalog().filter(m=>m.cat===c && !v.rows.some(r=>r.cat===c && r.name===m.name));
  const pinta = () => { const L = svcs(W.agCatSel);
    $('agCatSvcs').innerHTML = L.length ? L.map(m=>`<label class="fac-chk"><input type="checkbox" value="${m.id}" onchange="agCatChk()"> ${esc(m.name)}</label>`).join('') : '<div class="fac-empty">No hay servicios disponibles en esta categoría.</div>';
    $('agCatOk').disabled = true; };
  W.agCatChk = () => { $('agCatOk').disabled = !D.querySelector('#agCatSvcs input:checked'); };
  W.agCatCambia = c => { W.agCatSel = c; pinta(); };
  W.agCatOk = () => { const ids = [...D.querySelectorAll('#agCatSvcs input:checked')].map(i=>i.value);
    ids.forEach((id,i)=>{ const m = W.masterCatalog().find(x=>x.id===id); v.rows.push({id:'r'+Date.now()+i, cat:W.agCatSel, name:m.name, ini_est:'', ini:'', fin:'', validado:false, proveedor:'', coord:false, ref:'', files:0, pda:'', citado:false, docs:[]}); });
    CC.cerrarModal(); W.renderVyDetail(); };
  CC.modal(`<h3>Agregar Nueva Categoría</h3><div style="height:10px"></div>
    ${fld('Categoría', sel(cats.map(c=>[c, W.catLabel(c)]), cats[0], 'onchange="agCatCambia(this.value)"', null))}
    <div class="fac-sec">Seleccionar Servicios</div><div class="ag-chklist" id="agCatSvcs"></div>
    <div class="fac-btns"><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="agCatOk" disabled onclick="agCatOk()">Agregar</button></div>`);
  pinta();
};
W.agSvcDlg = function(cat, id){
  const v = cur(), r = id ? v.rows.find(x=>x.id===id) : {cat, name:'', ini_est:'', ini:'', fin:'', proveedor:'', coord:false, validado:false, citado:false, ref:''};
  const L = W.masterCatalog().filter(m=>m.cat===cat).map(m=>m.name); if(r.name && !L.includes(r.name)) L.unshift(r.name);
  W.agSvcOk = () => {
    const g = k => $('sv_'+k), d = {name:g('name').value, ini_est:g('ini_est').value, ini:g('ini').value, fin:g('fin').value, proveedor:g('prov').value.trim(), coord:g('coord').checked, validado:g('val').checked, citado:g('cit').checked, ref:g('ref').value};
    if($('sv_qb')){ const q = $('sv_qb').value; if(q!==(r.quiebre||'')){ d.quiebre = q; d.qbOrigen = 'Viaje'; } }
    if(d.proveedor && !proveedores().includes(d.proveedor)) d.proveedor = '';
    if(!d.name){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
    if((d.ini || d.fin) && !d.validado){ CC.toast('El servicio debe ser Validado cuando cuente con Fecha/Hora Inicio o Fecha/Hora Fin','error'); return; }
    if(d.validado && !d.proveedor){ CC.toast('Para marcar el servicio como Validado debe seleccionar un Proveedor de la lista','error'); return; }
    if(id) Object.assign(r, d); else v.rows.push({id:'r'+Date.now(), cat, files:0, pda:'', docs:[], ...d});
    CC.cerrarModal(); W.renderVyDetail();
  };
  CC.modal(`<h3>${id?'Editar Servicio':'Agregar Servicio'}</h3><div class="fac-sub">${esc(W.catLabel(cat))}</div>
    <div class="fac-g2" style="margin-top:12px">
    ${fld('Servicio *', sel(L, r.name, 'id="sv_name" onchange="agQbOpts(this.value)"', 'Seleccionar Servicio'), 'fac-span2')}
    ${fld('Fecha/Hora Inicio estimada', `<input type="datetime-local" id="sv_ini_est" value="${esc(String(r.ini_est||'').slice(0,16))}">`)}
    ${fld('Fecha/Hora Inicio', `<input type="datetime-local" id="sv_ini" value="${esc(String(r.ini||'').slice(0,16))}">`)}
    ${fld('Fecha/Hora Fin', `<input type="datetime-local" id="sv_fin" value="${esc(String(r.fin||'').slice(0,16))}">`)}
    ${fld('Proveedor', `<input id="sv_prov" list="agProv" maxlength="100" placeholder="Ingresar Proveedor" value="${esc(r.proveedor||'')}">`)}
    <div ${PQ('Quiebre SAP del servicio','fac-span2')}>${fld('Quiebre SAP', `<select id="sv_qb"><option value="">Sin quiebre</option>${(r.name?qbDe(r.name):[]).concat(r.quiebre && !(r.name?qbDe(r.name):[]).some(q=>q.cod===r.quiebre) ? [QB_SAP.find(q=>q.cod===r.quiebre)].filter(Boolean) : []).map(q=>`<option value="${q.cod}" ${q.cod===r.quiebre?'selected':''}>${esc(q.cod+' · '+q.desc)}</option>`).join('')}</select>`)}<div class="fac-sub">Solo quiebres activos asociados al servicio, creados en SAP. Última sincronización: ${QB_SYNC}.</div></div>
    <div class="fac-span2 ag-chks"><label class="fac-chk"><input type="checkbox" id="sv_coord" ${r.coord?'checked':''}> Requiere Coordinación</label><label class="fac-chk"><input type="checkbox" id="sv_val" ${r.validado?'checked':''}> Validado</label><label class="fac-chk"><input type="checkbox" id="sv_cit" ${r.citado?'checked':''}> Citado</label></div>
    ${fld('Comentarios', `<textarea id="sv_ref" rows="3" maxlength="400" placeholder="Ingresar Referencias">${esc(r.ref||'')}</textarea>`, 'fac-span2')}</div>${dl('agProv', proveedores())}
    <div class="fac-btns"><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" onclick="agSvcOk()">Guardar</button></div>`);
};
W.agSvcDel = id => { const v = cur(), r = v.rows.find(x=>x.id===id); if(!r) return;
  confirmar('Confirmación', `¿Estás seguro de que deseas eliminar el servicio ${r.name}?`, ()=>{ v.rows = v.rows.filter(x=>x.id!==id); W.renderVyDetail(); }); };
W.agPvp = function(id){
  const v = cur(), r = v.rows.find(x=>x.id===id), p = pvp(v, r), m = CC.dinero;
  const igv = x => x==null ? null : Math.round(x*0.18*100)/100, tot = x => x==null ? null : Math.round(x*1.18*100)/100;
  const msg = p.st==='MATCH' ? 'Los totales de la PDA y de la provisión coinciden.' : p.st==='MISMATCH' ? `Los totales no coinciden: la provisión difiere de la PDA en +${m(tot(p.prov)-tot(p.rate))} ${p.cur}.` : 'Este servicio aún no tiene una provisión registrada.';
  const fila = (c, a, b, dif) => `<tr class="${dif?'ag-dif':''}"><td>${c}</td><td>${a==null?'—':a}</td><td>${b==null?'—':b}</td></tr>`;
  const pr = p.prov;
  CC.modal(`<h3>PDA vs Provisión</h3><div class="fac-sub">${esc(r.name)}</div>
    <div class="fac-note ${p.st==='MATCH'?'':p.st==='MISMATCH'?'err':'warn'}" style="margin:12px 0">${esc(msg)}</div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Concepto</th><th>PDA</th><th>Provisión</th></tr></thead><tbody>
    ${fila('Unidad', p.unit, pr==null?null:p.unit)}${fila('Cantidad', '1', pr==null?null:'1')}${fila('Tarifa', m(p.rate), pr==null?null:m(pr), pr!=null && pr!==p.rate)}${fila('Moneda', p.cur, pr==null?null:p.cur)}
    ${fila('Cálculo (sin IGV)', m(p.rate), pr==null?null:m(pr), pr!=null && pr!==p.rate)}${fila('IGV', '18 %', pr==null?null:'18 %')}${fila('Total', m(tot(p.rate)), pr==null?null:m(tot(pr)), p.st==='MISMATCH')}</tbody></table></div>
    <div class="fac-note">Cálculo: Tarifa × Cantidad, más IGV.</div>
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`);
  void igv;
};

/* ---------- Pestaña Documentos adjuntos y diálogo de adjuntos ---------- */
function tabDocs(v){
  const ed = editable(v) && !isPend(v), sel1 = Object.values(AG.selDocs).some(Boolean);
  return `${ed?`<div class="fac-btns" style="margin-top:0;justify-content:flex-start"><button type="button" class="cc-btn" onclick="agAdjDlg('')">Subir Archivos</button><button type="button" class="cc-btn pink" ${sel1?'':'disabled'} onclick="agDocsDel()">Eliminar</button></div>`:''}
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th style="width:36px"><input type="checkbox" ${ed?'':'disabled'} onchange="agDocsAll(this.checked)"></th><th>Archivo</th><th>Tipo de Documento</th><th>Fecha</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
    ${v.docs.map(d=>`<tr><td><input type="checkbox" ${ed?'':'disabled'} ${AG.selDocs[d.id]?'checked':''} onchange="agDocsSel('${d.id}',this.checked)"></td><td>${esc(d.name)}</td><td>${esc(d.tipo||'')}</td><td>${fdt(d.ts)}</td><td>${esc(d.user||'Usuario')}</td>
      <td><button type="button" class="ag-ico" title="Descargar" onclick="agDescargar('${esc(d.name).replace(/'/g,'')}')">${ICO.down}</button></td></tr>`).join('') || '<tr><td colspan="6" class="fac-empty">Sin documentos adjuntos.</td></tr>'}</tbody></table></div>`;
}
W.agDocsSel = (id, on) => { AG.selDocs[id] = on; W.renderVyDetail(); };
W.agDocsAll = on => { cur().docs.forEach(d=>AG.selDocs[d.id] = on); W.renderVyDetail(); };
W.agDocsDel = () => confirmar('Confirmación','¿Estás seguro de que deseas eliminar los archivos seleccionados?', ()=>{ const v = cur(); v.docs = v.docs.filter(d=>!AG.selDocs[d.id]); AG.selDocs = {}; W.renderVyDetail(); });
W.agDescargar = n => CC.toast(`Descarga simulada: ${n}`,'info');
const ADJ = {rowId:'', files:[], sel:{}};
W.agAdjDlg = function(rowId){
  const v = cur(); ADJ.rowId = rowId; ADJ.sel = {};
  const r = rowId ? v.rows.find(x=>x.id===rowId) : null, ed = editable(v) && !isPend(v);
  ADJ.files = (r ? r.docs : []).map(d=>({...d}));
  ADJ.ed = ed; adjPinta(r);
};
function adjPinta(r){
  const ed = ADJ.ed, n = ADJ.files.length, tipo = !ADJ.rowId;
  CC.modal(`<div class="fac-head"><div><h3>${ed?'Adjuntar Documentos':'Documentos Adjuntos'}</h3><div class="fac-sub">${n} ${n===1?'archivo':'archivos'}${r?' · '+esc(r.name):''}</div></div>
    <div class="fac-acts">${ed?`<label class="cc-btn ag-file">Subir Archivos<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onchange="agAdjAdd(this)"></label>`:''}<button type="button" class="ag-ico" title="Cerrar" onclick="CC.cerrarModal()">${ICO.x}</button></div></div>
    ${n ? `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th style="width:36px"></th><th>Archivo</th>${tipo?'<th>Tipo de Documento</th>':''}<th>Fecha</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
      ${ADJ.files.map((f,i)=>`<tr><td><input type="checkbox" ${ed?'':'disabled'} ${ADJ.sel[i]?'checked':''} onchange="agAdjSel(${i},this.checked)"></td><td>${esc(f.name)} <small class="ag-mute">${f.size?(f.size/1024).toFixed(0)+' KB':''}</small></td>
        ${tipo?`<td>${ed?sel(VY_DOCT, f.tipo, `onchange="agAdjTipo(${i},this.value)"`, 'Elegir tipo de documento'):esc(f.tipo||'')}</td>`:''}<td>${fdt(f.ts)}</td><td><span class="fac-pill">${esc(f.user||'Usuario')}</span></td>
        <td><button type="button" class="ag-ico" title="Descargar" onclick="agDescargar('archivo')">${ICO.down}</button></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="ag-drop">${ICO.up}<p>Suba archivos PDF e imágenes para comenzar</p>${ed?`<label class="cc-btn ghost ag-file">Seleccione Archivos<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onchange="agAdjAdd(this)"></label>`:''}</div>`}
    ${ed?`<div class="fac-btns"><button type="button" class="cc-btn pink" ${Object.values(ADJ.sel).some(Boolean)?'':'disabled'} onclick="agAdjDel()">Eliminar</button><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" onclick="agAdjOk()">Guardar</button></div>`
       :`<div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`}`, 'md');
}
W.agAdjAdd = function(inp){
  const ok = /\.(pdf|jpe?g|png)$/i, files = [...inp.files]; let omit = false;
  files.forEach(f=>{ if(!ok.test(f.name) || f.size > 10*1024*1024){ omit = true; return; }
    const i = ADJ.files.findIndex(x=>x.name===f.name); const d = {id:'d'+Date.now()+Math.random().toString(36).slice(2,6), name:f.name, size:f.size, ts:now(), user:usr(), tipo:''};
    if(i>-1) ADJ.files[i] = d; else ADJ.files.push(d); });
  if(omit) CC.toast('Algunos archivos fueron omitidos. Solo se permiten archivos PDF e imágenes con tamaño menor a 10 MB.','error');
  adjPinta(ADJ.rowId ? cur().rows.find(x=>x.id===ADJ.rowId) : null);
};
W.agAdjSel = (i, on) => { ADJ.sel[i] = on; adjPinta(ADJ.rowId ? cur().rows.find(x=>x.id===ADJ.rowId) : null); };
W.agAdjTipo = (i, t) => {
  if(t==='Requerimiento de Servicio' && (cur().docs.concat(ADJ.files)).some((f,j)=>f.tipo===t && f!==ADJ.files[i])){ CC.toast('El tipo de documento seleccionado no admite duplicidad.','error'); adjPinta(null); return; }
  ADJ.files[i].tipo = t;
};
W.agAdjDel = () => { ADJ.files = ADJ.files.filter((f,i)=>!ADJ.sel[i]); ADJ.sel = {}; adjPinta(ADJ.rowId ? cur().rows.find(x=>x.id===ADJ.rowId) : null); };
W.agAdjOk = function(){
  if(ADJ.files.some(f=>f.name.length > 80)){ CC.toast('Existen nombres de archivos que contienen más de 80 caracteres.','error'); return; }
  const v = cur();
  if(ADJ.rowId){ const r = v.rows.find(x=>x.id===ADJ.rowId); r.docs = ADJ.files; r.files = ADJ.files.length; }
  else { ADJ.files.forEach(f=>{ const i = v.docs.findIndex(x=>x.name===f.name && x.tipo===f.tipo); if(i>-1) v.docs[i] = f; else v.docs.push(f); }); }
  CC.cerrarModal(); CC.toast('Archivos subidos correctamente','success'); W.renderVyDetail();
};

/* ---------- Editar, Guardar, Cancelar ---------- */
function vySnap(v){ AG.snap = JSON.parse(JSON.stringify(v)); AG.assocTmp = []; }
function vyRestore(){
  const v = cur(); if(!v || !AG.snap) return;
  Object.keys(v).forEach(k=>delete v[k]); Object.assign(v, AG.snap); AG.snap = null;
  AG.assocTmp.forEach(c=>{ if(PDA_ASSOC[c]===v.code) delete PDA_ASSOC[c]; }); AG.assocTmp = [];
}
W.agVyEditar = () => { const v = cur(); vySnap(v); AG.mode = 'edit'; W.renderVyDetail(); };
/* Asociar PDA (Connect): carga los servicios y deja el viaje en modo Editar; se confirma con Guardar */
W.agVyAntesAsociar = code => { const v = cur(); if(AG.mode==='view'){ vySnap(v); AG.mode = 'edit'; } AG.assocTmp.push(code); };
W.agVyCancelar = function(){
  if(AG.mode==='new'){ AG.nuevo = null; AG.mode = 'view'; W.showVyView('list'); W.renderVyList(); return; }
  vyRestore(); AG.mode = 'view'; W.renderVyDetail();
};
function vyValidar(v){
  const T = v.t, req = ['nro','nave','armador','cliente','eta','etd','tipo','tipoAg','tipoOp','lugar','carga','origenPto','origenFecha','puerto','ultPto','ultFecha'];
  if(v.lugar!=='Bahía') req.push('terminal');
  if(/Marítimo|Documentario/.test(v.tipoAg)) req.push('agente');
  if(req.some(k=>!String(v[k]||'').trim())) return 'Por favor complete todos los campos obligatorios';
  if(T.iniOp && T.finOp && T.iniOp > T.finOp) return 'La fecha Inicio Operaciones debe ser menor a la fecha Fin Operaciones';
  if(T.finEmbOk && !T.finEmb) return 'Debe ingresar la fecha Fin Embarque antes de confirmar el Fin de Embarque';
  if(v.etd < v.eta) return 'El valor de ETD debe ser posterior a la ETA';
  if(v.origenFecha >= v.eta) return 'La fecha de zarpe del Puerto de Origen debe ser anterior a la ETA.';
  if(v.ultFecha >= v.eta) return 'La fecha de zarpe del último Puerto Extranjero debe ser anterior a la ETA.';
  if(T.ata && T.ata < v.eta) return 'El valor de ATA debe ser posterior a la ETA';
  if(T.atd && T.ata && T.atd < T.ata) return 'El valor de ATD debe ser posterior a la ATA';
  if(T.atb && T.ata && T.atb < T.ata) return 'El valor de ATB debe ser posterior a la ATA';
  if(T.iniOp && T.ata && T.iniOp < T.ata) return 'El valor de Inicio de Operaciones debe ser posterior a la ATA';
  if(T.finDesc && T.atb && T.finDesc < T.atb) return 'El valor de Fin Descarga debe ser posterior al ATB';
  if(v.due && !/^[A-Z]{3}-20\d{2}-\d{6}$/.test(v.due)) return 'El número de DUE debe tener el formato PPP-YYYY-NNNNNN y no exceder 15 caracteres.';
  const al = v.alias.map(a=>norm(a.alias)), alL = v.alias.map(a=>norm(a.linea)+'|'+norm(a.alias));
  if(v.alias.some(a=>!a.linea || !a.alias)) return 'Por favor complete todos los campos obligatorios';
  if(new Set(alL).size < alL.length) return 'Se cuenta con la misma combinación de Línea Naviera y Alias';
  if(new Set(al).size < al.length) return 'Se cuenta con el mismo Alias asignado';
  if(VY_CATS.some(c=>v.ev[c].some(e=>!e.ev || !e.ts))) return 'Se cuentan con Eventos incompletos';
  if(v.tugs.some(t=>!t.act || !t.tug || !t.muelle)) return 'Se cuentan con Remolcadores incompletos';
  if(v.pilots.some(t=>!t.act || !t.name)) return 'Se cuentan con Prácticos incompletos';
  const sinVal = v.rows.filter(r=>(r.ini||r.fin) && !r.validado), sinProv = v.rows.filter(r=>r.validado && !r.proveedor);
  if(sinVal.length) return 'Los siguientes servicios operativos no están validados:\n' + sinVal.map(r=>'- '+r.name).join('\n') + '.';
  if(sinProv.length) return 'Los siguientes servicios están validados sin proveedor:\n' + sinProv.map(r=>'- '+r.name).join('\n') + '.';
  if(VOYAGES.some(x=>x!==v && x.code!==v.code && norm(x.nave)===norm(v.nave) && norm(x.nro)===norm(v.nro) && norm(x.puerto)===norm(v.puerto) && !anulado(x)))
    return `Ya se cuenta con un viaje con "Nave": ${v.nave}, "Nro Viaje": ${v.nro} y "Puerto de Operación": ${v.puerto}.`;
  return '';
}
W.agVyGuardar = function(){
  const v = cur(), e = vyValidar(v);
  if(e){ CC.toast(e,'error'); return; }
  v.rows.forEach(r=>delete r.nuevo);
  if(AG.mode==='new'){
    const n = Math.max(...VOYAGES.map(x=>+String(x.code).slice(3)||0), 127) + 1;
    v.code = 'VOY'+String(n).padStart(7,'0'); v.estado = 'Creado';
    v.hist.push({ts:now(), user:usr(), prev:'', next:'Creado', comment: v.desdePda ? `Viaje creado en base al PDA ${v.desdePda}` : 'Viaje creado.'});
    if(v.desdePda) PDA_ASSOC[v.desdePda] = v.code;
    VOYAGES.push(v); vy.selId = v.code; AG.nuevo = null; AG.mode = 'view';
    W.log && W.log('Viaje', `Creó el viaje ${v.code}`);
    CC.toast('Viaje creado exitosamente.','success'); W.showVyView('detail'); W.renderVyDetail(); return;
  }
  v.hist.push({ts:now(), user:usr(), prev:v.estado, next:v.estado, comment:'Viaje modificado.'});
  AG.mode = 'view'; AG.snap = null; AG.assocTmp = [];
  CC.toast('Viaje modificado exitosamente.','success'); W.renderVyDetail();
};

/* ---------- Anular Viaje ---------- */
W.agVyAnular = function(){
  CC.modal(`<h3>Anular Viaje</h3><p class="ag-msg">Favor de ingresar la razón para anular este viaje:</p>
    <div class="fac-f"><textarea id="anTxt" rows="4" oninput="document.getElementById('anOk').disabled=!this.value.trim()"></textarea></div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn pink" id="anOk" disabled onclick="agVyAnularOk()">Aceptar</button></div>`);
  setTimeout(()=>$('anTxt')?.focus(), 40);
};
W.agVyAnularOk = function(){
  const v = cur(), txt = $('anTxt').value.trim(); if(!txt) return;
  if(vyBls(v).length){ CC.cerrarModal(); CC.toast('No se puede anular el viaje, tiene registros BL activos asociados.','error'); return; }
  const prev = v.estado; v.estado = 'Anulado'; v.motivoAn = txt;
  v.hist.push({ts:now(), user:usr(), prev, next:'Anulado', comment:txt});
  Object.keys(PDA_ASSOC).forEach(c=>{ if(PDA_ASSOC[c]===v.code) delete PDA_ASSOC[c]; });   // libera la PDA asociada
  CC.cerrarModal(); CC.toast('Viaje modificado exitosamente.','success'); W.renderVyDetail();
};

/* ---------- Enviar Email ---------- */
W.agVyEmail = function(){
  CC.modal(`<h3>Enviar Email</h3><p class="ag-msg">Favor de elegir la plantilla de correo a enviar</p>
    <div class="fac-f">${sel(VY_PLANT, '', 'id="emTpl" onchange="document.getElementById(\'emOk\').disabled=!this.value"', 'Elegir Plantilla de Email')}</div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn pink" id="emOk" disabled onclick="agVyEmailOk()">Enviar Email</button></div>`);
};
W.agVyEmailOk = function(){
  const v = cur(), tpl = $('emTpl').value; if(!tpl) return;
  if(tpl==='Service Requirement'){
    if(!v.rows.some(r=>r.ini)){ CC.toast('Es necesario al menos un servicio ejecutado para enviar el requerimiento de servicio.','error'); return; }
    if(!v.t.ata || !v.t.atd){ CC.toast('Para enviar el requerimiento de servicio el viaje debe contar con ATA y ATD registrados.','error'); return; }
    v.hist.push({ts:now(), user:usr(), prev:v.estado, next:v.estado, comment:'Service Requirement enviado a liquidaciones@cosmos.example.'});
  } else {
    const falta = [!v.capitan && 'Nombre Capitán', !v.capEmail && 'Email Capitán'].filter(Boolean);
    if(falta.length){ CC.toast(`No se cuenta con los siguientes campos: ${falta.join(', ')}`,'error'); return; }
    v.hist.push({ts:now(), user:usr(), prev:v.estado, next:v.estado, comment:`Correo de ${tpl} enviado a ${v.capitan} (${v.capEmail}).`});
  }
  v.mails[tpl] = true; CC.cerrarModal(); CC.toast('Correo enviado exitosamente. (Envío simulado)','success'); W.renderVyDetail();
};

/* ---------- Historial del viaje, Errores SUNAT, Validaciones SUNAT ---------- */
W.agVyHist = function(){
  const v = cur();
  CC.modal(`<h3>Historial</h3><div style="height:10px"></div><div class="fac-scroll"><table class="fac-tbl fac-fix"><thead><tr><th>Estado Previo</th><th>Estado Actual</th><th>Fecha</th><th>Comentario</th><th></th></tr></thead><tbody>
    ${v.hist.map((h,i)=>`<tr><td>${esc(h.prev||'')}</td><td>${esc(h.next||'')}${h.next==='ERROR' && h.sunat ? ` <button type="button" class="ag-ico err" title="Ver detalle de error SUNAT" onclick="agSunErr(${i})">${ICO.warn}</button>` : ''}</td>
      <td>${fdt(h.ts)}</td><td class="fac-expand" style="white-space:normal">${esc(h.comment||'')}</td>
      <td>${h.sunat || /SUNAT/.test(h.comment||'') ? `<button type="button" class="ag-ico" title="Ver línea de tiempo de auditoría" onclick="CC.toast('Línea de tiempo de auditoría: fuera del alcance del prototipo','info')">${ICO.hist}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="fac-empty">Sin movimientos registrados.</td></tr>'}
    </tbody></table></div><div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'lg');
};
W.agSunErr = function(i){
  const v = cur(), h = v.hist[i], L = (h.sunat && h.sunat.errores) || [];
  CC.modal(`<h3>Errores SUNAT · ${esc(v.nro||'')}</h3><div style="height:10px"></div>
    ${L.length ? `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Código</th><th>Descripción</th></tr></thead><tbody>${L.map(([c,d])=>`<tr><td>${esc(c||'—')}</td><td style="white-space:normal">${esc(d||'—')}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="fac-empty">No se encontraron errores SUNAT para esta transmisión.</div>'}
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="agVyHist()">Volver al historial</button><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md');
};
function sunatValid(L){
  CC.modal(`<h3>Validaciones para transmisión a SUNAT</h3><div class="fac-sub">Antes de transmitir a SUNAT, completa los siguientes datos obligatorios en el sistema.</div><div style="height:10px"></div>
    ${L.length ? `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Nombre del Campo</th><th>Ruta XML</th></tr></thead><tbody>${L.map(([n,x])=>`<tr><td>${esc(n)}</td><td class="mono">${esc(x)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="fac-empty">No se encontraron validaciones pendientes.</div>'}
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md');
}

/* ---------- Envíos a SUNAT (simulados: aviso al enviar y respuesta a los segundos) ---------- */
function faltantes(v, tipo){
  const L = [];
  if(!v.due) L.push(['Due','/Manifest/cac:AdditionalDocumentReference/cbc:ID']);
  if(!v.origenPto) L.push(['Puerto de Origen','/Manifest/cac:ShipmentStage/cac:LoadingPortLocation/cbc:ID']);
  if(!v.ultPto) L.push(['Último Puerto Extranjero','/Manifest/cac:ShipmentStage/cac:LastPortLocation/cbc:ID']);
  if(!v.capitan) L.push(['Nombre Capitán','/Manifest/cac:TransportMeans/cac:MasterPerson/cbc:Name']);
  if(tipo==='0151' && !v.etd) L.push(['ETD','/Manifest/cac:ShipmentStage/cbc:EstimatedDepartureDate']);
  return L;
}
function respuesta(v, ms, fn){ const id = setTimeout(()=>{ fn(); if(vy.view==='detail' && cur()===v) W.renderVyDetail(); }, ms); AG.timers.push(id); }
const nroManif = (t, v) => `${t}-${(PORTS.find(p=>p.k===v.puerto)||{code:'PECLL'}).code==='PECLL'?'118':'046'}-${new Date().getFullYear()}-1-${String(Math.floor(1000+Math.random()*8999))}`;
W.agSun = function(tipo){
  const v = cur(), s = v.sun;
  if(s.sending){ CC.toast('Ya existe una transmisión SUNAT en curso para este viaje. Espere unos segundos antes de reintentar.','error'); return; }
  if(tipo==='0101'){
    if(!agenteOk(v)){ CC.toast('El Agente Marítimo debe coincidir con la organización de la sucursal activa.','error'); return; }
    if(s.p0101){ CC.toast('Solicitud de manifiesto en curso (Pendiente). Espere la respuesta de SUNAT.','info'); return; }
    if(v.manif){ CC.toast('Este viaje ya tiene un número de manifiesto generado para esta transmisión.','error'); return; }
    const L = faltantes(v, tipo); if(L.length){ sunatValid(L); return; }
    s.p0101 = true; v.hist.push({ts:now(), user:usr(), prev:v.estado, next:'Pendiente', comment:'Solicitud de numeración de manifiesto 0101 enviada a SUNAT. En espera de la respuesta.', sunat:{}});
    CC.toast('Solicitud de número de manifiesto enviada a SUNAT. El número aparecerá en el viaje y en su historial en unos minutos.','success'); W.renderVyDetail();
    respuesta(v, 2500, ()=>{ s.p0101 = false; v.manif = nroManif('01', v); v.hist.push({ts:now(), user:'SUNAT', prev:'Pendiente', next:'Aceptado', comment:`Manifiesto generado correctamente. Nro: ${v.manif}`, sunat:{}}); CC.toast(`Manifiesto generado correctamente. Nro: ${v.manif}`,'success'); });
    return;
  }
  if(tipo==='0151'){
    if(!agenteOk(v)){ CC.toast('El Agente Marítimo debe coincidir con la organización de la sucursal activa.','error'); return; }
    if(s.p0151){ CC.toast('Ya existe una transmisión del manifiesto de salida en curso. Espere a que SUNAT responda antes de reintentar.','info'); return; }
    const L = faltantes(v, tipo); if(L.length){ sunatValid(L); return; }
    const go = () => { s.p0151 = true; v.hist.push({ts:now(), user:usr(), prev:v.estado, next:'Pendiente', comment:'Transmisión del manifiesto de salida 0151 enviada a SUNAT. En espera de la respuesta.', sunat:{}});
      CC.toast('Se generó correctamente el número de manifiesto de salida.','success'); W.renderVyDetail();
      respuesta(v, 2500, ()=>{ s.p0151 = false; v.manifSal = nroManif('02', v); v.hist.push({ts:now(), user:'SUNAT', prev:'Pendiente', next:'Aceptado', comment:`Se generó correctamente el número de manifiesto de salida. Nro: ${v.manifSal}`, sunat:{}}); CC.toast(`Se generó correctamente el número de manifiesto de salida. Nro: ${v.manifSal}`,'success'); }); };
    if(!vyBls(v).length) confirmar('Viaje sin BLs','El viaje no tiene BLs registrados. Se transmitirá el manifiesto de salida sin carga. ¿Desea continuar?', go); else go();
    return;
  }
  if(tipo==='0117'){
    if(s.t0117){ CC.toast('El aviso de arribo (0117) de este viaje ya fue transmitido o está en proceso. SUNAT acepta un solo aviso por llegada.','error'); return; }
    const bah = v.lugar==='Bahía', lbl = bah ? 'ATA (fondeo)' : 'ATB', f = bah ? v.t.ata : v.t.atb;
    const msg = v.t.noDesc ? `Se enviará a SUNAT el aviso de arribo con ${lbl} ${fdt(f)||'-'} SIN solicitud de autorización de descarga. Después no se podrá transmitir el término de descarga (0119). ¿Continuar?`
      : `Se enviará a SUNAT el aviso de arribo con ${lbl} ${fdt(f)||'-'} y con solicitud de autorización de descarga. SUNAT acepta un solo aviso por llegada. ¿Continuar?`;
    confirmar('Transmitir aviso de arribo (0117)', msg, ()=>{
      if(!v.t.ata){ CC.toast('No se puede transmitir a SUNAT: falta registrar el ATA (llegada real) en Tiempos de arribo y zarpe.','error'); return; }
      if(!bah && !v.t.atb){ CC.toast('No se puede transmitir a SUNAT: falta registrar el ATB (atraque real) en Tiempos de arribo y zarpe.','error'); return; }
      if(!bah && v.t.atb < v.t.ata){ CC.toast('No se puede transmitir a SUNAT: el ATB (atraque real) es anterior al ATA (llegada real). Corrija las fechas en Tiempos de arribo y zarpe.','error'); return; }
      s.sending = '0117'; W.renderVyDetail();
      respuesta(v, 1200, ()=>{ s.sending = ''; s.t0117 = true; v.hist.push({ts:now(), user:usr(), prev:v.estado, next:'Pendiente', comment:'Aviso de arribo 0117 enviado a SUNAT. En espera de la respuesta.', sunat:{}});
        CC.toast('Aviso de arribo enviado a SUNAT. La respuesta aparecerá en el historial del viaje en unos minutos.','success');
        respuesta(v, 2500, ()=>v.hist.push({ts:now(), user:'SUNAT', prev:'Pendiente', next:'Aceptado', comment:'Respuesta de SUNAT: aviso de arribo 0117 aceptado.', sunat:{}})); });
    });
    return;
  }
  if(tipo==='0119'){
    if(v.t.noDesc){ CC.toast('El viaje está marcado como «No tiene descarga»: no corresponde transmitir el término de descarga.','error'); return; }
    if(!v.t.finDesc){ CC.toast('No se puede transmitir el término de descarga: registre la fecha de Fin de descarga en Tiempos de arribo y zarpe.','error'); return; }
    if(!s.t0117){ CC.toast('No se puede transmitir el término de descarga sin el aviso de arribo con autorización de descarga.','error'); return; }
    confirmar('Transmitir término de descarga (0119)', `Se enviará a SUNAT el término de descarga con fecha ${fdt(v.t.finDesc)}. SUNAT acepta un solo término de descarga por llegada. ¿Continuar?`, ()=>{
      s.sending = '0119'; W.renderVyDetail();
      respuesta(v, 1200, ()=>{ s.sending = ''; s.t0119 = true; v.hist.push({ts:now(), user:usr(), prev:v.estado, next:'Pendiente', comment:'Término de descarga 0119 enviado a SUNAT. En espera de la respuesta.', sunat:{}});
        CC.toast('Término de descarga enviado a SUNAT. La respuesta aparecerá en el historial del viaje en unos minutos.','success'); });
    });
  }
};
/* Ingresar Número de Manifiesto (01 entrada / 02 salida) */
W.agManifDlg = function(t){
  const s = t==='02';
  CC.modal(`<h3>${s?'Ingresar Número de Manifiesto de Salida':'Ingresar Número de Manifiesto'}</h3>
    <p class="ag-msg">${s?'Por favor, ingrese el número de manifiesto de salida asignado por la autoridad portuaria.':'Por favor, ingrese el número de manifiesto asignado por la autoridad portuaria.'}</p>
    ${fld(s?'Número manifiesto salida':'Número de Manifiesto', `<input id="mnTxt" maxlength="19" placeholder="${s?'Ingrese el número de manifiesto de salida':'Ingrese el número de manifiesto'}" oninput="agManifChk('${t}',this)">`)}
    <div class="f-err" id="mnErr" style="display:none">El formato del número de manifiesto es inválido</div>
    <div class="fac-note"><b>Estructura del número de manifiesto</b><br>Formato: ${t}-DDD-YYYY-1-XXXX<ul class="ag-ul"><li>Tipo de documento (${t})</li><li>Código del puerto (DDD)</li><li>Año (YYYY)</li><li>Régimen (1)</li><li>Número correlativo del manifiesto (XXXX)</li></ul></div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn pink" id="mnOk" disabled onclick="agManifOk('${t}')">Guardar</button></div>`);
};
W.agManifChk = (t, el) => { el.value = el.value.replace(/[^\d-]/g,''); const ok = new RegExp(`^${t}-\\d{3}-\\d{4}-\\d-\\d{4}$`).test(el.value); $('mnErr').style.display = el.value && !ok ? '' : 'none'; $('mnOk').disabled = !ok; };
W.agManifOk = function(t){
  const v = cur(), n = $('mnTxt').value;
  if(VOYAGES.some(x=>x!==v && (x.manif===n || x.manifSal===n))){ CC.toast(`El Nro. de Manifiesto ${n} ya está asignado a otro viaje.`,'error'); return; }
  CC.cerrarModal();
  if(t==='01'){ v.manif = n; v.hist.push({ts:now(), user:usr(), prev:v.estado, next:v.estado, comment:`Se ingresó nro. manifiesto ${n}`, sunat:{}}); CC.toast(`Manifiesto generado correctamente. Nro: ${n}`,'success'); }
  else { v.manifSal = n; v.hist.push({ts:now(), user:usr(), prev:v.estado, next:v.estado, comment:`Se ingresó nro. manifiesto de salida ${n}`, sunat:{}}); CC.toast(`Se generó correctamente el número de manifiesto de salida. Nro: ${n}`,'success'); }
  W.renderVyDetail();
};
/* I-021 · HU-OPS-01: Rectificar (0102) o Anular (0103) el número de manifiesto. Propuesta: contrato SUNAT por aprobar (PEN-I021-01/02). */
W.agMfDlg = function(){
  const v = cur(); if(!v || !v.manif) return;
  const nb = vyBls(v).length;
  W.agMfChk = () => { $('mfOk').disabled = !D.querySelector('input[name="mfAcc"]:checked') || !$('mfMot').value.trim();
    const an = (D.querySelector('input[name="mfAcc"]:checked')||{}).value==='0103'; $('mfAvisoBl').style.display = an && nb ? '' : 'none'; };
  CC.modal(`<h3>Rectificar o Anular Manifiesto</h3><div class="fac-sub">Número de Manifiesto: ${esc(v.manif)}</div><div style="height:10px"></div>
    <div class="fac-radio" id="mfAcc"><label><input type="radio" name="mfAcc" value="0102" onchange="agMfChk()"> Rectificar (0102): retransmite a SUNAT los datos actuales del viaje con el mismo número.</label>
      <label><input type="radio" name="mfAcc" value="0103" onchange="agMfChk()"> Anular (0103): deja sin efecto el número. El viaje podrá solicitar o ingresar uno nuevo.</label></div>
    <div class="fac-note warn" id="mfAvisoBl" style="display:none">El viaje tiene ${nb} BL. Al anular el manifiesto, esos BL quedan sin número de manifiesto hasta generar uno nuevo.</div>
    ${fld('Motivo *', `<textarea id="mfMot" rows="4" maxlength="800" placeholder="Ingrese el motivo" oninput="agMfChk()"></textarea>`)}
    <div class="fac-note">Si SUNAT rechaza la transmisión, el viaje conserva el número original y el error queda en el historial.</div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="mfOk" disabled onclick="agMfOk()">Transmitir a SUNAT</button></div>`);
};
W.agMfOk = function(){
  const v = cur(), s = v.sun, tr = (D.querySelector('input[name="mfAcc"]:checked')||{}).value, mot = $('mfMot').value.trim();
  if(!tr || !mot){ CC.toast('Seleccione la acción e ingrese el motivo','error'); return; }
  const L = faltantes(v, '0101'); if(L.length){ sunatValid(L); return; }
  const n = v.manif, an = tr==='0103', acc = an ? 'Anulación' : 'Rectificación';
  s['p'+tr] = true; CC.cerrarModal();
  v.hist.push({ts:now(), user:usr(), prev:v.estado, next:'Pendiente', comment:`${acc} del manifiesto ${n} (${tr}) enviada a SUNAT. Motivo: ${mot}`, sunat:{}});
  CC.toast(`${acc} del manifiesto enviada a SUNAT. La respuesta aparecerá en el historial del viaje en unos minutos.`,'success'); W.renderVyDetail();
  respuesta(v, 2500, ()=>{ s['p'+tr] = false;
    if(an){ v.manifAnulados = (v.manifAnulados||[]).concat([n]); v.manif = ''; }
    v.hist.push({ts:now(), user:'SUNAT', prev:'Pendiente', next:'Aceptado', comment:`Respuesta de SUNAT: ${acc.toLowerCase()} del manifiesto ${n} (${tr}) aceptada.${an?' El viaje queda sin número de manifiesto.':''}`, sunat:{}}); });
};

/* I-036 · HU-DOC-02: alta rápida de socio desde el campo Armador (mínimos del área para Viaje) */
const SQ_PAISES = ['Perú','Chile','Colombia','Ecuador','México','Panamá','Estados Unidos','China','Dinamarca','Alemania'];
W.agSocioDlg = function(){
  W.agSqTipo = t => { $('sqDocL').textContent = t==='RUC' ? 'Número de documento *' : 'Número de documento'; if(t==='RUC') $('sqPais').value = 'Perú'; };
  CC.modal(`<h3>Crear Socio</h3><div class="fac-sub">Alta rápida sin salir del viaje. El socio queda Pendiente de aprobación y se completa después en Data Maestra.</div>
    <div class="fac-g2" style="margin-top:12px">
    ${fld('Tipo de documento *', sel(['RUC','Documento extranjero'], 'RUC', 'id="sqTipo" onchange="agSqTipo(this.value)"', null))}
    <div class="fac-f"><label id="sqDocL">Número de documento *</label><input id="sqDoc" maxlength="20" placeholder="Ingresar Número de documento"></div>
    ${fld('Razón social *', '<input id="sqRazon" maxlength="200" placeholder="Ingresar Razón social">', 'fac-span2')}
    ${fld('Dirección *', '<input id="sqDir" maxlength="200" placeholder="Ingresar Dirección">', 'fac-span2')}
    ${fld('País *', sel(SQ_PAISES, 'Perú', 'id="sqPais"', null))}
    ${CC.campoLectura('Rol', 'Armador')}</div>
    <div id="sqDup"></div>
    <div class="fac-btns"><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="sqOk" onclick="agSocioOk()">Guardar</button></div>`);
};
function sqElegir(v, nombre){ v.armador = nombre; if(vy.errs) delete vy.errs.armador; CC.cerrarModal(); W.renderVyDetail(); }
W.agSocioUsar = nombre => { const v = cur(), s = sqDe(nombre); if(s && !s.roles.includes('Armador')) s.roles.push('Armador');
  sqElegir(v, nombre); CC.toast(`Se seleccionó el socio existente ${nombre} como Armador.`,'success'); };
W.agSocioOk = function(){
  const v = cur(), g = id => ($(id).value||'').trim(), tipo = g('sqTipo'), doc = g('sqDoc'), razon = g('sqRazon').toUpperCase(), dir = g('sqDir'), pais = g('sqPais');
  if(!razon || !dir || !pais || (tipo==='RUC' && !doc)){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(tipo==='RUC' && !/^\d{11}$/.test(doc)){ CC.toast('El RUC debe tener 11 dígitos','error'); return; }
  const otros = [...CC.datos.socios.clientes, ...CC.datos.socios.embarcadores, ...CC.datos.socios.consignatarios, ...CC.datos.socios.proveedores].map(s=>({razonSocial:s.razonSocial, ruc:s.ruc}));
  const dup = [...SQ, ...otros, ...armadores().map(n=>({razonSocial:n}))].find(s=>norm(s.razonSocial)===norm(razon) || (doc && s.ruc && s.ruc===doc));
  if(dup){ $('sqDup').innerHTML = `<div class="fac-note warn">Ya existe el socio <b>${esc(dup.razonSocial)}</b>${dup.ruc?` (${esc(dup.ruc)})`:''}. Para no duplicarlo, use el existente: se le agrega el rol Armador si no lo tiene.
      <div class="fac-btns"><button type="button" class="cc-btn" id="sqUsar" onclick="agSocioUsar(this.dataset.n)" data-n="${esc(dup.razonSocial)}">Usar socio existente</button></div></div>`; return; }
  SQ.push({id:'SQ'+Date.now(), tipoDoc:tipo, ruc:doc, razonSocial:razon, direccion:dir, pais, roles:['Armador'], estado:'Pendiente de aprobación', creadoPor:usr(), fecha:now(), origen:`Viaje ${v.code||'(nuevo)'}`});
  sqElegir(v, razon); CC.toast(`Socio ${razon} creado en estado Pendiente de aprobación y seleccionado como Armador.`,'success');
};

/* Editar dato transmitido a SUNAT (ATA, ATB, Fin Descarga) */
W.agSunEdit = function(k){
  const v = cur(), lbl = T_LBL[k];
  CC.modal(`<h3>Editar ${lbl}</h3><p class="ag-msg">Este dato ya se transmitió a SUNAT. El cambio queda en Connect y en el historial del viaje; la corrección en SUNAT se hace en el SDA.</p>
    <div class="fac-g2">${CC.campoLectura('Valor actual', fdt(v.t[k])||'-')}${fld('Nuevo valor *', `<input type="datetime-local" id="seVal" value="${esc(v.t[k]||'')}" oninput="agSunEditChk()">`)}
    ${fld('Motivo *', `<textarea id="seMot" rows="3" maxlength="500" placeholder="Indique por qué se corrige" oninput="agSunEditChk()"></textarea>`, 'fac-span2')}</div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="seOk" disabled onclick="agSunEditOk('${k}')">Guardar</button></div>`);
};
W.agSunEditChk = () => { $('seOk').disabled = !($('seVal').value && $('seMot').value.trim()); };
W.agSunEditOk = function(k){
  const v = cur(), val = $('seVal').value, mot = $('seMot').value.trim(), lbl = T_LBL[k], T = {...v.t, [k]:val};
  if((k==='ata' && (val < v.eta || (T.atb && val > T.atb) || (T.iniOp && val > T.iniOp) || (T.atd && val > T.atd))) || (k==='atb' && T.ata && val < T.ata) || (k==='finDesc' && T.atb && val < T.atb)){
    CC.toast('La fecha no respeta el orden de la escala: el ATA no puede ser anterior al ETA ni posterior al ATB, al Inicio de operaciones o al ATD, y el Fin de descarga no puede ser anterior al ATB.','error'); return; }
  const prev = fdt(v.t[k]) || '-'; v.t[k] = val;
  v.hist.push({ts:now(), user:usr(), prev:v.estado, next:v.estado, comment:`${lbl} corregido de ${prev} a ${fdt(val)}. Motivo: ${mot}`});
  CC.cerrarModal(); CC.toast(`${lbl} corregido. El cambio quedó en el historial del viaje.`,'success'); W.renderVyDetail();
};
/* Estadías en muelle */
let BER = [];
W.agVyMuelles = function(){ BER = cur().berths.map(b=>({...b})); AG.selBer = {}; berPinta(); };
function berPinta(){
  const v = cur(), bad = b => b.salida && b.entrada && b.salida < b.entrada;
  CC.modal(`<h3>Estadías en muelle</h3><div class="fac-btns" style="justify-content:flex-start"><button type="button" class="cc-btn ghost" onclick="agBerAdd()">+ Agregar</button><button type="button" class="cc-btn pink" ${Object.values(AG.selBer).some(Boolean)?'':'disabled'} onclick="agBerDel()">Eliminar</button></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Muelle *</th><th>Entrada *</th><th>Salida</th></tr></thead><tbody>
    ${BER.map((b,i)=>`<tr><td><input type="checkbox" ${AG.selBer[i]?'checked':''} onchange="agBerSel(${i},this.checked)"></td><td>${sel(muelles(v.terminal), b.muelle, `onchange="agBerSet(${i},'muelle',this.value)"`, 'Elegir Muelle')}</td>
      <td><input type="datetime-local" style="width:200px" value="${esc(b.entrada||'')}" onchange="agBerSet(${i},'entrada',this.value)"></td><td><input type="datetime-local" style="width:200px" value="${esc(b.salida||'')}" onchange="agBerSet(${i},'salida',this.value)">${bad(b)?'<div class="f-err">La salida no puede ser anterior a la entrada.</div>':''}</td></tr>`).join('') || '<tr><td colspan="4" class="fac-empty">Sin estadías registradas.</td></tr>'}
    </tbody></table></div>
    <div class="fac-btns"><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" ${BER.some(b=>bad(b)||!b.muelle||!b.entrada)?'disabled':''} onclick="agBerOk()">Guardar</button></div>`, 'md');
}
W.agBerAdd = () => { BER.push({muelle:'', entrada:'', salida:''}); berPinta(); };
W.agBerSel = (i, on) => { AG.selBer[i] = on; berPinta(); };
W.agBerDel = () => { BER = BER.filter((b,i)=>!AG.selBer[i]); AG.selBer = {}; berPinta(); };
W.agBerSet = (i, k, val) => { BER[i][k] = val; berPinta(); };
W.agBerOk = () => { cur().berths = BER; CC.cerrarModal(); CC.toast('Estadías en muelle guardadas.','success'); };

/* Guía del globo de ayuda (pantalla propia) */
const gq = s => D.querySelector(s), gqt = (s, t) => [...D.querySelectorAll(s)].find(e=>e.textContent.trim()===t);
GUIDES.screenVoyages = [
  {t:'Buscar un viaje', steps:[
    {go:()=>{ if(vy.view!=='list') W.backToVyList(); }, el:'#vyFilters', h:'Buscar Viaje', p:'Llene al menos un filtro y pulse Buscar.'},
    {el:()=>gq('#vyRes') || gq('#vyFilters .fac-btns'), h:'Resultados', p:'Clic en el Código de Viaje para abrirlo.'}]},
  {t:'Crear un viaje', need:()=>canV(), steps:[
    {go:()=>{ if(vy.view!=='list') W.backToVyList(); }, el:'#vyNewBtn', h:'+ Nuevo', p:'En blanco o desde una PDA aprobada.'}]},
  {t:'Asociar una PDA al viaje', steps:[
    {go:()=>{ const v = VOYAGES.find(x=>x.estado==='Creado'); if(v) W.selectVoyage(v.code); }, el:'#vyAssocBtn', h:'Asociar PDA', p:'Busca las PDA aprobadas de este viaje. Luego pulse Guardar.'}]},
  {t:'Homologar un viaje', need:()=>W.canEditVessel(), steps:[
    {go:()=>{ const v = VOYAGES.find(x=>x.estado==='Por homologar'); if(v) W.selectVoyage(v.code); }, el:()=>gq('#vyEditor .md-body'), h:'Completar datos', p:'Propuesta: el viaje preregistrado desde la PDA se homologa antes de asociar.'},
    {el:()=>gqt('#vyEditor button','Homologar'), h:'Homologar', p:'Recién homologado se puede asociar la PDA aprobada.'}]}
];

/* =====================================================================
   ITINERARIO · Agenciamiento > Itinerario (Importar Itinerario)
===================================================================== */
const IT = {linea:'', servicio:'', files:[], sel:{}, res:[], page:1, size:10, busy:false};
const IT_SERV = ['Colibri','Albatross'];
function itHtml(){
  const any = IT.linea || IT.servicio;
  let h = `<div class="fac-card" id="itForm"><div class="fac-head"><h3>Importar Itinerario</h3></div>
    <div class="fac-g3">${fld('Línea *', `<input id="itLinea" list="itLineas" placeholder="Seleccione una línea" value="${esc(IT.linea)}" onchange="agItSet('linea',this)">`)}
      ${fld('Servicio *', `<input id="itServ" list="itServs" placeholder="Seleccione un servicio" value="${esc(IT.servicio)}" onchange="agItSet('servicio',this)">`)}</div>
    ${dl('itLineas',['ZIM'])}${dl('itServs',IT_SERV)}
    <div class="fac-btns"><button type="button" class="cc-btn" ${any && !IT.busy?'':'disabled'} onclick="agItCargar()">Cargar archivo</button><button type="button" class="cc-btn ghost" ${any?'':'disabled'} onclick="agItLimpiar()">Limpiar</button></div></div>`;
  if(IT.res.length){
    const pg = CC.paginar(IT.res, IT.page, IT.size);
    h += `<div class="fac-card" id="itRes"><div class="fac-head"><h3>Resultados (${IT.res.length})</h3></div><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Código de viaje</th><th>Número de viaje</th><th>Nave</th><th>Puerto de origen</th><th>Puerto de operación</th><th>Último puerto</th><th>Puerto de destino</th><th>ETA</th><th>ETD</th><th>Estado</th><th>Comentarios</th></tr></thead><tbody>
      ${pg.filas.map(r=>`<tr><td>${r.code?`<a href="#" class="pda-code-link" onclick="agItAbrir('${r.code}');return false">${r.code}</a>`:''}</td><td>${esc(r.nro)}</td><td>${esc(r.nave)}</td><td>${esc(r.origen)}</td><td>${esc(r.puerto)}</td><td>${esc(r.ult)}</td><td>${esc(r.destino)}</td>
        <td>${fdt(r.eta)}</td><td>${fdt(r.etd)}</td><td>${CC.chipEstado(r.estado, r.estado==='Creado'?'aprobada':'rechazada')}</td><td style="white-space:normal">${esc(r.obs||'')}</td></tr>`).join('')}</tbody></table></div>
      <div class="fac-btns" style="justify-content:flex-end">${pager(IT.res.length, pg.pagina, IT.size, 'agItPag')}</div></div>`;
  }
  return `<div class="fac-zone">${h}</div>`;
}
W.agItSet = (k, el) => { const ok = k==='linea' ? ['ZIM'] : IT_SERV; if(el.value && !ok.includes(el.value)) el.value = ''; IT[k] = el.value;
  const any = IT.linea || IT.servicio; D.querySelectorAll('#itForm .fac-btns button').forEach(b=>b.disabled = !any || (IT.busy && /Cargar/.test(b.textContent))); };
W.agItLimpiar = () => { IT.linea = ''; IT.servicio = ''; IT.res = []; IT.page = 1; CC.refrescar('screenItinerario'); };
W.agItPag = (p, s) => { if(s) IT.size = s; IT.page = p; CC.refrescar('screenItinerario'); };
W.agItAbrir = code => { W.openVoyages(null, 'landing'); W.selectVoyage(code); };
W.agItCargar = function(){
  if(!IT.linea || !IT.servicio){ CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
  IT.files = []; IT.sel = {}; itDlg();
};
function itDlg(){
  const n = IT.files.length;
  CC.modal(`<div class="fac-head"><div><h3>Subir Archivo</h3><div class="fac-sub">${n} ${n===1?'archivo':'archivos'}</div></div>
    <div class="fac-acts"><label class="cc-btn ag-file">Subir Archivo<input type="file" accept=".pdf" onchange="agItFile(this)"></label></div></div>
    ${n ? `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
      ${IT.files.map((f,i)=>`<tr><td><input type="checkbox" ${IT.sel[i]?'checked':''} onchange="agItSel(${i},this.checked)"></td><td>${esc(f.name)} <small class="ag-mute">${(f.size/1024).toFixed(0)} KB</small></td><td>${fdt(f.ts)}</td><td>${esc(f.user)}</td>
        <td><button type="button" class="ag-ico" title="Descargar" onclick="agDescargar('${i}')">${ICO.down}</button></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="ag-drop">${ICO.up}<p>Cargue el archivo PDF del servicio de itinerario</p><label class="cc-btn ghost ag-file">Seleccione Archivo<input type="file" accept=".pdf" onchange="agItFile(this)"></label></div>`}
    <div class="fac-btns"><button type="button" class="cc-btn pink" ${Object.values(IT.sel).some(Boolean)?'':'disabled'} onclick="agItDel()">Eliminar</button><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button>
      <button type="button" class="cc-btn" id="itOk" ${n?'':'disabled'} onclick="agItGuardar()">Guardar</button></div>`, 'md');
}
W.agItFile = function(inp){
  const f = inp.files[0]; if(!f) return;
  if(!/\.pdf$/i.test(f.name)){ CC.toast('El formato cargado no es el correcto','error'); return; }
  if(f.size > 30*1024*1024){ CC.toast('Error al cargar el archivo. Por favor, verifique el tamaño y el tipo del archivo.','error'); return; }
  IT.files.push({name:f.name, size:f.size, ts:now(), user:usr()}); itDlg();
};
W.agItSel = (i, on) => { IT.sel[i] = on; itDlg(); };
W.agItDel = () => confirmar('Confirmar eliminación','¿Está seguro de que desea eliminar el archivo seleccionado?', ()=>{ IT.files = IT.files.filter((f,i)=>!IT.sel[i]); IT.sel = {}; itDlg(); });
W.agItGuardar = function(){
  if(IT.files.length > 1){ CC.toast('Solo se puede procesar un archivo a la vez.','error'); return; }
  CC.cerrarModal(); vySeed(); IT.busy = true;
  /* Simulación del servicio Colibri o Albatross: interpreta el PDF y crea los viajes */
  const navesZim = SHIPS_CATALOG.filter(s=>s.estado==='Homologado').slice(0,3).map(s=>s.name);
  const base = new Date(); base.setDate(base.getDate()+7); base.setHours(8,0,0,0);
  const iso = (d, h) => { const x = new Date(base.getTime() + (d*24+h)*3600000); return new Date(x - x.getTimezoneOffset()*60000).toISOString().slice(0,16); };
  const pref = IT.servicio==='Colibri' ? 'CB' : 'AB', anio = String(new Date().getFullYear()).slice(2);
  const filas = [
    {nro:`${pref}${anio}01E`, nave:navesZim[0]||'BOX ENDURANCE', origen:'Kingston', puerto:'Callao', ult:'Manzanillo', destino:'Shanghái', eta:iso(0,0), etd:iso(1,10)},
    {nro:`${pref}${anio}02E`, nave:navesZim[1]||'REEFER ATLANTIC', origen:'Rotterdam', puerto:'Paita', ult:'Manzanillo', destino:'Callao', eta:iso(4,6), etd:iso(5,2)},
    {nro:`${pref}${anio}03E`, nave:'ZIM COLIBRI DEMO', origen:'Kingston', puerto:'Callao', ult:'Manzanillo', destino:'Rotterdam', eta:iso(8,0), etd:iso(9,0), obs:'Nave no encontrada'},
    {nro:`${pref}${anio}04E`, nave:navesZim[2]||'MAERSK ESSEX', origen:'Kingston', puerto:'Salaverry', ult:'Puerto Demo', destino:'Callao', eta:iso(11,0), etd:iso(12,0), obs:'Último Puerto sin homologación'}
  ];
  const ya = VOYAGES.find(v=>v.estado==='Creado'); if(ya) filas.push({nro:ya.nro, nave:ya.nave, origen:'Kingston', puerto:ya.puerto, ult:'Manzanillo', destino:'Kingston', eta:ya.eta, etd:ya.etd, obs:'Viaje ya existe'});
  IT.res = filas.map(r=>{
    if(!r.obs && VOYAGES.some(v=>norm(v.nave)===norm(r.nave) && norm(v.nro)===norm(r.nro))) r.obs = 'Viaje ya existe';
    if(r.obs) return {...r, code:'', estado:'Rechazado'};
    const n = Math.max(...VOYAGES.map(x=>+String(x.code).slice(3)||0), 127) + 1, s = SHIPS_CATALOG.find(x=>x.name===r.nave) || {};
    const v = vx({code:'VOY'+String(n).padStart(7,'0'), nro:r.nro, nave:r.nave, trg:s.grt||'', loa:s.loa||'', puerto:r.puerto, terminal:'', cliente:'ZIM INTEGRATED SHIPPING SERVICE LTD', armador:'ZIM INTEGRATED SHIPPING SERVICE LTD',
      tipo:'Liner', eta:r.eta, etd:r.etd, estado:'Creado', rows:[], hist:[{ts:now(), user:usr(), prev:'', next:'Creado', comment:`Viaje creado desde el itinerario ${IT.servicio} (${IT.files[0]?.name||'PDF'}).`}]});
    Object.assign(v, {origenPto:r.origen, ultPto:r.ult, destino:r.destino});
    VOYAGES.push(v); return {...r, code:v.code, estado:'Creado'};
  });
  IT.busy = false; IT.page = 1; CC.refrescar('screenItinerario');
  CC.toast('El proceso de importación ha finalizado.','success');
};
CC.registrarPantalla({
  id:'screenItinerario', grupo:'Agenciamiento', opcion:'Itinerario', titulo:'Importar Itinerario', migas:['Inicio','Itinerario','Importar Itinerario'],
  html: () => itHtml(),
  guia:[{t:'Importar un itinerario', steps:[
    {el:'#itForm', h:'Línea y Servicio', p:'Elija la línea ZIM y el servicio Colibri o Albatross.'},
    {el:()=>gqt('#itForm button','Cargar archivo'), h:'Cargar archivo', p:'Suba el PDF del itinerario. Se crean los viajes que pasen las validaciones.'}]}]
});

/* Expuesto para la parte de Tarifa y pruebas */
W.AG_VY = {AG, vx, vySeed, cur};
W.agConfirmar = confirmar; W.agPager = pager;
})();

/* =====================================================================
   TARIFA · Tarifa > Tarifa (Consulta Tarifa / Nueva Tarifa / Edición de Tarifa)
   El estado `tf`, TARIFFS, applyTariffs (lo que lee la PDA), tfSetStatus y la aprobación con reemplazo
   siguen en el index; aquí se pinta la pantalla con el formato de Connect.
===================================================================== */
(function(){
'use strict';
const W = window, D = document, $ = id => D.getElementById(id), esc = x => CC.esc(x), norm = x => W.normTxt(x);
const P = (txt, cls) => CC.propuesta('sin ticket', txt, cls), TAG = txt => CC.etiquetaPropuesta('sin ticket', txt);
const PH = (txt, cls) => CC.propuesta('HU-ATC-10 · I-001', txt, cls), TAGH = txt => CC.etiquetaPropuesta('HU-ATC-10 · I-001', txt);
const fld = (l, i, c) => CC.campo(l, i, c), sel = (o, v, a, p) => CC.selector(o, v, a, p);
const dl = (id, arr) => `<datalist id="${id}">${arr.map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>`;
const confirmar = (...a) => W.agConfirmar(...a), pager = (...a) => W.agPager(...a);
const ICO = {hist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'};

const TF_CLS = ['Tarifa Comercial','Tarifa de Documentación','Servicios excepcionales de documentación','Tarifa de Sobreestadía de Importación','Tarifa de Sobreestadía de Exportación'];
const kind = c => /Sobreestad/.test(c||'') ? 'ovs' : /ocumentaci/.test(c||'') ? 'doc' : 'com';
const excep = c => /excepcionales/.test(c||'');
const TF_EST = ['Pendiente','Aprobada','Rechazada','Anulada'];
const ISO = {'20DV':'22G1','40DV':'42G1','40HC':'45G1','40RH':'45R1','20RF':'22R1'};
const CRIT = {suc:['Sucursal',null,'Elegir Sucursales'], puerto:['Puerto','Todos los Puertos','Elegir Puertos'], terminal:['Terminal','Todas las Terminales','Elegir Terminal'],
  linea:['Línea','Todas las Líneas','Elegir Línea'], cliente:['Cliente','Todos los Clientes','Elegir Clientes'], armador:['Armador','Todos los Armadores','Elegir Armadores'],
  nave:['Tipo de Nave','Todas las Naves','Elegir Tipo de Nave'], proc:['Procedencia','Todas',''], emb:['Embarcador','Todos los Embarcadores','Elegir Embarcador'],
  cons:['Consignatario','Todos los Consignatarios','Elegir Consignatario'], cont:['Tamaño/Tipo de Contenedor','Todos los Tamaños/Tipos de Contenedor','Elegir Tamaño/Tipo de Contenedor'],
  notif:['Notificante','Todos los Notificantes','Elegir Notificante'], consol:['Consolidador','Todos los Consolidadores','Elegir Consolidador'],
  agad:['Agente de Aduana','Todos los Agentes de Aduana','Elegir Agente de Aduana'], indbl:['Indicador de BL','Todos los Indicadores de BL','Elegir Indicador de BL'],
  tipobl:['Tipo de BL','Todos los Tipos de BL','Elegir Tipo de BL'], modo:['Modo de Carga','Todos los Tipos de Carga','Elegir Modo de Carga']};
const COLS = {com:['suc','puerto','terminal','cliente','armador','nave','proc'], doc:['suc','puerto','terminal','linea','emb','cons','notif','consol','agad','indbl','tipobl','modo'], ovs:['suc','puerto','cliente','linea','cont']};
const TS = {seeded:false, ms:{}, open:'', sel:{}, exp:{}, searched:false};
function opciones(k){
  const S = CC.datos.socios;
  switch(k){
    case 'suc': return TF_SUCURSALES;
    case 'puerto': return PORTS.map(p=>p.k);
    case 'terminal': { const ps = (TS.ms.puerto||[]).filter(x=>x!=='ALL'); return [...new Set((ps.length?ps:PORTS.map(p=>p.k)).flatMap(p=>[...(TERMINALS_BY_PORT[p]||[]), (PORTS.find(x=>x.k===p)||{}).terminal]).filter(Boolean))]; }
    case 'linea': return CC.datos.lineas.map(l=>l.nombre);
    case 'cliente': return state.clients.map(c=>c.name);
    case 'armador': return [...new Set(SHIPS_CATALOG.map(s=>s.armador).filter(Boolean))];
    case 'nave': return VESSEL_TYPES.map(v=>v.es);
    case 'proc': return ['Internacional','Nacional'];
    case 'emb': return S.embarcadores.map(x=>x.razonSocial);
    case 'cons': case 'notif': return S.consignatarios.map(x=>x.razonSocial);
    case 'cont': return Object.keys(ISO);
    case 'consol': return ['CONSOLIDADORA DEMO S.A.C.','CARGO HUB PERÚ S.A.C.'];
    case 'agad': return ['AGENCIA DE ADUANA DEMO S.A.C.','ADUANAS DEL PACÍFICO S.A.'];
    case 'indbl': return ['Importación','Exportación','Tránsito','Transbordo','Cabotaje'];
    case 'tipobl': return ['Master B/L','House B/L'];
    case 'modo': return ['FCL','LCL','Carga suelta'];
  }
  return [];
}
/* Servicios propios de Documentación y Sobreestadía (ids que no están en el maestro de la PDA: no cambian sus totales) */
const SVC_X = {doc:[{id:'agx_doc_bl', name:'EMISIÓN DE B/L', ser:'SER000901', unit:'B/L'},{id:'agx_doc_vb', name:'VISTO BUENO DE B/L', ser:'SER000902', unit:'B/L'},{id:'agx_doc_corr', name:'CORRECCIÓN DE MANIFIESTO', ser:'SER000903', unit:'Documento'}],
  ovs:[{id:'agx_ovs_cont', name:'SOBREESTADÍA DE CONTENEDOR', ser:'SER000951', unit:'Día'},{id:'agx_ovs_ret', name:'RETENCIÓN DE CONTENEDOR', ser:'SER000952', unit:'Día'}]};
function svcList(c){ return kind(c)==='com' ? W.masterCatalog().map(m=>({id:m.id, name:m.name, ser:m.ser||'', unit:m.tariffUnit||m.unit||'Servicio'})) : SVC_X[kind(c)]; }
function svcInfo(id){ const m = W.tfSvcAny(id); if(m) return {name:m.name, ser:m.ser||'', unit:m.tariffUnit||m.unit||'Servicio'}; return SVC_X.doc.concat(SVC_X.ovs).find(x=>x.id===id) || {name:id, ser:'', unit:''}; }
const lineFix = l => Object.assign(l, {calc:l.calc||'PQ', unit:l.unit||svcInfo(l.svc).unit, ranges:l.ranges||[], descType:l.descType||(l.desc?'P':''), montoEd:!!l.montoEd});

function seed(){
  if(TS.seeded) return; TS.seeded = true;
  const crit = o => W.tfCrit(Object.assign({linea:'Todas las Líneas', emb:'Todos los Embarcadores', cons:'Todos los Consignatarios', notif:'Todos los Notificantes', consol:'Todos los Consolidadores',
    agad:'Todos los Agentes de Aduana', indbl:'Todos los Indicadores de BL', tipobl:'Todos los Tipos de BL', modo:'Todos los Tipos de Carga', cont:'Todos los Tamaños/Tipos de Contenedor'}, o));
  const ln = (svc, o) => lineFix(Object.assign({svc, factor:1, minQty:1, cost:0, price:0, min:0, vat:18, sujeto:true, retro:false, mand:false, desc:false, descVal:0, editable:false}, o));
  const mk = o => TARIFFS.push(W.tfNew('maritimo', o)), L = CC.datos.lineas;
  mk({ref:'DOCUMENTACIÓN B/L IMPORTACIÓN ZIM', clase:'Tarifa de Documentación', tipoTarifa:'', crit:[crit({linea:L[1].nombre, indbl:'Importación'})], lines:[ln('agx_doc_bl',{price:45, mand:true}), ln('agx_doc_vb',{price:30, desc:true, descType:'P', descVal:10})]});
  mk({ref:'CORRECCIONES DE MANIFIESTO', clase:'Servicios excepcionales de documentación', tipoTarifa:'', status:'Pendiente', crit:[crit({})], lines:[ln('agx_doc_corr',{price:60, montoEd:true})], hist:W.tfHist('2026-10-02T10:00:00', null)});
  mk({ref:'SOBREESTADÍA IMPORTACIÓN ZIM DRY 20', clase:'Tarifa de Sobreestadía de Importación', indBl:'Importación', split:true, unidadQ:1, crit:[crit({linea:L[1].nombre, cont:'20DV'})],
    lines:[ln('agx_ovs_cont',{calc:'PR', price:15, retro:true, ranges:[{ini:1, fin:7, cost:0, price:15}, {ini:8, fin:14, cost:0, price:35}, {ini:15, fin:'', cost:0, price:60}]})]});
  mk({ref:'SOBREESTADÍA IMPORTACIÓN MAERSK REEFER', clase:'Tarifa de Sobreestadía de Importación', indBl:'Importación', status:'Pendiente', crit:[crit({linea:L[0].nombre, cont:'40RH'})], hist:W.tfHist('2026-10-15T09:00:00', null),
    lines:[ln('agx_ovs_cont',{calc:'PR', price:40, ranges:[{ini:1, fin:5, cost:0, price:40}, {ini:6, fin:'', cost:0, price:85}]})]});
  mk({ref:'SOBREESTADÍA EXPORTACIÓN ZIM DRY 40', clase:'Tarifa de Sobreestadía de Exportación', indBl:'Exportación', crit:[crit({linea:L[1].nombre, cont:'40DV'})],
    lines:[ln('agx_ovs_ret',{calc:'PR', price:20, ranges:[{ini:1, fin:10, cost:0, price:20}, {ini:11, fin:'', cost:0, price:45}]})]});
}

/* ---------- Consulta Tarifa ---------- */
const defF = () => ({code:'', ref:'', clase:'Tarifa Comercial', suc:'', puerto:'', terminal:'', moneda:'', contrato:'', tipo:'', estado:'', vig:true,
  cliente:'', armador:'', nave:'', linea:'', emb:'', cons:'', notif:'', consol:'', agad:'', tipobl:'', indbl:'', modo:'', cont:'', svc:'', svcId:'', quick:'', iso:'', tramo:''});
W.tfDefaultFilters = defF;
W.openTariffs = function(pre, returnTo){
  if(!state.categoryType){ CC.toast('Elige primero Marítimo o Terrestre','error'); return; }
  seed();
  tf.returnTo = returnTo || 'landing';
  const keep = !pre && TS.searched && tf.returnTo==='landing';
  if(!keep){ tf.f = {...defF(), ...(pre||{})}; if(pre && (pre.svcId || pre.svc || pre.vig===false)) tf.f.clase = ''; tf.page = 1; TS.searched = !!pre; }
  tf.adv = tf.adv || !!(tf.f.svc || tf.f.cliente);
  tf.selId = null; tf.draft = null; tf.edit = false; tf.isNew = false; tf.dirty = false;
  $('stepsNav').style.display = 'none';
  W.showScreen('screenTariffs'); W.showTfView('list'); W.applyTfPerm(); W.renderTfList();
};
W.setTfFilter = (k, v) => {
  tf.f[k] = v; if(k==='svc') tf.f.svcId = ''; if(k==='vig' && v) tf.f.quick = '';
  if(k==='puerto' || k==='suc') tf.f.terminal = '';
  if(k==='clase'){ ['cliente','armador','nave','linea','emb','cons','notif','consol','agad','tipobl','indbl','modo','cont','iso','tramo'].forEach(x=>tf.f[x]=''); if(kind(v)!=='com') tf.f.tipo = ''; if(kind(v)==='ovs'){ tf.f.contrato = ''; tf.f.terminal = ''; } }
  if(['clase','puerto','suc'].includes(k)) W.renderTfList();
};
W.agTfPto = el => { if(el.value && !PORTS.some(p=>p.k===el.value)) el.value = ''; W.setTfFilter('puerto', el.value); };
W.agTfBuscar = () => { TS.searched = true; tf.page = 1; W.renderTfList(); if(!W.tfFiltered().length) CC.toast('No se encontraron resultados con los criterios seleccionados','info'); };
W.clearTfFilters = () => { tf.f = defF(); tf.page = 1; TS.searched = false; W.renderTfList(); };
W.toggleTfAdv = () => { tf.adv = !tf.adv; W.renderTfList(); };
W.setTfQuick = k => { tf.f.quick = tf.f.quick===k ? '' : k; tf.f.vig = !tf.f.quick; TS.searched = true; tf.page = 1; W.renderTfList(); };
W.tfGo = (p, s) => { if(s) tf.size = s; tf.page = p; W.renderTfList(); };
const tramos = t => ((t.lines.find(l=>l.calc==='PR')||{}).ranges||[]).map(r=>`${r.ini}${r.fin?` a ${r.fin}`:' a más'}: ${W.fmtNum(r.price)}`).join(' · ');
W.tfFiltered = function(over){
  const f = {...tf.f, ...(over||{})}, type = W.activeCatalogKey(), q = k => norm(f[k]||''), today = W.todayISO();
  const crit = (t, k) => !q(k) || t.crit.some(c=>norm(c[k]||'').includes(q(k)));
  return TARIFFS.filter(t => t.tipo===type && (!q('code') || norm(t.code).includes(q('code'))) && (!q('ref') || norm(t.ref).includes(q('ref'))) &&
    (!f.clase || t.clase===f.clase) && (!f.moneda || t.currency===f.moneda) && (!f.contrato || t.contrato===f.contrato) && (!f.tipo || t.tipoTarifa===f.tipo) &&
    (!f.estado || t.status===f.estado) && (!f.vig || W.tfVigente(t)) && (!f.suc || t.crit.some(c=>c.suc===f.suc)) && (!f.puerto || t.crit.some(c=>c.puerto===f.puerto)) &&
    (!f.terminal || t.crit.some(c=>c.terminal===f.terminal)) && ['cliente','armador','nave','linea','emb','cons','notif','consol','agad','tipobl','indbl','modo','cont'].every(k=>crit(t,k)) &&
    (!f.iso || t.crit.some(c=>ISO[c.cont]===f.iso)) && (!f.tramo || t.lines.some(l=>l.calc==='PR' && (l.ranges||[]).some(r=>+f.tramo>=+r.ini && (!r.fin || +f.tramo<=+r.fin)))) &&
    (f.svcId ? t.lines.some(l=>l.svc===f.svcId) : (!q('svc') || t.lines.some(l=>{ const s = svcInfo(l.svc); return norm(s.name).includes(q('svc')) || norm(s.ser).includes(q('svc')); }))) &&
    (f.quick!=='pend' || t.status==='Pendiente') && (f.quick!=='soon' || (t.status==='Aprobada' && W.tfVigente(t) && W.tfDaysLeft(t)<=30)) && (f.quick!=='exp' || (t.status==='Aprobada' && t.to && t.to < today)));
};
W.exportTfCsv = function(){
  const d = new Date(), p = n => String(n).padStart(2,'0'), ts = `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  CC.exportarExcel(`${(tf.f.clase||'Tarifas').replace(/\s+/g,'_')}_${ts}`, 'Tarifas', ['Código','Clase','Tipo de Tarifa','Tipo de Contrato','Moneda','Vigencia Desde','Vigencia Hasta','Referencia','Estado'],
    W.tfFiltered().map(t=>[t.code, t.clase, t.tipoTarifa||'', t.contrato||'', TF_CUR[t.currency]||t.currency, W.fmtDate(t.from), W.fmtDate(t.to), t.ref, t.status]));
};
W.renderTfList = function(){
  seed();
  const f = tf.f, k = kind(f.clase), can = W.canEditTariffs();
  tf.size = [5,10,25].includes(tf.size) ? tf.size : 10;
  const inp = (key, ph, max) => `<input id="tf_${key}" maxlength="${max||100}" placeholder="${ph}" value="${esc(f[key]||'')}" oninput="setTfFilter('${key}',this.value)">`;
  const s = (key, opts, ph, id) => sel(opts, f[key], `id="${id||'tf_'+key}" onchange="setTfFilter('${key}',this.value)"`, ph);
  const terms = f.puerto ? [...new Set([...(TERMINALS_BY_PORT[f.puerto]||[]), (PORTS.find(p=>p.k===f.puerto)||{}).terminal].filter(Boolean))] : [];
  const chip = `<span ${CC.propuesta('I-016','Tarifas por tipo Marítimo o Terrestre','type-chip '+state.categoryType)} id="tfTypeChip">${state.categoryType==='maritimo'?'Marítimo':'Terrestre'}</span>`;
  const acts = `${chip}<button type="button" ${P('Volver al flujo del prototipo','cc-btn ghost')} id="tfBackBtn" onclick="closeTariffs()">${tf.returnTo==='master'?'← Volver al servicio':tf.returnTo==='pda'?'← Volver a la PDA':'← Volver'}</button>
    ${can?'<button type="button" class="cc-btn" id="tfNewBtn" onclick="newTariff()">+ Nuevo</button>':''}`;
  const basic = [fld('Código', inp('code','Ingresar Código',25)), fld('Referencia', inp('ref','Ingresar Referencia')), fld('Clase', s('clase', TF_CLS, 'Elegir Clase')),
    fld('Sucursal', s('suc', TF_SUCURSALES, 'Elegir Sucursales')), fld('Puerto', `<input id="tf_puerto" list="tfPtos" placeholder="Ingresar Puerto" value="${esc(f.puerto)}" onchange="agTfPto(this)">`)];
  if(k!=='ovs') basic.push(fld('Terminal', s('terminal', terms, 'Elegir Terminal')));
  basic.push(fld('Moneda', s('moneda', [['USD','Dólar estadounidense'],['PEN','Sol peruano']], 'Elegir Moneda')));
  if(k!=='ovs') basic.push(fld('Tipo de Contrato', s('contrato', TF_CONTRATOS, 'Elegir Tipo de Contrato')));
  if(k==='com') basic.push(fld('Tipo de Tarifa', s('tipo', TF_TIPOS, 'Elegir Tipo de Tarifa')));
  basic.push(fld('Estado', s('estado', TF_EST, 'Elegir Estado', 'tfEstado')));
  const advK = k==='com' ? [['cliente','Cliente','Ingresar cliente'],['armador','Armador','Ingresar Armador'],['nave','Tipo de Nave','Ingresar Tipo de Nave']]
    : k==='doc' ? [['linea','Línea','Ingresar Línea'],['emb','Embarcador','Ingresar Embarcador'],['cons','Consignatario','Ingresar Consignatario'],['notif','Notificante','Ingresar Notificante'],['consol','Consolidador','Ingresar Consolidador'],['agad','Agente de Aduana','Ingresar Agente de Aduana'],['tipobl','Tipo de BL','Ingresar Tipo de BL'],['indbl','Indicador de BL','Ingresar Indicador de BL'],['modo','Modo de Carga','Ingresar Modo de Carga']]
    : [['cliente','Cliente','Ingresar cliente'],['linea','Línea','Ingresar Línea'],['cont','Tamaño/Tipo de Contenedor','Ingresar Tamaño/Tipo de Contenedor']];
  const adv = advK.map(([key,l,ph])=>fld(l, `<input id="tf_${key}" list="tfL_${key}" placeholder="${ph}" value="${esc(f[key]||'')}" oninput="setTfFilter('${key}',this.value)">${dl('tfL_'+key, opciones(key))}`)).join('')
    + `<div ${P('Filtro por servicio del maestro')}>${fld('Servicio', `<input id="tfSvc" placeholder="Descripción o código SER" value="${esc(f.svc||'')}" oninput="setTfFilter('svc',this.value)">`)}</div>`
    + (k==='ovs' ? `<div ${PH('Búsqueda de sobreestadía: Código ISO')}>${fld('Código ISO', sel(Object.values(ISO), f.iso, `id="tf_iso" onchange="setTfFilter('iso',this.value)"`, 'Elegir Código ISO'))}</div>
      <div ${PH('Búsqueda de sobreestadía: tramo')}>${fld('Día de sobreestadía (tramo)', `<input id="tf_tramo" type="number" min="1" placeholder="Ej. 10" value="${esc(f.tramo||'')}" oninput="setTfFilter('tramo',this.value)">`)}</div>` : '');
  const q = W.tfQuickCounts();
  const quick = [['pend','Por aprobar'],['soon','Por vencer'],['exp','Vencidas']].filter(([x])=>q[x] || f.quick===x)
    .map(([x,l])=>`<button type="button" class="tf-q ${x} ${f.quick===x?'on':''}" onclick="setTfQuick('${x}')">${l} <b>${q[x]}</b></button>`).join('');
  let h = `<div class="fac-zone">${dl('tfPtos', PORTS.map(p=>p.k))}<div class="fac-card" id="tfFilters"><div class="fac-head"><div><h3>Buscar Tarifa</h3><div class="fac-sub">Ingrese datos para buscar</div></div><div class="fac-acts">${acts}</div></div>
    <div class="fac-g3">${basic.join('')}</div>
    <label class="fac-chk" style="margin-top:12px"><input type="checkbox" id="tfVig" ${f.vig?'checked':''} onchange="setTfFilter('vig',this.checked)"> Tarifa Vigente</label>
    <div><button type="button" class="tf-advbtn ag-adv ${tf.adv?'open':''}" id="tfAdvBtn" onclick="toggleTfAdv()">Filtros Avanzados <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg></button></div>
    ${tf.adv?`<div class="fac-sub" style="margin:4px 0 10px">Ingrese datos para buscar</div><div class="fac-g3" id="tfAdv">${adv}</div>`:''}
    <div class="fac-btns">${quick?`<span ${P('Atajos Por aprobar, Por vencer y Vencidas','tf-quick ag-quickbox')} id="tfQuick">${quick}</span>`:''}<button type="button" class="cc-btn" onclick="agTfBuscar()">Buscar</button><button type="button" class="cc-btn ghost" onclick="clearTfFilters()">Limpiar</button></div></div>`;
  const all = TS.searched ? W.tfFiltered().sort((a,b)=>a.code.localeCompare(b.code)) : [];
  if(all.length){
    const pages = Math.max(1, Math.ceil(all.length/tf.size)); tf.page = Math.min(Math.max(1, tf.page||1), pages);
    const ovs = k==='ovs';
    const linea = t => [...new Set(t.crit.map(c=>c.linea).filter(Boolean))].join(', '), cont = t => [...new Set(t.crit.map(c=>c.cont ? `${c.cont}${ISO[c.cont]?' ('+ISO[c.cont]+')':''}` : ''))].filter(Boolean).join(', ');
    h += `<div class="fac-card" id="tfRes"><div class="fac-head"><h3>Resultados (${all.length})</h3></div><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Código</th><th>Clase</th><th>Tipo de Tarifa</th><th>Tipo de Contrato</th><th>Moneda</th><th>Vigencia Desde</th><th>Vigencia Hasta</th><th>Referencia</th><th>Estado</th>
      ${ovs?`<th class="cc-prop">Línea ${TAGH('Línea visible en resultados')}</th><th class="cc-prop">Tamaño/Tipo de Contenedor (ISO) ${TAGH('Columna nueva')}</th><th class="cc-prop">Tramos (días) ${TAGH('Columna nueva')}</th>`:''}</tr></thead><tbody id="tfResults">
      ${all.slice((tf.page-1)*tf.size, tf.page*tf.size).map(t=>`<tr><td><a href="#" class="pda-code-link" onclick="selectTariff('${t.id}');return false">${esc(t.code)}</a></td><td>${esc(t.clase)}</td><td>${esc(t.tipoTarifa||'')}</td><td>${esc(t.contrato||'')}</td>
        <td>${TF_CUR[t.currency]||t.currency}</td><td>${W.fmtDate(t.from)}</td><td>${W.fmtDate(t.to)}</td><td>${esc(t.ref)}<div class="pda-row-sub cc-prop">${esc(W.tfScope(t))}</div></td>
        <td>${W.tfPill(t.status)}<span class="cc-prop">${W.tfVigTag(t)}</span></td>${ovs?`<td class="cc-prop">${esc(linea(t))}</td><td class="cc-prop">${esc(cont(t))}</td><td class="cc-prop" style="white-space:normal">${esc(tramos(t))}</td>`:''}</tr>`).join('')}</tbody></table></div>
      <div class="fac-btns" style="justify-content:space-between;align-items:center"><button type="button" class="cc-btn" onclick="exportTfCsv()">Exportar</button>${pager(all.length, tf.page, tf.size, 'tfGo')}</div></div>`;
  }
  $('tfList').innerHTML = h + '<div class="pnote proc"><span class="pn-tag">Pendiente de proceso</span><b>Quién registra las tarifas negociadas.</b> Acordar con Comercial y Facturación que Comercial registra las tarifas pactadas con clientes y proveedores, no Facturación.</div></div>';
};

/* ---------- Edición de Tarifa ---------- */
const mark = () => { tf.dirty = true; };
W.agTfSet = (k, v, re) => {
  const d = tf.draft;
  if(k==='clase' && v!==d.clase){
    const prev = d.clase;
    const go = () => { d.clase = v; d.crit = []; d.lines = []; TS.ms = {}; const kk = kind(v);
      if(kk==='com'){ d.tipoTarifa = 'Propio'; d.contrato = ''; d.indBl = ''; d.proveedor = ''; }
      else if(kk==='doc'){ d.tipoTarifa = ''; d.contrato = ''; d.indBl = ''; }
      else { d.tipoTarifa = 'Propio'; d.contrato = 'Estándar'; d.indBl = /Exporta/.test(v) ? 'Exportación' : 'Importación'; }
      if(kk!=='ovs'){ d.split = false; d.unidadQ = ''; }
      mark(); W.renderTfEditor(); };
    if(d.crit.length || d.lines.length){ const m = d.crit.length && d.lines.length ? '¿Estás seguro de eliminar todos los Criterios Comerciales y Servicios?' : d.crit.length ? '¿Estás seguro de eliminar todos los Criterios Comerciales?' : '¿Estás seguro de eliminar todos los Servicios?';
      confirmar('Confirmación', m, go, null, ()=>{ d.clase = prev; W.renderTfEditor(); }); return; }
    go(); return;
  }
  d[k] = v; mark();
  if(k==='split'){ d.unidadQ = v ? 1 : ''; re = 1; }
  if(k==='tipoTarifa' && v!=='Tercero Externo') d.proveedor = '';
  if(re) W.renderTfEditor();
};
W.agTfTab = k => { tf.tab = k; W.renderTfEditor(); };
W.setTfTab = W.agTfTab;
W.renderTfEditor = function(){
  const ed = $('tfEditor'), d = tf.draft; if(!d){ ed.innerHTML = ''; return; }
  d.lines.forEach(lineFix);
  const can = W.canEditTariffs(), appr = W.canApproveTariffs(), edit = tf.edit && can, dis = edit ? '' : 'disabled', k = kind(d.clase);
  let b = '';
  if(!edit && !tf.isNew){
    if(d.status==='Pendiente' && appr) b += `<button type="button" class="cc-btn tf-ok ag-green" onclick="agTfAprobar()">Aprobar</button><button type="button" class="cc-btn ghost" onclick="agTfMotivo('Rechazada')">Rechazar</button>`;
    if(['Pendiente','Aprobada'].includes(d.status) && can) b += `<button type="button" class="cc-btn pink" onclick="agTfMotivo('Anulada')">Anular</button>`;
    if(['Pendiente','Rechazada'].includes(d.status) && can) b += `<button type="button" class="cc-btn" onclick="startTfEdit()" ${d.status==='Rechazada'?'title="Una tarifa Rechazada se corrige y vuelve a Pendiente"':''}>Editar</button>`;
    if(['Aprobada','Rechazada'].includes(d.status) && can) b += `<button type="button" ${P('Nueva versión de la tarifa','cc-btn ghost')} onclick="newTariff('${d.id}')">Nueva versión</button>`;
  }
  const chips = TF_EST.map(s=>`<span class="cc-chip ${s===d.status?'on st-'+s.toLowerCase():''}">${s}</span>`).join('');
  const repl = d.status==='Pendiente' ? W.tfOverlaps(d) : [];
  const replHtml = repl.length ? `<span ${P('Reemplazo automático de la tarifa anterior','tf-repl')} title="Al aprobarse, la anterior vence un día antes de esta Vigencia Desde">Reemplaza a ${repl.map(t=>`<a href="#" onclick="selectTariff('${t.id}');return false">${W.tfShort(t.code)}</a>`).join(', ')}</span>` : '';
  const last = ['Rechazada','Anulada'].includes(d.status) ? [...(d.hist||[])].reverse().find(h=>h.next===d.status) : null;
  const reason = last ? `<div ${P('Banda con el motivo','tf-reason '+d.status.toLowerCase())}><b>${d.status}</b> · ${esc(last.user)} · ${W.fmtDate(last.ts)}: ${esc(last.comment)}</div>` : '';
  const inp = (key, ph, type, extra) => `<input ${dis} data-f="${key}" ${type?`type="${type}"`:''} value="${esc(d[key]??'')}" placeholder="${ph||''}" oninput="agTfSet('${key}',this.value)" ${extra||''}>`;
  const s = (key, opts, ph, re, lock) => sel(opts, d[key], `${edit&&!lock?'':'disabled'} onchange="agTfSet('${key}',this.value${re?',1':''})"`, ph);
  const F = [fld('Código', `<input disabled value="${esc(d.code)}">`), fld('Referencia *', inp('ref','Ingresar Referencia','','maxlength="100"')),
    fld('Clase *', s('clase', TF_CLS, 'Elegir Clase', 1, !tf.isNew))];
  if(k!=='ovs') F.push(fld('Tipo de Contrato *', s('contrato', TF_CONTRATOS, 'Elegir Tipo de Contrato')));
  F.push(fld('Moneda *', s('currency', [['USD','Dólar estadounidense'],['PEN','Sol peruano']], 'Elegir Moneda')), fld('Vigencia Desde *', inp('from','Ingresar Vigencia Desde','date')),
    fld('Vigencia Hasta *', inp('to','Ingresar Vigencia Hasta','date', d.from?`min="${d.from}"`:'')));
  if(k==='ovs') F.push(fld('Indicador de BL', `<input disabled value="${esc(d.indBl||(/Exporta/.test(d.clase)?'Exportación':'Importación'))}">`));
  if(k==='com'){ F.push(fld('Tipo de Tarifa', s('tipoTarifa', TF_TIPOS, 'Elegir Tipo de Tarifa', 1)));
    if(d.tipoTarifa==='Tercero Externo') F.push(fld('Proveedor *', `<input ${dis} list="tfProv" placeholder="Ingresar Proveedor" value="${esc(d.proveedor||'')}" onchange="if(this.value&&!homologatedSuppliers().includes(this.value))this.value='';agTfSet('proveedor',this.value)">${dl('tfProv', W.homologatedSuppliers())}`)); }
  F.push(fld('Comisión de línea', inp('comLinea','Ingresar Comisión de línea')), fld('Comisión del representante de la Línea', inp('comRep','Ingresar Comisión del representante de la Línea')), fld('Comisión COSMOS', inp('comCosmos','Ingresar Comisión COSMOS')));
  if(k==='ovs') F.push(fld('Aplica Split', `<label class="fac-chk"><input type="checkbox" ${dis} ${d.split?'checked':''} onchange="agTfSet('split',this.checked)"> Aplica Split</label>`),
    fld('Unidad de quiebre'+(d.split?' *':''), `<input type="number" min="1" step="1" ${edit&&d.split?'':'disabled'} value="${esc(d.unidadQ??'')}" oninput="agTfSet('unidadQ',this.value)">`));
  const info = `<div class="fac-card"><div class="fac-head md-cardhead"><div class="tf-title"><h3 class="md-h">Información General</h3>${tf.isNew?'':`<button type="button" class="tf-hist" title="Historial de Cambios" onclick="openTfHistory()">${ICO.hist}</button>`}${replHtml}</div>
    <div class="fac-acts md-actions"><div class="cc-chips">${chips}</div>${b}</div></div>${reason}<div class="fac-g4 ag-fg">${F.join('')}</div></div>`;
  const cnt = n => ` <span class="cc-prop">(${n})</span>`;
  const tabs = `<button type="button" class="${tf.tab!=='svc'?'on':''}" onclick="agTfTab('crit')">Criterios Comerciales${cnt(d.crit.length)}</button><button type="button" class="${tf.tab==='svc'?'on':''}" onclick="agTfTab('svc')">Servicios${cnt(d.lines.length)}</button>`;
  const body = tf.tab==='svc' ? tabSvc(d, edit) : tabCrit(d, edit);
  const pie = edit ? `<div class="fac-btns"><button type="button" class="cc-btn" onclick="agTfGuardar()">${tf.isNew?'Crear':'Guardar'}</button>${!tf.isNew && d.status==='Pendiente'?'<button type="button" class="cc-btn pink" onclick="agTfEliminar()">Eliminar</button>':''}<button type="button" class="cc-btn pink" onclick="discardTariff()">Cancelar</button></div>` : '';
  ed.innerHTML = `<div class="fac-zone">${info}<div class="fac-card"><div class="fac-tabs md-tabs">${tabs}</div><div class="md-body">${body}</div></div>${pie}</div>`;
};
function msBox(key){
  const [lbl, todos, ph] = CRIT[key], v = TS.ms[key] || [], opts = opciones(key);
  if(key==='proc') return fld(lbl, sel(['Internacional','Nacional'], v[0]||'', `onchange="agTfMs('proc',this.value)"`, 'Todas'));
  const txt = v.length ? (v.includes('ALL') ? todos : `(${v.length}) Seleccionado(s)`) : ph;
  return fld(lbl, `<details class="ag-ms" data-k="${key}" ${TS.open===key?'open':''}><summary onclick="agTfMsOpen('${key}')">${esc(txt)}</summary><div class="ag-ms-list">
    ${todos?`<label><input type="checkbox" ${v.includes('ALL')?'checked':''} onchange="agTfMs('${key}','ALL',this.checked)"> <b>${esc(todos)}</b></label>`:''}
    ${opts.map((o,i)=>`<label><input type="checkbox" ${v.includes('ALL')?'disabled':''} ${v.includes(o)?'checked':''} onchange="agTfMs('${key}',${i},this.checked)"> ${esc(o)}</label>`).join('')}</div></details>`);
}
W.agTfMsOpen = k => { TS.open = TS.open===k ? '' : k; D.querySelectorAll('details.ag-ms').forEach(x=>{ if(x.dataset.k!==k) x.open = false; }); };
W.agTfMs = (key, v, on) => {
  if(key==='proc'){ TS.ms.proc = v ? [v] : []; return; }
  const L = TS.ms[key] = TS.ms[key] || [], val = v==='ALL' ? 'ALL' : opciones(key)[v];
  if(v==='ALL') TS.ms[key] = on ? ['ALL'] : []; else if(on) L.push(val); else TS.ms[key] = L.filter(x=>x!==val);
  TS.open = key; W.renderTfEditor();
};
function tabCrit(d, edit){
  const cols = COLS[kind(d.clase)];
  const zona = edit && d.clase ? `<div class="fac-g4 ag-mszone">${cols.map(c=>msBox(c)).join('')}</div>
    <div class="fac-btns" style="justify-content:flex-start"><button type="button" class="cc-btn ghost" onclick="agTfCritAdd()">Agregar</button><button type="button" class="cc-btn pink" ${Object.values(TS.sel).some(Boolean)?'':'disabled'} onclick="agTfCritDel()">Eliminar</button></div>` : '';
  return zona + `<div class="fac-scroll"><table class="fac-tbl"><thead><tr>${edit?'<th style="width:36px"></th>':''}${cols.map(c=>`<th>${CRIT[c][0]}</th>`).join('')}</tr></thead><tbody>
    ${d.crit.map((c,i)=>`<tr>${edit?`<td><input type="checkbox" ${TS.sel[i]?'checked':''} onchange="agTfCritSel(${i},this.checked)"></td>`:''}${cols.map(k=>`<td>${esc(c[k] || CRIT[k][1] || '')}</td>`).join('')}</tr>`).join('')
      || `<tr><td colspan="${cols.length+1}" class="fac-empty">Sin criterios comerciales.</td></tr>`}</tbody></table></div>`;
}
W.agTfCritSel = (i, on) => { TS.sel[i] = on; W.renderTfEditor(); };
W.agTfCritAdd = function(){
  const d = tf.draft, cols = COLS[kind(d.clase)];
  if(cols.some(c=>c!=='proc' && !(TS.ms[c]||[]).length)){ CC.toast('Por favor seleccione al menos un valor en cada criterio','error'); return; }
  let combos = [{}];
  cols.forEach(c=>{ const v = TS.ms[c]||[]; const vals = c==='proc' ? [v[0]||'Todas'] : v.includes('ALL') ? [CRIT[c][1]] : v; combos = combos.flatMap(o=>vals.map(x=>({...o, [c]:x}))); });
  const key = c => cols.map(k=>c[k]||CRIT[k][1]).join('|'); let n = 0;
  combos.forEach(o=>{ const row = W.tfCrit(o); if(!d.crit.some(x=>key(x)===key(row))){ d.crit.push(row); n++; } });
  TS.ms = {}; TS.open = ''; mark(); W.renderTfEditor();
  if(!n) CC.toast('Los criterios elegidos ya estaban registrados','info');
};
W.agTfCritDel = () => confirmar('Confirmación','¿Estás seguro de que deseas eliminar los criterios seleccionados?', ()=>{ tf.draft.crit = tf.draft.crit.filter((c,i)=>!TS.sel[i]); TS.sel = {}; mark(); W.renderTfEditor(); });
function tabSvc(d, edit){
  const cur = d.currency, sn = b => b ? 'Sí' : 'No', ex = excep(d.clase), m2 = W.money2;
  const addB = edit && d.clase ? `<div class="fac-btns" style="margin-top:0;justify-content:flex-start"><button type="button" class="cc-btn ghost" onclick="agTfLineDlg(-1)">Agregar</button></div>` : '';
  const rows = d.lines.map((l,i)=>{ const s = svcInfo(l.svc), pr = l.calc==='PR';
    const desc = l.desc ? (l.descType==='F' ? `${cur} ${m2(l.descVal)}` : `${m2(l.descVal)}%`) : '';
    const main = `<tr><td><b>${esc(s.ser||'')}</b> ${esc(s.name)}</td><td>${pr?'Por Rango (PR)':'Por Cantidad (PQ)'}</td><td>${esc(l.unit||'')}</td><td class="num">${pr?'':W.fmtNum(l.factor)}</td><td class="num">${pr?'':W.fmtNum(l.minQty)}</td>
      <td class="num">${pr?'':m2(l.cost)}</td><td class="num">${pr?'':m2(l.price)}</td><td class="num">${m2(l.vat)}</td><td>${sn(l.sujeto)}</td><td>${sn(l.retro)}</td><td>${sn(l.mand)}</td>
      ${ex?`<td>${sn(l.montoEd)}</td>`:''}<td><span class="ag-dot ${l.desc?'on':''}"></span></td><td>${desc}</td>
      <td class="cc-prop num">${Number(l.min)>0?m2(l.min):'-'}</td>${ex?'':`<td class="cc-prop">${sn(l.editable)}</td>`}
      <td>${edit?`<button type="button" class="ag-ico" title="Editar" onclick="agTfLineDlg(${i})">${ICO.edit}</button><button type="button" class="ag-ico" title="Eliminar" onclick="agTfLineDel(${i})">${ICO.del}</button>`:`<button type="button" class="ag-ico" title="Ver" onclick="agTfLineDlg(${i})">${ICO.eye}</button>`}</td>
      <td>${pr?`<button type="button" class="ag-ico" title="Expandir" onclick="agTfExp(${i})">${TS.exp[i]?'▴':'▾'}</button>`:''}</td></tr>`;
    const sub = pr && TS.exp[i] ? `<tr class="ag-subrow"><td colspan="18"><table class="fac-tbl"><thead><tr><th>Inicio de Rango</th><th>Fin de Rango</th><th>Precio de Costo</th><th>Precio de Venta</th></tr></thead><tbody>
      ${(l.ranges||[]).map(r=>`<tr><td>${r.ini}</td><td>${r.fin||'Abierto'}</td><td class="num">${m2(r.cost)}</td><td class="num">${m2(r.price)}</td></tr>`).join('')}</tbody></table></td></tr>` : '';
    return main + sub; }).join('');
  return addB + `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Servicios</th><th>Tipo de Cálculo</th><th>Unidad</th><th>Factor por Unidad</th><th>Cantidad Mínima</th><th>Precio de Costo</th><th>Precio de Venta</th>
    <th>Porcentaje de Tipo de Impuesto</th><th>Sujeto a Impuestos</th><th>Es Retroactivo</th><th>Es Mandatorio</th>${ex?'<th>Monto editable</th>':''}<th>Aplicar descuento</th><th>Valor de descuento</th>
    <th class="cc-prop">Monto mínimo ${CC.etiquetaPropuesta('I-111','Monto mínimo')}</th>${ex?'':`<th class="cc-prop">Editable en la PDA ${TAG('Editable en la PDA')}</th>`}<th>Acciones</th><th></th></tr></thead><tbody>
    ${rows || `<tr><td colspan="18" class="fac-empty">Sin servicios.</td></tr>`}</tbody></table></div>`;
}
W.agTfExp = i => { TS.exp[i] = !TS.exp[i]; W.renderTfEditor(); };
W.agTfLineDel = i => confirmar('Confirmación','¿Estás seguro de que deseas eliminar este servicio?', ()=>{ tf.draft.lines.splice(i,1); mark(); W.renderTfEditor(); });
/* Diálogo "Detalles de Servicio" */
let LD = null;
W.agTfLineDlg = function(i){
  const d = tf.draft, ro = !(tf.edit && W.canEditTariffs());
  LD = {i, ro, rsel:{}, l: i>-1 ? JSON.parse(JSON.stringify(lineFix(d.lines[i]))) : {svc:'', factor:1, minQty:'', cost:0, price:'', min:0, vat:18, sujeto:true, retro:false, mand:false, desc:false, descType:'', descVal:'', editable:false, calc:'', unit:'', ranges:[], montoEd:false}};
  ldPinta();
};
function rangosMal(R){
  for(let j=0;j<R.length;j++){ const r = R[j], last = j===R.length-1;
    if(!(+r.ini>0)) return 'El inicio del rango es obligatorio y debe ser > 0';
    if(!last && !(+r.fin>0)) return 'El final del rango es obligatorio y debe ser > 0';
    if(r.fin!=='' && r.fin!=null && +r.fin<=+r.ini) return 'El final del rango debe ser mayor que el inicio del rango';
    if(r.cost==='' || +r.cost<0) return 'El precio de costo es obligatorio y debe ser > 0';
    if(!(+r.price>0)) return 'El precio de venta es obligatorio y debe ser > 0';
    if((j>0 && +r.ini!==+R[j-1].fin+1) || (j===0 && +r.ini!==1)) return 'Los rangos no pueden solaparse o tener saltos'; }
  return '';
}
function ldPinta(){
  const d = tf.draft, l = LD.l, dis = LD.ro ? 'disabled' : '', k = kind(d.clase), E = LD.E || {}, pr = l.calc==='PR';
  const list = svcList(d.clase).filter(s=>s.id===l.svc || !d.lines.some((x,j)=>x.svc===s.id && j!==LD.i));
  const units = [...new Set([svcInfo(l.svc).unit, 'Servicio', 'Unidad', 'Día', 'Tonelada', 'Contenedor'].filter(Boolean))];
  const e = key => E[key] ? `<div class="f-err">${E[key]}</div>` : '';
  const num = key => `<input ${dis} inputmode="decimal" value="${esc(l[key]??'')}" oninput="agTfL('${key}',this.value)">${e(key)}`;
  const chk = (key, lbl) => `<label class="fac-chk"><input type="checkbox" ${dis} ${l[key]?'checked':''} onchange="agTfL('${key}',this.checked,1)"> ${lbl}</label>`;
  let h = `<h3>Detalles de Servicio</h3><div style="height:10px"></div><div class="fac-g3">
    ${fld('Servicios *', sel(list.map(s=>[s.id, `${s.ser} - ${s.name}`]), l.svc, `${dis} onchange="agTfL('svc',this.value,1)"`, 'Elegir Servicio')+e('svc'), 'fac-span2')}
    ${fld('Tipo de Cálculo *', sel([['PQ','Por Cantidad (PQ)'],['PR','Por Rango (PR)']], l.calc, `${dis} onchange="agTfL('calc',this.value,1)"`, 'Elegir Tipo de Cálculo')+e('calc'))}
    ${fld('Unidad *', sel(units, l.unit, `${dis} onchange="agTfL('unit',this.value)"`, 'Elegir Unidad')+e('unit'))}`;
  if(!pr) h += fld('Factor por Unidad', num('factor')) + fld('Cantidad Mínima *', num('minQty')) + fld('Precio de Costo', num('cost')) + fld('Precio de Venta *', num('price'));
  h += fld('Porcentaje de Tipo de Impuesto', num('vat')) + `<div class="fac-f" style="align-self:end">${chk('sujeto','Sujeto a Impuestos')}</div>`;
  const ex = [];
  if(k==='ovs') ex.push(chk('retro','Es Retroactivo'));
  if(k==='doc') ex.push(chk('mand','Es Mandatorio'));
  if(excep(d.clase)) ex.push(chk('montoEd','Monto editable'));
  if(k!=='com') ex.push(chk('desc','Aplicar descuento'));
  if(ex.length) h += `<div class="ag-chks" style="grid-column:1/-1">${ex.join('')}</div>`;
  if(l.desc) h += fld('Tipo de descuento *', sel([['P','Porcentaje'],['F','Fijo']], l.descType, `${dis} onchange="agTfL('descType',this.value,1)"`, 'Elegir Tipo de descuento')+e('descType')) + fld('Valor de descuento *', num('descVal'));
  h += `<div ${CC.propuesta('I-111','Monto mínimo por servicio')}>${fld('Monto mínimo', num('min'))}</div>`;
  if(!excep(d.clase)) h += `<div ${P('Precio editable en la PDA')} style="align-self:end">${chk('editable','Editable en la PDA')}</div>`;
  h += '</div>';
  if(pr){
    const bad = rangosMal(l.ranges);
    h += `<div class="fac-sec ag-sech">Rangos${LD.ro?'':`<span><button type="button" class="cc-btn ghost" onclick="agTfRng()">Agregar</button><button type="button" class="cc-btn pink" ${Object.values(LD.rsel).some(Boolean)?'':'disabled'} onclick="agTfRngDel()">Eliminar</button></span>`}</div>
      <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Inicio de Rango</th><th>Fin de Rango</th><th>Precio de Costo</th><th>Precio de Venta</th></tr></thead><tbody>
      ${l.ranges.map((r,j)=>`<tr><td><input type="checkbox" ${dis} ${LD.rsel[j]?'checked':''} onchange="agTfRngSel(${j},this.checked)"></td>${['ini','fin','cost','price'].map(x=>`<td><input ${dis} inputmode="decimal" style="width:110px" value="${esc(r[x]??'')}" onchange="agTfRngSet(${j},'${x}',this.value)"></td>`).join('')}</tr>`).join('') || '<tr><td colspan="5" class="fac-empty">Sin rangos.</td></tr>'}
      </tbody></table></div>${bad && l.ranges.length?`<div class="f-err">${bad}</div>`:''}`;
  }
  h += `<div class="fac-btns"><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">${LD.ro?'Cerrar':'Cancelar'}</button>${LD.ro?'':'<button type="button" class="cc-btn" id="ldOk" onclick="agTfLineOk()">Guardar</button>'}</div>`;
  CC.modal(h, 'lg');
}
W.agTfL = (k, v, re) => { const l = LD.l; l[k] = v; if(LD.E) delete LD.E[k];
  if(k==='svc') l.unit = svcInfo(v).unit || '';
  if(k==='desc' && !v){ l.descType = ''; l.descVal = ''; } if(k==='descType') l.descVal = '';
  if(k==='calc' && v==='PR' && !l.ranges.length) l.ranges = [{ini:1, fin:'', cost:0, price:''}];
  if(re) ldPinta(); };
W.agTfRng = () => { const R = LD.l.ranges, last = R[R.length-1]; R.push({ini: last && last.fin ? +last.fin+1 : '', fin:'', cost:0, price:''}); ldPinta(); };
W.agTfRngSel = (j, on) => { LD.rsel[j] = on; ldPinta(); };
W.agTfRngDel = () => confirmar('Confirmación','¿Estás seguro de que deseas eliminar los rangos seleccionados?', ()=>{ LD.l.ranges = LD.l.ranges.filter((r,j)=>!LD.rsel[j]); LD.rsel = {}; ldPinta(); }, null, ()=>ldPinta());
W.agTfRngSet = (j, k, v) => { LD.l.ranges[j][k] = v; ldPinta(); };
W.agTfLineOk = function(){
  const l = LD.l, E = {}, pr = l.calc==='PR';
  if(!l.svc) E.svc = 'Obligatorio'; if(!l.calc) E.calc = 'Obligatorio'; if(!l.unit) E.unit = 'Obligatorio';
  if(!pr){ if(!(+l.minQty>=1)) E.minQty = 'Debe ser mayor o igual a 1'; if(!(+W.parseNum(l.price)>0)) E.price = 'Debe ser mayor a 0'; }
  if(+l.vat<0 || +l.vat>100) E.vat = 'Debe estar entre 0 y 100';
  if(l.desc){ if(!l.descType) E.descType = 'Obligatorio'; if(l.descVal==='' || !(+l.descVal>=0)) E.descVal = 'Obligatorio'; else if(l.descType==='P' && +l.descVal>100) E.descVal = 'El porcentaje de descuento debe estar entre 0.00 y 100.00'; }
  if(Object.keys(E).length){ LD.E = E; ldPinta(); CC.toast('Por favor revise los campos marcados','error'); return; }
  if(pr && !l.ranges.length){ CC.toast('Por favor ingrese un item en los rangos','error'); return; }
  if(pr && rangosMal(l.ranges)){ CC.toast('Algunos rangos son inválidos, por favor revíselos','error'); return; }
  ['factor','minQty','cost','price','vat','min','descVal'].forEach(x=>{ l[x] = W.parseNum(l[x]) || 0; });
  if(pr){ l.ranges = l.ranges.map(r=>({ini:+r.ini, fin:r.fin===''||r.fin==null?'':+r.fin, cost:+r.cost||0, price:+r.price})); l.price = l.ranges[0].price; }
  const d = tf.draft; if(LD.i>-1) d.lines[LD.i] = l; else d.lines.push(l);
  if(!d.ref) d.ref = svcInfo(l.svc).name;
  mark(); CC.cerrarModal(); W.renderTfEditor();
};

/* ---------- Guardar, Cancelar, Eliminar, estados ---------- */
W.saveTariff = W.agTfGuardar = function(){
  const d = tf.draft, k = kind(d.clase);
  const sum = ['comLinea','comRep','comCosmos'].reduce((a,x)=>a+(W.parseNum(d[x])||0),0);
  if(sum > 100){ CC.toast('Las comisiones no deben superar el 100%','error'); return; }
  const req = ['ref','clase','currency','from','to'].concat(k!=='ovs'?['contrato']:[]).concat(d.tipoTarifa==='Tercero Externo'?['proveedor']:[]);
  if(req.some(x=>!String(d[x]||'').trim()) || (d.from && d.to && d.from > d.to)){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(k==='ovs' && d.split){ if(d.unidadQ==='' || d.unidadQ==null){ CC.toast('Ingrese unidad de quiebre','error'); return; } if(!(Number.isInteger(+d.unidadQ) && +d.unidadQ>=1)){ CC.toast('La unidad de quiebre debe ser un entero positivo','error'); return; } }
  if(!d.crit.length && !d.lines.length){ CC.toast('Por favor ingrese al menos un criterio comercial o servicio','error'); return; }
  if(!d.crit.length){ tf.tab = 'crit'; W.renderTfEditor(); CC.toast('Por favor ingrese al menos un criterio comercial','error'); return; }
  const user = CC.usuario(), ts = new Date().toISOString(), oldId = tf.selId;
  if(tf.isNew){
    if(d.contrato==='Lumpsum'){ d.code = 'L' + d.code.slice(1); d.id = d.code; }
    d.status = 'Pendiente'; d.hist = [{ts, user, prev:'', next:'Pendiente', comment: d.prevCode ? `Creación de tarifa (nueva versión de ${d.prevCode})` : 'Creación de tarifa'}];
  } else {
    const prev = d.status;
    if(prev!=='Pendiente'){ d.status = 'Pendiente'; d.hist.push({ts, user, prev, next:'Pendiente', comment:'Edición de tarifa: Se reinicia el flujo de aprobación.'}); }
    else d.hist.push({ts, user, prev, next:prev, comment:'Edición de tarifa'});
  }
  const i = TARIFFS.findIndex(x=>x.id===oldId);
  if(i>-1) TARIFFS[i] = clone(d); else TARIFFS.push(clone(d));
  W.log('Tarifas', `${tf.isNew?'Creó':'Editó'} la tarifa ${d.code} "${d.ref}"`, user);
  const nueva = tf.isNew; tf.selId = d.id; tf.isNew = false; tf.edit = false; tf.dirty = false; TS.ms = {}; TS.sel = {};
  W.showTfView('detail'); W.renderTfEditor();
  CC.toast(nueva ? `La tarifa ${d.code} se ha registrado correctamente` : 'La tarifa se ha actualizado correctamente','success');
};
W.discardTariff = function(){
  const go = () => { tf.dirty = false; TS.ms = {}; TS.sel = {};
    if(tf.isNew){ tf.isNew = false; tf.draft = null; tf.edit = false; W.showTfView('list'); W.renderTfList(); return; }
    W.selectTariff(tf.selId, true); };
  if(tf.dirty) confirmar('Descartar Cambios','Tienes cambios no guardados. ¿Estás seguro de que deseas descartarlos?', go); else go();
};
W.tfConfirmDiscard = () => !tf.dirty || confirm('Tienes cambios no guardados. ¿Estás seguro de que deseas descartarlos?');
W.agTfEliminar = () => confirmar('Confirmación','¿Estás seguro de que deseas eliminar esta Tarifa?', ()=>{
  const t = TARIFFS.find(x=>x.id===tf.selId);
  if(!t || t.status!=='Pendiente'){ CC.toast("Solo se pueden eliminar tarifas en estado 'Pendiente'. Para dar de baja una tarifa aprobada, utilice la opción de Anular.",'error'); return; }
  TARIFFS.splice(TARIFFS.indexOf(t), 1); tf.dirty = false; tf.edit = false; tf.draft = null;
  CC.toast('La tarifa se ha eliminado correctamente','success'); W.showTfView('list'); W.renderTfList();
});
W.agTfAprobar = function(){
  const t = TARIFFS.find(x=>x.id===tf.selId); if(!t) return;
  if(t.status!=='Pendiente'){ CC.toast("Solo se pueden aprobar tarifas en estado 'Pendiente'.",'error'); return; }
  if(!t.crit.length){ CC.toast('Se necesita al menos un criterio comercial para poder aprobar una tarifa','error'); return; }
  if(!t.lines.length){ CC.toast('Se necesita al menos un servicio para poder aprobar una tarifa','error'); return; }
  confirmar('Confirmar Aprobación','¿Está seguro de aprobar esta tarifa?', ()=>W.approveTariff());
};
W.agTfMotivo = function(next){
  if(next==='Rechazada' && !W.canApproveTariffs()){ CC.toast('Solo Gerencia rechaza tarifas','error'); return; }
  CC.modal(`<h3>${next==='Anulada'?'Anular Tarifa':'Rechazar Tarifa'}</h3><div style="height:10px"></div><div class="fac-f"><label>Motivo</label><textarea id="tfMot" rows="4" maxlength="200" oninput="document.getElementById('tfMotN').textContent=this.value.length+' / 200';document.getElementById('tfMotE').style.display=this.value.trim()?'none':''"></textarea>
    <div class="ag-cnt" id="tfMotN">0 / 200</div><div class="f-err" id="tfMotE" style="display:none">El motivo es obligatorio</div></div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="tfMotOk" onclick="agTfMotivoOk('${next}')">Confirmar</button></div>`);
  setTimeout(()=>$('tfMot')?.focus(), 40);
};
W.agTfMotivoOk = function(next){
  const txt = $('tfMot').value.trim(); if(!txt){ $('tfMotE').style.display = ''; return; }
  CC.cerrarModal(); W.tfSetStatus(next, txt);
  CC.toast(next==='Anulada' ? 'La tarifa se ha anulado correctamente' : 'La tarifa se ha rechazado correctamente', 'success');
};
W.askTfReason = W.agTfMotivo;
W.openTfHistory = function(){
  const H = (tf.draft.hist||[]).slice().sort((a,b)=>String(a.ts).localeCompare(String(b.ts)));
  CC.modal(`<h3>Historial de Cambios</h3><div style="height:10px"></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Fecha</th><th>Usuario</th><th>Estado Anterior</th><th>Nuevo Estado</th><th>Comentario / Motivo</th></tr></thead><tbody>
    ${H.map(h=>`<tr><td>${W.vyFmt(h.ts)}</td><td>${esc(h.user||'')}</td><td>${esc(h.prev||'')}</td><td>${esc(h.next||'')}</td><td style="white-space:normal">${esc(h.comment||'-')}</td></tr>`).join('') || '<tr><td colspan="5" class="fac-empty">No hay historial registrado para esta tarifa.</td></tr>'}
    </tbody></table></div><div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'lg');
};

const gq = s => D.querySelector(s), gqt = (s, t) => [...D.querySelectorAll(s)].find(e=>e.textContent.trim()===t);
GUIDES.screenTariffs = [
  {t:'Buscar una tarifa', steps:[
    {go:()=>{ if(tf.view!=='list') W.backToTfList(); }, el:'#tfFilters', h:'Buscar Tarifa', p:'La Clase cambia los filtros. Pulse Buscar.'}]},
  {t:'Crear una tarifa', need:()=>W.canEditTariffs(), steps:[
    {go:()=>{ if(tf.view!=='list') W.backToTfList(); }, el:'#tfNewBtn', h:'+ Nuevo', p:'Abre una tarifa en blanco.'},
    {go:()=>{ if(tf.view!=='detail') W.newTariff(); }, el:()=>gq('#tfEditor .ag-fg'), h:'Información General', p:'Referencia, clase, contrato, moneda y vigencia.'},
    {go:()=>W.agTfTab('crit'), el:()=>gq('#tfEditor .md-body'), h:'Criterios Comerciales', p:'Elija valores y pulse Agregar: se crea una fila por combinación.'},
    {go:()=>W.agTfTab('svc'), el:()=>gq('#tfEditor .md-body'), h:'Servicios', p:'Agregar abre Detalles de Servicio: Por Cantidad o Por Rango.'},
    {el:()=>gqt('#tfEditor button','Crear'), h:'Crear', p:'Queda Pendiente hasta que Gerencia la apruebe.'}]},
  {t:'Aprobar una tarifa', steps:[
    {go:()=>{ const t = TARIFFS.find(x=>x.status==='Pendiente' && x.tipo===W.activeCatalogKey()); if(t) W.selectTariff(t.id,true); }, el:()=>gq('#tfEditor .md-actions'), h:'Aprobar o rechazar', p:'Solo Gerencia. Rechazar o anular pide el motivo.'},
    {el:()=>gq('#tfEditor .tf-hist'), h:'Historial de Cambios', p:'Quién la creó, aprobó o anuló y por qué.'}]}
];
})();
