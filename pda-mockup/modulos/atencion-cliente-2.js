/* Módulo: Atención al cliente (parte 2)
   Pantallas: Direccionamiento de Vacíos (con prototipo HU-ATC-02), Sobreestadía, Daño de Contenedores,
   Gestión de Suspensiones y Aprobación de Usuarios Web. Usa los helpers window.AC de atencion-cliente.js. */
(function(){
'use strict';
const AC = window.AC;
if(!AC || !AC.dlg){ console.warn('atencion-cliente-2: falta atencion-cliente.js'); return; }
const esc = x => CC.esc(x);
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const G = 'Atención al cliente';
const depNom = k => (AC.dep(k) || {razon:k||'-'}).razon;
const depDir = k => (AC.dep(k) || {}).dir || '';

/* ============================================================
   5. DIRECCIONAMIENTO DE VACÍOS
============================================================ */
const DV = { tab:'aprob', f1:{linea:'',nave:'',viaje:'',ini:'',fin:'',bl:'',cont:''}, res1:null, edit1:false, sel1:[], f2:{linea:'',ini:'',fin:''}, res2:null, sel2:[], exp:[],
  vista:'tabs', form:null, lista:null, seq:127, grabado:{}, prev:false, resumen:null, fr:{q:'',dep:'',regla:'',estado:''} };
const DV_TIPOS = ['Por Contenedor','Por Vigencia','Por Tipo/Tamaño','Por Depósito'];
const DV_FAM = AC.iso.concat([['ESP','Especiales']]);
const dvId = n => `RI${String(n).padStart(6,'0')}`;
const MAYUS = {Borrador:'BORRADOR', Pendiente:'PENDIENTE', Aprobado:'APROBADO', Rechazado:'RECHAZADO'};
function dvSeed(){
  if(DV.lista) return;
  const imp = CC.datos.contenedores.filter(c=>c.indicador==='Importación');
  const cont = (c, dep) => ({num:c.numero, tipo:AC.isoDe(c.tipo), nave:c.nave, viaje:c.viaje, puerto:'Callao', dep, dir:depDir(dep), bl:c.bl, cliente:(AC.bls().find(b=>b.numero===c.bl)||{}).consignatario||'', prov:false});
  const base = (n, linea, tipo, estado, extra) => Object.assign({id:dvId(n), linea, sucursal:'Callao', tipo, estado, bl:'', memo:'', cliente:'', vigIni:'', vigFin:'', viaje:'', nave:'', puerto:'', dep:'', dir:'', prioridad:'', modo:'', familias:[], contenedores:[], adjuntos:[AC.archivo('Instruccion_linea','pdf')], motivo:''}, extra||{});
  DV.lista = [
    base(121,'ZIM','Por Vigencia','Aprobado', {vigIni:'2026-11-01', vigFin:'2026-12-31', dep:'3014', dir:depDir('3014')}),
    base(122,'ZIM','Por Contenedor','Pendiente', {contenedores: imp[4] ? [cont(imp[4],'3022')] : [], bl: imp[4] ? imp[4].bl : '', viaje: imp[4] ? imp[4].viaje : '', nave: imp[4] ? imp[4].nave : ''}),
    base(123,'ZIM','Por Tipo/Tamaño','Pendiente', {modo:'Por Porcentaje', familias:[{fam:'42G1', lineas:[{dep:'3014', val:60},{dep:'3022', val:40}]}]}),
    base(124,'ZIM','Por Depósito','Aprobado', {dep:'3035', dir:depDir('3035'), prioridad:1}),
    base(125,'MSK','Por Vigencia','Rechazado', {vigIni:'2026-10-01', vigFin:'2026-10-31', dep:'3022', dir:depDir('3022'), motivo:'La vigencia no coincide con la carta de la línea.'}),
    base(126,'ZIM','Por Contenedor','Borrador', {contenedores: imp[3] ? [cont(imp[3],'3014')] : []}),
    base(127,'NAP','Por Vigencia','Borrador', {vigIni:'2026-12-01', vigFin:'2027-01-31', dep:'3014', dir:depDir('3014')})
  ];
  const aprob = DV.lista.find(i=>i.estado==='Aprobado' && i.tipo==='Por Contenedor'); void aprob;
}
/* Usado por Liberación de la Carga: depósito de un contenedor según instrucciones aprobadas o preasignación grabada */
AC.depositoInstruccion = num => {
  dvSeed();
  const i = DV.lista.find(x=>x.estado==='Aprobado' && x.tipo==='Por Contenedor' && x.contenedores.some(c=>c.num===num));
  if(i){ const c = i.contenedores.find(c=>c.num===num); return {dep:depNom(c.dep), origen:'Instrucción por contenedor'}; }
  for(const k in DV.grabado){ const g = DV.grabado[k][num]; if(g && g.dep) return {dep:depNom(g.dep), origen:'Preasignación'}; }
  return null;
};
const dvDepTxt = i => { const ds = i.tipo==='Por Contenedor' ? [...new Set(i.contenedores.map(c=>c.dep))] : i.tipo==='Por Tipo/Tamaño' ? [...new Set(i.familias.flatMap(f=>f.lineas.map(l=>l.dep)))] : (i.dep ? [i.dep] : []);
  return ds.length > 1 ? `${ds.length} depósitos` : ds.length ? depNom(ds[0]) : '-'; };
const dvCant = i => i.tipo==='Por Contenedor' ? i.contenedores.length : i.tipo==='Por Tipo/Tamaño' && i.modo==='Por Cantidad' ? i.familias.reduce((a,f)=>a+f.lineas.reduce((b,l)=>b+Number(l.val||0),0),0) : '-';
const dvTipoTxt = i => i.tipo==='Por Depósito' ? `Por Depósito - ${i.prioridad}` : i.tipo;
function dvGrid(lista, aprob, selMode){
  const sel = aprob ? DV.sel1 : DV.sel2, puede = i => aprob ? (DV.edit1 && i.estado==='Pendiente') : i.estado==='Borrador';
  const heads = ['', 'ID Instrucción', 'Línea Naviera', 'Sucursal'].concat(aprob ? ['BL','MEMO'] : []).concat(['Cliente','Tipo de Instrucción','Vigencia','Viaje','Puerto Operativo','Nave','Depósito','Cant. Cont.','Estado','Adjuntos']).concat(aprob ? [] : ['Acciones']);
  const fila = i => { const exp = ['Por Vigencia','Por Contenedor','Por Tipo/Tamaño'].includes(i.tipo), abierto = DV.exp.includes(i.id);
    const celdas = [`<div class="ac-row" style="flex-wrap:nowrap">${selMode && puede(i) ? `<input type="checkbox" ${sel.includes(i.id)?'checked':''} onchange="dvSel('${i.id}',this.checked,${aprob?1:0})">` : ''}${exp ? `<button type="button" class="fac-link" title="Ver detalle" data-exp="${i.id}" onclick="dvExp('${i.id}')">${abierto?'▾':'▸'}</button>` : ''}</div>`,
      aprob ? esc(i.id) : AC.link(i.id, `dvAbrir('${i.id}','ver')`, `data-ri="${i.id}"`), esc(AC.lineaNombre(i.linea)), esc(i.sucursal)]
      .concat(aprob ? [esc(i.bl || (i.contenedores[0]||{}).bl || '-'), esc(i.memo || '-')] : [])
      .concat([esc(i.cliente || '-'), esc(dvTipoTxt(i)), i.vigIni ? `${AC.f(i.vigIni)} al ${AC.f(i.vigFin)}` : '-', esc(i.viaje || '-'), esc(i.puerto || '-'), esc(i.nave || '-'), esc(dvDepTxt(i)), esc(dvCant(i)),
        `${CC.chipEstado(MAYUS[i.estado], i.estado==='Aprobado'?'aprobada':i.estado==='Rechazado'?'rechazada':'pendiente')}${i.motivo?`<div class="ac-mut" title="${esc(i.motivo)}">Motivo: ${esc(i.motivo.slice(0,30))}</div>`:''}`,
        AC.link('📎', `dvAdjuntos('${i.id}')`, `title="Ver Adjuntos" ${i.adjuntos.length?'':'disabled'}`)])
      .concat(aprob ? [] : [i.estado==='Borrador' ? `<div class="fac-rowacts">${AC.link('Editar', `dvAbrir('${i.id}','editar')`)}${AC.link('Eliminar', `dvEliminar('${i.id}')`)}</div>` : '']);
    let det = '';
    if(abierto){
      det = `<tr><td colspan="${heads.length}" class="fac-expand"><div class="fac-expand-in">` + (i.tipo==='Por Contenedor'
        ? `<div class="fac-sec">CONTENEDORES (${i.contenedores.length})</div>` + AC.tabla([{t:'Número de Contenedor', v:c=>`${esc(c.num)}${c.prov?' <span class="ac-prov cc-prop">Provisional</span>':''}`}, {t:'Tipo/Tamaño', v:c=>esc(AC.isoTxt(c.tipo))}, {t:'Nave', v:c=>esc(c.nave||'-')}, {t:'Viaje', v:c=>esc(c.viaje||'-')}, {t:'Puerto de Descarga', v:c=>esc(c.puerto||'-')}, {t:'Depósito', v:c=>esc(depNom(c.dep))}], i.contenedores, 'No hay líneas de contenedor en el detalle.')
        : i.tipo==='Por Tipo/Tamaño'
        ? `<div class="fac-sec">TIPO / TAMAÑO</div>` + AC.tabla([{t:'Tipo / tamaño', k:'fam'}, {t:'Depósito', k:'dep'}, {t:i.modo==='Por Porcentaje'?'Porcentaje':'Cantidad', k:'val'}], i.familias.flatMap(f=>f.lineas.map(l=>({fam:f.fam==='ESP'?'Especiales':AC.isoTxt(f.fam), dep:depNom(l.dep), val:i.modo==='Por Porcentaje'?l.val+'%':l.val}))), 'No hay datos de tipo/tamaño o distribución para mostrar.')
        : `<div class="fac-sec">DEPÓSITOS (1)</div><div class="ac-mut">Cliente: ${esc(i.cliente||'-')} · Nave: ${esc(i.nave||'-')} · Viaje: ${esc(i.viaje||'-')} · Puerto: ${esc(i.puerto||'-')}</div>` + AC.tabla([{t:'Depósito', v:x=>esc(depNom(x.dep))}, {t:'Dirección', v:x=>esc(x.dir||'-')}], i.dep ? [i] : [], 'No hay depósitos registrados en el detalle (opcional).'))
        + '</div></td></tr>';
    }
    return `<tr>${celdas.map(c=>`<td>${c}</td>`).join('')}</tr>${det}`;
  };
  return `<div class="fac-scroll"><table class="fac-tbl"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${lista.length ? lista.map(fila).join('') : `<tr><td colspan="${heads.length}" class="fac-empty">No hay instrucciones registradas</td></tr>`}</tbody></table></div>`;
}
window.dvExp = id => { DV.exp = DV.exp.includes(id) ? DV.exp.filter(x=>x!==id) : DV.exp.concat(id); dvLeerF(); dvPintar(); };
window.dvSel = (id, on, aprob) => { const k = aprob ? 'sel1' : 'sel2'; DV[k] = on ? [...new Set(DV[k].concat(id))] : DV[k].filter(x=>x!==id); dvLeerF(); dvPintar(); };
const dvSelRes = () => DV.f1.linea && DV.f1.nave && DV.f1.viaje;
function dvLeerF(){
  if($('dvF1Lin')) ['linea:dvF1Lin','nave:dvF1Nave','viaje:dvF1Viaje','ini:dvF1Ini','fin:dvF1Fin','bl:dvF1Bl','cont:dvF1Cont'].forEach(x=>{ const [k,id] = x.split(':'); DV.f1[k] = AC.v(id); });
  if($('dvF2Lin')) ['linea:dvF2Lin','ini:dvF2Ini','fin:dvF2Fin'].forEach(x=>{ const [k,id] = x.split(':'); DV.f2[k] = AC.v(id); });
}
function dvPintar(){
  CC.refrescar('screenAcDirVacios');
  if(DV.vista==='form'){ const t = DV.form.modo==='crear' ? 'Nueva Instrucción' : 'Editar Instrucción'; CC.barra(t, ['Inicio','Direccionamiento de Vacíos', `${DV.form.modo==='crear'?'Crear':'Editar'} Instrucción de Direccionamiento`], 'dvVolver()'); }
}
window.dvTab = t => { dvLeerF(); DV.tab = t; if(t==='reg' && !DV.res2) dvBuscar2(true); dvPintar(); };
window.dvCambio = () => { dvLeerF(); if(!DV.f1.linea) DV.f1.nave = DV.f1.nave; dvPintar(); };
window.dvBuscar1 = () => {
  dvLeerF(); const f = DV.f1;
  if(!(f.bl || f.cont || (f.linea && f.nave && f.viaje))) return;
  DV.res1 = DV.lista.filter(i=>i.estado!=='Borrador' && i.sucursal==='Callao' && (f.bl || f.cont || (i.linea===f.linea && (!i.viaje || (i.viaje===f.viaje && i.nave===f.nave))))
    && (!f.bl || AC.tiene(i.bl, f.bl) || i.contenedores.some(c=>AC.tiene(c.bl, f.bl))) && (!f.cont || i.contenedores.some(c=>AC.tiene(c.num, f.cont)))
    && (!f.ini || !i.vigFin || i.vigFin >= f.ini) && (!f.fin || !i.vigIni || i.vigIni <= f.fin));
  DV.edit1 = false; DV.sel1 = []; DV.resumen = null; DV.prev = false; dvPintar();
  if(!DV.res1.length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info');
};
window.dvLimpiar1 = () => { DV.f1 = {linea:'',nave:'',viaje:'',ini:'',fin:'',bl:'',cont:''}; DV.res1 = null; DV.edit1 = false; DV.sel1 = []; if(DV.tab==='res') DV.tab = 'aprob'; dvPintar(); };
window.dvEditar1 = () => { dvLeerF(); DV.edit1 = true; dvPintar(); };
window.dvAprobar = () => dvConfirmar(true);
window.dvRechazar = () => dvConfirmar(false);
function dvConfirmar(aprobar){
  const n = DV.sel1.length;
  const html = AC.cab(aprobar ? 'Aprobar Instrucciones' : 'Rechazar Instrucciones') + `<p class="ac-p"><b>${aprobar ? '¿Desea aprobar el registro?' : '¿Desea rechazar el registro?'}</b></p><p class="ac-p">${n} registro(s) seleccionado(s)</p>
    <p class="ac-p">${aprobar ? 'Los registros seleccionados serán aprobados y podrán continuar con el proceso.' : 'Los registros seleccionados serán rechazados.'}</p>`
    + (aprobar ? '' : `${CC.campo('Motivo de rechazo *', '<textarea id="dvRM" rows="3" maxlength="500" placeholder="Ingrese el motivo del rechazo..." oninput="acMotivoAyuda(\'dvRM\',10)"></textarea><div class="ac-mut" id="dvRM_h">El motivo debe tener al menos 10 caracteres</div>')}`)
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Aceptar', AC.cb(()=>{
      const m = aprobar ? '' : AC.v('dvRM');
      if(!aprobar && m.length < 10){ CC.toast('El motivo debe tener al menos 10 caracteres','error'); return; }
      DV.lista.filter(i=>DV.sel1.includes(i.id)).forEach(i=>{ i.estado = aprobar ? 'Aprobado' : 'Rechazado'; i.motivo = m; });
      AC.cerrar(); DV.sel1 = []; DV.edit1 = false; dvBuscar1();
      CC.toast(aprobar ? `${n} instrucción(es) aprobada(s) exitosamente` : `${n} instrucción(es) rechazada(s) exitosamente`,'success');
    }), '', 'data-ac="dv-aceptar"'));
  AC.dlg(html, 'sm');
}
window.dvBuscar2 = silencio => { dvLeerF(); const f = DV.f2;
  DV.res2 = DV.lista.filter(i=>i.estado==='Borrador' && i.sucursal==='Callao' && (!f.linea || i.linea===f.linea) && (!f.ini || !i.vigFin || i.vigFin >= f.ini) && (!f.fin || !i.vigIni || i.vigIni <= f.fin));
  DV.sel2 = DV.sel2.filter(id=>DV.res2.some(i=>i.id===id));
  if(silencio!==true){ dvPintar(); if(!DV.res2.length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); } };
window.dvLimpiar2 = () => { DV.f2 = {linea:'',ini:'',fin:''}; DV.res2 = null; DV.sel2 = []; dvBuscar2(true); dvPintar(); };
window.dvEnviar = () => { const n = DV.sel2.length; AC.confirmar('Confirmación', `¿Está seguro de enviar ${n} instrucción(es) a aprobación?`, ()=>{
  DV.lista.filter(i=>DV.sel2.includes(i.id)).forEach(i=>i.estado = 'Pendiente'); DV.sel2 = []; dvBuscar2(true); dvPintar(); CC.toast(`${n} instrucción(es) enviada(s) a aprobación exitosamente`,'success'); }); };
window.dvEliminar = id => AC.confirmar('Confirmación', `¿Está seguro de eliminar la instrucción ${id}?`, ()=>{ DV.lista = DV.lista.filter(i=>i.id!==id); dvBuscar2(true); dvPintar(); CC.toast('Instrucción eliminada exitosamente','success'); });
window.dvAdjuntos = id => { const i = DV.lista.find(x=>x.id===id); let bg; const borr = i.estado==='Borrador';
  const html = () => AC.cab('Archivos Adjuntos', `Instrucción ${esc(i.id)}`)
    + (borr ? `<div class="fac-sec">Subir Archivos</div><div class="ac-row">${AC.btn('Seleccionar Archivos', AC.cb(()=>{ i.adjuntos.push(AC.archivo('Adjunto_instruccion','pdf')); AC.repintar(bg, html()); CC.toast('Archivos subidos exitosamente','success'); }), 'ghost')}<span class="ac-mut">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Máx 10MB c/u.</span></div>` : '')
    + `<div class="ac-row" style="margin-top:12px"><div class="fac-sec" style="margin:0">Archivos Existentes</div><span class="ac-sp"></span>${i.adjuntos.length > 1 ? AC.btn('Descargar Todo', AC.cb(()=>AC.descargar(`${i.id}_adjuntos.zip`)), 'ghost') : ''}</div>`
    + (i.adjuntos.length ? `<div class="ac-files">${i.adjuntos.map((a,k)=>`<div><span>${esc(a.nombre)} <span class="ac-mut">${esc(a.tam)}</span></span><span class="fac-rowacts">${AC.link('Descargar', AC.cb(()=>AC.descargar(a.nombre)))}${borr ? AC.link('Eliminar', AC.cb(()=>{ i.adjuntos.splice(k,1); AC.repintar(bg, html()); CC.toast('Archivo eliminado exitosamente','success'); })) : ''}</span></div>`).join('')}</div>` : '<div class="ac-empty">No hay archivos adjuntos.</div>')
    + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-adj"'));
  bg = AC.dlg(html(), 'md'); };

/* Pestaña Resultado (preasignación) */
const dvKey = () => `${DV.f1.nave}|${DV.f1.viaje}`;
function dvCalcular(){
  const f = DV.f1, ap = DV.lista.filter(i=>i.estado==='Aprobado' && i.linea===f.linea), g = DV.grabado[dvKey()] || {};
  const conts = CC.datos.contenedores.filter(c=>c.indicador==='Importación' && c.nave===f.nave && c.viaje===f.viaje);
  return conts.map(c=>{ const iso = AC.isoDe(c.tipo), b = AC.bls().find(x=>x.numero===c.bl) || {};
    let dep = '', regla = '', motivo = '';
    const ic = ap.find(i=>i.tipo==='Por Contenedor' && i.contenedores.some(x=>x.num===c.numero));
    const iv = ap.find(i=>i.tipo==='Por Vigencia'), it = ap.find(i=>i.tipo==='Por Tipo/Tamaño' && i.familias.some(x=>x.fam===iso || x.fam==='ESP')), idp = ap.filter(i=>i.tipo==='Por Depósito').sort((a,b)=>a.prioridad-b.prioridad)[0];
    if(g[c.numero] && g[c.numero].memo){ dep = g[c.numero].dep; regla = 'Fijo: MEMO emitido'; }
    else if(ic){ dep = ic.contenedores.find(x=>x.num===c.numero).dep; regla = 'Fijo: instrucción por contenedor'; }
    else if(iv){ dep = iv.dep; regla = 'Fijo: instrucción permanente'; }
    else if(it){ const fa = it.familias.find(x=>x.fam===iso) || it.familias.find(x=>x.fam==='ESP'); dep = fa.lineas[0].dep; regla = it.modo==='Por Cantidad' ? 'Forzosa: cantidad' : 'Porcentaje (matriz)'; }
    else if(idp){ dep = idp.dep; regla = 'Último recurso: depósito'; }
    else motivo = 'Ningún depósito tiene porcentaje en todas las familias del BL.';
    const antes = g[c.numero] ? g[c.numero].dep : '';
    const estado = !dep ? 'Sin asignar' : g[c.numero] && g[c.numero].memo ? 'Emitida' : DV.prev ? (antes && antes!==dep ? 'Cambia' : antes ? 'Pendiente' : 'Calculada') : (antes ? 'Pendiente' : 'Calculada');
    return {bl:c.bl, cliente:b.consignatario || '-', cont:c.numero, tipo:iso, cond:'FCL', dep, antes: antes && antes!==dep ? antes : '', regla, motivo, memo:(g[c.numero]||{}).memo || '', estado};
  });
}
function dvResultadoHtml(){
  const f = DV.f1;
  if(!dvSelRes()) return `<div class="ac-empty">Elija Línea, Nave y Viaje en la pestaña de Instrucciones de Direccionamiento para ver el resultado.</div>`;
  const todas = dvCalcular(), fr = DV.fr, vj = CC.datos.viajes.find(v=>v.numero===f.viaje && v.nave===f.nave) || {};
  const filas = todas.filter(r=>(!fr.q || AC.tiene(r.bl, fr.q) || AC.tiene(r.cont, fr.q)) && (!fr.dep || (fr.dep==='SIN' ? !r.dep : r.dep===fr.dep)) && (!fr.regla || r.regla===fr.regla) && (!fr.estado || r.estado===fr.estado));
  const n = e => todas.filter(r=>r.estado===e).length, bls = new Set(todas.map(r=>r.bl)).size, sinA = todas.filter(r=>!r.dep);
  const porDep = {}; todas.forEach(r=>{ const k = r.dep || 'SIN'; (porDep[k] = porDep[k] || {c:0, b:new Set()}).c++; porDep[k].b.add(r.bl); });
  const reglas = ['Fijo: MEMO emitido','Fijo: instrucción del BL','Fijo: instrucción por contenedor','Fijo: instrucción permanente','Forzosa: cantidad','Porcentaje (matriz)','Último recurso: depósito'];
  return `<div class="ac-row"><h3 style="margin:0">Resultado de la preasignación</h3><span class="ac-sp"></span>
      ${AC.btn('Exportar','dvExportarRes()','ghost', todas.length ? 'id="dvExportar"' : 'disabled')}${AC.btn('Generar','dvGenerar()','ghost', todas.length ? 'id="dvGenerar"' : 'disabled')}${AC.btn('Asignar','dvAsignar()','', DV.prev ? 'id="dvAsignar"' : 'id="dvAsignar" disabled')}</div>`
    + (DV.prev ? `<div class="fac-note warn">Vista previa generada: aún no se grabó. Use Asignar para grabarla.<br>Sin asignar: ${new Set(sinA.map(r=>r.bl)).size} BL y ${sinA.length} contenedores. Cambian de depósito: ${n('Cambia')} contenedores.</div>` : '')
    + (sinA.length ? `<div class="fac-note err">Hay contenedores sin asignar. No impiden asignar el resto.<br>${sinA.map(r=>`${esc(r.bl)} · ${esc(r.cont)}: ${esc(r.motivo)}`).join('<br>')}</div>` : '')
    + (DV.resumen ? `<div class="fac-note" id="dvResumen"><b>Preasignación grabada</b><br>Creadas: ${DV.resumen.c} · Anuladas: ${DV.resumen.a} · Sin cambio: ${DV.resumen.s} · Emitidas: 0 · Sin asignar: ${DV.resumen.u}</div>` : '')
    + (!todas.length ? '<div class="ac-empty">La nave y el viaje no tienen contenedores en la preasignación.</div>' : `
      <div class="fac-note">Nave: <b>${esc(f.nave)}</b> · Viaje: <b>${esc(f.viaje)}</b> · Sucursal: <b>Callao</b> · Llegada (estimada): <b>${AC.f(vj.eta)}</b><br>Contenedores que entran: ${todas.length} contenedores en ${bls} BL</div>
      <div class="ac-cards"><div>Total<b>${todas.length}</b></div><div>Sin asignar<b>${sinA.length}</b></div><div>Calculadas<b>${n('Calculada')}</b></div><div>Pendientes<b>${n('Pendiente')+n('Cambia')}</b><span>${n('Cambia')} cambian de depósito</span></div><div>Emitidas<b>${n('Emitida')}</b></div></div>
      <div class="fac-sec">Total por depósito</div>${AC.tabla([{t:'Depósito', v:k=>k==='SIN' ? 'Sin asignar' : esc(depNom(k))}, {t:'Contenedores', v:k=>`${porDep[k].c} contenedores · ${porDep[k].b.size} BL`}], Object.keys(porDep), 'Sin contenedores.')}
      <div class="fac-g4" style="margin-top:12px">${CC.campo('BL o contenedor', `<input id="dvRQ" value="${esc(fr.q)}">`)}${CC.campo('Depósito', CC.selector([['SIN','Sin asignar']].concat(AC.depositos.map(d=>[d.codigo,d.razon])), fr.dep, 'id="dvRDep"', 'Todos'))}
        ${CC.campo('Regla', CC.selector(reglas, fr.regla, 'id="dvRRegla"', 'Todas'))}${CC.campo('Estado', CC.selector(['Calculada','Pendiente','Cambia','Emitida','Anulada','Sin asignar'], fr.estado, 'id="dvREst"', 'Todos'))}</div>
      <div class="fac-btns" style="position:static">${AC.btn('Filtrar','dvFiltrarRes()','ghost')}</div>
      ${filas.length ? AC.tabla([{t:'BL', k:'bl'}, {t:'Cliente', k:'cliente'}, {t:'Contenedor', k:'cont'}, {t:'Tipo / tamaño', v:r=>esc(AC.isoTxt(r.tipo))}, {t:'Condición', k:'cond'},
        {t:'Depósito', v:r=>r.dep ? `${esc(depNom(r.dep))}${r.antes?`<div class="ac-mut">Antes: ${esc(depNom(r.antes))}</div>`:''}` : `Sin asignar<div class="ac-mut">${esc(r.motivo)}</div>`},
        {t:'Regla aplicada', v:r=>esc(r.regla||'-')}, {t:'MEMO', v:r=>esc(r.memo||'-')}, {t:'Estado', v:r=>CC.chipEstado(r.estado, r.estado==='Sin asignar'?'rechazada':r.estado==='Emitida'?'aprobada':'pendiente')}], filas) : '<div class="ac-empty">Ningún contenedor coincide con los filtros.</div>'}`);
}
window.dvFiltrarRes = () => { DV.fr = {q:AC.v('dvRQ'), dep:AC.v('dvRDep'), regla:AC.v('dvRRegla'), estado:AC.v('dvREst')}; dvPintar(); };
window.dvGenerar = () => { DV.prev = true; DV.resumen = null; dvPintar(); };
window.dvExportarRes = () => { const r = dvCalcular(); if(!r.length){ CC.toast('No hay filas para exportar con los filtros actuales.','error'); return; }
  CC.exportarExcel('resultado', 'Resultado', ['BL','Cliente','Contenedor','Tipo / tamaño','Condición','Depósito','Regla aplicada','MEMO','Estado'], r.map(x=>[x.bl, x.cliente, x.cont, AC.isoTxt(x.tipo), x.cond, x.dep ? depNom(x.dep) : 'Sin asignar', x.regla, x.memo, x.estado])); };
window.dvAsignar = () => AC.confirmar('Confirmación', `Se grabará la preasignación de la nave ${esc(DV.f1.nave)}, viaje ${esc(DV.f1.viaje)}. El servidor la recalcula con los datos vigentes, así que puede diferir de la vista previa. ¿Desea continuar?`, ()=>{
  const r = dvCalcular(), k = dvKey(), g = DV.grabado[k] = DV.grabado[k] || {}, res = {c:0, a:0, s:0, u:0};
  r.forEach(x=>{ if(!x.dep){ res.u++; return; } const a = g[x.cont]; if(!a){ res.c++; g[x.cont] = {dep:x.dep, memo:''}; } else if(a.dep!==x.dep && !a.memo){ res.a++; res.c++; g[x.cont] = {dep:x.dep, memo:''}; } else res.s++; });
  DV.prev = false; DV.resumen = res; dvPintar(); CC.toast('Preasignación grabada','success');
}, 'Asignar');

function dvTabsHtml(){
  dvSeed(); const f = DV.f1, lineas = CC.datos.lineas.map(l=>[l.codigo, l.nombre]);
  const naves = [...new Set(CC.datos.contenedores.filter(c=>c.indicador==='Importación' && (!f.linea || c.linea===f.linea)).map(c=>c.nave))];
  const viajes = [...new Set(CC.datos.contenedores.filter(c=>c.indicador==='Importación' && c.nave===f.nave).map(c=>c.viaje))];
  const falta = [!f.linea && 'Línea Naviera', !f.nave && 'Nave', !f.viaje && 'Viaje'].filter(Boolean);
  let cuerpo = '';
  if(DV.tab==='aprob'){
    const ok = f.bl || f.cont || !falta.length, ast = (f.bl || f.cont) ? '' : ' *';
    cuerpo = `<div class="fac-card" id="dvF1"><div class="fac-head"><div><h3>Búsqueda de Instrucciones</h3><div class="fac-sub">Utilice los filtros para buscar instrucciones de direccionamiento</div></div></div>
      <div class="fac-g4">${CC.campo('Línea Naviera'+ast, CC.selector(lineas, f.linea, 'id="dvF1Lin" onchange="dvCambio()"', 'Buscar línea naviera...'))}
        ${CC.campo('Nave'+ast, CC.selector(naves, f.nave, 'id="dvF1Nave" onchange="dvCambio()"', 'Buscar nave...'))}
        ${CC.campo('Viaje'+ast, CC.selector(viajes, f.viaje, 'id="dvF1Viaje" onchange="dvCambio()"', 'Buscar viaje...'))}
        ${CC.campo('Inicio Vigencia', `<input type="date" id="dvF1Ini" value="${esc(f.ini)}" ${f.linea||f.bl||f.cont?'':'disabled'}>`)}
        ${CC.campo('Fin Vigencia', `<input type="date" id="dvF1Fin" value="${esc(f.fin)}" ${f.linea||f.bl||f.cont?'':'disabled'}>`)}
        ${CC.campo('BL', `<input id="dvF1Bl" placeholder="Ej. BL123456" value="${esc(f.bl)}" onchange="dvCambio()">`)}
        ${CC.campo('Contenedor', `<input id="dvF1Cont" placeholder="Ej. CAAU5242074" value="${esc(f.cont)}" onchange="dvCambio()">`)}</div>
      ${ok ? '' : `<div class="fac-note warn">Para buscar falta elegir: ${falta.join(', ')}. También puede buscar solo con un BL o un contenedor.</div>`}
      <div class="fac-btns">${AC.btn('Buscar','dvBuscar1()','', `id="dvBuscar1" ${ok?'':'disabled'}`)}${AC.btn('Limpiar','dvLimpiar1()','ghost')}</div></div>`
      + (DV.res1 ? `<div class="fac-card" id="dvRes1"><div class="fac-head"><h3>Resultados (${DV.res1.length})</h3><div class="fac-acts">
          ${!DV.edit1 && DV.res1.length ? AC.btn('Editar','dvEditar1()','ghost','id="dvEditar1"') : ''}
          ${DV.edit1 ? `<span class="ac-mut">${DV.sel1.length} seleccionada(s)</span>${AC.btn('Aprobar','dvAprobar()','', `id="dvAprobar" ${DV.sel1.length?'':'disabled'}`)}${AC.btn('Rechazar','dvRechazar()','pink', `id="dvRechazar" ${DV.sel1.length?'':'disabled'}`)}` : ''}</div></div>
          <div class="ac-mut" style="margin-bottom:6px">${DV.sel1.length} de ${DV.res1.filter(i=>i.estado==='Pendiente').length} seleccionadas</div>${dvGrid(DV.res1, true, DV.edit1)}</div>` : '');
  } else if(DV.tab==='reg'){
    const f2 = DV.f2;
    cuerpo = `<div class="fac-card" id="dvF2"><div class="fac-head"><div><h3>Búsqueda de Instrucciones en estado borrador</h3><div class="fac-sub">Utilice los filtros para buscar instrucciones de direccionamiento en estado borrador</div></div><div class="fac-acts">${AC.btn('Nuevo','dvNuevo()','','id="dvNuevo"')}</div></div>
      <div class="fac-g3">${CC.campo('Línea Naviera', CC.selector(lineas, f2.linea, 'id="dvF2Lin"', 'Buscar línea naviera...'))}${CC.campo('Inicio Vigencia', `<input type="date" id="dvF2Ini" value="${esc(f2.ini)}">`)}${CC.campo('Fin Vigencia', `<input type="date" id="dvF2Fin" value="${esc(f2.fin)}">`)}</div>
      <div class="fac-btns">${AC.btn('Buscar','dvBuscar2()')}${AC.btn('Limpiar','dvLimpiar2()','ghost')}</div></div>`
      + `<div class="fac-card" id="dvRes2"><div class="fac-head"><h3>Resultados (${(DV.res2||[]).length})</h3><div class="fac-acts">${(DV.res2||[]).length ? AC.btn('Enviar a Aprobación','dvEnviar()','', `id="dvEnviar" ${DV.sel2.length?'':'disabled'}`) : ''}</div></div>
        <div class="ac-mut" style="margin-bottom:6px">${DV.sel2.length} de ${(DV.res2||[]).length} seleccionadas</div>${dvGrid(DV.res2||[], false, true)}</div>`;
  } else cuerpo = `<div class="fac-card" id="dvRes3">${dvResultadoHtml()}</div>`;
  return (!dvSelRes() ? `<div class="fac-note" style="margin-bottom:10px">La pestaña Resultado se habilita con Línea, Nave y Viaje.</div>` : '')
    + AC.tabs([['aprob','Instrucciones de Direccionamiento'],['reg','Registro de Instrucciones'],['res','Resultado', !dvSelRes()]], DV.tab, 'dvTab') + cuerpo;
}

/* Nuevo: diálogo Seleccionar Línea Naviera */
window.dvNuevo = () => AC.dlg(AC.cab('Seleccionar Línea Naviera', 'Seleccione la línea naviera y sucursal para crear una nueva instrucción')
  + `<div class="fac-g2">${CC.campo('Línea Naviera *', CC.selector(CC.datos.lineas.map(l=>[l.codigo, l.nombre]), '', 'id="dvNL"', 'Ingresar Línea Naviera'))}${CC.campo('Sucursal *', CC.selector(AC.sucursales, '', 'id="dvNS"', 'Seleccionar sucursal'))}</div>`
  + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Añadir', AC.cb(()=>{
    const l = AC.v('dvNL'), s = AC.v('dvNS'); if(!l || !s){ CC.toast('Por favor complete todos los campos obligatorios.','error'); return; }
    AC.cerrar(); const id = dvId(++DV.seq);
    DV.form = {modo:'crear', inst:{id, linea:l, sucursal:s, tipo:'Por Vigencia', estado:'Borrador', bl:'', memo:'', cliente:'', vigIni:'', vigFin:'', viaje:'', nave:'', puerto:'', dep:'', dir:'', prioridad:'', modo:'Por Cantidad', familias:[], contenedores:[], adjuntos:[], motivo:''}, pend:[], ce:{}, ver:false};
    DV.vista = 'form'; dvPintar();
  }), '', 'data-ac="dv-anadir"')), 'sm');
window.dvAbrir = (id, modo) => { dvSeed(); const i = DV.lista.find(x=>x.id===id); DV.form = {modo:'editar', inst:AC.clon(i), pend:[], ce:{}, ver: modo==='ver' || i.estado!=='Borrador'}; DV.vista = 'form'; dvPintar(); };
window.dvVolver = () => { DV.vista = 'tabs'; DV.form = null; if(DV.tab==='reg') dvBuscar2(true); dvPintar(); CC.barra('Instrucciones de Direccionamiento de Vacíos', ['Inicio','Direccionamiento de Vacíos','Buscar Instrucciones de Direccionamiento']); };
function dvLeerForm(){
  const F = DV.form, i = F.inst, v = (id, k, o) => { if($(id)) (o||i)[k] = AC.v(id); };
  v('dvTipo','tipo'); v('dvVI','vigIni'); v('dvVF','vigFin'); v('dvCli','cliente'); v('dvDep','dep'); v('dvDir','dir'); v('dvPrio','prioridad'); v('dvFam','fam', F.ce);
  if($('dvViaje')){ const vj = CC.datos.viajes.find(x=>`${x.numero} - ${x.nave}`===AC.v('dvViaje')); i.viaje = vj ? vj.numero : ''; i.nave = vj ? vj.nave : ''; i.puerto = vj ? vj.puerto : ''; }
  const m = document.querySelector('input[name="dvModo"]:checked'); if(m) i.modo = m.value;
  ['num:dvCNum','dep:dvCDep','dir:dvCDir','tipo:dvCTipo','bl:dvCBl','cliente:dvCCli'].forEach(x=>{ const [k,id] = x.split(':'); if($(id)) F.ce[k] = AC.v(id); });
  if($('dvCProv')) F.ce.prov = $('dvCProv').checked;
  i.familias.forEach((f,fi)=>{ if($(`dvLD${fi}`)){ f.nDep = AC.v(`dvLD${fi}`); f.nVal = AC.v(`dvLV${fi}`); } });
}
window.dvRe = () => { dvLeerForm(); dvPintar(); };
window.dvDepAuto = (idDep, idDir) => { const d = AC.dep(AC.v(idDep)); if($(idDir)) $(idDir).value = d ? d.dir : ''; if(AC.v(idDep) && d && !d.dir) CC.toast('El depósito no tiene una dirección configurada.','error'); };
const maestro = () => CC.datos.contenedores.filter(c=>c.indicador==='Importación' && c.estado!=='Devuelto vacío');
/* Propuesta I-045 (HU-ATC-02): alerta cuando el contenedor ya tiene Visto Bueno (liberación aprobada).
   Control propuesto: no deja registrar ni modificar (PEN-I045-01: bloqueo o excepción autorizada, por definir). */
const dvConVb = nums => nums.map(n=>({num:n, vb:AC.vbDe ? AC.vbDe(n) : null})).filter(x=>x.vb);
function dvAlertaVb(nums){
  if(!CC.verPropuestas) return false;
  const l = dvConVb(nums); if(!l.length) return false;
  AC.dlg(AC.cab('Contenedor con Visto Bueno') + `<div ${CC.propuesta('I-045','HU-ATC-02 · Alerta de VB')} id="dvVbAlerta" style="padding:10px;border-radius:8px">
      ${l.map(x=>`<p class="ac-p">El contenedor <b>${esc(x.num)}</b> ya cuenta con un Visto Bueno generado el <b>${AC.fh(x.vb.fecha)}</b> (BL ${esc(x.vb.bl)}, liberación ${esc(x.vb.id)}). No es posible registrar ni modificar la instrucción de direccionamiento.</p>`).join('')}
      <div class="ac-mut">Si el depósito debe cambiar, se hace con «Nuevo MEMO» en Instrucciones del BL.</div></div>`
    + AC.pie(AC.btn('Entendido','acCerrar()','','data-ac="vb-ok"')), 'sm');
  return true;
}
window.dvAgregarCont = () => {
  dvLeerForm(); const F = DV.form, ce = F.ce, i = F.inst, num = String(ce.num||'').toUpperCase().trim();
  let item;
  if(ce.prov){
    if(!/^[A-Z]{4}\d{7}$/.test(num)){ CC.toast('Ingrese un número de contenedor válido: 4 letras y 7 dígitos.','error'); return; }
    if(CC.datos.contenedores.some(c=>c.numero===num)){ CC.toast(`El contenedor ${num} ya existe en el maestro. Desmarque «Contenedor no registrado» y elíjalo de la lista.`,'error'); return; }
    if(!ce.tipo || !ce.bl || !ce.cliente){ CC.toast('Complete número, tipo, BL y cliente del contenedor provisional.','error'); return; }
    item = {num, tipo:ce.tipo, nave:'', viaje:'', puerto:'', bl:ce.bl.toUpperCase(), cliente:ce.cliente, prov:true};
  } else {
    const c = maestro().find(x=>x.numero===num);
    if(!c){ F.ce.num = ''; CC.toast('El Contenedor, Tipo/Tamaño, Depósito Destino y Dirección deben ser obligatorios.','error'); dvPintar(); return; }
    item = {num, tipo:AC.isoDe(c.tipo), nave:c.nave, viaje:c.viaje, puerto:'Callao', bl:c.bl, cliente:(AC.bls().find(b=>b.numero===c.bl)||{}).consignatario||'', prov:false};
  }
  if(dvAlertaVb([num])) return;
  if(!ce.dep || !ce.dir){ CC.toast(ce.dep && !depDir(ce.dep) ? 'El Depósito Destino no tiene una dirección configurada en el sistema.' : 'El Contenedor, Tipo/Tamaño, Depósito Destino y Dirección deben ser obligatorios.','error'); return; }
  if(i.contenedores.some(x=>x.num===num)){ CC.toast(`El contenedor ${num} ya fue agregado.`,'error'); return; }
  i.contenedores.push(Object.assign(item, {dep:ce.dep, dir:ce.dir})); F.ce = {prov:ce.prov}; dvPintar();
  if(item.prov) CC.toast(`Contenedor ${num} agregado como provisional: queda pendiente de regularizar cuando llegue por manifiesto.`,'info');
};
window.dvQuitarCont = k => { dvLeerForm(); DV.form.inst.contenedores.splice(k,1); dvPintar(); };
window.dvAgregarFam = () => { dvLeerForm(); const i = DV.form.inst, fam = DV.form.ce.fam; if(!fam) return;
  if(i.familias.some(f=>f.fam===fam)){ CC.toast(fam==='ESP' ? '«Especiales» ya está agregada en la instrucción.' : 'Esta familia ya está agregada en la instrucción.','error'); return; }
  i.familias.push({fam, lineas:[]}); DV.form.ce.fam = ''; dvPintar(); };
window.dvQuitarFam = k => { dvLeerForm(); DV.form.inst.familias.splice(k,1); dvPintar(); };
window.dvAnadirLinea = fi => { dvLeerForm(); const i = DV.form.inst, f = i.familias[fi], dep = f.nDep, val = Number(f.nVal), lbl = f.fam==='ESP' ? 'Especiales' : AC.isoTxt(f.fam);
  if(!dep || !(val > 0)){ CC.toast('Debe completar los campos obligatorios: Depósito destino y '+(i.modo==='Por Porcentaje'?'Porcentaje':'Cantidad')+'.','error'); return; }
  if(!depDir(dep)){ CC.toast('El depósito destino no tiene una dirección configurada.','error'); return; }
  if(f.lineas.some(l=>l.dep===dep)){ CC.toast('Este depósito destino ya está agregado en esta agrupación.','error'); return; }
  if(i.modo==='Por Porcentaje' && f.lineas.reduce((a,l)=>a+Number(l.val),0) + val > 100){ CC.toast(`Con ese porcentaje superaría el 100% en "${lbl}". Reduzca filas existentes o el valor ingresado.`,'error'); return; }
  f.lineas.push({dep, val}); f.nDep = ''; f.nVal = ''; dvPintar(); };
window.dvQuitarLinea = (fi, li) => { dvLeerForm(); DV.form.inst.familias[fi].lineas.splice(li,1); dvPintar(); };
window.dvSelArchivos = () => { dvLeerForm(); DV.form.pend.push(AC.archivo('Sustento_instruccion','pdf')); dvPintar(); };
window.dvQuitarArchivo = (k, pend) => { dvLeerForm(); (pend ? DV.form.pend : DV.form.inst.adjuntos).splice(k,1); dvPintar(); };
window.dvEditarForm = () => { DV.form.ver = false; dvPintar(); };
window.dvCancelarForm = () => { if(DV.form.modo==='editar' && !DV.form.ver){ DV.form.inst = AC.clon(DV.lista.find(x=>x.id===DV.form.inst.id)); DV.form.ver = true; DV.form.pend = []; dvPintar(); } else dvVolver(); };
function dvFormHtml(){
  const F = DV.form, i = F.inst, ro = F.ver, dis = ro ? 'disabled' : '', t = i.tipo, ce = F.ce;
  const sec = (titulo, html, extra) => `<div class="fac-card" ${extra||''}><div class="fac-sec" style="margin-top:0">${titulo}</div>${html}</div>`;
  const depSel = (id, val, onch) => CC.selector(AC.depositos.map(d=>[d.codigo, d.razon]), val, `id="${id}" ${dis} ${onch||''}`, 'Buscar depósito...');
  const viajes = CC.datos.viajes.map(v=>`${v.numero} - ${v.nave}`), vjTxt = i.viaje ? `${i.viaje} - ${i.nave}` : '';
  const out = [];
  out.push(sec('Información General', `<div class="fac-g4">${CC.campoLectura('Instrucción Id.', i.id)}${CC.campoLectura('Línea Naviera', AC.lineaNombre(i.linea))}${CC.campoLectura('Sucursal', i.sucursal)}
    ${CC.campo('Tipo de Instrucción *', CC.selector(DV_TIPOS, t, `id="dvTipo" ${dis} onchange="dvRe()"`, 'Seleccionar tipo'))}</div>${t==='Por Tipo/Tamaño' ? '<div class="ac-mut">Obligatorio para poder guardar</div>' : ''}`, 'id="dvS1"'));
  if(t==='Por Contenedor'){
    const info = ce.prov ? null : maestro().find(x=>x.numero===String(ce.num||'').toUpperCase());
    out.push(sec('Gestión de Contenedores', (ro ? '' : `
      <div ${CC.propuesta('HU-ATC-02 · I-003','Contenedor provisional')} id="dvProv" style="margin-bottom:10px;padding:10px;border-radius:8px">
        <label class="fac-chk"><input type="checkbox" id="dvCProv" ${ce.prov?'checked':''} onchange="dvRe()"> Contenedor no registrado en el maestro</label>
        ${ce.prov ? `<div class="fac-note warn">El contenedor quedará como <b>provisional</b>, pendiente de regularizar cuando llegue por manifiesto. Se enlaza por número cuando el manifiesto lo registre.</div>
        <div class="fac-g4" style="margin-top:8px">${CC.campo('Número de contenedor *', `<input id="dvCNum" maxlength="11" placeholder="Ej. CAAU5242074" value="${esc(ce.num||'')}" style="text-transform:uppercase">`)}
          ${CC.campo('Tipo/Tamaño *', CC.selector(AC.iso, ce.tipo||'', 'id="dvCTipo"', 'Elegir Tipo/Tamaño'))}${CC.campo('BL *', `<input id="dvCBl" placeholder="Ingresar BL" value="${esc(ce.bl||'')}">`)}
          ${CC.campo('Cliente *', CC.selector(CC.datos.socios.consignatarios.map(c=>c.razonSocial), ce.cliente||'', 'id="dvCCli"', 'Ingresar Cliente'))}</div>` : ''}
      </div>
      <div class="fac-g4">${ce.prov ? '' : CC.campo('Contenedor *', AC.lista('dvCNum', ce.num||'', maestro().map(c=>c.numero), 'Ej. CAAU5242074', 'onchange="dvRe()"'))}
        ${CC.campo('Depósito Destino *', depSel('dvCDep', ce.dep||'', `onchange="dvDepAuto('dvCDep','dvCDir')"`))}${CC.campo('Dirección *', `<input id="dvCDir" value="${esc(ce.dir||'')}">`)}
        <div class="fac-f"><label>&nbsp;</label>${AC.btn('Agregar Contenedor','dvAgregarCont()','ghost','id="dvAgregarCont"')}</div></div>
      ${ce.prov ? '' : `<div class="fac-note"><b>Datos del contenedor (solo lectura)</b><br>${info ? `Nave: ${esc(info.nave)} · Viaje: ${esc(info.viaje)} · BL: ${esc(info.bl)} · Cliente del BL: ${esc((AC.bls().find(b=>b.numero===info.bl)||{}).consignatario||'-')}<br>La instrucción se aplica una sola vez, en la primera nave y viaje en que el contenedor está pendiente de devolución` : 'Sin nave pendiente de devolución'}</div>`}`)
      + `<div class="fac-sec">Contenedores agregados (${i.contenedores.length})</div>`
      + AC.tabla([{t:'Contenedor', v:c=>`${esc(c.num)}${c.prov ? ` <span class="ac-prov cc-prop" title="Pendiente de regularizar cuando llegue por manifiesto">Provisional</span>` : ''}`}, {t:'Tipo/Tamaño', v:c=>esc(AC.isoTxt(c.tipo))},
          {t:'Depósito Destino', v:c=>esc(depNom(c.dep))}, {t:'Dirección', v:c=>esc(c.dir||'-')}, {t:'', v:(c,k)=>ro ? '' : AC.link('Quitar', `dvQuitarCont(${k})`)}], i.contenedores, 'No hay contenedores agregados'), 'id="dvS2"'));
  }
  out.push(sec(t==='Por Vigencia' ? 'Vigencia' : 'Vigencia (Opcional)', `<div class="fac-g4">${CC.campo('Fecha Inicio Vigencia'+(t==='Por Vigencia'?' *':''), `<input type="date" id="dvVI" value="${esc(i.vigIni)}" ${dis}>`)}${CC.campo('Fecha Término Vigencia'+(t==='Por Vigencia'?' *':''), `<input type="date" id="dvVF" value="${esc(i.vigFin)}" ${dis}>`)}</div>`));
  if(t!=='Por Depósito'){
    out.push(sec('Información del Viaje (Opcional)', `${t==='Por Contenedor' ? '<div class="ac-mut">Opcional: se autocompletará si el contenedor está activo</div>' : t==='Por Tipo/Tamaño' ? '<div class="ac-mut">Opcional: viaje, nave y puerto de descarga no son obligatorios al guardar.</div>' : ''}
      <div class="fac-g3">${CC.campo('Viaje', CC.selector(viajes, vjTxt, `id="dvViaje" ${dis} onchange="dvRe()"`, 'Ingresar Viaje'))}${CC.campoLectura('Nave', i.nave)}${CC.campoLectura('Puerto de Descarga', i.puerto)}</div>`));
    out.push(sec('Cliente (Opcional)', `<div class="fac-g3">${CC.campo('Cliente', CC.selector(CC.datos.socios.consignatarios.map(c=>c.razonSocial), i.cliente, `id="dvCli" ${dis} onchange="dvRe()"`, 'Ingresar Cliente'))}</div>`
      + (i.cliente && t!=='Por Vigencia' ? `<div class="fac-sec">Roles del Cliente</div>${AC.tabla([{t:'Rol', k:'r'}], [{r:'Consignatario'}], 'No hay roles agregados')}` : '')));
  }
  if(t==='Por Tipo/Tamaño'){
    out.push(sec('Modo de Asignación *', `<div class="fac-radio" style="flex-direction:row;gap:24px">${['Por Cantidad','Por Porcentaje'].map(m=>`<label><input type="radio" name="dvModo" value="${m}" ${i.modo===m?'checked':''} ${dis} onchange="dvRe()"> ${m}</label>`).join('')}</div>`));
    const pct = i.modo==='Por Porcentaje';
    out.push(sec('Gestión por Tipo/Tamaño', (ro ? '' : `<div class="ac-row">${CC.campo('Familia (tamaño y tipo)', CC.selector(DV_FAM, ce.fam||'', 'id="dvFam" onchange="dvRe()"', 'Seleccionar familia'))}${AC.btn('Agregar Tipo/Tamaño','dvAgregarFam()','ghost', ce.fam ? 'id="dvAgregarFam"' : 'id="dvAgregarFam" disabled')}</div>
      <div class="ac-mut">«Especiales» cubre todas las familias que no tienen una instrucción propia, no solo flat rack, tanque u open top. Solo se puede agregar una vez por instrucción.</div>`)
      + (pct ? '<div class="fac-note">Reglas finas de partición para generación de memo pendientes de validación con negocio. Los tipos/tamaños con asignación 100% a un depósito deben priorizarse. La distribución porcentual debe respetar la agrupación operativa para no partir indebidamente un memo.</div>' : '')
      + i.familias.map((f,fi)=>{ const lbl = f.fam==='ESP' ? 'Especiales' : AC.isoTxt(f.fam), tot = f.lineas.reduce((a,l)=>a+Number(l.val),0);
        return `<div class="fac-expand" style="margin-top:10px;border-radius:8px"><div class="ac-row"><b>${esc(lbl)}</b>${pct ? `<span class="ac-mut">${tot > 100 ? `${tot}% excedido` : `${tot}% de 100%`}</span>` : ''}<span class="ac-sp"></span>${ro ? '' : AC.link('Quitar familia', `dvQuitarFam(${fi})`)}</div>
          ${ro ? '' : `<div class="fac-g4">${CC.campo('Depósito destino', depSel(`dvLD${fi}`, f.nDep||''))}${CC.campo(pct ? 'Porcentaje %' : 'Cantidad', `<input type="number" min="1" id="dvLV${fi}" value="${esc(f.nVal||'')}">`)}<div class="fac-f"><label>&nbsp;</label>${AC.btn('Añadir', `dvAnadirLinea(${fi})`, 'ghost')}</div></div>`}
          ${AC.tabla([{t:'Depósito', v:l=>esc(depNom(l.dep))}, {t:'Dirección', v:l=>esc(depDir(l.dep))}, {t:pct?'Porcentaje':'Cantidad', v:l=>esc(l.val + (pct?'%':''))}, {t:'', v:(l,li)=>ro ? '' : AC.link('Quitar', `dvQuitarLinea(${fi},${li})`)}], f.lineas, 'Sin líneas de depósito.')}</div>`; }).join('')));
  }
  if(t==='Por Vigencia') out.push(sec('Información de Depósito', `<div class="fac-g3">${CC.campo('Depósito *', depSel('dvDep', i.dep, `onchange="dvDepAuto('dvDep','dvDir')"`))}${CC.campo('Dirección *', `<input id="dvDir" value="${esc(i.dir)}" ${dis}>`)}</div>`));
  if(t==='Por Depósito') out.push(sec('Depósito y Prioridad', `<div class="ac-mut">Sirve de desempate entre depósitos y de último recurso: el depósito de prioridad 1 recibe los contenedores a los que no les aplica ninguna otra regla.</div>
    <div class="fac-g3">${CC.campo('Depósito *', depSel('dvDep', i.dep, `onchange="dvDepAuto('dvDep','dvDir')"`))}${CC.campo('Dirección', `<input id="dvDir" value="${esc(i.dir)}" ${dis}>`)}${CC.campo('Prioridad *', `<input type="number" min="1" step="1" id="dvPrio" value="${esc(i.prioridad)}" ${dis}>`)}</div>`));
  out.push(sec('Archivos Adjuntos', `<div class="ac-mut">Obligatorio: adjunte al menos un archivo (nuevo o existente).</div><div class="ac-files">${i.adjuntos.map((a,k)=>`<div><span>${esc(a.nombre)}</span><span class="fac-rowacts">${AC.link('Descargar', AC.cb(()=>AC.descargar(a.nombre)))}${ro ? '' : AC.link('Eliminar', `dvQuitarArchivo(${k},0)`)}</span></div>`).join('')}
    ${F.pend.map((a,k)=>`<div><span>${esc(a.nombre)} <span class="ac-mut">pendiente de subir</span></span>${AC.link('Quitar', `dvQuitarArchivo(${k},1)`)}</div>`).join('')}</div>
    ${ro ? '' : `<div class="ac-row" style="margin-top:8px">${AC.btn('Seleccionar Archivos','dvSelArchivos()','ghost','id="dvSelArchivos"')}<span class="ac-mut">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Máx 10MB c/u.</span></div>`}`));
  const pie = ro ? AC.btn('Volver','dvVolver()','ghost') + (i.estado==='Borrador' ? AC.btn('Editar','dvEditarForm()','','id="dvEditarForm"') : '')
    : (t==='Por Tipo/Tamaño' ? '<span class="ac-mut" style="margin-right:auto">Obligatorio al guardar: modo de asignación (cantidad o %), al menos una familia (o «Especiales») con distribución por depósito, y al crear un archivo adjunto.</span>' : '')
      + AC.btn('Cancelar','dvCancelarForm()','ghost') + AC.btn('Guardar','dvGuardar()','','id="dvGuardar"');
  return `<div id="dvForm">${out.join('')}<div class="fac-btns">${pie}</div></div>`;
}
window.dvGuardar = () => {
  dvLeerForm(); const F = DV.form, i = F.inst, t = i.tipo;
  const e = m => { CC.toast(m,'error'); return true; };
  if(i.adjuntos.length + F.pend.length < 1) return e('Debe adjuntar al menos un archivo antes de guardar.');
  if(!t) return e('Por favor complete todos los campos obligatorios.');
  if(t==='Por Vigencia' && (!i.vigIni || !i.vigFin)) return e('Por favor complete todos los campos obligatorios.');
  if(!!i.vigIni !== !!i.vigFin) return e('Revise el formulario: falta o es inválido: Vigencia.');
  if(i.vigIni && i.vigFin && i.vigFin <= i.vigIni) return e('La fecha hasta debe ser posterior a la fecha desde.');
  if(t==='Por Vigencia' || t==='Por Depósito'){ if(!i.dep) return e('Debe seleccionar un depósito destino.'); if(t==='Por Vigencia' && !i.dir) return e('El depósito no tiene una dirección configurada.'); }
  if(t==='Por Depósito'){ const p = Number(i.prioridad); if(!Number.isInteger(p) || p < 1) return e('Debe indicar la prioridad de llenado (número entero mayor o igual a 1).');
    if(DV.lista.some(x=>x.id!==i.id && x.tipo==='Por Depósito' && x.linea===i.linea && x.sucursal===i.sucursal && Number(x.prioridad)===p)) return e('Ya existe otra instrucción Por Depósito de la misma línea y sucursal con esta prioridad de llenado.'); i.prioridad = p; }
  if(t==='Por Contenedor'){ if(!i.contenedores.length) return e('Por favor complete todos los campos obligatorios.'); if(i.contenedores.some(c=>!c.dep)) return e('Cada contenedor debe tener un depósito destino seleccionado.'); if(i.contenedores.some(c=>!c.dir)) return e('Cada contenedor debe tener dirección del depósito destino antes de guardar.');
    if(dvAlertaVb(i.contenedores.map(c=>c.num))) return; i.bl = i.contenedores[0].bl; }
  let excluidos = [];
  if(t==='Por Vigencia' && i.cliente && CC.verPropuestas){ const bls = AC.bls().filter(b=>b.consignatario===i.cliente).map(b=>b.numero);
    excluidos = dvConVb(CC.datos.contenedores.filter(c=>bls.includes(c.bl)).map(c=>c.numero)); }
  if(t==='Por Tipo/Tamaño'){
    if(!i.modo) return e('Por favor complete todos los campos obligatorios.');
    if(!i.familias.length) return e('Revise la gestión por tipo/tamaño: agregue al menos una familia o «Especiales».');
    for(const f of i.familias){ const lbl = f.fam==='ESP' ? 'Especiales' : AC.isoTxt(f.fam), tot = f.lineas.reduce((a,l)=>a+Number(l.val),0);
      if(!f.lineas.length) return e(`En "${lbl}" debe agregar al menos una línea de depósito destino con cantidad o porcentaje.`);
      if(i.modo==='Por Porcentaje' && tot !== 100) return e(tot > 100 ? `En "${lbl}" la suma de porcentajes (${tot}%) supera el 100%.` : `En "${lbl}" la suma de porcentajes es ${tot}%; debe totalizar 100%.`); }
  }
  i.adjuntos = i.adjuntos.concat(F.pend); F.pend = [];
  if(t!=='Por Contenedor') i.contenedores = []; if(t!=='Por Tipo/Tamaño') i.familias = [];
  i.familias.forEach(f=>{ delete f.nDep; delete f.nVal; });
  const crear = F.modo==='crear', prov = i.contenedores.filter(c=>c.prov).length;
  if(crear) DV.lista.push(i); else DV.lista[DV.lista.findIndex(x=>x.id===i.id)] = i;
  DV.tab = 'reg'; dvVolver();
  CC.toast((crear ? 'Instrucción creada exitosamente' : 'Instrucción actualizada exitosamente') + (prov ? `. ${prov} contenedor(es) provisional(es) pendiente(s) de regularizar.` : ''),'success');
  if(excluidos.length) AC.dlg(AC.cab('Contenedores con Visto Bueno') + `<div ${CC.propuesta('I-045','HU-ATC-02 · Exclusión por VB')} id="dvVbExcluidos" style="padding:10px;border-radius:8px">
      <p class="ac-p">Se actualizó la instrucción. ${excluidos.length} contenedor(es) del cliente no se actualizan porque ya tienen Visto Bueno:</p>
      ${AC.tabla([{t:'Contenedor', k:'num'}, {t:'BL', v:x=>esc(x.vb.bl)}, {t:'Fecha del VB', v:x=>AC.fh(x.vb.fecha)}], excluidos)}</div>`
    + AC.pie(AC.btn('Entendido','acCerrar()','','data-ac="vb-ok"')), 'md');
};
CC.registrarPantalla({
  id:'screenAcDirVacios', grupo:G, opcion:'Direccionamiento de Vacíos', titulo:'Instrucciones de Direccionamiento de Vacíos',
  migas:['Inicio','Direccionamiento de Vacíos','Buscar Instrucciones de Direccionamiento'],
  html: () => DV.vista==='form' && DV.form ? dvFormHtml() : dvTabsHtml(),
  alAbrir: () => { if(DV.vista!=='tabs'){ DV.vista = 'tabs'; DV.form = null; CC.refrescar('screenAcDirVacios'); } },
  guia:[{t:'Direccionamiento de vacíos', steps:[{el:'#dvF1', h:'Aprobación', p:'Busca con Línea, Nave y Viaje (o solo BL o contenedor). Editar permite aprobar o rechazar pendientes.'},
    {el:'#screenAcDirVacios .fac-tabs', h:'Registro', p:'En Registro de Instrucciones creas borradores con Nuevo y los envías a aprobación.'}]}]
});

/* ============================================================
   6. SOBREESTADÍA (Configuración de Días Libres)
============================================================ */
const SO = { f:{ambito:'',linea:'',cliente:'',oper:''}, conf:null, buscado:false, edit:false, tab:'dias', copia:null, nuevos:0, sel:[], selAdj:[], lista:null, seq:3 };
const SO_OPER = ['Importación','Exportación'];
function soSeed(){
  if(SO.lista) return;
  const d = (linea, tam, dias, unidad, fini, desde, hasta) => ({linea, tam, dias, unidad, fini, desde, hasta});
  SO.lista = [
    {id:1, ambito:'Línea', socio:'ZIM', oper:'Importación', detalles:[d('','22G1',7,'Días calendario','Fecha de descarga','2026-01-01','2026-12-31'), d('','45R1',4,'Días calendario','Fecha de descarga','2026-01-01','2026-12-31')], adjuntos:[AC.archivo('Tarifario_linea','pdf')]},
    {id:2, ambito:'Cliente', socio:'ANDES MINING EXPORT S.A.', oper:'Importación', detalles:[d('ZIM','42G1',14,'Días calendario','Fecha de descarga','2026-06-01','2026-12-31'), d('MSK','45G1',10,'Días hábiles','Fecha de retiro','2026-06-01','2026-12-31')], adjuntos:[AC.archivo('Acuerdo_comercial','pdf')]}
  ];
}
function soLeer(){ ['ambito:soFAmb','linea:soFLin','cliente:soFCli','oper:soFOper'].forEach(x=>{ const [k,id] = x.split(':'); if($(id)) SO.f[k] = AC.v(id); }); }
const soSocio = () => SO.f.ambito==='Línea' ? SO.f.linea : SO.f.cliente;
window.soAmbito = () => { soLeer(); if(SO.f.ambito==='Línea') SO.f.cliente = ''; else SO.f.linea = ''; SO.buscado = false; CC.refrescar('screenAcSobreestadia'); };
window.soBuscar = () => { soLeer(); soSeed(); const f = SO.f;
  if(!f.ambito || !soSocio() || !f.oper){ CC.toast('Complete Ámbito, socio y Tipo de Operación para buscar.','info'); return; }
  SO.conf = SO.lista.find(c=>c.ambito===f.ambito && c.socio===soSocio() && c.oper===f.oper) || null; SO.buscado = true; SO.edit = false; SO.tab = 'dias'; CC.refrescar('screenAcSobreestadia'); };
window.soLimpiar = () => { if(SO.edit) return; SO.f = {ambito:'',linea:'',cliente:'',oper:''}; SO.conf = null; SO.buscado = false; CC.refrescar('screenAcSobreestadia'); };
window.soNuevo = () => { const f = SO.f; SO.conf = {id:0, ambito:f.ambito, socio:soSocio(), oper:f.oper, detalles:[], adjuntos:[]}; soEditar(); };
window.soEditar = () => { SO.cruce = ''; SO.copia = AC.clon(SO.conf); SO.edit = true; SO.nuevos = 0; SO.sel = []; SO.selAdj = []; CC.refrescar('screenAcSobreestadia'); };
window.soCancelar = () => { SO.edit = false;
  /* I-097: al cancelar, la regla existente vuelve tal cual estaba (sin las filas rechazadas) */
  if(SO.conf.id && SO.copia){ const i = SO.lista.findIndex(c=>c.id===SO.conf.id); if(i>=0) SO.lista[i] = SO.copia; SO.conf = SO.lista[i]; } else SO.conf = null;
  CC.refrescar('screenAcSobreestadia'); };
window.soTab = t => { SO.tab = t; CC.refrescar('screenAcSobreestadia'); };
window.soSet = (i, k, v) => { SO.conf.detalles[i][k] = v; SO.cambio = true; };
window.soSel = (i, on) => { SO.sel = on ? [...new Set(SO.sel.concat(i))] : SO.sel.filter(x=>x!==i); CC.refrescar('screenAcSobreestadia'); };
window.soAgregar = () => { SO.conf.detalles.push({linea:'', tam:'', dias:'', unidad:'', fini:'', desde:'', hasta:''}); CC.refrescar('screenAcSobreestadia'); };
window.soEliminar = () => AC.confirmar('Confirmación', `¿Estás seguro de que deseas eliminar las filas seleccionadas? ${AC.errConnect('Texto decía archivos')}`, ()=>{ SO.conf.detalles = SO.conf.detalles.filter((d,i)=>!SO.sel.includes(i)); SO.sel = []; CC.refrescar('screenAcSobreestadia'); });
window.soSubir = () => AC.adjuntar({base:'Sustento_dias_libres', ext:'pdf'}, f=>{ SO.conf.adjuntos.push(...f); SO.nuevos += f.length; CC.refrescar('screenAcSobreestadia'); });
window.soSelAdj = (i, on) => { SO.selAdj = on ? [...new Set(SO.selAdj.concat(i))] : SO.selAdj.filter(x=>x!==i); CC.refrescar('screenAcSobreestadia'); };
window.soEliminarAdj = () => AC.confirmar('Confirmación', '¿Estás seguro de que deseas eliminar los archivos seleccionados?', ()=>{ SO.conf.adjuntos = SO.conf.adjuntos.filter((a,i)=>!SO.selAdj.includes(i)); SO.selAdj = []; CC.refrescar('screenAcSobreestadia'); });
window.soGuardar = () => {
  const c = SO.conf, cli = c.ambito==='Cliente', k = d => [d.linea, d.tam, d.unidad, d.fini].join('|');
  const cruce = (d, x) => k(x)===k(d) && x.desde && d.desde && x.desde <= (d.hasta||'9') && d.desde <= (x.hasta||'9');
  if(c.detalles.some((d,i)=>c.detalles.some((x,j)=>j!==i && cruce(d, x)))){
    /* Propuesta I-097 (HU-ATC-11): el mensaje identifica la regla que se cruza; la regla vigente no cambia */
    if(CC.verPropuestas){ const ant = SO.copia ? SO.copia.detalles : [], nueva = c.detalles.find((d,i)=>c.detalles.some((x,j)=>j!==i && cruce(d,x)) && !ant.some(a=>JSON.stringify(a)===JSON.stringify(d))) || c.detalles[0];
      const vig = c.detalles.find(x=>x!==nueva && cruce(nueva, x));
      SO.cruce = `No se grabó: la vigencia del ${AC.f(nueva.desde)} al ${AC.f(nueva.hasta)} se cruza con la regla vigente de ${AC.isoTxt(nueva.tam)} (${nueva.unidad}, ${nueva.fini}) del ${AC.f(vig.desde)} al ${AC.f(vig.hasta)}${cli ? ` de ${AC.lineaNombre(nueva.linea)} para ${c.socio}` : ''}. La regla vigente no cambia; para cambiar condiciones, primero cierra su vigencia.`;
      CC.refrescar('screenAcSobreestadia'); }
    CC.toast('Existen Días Libres duplicados','error'); return; }
  SO.cruce = '';
  if(c.detalles.some(d=>d.desde && d.hasta && d.desde > d.hasta)){ CC.toast('Existen Fechas de Vigencia inválidas','error'); return; }
  if(!c.detalles.length || c.detalles.some(d=>(cli && !d.linea) || !d.tam || d.dias==='' || Number(d.dias)<0 || !d.unidad || !d.fini || !d.desde || !d.hasta)){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(c.id && JSON.stringify(c.detalles)!==JSON.stringify(SO.copia.detalles) && !SO.nuevos){ CC.toast('Se requiere un nuevo archivo para justificar la modificación','error'); return; }
  const crear = !c.id; if(crear){ c.id = ++SO.seq; SO.lista.push(c); } else SO.lista[SO.lista.findIndex(x=>x.id===c.id)] = c;
  SO.edit = false; CC.refrescar('screenAcSobreestadia'); CC.toast(crear ? 'Días Libres creado exitosamente.' : 'Días Libres modificado exitosamente.','success');
};
function soHtml(){
  soSeed(); const f = SO.f, c = SO.conf, ed = SO.edit, dis = ed ? 'disabled' : '', cli = f.ambito==='Cliente';
  let res = '';
  if(SO.buscado){
    const cols = [{t:'', v:(d,i)=>`<input type="checkbox" ${ed?'':'disabled'} ${SO.sel.includes(i)?'checked':''} onchange="soSel(${i},this.checked)">`}]
      .concat(cli ? [{t:'Línea *', v:(d,i)=>ed ? CC.selector(CC.datos.lineas.map(l=>[l.codigo,l.nombre]), d.linea, `onchange="soSet(${i},'linea',this.value)"`, 'Ingresar Línea') : esc(AC.lineaNombre(d.linea))}] : [])
      .concat([{t:'Tamaño/Tipo Contenedor *', v:(d,i)=>ed ? CC.selector(AC.iso, d.tam, `onchange="soSet(${i},'tam',this.value)"`, 'Elegir Tamaño/Tipo Contenedor') : esc(d.tam ? AC.isoTxt(d.tam) : '-')},
        {t:'Días Libres *', v:(d,i)=>ed ? `<input type="number" min="0" maxlength="10" placeholder="Ingresar Días Libres" value="${esc(d.dias)}" onchange="soSet(${i},'dias',this.value)">` : esc(d.dias)},
        {t:'Unidad de Conteo *', v:(d,i)=>ed ? CC.selector(AC.unidades, d.unidad, `onchange="soSet(${i},'unidad',this.value)"`, 'Elegir Unidad de Conteo') : esc(d.unidad)},
        {t:'Fecha inicial de cálculo *', v:(d,i)=>ed ? CC.selector(AC.fechasIni, d.fini, `onchange="soSet(${i},'fini',this.value)"`, 'Elegir fecha inicial de cálculo') : esc(d.fini)},
        {t:'Vigencia Desde *', v:(d,i)=>ed ? `<input type="date" value="${esc(d.desde)}" onchange="soSet(${i},'desde',this.value)">` : AC.f(d.desde)},
        {t:'Vigencia Hasta *', v:(d,i)=>ed ? `<input type="date" value="${esc(d.hasta)}" onchange="soSet(${i},'hasta',this.value)">` : AC.f(d.hasta)}]);
    res = `<div class="fac-card" id="soRes"><div class="fac-head"><h3>${c ? 'Configuración de Días Libres' : 'Sin configuración para los filtros elegidos'}</h3><div class="fac-acts">
        ${!ed && c && c.id ? AC.btn('Editar','soEditar()','ghost','id="soEditar"') : ''}${!ed && !c ? AC.btn('Nuevo','soNuevo()','','id="soNuevo"') : ''}</div></div>`
      + (c ? AC.tabs([['dias','Días Libres'],['adj','Adjuntos']], SO.tab, 'soTab')
        + (SO.tab==='dias'
          ? (ed ? `<div ${CC.propuesta('HU-ATC-11 · I-097','Vigencias que se cruzan','fac-note')} id="soCruce" style="margin-bottom:8px">${CC.marca('Corrige','HU-ATC-11','I-097')}
              No se graba una regla con la misma Línea, Cliente, Tamaño/Tipo, Unidad de Conteo y Fecha inicial si su vigencia se cruza con otra (las fechas de inicio y fin cuentan). La regla vigente no cambia.
              ${SO.cruce ? `<div class="fac-note warn" id="soCruceMsg" style="margin:8px 0 0">${esc(SO.cruce)}</div>` : ''}</div>` : '')
            + `<div class="ac-row" style="margin-bottom:8px">${AC.btn('Agregar','soAgregar()','ghost', ed ? 'id="soAgregar"' : 'disabled')}${AC.btn('Eliminar','soEliminar()','pink', ed && SO.sel.length ? '' : 'disabled')}</div><div class="ac-tbl-in">${AC.tabla(cols, c.detalles, 'Sin días libres configurados.')}</div>`
          : `<div class="ac-row" style="margin-bottom:8px">${AC.btn('Subir Archivos','soSubir()','ghost', ed ? 'id="soSubir"' : 'disabled')}${AC.btn('Eliminar','soEliminarAdj()','pink', ed && SO.selAdj.length ? '' : 'disabled')}</div>`
            + AC.tabla([{t:'', v:(a,i)=>`<input type="checkbox" ${ed?'':'disabled'} ${SO.selAdj.includes(i)?'checked':''} onchange="soSelAdj(${i},this.checked)">`}, {t:'Nombre', k:'nombre'}, {t:'Fecha', v:a=>AC.fh(a.fecha)}, {t:'Usuario', v:a=>esc(a.usuario||'Usuario')},
              {t:'Acciones', v:a=>AC.link('⤓', AC.cb(()=>AC.descargar(a.nombre)), 'title="Descargar"')}], c.adjuntos, 'Sin archivos adjuntos.'))
        + (ed ? `<div class="fac-btns">${AC.btn('Cancelar','soCancelar()','pink')}${AC.btn('Guardar','soGuardar()','','id="soGuardar"')}</div>` : '') : '')
      + '</div>';
  }
  return CC.filtros({ id:'soF', titulo:'Consulta Configuración de Días Libres', sub:'Ingrese datos para buscar', cols:3,
    campos:[CC.campo('Ámbito', CC.selector(['Línea','Cliente'], f.ambito, `id="soFAmb" ${dis} onchange="soAmbito()"`, 'Elegir Ámbito')),
      f.ambito==='Línea' ? CC.campo('Línea', CC.selector(CC.datos.lineas.map(l=>[l.codigo,l.nombre]), f.linea, `id="soFLin" ${dis}`, 'Ingresar Línea')) : '',
      f.ambito==='Cliente' ? CC.campo('Cliente', CC.selector(CC.datos.socios.consignatarios.map(c=>c.razonSocial), f.cliente, `id="soFCli" ${dis}`, 'Ingresar Cliente')) : '',
      f.ambito ? CC.campo('Tipo de Operación', CC.selector(SO_OPER, f.oper, `id="soFOper" ${dis}`, 'Elegir Tipo de Operación')) : ''],
    buscar:'soBuscar()', limpiar:'soLimpiar()' }) + res;
}
CC.registrarPantalla({
  id:'screenAcSobreestadia', grupo:G, opcion:'Sobreestadía', titulo:'Consulta Configuración de Días Libres',
  migas:['Inicio','Sobreestadía','Buscar Configuración de Días Libres'], html: soHtml,
  alAbrir: () => { if(SO.edit){ SO.edit = false; CC.refrescar('screenAcSobreestadia'); } },
  guia:[{t:'Días libres', steps:[{el:'#soF', h:'Buscar', p:'Elige Ámbito (Línea o Cliente), el socio y el Tipo de Operación.'}]}]
});

/* ============================================================
   7. DAÑO DE CONTENEDORES
============================================================ */
const DA = { f:{desde:'',hasta:'',linea:'',dep:'',suc:'Callao'}, res:null, sel:[], lista:null, vista:'buscar', nuevo:null, seq:40 };
const DA_REGLA = {Notificar:['Pendiente','Rechazado'], Aprobar:['Notificado'], Rechazar:['Notificado'], Exonerar:['Pendiente','Notificado']};
const DA_NUEVO = {Notificar:'Notificado', Aprobar:'Aprobado', Rechazar:'Rechazado', Exonerar:'Exonerado'};
const DA_TIPOS = [['Liquidación','pdf'],['Fotos','jpg'],['EIR','pdf']];
function daSeed(){
  if(DA.lista) return;
  const imp = CC.datos.contenedores.filter(c=>c.indicador==='Importación'), est = ['Pendiente','Notificado','Aprobado','Rechazado','Exonerado','Pendiente','Notificado','Pendiente'];
  DA.lista = est.map((e,i)=>{ const c = imp[i % imp.length], b = AC.bls().find(x=>x.numero===c.bl) || {};
    return { id:i+1, bl:c.bl, cont:c.numero, consig:b.consignatario||'-', dep:AC.depositos[i % 3].codigo, agente:b.agente||'-', naveViaje:`${c.nave} - ${c.viaje}`, costos:150 + i*85, sucursal: i===7 ? 'Paita' : 'Callao',
      ingreso:`2026-11-${pad(2+i)}`, creacion:`2026-11-${pad(3+i)}T09:${pad(10+i)}`, presupuesto:`PRE-${2026}${String(510+i).padStart(4,'0')}`, linea:c.linea,
      adjuntos:[{nombre:`Liquidacion_${c.numero}.pdf`, fecha:`2026-11-${pad(3+i)}T09:00`}, {nombre:`Foto_${c.numero}.jpg`, fecha:`2026-11-${pad(3+i)}T09:00`}, {nombre:`EIR_${c.numero}.pdf`, fecha:`2026-11-${pad(3+i)}T09:00`}], estado:e, hist:[] }; });
}
function daLeer(){ ['desde:daFDesde','hasta:daFHasta','linea:daFLin','dep:daFDep','suc:daFSuc'].forEach(x=>{ const [k,id] = x.split(':'); if($(id)) DA.f[k] = AC.v(id); }); }
const daFiltrar = () => { const f = DA.f; return DA.lista.filter(d=>(!f.desde || d.ingreso >= f.desde) && (!f.hasta || d.ingreso <= f.hasta) && (!f.linea || d.linea===f.linea) && (!f.dep || d.dep===f.dep) && (!f.suc || d.sucursal===f.suc)); };
window.daBuscar = () => { daLeer(); DA.res = daFiltrar(); DA.sel = []; CC.refrescar('screenAcDanos'); };
window.daLimpiar = () => { DA.f = {desde:'',hasta:'',linea:'',dep:'',suc:''}; DA.res = null; DA.sel = []; CC.refrescar('screenAcDanos'); };
window.daSel = (id, on) => { daLeer(); DA.sel = on ? [...new Set(DA.sel.concat(id))] : DA.sel.filter(x=>x!==id); CC.refrescar('screenAcDanos'); };
window.daAccion = acc => {
  const sel = DA.lista.filter(d=>DA.sel.includes(d.id)), malos = sel.filter(d=>!DA_REGLA[acc].includes(d.estado));
  if(malos.length){ CC.toast(`No se puede ${acc.toLowerCase()}: ${malos.length} daño(s) en estado ${[...new Set(malos.map(d=>d.estado))].join(', ')}. Solo se permite desde ${DA_REGLA[acc].join(' o ')}.`,'error'); return; }
  const verbo = acc.toLowerCase();
  AC.dlg(AC.cab(`Confirmar ${acc}`) + `<p class="ac-p">Indique el motivo para ${verbo} los daños seleccionados.</p>${CC.campo('Motivo *', '<textarea id="daMot" rows="3" maxlength="500" placeholder="Escriba el motivo"></textarea>')}`
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Confirmar', AC.cb(()=>{
      const m = AC.v('daMot'); if(!m){ CC.toast('El motivo es obligatorio.','error'); return; }
      sel.forEach(d=>{ d.hist.push({ts:Date.now(), user:AC.yo(), prev:d.estado, next:DA_NUEVO[acc], comment:m}); d.estado = DA_NUEVO[acc]; });
      AC.cerrar(); DA.sel = []; CC.refrescar('screenAcDanos'); CC.toast('Estado actualizado correctamente.','success');
      if(acc==='Notificar' && CC.verPropuestas) daCorreo(sel, m);
      else if(acc==='Notificar') AC.correo(sel.map(d=>({para:`${AC.correoDe(d.consig)}; ${AC.correoDe(AC.lineaNombre(d.linea))}`, cc:`sucursal.${AC.slug(d.sucursal)}@cosmos.example`, asunto:`Notificación de daño de contenedor ${d.cont} - BL ${d.bl}`, adjuntos:d.adjuntos.map(a=>a.nombre).join(', '),
        cuerpo:`Estimados:\n\nSe registró un daño en el contenedor ${d.cont} (BL ${d.bl}), devuelto en ${depNom(d.dep)}.\nCosto estimado: USD ${CC.dinero(d.costos)}. Presupuesto ${d.presupuesto}.\nMotivo: ${m}\n\nAtención al Cliente`})), 'Correo de notificación enviado');
    }), '', 'data-ac="da-confirmar"')), 'sm');
};
/* Propuestas en el aviso de cobranza de daños: I-094 (HU-ATC-06) depósito notificante y asunto que identifica la carga;
   I-028 (HU-ATC-07) un solo asunto (el de I-048) y destinatarios: contactos de Atención al Cliente de consignatario, embarcador y naviera, con copia a la sucursal.
   El mensaje y los sustentos se mantienen como hoy. */
const daAsunto = d => { const [nave, viaje] = String(d.naveViaje).split(' - ');
  return `[AVISO DE COBRANZA - DAÑOS DE CONTENEDORES] BL ${d.bl} CONT ${d.cont} - ${nave || '-'} Viaje: ${viaje || '-'}`; };
const daPara = d => [['Consignatario', AC.correoDe(d.consig)], ['Embarcador', `atencion@embarcador${AC.slug(d.bl).slice(-4)}.example`], ['Naviera', AC.correoDe(AC.lineaNombre(d.linea))]];
function daCorreo(sel, motivo){
  AC.dlg(AC.cab('Correo de notificación enviado', 'Vista previa: así llega el aviso de cobranza de daños.')
    + sel.map(d=>`<div class="ac-mail" data-da-mail="${esc(d.cont)}"><dl>
        <dt>Para</dt><dd>${daPara(d).map(([r,c])=>`${esc(c)} <span class="ac-mut">(${r})</span>`).join('<br>')} ${CC.marca('Corrige','HU-ATC-07','I-028')}</dd>
        <dt>CC</dt><dd>sucursal.${esc(AC.slug(d.sucursal))}@cosmos.example <span class="ac-mut">(Sucursal ${esc(d.sucursal)})</span></dd>
        <dt>Asunto</dt><dd><b data-da-asunto>${esc(daAsunto(d))}</b> ${CC.marca('Corrige','HU-ATC-06','I-094')}</dd>
        <dt>Adjuntos</dt><dd>${esc(d.adjuntos.map(a=>a.nombre).join(', '))}</dd></dl>
      <div class="ac-body">${esc(`Estimados:\n\nSe registró un daño en el contenedor ${d.cont} (BL ${d.bl}), devuelto en ${depNom(d.dep)}.\nCosto estimado: USD ${CC.dinero(d.costos)}. Presupuesto ${d.presupuesto}.\nMotivo: ${motivo}\n\nAtención al Cliente`)}</div>
      <div ${CC.propuesta('HU-ATC-06 · I-094','Depósito notificante')} style="margin-top:6px;padding:6px 8px;border-radius:8px">Depósito notificante: <b>${esc(depNom(d.dep))}</b></div></div>`).join('')
    + `<div ${CC.propuesta('HU-ATC-07 · I-028','Asunto y destinatarios','fac-note')} id="daCorreoNota" style="margin-top:10px">Un solo asunto para todo aviso de cobranza de daños: BL, contenedor, nave y viaje, armado en la plantilla de correo. Para que un contacto reciba el aviso, basta con registrarlo como contacto de Atención al Cliente en el socio.</div>`
    + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-correo"')), 'md');
}
window.daAdjuntos = id => { const d = DA.lista.find(x=>x.id===id);
  const tablaAdj = x => x.adjuntos.length ? AC.tabla([{t:'Archivo', k:'nombre'}, {t:'Fecha de carga', v:a=>AC.fh(a.fecha)}, {t:'Descargar', v:a=>AC.btn('Descargar', AC.cb(()=>AC.descargar(a.nombre)), 'ghost')}], x.adjuntos) : '<div class="ac-empty">El daño no tiene adjuntos.</div>';
  if(CC.verPropuestas){ const grupo = DA.lista.filter(x=>x.bl===d.bl);
    AC.dlg(AC.cab('Adjuntos', `BL ${esc(d.bl)} · ${grupo.length} contenedor(es) con daño`) + `<div ${CC.propuesta('I-047','HU-ATC-06 · Adjuntos por contenedor')} id="daAdjGrupos" style="padding:10px;border-radius:8px">
      ${grupo.map(x=>`<details ${x.id===d.id?'open':''} data-da-grupo="${esc(x.cont)}" style="border:1px solid #DCE3EC;border-radius:8px;margin-top:8px;background:#fff">
        <summary style="cursor:pointer;padding:10px 12px"><b>${esc(x.cont)}</b> <span class="ac-mut">${x.adjuntos.length} archivo(s) · ${esc(x.estado)}</span></summary><div style="padding:0 12px 12px">${tablaAdj(x)}</div></details>`).join('')}</div>`
      + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-adj"')), 'md');
    return; }
  AC.dlg(AC.cab('Adjuntos', `${esc(d.cont)} · BL ${esc(d.bl)}`) + (d.adjuntos.length ? AC.tabla([{t:'Archivo', k:'nombre'}, {t:'Fecha de carga', v:a=>AC.fh(a.fecha)}, {t:'Descargar', v:a=>AC.btn('Descargar', AC.cb(()=>AC.descargar(a.nombre)), 'ghost')}], d.adjuntos) : '<div class="ac-empty">El daño no tiene adjuntos.</div>')
    + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-adj"')), 'md'); };
window.daCargar = () => {
  daLeer(); const f = DA.f;
  if(!f.linea){ CC.toast('Seleccione una línea naviera para cargar archivos.','error'); return; }
  if(!f.dep){ CC.toast('Seleccione un depósito para cargar archivos.','error'); return; }
  const tipos = [['Consolidado de Costos','xlsx']].concat(DA_TIPOS), st = {files:[]}; let bg;
  const html = () => AC.cab('Cargar Archivos') + `<div class="fac-g2">${CC.campoLectura('LÍNEA NAVIERA', AC.lineaNombre(f.linea))}${CC.campo('TIPO DE DOCUMENTO', CC.selector(tipos.map(t=>t[0]), '', 'id="daCT"', 'Seleccione el tipo'))}</div>
    <div class="ac-row" style="margin:8px 0">${AC.btn('Cargar', AC.cb(()=>{ const t = AC.v('daCT'); if(!t){ CC.toast('Seleccione el tipo de documento.','error'); return; } const ext = tipos.find(x=>x[0]===t)[1];
      st.files.push(Object.assign({tipo:t}, AC.archivo(t.replace(/\s+/g,'_'), ext))); AC.repintar(bg, html()); }), 'ghost', 'data-ac="da-cargar"')}<span class="ac-mut">Simulación: cada clic agrega un archivo ficticio del tipo elegido. Máx 10 MB.</span></div>`
    + AC.tabla([{t:'Tipo', k:'tipo'}, {t:'Archivo', k:'nombre'}, {t:'Tamaño', k:'tam'}, {t:'Fecha', v:a=>AC.fh(a.fecha)}, {t:'Usuario', k:'usuario'}, {t:'Acciones', v:(a,i)=>AC.link('Quitar', AC.cb(()=>{ st.files.splice(i,1); AC.repintar(bg, html()); }))}], st.files, 'Sin archivos cargados.')
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{
      const falta = tipos.map(t=>t[0]).filter(t=>!st.files.some(x=>x.tipo===t)); if(falta.length){ CC.toast(`Faltan adjuntos requeridos: ${falta.join(', ')}.`,'error'); return; }
      const imp = CC.datos.contenedores.filter(c=>c.indicador==='Importación' && c.linea===f.linea).slice(0,2); let n = 0;
      imp.forEach(c=>{ const ex = DA.lista.find(d=>d.cont===c.numero && d.dep===f.dep);
        if(ex){ if(ex.estado==='Rechazado'){ ex.estado = 'Pendiente'; n++; } return; }
        const b = AC.bls().find(x=>x.numero===c.bl) || {}; n++;
        DA.lista.push({id:++DA.seq, bl:c.bl, cont:c.numero, consig:b.consignatario||'-', dep:f.dep, agente:b.agente||'-', naveViaje:`${c.nave} - ${c.viaje}`, costos:320, sucursal:f.suc||'Callao', ingreso:AC.hoy(), creacion:AC.ahora(), presupuesto:`PRE-2026${String(600+DA.seq).padStart(4,'0')}`, linea:f.linea,
          adjuntos:st.files.filter(x=>x.tipo!=='Consolidado de Costos').map(x=>({nombre:x.nombre, fecha:x.fecha})), estado:'Pendiente', hist:[]}); });
      AC.cerrar(); DA.res = daFiltrar(); CC.refrescar('screenAcDanos'); CC.toast(`Archivos listos: ${st.files.length}. Daños creados o actualizados en Pendiente: ${n}.`,'success');
    }), '', st.files.length ? 'data-ac="da-guardar"' : 'data-ac="da-guardar" disabled'));
  bg = AC.dlg(html(), 'lg');
};
function daBuscarHtml(){
  daSeed(); const f = DA.f, lin = CC.datos.lineas.map(l=>[l.codigo,l.nombre]), deps = AC.depositos.map(d=>[d.codigo,d.razon]), n = DA.sel.length;
  return CC.filtros({ id:'daF', titulo:'Búsqueda de Daños', sub:'Complete los filtros para buscar daños.', cols:3,
      acciones: AC.btn('Nuevo Daño','daNuevo()','','id="daNuevo"') + AC.btn('Cargar Archivo','daCargar()','ghost','id="daCargar"'),
      campos:[CC.campo('DESDE', `<input type="date" id="daFDesde" value="${esc(f.desde)}">`), CC.campo('HASTA', `<input type="date" id="daFHasta" value="${esc(f.hasta)}">`),
        CC.campo('LÍNEA NAVIERA', CC.selector(lin, f.linea, 'id="daFLin"', 'Seleccionar')), CC.campo('DEPÓSITO', CC.selector(deps, f.dep, 'id="daFDep"', 'Seleccionar')),
        CC.campo('SUCURSAL', CC.selector(AC.sucursales, f.suc, 'id="daFSuc"', 'Seleccionar'))],
      buscar:'daBuscar()', limpiar:'daLimpiar()' })
    + (DA.res ? `<div class="fac-card" id="daRes"><div class="fac-head"><h3>Resultados (${DA.res.length})</h3><div class="fac-acts">${AC.errConnect('Control de cambios de estado')}
        ${['Notificar','Aprobar','Rechazar','Exonerar'].map(a=>AC.btn(a, `daAccion('${a}')`, a==='Rechazar'?'pink':a==='Notificar'?'':'ghost', `id="da${a}" ${n?'':'disabled'}`)).join('')}</div></div>
        <div class="ac-mut" style="margin-bottom:6px">Notificar: desde Pendiente o Rechazado. Aprobar y Rechazar: desde Notificado. Exonerar: desde Pendiente o Notificado.</div>`
      + AC.tabla([{t:'', v:d=>`<input type="checkbox" ${DA.sel.includes(d.id)?'checked':''} onchange="daSel(${d.id},this.checked)">`}, {t:'BL', k:'bl'}, {t:'Contenedor', k:'cont'}, {t:'Consignatario/Embarcador', k:'consig'},
        {t:'Depósito Notificante', v:d=>esc(depNom(d.dep))}, {t:'Agente Aduana', k:'agente'}, {t:'Nave/Viaje', k:'naveViaje'}, {t:'Costos', v:d=>'USD '+CC.dinero(d.costos)}, {t:'Sucursal', k:'sucursal'},
        {t:'F. Ingreso', v:d=>AC.f(d.ingreso)}, {t:'F. Creación', v:d=>AC.fh(d.creacion)}, {t:'N° Presupuesto', k:'presupuesto'},
        {t:'Adjuntos', v:d=>d.adjuntos.length ? AC.link(`📎 ${d.adjuntos.length}`, `daAdjuntos(${d.id})`, `data-da-adj="${d.id}"`) : ''},
        {t:'Estado', v:d=>CC.chipEstado(d.estado, d.estado==='Aprobado'||d.estado==='Exonerado'?'aprobada':d.estado==='Rechazado'?'rechazada':'pendiente')}], DA.res, 'Sin resultados') + '</div>' : '');
}
/* Nuevo Daño */
window.daNuevo = () => { DA.nuevo = {bl:'', nv:'', conts:[], sel:[], form:{}, adjuntos:[], selAdj:[]}; DA.vista = 'nuevo'; daPintar(); };
function daPintar(){ CC.refrescar('screenAcDanos'); if(DA.vista==='nuevo') CC.barra('Nuevo Daño', ['Inicio','Atención al Cliente','Nuevo Daño'], 'daVolver()'); }
window.daVolver = () => { DA.vista = 'buscar'; DA.nuevo = null; CC.abrir('screenAcDanos'); };
function daLeerN(){ const N = DA.nuevo; if($('daNBl')) N.bl = AC.v('daNBl'); if($('daNNv')) N.nv = AC.v('daNNv');
  ['consig:daNCons','agente:daNAg','linea:daNLin','dep:daNDep','costos:daNCos','suc:daNSuc','ingreso:daNIng','pres:daNPre'].forEach(x=>{ const [k,id] = x.split(':'); if($(id)) N.form[k] = AC.v(id); });
  N.sel = [...document.querySelectorAll('.daNCont:checked')].map(x=>x.value); }
window.daNBuscar = () => { daLeerN(); const N = DA.nuevo;
  if(!N.bl){ CC.toast('Ingrese un BL para buscar.','error'); return; }
  const b = AC.bls().find(x=>x.numero===N.bl.toUpperCase());
  if(!b){ N.conts = []; CC.toast('No se encontraron datos para el BL.','error'); daPintar(); return; }
  N.bl = b.numero; N.nv = `${b.nave} - ${b.viaje}`; N.conts = AC.contsDe(b.numero).map(c=>c.numero); N.sel = [];
  N.form = {consig:b.consignatario, agente:b.agente, linea:b.linea, dep:'', costos:'', suc:'Callao', ingreso:AC.hoy(), pres:''}; daPintar(); };
window.daNLimpiar = () => { DA.nuevo = {bl:'', nv:'', conts:[], sel:[], form:{}, adjuntos:[], selAdj:[]}; daPintar(); };
window.daNSubir = () => { daLeerN(); const st = {files:[]}; let bg;
  const html = () => AC.cab('Adjuntos', `${st.files.length} archivos seleccionados`) + `<div class="fac-g2">${CC.campo('TIPO DE DOCUMENTO', CC.selector(DA_TIPOS.map(t=>t[0]), '', 'id="daNT"', 'Seleccione el tipo'))}</div>
    <div class="ac-row" style="margin:8px 0">${AC.btn('Cargar', AC.cb(()=>{ const t = AC.v('daNT'); if(!t){ CC.toast('Seleccione el tipo de documento.','error'); return; } st.files.push(Object.assign({tipo:t}, AC.archivo(t, DA_TIPOS.find(x=>x[0]===t)[1]))); AC.repintar(bg, html()); }), 'ghost', 'data-ac="da-n-cargar"')}<span class="ac-mut">Liquidación y EIR: PDF. Fotos: JPG. Máx 10 MB.</span></div>`
    + AC.tabla([{t:'Tipo', k:'tipo'}, {t:'Archivo', k:'nombre'}, {t:'Tamaño', k:'tam'}, {t:'Fecha', v:a=>AC.fh(a.fecha)}, {t:'Usuario', k:'usuario'}, {t:'Acciones', v:(a,i)=>AC.link('Quitar', AC.cb(()=>{ st.files.splice(i,1); AC.repintar(bg, html()); }))}], st.files, 'Sin archivos.')
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{ if(!st.files.length) return; DA.nuevo.adjuntos.push(...st.files); AC.cerrar(); daPintar(); }), '', 'data-ac="da-n-guardar"'));
  bg = AC.dlg(html(), 'lg'); };
window.daNSelAdj = (i, on) => { daLeerN(); const N = DA.nuevo; N.selAdj = on ? [...new Set(N.selAdj.concat(i))] : N.selAdj.filter(x=>x!==i); daPintar(); };
window.daNEliminarAdj = () => { daLeerN(); const N = DA.nuevo; N.adjuntos = N.adjuntos.filter((a,i)=>!N.selAdj.includes(i)); N.selAdj = []; daPintar(); };
window.daNGuardar = () => { daLeerN(); const N = DA.nuevo, f = N.form;
  if(!N.sel.length){ CC.toast('Seleccione al menos un contenedor.','error'); return; }
  if(!f.consig || !N.nv || !f.agente || !f.linea || f.costos==='' || !f.suc || !f.ingreso || !f.pres){ CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
  /* Propuesta I-094 (HU-ATC-06): en el Portal Interno el depósito notificante es obligatorio */
  if(CC.verPropuestas && !f.dep){ CC.toast('Seleccione el depósito notificante.','error'); return; }
  const porCont = CC.verPropuestas;
  if(porCont){ const falta = N.sel.filter(c=>DA_TIPOS.some(t=>!(N.porCont[c]||[]).some(a=>a.tipo===t[0])));
    if(falta.length){ CC.toast(`Cada contenedor necesita Liquidación, Fotos y EIR. Falta completar: ${falta.join(', ')}.`,'error'); daNAbrir(falta[0]); return; } }
  else if(N.adjuntos.length < 3){ CC.toast('Adjunte los documentos obligatorios para guardar.','error'); return; }
  N.sel.forEach(c=>DA.lista.push({id:++DA.seq, bl:N.bl, cont:c, consig:f.consig, dep:f.dep, agente:f.agente, naveViaje:N.nv, costos:Number(f.costos), sucursal:f.suc, ingreso:f.ingreso, creacion:AC.ahora(), presupuesto:f.pres, linea:f.linea,
    adjuntos:(porCont ? N.porCont[c] : N.adjuntos).map(a=>({nombre:a.nombre, fecha:a.fecha})), estado:'Pendiente', hist:[]}));
  CC.toast('Daño creado correctamente.','success'); DA.res = null; daVolver(); };
/* Propuesta I-047 (HU-ATC-06): adjuntos agrupados por contenedor en desplegables */
const daTiposDe = l => DA_TIPOS.map(t=>t[0]).filter(t=>l.some(a=>a.tipo===t));
window.daNRe = () => { daLeerN(); daPintar(); };
window.daNAbrir = c => { daLeerN(); const N = DA.nuevo; N.abierto = N.abierto===c ? '' : c; daPintar(); };
window.daNSubirCont = c => { daLeerN(); const N = DA.nuevo; N.porCont = N.porCont || {}; const st = {files:[]}; let bg;
  const html = () => AC.cab('Adjuntos', `Contenedor ${esc(c)} · ${st.files.length} archivos seleccionados`) + `<div class="fac-g2">${CC.campo('TIPO DE DOCUMENTO', CC.selector(DA_TIPOS.map(t=>t[0]), '', 'id="daNT"', 'Seleccione el tipo'))}</div>
    <div class="ac-row" style="margin:8px 0">${AC.btn('Cargar', AC.cb(()=>{ const t = AC.v('daNT'); if(!t){ CC.toast('Seleccione el tipo de documento.','error'); return; } st.files.push(Object.assign({tipo:t}, AC.archivo(`${t}_${c}`, DA_TIPOS.find(x=>x[0]===t)[1]))); AC.repintar(bg, html()); }), 'ghost', 'data-ac="da-n-cargar"')}<span class="ac-mut">Liquidación y EIR: PDF. Fotos: JPG. Máx 10 MB.</span></div>`
    + AC.tabla([{t:'Tipo', k:'tipo'}, {t:'Archivo', k:'nombre'}, {t:'Tamaño', k:'tam'}, {t:'Fecha', v:a=>AC.fh(a.fecha)}, {t:'Usuario', k:'usuario'}, {t:'Acciones', v:(a,i)=>AC.link('Quitar', AC.cb(()=>{ st.files.splice(i,1); AC.repintar(bg, html()); }))}], st.files, 'Sin archivos.')
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Guardar', AC.cb(()=>{ if(!st.files.length) return; (N.porCont[c] = N.porCont[c] || []).push(...st.files); N.abierto = c; AC.cerrar(); daPintar(); }), '', 'data-ac="da-n-guardar"'));
  bg = AC.dlg(html(), 'lg'); };
window.daNQuitarCont = (c, i) => { daLeerN(); const N = DA.nuevo; N.porCont[c].splice(i,1); N.abierto = c; daPintar(); };
function daNAcordeon(N, ok){
  N.porCont = N.porCont || {};
  const sel = N.conts.filter(c=>N.sel.includes(c));
  if(N.abierto===undefined && sel.length) N.abierto = sel[0];
  const caja = c => { const l = N.porCont[c] || [], tipos = daTiposDe(l), abierto = N.abierto===c;
    return `<details ${abierto?'open':''} data-da-grupo="${esc(c)}" style="border:1px solid #DCE3EC;border-radius:8px;margin-top:8px;background:#fff">
      <summary onclick="event.preventDefault();daNAbrir('${esc(c)}')" style="cursor:pointer;padding:10px 12px;display:flex;gap:12px;align-items:center"><b>${abierto?'▾':'▸'} ${esc(c)}</b>
        <span class="ac-mut">${l.length} archivo(s)</span><span class="ac-mut">${tipos.length===DA_TIPOS.length ? 'Completo' : `Falta: ${DA_TIPOS.map(t=>t[0]).filter(t=>!tipos.includes(t)).join(', ')}`}</span></summary>
      <div style="padding:0 12px 12px"><div class="ac-row" style="justify-content:flex-end;margin-bottom:6px">${AC.btn('Subir archivo', `daNSubirCont('${esc(c)}')`, 'ghost', `data-da-subir="${esc(c)}"`)}</div>
        ${AC.tabla([{t:'Archivo', k:'nombre'}, {t:'Tipo', k:'tipo'}, {t:'Fecha', v:a=>AC.fh(a.fecha)}, {t:'Acciones', v:(a,i)=>AC.link('Quitar', `daNQuitarCont('${esc(c)}',${i})`)}], l, 'Sin adjuntos para este contenedor.')}</div></details>`; };
  return `<div ${CC.propuesta('I-047','HU-ATC-06 · Adjuntos por contenedor')} id="daNAdjCont" style="margin-top:12px;padding:10px;border-radius:8px">
    <div class="ac-row"><b>Adjuntos por contenedor</b><span class="ac-mut">Cada contenedor necesita Liquidación, Fotos y EIR. Lo que cargue en uno no se asocia a otro.</span></div>
    ${!ok ? '<div class="ac-mut" style="margin-top:6px">Busque el BL para ver sus contenedores.</div>' : sel.length ? sel.map(caja).join('') : '<div class="ac-mut" style="margin-top:6px">Seleccione contenedores para cargar sus adjuntos.</div>'}</div>`;
}
function daNuevoHtml(){
  const N = DA.nuevo, f = N.form, ok = N.conts.length > 0, dis = ok ? '' : 'disabled';
  return `<div class="fac-card" id="daNuevoF"><div class="fac-head"><h3>Nuevo Daño</h3></div><div class="fac-sec" style="margin-top:0">Búsqueda por BL</div>
    <div class="fac-g3">${CC.campo('BL', AC.lista('daNBl', N.bl, AC.bls().map(b=>b.numero), 'Ingrese BL'))}${CC.campo('Nave - Viaje *', CC.selector(N.nv ? [N.nv] : [], N.nv, 'id="daNNv"', 'Seleccionar'))}</div>
    <div class="fac-btns" style="position:static">${AC.btn('Buscar','daNBuscar()','','id="daNBuscar"')}${AC.btn('Limpiar','daNLimpiar()','ghost')}</div>
    ${ok ? `<div class="ac-row"><b>Contenedores encontrados para BL: ${esc(N.bl)}</b><span class="ac-mut">${N.sel.length} seleccionados</span></div>${AC.tabla([{t:'', v:c=>`<input type="checkbox" class="daNCont" value="${esc(c)}" ${N.sel.includes(c)?'checked':''} onchange="daNRe()">`}, {t:'Contenedor', v:c=>esc(c)}], N.conts)}` : ''}
    <div class="fac-g3" style="margin-top:12px">${CC.campo('Consignatario / Embarcador *', CC.selector(CC.datos.socios.consignatarios.map(c=>c.razonSocial).concat(CC.datos.socios.embarcadores.map(c=>c.razonSocial)), f.consig, `id="daNCons" ${dis}`, 'Seleccionar'))}
      ${CC.campo('Nave - Viaje *', `<input disabled value="${esc(N.nv)}">`)}${CC.campo('Agente de Aduana *', CC.selector(AC.agentes.map(a=>a.nombre), f.agente, `id="daNAg" ${dis}`, 'Seleccionar'))}
      ${CC.campo('Línea Naviera *', CC.selector(CC.datos.lineas.map(l=>[l.codigo,l.nombre]), f.linea, `id="daNLin" ${dis}`, 'Seleccionar'))}${CC.verPropuestas ? CC.campo(`Depósito notificante * ${CC.marca('Agrega','HU-ATC-06','I-094')}`, CC.selector(AC.depositos.map(d=>[d.codigo,d.razon]), f.dep, `id="daNDep" ${dis}`, 'Seleccionar el depósito que comunica el daño'))
        : CC.campo('Depósito', CC.selector(AC.depositos.map(d=>[d.codigo,d.razon]), f.dep, `id="daNDep" ${dis}`, 'Seleccionar'))}
      ${CC.campo('Costos (USD) *', `<input type="number" min="0" id="daNCos" value="${esc(f.costos??'')}" ${dis}>`)}${CC.campo('Sucursal *', CC.selector(AC.sucursales, f.suc, `id="daNSuc" ${dis}`, 'Seleccionar'))}
      ${CC.campo('Fecha de Ingreso *', `<input type="date" id="daNIng" value="${esc(f.ingreso||'')}" ${dis}>`)}${CC.campo('N° de Presupuesto *', `<input id="daNPre" value="${esc(f.pres||'')}" ${dis}>`)}</div>
    ${CC.verPropuestas ? daNAcordeon(N, ok) : `<div class="ac-row" style="margin-top:12px"><b>Adjuntos</b><span class="ac-mut">Mínimo 3 (Liquidación, Fotos y EIR)</span><span class="ac-sp"></span>${AC.btn('Subir archivo','daNSubir()','ghost', ok ? 'id="daNSubir"' : 'disabled')}${AC.btn('Eliminar','daNEliminarAdj()','pink', N.selAdj.length ? '' : 'disabled')}</div>
    ${AC.tabla([{t:'', v:(a,i)=>`<input type="checkbox" ${N.selAdj.includes(i)?'checked':''} onchange="daNSelAdj(${i},this.checked)">`}, {t:'Archivo', k:'nombre'}, {t:'Tipo', k:'tipo'}, {t:'Fecha', v:a=>AC.fh(a.fecha)}], N.adjuntos, 'Sin adjuntos.')}`}
    <div class="fac-btns">${AC.btn('Cancelar','daVolver()','ghost')}${AC.btn('Guardar','daNGuardar()','','id="daNGuardar"')}</div></div>`;
}
CC.registrarPantalla({
  id:'screenAcDanos', grupo:G, opcion:'Daño de Contenedores', titulo:'Búsqueda de Daños', migas:['Inicio','Atención al Cliente','Búsqueda de Daños'],
  html: () => DA.vista==='nuevo' && DA.nuevo ? daNuevoHtml() : daBuscarHtml(),
  alAbrir: () => { if(DA.vista!=='buscar'){ DA.vista = 'buscar'; DA.nuevo = null; CC.refrescar('screenAcDanos'); } },
  guia:[{t:'Daños', steps:[{el:'#daF', h:'Buscar', p:'Filtra por fechas, línea, depósito y sucursal. Marca filas para Notificar, Aprobar, Rechazar o Exonerar.'}]}]
});

/* ============================================================
   8. GESTIÓN DE SUSPENSIONES
============================================================ */
const SU = { f:{tipo:'',socio:'',estado:'',ini:'',fin:''}, res:null, pagina:1, tam:10, lista:null, seq:10 };
const SU_TIPOS = ['Cliente','Operador logístico','Agente de aduanas','Embarcador'];
const SU_ESTADOS = ['Suspendido','Levantamiento temporal activo','Levantamiento definitivo','Cerrado'];
const SU_LEV = ['Levantamiento temporal','Levantamiento definitivo','Levantamiento temporal por BL'];
const suSocios = t => t==='Cliente' ? CC.datos.socios.consignatarios.map(c=>({doc:c.ruc, nombre:c.razonSocial})) : t==='Operador logístico' ? AC.operadores : t==='Agente de aduanas' ? AC.agentes
  : t==='Embarcador' ? CC.datos.socios.embarcadores.map(c=>({doc:c.ruc, nombre:c.razonSocial})) : [];
const suTxt = s => s ? `${s.doc} - ${s.nombre}` : '-';
function suSeed(){
  if(SU.lista) return;
  const so = (t, i) => suSocios(t)[i], h = (fecha, accion) => ({fecha, usuario:'R. Salas', accion});
  const mk = (id, tipo, si, estado, motivo, ini, fin, extra) => Object.assign({id, tipo, socio:so(tipo, si), estado, motivo, ini, fin, indef:!fin, adjuntos:[AC.archivo('Sustento_suspension','pdf')], lev:null,
    hist:[h(`${ini}T09:00`, `Se creó la suspensión de socio. Motivo: ${motivo}`), h(`${ini}T09:01`, `Correo de suspensión enviado al área de Servicio al Cliente. Tipo: ${tipo}. Motivo: ${motivo}`)]}, extra||{});
  SU.lista = [
    mk(1,'Cliente',1,'Suspendido','Deuda vencida por sobreestadía','2026-11-10',''),
    mk(2,'Agente de aduanas',0,'Levantamiento temporal activo','Documentos observados en tres despachos','2026-11-01','2026-12-15', {lev:{tipo:'Levantamiento temporal', dias:10, hasta:AC.sumarDias(AC.hoy(),5), bls:[], motivo:'Compromiso de regularización'}}),
    mk(3,'Embarcador',1,'Levantamiento definitivo','Carta de garantía vencida','2026-10-05',''),
    mk(4,'Cliente',3,'Cerrado','Pago pendiente de flete','2026-09-01','2026-10-30'),
    mk(5,'Operador logístico',1,'Suspendido','Incidencias reiteradas en retiro de contenedores','2026-11-15','2026-12-31')
  ];
}
/* Proceso automático de vencimientos (simulado al abrir la pantalla) */
function suVencer(){ const hoy = AC.hoy();
  SU.lista.forEach(s=>{
    if(s.estado==='Levantamiento temporal activo' && s.lev && s.lev.hasta && s.lev.hasta < hoy){ s.estado = 'Suspendido'; s.hist.push({fecha:AC.ahora(), usuario:'Sistema', accion:`Levantamiento temporal vencido automáticamente. Fecha de fin del levantamiento: ${AC.f(s.lev.hasta)}. Estado restaurado a Suspendido.`}); }
    if(s.estado==='Suspendido' && s.fin && s.fin < hoy){ s.estado = 'Cerrado'; s.hist.push({fecha:AC.ahora(), usuario:'Sistema', accion:`Suspensión cerrada automáticamente por vencimiento. Fecha de fin: ${AC.f(s.fin)}.`}); }
  }); }
/* Usado por Liberación de la Carga */
AC.suspensionVigente = nombre => { suSeed(); return SU.lista.some(s=>s.socio && s.socio.nombre===nombre && s.estado==='Suspendido'); };
const suDias = s => { const a = new Date(s.ini+'T00:00'), b = new Date((s.fin && s.fin < AC.hoy() ? s.fin : AC.hoy())+'T00:00'); return Math.max(0, Math.round((b-a)/864e5)); };
function suLeer(){ ['tipo:suFTipo','socio:suFSocio','estado:suFEst','ini:suFIni','fin:suFFin'].forEach(x=>{ const [k,id] = x.split(':'); if($(id)) SU.f[k] = AC.v(id); }); }
const suFiltrar = () => { const f = SU.f; return SU.lista.filter(s=>(!f.tipo || s.tipo===f.tipo) && (!f.socio || s.socio.doc===f.socio) && (!f.estado || f.estado==='Todos' || s.estado===f.estado) && (!f.ini || s.ini >= f.ini) && (!f.fin || s.ini <= f.fin))
  .sort((a,b)=>a.socio.nombre.localeCompare(b.socio.nombre)); };
window.suTipoF = () => { suLeer(); SU.f.socio = ''; CC.refrescar('screenAcSuspensiones'); };
window.suBuscar = () => { suLeer(); const f = SU.f; if(!f.tipo && !f.estado && !f.ini && !f.fin) return; SU.res = suFiltrar(); SU.pagina = 1; CC.refrescar('screenAcSuspensiones'); if(!SU.res.length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); };
window.suLimpiar = () => { SU.f = {tipo:'',socio:'',estado:'',ini:'',fin:''}; SU.res = null; CC.refrescar('screenAcSuspensiones'); };
window.suPagina = (p, t) => { if(t) SU.tam = t; SU.pagina = p; CC.refrescar('screenAcSuspensiones'); };
const suRe = () => { if(SU.res) SU.res = suFiltrar(); CC.refrescar('screenAcSuspensiones'); };
function suHtml(){
  suSeed(); suVencer(); const f = SU.f;
  return CC.filtros({ id:'suF', titulo:'Gestión de suspensiones', sub:'Ingresa uno o más filtros para encontrar un socio.', cols:3,
      acciones: AC.btn('+ Nuevo','suModal(0,\'crear\')','','id="suNuevo"'),
      campos:[CC.campo('Tipo de socio', CC.selector(SU_TIPOS, f.tipo, 'id="suFTipo" onchange="suTipoF()"', 'Elegir un tipo')),
        CC.campo('Socio', CC.selector(suSocios(f.tipo).map(s=>[s.doc, suTxt(s)]), f.socio, `id="suFSocio" ${f.tipo?'':'disabled'}`, 'Buscar socio')),
        CC.campo('Estado de suspensión', CC.selector(['Todos'].concat(SU_ESTADOS), f.estado, 'id="suFEst"', 'Elegir un estado')),
        CC.campo('Fecha Inicio', `<input type="date" id="suFIni" value="${esc(f.ini)}">`), CC.campo('Fecha Fin', `<input type="date" id="suFFin" value="${esc(f.fin)}">`)],
      buscar:'suBuscar()', limpiar:'suLimpiar()' })
    + (SU.res ? CC.tablaResultados({ id:'suRes', filas:SU.res, pagina:SU.pagina, tam:SU.tam, fnPagina:'suPagina',
      columnas:[{t:'Tipo de socio', k:'tipo'}, {t:'Socio', v:s=>esc(suTxt(s.socio))}, {t:'Estado suspensión', v:s=>CC.chipEstado(s.estado, s.estado==='Suspendido'?'rechazada':s.estado==='Cerrado'?'anulada':s.estado==='Levantamiento definitivo'?'aprobada':'pendiente')},
        {t:'Motivo', v:s=>esc(s.motivo.length > 40 ? s.motivo.slice(0,40)+'...' : s.motivo)}, {t:'F. inicio', v:s=>AC.f(s.ini)}, {t:'F. fin', v:s=>s.fin ? AC.f(s.fin) : 'Indefinida'}, {t:'Días suspendido', v:s=>esc(suDias(s))},
        {t:'Acciones', v:s=>{ const lev = s.estado==='Suspendido' || s.estado==='Levantamiento temporal activo';
          return `<div class="fac-rowacts">${AC.link('Ver detalle', `suModal(${s.id},'detalle')`, `data-su="${s.id}"`)}${AC.link('Levantar', `suLevantar(${s.id})`, lev ? `data-su-lev="${s.id}"` : 'disabled class="fac-link dis"')}${AC.link('Historial', `suHistorial(${s.id})`)}</div>`; }}] }) : '');
}
window.suModal = (id, modo) => {
  suSeed(); const orig = id ? SU.lista.find(x=>x.id===id) : null;
  const st = { modo, s: orig ? AC.clon(orig) : {id:0, tipo:'', socio:null, estado:'Suspendido', motivo:'', ini:'', fin:'', indef:false, adjuntos:[], lev:null, hist:[]}, sucio:false }; let bg;
  const ro = () => st.modo==='detalle';
  const leer = () => { const s = st.s; if($('suMTipo')) s.tipo = AC.v('suMTipo'); if($('suMSocio')){ const d = AC.v('suMSocio'); s.socio = suSocios(s.tipo).find(x=>x.doc===d) || null; }
    if($('suMMot')) s.motivo = AC.v('suMMot'); if($('suMIni')) s.ini = AC.v('suMIni'); if($('suMFin')) s.fin = AC.v('suMFin'); if($('suMInd')) s.indef = $('suMInd').checked; if(s.indef) s.fin = ''; };
  const re = () => { leer(); AC.repintar(bg, html()); };
  const titulo = () => st.modo==='crear' ? 'Nueva suspensión' : st.modo==='detalle' ? 'Detalle de suspensión' : 'Editar suspensión';
  const html = () => { const s = st.s, dis = ro() ? 'disabled' : '', bloq = st.modo!=='crear' ? 'disabled' : '', minIni = st.modo==='crear' ? AC.hoy() : (orig ? orig.ini : '');
    return AC.cab(titulo(), '', AC.cb(salir))
      + `<div class="fac-sec" style="margin-top:0">Datos de la entidad</div><div class="fac-g2">${CC.campo('Tipo de socio *', CC.selector(SU_TIPOS, s.tipo, `id="suMTipo" ${bloq} ${dis} onchange="${AC.cb(()=>{ leer(); st.s.socio = null; st.sucio = true; AC.repintar(bg, html()); })}"`, 'Elegir un tipo'))}
        ${CC.campo('Socio', CC.selector(suSocios(s.tipo).map(x=>[x.doc, suTxt(x)]), s.socio ? s.socio.doc : '', `id="suMSocio" ${bloq} ${dis} ${s.tipo?'':'disabled'}`, 'Buscar socio'))}</div>
      <div class="fac-sec">Detalle de la suspensión</div><div class="fac-g2">${CC.campo('Motivo de la suspensión *', `<textarea id="suMMot" rows="4" maxlength="500" placeholder="Ingresar motivo de suspensión" ${dis}>${esc(s.motivo)}</textarea>`, 'fac-span4')}
        ${CC.campo('Fecha Inicio Suspensión *', `<input type="date" id="suMIni" min="${minIni}" value="${esc(s.ini)}" ${dis}>`)}
        ${CC.campo('Fecha Fin Suspensión', `<input type="date" id="suMFin" value="${esc(s.fin)}" ${dis || (s.indef ? 'disabled' : '')}>`)}
        <div class="fac-f"><label class="fac-chk"><input type="checkbox" id="suMInd" ${s.indef?'checked':''} ${dis} onchange="${AC.cb(re)}"> Suspensión indefinida</label></div></div>`
      + (ro() && s.lev ? `<div class="fac-note" id="suLevVig"><b>Último levantamiento:</b> ${esc(s.lev.tipo)}${s.lev.dias ? ` · ${s.lev.dias} días · vence el ${AC.f(s.lev.hasta)}` : ''}${s.lev.bls && s.lev.bls.length ? ` · BL: ${esc(s.lev.bls.join(', '))}` : ''} ${AC.errConnect('Guarda días y fecha fin del levantamiento')}</div>` : '')
      + `<div class="fac-sec">Documento de sustento *</div><div class="ac-row"><span class="ac-mut">Adjuntar documento de respaldo.</span><span class="ac-sp"></span>${AC.btn('Subir archivos', AC.cb(()=>{ leer(); AC.adjuntar({base:'Sustento_suspension'}, f=>{ st.s.adjuntos.push(...f); st.sucio = true; AC.repintar(bg, html()); }); }), 'ghost', `${dis} data-ac="su-subir"`)}</div>`
      + AC.tabla([{t:'Archivo', k:'nombre'}, {t:'Acción', v:(a,i)=>`<div class="fac-rowacts">${AC.link('Descargar', AC.cb(()=>AC.descargar(a.nombre)))}${ro() ? '' : AC.link('Eliminar', AC.cb(()=>{ leer(); st.s.adjuntos.splice(i,1); AC.repintar(bg, html()); }))}</div>`}], s.adjuntos, 'Sin documentos.')
      + AC.pie(st.modo==='detalle' ? AC.btn('Editar', AC.cb(()=>{ st.modo = 'editar'; AC.repintar(bg, html()); }), 'ghost', 'data-ac="su-editar"') : '',
          AC.btn(st.modo==='detalle' ? 'Cerrar' : 'Cancelar', AC.cb(salir), 'ghost'),
          ro() ? '' : AC.btn(st.modo==='editar' ? 'Actualizar' : 'Guardar', AC.cb(guardar), '', 'data-ac="su-guardar"'));
  };
  const salir = () => { if(!ro()){ leer(); const cambio = st.sucio || JSON.stringify(st.s) !== JSON.stringify(orig ? Object.assign(AC.clon(orig), {}) : {id:0, tipo:'', socio:null, estado:'Suspendido', motivo:'', ini:'', fin:'', indef:false, adjuntos:[], lev:null, hist:[]});
      if(cambio){ AC.confirmar('Cambios sin guardar', 'Hay cambios sin guardar. ¿Desea salir sin guardar?', ()=>AC.cerrar(), 'Salir'); return; } } AC.cerrar(); };
  const guardar = () => { leer(); const s = st.s, crear = st.modo==='crear', hoy = AC.hoy();
    const err = (!s.tipo || !s.socio || !s.motivo || !s.ini) ? 'Por favor, complete todos los campos obligatorios.'
      : (crear && s.ini < hoy) ? 'La fecha de inicio no puede ser anterior a la fecha actual.' : (crear && s.fin && s.fin < hoy) ? 'La fecha de fin no puede ser anterior a la fecha actual.'
      : (!crear && s.ini < orig.ini) ? 'La fecha de inicio no puede ser anterior a la fecha ya registrada.' : (s.fin && s.fin < s.ini) ? 'La fecha de fin debe ser mayor o igual a la fecha de inicio.'
      : (!s.indef && !s.fin) ? 'Debe indicar suspensión indefinida o proporcionar fecha de fin.' : !s.adjuntos.length ? 'Se requiere al menos un documento de sustento para guardar.'
      : (crear && SU.lista.some(x=>x.socio && x.socio.doc===s.socio.doc && (x.estado==='Suspendido' || x.estado==='Levantamiento temporal activo'))) ? 'El socio ya tiene una suspensión activa. No se puede crear una nueva suspensión hasta que la existente sea resuelta.' : '';
    if(err){ CC.toast(err,'error'); return; }
    if(crear){ s.id = ++SU.seq; s.hist.push({fecha:AC.ahora(), usuario:AC.yo(), accion:`Se creó la suspensión de socio. Motivo: ${s.motivo}`}, {fecha:AC.ahora(), usuario:AC.yo(), accion:`Correo de suspensión enviado al área de Servicio al Cliente. Tipo: ${s.tipo}. Motivo: ${s.motivo}`}); SU.lista.push(s); SU.f.tipo = s.tipo; SU.f.socio = ''; SU.res = suFiltrar(); }
    else { s.hist.push({fecha:AC.ahora(), usuario:AC.yo(), accion:`Se actualizó la suspensión de socio. Motivo: ${s.motivo}`}); SU.lista[SU.lista.findIndex(x=>x.id===s.id)] = s; }
    AC.cerrar(); suRe(); CC.toast(crear ? 'Suspensión creada correctamente' : 'Suspensión actualizada correctamente','success'); };
  bg = AC.dlg(html(), 'md');
};
window.suLevantar = id => {
  const s = SU.lista.find(x=>x.id===id); if(!(s.estado==='Suspendido' || s.estado==='Levantamiento temporal activo')) return;
  const st = {tipo:'Levantamiento temporal', dias:'', bls:[], selBl:[], motivo:'', adjuntos:[]}; let bg;
  const leer = () => { const r = document.querySelector('input[name="suLT"]:checked'); if(r) st.tipo = r.value; if($('suLD')) st.dias = AC.v('suLD'); if($('suLM')) st.motivo = AC.v('suLM'); };
  const hasta = () => st.tipo!=='Levantamiento definitivo' && Number(st.dias) > 0 ? AC.sumarDias(AC.hoy(), Number(st.dias)) : '';
  const html = () => { const def = st.tipo==='Levantamiento definitivo';
    return AC.cab('Levantamiento de suspensión', esc(suTxt(s.socio)))
      + `<div class="fac-sec" style="margin-top:0">Tipo de levantamiento</div><div class="fac-radio" style="flex-direction:row;gap:20px;flex-wrap:wrap">${SU_LEV.map(t=>`<label><input type="radio" name="suLT" value="${t}" ${st.tipo===t?'checked':''} onchange="${AC.cb(()=>{ leer(); if(st.tipo==='Levantamiento definitivo') st.dias = ''; AC.repintar(bg, html()); })}"> ${t}</label>`).join('')}</div>
      <div class="fac-g2" style="margin-top:10px">${CC.campo('Días de levantamiento *', `<input type="number" min="1" max="90" id="suLD" placeholder="Ingresar días de levantamiento" value="${esc(st.dias)}" ${def?'disabled':''} onchange="${AC.cb(()=>{ leer(); AC.repintar(bg, html()); })}">`)}
        ${CC.campo(`Fecha fin de levantamiento ${AC.errConnect('Se guarda con el levantamiento')}`, `<input disabled placeholder="AUTO (hoy + días)" value="${hasta() ? `AUTO (${AC.f(hasta())})` : ''}">`)}</div>`
      + (st.tipo==='Levantamiento temporal por BL' ? `<div class="ac-row" style="margin-top:10px"><div class="fac-sec" style="margin:0">BL</div><span class="ac-sp"></span>${AC.btn('Agregar BL', AC.cb(()=>{ leer(); suAgregarBl(st, ()=>AC.repintar(bg, html())); }), 'ghost', 'data-ac="su-agregar-bl"')}${AC.btn('Eliminar', AC.cb(()=>{ leer(); st.bls = st.bls.filter(b=>!st.selBl.includes(b.bl)); st.selBl = []; AC.repintar(bg, html()); }), 'pink', st.selBl.length ? '' : 'disabled')}</div>`
          + AC.tabla([{t:'', v:b=>`<input type="checkbox" ${st.selBl.includes(b.bl)?'checked':''} onchange="${AC.cb(()=>{ leer(); st.selBl = st.selBl.includes(b.bl) ? st.selBl.filter(x=>x!==b.bl) : st.selBl.concat(b.bl); AC.repintar(bg, html()); })}">`}, {t:'BL', k:'bl'}, {t:'BL Hijo', v:b=>esc(b.hijo||'-')}, {t:'Nave', k:'nave'}, {t:'Viaje', k:'viaje'}], st.bls, 'Sin BL agregados.') : '')
      + `<div class="fac-sec">Detalle del levantamiento</div>${CC.campo('Motivo del levantamiento *', `<textarea id="suLM" rows="3" maxlength="500" placeholder="Ingresar motivo del levantamiento">${esc(st.motivo)}</textarea>`)}
      <div class="fac-sec">Documento de sustento *</div><div class="ac-row"><span class="ac-mut">Adjuntar documento de respaldo.</span><span class="ac-sp"></span>${AC.btn('Subir archivos', AC.cb(()=>{ leer(); AC.adjuntar({base:'Sustento_levantamiento'}, f=>{ st.adjuntos.push(...f); AC.repintar(bg, html()); }); }), 'ghost', 'data-ac="su-lev-subir"')}</div>`
      + AC.tabla([{t:'Archivo', k:'nombre'}, {t:'Acción', v:(a,i)=>AC.link('Eliminar', AC.cb(()=>{ leer(); st.adjuntos.splice(i,1); AC.repintar(bg, html()); }))}], st.adjuntos, 'Sin documentos.')
      + AC.pie(AC.btn('Cancelar', AC.cb(()=>{ leer(); if(st.motivo || st.dias || st.adjuntos.length || st.bls.length) AC.confirmar('Cambios sin guardar', 'Hay cambios sin guardar. ¿Desea salir sin guardar?', ()=>AC.cerrar(), 'Salir'); else AC.cerrar(); }), 'ghost'),
          AC.btn('Guardar', AC.cb(()=>{ leer(); const def = st.tipo==='Levantamiento definitivo', d = Number(st.dias);
            if(!st.motivo || (!def && !(Number.isInteger(d) && d >= 1 && d <= 90))){ CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
            if(st.tipo==='Levantamiento temporal por BL' && !st.bls.length){ CC.toast('Este campo es obligatorio','error'); return; }
            if(!st.adjuntos.length){ CC.toast('Se requiere al menos un documento de sustento para guardar.','error'); return; }
            const prev = s.estado; s.estado = def ? 'Levantamiento definitivo' : 'Levantamiento temporal activo';
            s.lev = {tipo:st.tipo, dias: def ? 0 : d, hasta: def ? '' : hasta(), bls:st.bls.map(b=>b.bl), motivo:st.motivo};
            s.hist.push({fecha:AC.ahora(), usuario:AC.yo(), accion:`Se creó el levantamiento de suspensión de socio. Tipo: ${st.tipo}. Estado cambiado de ${prev} a ${s.estado}.${def ? '' : ` Días: ${d}. Vence: ${AC.f(s.lev.hasta)}.`}`},
              {fecha:AC.ahora(), usuario:AC.yo(), accion:`Correo de levantamiento de suspensión enviado al área de Servicio al Cliente. Tipo: ${st.tipo}. Motivo: ${st.motivo}. BLs: ${st.bls.length ? st.bls.map(b=>b.bl).join(', ') : 'Ninguno'}`});
            AC.cerrar(); suRe(); CC.toast('Suspensión levantada correctamente','success');
          }), '', 'data-ac="su-lev-guardar"'));
  };
  bg = AC.dlg(html(), 'md');
};
function suAgregarBl(lev, listo){
  const st = {nave:'', viaje:'', bl:'', hijo:'', res:null, sel:[]}; let bg;
  const leer = () => { ['nave:suBN','viaje:suBV','bl:suBB','hijo:suBH'].forEach(x=>{ const [k,id] = x.split(':'); if($(id)) st[k] = AC.v(id); }); };
  const html = () => AC.cab('Agregar BL') + `<div class="fac-g4">${CC.campo('Nave', CC.selector([...new Set(AC.bls().map(b=>b.nave))], st.nave, `id="suBN" onchange="${AC.cb(()=>{ leer(); st.viaje = ''; AC.repintar(bg, html()); })}"`, 'Ingresar nave'))}
      ${CC.campo('Viaje', CC.selector([...new Set(AC.bls().filter(b=>b.nave===st.nave).map(b=>b.viaje))].map(v=>[v, `${v} - ${st.nave}`]), st.viaje, `id="suBV" ${st.nave?'':'disabled'}`, 'Ingresar viaje'))}
      ${CC.campo('BL Master', `<input id="suBB" placeholder="Ingresar BL Master" value="${esc(st.bl)}">`)}${CC.campo('BL Hijo', `<input id="suBH" placeholder="Ingresar BL Hijo" value="${esc(st.hijo)}">`)}</div>
    <div class="fac-btns" style="position:static">${AC.btn('Buscar', AC.cb(()=>{ leer(); if(!st.nave && !st.bl && !st.hijo){ CC.toast('Este campo es obligatorio','error'); return; }
      st.res = AC.bls().filter(b=>(!st.nave || b.nave===st.nave) && (!st.viaje || b.viaje===st.viaje) && AC.tiene(b.numero, st.bl) && AC.tiene(b.hijo, st.hijo)).slice(0,200); AC.repintar(bg, html()); }), '', 'data-ac="su-bl-buscar"')}
      ${AC.btn('Limpiar', AC.cb(()=>{ Object.assign(st, {nave:'', viaje:'', bl:'', hijo:'', res:null, sel:[]}); AC.repintar(bg, html()); }), 'ghost')}</div>`
    + (st.res ? `<b>Resultados (${st.res.length})</b>` + AC.tabla([{t:'', v:b=>`<input type="checkbox" ${st.sel.includes(b.numero)?'checked':''}>`}, {t:'BL', k:'numero'}, {t:'BL Hijo', v:b=>esc(b.hijo||'-')}, {t:'Nave', k:'nave'}, {t:'Viaje', k:'viaje'}], st.res, '',
        b=>`style="cursor:pointer" data-bl="${esc(b.numero)}" onclick="${AC.cb(()=>{ leer(); st.sel = st.sel.includes(b.numero) ? st.sel.filter(x=>x!==b.numero) : st.sel.concat(b.numero); AC.repintar(bg, html()); })}"`) : '')
    + AC.pie(AC.btn('Cancelar','acCerrar()','ghost'), AC.btn('Agregar', AC.cb(()=>{ if(!st.sel.length) return;
      st.sel.forEach(n=>{ if(!lev.bls.some(x=>x.bl===n)){ const b = AC.bls().find(x=>x.numero===n); lev.bls.push({bl:n, hijo:b.hijo, nave:b.nave, viaje:b.viaje}); } }); AC.cerrar(); listo(); }), '', `data-ac="su-bl-agregar" ${st.sel.length?'':'disabled'}`));
  bg = AC.dlg(html(), 'lg');
}
window.suHistorial = id => { const s = SU.lista.find(x=>x.id===id), filas = SU.lista.filter(x=>x.socio.doc===s.socio.doc).flatMap(x=>x.hist).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  AC.dlg(AC.cab(`Historial (${esc(s.socio.nombre)})`) + AC.tabla([{t:'Fecha', v:h=>AC.fh(h.fecha)}, {t:'Usuario', k:'usuario'}, {t:'Acción', v:h=>`<span style="white-space:normal">${esc(h.accion)}</span>`}], filas, 'Sin movimientos.')
    + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-hist"')), 'md'); };
CC.registrarPantalla({
  id:'screenAcSuspensiones', grupo:G, opcion:'Gestión de Suspensiones', titulo:'Buscar suspensiones', migas:['Servicio al cliente','Gestión de suspensiones','Buscar suspensiones'],
  html: suHtml,
  guia:[{t:'Suspensiones', steps:[{el:'#suF', h:'Buscar', p:'Elige el tipo de socio o el estado. Desde la grilla ves el detalle, levantas la suspensión o revisas el historial.'}]}]
});

/* ============================================================
   9. APROBACIÓN DE USUARIOS WEB
============================================================ */
const UW = { f:{ruc:'',emp:'',tdoc:'',doc:'',nom:'',ape:'',est:'',desde:'',hasta:''}, res:null, sel:[], pagina:1, tam:10, lista:null };
const UW_EST = ['Pendiente','Aprobada','Rechazada'];
function uwSeed(){
  if(UW.lista) return;
  const cons = CC.datos.socios.consignatarios, emb = CC.datos.socios.embarcadores;
  const p = [['Lucía','Paredes Quispe'],['Jorge','Salinas Rivas'],['Carmen','Huamán Torres'],['Diego','Valdivia Ramos'],['Rosa','Mendoza Chávez'],['Luis','Aguilar Soto'],['Ana','Castillo Vega'],['Pedro','Núñez Flores']];
  const est = ['Pendiente','Pendiente','Pendiente','Aprobada','Aprobada','Rechazada','Pendiente','Aprobada'], usr = ['','','','Activo','Inactivo','Inactivo','','Activo'];
  UW.lista = p.map(([n,a],i)=>{ const e = i % 2 ? emb[i % emb.length] : cons[i % cons.length];
    return {id:i+1, ruc:e.ruc, empresa:e.razonSocial, nombres:n, apellidos:a, tdoc: i===6 ? 'CE' : 'DNI', doc: i===6 ? '00184523' : String(40120000 + i*1371), correo:`${AC.slug(n)}.${AC.slug(a.split(' ')[0])}@${AC.slug(e.razonSocial)}.example`, tel:`+51 9${String(81000000 + i*12345).slice(0,8)}`,
      roles: i===2 ? ['CLIENTE IMPORTADOR','AGENTE DE CARGA (inactivo)'] : i % 2 ? ['CLIENTE EXPORTADOR'] : ['CLIENTE IMPORTADOR','CONSULTA DE PAGOS','DESCARGA DE MEMO'],
      estado:est[i], usuario:usr[i], creacion:`2026-11-${pad(4+i*2)}`, motivo: est[i]==='Rechazada' ? 'La declaración jurada no tiene firma.' : ''}; });
}
function uwLeer(){ ['ruc:uwFRuc','emp:uwFEmp','tdoc:uwFTdoc','doc:uwFDoc','nom:uwFNom','ape:uwFApe','est:uwFEst','desde:uwFDesde','hasta:uwFHasta'].forEach(x=>{ const [k,id] = x.split(':'); if($(id)) UW.f[k] = AC.v(id); }); }
const uwFiltrar = () => { const f = UW.f; return UW.lista.filter(u=>AC.tiene(u.ruc, f.ruc) && AC.tiene(u.empresa, f.emp) && (!f.tdoc || u.tdoc===f.tdoc) && AC.tiene(u.doc, f.doc) && AC.tiene(u.nombres, f.nom) && AC.tiene(u.apellidos, f.ape) && (!f.est || u.estado===f.est) && (!f.desde || u.creacion >= f.desde) && (!f.hasta || u.creacion <= f.hasta)); };
window.uwBuscar = () => { uwLeer(); UW.res = uwFiltrar(); UW.sel = []; UW.pagina = 1; CC.refrescar('screenAcUsuariosWeb'); if(!UW.res.length) CC.toast('No se encontraron resultados','info'); };
window.uwLimpiar = () => { UW.f = {ruc:'',emp:'',tdoc:'',doc:'',nom:'',ape:'',est:'',desde:'',hasta:''}; UW.res = null; UW.sel = []; CC.refrescar('screenAcUsuariosWeb'); };
window.uwPagina = (p, t) => { if(t) UW.tam = t; UW.pagina = p; CC.refrescar('screenAcUsuariosWeb'); };
window.uwSel = (id, on) => { uwLeer(); UW.sel = on ? [...new Set(UW.sel.concat(id))] : UW.sel.filter(x=>x!==id); CC.refrescar('screenAcUsuariosWeb'); };
const uwRe = () => { UW.res = uwFiltrar(); UW.sel = []; CC.refrescar('screenAcUsuariosWeb'); };
const uwMail = (u, asunto, cuerpo) => ({para:u.correo, cc:'atencion.cliente@cosmos.example', asunto, cuerpo:`Estimado(a) ${u.nombres} ${u.apellidos}:\n\n${cuerpo}\n\nAtención al Cliente`});
window.uwAprobar = () => AC.confirmar('Confirmación', '¿Está seguro de aprobar las solicitudes seleccionadas?', ()=>{
  const sel = UW.lista.filter(u=>UW.sel.includes(u.id)); let omit = 0, total = 0;
  sel.forEach(u=>{ u.estado = 'Aprobada'; u.usuario = 'Activo'; total += u.roles.length; omit += u.roles.filter(r=>/inactivo/i.test(r)).length; });
  uwRe(); CC.toast(omit ? `Solicitud aprobada. Se asignaron ${total-omit} de ${total} roles solicitados; ${omit} omitido(s) por estar inactivo(s).` : 'Las solicitudes seleccionadas han sido aprobadas exitosamente.','success');
  AC.correo(sel.map(u=>uwMail(u, 'Usuario web creado', `Su solicitud de acceso al Portal Externo fue aprobada. Usuario: ${u.correo}. Recibirá un enlace para crear su contraseña.`)), 'Correo de usuario creado');
});
window.uwRechazar = () => AC.pedirMotivo({titulo:'Confirmación de Rechazo', etiqueta:'Motivo de Rechazo', placeholder:'Ingresar Motivo de Rechazo', error:'El motivo de rechazo es obligatorio.', boton:'Aceptar'}, m=>
  AC.confirmar('Confirmación', '¿Está seguro de rechazar las solicitudes seleccionadas?', ()=>{
    const sel = UW.lista.filter(u=>UW.sel.includes(u.id)); sel.forEach(u=>{ u.estado = 'Rechazada'; u.usuario = 'Inactivo'; u.motivo = m; });
    uwRe(); CC.toast('Las solicitudes seleccionadas han sido rechazadas exitosamente.','success');
    AC.correo(sel.map(u=>uwMail(u, 'Solicitud de acceso rechazada', `Su solicitud de acceso al Portal Externo fue rechazada. Motivo: ${m}`)), 'Correo de rechazo');
  }));
window.uwActivar = id => AC.confirmar('Confirmación', '¿Está seguro de activar el usuario web seleccionado?', ()=>{ const u = UW.lista.find(x=>x.id===id); u.usuario = 'Activo'; uwRe();
  CC.toast('El usuario web ha sido activado exitosamente.','success'); AC.correo(uwMail(u, 'Usuario web activado', 'Su usuario del Portal Externo fue activado nuevamente.'), 'Correo de activación'); });
window.uwInactivar = id => AC.pedirMotivo({titulo:'Inactivar Usuario', etiqueta:'Motivo de Inactivación', placeholder:'Ingresar Motivo de Inactivación', error:'El motivo de inactivación es obligatorio.', boton:'Aceptar'}, m=>
  AC.confirmar('Confirmación', '¿Está seguro de inactivar el usuario web seleccionado?', ()=>{ const u = UW.lista.find(x=>x.id===id); u.usuario = 'Inactivo'; uwRe();
    CC.toast('El usuario web ha sido inactivado exitosamente.','success'); AC.correo(uwMail(u, 'Usuario web inactivado', `Su usuario del Portal Externo fue inactivado. Motivo: ${m}`), 'Correo de desactivación'); }));
window.uwDeclaracion = id => { const u = UW.lista.find(x=>x.id===id);
  AC.dlg(AC.cab('Declaración Jurada', 'Vista previa del PDF (simulación)') + `<div class="fac-pdf"><div class="fp-top"><div class="fp-logo">COSMOS</div><div class="fp-co"><b>DECLARACIÓN JURADA</b><br>Solicitud de acceso al Portal Externo</div><div class="fp-box">N° ${String(u.id).padStart(6,'0')}</div></div>
    <p style="margin-top:14px">Yo, <b>${esc(u.nombres)} ${esc(u.apellidos)}</b>, identificado(a) con ${esc(u.tdoc)} N° ${esc(u.doc)}, en representación de <b>${esc(u.empresa)}</b> (RUC ${esc(u.ruc)}), declaro bajo juramento que la información proporcionada es verdadera y que usaré el acceso solo para las gestiones de mi empresa.</p>
    <p>Roles solicitados: ${esc(u.roles.join(', '))}.</p><p>Correo: ${esc(u.correo)} · Teléfono: ${esc(u.tel)}</p><p>Fecha: ${AC.f(u.creacion)}</p><table class="fp-sign"><tr><td></td><td><div>Firma del solicitante</div></td><td></td></tr></table></div>`
    + AC.pie(AC.btn('Descargar PDF', AC.cb(()=>AC.descargar(`Declaracion_jurada_${u.doc}.pdf`)), 'ghost'), AC.btn('Cerrar','acCerrar()','','data-ac="cerrar-dj"')), 'lg'); };
function uwHtml(){
  uwSeed(); const f = UW.f, n = UW.sel.length;
  return CC.filtros({ id:'uwF', titulo:'Buscar Aprobación de Usuarios Web', sub:'Ingrese datos para buscar', cols:4,
      campos:[CC.campo('RUC', AC.lista('uwFRuc', f.ruc, UW.lista.map(u=>u.ruc), 'Ingresar RUC', 'maxlength="20"')), CC.campo('Empresa / Razón Social', AC.lista('uwFEmp', f.emp, [...new Set(UW.lista.map(u=>u.empresa))], 'Ingresar Empresa', 'maxlength="100"')),
        CC.campo('Tipo de Documento', CC.selector(['DNI','CE','PAS'], f.tdoc, 'id="uwFTdoc"', 'Seleccionar')), CC.campo('Número de Documento', `<input id="uwFDoc" maxlength="20" value="${esc(f.doc)}">`),
        CC.campo('Nombres', `<input id="uwFNom" maxlength="256" value="${esc(f.nom)}">`), CC.campo('Apellidos', `<input id="uwFApe" maxlength="256" value="${esc(f.ape)}">`),
        CC.campo('Estado de la Solicitud', CC.selector(UW_EST, f.est, 'id="uwFEst"', 'Seleccionar')),
        CC.campo('Fecha de Creación', `<div class="ac-row"><input type="date" id="uwFDesde" max="${AC.hoy()}" value="${esc(f.desde)}" style="flex:1"><input type="date" id="uwFHasta" max="${AC.hoy()}" value="${esc(f.hasta)}" style="flex:1"></div>`)],
      buscar:'uwBuscar()', limpiar:'uwLimpiar()' })
    + (UW.res ? CC.tablaResultados({ id:'uwRes', filas:UW.res, pagina:UW.pagina, tam:UW.tam, fnPagina:'uwPagina', vacio:'No se encontraron resultados',
      acciones: AC.btn('Aprobar','uwAprobar()','', `id="uwAprobar" ${n?'':'disabled'}`) + AC.btn('Rechazar','uwRechazar()','pink', `id="uwRechazar" ${n?'':'disabled'}`),
      columnas:[{t:'', v:u=>u.estado==='Pendiente' ? `<input type="checkbox" ${UW.sel.includes(u.id)?'checked':''} onchange="uwSel(${u.id},this.checked)" data-uw="${u.id}">` : ''},
        {t:'RUC', k:'ruc'}, {t:'Empresa', k:'empresa'}, {t:'Nombre Completo', v:u=>esc(`${u.nombres} ${u.apellidos}`)}, {t:'Número de Documento', v:u=>esc(`${u.tdoc} ${u.doc}`)},
        {t:'Contacto', v:u=>`${esc(u.correo)}<div class="ac-mut">${esc(u.tel)}</div>`},
        {t:'Roles', v:u=>`<span title="Roles solicitados: ${esc(u.roles.join(', '))}"><span class="fac-pill">${esc(u.roles[0])}</span>${u.roles.length > 1 ? ` <span class="ac-mut">+${u.roles.length-1} más</span>` : ''}</span>`},
        {t:'Estado de la Solicitud', v:u=>`<span title="${esc(u.motivo)}">${CC.chipEstado(u.estado)}</span>`}, {t:'Estado del Usuario', v:u=>u.usuario ? CC.chipEstado(u.usuario, u.usuario==='Activo'?'aprobada':'anulada') : '-'},
        {t:'Fecha de Creación', v:u=>AC.f(u.creacion)},
        {t:'Acciones', v:u=>`<div class="fac-rowacts">${AC.link('Declaración Jurada', `uwDeclaracion(${u.id})`, `title="Descargar Declaración Jurada" data-uw-dj="${u.id}"`)}
          ${u.estado==='Aprobada' && u.usuario==='Activo' ? AC.link('Inactivar Usuario', `uwInactivar(${u.id})`, `data-uw-inact="${u.id}"`) : ''}${u.estado==='Aprobada' && u.usuario==='Inactivo' ? AC.link('Activar Usuario', `uwActivar(${u.id})`, `data-uw-act="${u.id}"`) : ''}</div>`}] }) : '');
}
CC.registrarPantalla({
  id:'screenAcUsuariosWeb', grupo:G, opcion:'Aprobación de Usuarios Web', titulo:'Buscar Aprobación de Usuarios Web', migas:['Inicio','Aprobación de Usuarios Web','Buscar Aprobación de Usuarios Web'],
  html: uwHtml,
  guia:[{t:'Usuarios web', steps:[{el:'#uwF', h:'Buscar', p:'Filtra solicitudes del Portal Externo. Marca las pendientes para aprobarlas o rechazarlas.'}]}]
});

/* ============================================================
   10. MANDATO ELECTRÓNICO (propuesta I-046, HU-ATC-01)
   En Connect la aprobación, observación y rechazo están en el Portal Externo. Aquí se proponen en Atención al cliente
   del portal interno, con los mismos estados y datos del mandato del portal externo (modulos/portal-externo.js).
============================================================ */
const MD_EST = {PENDIENTE:'Pendiente', OBSERVADO:'Observado', APROBADO:'Aprobado', RECHAZADO:'Rechazado'};
const MD_TONO = {PENDIENTE:'pendiente', OBSERVADO:'pendiente', APROBADO:'aprobada', RECHAZADO:'rechazada'};
const MD_AG = 'AGENCIA DE ADUANAS DEMO S.A.C.', MD_OP = 'OPERADOR LOGÍSTICO DEMO S.A.C.';
const mdH = (prev, next, com, user, ts) => ({prev, next, com:com||'', user, ts});
const MD = { f:{cliente:'', tipo:'', oper:'', estado:'PENDIENTE', desde:'', hasta:''}, buscado:false, pagina:1, tam:10, lista:[
  {n:'ME-000101', cliente:'ANDES MINING EXPORT S.A.', tipo:'Por Vigencia', bl:'', desde:'2026-10-01', hasta:'2027-03-31', tTer:'Agente de Aduana', tercero:MD_AG, oper:'Importación', estado:'APROBADO', fReg:'2026-09-28T10:15', archivo:'mandato-andes-agencia.pdf', obs:'',
    hist:[mdH('','PENDIENTE','','importador@andesmining.example','2026-09-28T10:15'), mdH('PENDIENTE','APROBADO','','mesa.ayuda@cosmos.example','2026-09-29T09:02')]},
  {n:'ME-000102', cliente:'TEXTILES COSTA VERDE S.A.', tipo:'Por BL', bl:'ZIMEXP0026013', desde:'', hasta:'', tTer:'Operador Logístico', tercero:MD_OP, oper:'Exportación', estado:'PENDIENTE', fReg:'2026-11-18T16:40', archivo:'', obs:'',
    hist:[mdH('','PENDIENTE','','exportador@costaverde.example','2026-11-18T16:40')]},
  {n:'ME-000103', cliente:'ANDES MINING EXPORT S.A.', tipo:'Por Vigencia', bl:'', desde:'2026-11-01', hasta:'2027-01-31', tTer:'Operador Logístico', tercero:MD_OP, oper:'Importación', estado:'OBSERVADO', fReg:'2026-11-10T11:20', archivo:'', obs:'Adjunte la vigencia firmada por el representante legal.',
    hist:[mdH('','PENDIENTE','','importador@andesmining.example','2026-11-10T11:20'), mdH('PENDIENTE','OBSERVADO','Adjunte la vigencia firmada por el representante legal.','mesa.ayuda@cosmos.example','2026-11-11T08:45')]},
  {n:'ME-000104', cliente:'PACIFIC CHEMICALS LTD', tipo:'Por BL', bl:'ZIMUBOX0000011', desde:'', hasta:'', tTer:'Agente de Aduana', tercero:MD_AG, oper:'Importación', estado:'RECHAZADO', fReg:'2026-10-02T15:00', archivo:'mandato-pacific.pdf', obs:'El documento no corresponde al BL.',
    hist:[mdH('','PENDIENTE','','mesa.ayuda@cosmos.example','2026-10-02T15:00'), mdH('PENDIENTE','RECHAZADO','El documento no corresponde al BL.','admin.portal@cosmos.example','2026-10-03T10:00')]},
  {n:'ME-000105', cliente:'PACIFIC CHEMICALS LTD', tipo:'Por Vigencia', bl:'', desde:'2026-11-15', hasta:'2027-05-15', tTer:'Agente de Aduana', tercero:MD_AG, oper:'Importación', estado:'PENDIENTE', fReg:'2026-11-19T09:30', archivo:'mandato-pacific-vigencia.pdf', obs:'',
    hist:[mdH('','PENDIENTE','','importador@pacificchem.example','2026-11-19T09:30')]}] };
const mdVig = m => m.tipo==='Por Vigencia' ? `${CC.fecha(m.desde)} a ${CC.fecha(m.hasta)}` : '-';
const mdFiltrar = () => { const f = MD.f; return MD.lista.filter(m=>(!f.cliente || AC.tiene(m.cliente, f.cliente)) && (!f.tipo || m.tipo===f.tipo) && (!f.oper || m.oper===f.oper) && (!f.estado || m.estado===f.estado)
  && (!f.desde || m.fReg.slice(0,10) >= f.desde) && (!f.hasta || m.fReg.slice(0,10) <= f.hasta)); };
const mdLeer = () => [['cliente','mdFCli'],['tipo','mdFTipo'],['oper','mdFOper'],['estado','mdFEst'],['desde','mdFDesde'],['hasta','mdFHasta']].forEach(([k,id])=>{ if($(id)) MD.f[k] = AC.v(id); });
const mdAcc = m => [AC.link('Ver', `mdVer('${m.n}')`, `data-md-ver="${m.n}"`),
  m.estado==='PENDIENTE' ? AC.link('Aprobar', `mdAccion('${m.n}','APROBADO')`, `data-md-aprobar="${m.n}"`) : '',
  m.estado==='PENDIENTE' ? AC.link('Observar', `mdAccion('${m.n}','OBSERVADO')`, `data-md-observar="${m.n}"`) : '',
  /PENDIENTE|OBSERVADO/.test(m.estado) ? AC.link('Rechazar', `mdAccion('${m.n}','RECHAZADO')`, `data-md-rechazar="${m.n}"`) : ''].filter(Boolean).join('');
window.mdBuscar = () => { mdLeer(); MD.buscado = true; MD.pagina = 1; CC.refrescar('screenAcMandato'); if(!mdFiltrar().length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); };
window.mdLimpiar = () => { MD.f = {cliente:'', tipo:'', oper:'', estado:'PENDIENTE', desde:'', hasta:''}; MD.buscado = false; CC.refrescar('screenAcMandato'); };
window.mdPagina = (p, t) => { if(t) MD.tam = t; MD.pagina = p; CC.refrescar('screenAcMandato'); };
window.mdExportar = () => CC.exportarExcel('Mandatos_Electronicos', 'Mandatos', ['Nro Mandato','Cliente','Tipo de socio','Nombre del socio','Tipo de Mandato','Vigencia','BL','Tipo de Operación','Estado','Fecha registro'],
  mdFiltrar().map(m=>[m.n, m.cliente, m.tTer, m.tercero, m.tipo, mdVig(m), m.bl||'-', m.oper, MD_EST[m.estado], CC.fecha(m.fReg)]));
function mdCambia(n, nuevo, com){ const m = MD.lista.find(x=>x.n===n);
  m.hist.push(mdH(m.estado, nuevo, com, AC.yo(), AC.ahora())); m.estado = nuevo; if(com) m.obs = com;
  const aviso = CC.verPropuestas && /OBSERVADO|RECHAZADO/.test(nuevo);
  CC.refrescar('screenAcMandato'); CC.toast(`Mandato ${n}: ${MD_EST[nuevo]}${aviso ? '. Se envió el aviso al cliente.' : ''}`, 'success'); }
/* Propuesta I-034 (HU-ATC-01): al observar o rechazar se envía el comentario al cliente.
   Para: usuario externo que registró el mandato y contactos de Atención al Cliente del socio. CC: usuario interno que decide.
   Si no hay correo registrado, el aviso queda registrado y la decisión se guarda igual. */
const mdAviso = (m, h) => ({ de:'Atención al Cliente <atencionalcliente@cosmos.example>',
  para:[m.hist[0] && /@/.test(m.hist[0].user) ? `${m.hist[0].user} (usuario que registró)` : '', `${AC.correoDe(m.cliente)} (Atención al Cliente de ${m.cliente})`].filter(Boolean),
  cc:/@/.test(h.user) ? h.user : `${AC.slug(h.user)}@cosmos.example`, asunto:`Mandato electrónico ${m.n}: ${MD_EST[h.next]}`,
  cuerpo:`Estimado buen día,\n\n${h.com},\n\nSaludos,\n\nAtención al Cliente\natencionalcliente@cosmos.example` });
window.mdCorreo = (n, i) => { const m = MD.lista.find(x=>x.n===n), h = m.hist[i], a = mdAviso(m, h);
  AC.dlg(AC.cab('Aviso al cliente', `Vista previa del correo enviado al cliente (mandato ${MD_EST[h.next].toLowerCase()})`)
    + `<div class="ac-mail" id="mdMail"><dl><dt>De</dt><dd>${esc(a.de)}</dd><dt>Para</dt><dd>${a.para.map(esc).join('<br>')}</dd><dt>CC</dt><dd>${esc(a.cc)} <span class="ac-mut">(usuario que decidió)</span></dd>
      <dt>Asunto</dt><dd><b>${esc(a.asunto)}</b> ${CC.marca('Agrega','HU-ATC-01','I-034')}</dd></dl><div class="ac-body">${esc(a.cuerpo)}</div></div>
      <div class="ac-mut" style="margin-top:8px">Si el cliente no tiene correo registrado, el aviso queda registrado y la decisión se guarda igual.</div>`
    + AC.pie(AC.btn('Cerrar','acCerrar()','','data-ac="md-correo-cerrar"')), 'md'); };
/* Propuesta I-083 (HU-ATC-01): el mandato se descarga sin error interno y se revisa antes de decidir */
window.mdPdf = n => { const m = MD.lista.find(x=>x.n===n);
  AC.pen('PEN-I083-02', 'I-083', 'HU-ATC-01', 'Ejecutar el retest de la descarga del mandato con perfil COSMOS para confirmar lo informado por el proveedor; si es conforme, pasar a cierre.', 'La descarga abre el documento del mandato elegido para revisarlo y luego aprobar, observar o rechazar.');
  AC.dlg(AC.cab(`Mandato Electrónico ${esc(m.n)}`, `Vista previa del documento ${esc(m.archivo)}`)
    + `<div ${CC.propuesta('HU-ATC-01 · I-083','Descarga del mandato')} id="mdPdfProp" style="padding:10px;border-radius:8px">${CC.marca('Corrige','HU-ATC-01','I-083','PEN-I083-02')}
      <div class="fac-pdf" style="margin-top:8px"><div class="fp-top"><div class="fp-logo">MANDATO</div><div class="fp-co"><b>${esc(m.cliente)}</b><br>Mandato electrónico ${esc(m.tipo==='Por BL' ? 'por BL' : 'por vigencia')}</div><div class="fp-box">${esc(m.n)}</div></div>
        <div class="fp-grid" style="margin-top:14px"><div class="fp-kv"><span class="k">Mandante</span><span>${esc(m.cliente)}</span><span class="k">Mandatario</span><span>${esc(m.tercero)}</span><span class="k">Tipo de socio</span><span>${esc(m.tTer)}</span></div>
        <div class="fp-kv"><span class="k">Operación</span><span>${esc(m.oper)}</span><span class="k">${m.tipo==='Por BL' ? 'BL' : 'Vigencia'}</span><span>${esc(m.tipo==='Por BL' ? m.bl : mdVig(m))}</span><span class="k">Fecha registro</span><span>${AC.fh(m.fReg)}</span></div></div>
        <p style="margin-top:12px">El mandante autoriza al mandatario a realizar en su nombre los trámites de la carga indicada ante Cosmos.</p></div>
      <div class="ac-mut" style="margin-top:6px">Se abre el documento del mandato elegido, sin error interno. Después de revisarlo, decide desde el detalle.</div></div>`
    + AC.pie(AC.btn('Descargar PDF', AC.cb(()=>AC.descargar(m.archivo)), 'ghost', 'data-ac="md-pdf-descargar"'), AC.btn('Cerrar','acCerrar()','','data-ac="md-pdf-cerrar"')), 'lg'); };
window.mdAccion = (n, nuevo) => {
  if(nuevo==='APROBADO') return AC.confirmar('Aprobar Mandato Electrónico', '¿Estás seguro de que deseas aprobar el mandato electrónico?', ()=>mdCambia(n, 'APROBADO', ''), 'Aceptar');
  const v = nuevo==='OBSERVADO' ? 'observar' : 'rechazar';
  AC.pedirMotivo({titulo:`${nuevo==='OBSERVADO' ? 'Observar' : 'Rechazar'} Mandato Electrónico`, texto:`Favor de ingresar la razón para ${v} este mandato electrónico:`, etiqueta:'Motivo', max:800, boton:'Aceptar'}, t=>mdCambia(n, nuevo, t));
};
window.mdVer = n => { const m = MD.lista.find(x=>x.n===n);
  AC.dlg(AC.cab(`Mandato Electrónico ${esc(m.n)}`, '') + CC.chipEstado(MD_EST[m.estado], MD_TONO[m.estado])
    + `<div class="fac-g3" style="margin-top:10px">${CC.campoLectura('Cliente', m.cliente)}${CC.campoLectura('Tipo de Mandato', m.tipo)}${CC.campoLectura('Tipo de Operación', m.oper)}
      ${CC.campoLectura('Tipo de socio', m.tTer)}${CC.campoLectura('Nombre del socio', m.tercero)}${CC.campoLectura(m.tipo==='Por BL' ? 'BL' : 'Vigencia', m.tipo==='Por BL' ? m.bl : mdVig(m))}
      ${CC.campoLectura('Fecha registro', AC.fh(m.fReg))}${CC.campoLectura('Observación', m.obs || '-')}
      <div class="fac-f"><label>Mandato electrónico (PDF/imagen)</label>${m.archivo ? AC.link(esc(m.archivo), CC.verPropuestas ? `mdPdf('${m.n}')` : AC.cb(()=>AC.descargar(m.archivo)), 'data-md-descargar="1"') : '<span class="ac-mut">Sin adjunto</span>'}</div></div>
    <div class="fac-sec">Historial</div>${AC.tabla([{t:'Estado Previo', v:h=>h.prev ? MD_EST[h.prev] : '-'}, {t:'Estado Actual', v:h=>MD_EST[h.next]}, {t:'Usuario', k:'user'}, {t:'Fecha', v:h=>AC.fh(h.ts)}, {t:'Comentario', v:h=>esc(h.com||'-')}]
      .concat(CC.verPropuestas ? [{t:`Aviso al cliente ${CC.marca('Agrega','HU-ATC-01','I-034')}`, v:(h,i)=>/OBSERVADO|RECHAZADO/.test(h.next) ? AC.link('Ver correo', `mdCorreo('${m.n}',${i})`, `data-md-correo="${i}"`) : '<span class="ac-mut">-</span>'}] : []), m.hist)}`
    + AC.pie(m.estado==='PENDIENTE' ? AC.btn('Observar', `acCerrar();mdAccion('${m.n}','OBSERVADO')`, 'ghost') : '', /PENDIENTE|OBSERVADO/.test(m.estado) ? AC.btn('Rechazar', `acCerrar();mdAccion('${m.n}','RECHAZADO')`, 'pink') : '',
      m.estado==='PENDIENTE' ? AC.btn('Aprobar', `acCerrar();mdAccion('${m.n}','APROBADO')`) : '', AC.btn('Cerrar','acCerrar()','ghost','data-ac="md-cerrar"')), 'lg');
};
function mdHtml(){
  const f = MD.f;
  return `<div class="fac-note" style="margin-bottom:12px">Hoy en Connect esta revisión se hace en el Portal Externo, opción Mandato Electrónico. Por definir (PEN-I046-01): si allí se retiran las acciones o se conservan para perfiles internos, y la matriz de permisos.</div>`
    + CC.filtros({ id:'mdF', titulo:'Mandatos Electrónicos', sub:'Ingresar datos', cols:3,
      campos:[CC.campo('Cliente', AC.lista('mdFCli', f.cliente, [...new Set(MD.lista.map(m=>m.cliente))], 'Ingresar Cliente')),
        CC.campo('Tipo de Mandato', CC.selector(['Por Vigencia','Por BL'], f.tipo, 'id="mdFTipo"', 'Todos')),
        CC.campo('Tipo de Operación', CC.selector(['Importación','Exportación'], f.oper, 'id="mdFOper"', 'Todos')),
        CC.campo('Estado', CC.selector(Object.entries(MD_EST), f.estado, 'id="mdFEst"', 'Todos')),
        CC.campo('Fecha de registro', `<div class="fac-range"><input type="date" id="mdFDesde" value="${esc(f.desde)}"><span>a</span><input type="date" id="mdFHasta" value="${esc(f.hasta)}"></div>`)],
      buscar:'mdBuscar()', limpiar:'mdLimpiar()' })
    + (MD.buscado ? CC.tablaResultados({ id:'mdRes', filas:mdFiltrar(), pagina:MD.pagina, tam:MD.tam, fnPagina:'mdPagina', exportar:'mdExportar()', vacio:'No se encontraron resultados con los criterios seleccionados',
      columnas:[{t:'Nro Mandato', k:'n'}, {t:'Cliente', k:'cliente'}, {t:'Tipo de socio', k:'tTer'}, {t:'Nombre del socio', k:'tercero'}, {t:'Tipo de Mandato', k:'tipo'},
        {t:'Vigencia', v:mdVig}, {t:'BL', v:m=>esc(m.bl||'-')}, {t:'Tipo de Operación', k:'oper'}, {t:'Estado', v:m=>CC.chipEstado(MD_EST[m.estado], MD_TONO[m.estado])},
        {t:'Fecha registro', v:m=>CC.fecha(m.fReg)}, {t:'Acciones', v:m=>`<div class="fac-rowacts">${mdAcc(m)}</div>`}] }) : '');
}
CC.registrarPantalla({
  id:'screenAcMandato', grupo:G, opcion:'Mandato Electrónico', titulo:'Mandatos Electrónicos', migas:['Inicio','Mandato Electrónico','Mandatos Electrónicos'],
  propuesta:'I-046', html: mdHtml,
  guia:[{t:'Mandato electrónico', steps:[{el:'#mdF', h:'Buscar', p:'Filtra por cliente, tipo, operación, estado y fechas. Por defecto muestra los pendientes.'},
    {el:'#mdF', h:'Resolver', p:'En cada fila: Ver, Aprobar, Observar o Rechazar. Observar y Rechazar piden el motivo y quedan en el historial.'}]}]
});

/* Repintar al cambiar "Ver propuestas" (adjuntos por contenedor en Nuevo Daño) */
window.addEventListener('cc:propuestas', ()=>{ const a = document.querySelector('section.panel.active'); if(a && a.id==='screenAcDanos' && DA.vista==='nuevo' && DA.nuevo){ daLeerN(); daPintar(); } });
})();
