/* Módulo: Data Maestra (Catálogo, Organización, Tipo de cambio, Plantilla Email, Días No Laborables) y Dashboard de Connect
   Se carga desde index.html (ya enlazado; no edites el index).
   Socio, Nave, Servicios y Seguridad viven en index.html. Series la hace el módulo de Liquidación.
   Todo en memoria, datos ficticios. Guía: docs/CONVENCIONES_v37.md */
(function(){
'use strict';
const W = window, D = document, $ = id => D.getElementById(id), esc = x => CC.esc(x), q = x => W.normTxt(x);
const OB = 'Este campo es obligatorio';
const hoyISO = () => new Date().toISOString().slice(0,10);
const sumaDias = (iso, n) => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const err = (E, k) => E && E[k] ? `<div class="f-err">${esc(E[k])}</div>` : '';
/* Tarjeta de búsqueda de Connect: Buscar y Limpiar deshabilitados hasta que haya un filtro */
const filtrosCx = o => `<div class="fac-card" id="${o.id}"><div class="fac-head"><div><h3>${o.titulo}</h3><div class="fac-sub">${o.sub||'Ingrese datos para buscar'}</div></div>${o.acciones?`<div class="fac-acts">${o.acciones}</div>`:''}</div>
  <div class="fac-g${o.cols||3}">${o.campos.join('')}</div>
  <div class="fac-btns"><button type="button" class="cc-btn" id="${o.id}Buscar" ${o.hay?'':'disabled'} onclick="${o.buscar}">Buscar</button><button type="button" class="cc-btn" id="${o.id}Limpiar" ${o.hay||o.buscado?'':'disabled'} onclick="${o.limpiar}">Limpiar</button></div></div>`;
const habilita = (id, hay) => { const b = $(id+'Buscar'), l = $(id+'Limpiar'); if(b) b.disabled = !hay; if(l && hay) l.disabled = false; };
const vista = (id, titulo, migas, volver) => { CC.refrescar(id); if(titulo) CC.barra(titulo, migas, volver); else W.updatePagebar(id); };
const salir = dirty => !dirty || confirm('Hay cambios sin guardar. ¿Estás seguro de que quieres salir?');
const descartar = dirty => !dirty || confirm('Tienes cambios no guardados. ¿Estás seguro de que deseas descartarlos?');

/* ============================================================
   ORGANIZACIÓN: búsqueda + Información General + Sucursal, Área, Información Financiera
============================================================ */
const ORGS = [
  {cod:'COS1', corto:'COSMOS', nombre:'COSMOS GLOBAL LOGISTICS S.A.C', dir:'AV. EJEMPLO 123, CALLAO', ruc:'20610000001',
   sucursales:[
     {cod:'CLL', nombre:'Callao', dir:'AV. EJEMPLO 123, CALLAO', erp:'SUC-CLL', aduana:'118', descAduana:'Marítima del Callao',
      contactos:[{tipo:'Operaciones', email:'operaciones.callao@empresa.example'},{tipo:'Facturación', email:'facturacion.callao@empresa.example'}],
      puertos:[{puerto:'Callao', terminales:[{cod:'APM', operador:'TERMINAL NORTE EJEMPLO S.A.', ruc:'20610000101', vgm:'XML', cal:'EDI', cdl:'EDI', muelle:'M5'},{cod:'DPW', operador:'TERMINAL SUR EJEMPLO S.A.', ruc:'20610000102', vgm:'XML', cal:'EDI', cdl:'XLS', muelle:'M1'}], muelles:[{cod:'M1', nombre:'Muelle Sur'},{cod:'M5', nombre:'Muelle Norte'}]}],
      locales:[{cod:'LOC000001', nombre:'Oficina Callao', dir:'AV. EJEMPLO 123, CALLAO'}],
      direcc:{entidad:'DEPÓSITO EJEMPLO S.A.C.', ruc:'20610000201', aduana:'3014'}},
     {cod:'PAI', nombre:'Paita', dir:'CALLE EJEMPLO 45, PAITA', erp:'SUC-PAI', aduana:'046', descAduana:'Paita',
      contactos:[{tipo:'Operaciones', email:'operaciones.paita@empresa.example'}], puertos:[{puerto:'Paita', terminales:[], muelles:[]}], locales:[], direcc:null}],
   areas:[{erp:'AG01', desc:'Agenciamiento Marítimo', div:'Servicios Portuarios'},{erp:'DOC01', desc:'Documentación', div:'Servicios Portuarios'},{erp:'FAC01', desc:'Facturación', div:'Administración'}],
   fin:null},
  {cod:'COS2', corto:'COSMOS AGENCIA', nombre:'COSMOS AGENCIA DE EJEMPLO S.A.C', dir:'JR. EJEMPLO 77, LIMA', ruc:'20610000002', sucursales:[], areas:[], fin:[]}];
const OR_TIPOS_CONT = ['Importación','Exportación','Operaciones','Comercial','Facturación','Cobranzas'];
const OR_PUERTOS = ['Callao','Paita','Ilo','Matarani','Salaverry','Pisco','Chancay','Talara'];
const OR = {f:{cod:'',corto:'',nombre:''}, buscado:false, pagina:1, tam:10, view:'list', sel:null, tab:'suc', edit:false, draft:null, E:null, dirty:false};
W.OR = OR;
const orFin = o => o.fin || (o.fin = (typeof CB_ORG_FIN!=='undefined' ? CB_ORG_FIN : []));   /* mismas cuentas que usa Cobranzas */
const orLista = () => ORGS.filter(o=>(!OR.f.cod||q(o.cod).includes(q(OR.f.cod)))&&(!OR.f.corto||q(o.corto).includes(q(OR.f.corto)))&&(!OR.f.nombre||q(o.nombre).includes(q(OR.f.nombre))));
const orHay = () => Object.values(OR.f).some(Boolean);
const orSel = () => ORGS.find(o=>o.cod===OR.sel);
W.orSet = (k, v) => { OR.f[k] = v; habilita('orF', orHay()); };
W.orBuscar = () => { OR.buscado = true; OR.pagina = 1; CC.refrescar('screenOrganizacion'); };
W.orLimpiar = () => { OR.f = {cod:'',corto:'',nombre:''}; OR.buscado = false; CC.refrescar('screenOrganizacion'); };
W.orPagina = (p, t) => { if(t) OR.tam = t; OR.pagina = p; CC.refrescar('screenOrganizacion'); };
W.orExportar = () => CC.exportarExcel('Organizacion','Organización',['Código','Nombre Corto','Nombre Completo','Dirección'], orLista().map(o=>[o.cod,o.corto,o.nombre,o.dir]));
const orBarra = () => vista('screenOrganizacion', OR.sel ? (OR.edit?'Editar Organización':'Ver Organización') : 'Nueva Organización', ['Inicio','Organización', OR.sel ? (OR.edit?'Editar Organización':'Ver Organización') : 'Nueva Organización'], 'orVolver()');
W.orAbrir = (cod, tab) => { OR.sel = cod; OR.view = 'detail'; OR.tab = tab || 'suc'; OR.edit = false; OR.draft = null; OR.E = null; OR.dirty = false; orBarra(); };
W.orNuevo = () => { OR.sel = null; OR.view = 'detail'; OR.tab = 'suc'; OR.edit = true; OR.E = null; OR.dirty = false; OR.draft = {cod:'', corto:'', nombre:'', dir:'', ruc:'', sucursales:[], areas:[], fin:[]}; orBarra(); };
W.orVolver = () => { if(!descartar(OR.dirty)) return; OR.view = 'list'; OR.sel = null; OR.edit = false; OR.dirty = false; vista('screenOrganizacion'); };
W.orTab = t => { OR.tab = t; orBarra(); };
W.orEditar = () => { const o = orSel(); OR.draft = JSON.parse(JSON.stringify({...o, fin:orFin(o)})); OR.edit = true; OR.E = null; orBarra(); };
W.orCancelar = () => { if(!descartar(OR.dirty)) return; OR.dirty = false; if(!OR.sel){ W.orVolver(); return; } OR.edit = false; OR.draft = null; OR.E = null; orBarra(); };
W.orUpd = (k, v) => { OR.draft[k] = v; OR.dirty = true; };
W.orUpdFila = (lista, i, k, v) => { OR.draft[lista][i][k] = v; OR.dirty = true; };
W.orAgregar = lista => { OR.draft[lista].push(lista==='areas' ? {erp:'', desc:'', div:''} : lista==='fin' ? {banco:'', tipo:'Cuenta corriente', cuenta:'', swift:'', erp:'', moneda:'Dólar estadounidense', cover:false}
  : {cod:'', nombre:'', dir:'', erp:'', aduana:'', descAduana:'', contactos:[], puertos:[], locales:[], direcc:null}); OR.dirty = true; orBarra(); };
W.orQuitar = (lista, i) => { OR.draft[lista].splice(i,1); OR.dirty = true; orBarra(); };
W.orCover = (i, v) => { OR.draft.fin.forEach((f,j)=>{ f.cover = j===i ? v : false; }); OR.dirty = true; orBarra(); };
W.orGuardar = () => {
  const d = OR.draft, E = {};
  if(!String(d.corto||'').trim()) E.corto = OB; if(!String(d.nombre||'').trim()) E.nombre = OB;
  if(d.ruc && !/^\d+$/.test(d.ruc)) E.ruc = 'El RUC debe contener solo dígitos.'; else if(d.ruc && d.ruc.length!==11) E.ruc = 'El RUC debe tener exactamente 11 dígitos.';
  if(d.sucursales.some(s=>!String(s.cod||'').trim() || !String(s.nombre||'').trim())) E.suc = 'Código y Nombre de la sucursal son obligatorios.';
  if(d.areas.some(a=>!String(a.erp||'').trim())) E.area = 'El Código ERP del área es obligatorio.';
  const cuentas = d.fin.map(f=>f.cuenta);
  if(d.fin.some(f=>!f.banco || !f.tipo || !String(f.cuenta||'').trim() || !f.moneda)) E.fin = 'Banco, Tipo, Cuenta y Moneda son obligatorios.';
  else if(new Set(cuentas).size !== cuentas.length) E.fin = 'La cuenta ya está registrada.';
  else if(d.fin.some(f=>f.cover && (!f.banco || !f.cuenta || !f.swift))) E.fin = 'La cuenta marcada como Cover debe tener banco, número de cuenta y SWIFT completos.';
  OR.E = E;
  if(Object.keys(E).length){ if(E.suc) OR.tab = 'suc'; else if(E.area) OR.tab = 'area'; else if(E.fin) OR.tab = 'fin'; orBarra(); CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
  if(!OR.sel){ d.cod = 'ORG' + (ORGS.length+1); ORGS.push(d); OR.sel = d.cod; }
  else { const o = orSel(), fin = orFin(o); fin.splice(0, fin.length, ...d.fin); Object.assign(o, {...d, fin}); }
  OR.edit = false; OR.draft = null; OR.dirty = false; orBarra(); CC.toast('Organización guardada correctamente','success');
};
W.orEliminar = () => { if(!confirm('¿Estás seguro de que deseas eliminar esta Organización?')) return; ORGS.splice(ORGS.indexOf(orSel()),1); OR.view = 'list'; OR.sel = null; vista('screenOrganizacion'); CC.toast('Organización eliminada correctamente','success'); };
/* Diálogos de la sucursal: Contacto, Puerto (Terminales y Muelles), Local, Direccionamiento */
W.orDlg = (i, tipo, pi) => {
  const o = OR.edit ? OR.draft : orSel(), s = o.sucursales[i], ed = OR.edit, ro = ed ? '' : 'disabled';
  const tabla = (cols, filas, quitar) => `<div class="fac-scroll"><table class="fac-tbl"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}${ed&&quitar?'<th></th>':''}</tr></thead><tbody>${filas.join('') || `<tr><td colspan="${cols.length+1}" class="fac-empty">Sin registros</td></tr>`}</tbody></table></div>`;
  const inp = (path, v, ph) => `<input ${ro} value="${esc(v||'')}" placeholder="${ph||''}" oninput="orDlgUpd(${i},'${path}',this.value)">`;
  let h = '';
  if(tipo==='contacto'){
    h = `<h3>Contacto · ${esc(s.nombre)}</h3>` + tabla(['Tipo de Contacto *','Email *'], s.contactos.map((c,j)=>`<tr><td>${ed?CC.selector(OR_TIPOS_CONT,c.tipo,`onchange="orDlgUpd(${i},'contactos.${j}.tipo',this.value)"`):esc(c.tipo)}</td><td>${inp(`contactos.${j}.email`,c.email,'correo@empresa.example')}</td>${ed?`<td><button type="button" class="fac-link" onclick="orDlgDel(${i},'contactos',${j},'contacto')">Eliminar</button></td>`:''}</tr>`), true)
      + (ed?`<div style="margin-top:8px"><button type="button" class="cc-btn" onclick="orDlgAdd(${i},'contactos','contacto')">Agregar</button></div>`:'');
  } else if(tipo==='puerto'){
    h = `<h3>Puerto · ${esc(s.nombre)}</h3>` + tabla(['Puerto *','Terminales','Muelles'], s.puertos.map((p,j)=>`<tr><td>${esc(p.puerto)}</td><td><button type="button" class="fac-link" onclick="orDlg(${i},'terminal',${j})">Terminales (${p.terminales.length})</button></td><td><button type="button" class="fac-link" onclick="orDlg(${i},'muelle',${j})">Muelles (${p.muelles.length})</button></td>${ed?`<td><button type="button" class="fac-link" onclick="orDlgDel(${i},'puertos',${j},'puerto')">Eliminar</button></td>`:''}</tr>`), true)
      + (ed?`<div class="fac-g3" style="margin-top:10px">${CC.campo('Puerto *', `<input id="orNuevoPuerto" list="orPuertos" placeholder="Buscar puerto"><datalist id="orPuertos">${OR_PUERTOS.map(p=>`<option value="${p}">`).join('')}</datalist>`)}<div class="fac-f" style="justify-content:flex-end"><button type="button" class="cc-btn" onclick="orPuertoAdd(${i})">Agregar</button></div></div>`:'');
  } else if(tipo==='terminal'){
    const p = s.puertos[pi];
    h = `<h3>Terminales · ${esc(p.puerto)}</h3>` + tabla(['Código del Terminal *','Nombre del Operador Portuario *','RUC del Operador *','Formato VGM','Formato CAL','Formato CDL','Muelle'],
      p.terminales.map((t,j)=>`<tr>${['cod','operador','ruc','vgm','cal','cdl','muelle'].map(k=>`<td>${inp(`puertos.${pi}.terminales.${j}.${k}`,t[k])}</td>`).join('')}${ed?`<td><button type="button" class="fac-link" onclick="orDlgDel(${i},'puertos.${pi}.terminales',${j},'terminal',${pi})">Eliminar</button></td>`:''}</tr>`), true)
      + `<div class="fac-btns" style="justify-content:space-between"><button type="button" class="cc-btn" onclick="orDlg(${i},'puerto')">Volver a Puertos</button>${ed?`<button type="button" class="cc-btn" onclick="orDlgAdd(${i},'puertos.${pi}.terminales','terminal',${pi})">Agregar</button>`:''}</div>`;
  } else if(tipo==='muelle'){
    const p = s.puertos[pi];
    h = `<h3>Muelles · ${esc(p.puerto)}</h3>` + tabla(['Código del Muelle *','Nombre *'], p.muelles.map((m,j)=>`<tr><td>${inp(`puertos.${pi}.muelles.${j}.cod`,m.cod)}</td><td>${inp(`puertos.${pi}.muelles.${j}.nombre`,m.nombre)}</td>${ed?`<td><button type="button" class="fac-link" onclick="orDlgDel(${i},'puertos.${pi}.muelles',${j},'muelle',${pi})">Eliminar</button></td>`:''}</tr>`), true)
      + `<div class="fac-btns" style="justify-content:space-between"><button type="button" class="cc-btn" onclick="orDlg(${i},'puerto')">Volver a Puertos</button>${ed?`<button type="button" class="cc-btn" onclick="orDlgAdd(${i},'puertos.${pi}.muelles','muelle',${pi})">Agregar</button>`:''}</div>`;
  } else if(tipo==='local'){
    h = `<h3>Locales de Atención · ${esc(s.nombre)}</h3>` + tabla(['Código *','Nombre *','Dirección'], s.locales.map((l,j)=>`<tr><td>${inp(`locales.${j}.cod`,l.cod)}</td><td>${inp(`locales.${j}.nombre`,l.nombre)}</td><td>${inp(`locales.${j}.dir`,l.dir)}</td>${ed?`<td><button type="button" class="fac-link" onclick="orDlgDel(${i},'locales',${j},'local')">Eliminar</button></td>`:''}</tr>`), true)
      + (ed?`<div style="margin-top:8px"><button type="button" class="cc-btn" onclick="orDlgAdd(${i},'locales','local')">Agregar</button></div>`:'');
  } else {
    const r = s.direcc || {entidad:'', ruc:'', aduana:''};
    h = `<h3>Direccionamiento por defecto · ${esc(s.nombre)}</h3>` + (!s.cod ? '<div class="fac-note warn">Guarde la sucursal antes de registrar su direccionamiento</div>'
      : `<div class="fac-g3">${CC.campo('Entidad receptora *', `<input ${ro} value="${esc(r.entidad)}" oninput="orDirUpd(${i},'entidad',this.value)">`)}${CC.campo('RUC', `<input ${ro} maxlength="11" value="${esc(r.ruc)}" oninput="orDirUpd(${i},'ruc',this.value)">`)}${CC.campo('Código de aduana *', `<input ${ro} maxlength="4" value="${esc(r.aduana)}" oninput="orDirUpd(${i},'aduana',this.value)">`)}</div>`);
  }
  CC.modal(h + `<div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal();orRepinta()">Cerrar</button></div>`, tipo==='terminal' ? 'lg' : 'md');
};
const ruta = (obj, path) => path.split('.').reduce((a,k)=>a[k], obj);
W.orDlgUpd = (i, path, v) => { const ks = path.split('.'), last = ks.pop(); ruta(OR.draft.sucursales[i], ks.join('.'))[last] = v; OR.dirty = true; };
W.orDlgAdd = (i, path, tipo, pi) => { const nuevo = {contacto:{tipo:OR_TIPOS_CONT[0], email:''}, terminal:{cod:'',operador:'',ruc:'',vgm:'',cal:'',cdl:'',muelle:''}, muelle:{cod:'',nombre:''}, local:{cod:'',nombre:'',dir:''}}[tipo];
  ruta(OR.draft.sucursales[i], path).push(nuevo); OR.dirty = true; W.orDlg(i, tipo, pi); };
W.orDlgDel = (i, path, j, tipo, pi) => { ruta(OR.draft.sucursales[i], path).splice(j,1); OR.dirty = true; W.orDlg(i, tipo, pi); };
W.orPuertoAdd = i => { const v = ($('orNuevoPuerto').value||'').trim(), s = OR.draft.sucursales[i];
  if(!v){ CC.toast('Seleccione un puerto','info'); return; }
  if(OR.draft.sucursales.some(x=>x.puertos.some(p=>q(p.puerto)===q(v)))){ CC.toast('Este puerto ya está asignado a otra sucursal en esta organización.','error'); return; }
  s.puertos.push({puerto:v, terminales:[], muelles:[]}); OR.dirty = true; W.orDlg(i, 'puerto'); };
W.orDirUpd = (i, k, v) => { const s = OR.draft.sucursales[i]; s.direcc = s.direcc || {entidad:'', ruc:'', aduana:''}; s.direcc[k] = v; OR.dirty = true; };
W.orRepinta = () => { if(OR.view==='detail') orBarra(); };
function orDetalle(){
  const o = OR.edit ? OR.draft : orSel(); if(!o) return '';
  const ed = OR.edit, E = OR.E || {}, ro = ed ? '' : 'disabled';
  const inp = (k, l, max) => CC.campo(l, `<input ${ro} id="orD_${k}" maxlength="${max}" value="${esc(o[k]||'')}" oninput="orUpd('${k}',this.value)">${err(E,k)}`);
  const acts = ed ? '' : `<button type="button" class="cc-btn" id="orEditar" onclick="orEditar()">Editar</button><button type="button" class="cc-btn pink" onclick="orEliminar()">Eliminar</button>`;
  const cell = (lista, i, k, v, max) => ed ? `<input value="${esc(v||'')}" ${max?`maxlength="${max}"`:''} oninput="orUpdFila('${lista}',${i},'${k}',this.value)">` : esc(v||'');
  const quitar = (lista, i) => ed ? `<td><button type="button" class="fac-link" onclick="orQuitar('${lista}',${i})">Eliminar</button></td>` : '';
  const vacio = n => `<tr><td colspan="${n}" class="fac-empty">No se encontraron resultados con los criterios seleccionados.</td></tr>`;
  let body = '';
  if(OR.tab==='suc') body = `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Código *</th><th>Nombre *</th><th>Dirección</th><th>Código ERP</th><th>Código de Aduana</th><th>Descripción de Aduanas</th><th>Configuración</th>${ed?'<th></th>':''}</tr></thead><tbody>
    ${o.sucursales.map((s,i)=>`<tr><td>${cell('sucursales',i,'cod',s.cod,4)}</td><td>${cell('sucursales',i,'nombre',s.nombre,100)}</td><td>${cell('sucursales',i,'dir',s.dir,200)}</td><td>${cell('sucursales',i,'erp',s.erp,10)}</td><td>${cell('sucursales',i,'aduana',s.aduana,4)}</td><td>${cell('sucursales',i,'descAduana',s.descAduana,100)}</td>
      <td class="or-acc">${['Contacto','Puerto','Local','Direccionamiento'].map(t=>`<button type="button" class="fac-link" onclick="orDlg(${i},'${t==='Direccionamiento'?'direcc':q(t)}')">${t}</button>`).join(' · ')}</td>${quitar('sucursales',i)}</tr>`).join('') || vacio(8)}
    </tbody></table></div>${err(E,'suc')}`;
  else if(OR.tab==='area') body = `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Código ERP *</th><th>Descripción</th><th>División de Negocio</th>${ed?'<th></th>':''}</tr></thead><tbody>
    ${o.areas.map((a,i)=>`<tr><td>${cell('areas',i,'erp',a.erp,25)}</td><td>${cell('areas',i,'desc',a.desc,200)}</td><td>${cell('areas',i,'div',a.div,100)}</td>${quitar('areas',i)}</tr>`).join('') || vacio(4)}</tbody></table></div>${err(E,'area')}`;
  else { const fin = ed ? o.fin : orFin(o), bancos = ['BBVA Perú','Banco de Crédito del Perú','Scotiabank Perú','Interbank'];
    body = `<div class="fac-scroll" id="orgFin"><table class="fac-tbl"><thead><tr><th>Banco *</th><th>Tipo *</th><th>Cuenta *</th><th>SWIFT</th><th>Código ERP</th><th>Moneda *</th><th>Cover</th>${ed?'<th></th>':''}</tr></thead><tbody>
    ${fin.map((f,i)=>`<tr><td>${ed?CC.selector(bancos,f.banco,`onchange="orUpdFila('fin',${i},'banco',this.value)"`,'Elegir Banco'):esc(f.banco)}</td><td>${ed?CC.selector(['Cuenta corriente','Cuenta de ahorros'],f.tipo,`onchange="orUpdFila('fin',${i},'tipo',this.value)"`):esc(f.tipo)}</td>
      <td>${cell('fin',i,'cuenta',f.cuenta,25)}</td><td>${cell('fin',i,'swift',f.swift,11)}</td><td>${cell('fin',i,'erp',f.erp,50)}</td><td>${ed?CC.selector(['Sol peruano','Dólar estadounidense'],f.moneda,`onchange="orUpdFila('fin',${i},'moneda',this.value)"`):esc(f.moneda)}</td>
      <td><input type="checkbox" style="width:auto" ${ed?'':'disabled'} ${f.cover?'checked':''} onchange="orCover(${i},this.checked)"></td>${quitar('fin',i)}</tr>`).join('') || vacio(8)}</tbody></table></div>${err(E,'fin')}`; }
  const lista = {suc:'sucursales', area:'areas', fin:'fin'}[OR.tab];
  return `<div class="fac-card" id="orGen"><div class="fac-head"><h3>Información General</h3><div class="fac-acts">${acts}</div></div>
    <div class="fac-g3">${CC.campoLectura('Código', o.cod || 'Automático')}${inp('corto','Nombre Corto *',80)}${inp('nombre','Nombre Completo *',100)}${inp('dir','Dirección',200)}${inp('ruc','RUC',11)}</div></div>
  <div class="fac-card" id="orTabs"><div class="fac-tabs">${[['suc','Sucursal'],['area','Área'],['fin','Información Financiera']].map(([k,l])=>`<button type="button" class="${OR.tab===k?'on':''}" onclick="orTab('${k}')">${l}</button>`).join('')}</div>
    ${body}${ed?`<div style="margin-top:10px"><button type="button" class="cc-btn" onclick="orAgregar('${lista}')">Nuevo</button></div>`:''}</div>
  ${ed?`<div class="fac-btns"><button type="button" class="cc-btn" onclick="orCancelar()">Cancelar</button><button type="button" class="cc-btn" id="orGuardar" onclick="orGuardar()">Guardar</button></div>`:''}`;
}
CC.registrarPantalla({
  id:'screenOrganizacion', grupo:'Data Maestra', opcion:'Organización', titulo:'Buscar Organización', migas:['Inicio','Organización','Consulta Organización'],
  html: () => OR.view==='detail' ? orDetalle() : filtrosCx({id:'orF', titulo:'Buscar Organización', hay:orHay(), buscado:OR.buscado, buscar:'orBuscar()', limpiar:'orLimpiar()',
      acciones:'<button type="button" class="cc-btn" onclick="orNuevo()">Nuevo</button>',
      campos:[CC.campo('Código',`<input id="orCod" maxlength="4" placeholder="Ingresar código" value="${esc(OR.f.cod)}" oninput="orSet('cod',this.value)">`),
        CC.campo('Nombre Corto',`<input id="orCorto" maxlength="80" placeholder="Ingresar nombre corto" value="${esc(OR.f.corto)}" oninput="orSet('corto',this.value)">`),
        CC.campo('Nombre Completo',`<input id="orNombre" maxlength="100" placeholder="Ingresar nombre completo" value="${esc(OR.f.nombre)}" oninput="orSet('nombre',this.value)">`)]})
    + (OR.buscado ? CC.tablaResultados({id:'orRes', filas:orLista(), pagina:OR.pagina, tam:OR.tam, fnPagina:'orPagina', exportar:'orExportar()', vacio:'No se encontraron resultados con los criterios seleccionados.',
      columnas:[{t:'Código', v:o=>`<button type="button" class="fac-link" onclick="orAbrir('${o.cod}')">${esc(o.cod)}</button>`},{t:'Nombre Corto',k:'corto'},{t:'Nombre Completo',k:'nombre'},{t:'Dirección',k:'dir'}]}) : ''),
  alAbrir: () => { OR.view = 'list'; OR.sel = null; OR.edit = false; vista('screenOrganizacion'); },
  guia:[{t:'Consultar una organización', steps:[
    {go:()=>{ if(OR.view!=='list') W.orVolver(); }, el:'#orF', h:'Buscar Organización', p:'Filtra por código o nombre y presiona Buscar.'},
    {go:()=>{ OR.f.nombre='COSMOS'; W.orBuscar(); }, el:'#orRes', h:'Resultados', p:'Clic en el código para ver sucursales, áreas y cuentas.'},
    {go:()=>W.orAbrir('COS1','fin'), el:'#orTabs', h:'Pestañas', p:'Sucursal (contactos, puertos, locales, direccionamiento), Área e Información Financiera.'}]}]
});

/* ============================================================
   CATÁLOGO
============================================================ */
const rdCod = r => r.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_');
const RD_MK = () => W.fm ? W.fm('Agrega', 'HU-DM-01', 'I-035', 'PEN-I035-01') : '';
const el = (cod, desc, descEn, orden, extra) => ({cod, desc, descEn:descEn||'', orden:orden||0, color:'', defecto:false, alt:'', foraneo:'', sec:'', activo:true, ...(extra||{})});
const CATS = [
  {cod:'PARTNER_STATUS', nombre:'Estado de Socio', desc:'Estados de aprobación del socio', sistema:true, ingles:true, elementos:[], estados:[el('PENDING_APPROVAL','Pendiente de aprobación','Pending approval',1,{color:'#F2B705',defecto:true}), el('APPROVED','Aprobado','Approved',2,{color:'#2E9E5B'})]},
  {cod:'VESSEL_STATUS', nombre:'Estado de Nave', desc:'Estados de aprobación de la nave', sistema:true, ingles:true, elementos:[], estados:[el('PENDING_APPROVAL','Pendiente de aprobación','Pending approval',1,{color:'#F2B705',defecto:true}), el('APPROVED','Aprobado','Approved',2,{color:'#2E9E5B'})]},
  {cod:'SERVICE_REQUEST_STATUS', nombre:'Estado de Solicitud de Servicio', desc:'Flujo de solicitudes de servicios', sistema:true, ingles:true, elementos:[], estados:[el('REQUESTED','Pendiente de homologación','Pending homologation',1,{color:'#F2B705',defecto:true}), el('HOMOLOGATED','Pendiente de Facturación','Pending billing',2,{color:'#1E6FD9'}), el('APPROVED','Aprobada','Approved',3,{color:'#2E9E5B'}), el('REJECTED','Rechazada','Rejected',4,{color:'#C62828'})]},
  {cod:'EMAIL_MODULE', nombre:'Módulo de Plantilla Email', desc:'Módulos que envían correos', sistema:true, ingles:true, estados:[], elementos:[['CUSTOMER_SERVICE','Atención al cliente','Customer service'],['BL','BL','BL'],['VOYAGE','Viaje','Voyage'],['PDA','PDA','PDA'],['SECURITY','Seguridad','Security'],['SETTLEMENT','Liquidaciones','Settlements'],['CONTAINER_DAMAGE','Daño contenedores','Container damage']].map((x,i)=>el(x[0],x[1],x[2],i+1))},
  {cod:'CURRENCY', nombre:'Moneda', desc:'Monedas', sistema:true, ingles:true, estados:[], elementos:[el('PEN','Sol peruano','Peruvian sol',1,{alt:'S/',defecto:true}), el('USD','Dólar estadounidense','US dollar',2,{alt:'US$'}), el('EUR','Euro','Euro',3,{alt:'€'})]},
  {cod:'PERSON_TYPE', nombre:'Tipo de Persona', desc:'Tipo de persona del socio', sistema:true, ingles:false, estados:[], elementos:[el('LEGAL','Persona Jurídica','',1,{defecto:true}), el('NATURAL','Persona Natural','',2)]},
  {cod:'NATIONALITY', nombre:'Nacionalidad', desc:'Nacionalidad del socio', sistema:true, ingles:false, estados:[], elementos:[el('NATIONAL','Nacional','',1,{defecto:true}), el('FOREIGN','Extranjera','',2)]},
  {cod:'DOCUMENT_TYPE', nombre:'Tipo de Documento', desc:'Documentos de identidad', sistema:true, ingles:false, estados:[], elementos:[el('RUC','RUC','',1,{foraneo:'6'}), el('DNI','DNI','',2,{foraneo:'1'}), el('CE','Carné de Extranjería','',3,{foraneo:'4'}), el('PAS','Pasaporte','',4,{foraneo:'7'}), el('TAX','Tax ID','',5,{foraneo:'0'})]},
  {cod:'PAYMENT_CONDITION', nombre:'Condición de Pago', desc:'Condiciones de pago del socio', sistema:false, ingles:false, estados:[], elementos:[el('CASH','Contado','',1), el('CREDIT','Crédito','',2,{defecto:true})]},
  /* Connect: PARTNER_ROLE. Propuesta HU-DM-01 · I-035: Tipo Socio y Requiere Código Aduanas por rol (los toma la pestaña Roles del Socio) */
  {cod:'PARTNER_ROLE', nombre:'Rol de Socio', desc:'Roles comerciales del socio', sistema:true, ingles:false, estados:[], elementos:(W.PT_ROLES_LIST ? W.PT_ROLES_LIST() : []).map(([r,t,a],i)=>el(rdCod(r), r, '', i+1, {tipoSocio:t, reqAduana:a}))},
  {cod:'USER_STATUS', nombre:'Estado de Usuario', desc:'Estados del usuario', sistema:true, ingles:true, elementos:[], estados:[el('ACTIVE','Activo','Active',1,{color:'#2E9E5B',defecto:true}), el('INACTIVE','Inactivo','Inactive',2,{color:'#8D9BA2'})]}];
const CA = {f:{nombre:'',cod:'',desc:''}, buscado:false, pagina:1, tam:10, view:'list', sel:null, tab:'elem', edit:false, draft:null, dirty:false, isNew:false};
const caLista = () => CATS.filter(c=>(!CA.f.nombre||q(c.nombre).includes(q(CA.f.nombre)))&&(!CA.f.cod||q(c.cod).includes(q(CA.f.cod)))&&(!CA.f.desc||q(c.desc).includes(q(CA.f.desc))));
const caHay = () => Object.values(CA.f).some(Boolean);
const caBarra = () => { const t = CA.isNew ? 'Crear Catálogo' : CA.edit ? 'Editar Catálogo' : 'Ver Catálogo'; vista('screenCatalogo', t, ['Inicio','Catálogo',t], 'caVolver()'); };
W.caSet = (k, v) => { CA.f[k] = v; habilita('caF', caHay()); };
W.caBuscar = () => { CA.buscado = true; CA.pagina = 1; CC.refrescar('screenCatalogo'); };
W.caLimpiar = () => { CA.f = {nombre:'',cod:'',desc:''}; CA.buscado = false; CC.refrescar('screenCatalogo'); };
W.caPagina = (p, t) => { if(t) CA.tam = t; CA.pagina = p; CC.refrescar('screenCatalogo'); };
W.caExportar = () => CC.exportarExcel('Catalogo','Catálogo',['Código','Nombre','Descripción'], caLista().map(c=>[c.cod,c.nombre,c.desc]));
W.caAbrir = cod => { CA.sel = cod; CA.view = 'detail'; CA.edit = false; CA.isNew = false; CA.draft = null; CA.dirty = false; CA.tab = 'elem'; caBarra(); };
W.caNuevo = () => { CA.sel = null; CA.view = 'detail'; CA.edit = true; CA.isNew = true; CA.dirty = false; CA.tab = 'elem'; CA.draft = {cod:'', nombre:'', desc:'', sistema:false, ingles:false, elementos:[], estados:[]}; caBarra(); };
W.caVolver = () => { if(!descartar(CA.dirty)) return; CA.view = 'list'; CA.edit = false; CA.dirty = false; vista('screenCatalogo'); };
W.caEditar = () => { CA.draft = JSON.parse(JSON.stringify(CATS.find(c=>c.cod===CA.sel))); CA.edit = true; caBarra(); };
W.caCancelar = () => { if(!descartar(CA.dirty)) return; CA.dirty = false; if(CA.isNew){ CA.isNew = false; W.caVolver(); return; } CA.edit = false; CA.draft = null; caBarra(); };
W.caTab = t => { CA.tab = t; caBarra(); };
W.caUpd = (k, v, re) => { CA.draft[k] = v; CA.dirty = true; if(re) caBarra(); };
W.caFila = (l, i, k, v) => { CA.draft[l][i][k] = v; CA.dirty = true; };
W.caAgregar = l => { const xs = CA.draft[l]; xs.push(el('', '', '', xs.length+1)); CA.dirty = true; caBarra(); };
W.caEliminarSel = l => {
  const sel = [...D.querySelectorAll('#caItems input[data-i]:checked')].map(x=>+x.dataset.i);
  if(!sel.length){ CC.toast('Seleccione al menos un elemento','info'); return; }
  if(!confirm('¿Confirma que desea eliminar (inactivar) lo(s) Elemento(s) seleccionado(s)?')) return;
  sel.forEach(i=>{ CA.draft[l][i].activo = false; }); CA.dirty = true; caBarra();
};
W.caGuardar = () => {
  const d = CA.draft, E = {};
  ['cod','nombre'].forEach(k=>{ if(!String(d[k]||'').trim()) E[k] = OB; });
  if(CA.isNew && CATS.some(c=>c.cod===d.cod.trim())) E.cod = 'Ya existe un catálogo con este código';
  const act = l => d[l].filter(x=>x.activo);
  if([...act('elementos'),...act('estados')].some(x=>!String(x.cod||'').trim() || !String(x.desc||'').trim())) E.items = 'Código y Descripción son obligatorios en cada elemento.';
  else if(act('estados').some(x=>!(+x.orden>0))) E.items = 'Todos los estados deben tener un campo orden válido (mayor a 0).';
  if(!E.items && d.cod==='PARTNER_ROLE' && CC.verPropuestas){ const sc = act('elementos').find(x=>!x.tipoSocio); if(sc) E.items = `Todo rol debe tener Tipo Socio (Cliente, Proveedor o Ambos). Falta en: ${sc.desc}.`; }
  CA.E = E; if(Object.keys(E).length){ caBarra(); CC.toast(E.items && E.items.startsWith('Todo rol') ? E.items : 'Por favor, complete todos los campos obligatorios.','error'); return; }
  if(d.cod==='PARTNER_ROLE' && W.ptRdCatSync) W.ptRdCatSync(act('elementos').map(x=>[x.desc, x.tipoSocio, !!x.reqAduana]));
  if(CA.isNew){ d.cod = d.cod.trim().toUpperCase(); CATS.push(d); CA.sel = d.cod; } else Object.assign(CATS.find(c=>c.cod===CA.sel), d);
  CA.isNew = false; CA.edit = false; CA.draft = null; CA.dirty = false; CA.E = null; caBarra(); CC.toast('Catálogo guardado correctamente','success');
};
W.caEliminar = () => { const c = CATS.find(x=>x.cod===CA.sel); if(c.sistema){ CC.toast('Un catálogo de sistema no se puede eliminar','error'); return; }
  if(!confirm('¿Estás seguro de que deseas eliminar este Catálogo?')) return; CATS.splice(CATS.indexOf(c),1); CA.view = 'list'; vista('screenCatalogo'); CC.toast('Catálogo eliminado correctamente','success'); };
function caDetalle(){
  const c = CA.edit ? CA.draft : CATS.find(x=>x.cod===CA.sel); if(!c) return '';
  const ed = CA.edit, E = CA.E || {}, ro = ed ? '' : 'disabled', l = CA.tab==='elem' ? 'elementos' : 'estados';
  const cols = [['cod','Código *'],['desc','Descripción *'],...(c.ingles?[['descEn','Descripción (Inglés)']]:[]),['orden','Orden'],...(l==='estados'?[['color','Color']]:[]),['defecto','Defecto'],['alt','Código alternativo'],['foraneo','Código foráneo'],['sec','Secuencia']];
  const rol = c.cod==='PARTNER_ROLE' && l==='elementos';
  if(rol) cols.splice(2, 0, ['tipoSocio','Tipo Socio *'], ['reqAduana','Requiere Código Aduanas']);
  const prop = k => rol && (k==='tipoSocio' || k==='reqAduana');
  const celda = (x, i, k) => k==='tipoSocio' ? (ed ? `<select class="ca-rol-sel" data-catipo="${i}" onchange="caFila('${l}',${i},'tipoSocio',this.value)"><option value="">Elegir</option>${['Cliente','Proveedor','Ambos'].map(o=>`<option ${o===x.tipoSocio?'selected':''}>${o}</option>`).join('')}</select>` : esc(x.tipoSocio||'-'))
    : k==='reqAduana' ? `<input type="checkbox" style="width:auto" data-caadu="${i}" ${ro} ${x.reqAduana?'checked':''} onchange="caFila('${l}',${i},'reqAduana',this.checked)">`
    : k==='defecto' ? `<input type="checkbox" style="width:auto" ${ro} ${x.defecto?'checked':''} onchange="caFila('${l}',${i},'defecto',this.checked)">`
    : k==='color' ? (ed ? `<input type="color" value="${esc(x.color||'#8D9BA2')}" onchange="caFila('${l}',${i},'color',this.value)">` : `<span class="ca-color" style="background:${esc(x.color||'#fff')}"></span>${esc(x.color||'')}`)
    : ed ? `<input value="${esc(x[k]??'')}" ${k==='cod'&&x.cod&&!CA.isNew&&c.sistema?'disabled':''} oninput="caFila('${l}',${i},'${k}',this.value)">` : esc(x[k]??'');
  const filas = c[l].map((x,i)=>({x,i})).filter(o=>o.x.activo);
  return `<div class="fac-card" id="caGen"><div class="fac-head"><h3>Información General</h3><div class="fac-acts">${ed?'':`<button type="button" class="cc-btn" id="caEditar" onclick="caEditar()">Editar</button><button type="button" class="cc-btn pink" onclick="caEliminar()">Eliminar</button>`}</div></div>
    <div class="fac-g3">${CC.campo('Código *',`<input ${CA.isNew?'':'disabled'} maxlength="50" value="${esc(c.cod)}" oninput="caUpd('cod',this.value)">${err(E,'cod')}`)}${CC.campo('Nombre *',`<input ${ro} maxlength="100" value="${esc(c.nombre)}" oninput="caUpd('nombre',this.value)">${err(E,'nombre')}`)}${CC.campo('Descripción',`<input ${ro} maxlength="200" value="${esc(c.desc)}" oninput="caUpd('desc',this.value)">`)}</div>
    <div class="pt-checks" style="margin-top:10px"><label class="fac-chk"><input type="checkbox" ${ro} ${c.sistema?'checked':''} onchange="caUpd('sistema',this.checked)"> Es de Sistema</label><label class="fac-chk"><input type="checkbox" ${ro} ${c.ingles?'checked':''} onchange="caUpd('ingles',this.checked,true)"> Incluye Inglés</label></div></div>
  <div class="fac-card"><div class="fac-tabs"><button type="button" class="${CA.tab==='elem'?'on':''}" onclick="caTab('elem')">Elemento</button><button type="button" class="${CA.tab==='est'?'on':''}" onclick="caTab('est')">Estado</button></div>
    ${rol?`<div ${CC.propuesta('HU-DM-01 · I-035','Clasificación de roles','fac-note')} id="caRolNota">Tipo Socio define si el rol es Cliente, Proveedor o Ambos y qué Datos por rol pide el Socio. Requiere Código Aduanas hace obligatorio el Código de Aduana del rol. Todo rol debe tener clasificación.</div>`:''}
    <div class="fac-scroll"><table class="fac-tbl" id="caItems"><thead><tr>${ed?'<th style="width:36px"></th>':''}${cols.map(x=>`<th${prop(x[0])?' class="cc-prop"':''}>${x[1]}${x[0]==='tipoSocio'?' '+RD_MK():''}</th>`).join('')}</tr></thead><tbody>
    ${filas.map(({x,i})=>`<tr>${ed?`<td><input type="checkbox" data-i="${i}"></td>`:''}${cols.map(([k])=>`<td${prop(k)?' class="cc-prop"':''}>${celda(x,i,k)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length+1}" class="fac-empty">No se encontraron resultados con los criterios seleccionados.</td></tr>`}</tbody></table></div>${err(E,'items')}
    ${ed?`<div style="margin-top:10px;display:flex;gap:8px"><button type="button" class="cc-btn" onclick="caAgregar('${l}')">Agregar</button><button type="button" class="cc-btn pink" onclick="caEliminarSel('${l}')">Eliminar</button></div>`:''}</div>
  ${ed?`<div class="fac-btns"><button type="button" class="cc-btn" onclick="caCancelar()">Cancelar</button><button type="button" class="cc-btn" id="caGuardar" onclick="caGuardar()">Guardar</button></div>`:''}`;
}
/* ---------- Propuesta I-051 (HU-DOC-14): mantenimiento configurable ISOCODE (tipo y tamaño de contenedor) ---------- */
const ISO_TIPOS = [['DV','Dry Van'],['HC','High Cube'],['RF','Reefer'],['RH','Reefer High Cube'],['OT','Open Top'],['FR','Flat Rack'],['TK','Tanque']];
const isoH = (accion, detalle, user, ts) => ({accion, detalle, user, ts});
const ISO = { f:{q:'', estado:''}, lista:[['22G1','20','DV','Contenedor estándar 20 pies'],['22R1','20','RF','Reefer 20 pies'],['22U1','20','OT','Open top 20 pies'],['22P1','20','FR','Flat rack 20 pies'],['22T1','20','TK','Tanque 20 pies'],
    ['42G1','40','DV','Contenedor estándar 40 pies'],['45G1','40','HC','High cube 40 pies'],['45R1','40','RH','Reefer high cube 40 pies'],['42U1','40','OT','Open top 40 pies'],['42P1','40','FR','Flat rack 40 pies'],['L5G1','45','HC','High cube 45 pies']]
  .map(([cod,tam,tipo,desc],i)=>({cod, tam, tipo, desc, activo: cod!=='L5G1', hist:[isoH('Creación', `${cod} · ${tam} ${tipo}`, 'doc.admin@cosmos.example', `2026-08-${String(10+i).padStart(2,'0')}T09:30`)]})) };
const isoFam = x => `${x.tam} ${x.tipo}`;
const isoUlt = x => x.hist[x.hist.length-1];
const isoAhora = () => { const d = new Date(), p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const isoFh = ts => `${CC.fecha(ts)} ${ts.slice(11,16)}`;
const isoFiltrar = () => ISO.lista.filter(x=>(!ISO.f.q || q(`${x.cod} ${x.desc} ${isoFam(x)}`).includes(q(ISO.f.q))) && (!ISO.f.estado || (ISO.f.estado==='Activo') === x.activo));
W.caIso = () => { CA.view = 'iso'; vista('screenCatalogo', 'Mantenimiento ISOCODE', ['Inicio','Catálogo','Mantenimiento ISOCODE'], 'caVolver()'); };
W.isoFiltro = () => { ISO.f = {q:$('isoQ').value.trim(), estado:$('isoEst').value}; W.caIso(); };
W.isoEditar = cod => { const x = cod ? ISO.lista.find(i=>i.cod===cod) : {cod:'', tam:'', tipo:'', desc:'', activo:true};
  CC.modal(`<h3>${cod ? 'Editar ISOCODE' : 'Nuevo ISOCODE'}</h3><div class="fac-g2">
    ${CC.campo('Código ISO *', `<input id="isoCod" maxlength="4" style="text-transform:uppercase" value="${esc(x.cod)}" ${cod?'disabled':''} placeholder="Ej. 22G1">`)}
    ${CC.campo('Tamaño (pies) *', CC.selector(['20','40','45'], x.tam, 'id="isoTam"', 'Seleccione'))}
    ${CC.campo('Tipo *', CC.selector(ISO_TIPOS.map(([k,v])=>[k, `${k} · ${v}`]), x.tipo, 'id="isoTipo"', 'Seleccione'))}
    ${CC.campo('Descripción *', `<input id="isoDesc" maxlength="100" value="${esc(x.desc)}">`)}</div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="isoGuardar" onclick="isoGuardar('${esc(cod||'')}')">Guardar</button></div>`);
};
W.isoGuardar = cod => {
  const v = {cod:$('isoCod').value.trim().toUpperCase(), tam:$('isoTam').value, tipo:$('isoTipo').value, desc:$('isoDesc').value.trim()};
  if(!v.cod || !v.tam || !v.tipo || !v.desc){ CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
  if(!/^[A-Z0-9]{4}$/.test(v.cod)){ CC.toast('El código ISO debe tener 4 caracteres (letras o números).','error'); return; }
  if(!cod && ISO.lista.some(x=>x.cod===v.cod)){ CC.toast('Ya existe un ISOCODE con este código','error'); return; }
  const user = CC.usuario(), ts = isoAhora();
  if(cod){ const x = ISO.lista.find(i=>i.cod===cod), cambios = ['tam','tipo','desc'].filter(k=>x[k]!==v[k]).map(k=>`${({tam:'Tamaño',tipo:'Tipo',desc:'Descripción'})[k]}: ${x[k]} → ${v[k]}`);
    if(!cambios.length){ CC.cerrarModal(); return; } Object.assign(x, {tam:v.tam, tipo:v.tipo, desc:v.desc}); x.hist.push(isoH('Edición', cambios.join(' · '), user, ts)); }
  else ISO.lista.push({...v, activo:true, hist:[isoH('Creación', `${v.cod} · ${v.tam} ${v.tipo}`, user, ts)]});
  CC.cerrarModal(); W.caIso(); CC.toast('ISOCODE guardado correctamente','success');
};
W.isoEstado = cod => { const x = ISO.lista.find(i=>i.cod===cod), nuevo = !x.activo;
  if(!confirm(`¿Confirma que desea ${nuevo ? 'activar' : 'inactivar'} el ISOCODE ${cod}?`)) return;
  x.activo = nuevo; x.hist.push(isoH(nuevo ? 'Activación' : 'Inactivación', '', CC.usuario(), isoAhora())); W.caIso(); CC.toast(`ISOCODE ${nuevo ? 'activado' : 'inactivado'} correctamente`,'success'); };
W.isoHist = cod => { const x = ISO.lista.find(i=>i.cod===cod);
  CC.modal(`<h3>Historial ${esc(cod)}</h3><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Acción</th><th>Detalle</th><th>Usuario</th><th>Fecha y hora</th></tr></thead><tbody>
    ${x.hist.slice().reverse().map(h=>`<tr><td>${esc(h.accion)}</td><td>${esc(h.detalle||'-')}</td><td>${esc(h.user)}</td><td>${isoFh(h.ts)}</td></tr>`).join('')}</tbody></table></div>
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`); };
function isoHtml(){
  const filas = isoFiltrar(), lnk = (t, fn) => `<button type="button" class="fac-link" onclick="${fn}">${t}</button>`;
  return `<div ${CC.propuesta('I-051','HU-DOC-14 · Mantenimiento ISOCODE','fac-card')} id="isoCard"><div class="fac-head"><div><h3>Mantenimiento ISOCODE</h3><div class="fac-sub">Códigos de tipo y tamaño de contenedor. La familia (tamaño y tipo) la usan Direccionamiento de Vacíos y Días Libres.</div></div>
      <div class="fac-acts"><button type="button" class="cc-btn" id="isoNuevo" onclick="isoEditar('')">Nuevo</button></div></div>
    <div class="fac-note" style="margin-bottom:10px">Por definir (PEN-I051-01): si este mantenimiento convive con la edición de tara, payload y propietario de cada contenedor o la reemplaza. Lo administran Documentación y TI.</div>
    <div class="fac-g3">${CC.campo('Buscar', `<input id="isoQ" placeholder="Código, descripción o familia" value="${esc(ISO.f.q)}">`)}${CC.campo('Estado', CC.selector(['Activo','Inactivo'], ISO.f.estado, 'id="isoEst"', 'Todos'))}
      <div class="fac-f"><label>&nbsp;</label><button type="button" class="cc-btn" id="isoBuscar" onclick="isoFiltro()">Buscar</button></div></div>
    <div class="fac-sec">Resultados (${filas.length})</div>
    <div class="fac-scroll"><table class="fac-tbl" id="isoTbl"><thead><tr><th>Código ISO</th><th>Tamaño</th><th>Tipo</th><th>Familia</th><th>Descripción</th><th>Estado</th><th>Última actualización</th><th>Acciones</th></tr></thead><tbody>
    ${filas.map(x=>{ const u = isoUlt(x); return `<tr data-iso="${esc(x.cod)}"><td>${esc(x.cod)}</td><td>${esc(x.tam)}</td><td>${esc(x.tipo)}</td><td>${esc(isoFam(x))}</td><td>${esc(x.desc)}</td>
      <td>${CC.chipEstado(x.activo ? 'Activo' : 'Inactivo', x.activo ? 'aprobada' : 'anulada')}</td><td>${esc(u.user)}<div class="ac-mut">${isoFh(u.ts)}</div></td>
      <td><div class="fac-rowacts">${lnk('Editar', `isoEditar('${esc(x.cod)}')`)}${lnk(x.activo ? 'Inactivar' : 'Activar', `isoEstado('${esc(x.cod)}')`)}${lnk('Historial', `isoHist('${esc(x.cod)}')`)}</div></td></tr>`; }).join('')
      || '<tr><td colspan="8" class="fac-empty">No se encontraron resultados con los criterios seleccionados.</td></tr>'}</tbody></table></div></div>`;
}
W.addEventListener('cc:propuestas', e => { if(!e.detail && CA.view==='iso'){ CA.view = 'list'; const a = D.querySelector('section.panel.active'); if(a && a.id==='screenCatalogo') vista('screenCatalogo'); } });
CC.registrarPantalla({
  id:'screenCatalogo', grupo:'Data Maestra', opcion:'Catálogo', titulo:'Buscar Catálogo', migas:['Inicio','Catálogo','Consulta de Catálogo'],
  html: () => CA.view==='iso' ? isoHtml() : CA.view==='detail' ? caDetalle() : filtrosCx({id:'caF', titulo:'Buscar Catálogo', hay:caHay(), buscado:CA.buscado, buscar:'caBuscar()', limpiar:'caLimpiar()',
      acciones:`<button type="button" ${CC.propuesta('I-051','HU-DOC-14 · ISOCODE','cc-btn ghost')} id="caIso" onclick="caIso()">Mantenimiento ISOCODE</button><button type="button" class="cc-btn" onclick="caNuevo()">Nuevo</button>`,
      campos:[CC.campo('Nombre',`<input id="caNombre" placeholder="Ingresar nombre" value="${esc(CA.f.nombre)}" oninput="caSet('nombre',this.value)">`),
        CC.campo('Código',`<input id="caCod" placeholder="Ingresar código" value="${esc(CA.f.cod)}" oninput="caSet('cod',this.value)">`),
        CC.campo('Descripción',`<input placeholder="Ingresar descripción" value="${esc(CA.f.desc)}" oninput="caSet('desc',this.value)">`)]})
    + (CA.buscado ? CC.tablaResultados({id:'caRes', filas:caLista(), pagina:CA.pagina, tam:CA.tam, fnPagina:'caPagina', exportar:'caExportar()', vacio:'No se encontraron resultados con los criterios seleccionados.',
      columnas:[{t:'Código', v:c=>`<button type="button" class="fac-link" onclick="caAbrir('${c.cod}')">${esc(c.cod)}</button>`},{t:'Nombre',k:'nombre'},{t:'Descripción',k:'desc'}]}) : ''),
  alAbrir: () => { CA.view = 'list'; CA.edit = false; vista('screenCatalogo'); },
  guia:[{t:'Consultar un catálogo', steps:[{go:()=>{ if(CA.view!=='list') W.caVolver(); }, el:'#caF', h:'Buscar Catálogo', p:'Por nombre, código o descripción.'}]}]
});

/* ============================================================
   TIPO DE CAMBIO
============================================================ */
const TC = {f:{mon:'', desde:'', hasta:''}, buscado:false, pagina:1, tam:10, view:'list', sel:null, modo:'view', draft:null, E:null, dirty:false};
const TC_LIST = (()=>{ const L = [], h = hoyISO(); let id = 1;
  for(let i=29;i>=0;i--){ const f = sumaDias(h,-i), v = 3.72 + Math.sin(i/3)*0.04;
    L.push({id:id++, fecha:f, mon:'USD', compra:+(v-0.006).toFixed(3), venta:+(v+0.004).toFixed(3)});
    L.push({id:id++, fecha:f, mon:'EUR', compra:+(v*1.08-0.01).toFixed(3), venta:+(v*1.08+0.01).toFixed(3)}); }
  return L.reverse(); })();
const TC_MON = [['USD','Dólar estadounidense'],['EUR','Euro']];
const tcLista = () => TC_LIST.filter(t=>(!TC.f.mon||t.mon===TC.f.mon)&&(!TC.f.desde||t.fecha>=TC.f.desde)&&(!TC.f.hasta||t.fecha<=TC.f.hasta));
const tcHay = () => Object.values(TC.f).some(Boolean);
const tcBarra = () => { const t = {create:'Crear Tipo de Cambio', edit:'Editar Tipo de Cambio', view:'Ver Tipo de Cambio'}[TC.modo]; vista('screenTipoCambio', t, ['Inicio','Tipo de cambio',t], 'tcVolver()'); };
W.tcSet = (k, v) => { TC.f[k] = v; habilita('tcF', tcHay()); };
W.tcBuscar = () => { if(TC.f.desde && TC.f.hasta && TC.f.desde > TC.f.hasta){ CC.toast('La fecha inicial no puede ser mayor que la final','error'); return; } TC.buscado = true; TC.pagina = 1; CC.refrescar('screenTipoCambio'); };
W.tcLimpiar = () => { TC.f = {mon:'', desde:'', hasta:''}; TC.buscado = false; CC.refrescar('screenTipoCambio'); };
W.tcPagina = (p, t) => { if(t) TC.tam = t; TC.pagina = p; CC.refrescar('screenTipoCambio'); };
W.tcExportar = () => CC.exportarExcel('TipoCambio','Tipo de cambio',['ID','Fecha','Moneda','TC Compra','TC Venta'], tcLista().map(t=>[t.id,CC.fecha(t.fecha),t.mon,t.compra,t.venta]));
W.tcAbrir = (id, modo) => { const t = TC_LIST.find(x=>x.id===id); TC.sel = id; TC.view = 'detail'; TC.modo = modo || 'view'; TC.draft = {...t}; TC.E = null; TC.dirty = false; tcBarra(); };
W.tcNuevo = () => { TC.sel = null; TC.view = 'detail'; TC.modo = 'create'; TC.draft = {fecha:hoyISO(), mon:'', compra:'', venta:''}; TC.E = null; TC.dirty = false; tcBarra(); };
W.tcVolver = () => { if(!descartar(TC.dirty)) return; TC.view = 'list'; TC.dirty = false; vista('screenTipoCambio'); };
W.tcUpd = (k, v) => { TC.draft[k] = v; TC.dirty = true; };
W.tcGuardar = () => {
  const d = TC.draft, E = {};
  if(!d.fecha) E.fecha = OB; if(!d.mon) E.mon = OB;
  ['compra','venta'].forEach(k=>{ if(d[k]==='' || d[k]==null) E[k] = OB; else if(!(+d[k]>0)) E[k] = 'Ingrese un valor mayor a 0'; });
  if(TC.modo==='create' && TC_LIST.some(t=>t.fecha===d.fecha && t.mon===d.mon)) E.fecha = 'Ya existe un tipo de cambio para esta fecha y moneda';
  TC.E = E; if(Object.keys(E).length){ tcBarra(); CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
  if(TC.modo==='create'){ const n = {id:Math.max(...TC_LIST.map(t=>t.id))+1, fecha:d.fecha, mon:d.mon, compra:+d.compra, venta:+d.venta}; TC_LIST.unshift(n); TC.sel = n.id; }
  else Object.assign(TC_LIST.find(t=>t.id===TC.sel), {compra:+d.compra, venta:+d.venta});
  TC.dirty = false; W.tcAbrir(TC.sel, 'view'); CC.toast('Tipo de cambio guardado correctamente','success');
};
W.tcEliminar = () => { if(!confirm('¿Estás seguro de que deseas eliminar este Tipo de cambio?')) return; TC_LIST.splice(TC_LIST.findIndex(t=>t.id===TC.sel),1); TC.view = 'list'; vista('screenTipoCambio'); CC.toast('Tipo de cambio eliminado correctamente','success'); };
function tcDetalle(){
  const d = TC.draft, E = TC.E || {}, ed = TC.modo!=='view', crea = TC.modo==='create';
  const acts = ed ? '' : `<button type="button" class="cc-btn" id="tcEditar" onclick="tcAbrir(${TC.sel},'edit')">Editar</button><button type="button" class="cc-btn pink" onclick="tcEliminar()">Eliminar</button>`;
  return `<div class="fac-card" id="tcGen"><div class="fac-head"><h3>Información General</h3><div class="fac-acts">${acts}</div></div>
    <div class="fac-g4">${CC.campo('Fecha *',`<input type="date" id="tcFecha" ${crea?'':'disabled'} value="${esc(d.fecha)}" onchange="tcUpd('fecha',this.value)">${err(E,'fecha')}`)}
      ${CC.campo('Moneda *',CC.selector(TC_MON,d.mon,`id="tcMon" ${crea?'':'disabled'} onchange="tcUpd('mon',this.value)"`,'Elegir Moneda')+err(E,'mon'))}
      ${CC.campo('TC Compra *',`<input id="tcCompra" inputmode="decimal" ${ed?'':'disabled'} value="${esc(d.compra)}" oninput="tcUpd('compra',this.value)">${err(E,'compra')}`)}
      ${CC.campo('TC Venta *',`<input id="tcVenta" inputmode="decimal" ${ed?'':'disabled'} value="${esc(d.venta)}" oninput="tcUpd('venta',this.value)">${err(E,'venta')}`)}</div></div>
  ${ed?`<div class="fac-btns"><button type="button" class="cc-btn" onclick="${crea?'tcVolver()':`tcAbrir(${TC.sel},'view')`}">Cancelar</button><button type="button" class="cc-btn" id="tcGuardar" onclick="tcGuardar()">Guardar</button></div>`:''}`;
}
CC.registrarPantalla({
  id:'screenTipoCambio', grupo:'Data Maestra', opcion:'Tipo de cambio', titulo:'Buscar Tipo de cambio', migas:['Inicio','Tipo de cambio','Consulta de Tipo de cambio'],
  html: () => TC.view==='detail' ? tcDetalle() : filtrosCx({id:'tcF', titulo:'Buscar Tipo de cambio', hay:tcHay(), buscado:TC.buscado, buscar:'tcBuscar()', limpiar:'tcLimpiar()',
      acciones:'<button type="button" class="cc-btn" onclick="tcNuevo()">Nuevo</button>',
      campos:[CC.campo('Moneda', CC.selector(TC_MON, TC.f.mon, 'id="tcFMon" onchange="tcSet(\'mon\',this.value)"', 'Elegir Moneda')),
        CC.campo('Rango de Fechas', `<div class="dm-rango"><input type="date" id="tcDesde" value="${esc(TC.f.desde)}" onchange="tcSet('desde',this.value)"><input type="date" id="tcHasta" value="${esc(TC.f.hasta)}" onchange="tcSet('hasta',this.value)"></div>`)]})
    + (TC.buscado ? CC.tablaResultados({id:'tcRes', filas:tcLista(), pagina:TC.pagina, tam:TC.tam, fnPagina:'tcPagina', exportar:'tcExportar()', vacio:'No se encontraron resultados con los criterios seleccionados.',
      columnas:[{t:'ID', v:t=>`<button type="button" class="fac-link" onclick="tcAbrir(${t.id})">${t.id}</button>`},{t:'Fecha', v:t=>CC.fecha(t.fecha)},{t:'Moneda',k:'mon'},{t:'TC Compra', v:t=>t.compra.toFixed(3)},{t:'TC Venta', v:t=>t.venta.toFixed(3)}]}) : ''),
  alAbrir: () => { TC.view = 'list'; vista('screenTipoCambio'); },
  guia:[{t:'Consultar el tipo de cambio', steps:[{go:()=>{ if(TC.view!=='list') W.tcVolver(); }, el:'#tcF', h:'Buscar', p:'Por moneda y rango de fechas.'}]}]
});

/* ============================================================
   DÍAS NO LABORABLES: calendario anual
============================================================ */
const FERIADOS = ['01-01','05-01','06-07','06-29','07-23','07-28','07-29','08-06','08-30','10-08','11-01','12-08','12-09','12-25'];
const DN = {anio:new Date().getFullYear(), dias:{}, edit:false, draft:null, dirty:false};
const dnDe = a => DN.dias[a] || (DN.dias[a] = FERIADOS.map(f=>`${a}-${f}`));
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
W.dnAnio = v => { const a = +v; if(!/^\d{4}$/.test(String(v)) || a<1900 || a>2100){ CC.toast('Por favor ingrese un año válido','error'); return; } if(!descartar(DN.dirty)) return; DN.anio = a; DN.edit = false; DN.dirty = false; dnBarra(); };
W.dnEditar = () => { DN.draft = [...dnDe(DN.anio)]; DN.edit = true; dnBarra(); };
W.dnCancelar = () => { if(!descartar(DN.dirty)) return; DN.edit = false; DN.dirty = false; dnBarra(); };
W.dnDia = iso => { if(!DN.edit) return; const i = DN.draft.indexOf(iso); if(i>-1) DN.draft.splice(i,1); else DN.draft.push(iso); DN.dirty = true; dnBarra(); };
W.dnGuardar = () => { DN.dias[DN.anio] = DN.draft.sort(); DN.edit = false; DN.dirty = false; dnBarra(); CC.toast('Días no laborables guardados correctamente.','success'); };
const dnBarra = () => vista('screenDiasNoLab', `Días No Laborables ${DN.anio}`, ['Inicio','Días No Laborables', String(DN.anio)]);
function dnHtml(){
  const sel = new Set(DN.edit ? DN.draft : dnDe(DN.anio)), a = DN.anio;
  const mes = m => { const ini = (new Date(a,m,1).getDay()+6)%7, n = new Date(a,m+1,0).getDate(); let c = '';
    for(let i=0;i<ini;i++) c += '<span></span>';
    for(let d=1; d<=n; d++){ const iso = `${a}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; c += `<button type="button" class="dn-d${sel.has(iso)?' on':''}${(ini+d-1)%7>4?' fin':''}" data-iso="${iso}" ${DN.edit?'':'tabindex="-1"'} onclick="dnDia('${iso}')">${d}</button>`; }
    return `<div class="dn-mes"><h4>${MESES[m]}</h4><div class="dn-sem">${['L','M','M','J','V','S','D'].map(x=>`<span>${x}</span>`).join('')}</div><div class="dn-grid">${c}</div></div>`; };
  return `<div class="fac-card" id="dnCab"><div class="fac-head"><div><h3>Días No Laborables</h3><div class="fac-sub">${DN.edit?'Haga clic en un día para marcarlo o desmarcarlo.':'Días marcados como no laborables en el año.'}</div></div>
    <div class="fac-acts">${DN.edit?'':`<button type="button" class="cc-btn" id="dnEditar" onclick="dnEditar()">Editar</button>`}</div></div>
    <div class="fac-g4">${CC.campo('Año', `<input id="dnAnio" type="number" min="1900" max="2100" value="${a}" ${DN.edit?'disabled':''} onchange="dnAnio(this.value)">`)}${CC.campoLectura('Días no laborables', String(sel.size))}</div></div>
  <div class="fac-card"><div class="dn-cal${DN.edit?' ed':''}" id="dnCal">${MESES.map((x,m)=>mes(m)).join('')}</div>
    ${DN.edit?`<div class="fac-btns"><button type="button" class="cc-btn" onclick="dnCancelar()">Cancelar</button><button type="button" class="cc-btn" id="dnGuardar" onclick="dnGuardar()">Guardar</button></div>`:''}</div>`;
}
CC.registrarPantalla({
  id:'screenDiasNoLab', grupo:'Data Maestra', opcion:'Días No Laborables', titulo:'Días No Laborables', migas:['Inicio','Días No Laborables'],
  html: dnHtml, alAbrir: () => { DN.anio = new Date().getFullYear(); DN.edit = false; dnBarra(); },
  guia:[{t:'Marcar días no laborables', steps:[{el:'#dnCab', h:'Año', p:'Elige el año y presiona Editar.'},{el:'#dnCal', h:'Calendario', p:'Haz clic en los días para marcarlos y luego Guardar.'}]}]
});

/* ============================================================
   PLANTILLA EMAIL: 26 plantillas en 7 módulos, variables fijas por plantilla
   + prototipo I-068 (HU-TI-01): notificaciones por módulo (propuesta)
============================================================ */
const EM_MOD = [['CUSTOMER_SERVICE','Atención al cliente'],['BL','BL'],['VOYAGE','Viaje'],['PDA','PDA'],['SECURITY','Seguridad'],['SETTLEMENT','Liquidaciones'],['CONTAINER_DAMAGE','Daño contenedores']];
const emModTxt = m => (EM_MOD.find(x=>x[0]===m)||[])[1] || (m==='AUDITING' ? 'AUDITING' : 'Sin módulo');
/* variable: [nombre en pantalla, ejemplo, descripción, origen, formato] */
const EM_VAR = {
  vesselName:['Nave','PACIFIC HORIZON','Nombre de la nave','Viaje','Texto'], portName:['Puerto','Callao','Puerto de operación','Viaje','Texto'], voyageNumber:['Viaje','115E','Número de viaje','Viaje','Texto'],
  captainName:['Capitán','J. Ejemplo','Nombre del capitán','Viaje','Texto'], eta:['ETA','20/11/2026 08:00','Fecha estimada de arribo','Viaje','dd/mm/aaaa hh:mm'], ata:['ATA','20/11/2026 09:10','Fecha real de arribo','Viaje','dd/mm/aaaa hh:mm'], atd:['ATD','21/11/2026 18:00','Fecha real de zarpe','Viaje','dd/mm/aaaa hh:mm'],
  carrierName:['Línea naviera','LÍNEA EJEMPLO','Línea naviera del viaje','BL','Texto'], manifestNumber:['Número de manifiesto','2026-1234','Manifiesto de carga','BL','Texto'], year:['Año','2026','Año del manifiesto','BL','aaaa'],
  draftType:['Tipo de envío','Final','Borrador o final','BL','Texto'], terminalName:['Terminal','TERMINAL NORTE EJEMPLO','Terminal de operación','Organización','Texto'], terminalCode:['Código de terminal','APM','Código del terminal','Organización','Texto'],
  indicator:['Indicador','I','Importación o exportación','BL','Texto'], discrepancies:['Discrepancias','2 contenedores','Detalle de sellos con discrepancia','BL','Tabla HTML'], blNumber:['Número de BL','ZIMUBOX0000011','Número de BL','BL','Texto'],
  consigneeName:['Consignatario','CLIENTE EJEMPLO S.A.C.','Consignatario del BL','Socio','Texto'], dispatchTypeName:['Tipo de despacho','Anticipado','Tipo de despacho del direccionamiento','BL','Texto'],
  customerName:['Cliente','CLIENTE EJEMPLO S.A.C.','Cliente','Socio','Texto'], loadingPortName:['Puerto de carga','Shanghái','Puerto de carga del BL','BL','Texto'],
  actionType:['Acción','Suspensión','Suspensión o levantamiento','Atención al cliente','Texto'], partnerDocumentNumber:['Documento del socio','20610000999','RUC del socio','Socio','Texto'], partnerName:['Socio','CLIENTE EJEMPLO S.A.C.','Nombre del socio','Socio','Texto'],
  suspensionType:['Tipo de suspensión','Temporal','Tipo de suspensión','Atención al cliente','Texto'], reason:['Motivo','Deuda vencida','Motivo registrado','Proceso','Texto'], startDate:['Fecha de inicio','20/11/2026','Inicio','Atención al cliente','dd/mm/aaaa'],
  endDate:['Fecha de fin','30/11/2026','Fin','Atención al cliente','dd/mm/aaaa'], blNumbers:['BL afectados','BL001, BL002','BL afectados','Atención al cliente','Lista'], actionUser:['Usuario','P. Díaz','Usuario que registra','Seguridad','Texto'], actionDate:['Fecha de acción','20/11/2026 10:00','Fecha de la acción','Proceso','dd/mm/aaaa hh:mm'],
  containerNumber:['Contenedor','MSKU0000001','Número de contenedor','BL','Texto'], currency:['Moneda','USD','Moneda','Proceso','Texto'], amount:['Monto','1,250.00','Monto','Proceso','Número'], noticeNumber:['Número de aviso','AV-0001','Número de aviso de daño','Daño contenedores','Texto'],
  pdaNumber:['Número de PDA','PDA2026000041PECLL','Número de PDA','PDA','Texto'], advancePercent:['Porcentaje de adelanto','50%','Adelanto solicitado','PDA','Porcentaje'],
  attachmentName:['Adjunto','DOC-0001.pdf','Nombre del adjunto','Liquidación','Texto'], supportingDocumentsPath:['Ruta de sustentos','https://portal.example/sustentos','Enlace a sustentos','Liquidación','URL'],
  userName:['Usuario','P. Díaz','Usuario que registra','Seguridad','Texto'], userArea:['Área del usuario','Facturación','Área','Seguridad','Texto'], sistema:['Sistema','Cosmos Connect','Sistema de origen','Proceso','Texto'],
  applicant:['Solicitante','Contacto Ejemplo','Nombre del solicitante','Seguridad','Texto'], user:['Usuario','contacto@cliente.example','Usuario asignado','Seguridad','Texto'], password:['Contraseña temporal','(se genera al enviar)','Contraseña temporal','Seguridad','Texto'],
  releaseRequestNumber:['Solicitud de liberación','SL-0001','Número de solicitud','Atención al cliente','Texto'], blChildNumber:['BL hijo','HBL-0001','BL hijo','BL','Texto'], customsAgentName:['Agente de aduanas','AGENCIA EJEMPLO','Agente de aduanas','Socio','Texto'],
  approvalDate:['Fecha de aprobación','20/11/2026','Fecha de aprobación','Proceso','dd/mm/aaaa'], returnMemoPath:['Memo de devolución','https://portal.example/memo','Enlace al memo','Atención al cliente','URL'], portalUrl:['Portal','https://portal.example','Enlace al portal externo','Proceso','URL'], approvedBy:['Aprobado por','P. Díaz','Usuario que aprueba','Seguridad','Texto'],
  integrationName:['Integración','SAP','Nombre de la integración','Integración','Texto'], integrationProcessName:['Proceso','Envío de documentos','Proceso de integración','Integración','Texto'], blobPath:['Archivo','errores/2026/11/archivo.json','Ruta del archivo','Integración','Texto'], transactionId:['Transacción','TX-0001','Identificador de la transacción','Integración','Texto']};
const EM_VACIA = ['captainName','eta','ata','atd','consigneeName','endDate','blNumbers','reason','supportingDocumentsPath','blChildNumber','customsAgentName','returnMemoPath','portalUrl','terminalName','approvedBy','manifestNumber','userArea','advancePercent'];
/* uso: A asunto, C cuerpo, AC ambos */
const V = s => s.split(' ').map(x=>{ const [k,u] = x.split(':'); return [k, u||'C']; });
const PRE_VARS = V('vesselName:AC portName:AC voyageNumber:A captainName eta');
const EM_T = [
  ['VOYAGE','PRE-ARRIVAL','Pre Arrival',480,true,PRE_VARS], ['VOYAGE','UIS','Useful Information to Ships (UIS)',24,true,PRE_VARS],
  ['VOYAGE','SERVICE-REQUIREMENT','Service Requirement',0,false,V('vesselName:AC voyageNumber:AC portName:AC ata atd')], ['VOYAGE','GENERAL_LISTING','Envio de listado de Transbordo',0,false,[]],
  ['BL','CAL','Envío del CAL generado en exportaciones',0,false,V('vesselName:A voyageNumber:A carrierName:A manifestNumber:A year:A draftType:AC terminalName')],
  ['BL','VGM','Envío del VGM generado en exportaciones',0,false,V('vesselName:A voyageNumber:A carrierName:A manifestNumber:A year:A draftType:AC terminalName')],
  ['BL','CDL','Envío del CDL generado en importaciones',0,false,V('vesselName:A voyageNumber:A carrierName:A manifestNumber:A terminalName')],
  ['BL','SEAL-DISCREPANCY-TERMINAL','Discrepancias de sellos para el terminal',0,false,V('indicator:AC voyageNumber:A vesselName:A terminalName:A terminalCode discrepancies')],
  ['BL','SEAL-DISCREPANCY-CLIENT','Discrepancias de sellos para el consignatario',0,false,V('manifestNumber:A voyageNumber:A vesselName:A blNumber:A terminalCode discrepancies consigneeName')],
  ['BL','PROVISIONAL-IMPORT-PORTAL','Direccionamiento provisional',0,false,V('dispatchTypeName:AC blNumber:AC vesselName:AC voyageNumber:AC portName:AC eta')],
  ['BL','DEFINITIVE-IMPORT-PORTAL','Direccionamiento definitivo',0,false,V('dispatchTypeName:AC blNumber:AC vesselName:AC voyageNumber:AC portName:AC eta')],
  ['BL','NOTIFY-BL','Aviso de llegada',0,false,V('blNumber:AC vesselName:A manifestNumber:A customerName')],
  ['BL','DEPARTURE-NOTICE-BL','Aviso de Zarpe de BL',0,false,V('blNumber:A vesselName:A manifestNumber:A carrierName loadingPortName')],
  ['CUSTOMER_SERVICE','PARTNER_SUSPENSION','Suspensiones de socios',0,false,V('actionType:AC partnerDocumentNumber:AC partnerName:AC suspensionType reason startDate endDate blNumbers actionUser actionDate')],
  ['CONTAINER_DAMAGE','NOTIFY_CONTAINER_DAMAGE','Notificación Daños de Contenedor',0,false,V('containerNumber:AC blNumber:AC vesselName:AC voyageNumber:AC consigneeName:AC currency:AC amount:AC noticeNumber:A')],
  ['PDA','NOTIFY-PDA','Notificación Proceso PDA',0,false,V('pdaNumber:AC advancePercent')],
  ['SETTLEMENT','ACCOUNTING_DOCUMENT_COVER','Cover de documento contable (inglés)',0,false,V('vesselName:AC voyageNumber:AC portName customerName attachmentName supportingDocumentsPath')],
  ['SETTLEMENT','ACCOUNTING_DOCUMENT_COVER','Cover de documento contable (español)',0,false,V('vesselName:AC voyageNumber:AC portName customerName attachmentName supportingDocumentsPath')],
  ['SETTLEMENT','NOTIFY_TREASURY','Devolución a Tesorería',0,false,V('voyageNumber:AC customerName:AC vesselName portName amount currency reason userName userArea sistema')],
  ['SECURITY','EXTERNAL_USER_REQUEST_CREATED','Registro de solicitud de usuario externo',0,false,V('applicant')],
  ['SECURITY','EXTERNAL_USER_REQUEST_REJECTED','Rechazo de usuario externo',0,false,V('applicant reason')],
  ['SECURITY','EXTERNAL_USER_DEACTIVATED','Baja de usuario externo',0,false,V('applicant reason')],
  ['SECURITY','EXTERNAL_USER_CREATED','Aprobación de usuario externo',0,false,V('applicant user password')],
  ['SECURITY','EXTERNAL_USER_ACTIVATED','Reactivación de usuario externo',0,false,V('applicant user password')],
  ['','AUTORIZACION_LIBERACION_VISTO_BUENO','Autorización de Liberación de Visto Bueno',0,false,V('releaseRequestNumber blNumber blChildNumber consigneeName customsAgentName vesselName voyageNumber approvalDate returnMemoPath portalUrl terminalName approvedBy')],
  ['AUDITING','INTEGRATION-PROCESS-ERROR','Error en servicios de Integración para TI',0,false,V('integrationName integrationProcessName blobPath transactionId')]
].map(([mod,cod,nombre,alerta,adj,vars],i)=>{
  const tag = k => `{{${k}}}`, A = vars.filter(v=>/A/.test(v[1])).map(v=>tag(v[0])), C = vars.filter(v=>/C/.test(v[1]));
  return {id:i+1, mod, cod, nombre, alerta, adj, vars, asunto: A.length ? `${nombre}: ${A.join(' / ')}` : nombre,
    cuerpo: `<p>Estimados,</p><p>${esc(nombre)}.</p>${C.length?`<ul>${C.map(v=>`<li>${EM_VAR[v[0]][0]}: {{${v[0]}}}</li>`).join('')}</ul>`:''}<p>Saludos cordiales.</p>`,
    adjuntos: adj ? [{nombre:`${cod}.pdf`, ruta:`plantillas/${cod}.pdf`, tam:'184 KB', fecha:'2026-10-02T10:00:00', usuario:'L. Fernández'}] : [],
    notif: null};
});
const EM = {f:{nombre:'', mod:''}, buscado:false, pagina:1, tam:10, view:'list', sel:null, modo:'view', draft:null, E:null, dirty:false};
W.EM = EM;
const emLista = () => EM_T.filter(t=>(!EM.f.nombre||q(t.nombre).includes(q(EM.f.nombre)))&&(!EM.f.mod||t.mod===EM.f.mod));
const emHay = () => Object.values(EM.f).some(Boolean);
const emBarra = () => { const t = {create:'Nueva Plantilla Email', edit:'Editar Plantilla Email', view:'Ver Plantilla Email'}[EM.modo]; vista('screenPlantillaEmail', t, ['Inicio','Plantilla Email',t], 'emVolver()'); };
W.emSet = (k, v, re) => { EM.f[k] = v; if(re) CC.refrescar('screenPlantillaEmail'); else habilita('emF', emHay()); };
W.emBuscar = () => { EM.buscado = true; EM.pagina = 1; CC.refrescar('screenPlantillaEmail'); };
W.emLimpiar = () => { EM.f = {nombre:'', mod:''}; EM.buscado = false; CC.refrescar('screenPlantillaEmail'); };
W.emPagina = (p, t) => { if(t) EM.tam = t; EM.pagina = p; CC.refrescar('screenPlantillaEmail'); };
W.emExportar = () => CC.exportarExcel('PlantillaEmail','Plantilla Email',['Nombre','Módulo'], emLista().map(t=>[t.nombre, emModTxt(t.mod)]));
W.emAbrir = (id, modo) => { const t = EM_T.find(x=>x.id===id); EM.sel = id; EM.view = 'detail'; EM.modo = modo || 'view'; EM.draft = JSON.parse(JSON.stringify(t)); EM.E = null; EM.dirty = false; emBarra(); };
W.emNuevo = () => { EM.sel = null; EM.view = 'detail'; EM.modo = 'create'; EM.draft = {mod:'', cod:'', nombre:'', alerta:'', adj:false, vars:[], asunto:'', cuerpo:'', adjuntos:[], notif:null}; EM.E = null; EM.dirty = false; emBarra(); };
W.emVolver = () => { if(!salir(EM.dirty)) return; EM.view = 'list'; EM.dirty = false; vista('screenPlantillaEmail'); };
W.emCancelar = () => { if(!salir(EM.dirty)) return; EM.dirty = false; if(EM.modo==='create'){ W.emVolver(); return; } W.emAbrir(EM.sel, 'view'); };
W.emUpd = (k, v, re) => { EM.draft[k] = v; EM.dirty = true; if(EM.E) delete EM.E[k]; if(re) emBarra(); };
W.emAdj = v => { if(v && !EM.draft.mod){ CC.toast('Debe seleccionar un módulo antes de activar el adjunto por defecto','error'); emBarra(); return; } W.emUpd('adj', v, true); };
W.emCmd = c => { D.execCommand(c); const ed = $('emCuerpo'); if(ed) W.emUpd('cuerpo', ed.innerHTML); };
W.emGuardar = () => {
  const d = EM.draft, E = {};
  if(!String(d.nombre||'').trim()) E.nombre = OB;
  if(!d.mod) E.mod = OB;                                         /* Connect lo marca con * pero no lo exige: el mockup lo exige */
  if(!String(d.asunto||'').trim()) E.asunto = OB;
  if(d.alerta==='' || d.alerta==null || isNaN(+d.alerta)) E.alerta = OB; else if(+d.alerta<0) E.alerta = 'El valor mínimo es 0';
  if(!String(d.cuerpo||'').replace(/<[^>]+>/g,'').trim()) E.cuerpo = OB;
  EM.E = E;
  if(Object.keys(E).length){ emBarra(); CC.toast('Por favor, complete todos los campos obligatorios.','error'); return; }
  if(d.adj && !d.adjuntos.length){ CC.toast('Debe cargar al menos un adjunto para una plantilla con adjunto por defecto','error'); return; }
  d.alerta = +d.alerta;
  if(EM.modo==='create'){ d.cod = (d.nombre.trim().replace(/\s+/g,'-') + '-' + d.mod).toUpperCase(); d.id = Math.max(...EM_T.map(t=>t.id))+1; EM_T.push(d); EM.sel = d.id; }
  else Object.assign(EM_T.find(t=>t.id===EM.sel), d);
  const nueva = EM.modo==='create'; EM.dirty = false; W.emAbrir(EM.sel, 'view');
  CC.toast(nueva ? 'Plantilla Email creada correctamente.' : 'Plantilla Email guardada correctamente.','success');
};
W.emEliminar = () => { if(!confirm('¿Estás seguro de que deseas eliminar esta Plantilla Email?')) return; EM_T.splice(EM_T.findIndex(t=>t.id===EM.sel),1); EM.view = 'list'; vista('screenPlantillaEmail'); CC.toast('Plantilla Email eliminada correctamente','success'); };
/* Adjuntos (los archivos no se leen: solo se registra el nombre, en memoria) */
W.emSubir = () => {
  EM.subida = [];
  CC.modal(`<h3>Adjuntar Documentos</h3><div style="height:10px"></div>
    ${CC.campo('Seleccione Archivos', '<input type="file" id="emArchivos" multiple onchange="emElegidos(this.files)">')}
    <div class="fac-scroll" style="margin-top:10px"><table class="fac-tbl"><thead><tr><th>Nombre del Archivo</th><th>Fecha de Carga</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody id="emSubidaBody"><tr><td colspan="4" class="fac-empty">Suba archivos para comenzar</td></tr></tbody></table></div>
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" onclick="emSubidaOk()">Guardar</button></div>`, 'md');
};
W.emElegidos = files => {
  const malos = [...files].filter(f=>f.name.length>80); if(malos.length) CC.toast('El nombre del archivo no puede exceder 80 caracteres','error');
  EM.subida = [...files].filter(f=>f.name.length<=80).map(f=>({nombre:f.name, ruta:`plantillas/${f.name}`, tam:`${Math.max(1,Math.round(f.size/1024))} KB`, fecha:new Date().toISOString(), usuario:CC.usuario()}));
  $('emSubidaBody').innerHTML = EM.subida.map((a,i)=>`<tr><td>${esc(a.nombre)}</td><td>${CC.fecha(a.fecha)}</td><td>${esc(a.usuario)}</td><td><button type="button" class="fac-link" onclick="EM_quitarSubida(${i})">Quitar</button></td></tr>`).join('') || '<tr><td colspan="4" class="fac-empty">Suba archivos para comenzar</td></tr>';
};
W.EM_quitarSubida = i => { EM.subida.splice(i,1); W.emElegidos([]); };
W.emSubidaOk = () => { if(!EM.subida || !EM.subida.length){ CC.toast('No hay archivos seleccionados para guardar','error'); return; }
  EM.draft.adjuntos.push(...EM.subida); EM.dirty = true; CC.cerrarModal(); emBarra(); CC.toast('Archivos cargados exitosamente','success'); };
W.emAdjEliminar = () => { const s = [...D.querySelectorAll('#emAdjTbl input[data-i]:checked')].map(x=>+x.dataset.i); if(!s.length){ CC.toast('Seleccione al menos un adjunto','info'); return; }
  EM.draft.adjuntos = EM.draft.adjuntos.filter((a,i)=>!s.includes(i)); EM.dirty = true; emBarra(); };
W.emDescargar = i => CC.toast(`Descarga simulada: ${EM.draft.adjuntos[i].nombre}`,'info');
/* Diálogo Variables disponibles (desde la búsqueda: todas; desde una plantilla: solo esa) */
W.emVariables = soloEsta => {
  const lista = soloEsta ? [EM.draft] : EM_T, usos = {};
  lista.forEach(t=>t.vars.forEach(([k,u])=>{ const x = usos[k] = usos[k] || {u:new Set(), t:[]}; u.split('').forEach(c=>x.u.add(c)); x.t.push(t); }));
  const filas = Object.keys(usos);
  const usoTxt = s => s.has('A') && s.has('C') ? 'Asunto y Cuerpo' : s.has('A') ? 'Asunto' : 'Cuerpo';
  CC.modal(`<h3>Variables disponibles${soloEsta?` · ${esc(EM.draft.nombre||'')}`:''}</h3>
    <details class="em-ayuda"><summary>¿Cómo ocultar una línea cuando no hay dato?</summary><p>Encierre el texto entre la marca de apertura <code>{{#variable}}</code> y la de cierre <code>{{/variable}}</code>. Solo funciona en el cuerpo, no en el asunto. Use un bloque por variable; no ponga un bloque dentro de otro.</p></details>
    ${filas.length ? `<div class="fac-scroll"><table class="fac-tbl" id="emVarTbl"><thead><tr><th>Variable</th><th>Nombre</th><th>Se usa en</th><th>Ejemplo</th></tr></thead><tbody>
      ${filas.map(k=>{ const v = EM_VAR[k] || [k,'','','','Texto'], x = usos[k];
        return `<tr><td><code>{{${k}}}</code> <button type="button" class="fac-link" title="Copiar variable" onclick="emCopiar('${k}')">Copiar variable</button></td><td>${esc(v[0])}</td><td>${usoTxt(x.u)}</td><td>${esc(v[1])}</td></tr>
        <tr class="em-var-det"><td colspan="4"><b>Descripción:</b> ${esc(v[2])} · <b>Origen del dato:</b> ${esc(v[3])} · <b>Formato:</b> ${esc(v[4])} · <b>Puede venir vacía:</b> ${EM_VACIA.includes(k)?'Sí':'No'} · <b>Si no hay dato:</b> ${EM_VACIA.includes(k)?'queda en blanco':'no aplica'} · <b>Para ocultar la línea:</b> <code>{{#${k}}}...{{/${k}}}</code>
          <br><b>Plantillas donde se usa:</b> ${x.t.map(t=>`${esc(t.nombre)} (Activa)`).join(', ')}</td></tr>`; }).join('')}</tbody></table></div>`
    : '<div class="fac-note">Esta plantilla no tiene variables: ningún proceso del sistema la envía.</div>'}
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'lg');
};
W.emCopiar = k => { try{ navigator.clipboard.writeText(`{{${k}}}`); }catch(e){} CC.toast(`Variable {{${k}}} copiada`,'success'); };

/* ---------- Prototipo I-068 (HU-TI-01): notificaciones configurables por módulo ---------- */
const EM_EVENTOS = {VOYAGE:['Creación del viaje','Registro de ETA','Arribo (ATA)','Zarpe (ATD)'], BL:['Generación de CAL/VGM','Generación de CDL','Discrepancia de sellos','Direccionamiento','Aviso de llegada','Zarpe del BL'],
  CUSTOMER_SERVICE:['Suspensión de socio','Levantamiento de suspensión'], CONTAINER_DAMAGE:['Registro de daño'], PDA:['PDA aprobada','PDA observada','Solicitud de adelanto'],
  SETTLEMENT:['Emisión de documento contable','Devolución a Tesorería'], SECURITY:['Solicitud de usuario externo','Aprobación de usuario','Rechazo de usuario','Baja de usuario']};
const EM_SUC = ['Todas','Callao','Paita','Ilo','Mollendo','Pisco','Salaverry'];
const EM_REM = ['notificaciones@empresa.example','operaciones@empresa.example','facturacion@empresa.example'];
const emNotif = d => d.notif || (d.notif = {evento:'', contactos:[], sucursal:'Todas', remitente:EM_REM[0], activo:true});
W.emNot = (k, v, re) => { emNotif(EM.draft)[k] = v; EM.dirty = true; if(re) emBarra(); };
W.emNotCont = (t, on) => { const n = emNotif(EM.draft); n.contactos = on ? [...new Set([...n.contactos, t])] : n.contactos.filter(x=>x!==t); EM.dirty = true; };
W.emInsertar = k => { const ed = $('emCuerpo'); if(!ed || ed.getAttribute('contenteditable')!=='true'){ CC.toast('Presione Editar para insertar variables','info'); return; } ed.focus(); D.execCommand('insertText', false, `{{${k}}}`); W.emUpd('cuerpo', ed.innerHTML); };
const emRelleno = s => String(s||'').replace(/\{\{[#/]?(\w+)\}\}/g, (m,k)=> /\{\{[#/]/.test(m) ? '' : esc((EM_VAR[k]||[k,'['+k+']'])[1]));
W.emVistaPrevia = () => {
  const d = EM.draft, n = emNotif(d);
  CC.modal(`<h3>Vista previa del correo</h3>
    <div class="em-prev"><div class="em-prev-h"><div><b>De:</b> ${esc(n.remitente)}</div><div><b>Para:</b> ${n.contactos.length ? n.contactos.map(c=>`Contactos de ${esc(c)} del cliente`).join(', ') : 'Sin tipo de contacto elegido'}</div>
      <div><b>Sucursal:</b> ${esc(n.sucursal)} · <b>Evento:</b> ${esc(n.evento||'Sin evento')}</div><div><b>Asunto:</b> ${emRelleno(d.asunto)}</div>${d.adjuntos.length?`<div><b>Adjuntos:</b> ${d.adjuntos.map(a=>esc(a.nombre)).join(', ')}</div>`:''}</div>
      <div class="em-prev-b">${emRelleno(d.cuerpo)}</div></div>
    <div class="fac-note">Los valores son ejemplos de cada variable.</div>
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md');
};
function emNotifHtml(d, ed){
  const n = emNotif(d), ro = ed ? '' : 'disabled', evs = EM_EVENTOS[d.mod] || [];
  return `<div ${CC.propuesta('I-068','HU-TI-01 · Notificaciones por módulo','fac-card em-notif')} id="emNotif"><div class="fac-head"><div><h3>Notificación del módulo ${CC.marca('Agrega','HU-TI-01','I-068')}</h3><div class="fac-sub">Cuándo se envía este correo, a quién y desde qué cuenta.</div></div>
    <div class="fac-acts"><button type="button" class="cc-btn" id="emPrevBtn" onclick="emVistaPrevia()">Vista previa</button></div></div>
    <div class="fac-g4">${CC.campo('Módulo', `<input disabled value="${esc(d.mod?emModTxt(d.mod):'Elija el módulo arriba')}">`)}
      ${CC.campo('Evento disparador', CC.selector(evs, n.evento, `id="emEvento" ${ro} onchange="emNot('evento',this.value)"`, evs.length?'Elegir evento':'Sin eventos para el módulo'))}
      ${CC.campo('Sucursal', CC.selector(EM_SUC, n.sucursal, `id="emSucursal" ${ro} onchange="emNot('sucursal',this.value)"`))}
      ${CC.campo('Remitente', CC.selector(EM_REM, n.remitente, `id="emRemitente" ${ro} onchange="emNot('remitente',this.value)"`))}</div>
    <div class="fac-sec">Tipo de contacto que recibe</div>
    <div class="pt-checks">${['Importación','Exportación','Operaciones','Comercial','Facturación','Cobranzas'].map(t=>`<label class="fac-chk"><input type="checkbox" ${ro} ${n.contactos.includes(t)?'checked':''} onchange="emNotCont('${t}',this.checked)"> ${t}</label>`).join('')}</div>
    <div class="fac-sec">Variables de la plantilla</div>
    <div class="em-chips">${d.vars.length ? d.vars.map(([k])=>`<button type="button" class="em-chip" title="Insertar en el cuerpo" onclick="emInsertar('${k}')">${esc((EM_VAR[k]||[k])[0])} <code>{{${k}}}</code></button>`).join('') : '<span class="fac-sub">Esta plantilla no tiene variables.</span>'}</div></div>`;
}
function emDetalle(){
  const d = EM.draft, E = EM.E || {}, ed = EM.modo!=='view', ro = ed ? '' : 'disabled';
  const acts = ed ? '' : `<button type="button" class="cc-btn" onclick="emVariables(true)">Variables disponibles</button><button type="button" class="cc-btn" id="emEditar" onclick="emAbrir(${EM.sel},'edit')">Editar</button><button type="button" class="cc-btn pink" onclick="emEliminar()">Eliminar</button>`;
  return `<div class="fac-card" id="emGen"><div class="fac-head"><h3>Información General</h3><div class="fac-acts">${acts}</div></div>
    <div class="fac-g4">${CC.campo('Nombre *', `<input id="emNombre" maxlength="400" ${ro} value="${esc(d.nombre)}" oninput="emUpd('nombre',this.value)">${err(E,'nombre')}`)}
      ${CC.campo('Módulo *', CC.selector(EM_MOD, d.mod, `id="emModulo" ${ro} onchange="emUpd('mod',this.value,true)"`, 'Elegir Módulo') + err(E,'mod'))}
      ${CC.campo('Asunto *', `<input id="emAsunto" maxlength="500" ${ro} value="${esc(d.asunto)}" oninput="emUpd('asunto',this.value)">${err(E,'asunto')}`)}
      ${CC.campo('Alerta (horas) *', `<input id="emAlerta" type="number" min="0" ${ro} value="${esc(d.alerta)}" oninput="emUpd('alerta',this.value)">${err(E,'alerta')}`)}</div>
    <div class="fac-sec">Cuerpo (HTML) *</div>
    ${ed?`<div class="em-tools"><button type="button" onclick="emCmd('bold')"><b>N</b></button><button type="button" onclick="emCmd('italic')"><i>K</i></button><button type="button" onclick="emCmd('underline')"><u>S</u></button><button type="button" onclick="emCmd('insertUnorderedList')">Lista</button></div>`:''}
    <div class="em-cuerpo${ed?' ed':''}" id="emCuerpo" contenteditable="${ed}" oninput="emUpd('cuerpo',this.innerHTML)">${d.cuerpo}</div>${err(E,'cuerpo')}
    <label class="fac-chk" style="margin-top:12px"><input type="checkbox" id="emAdjDef" ${ro} ${d.adj?'checked':''} onchange="emAdj(this.checked)"> Adjunto por defecto</label>
    <div class="fac-sec">Adjuntos</div>
    ${ed?`<div style="display:flex;gap:8px;margin-bottom:8px"><button type="button" class="cc-btn" onclick="emSubir()">Subir Archivos</button><button type="button" class="cc-btn pink" onclick="emAdjEliminar()">Eliminar</button></div>`:''}
    <div class="fac-scroll"><table class="fac-tbl" id="emAdjTbl"><thead><tr><th style="width:36px"></th><th>Nombre</th><th>Ruta</th><th>Tamaño</th><th>Fecha de carga</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
      ${d.adjuntos.map((a,i)=>`<tr><td><input type="checkbox" data-i="${i}" ${ro}></td><td>${esc(a.nombre)}</td><td>${esc(a.ruta)}</td><td>${esc(a.tam)}</td><td>${CC.fecha(a.fecha)}</td><td>${esc(a.usuario)}</td><td><button type="button" class="fac-link" onclick="emDescargar(${i})">Descargar</button></td></tr>`).join('') || '<tr><td colspan="7" class="fac-empty">No hay adjuntos disponibles</td></tr>'}
    </tbody></table></div></div>
  ${emNotifHtml(d, ed)}
  ${ed?`<div class="fac-btns"><button type="button" class="cc-btn" onclick="emCancelar()">Cancelar</button><button type="button" class="cc-btn" id="emGuardar" onclick="emGuardar()">Guardar</button></div>`:''}`;
}
CC.registrarPantalla({
  id:'screenPlantillaEmail', grupo:'Data Maestra', opcion:'Plantilla Email', titulo:'Buscar Plantilla Email', migas:['Inicio','Plantilla Email','Consulta de Plantilla Email'],
  html: () => EM.view==='detail' ? emDetalle() : filtrosCx({id:'emF', titulo:'Buscar Plantilla Email', hay:emHay(), buscado:EM.buscado, buscar:'emBuscar()', limpiar:'emLimpiar()', cols:2,
      acciones:'<button type="button" class="cc-btn" id="emVarBtn" onclick="emVariables(false)">Variables disponibles</button><button type="button" class="cc-btn" onclick="emNuevo()">Nuevo</button>',
      campos:[CC.campo('Nombre',`<input id="emFNombre" maxlength="30" placeholder="Ingresar nombre" value="${esc(EM.f.nombre)}" oninput="emSet('nombre',this.value)">`),
        CC.campo('Módulo', `<div class="dm-limpiable">${CC.selector(EM_MOD, EM.f.mod, 'id="emFMod" onchange="emSet(\'mod\',this.value)"', 'Elegir Módulo')}${EM.f.mod?'<button type="button" title="Limpiar" onclick="emSet(\'mod\',\'\',1)">×</button>':''}</div>`)]})
    + (EM.buscado ? CC.tablaResultados({id:'emRes', filas:emLista(), pagina:EM.pagina, tam:EM.tam, fnPagina:'emPagina', exportar:'emExportar()', vacio:'No se encontraron resultados con los criterios seleccionados.',
      columnas:[{t:'Nombre', v:t=>`<button type="button" class="fac-link" onclick="emAbrir(${t.id})">${esc(t.nombre)}</button>`},{t:'Módulo', v:t=>esc(emModTxt(t.mod))}]}) : ''),
  alAbrir: () => { EM.view = 'list'; vista('screenPlantillaEmail'); },
  guia:[{t:'Consultar una plantilla', steps:[
    {go:()=>{ if(EM.view!=='list') W.emVolver(); }, el:'#emF', h:'Buscar Plantilla Email', p:'Por nombre o módulo. Variables disponibles muestra las variables de todas las plantillas.'},
    {go:()=>W.emAbrir(1), el:'#emGen', h:'Plantilla', p:'Asunto, cuerpo y adjuntos. Las variables las fija el sistema por plantilla.'},
    {el:'#emNotif', h:'Notificación (propuesta I-068)', p:'Evento, tipo de contacto, sucursal y remitente, con vista previa.'}]}]
});

/* ============================================================
   DASHBOARD como Connect. El Dashboard Operativo v3 (iframe) es propuesta I-067 (HU-OPS-02):
   con "Ver propuestas" apagado se muestra esta vista de Connect.
============================================================ */
const DB = {rango:'hoy'};
const DB_EV = [['aviso','Aviso Llegada'],['desc','Término Descarga'],['aut','Autorización Carga'],['emb','Término Embarque']];
const dbEstado = (i, j) => ['venc','prox','plazo','sin','plazo','prox','plazo','sin'][(i*3+j)%8];
const DB_TXT = {venc:'Vencido / Fuera de Plazo', prox:'Próximo a Vencer', plazo:'En Plazo', sin:'Sin Información'};
function dbFilas(){
  const h = hoyISO(), base = CC.datos.viajes.length ? CC.datos.viajes : [];
  const off = DB.rango==='antes' ? -7 : DB.rango==='despues' ? 7 : 0;
  return base.slice(0, 8).map((v,i)=>{ const eta = sumaDias(h, off + (i%5) - 2);
    return {nave:v.nave, viaje:v.numero, puerto:v.puerto || 'Callao', eta, etd:sumaDias(eta,1), mani:`2026-${String(1200+i*7)}`, ev:DB_EV.map((e,j)=>dbEstado(i,j))}; });
}
W.dbRango = r => { DB.rango = r; CC.refrescar('screenDashboardConnect'); };
function dbHtml(){
  const f = dbFilas(), cuenta = t => f.reduce((a,x)=>a + x.ev.filter(e=>e===t).length, 0), hoy = CC.fecha(hoyISO());
  const punto = e => `<span class="db-pt db-${e}" title="${DB_TXT[e]}"></span>`;
  return `<div class="fac-card" id="dbCab"><div class="fac-head"><div><h3>Vista Operativa de Naves y Eventos Críticos</h3><div class="fac-sub">Seguimiento diario de naves y eventos operativos críticos · Sucursal: Callao</div></div></div>
    <div class="db-rangos">${[['antes','Últimas 2 Semanas'],['hoy',`HOY ${hoy}`],['despues','Próximas 2 Semanas']].map(([k,l])=>`<button type="button" class="${DB.rango===k?'on':''}" onclick="dbRango('${k}')">${l}</button>`).join('')}</div>
    <div class="db-cards"><div class="db-card"><span>Naves Activas Hoy</span><b>${f.length}</b></div><div class="db-card r"><span>Eventos Vencidos</span><b>${cuenta('venc')}</b></div><div class="db-card a"><span>Eventos por Vencer</span><b>${cuenta('prox')}</b></div><div class="db-card v"><span>Eventos en Plazo</span><b>${cuenta('plazo')}</b></div></div></div>
  <div class="fac-card" id="dbEventos"><div class="fac-head"><h3>Eventos Operativos Críticos</h3><div class="db-ley">${Object.entries(DB_TXT).map(([k,t])=>`${punto(k)} ${t}`).join('')}</div></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Nave</th><th>Viaje</th><th>Puerto</th><th>ETA/ATA</th><th>ETD</th><th>N° Manifiesto</th>${DB_EV.map(e=>`<th class="c">${e[1]}</th>`).join('')}</tr></thead><tbody>
    ${f.map(x=>`<tr><td>${esc(x.nave)}</td><td>${esc(x.viaje)}</td><td>${esc(x.puerto)}</td><td>${CC.fecha(x.eta)}</td><td>${CC.fecha(x.etd)}</td><td>${esc(x.mani)}</td>${x.ev.map(e=>`<td class="c">${punto(e)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="10" class="fac-empty">No se encontraron resultados con los criterios seleccionados.</td></tr>'}
    </tbody></table></div></div>`;
}
CC.registrarPantalla({id:'screenDashboardConnect', titulo:'Dashboard', migas:['Inicio','Dashboard'], html:dbHtml,
  guia:[{t:'Dashboard', steps:[{el:'#dbCab', h:'Indicadores', p:'Naves activas y eventos vencidos, por vencer y en plazo.'},{el:'#dbEventos', h:'Eventos', p:'Un punto de color por evento crítico de cada nave.'}]}]});
CC._grupoDe.screenDashboardConnect = 'Dashboard';
const dashV3 = W.openOperationalDashboard;
if(typeof dashV3 === 'function'){
  W.openOperationalDashboard = function(){ if(!CC.verPropuestas){ CC.abrir('screenDashboardConnect'); return; } return dashV3.apply(this, arguments); };
  const sec = $('screenDashboard');
  if(sec && !sec.querySelector('.dm-dash-prop')) sec.insertAdjacentHTML('afterbegin', `<div ${CC.propuesta('I-067','HU-OPS-02 · Dashboard Operativo v3','dm-dash-prop')}></div>`);
  let enDash = false;
  W.addEventListener('cosmos:pda-screen', e => { enDash = e.detail==='screenDashboard'; });
  W.addEventListener('cc:propuestas', e => {
    const act = D.querySelector('section.panel.active')?.id;
    if(!e.detail && (act==='screenDashboard' || enDash)) CC.abrir('screenDashboardConnect');
    else if(e.detail && act==='screenDashboardConnect') dashV3();
  });
}
})();
