/* Módulo: Liquidación
   Se carga desde index.html (ya enlazado; no edites el index).
   Registra aquí las pantallas con CC.registrarPantalla({...}). Guía: docs/CONVENCIONES_v37.md
   Series (Data Maestra > Series): pantalla de Connect, con sus textos. Datos ficticios, solo en memoria. */
(function(){
  'use strict';
  const SUC = ['Callao','Paita','Matarani'];
  const ORIG = ['Documentario','Sobreestadía - Importación','Sobreestadía - Exportación','Provisión'];
  const TIPOS = ['Factura','Boleta','Nota de Crédito','Nota de Cargo','Liquidación de Cobranza'];
  const TIPOS_PROV = ['Aviso','Factura','Boleta'];
  let seq = 1;
  const S = (suc, orig, tipo, codigo, corr, erp) => ({id:seq++, suc, orig, tipo, codigo, corr, erp});
  const E = {
    lista: [
      S('Callao','Documentario','Factura','F005',31017,'SAP-F005'),
      S('Callao','Documentario','Factura','F006',120,'SAP-F006'),
      S('Callao','Documentario','Boleta','B005',13602,'SAP-B005'),
      S('Callao','Documentario','Nota de Crédito','F002',4011,'SAP-F002'),
      S('Callao','Documentario','Liquidación de Cobranza','LC51',10,'SAP-LC51'),
      S('Callao','Provisión','Aviso','PROV',76,'SAP-PROV'),
      S('Callao','Sobreestadía - Importación','Factura','F015',880,'SAP-F015'),
      S('Paita','Documentario','Factura','F007',2210,'SAP-F007')
    ],
    f:{suc:'',orig:'',tipo:'',codigo:'',erp:''}, pagina:1, tam:10, vista:'lista', sel:null, modo:'ver', form:null
  };
  const $ = id => document.getElementById(id);
  const esProv = o => o==='Provisión';
  const filas = () => { const f = E.f, q = x => String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
    return E.lista.filter(s => (!f.suc || s.suc===f.suc) && (!f.orig || s.orig===f.orig) && (!f.tipo || s.tipo===f.tipo) && (!f.codigo || q(s.codigo).includes(q(f.codigo))) && (!f.erp || q(s.erp).includes(q(f.erp)))); };

  /* Lo usa Crear Documento Contable para el diálogo Seleccionar Serie */
  window.lqSeriesPara = (suc, tipo) => E.lista.filter(s => s.suc===suc && !esProv(s.orig) && s.tipo===tipo && s.orig==='Documentario');

  const lista = () => CC.filtros({
      id:'lqSerF', titulo:'Buscar Serie', sub:'Ingrese los criterios de búsqueda para filtrar las series', cols:3,
      acciones:`<button type="button" class="cc-btn" id="lqSerNuevo" onclick="lqSerNuevo()">Nuevo</button>`,
      campos:[
        CC.campo('Sucursal', CC.selector([['','Todos'],...SUC], E.f.suc, 'id="lqSuc"', 'Seleccionar...')),
        CC.campo('Origen de Documento', CC.selector([['','Todos'],...ORIG], E.f.orig, 'id="lqOrig"', 'Seleccionar...')),
        CC.campo('Tipo de Documento', CC.selector([['','Todos'],...TIPOS,...TIPOS_PROV.filter(t=>!TIPOS.includes(t))], E.f.tipo, 'id="lqTipo"', 'Seleccionar...')),
        CC.campo('Código de Serie', `<input id="lqCod" placeholder="Ingresar código de serie" value="${CC.esc(E.f.codigo)}">`),
        CC.campo('Código ERP', `<input id="lqErp" placeholder="Ingresar código ERP" value="${CC.esc(E.f.erp)}">`)
      ], buscar:'lqSerBuscar()', limpiar:'lqSerLimpiar()'})
    + CC.tablaResultados({id:'lqSerRes', filas:filas(), pagina:E.pagina, tam:E.tam, fnPagina:'lqSerPagina',
      columnas:[
        {t:'Código de Serie', v:s => `<button type="button" class="fac-link" onclick="lqSerVer(${s.id})">${CC.esc(s.codigo)}</button>`},
        {t:'Sucursal', k:'suc'}, {t:'Origen de Documento', k:'orig'}, {t:'Tipo de Documento', k:'tipo'},
        {t:'Correlativo', k:'corr'}, {t:'Código ERP', k:'erp'}],
      vacio:'No se encontraron resultados con los criterios seleccionados.'});

  const ficha = () => {
    const x = E.form, ro = E.modo==='ver', dis = ro ? 'disabled' : '', on = k => `onchange="lqSerCampo('${k}',this.value)"`;
    const titulo = E.modo==='nuevo' ? 'Nueva Serie' : E.modo==='editar' ? 'Editar Serie' : 'Ver Serie';
    const btns = ro ? `<button type="button" class="cc-btn pink" id="lqSerEliminar" onclick="lqSerEliminar()">Eliminar</button><button type="button" class="cc-btn" id="lqSerEditar" onclick="lqSerEditar()">Editar</button>`
      : `<button type="button" class="cc-btn pink" onclick="lqSerCancelar()">Cancelar</button><button type="button" class="cc-btn" id="lqSerGuardar" onclick="lqSerGuardar()">Guardar</button>`;
    return `<div class="fac-card" id="lqSerFicha"><div class="fac-head"><div><h3>${titulo}</h3><div class="fac-sub">Información de la serie</div></div><div class="fac-acts">${btns}</div></div>
      <div class="fac-g3">
        ${CC.campo('Sucursal *', CC.selector(SUC, x.suc, `id="lqfSuc" ${dis} ${on('suc')}`, 'Seleccionar...'))}
        ${CC.campo('Origen de Documento *', CC.selector(ORIG, x.orig, `id="lqfOrig" ${dis} ${on('orig')}`, 'Seleccionar...'))}
        ${esProv(x.orig) ? CC.campo('Tipo de Documento de Provisión *', CC.selector(TIPOS_PROV, x.tipo, `id="lqfTipo" ${dis} ${on('tipo')}`, 'Seleccionar...'))
          : CC.campo('Tipo de Documento *', CC.selector(TIPOS, x.tipo, `id="lqfTipo" ${dis} ${on('tipo')}`, 'Seleccionar...'))}
        ${CC.campo('Código de Serie *', `<input id="lqfCod" maxlength="4" ${dis} value="${CC.esc(x.codigo)}" ${on('codigo')}>`)}
        ${CC.campo('Correlativo Actual *', `<input id="lqfCorr" type="number" min="1" ${dis} value="${x.corr}" ${on('corr')}>`)}
        ${CC.campo('Código ERP *', `<input id="lqfErp" maxlength="10" ${dis} value="${CC.esc(x.erp)}" ${on('erp')}>`)}
      </div></div>`;
  };

  const abrirVista = () => { CC.refrescar('screenSeries'); if(E.vista==='ficha'){ const t = E.modo==='nuevo' ? 'Nueva Serie' : E.modo==='editar' ? 'Editar Serie' : 'Ver Serie'; CC.barra(t, ['Inicio','Series',t], 'lqSerVolver()'); } else updatePagebar('screenSeries'); window.scrollTo({top:0}); };
  window.lqSerBuscar = () => { E.f = {suc:$('lqSuc').value, orig:$('lqOrig').value, tipo:$('lqTipo').value, codigo:$('lqCod').value.trim(), erp:$('lqErp').value.trim()}; E.pagina = 1; abrirVista(); if(!filas().length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); };
  window.lqSerLimpiar = () => { E.f = {suc:'',orig:'',tipo:'',codigo:'',erp:''}; E.pagina = 1; abrirVista(); };
  window.lqSerPagina = (p, tam) => { if(tam) E.tam = tam; E.pagina = p; abrirVista(); };
  window.lqSerVolver = () => { E.vista = 'lista'; E.sel = null; abrirVista(); };
  window.lqSerNuevo = () => { E.vista = 'ficha'; E.modo = 'nuevo'; E.sel = null; E.form = {suc:'', orig:'', tipo:'', codigo:'', corr:1, erp:''}; abrirVista(); };
  window.lqSerVer = id => { const s = E.lista.find(x=>x.id===id); if(!s) return; E.vista = 'ficha'; E.modo = 'ver'; E.sel = id; E.form = {...s}; abrirVista(); };
  window.lqSerEditar = () => { E.modo = 'editar'; abrirVista(); };
  window.lqSerCancelar = () => { if(E.modo==='nuevo') lqSerVolver(); else lqSerVer(E.sel); };
  window.lqSerCampo = (k, v) => { E.form[k] = k==='corr' ? Number(v) : v; if(k==='orig') E.form.tipo = ''; if(k==='orig') abrirVista(); };
  window.lqSerGuardar = () => {
    const x = E.form;
    if(!x.suc || !x.orig || !x.tipo || !x.codigo || !x.erp || !(x.corr>=1)){ CC.toast('Por favor complete todos los campos requeridos','error'); return; }
    if(String(x.codigo).length!==4){ CC.toast('El Código de Serie debe tener exactamente 4 caracteres','error'); return; }
    if(E.lista.some(s=>s.id!==E.sel && s.suc===x.suc && s.orig===x.orig && s.tipo===x.tipo)){ CC.toast('Ya existe una serie con la misma rama, origen y tipo.','error'); return; }
    if(E.lista.some(s=>s.id!==E.sel && s.codigo.toUpperCase()===String(x.codigo).toUpperCase())){ CC.toast('Ya existe una serie con el mismo código.','error'); return; }
    x.codigo = String(x.codigo).toUpperCase();
    if(E.modo==='nuevo'){ const s = {...x, id:seq++}; E.lista.push(s); CC.toast('Serie creada exitosamente','success'); lqSerVer(s.id); }
    else { Object.assign(E.lista.find(s=>s.id===E.sel), x); CC.toast('Serie actualizada exitosamente','success'); lqSerVer(E.sel); }
  };
  window.lqSerEliminar = () => CC.modal(`<h3>Eliminar serie</h3><div class="fac-note" style="margin:14px 0">¿Estás seguro de que deseas eliminar esta serie?</div>
    <div class="fac-btns"><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="lqSerEliminarOk" onclick="lqSerEliminarOk()">Eliminar</button></div>`);
  window.lqSerEliminarOk = () => { E.lista = E.lista.filter(s=>s.id!==E.sel); CC.cerrarModal(); CC.toast('Serie eliminada exitosamente','success'); lqSerVolver(); };

  CC.registrarPantalla({
    id:'screenSeries', grupo:'Data Maestra', opcion:'Series',
    titulo:'Búsqueda de Series', migas:['Inicio','Series','Búsqueda de Series'],
    html: () => E.vista==='ficha' ? ficha() : lista(),
    alAbrir: () => { if(E.vista==='ficha'){ E.vista = 'lista'; CC.refrescar('screenSeries'); } updatePagebar('screenSeries'); },
    guia:[{t:'Consultar y mantener series', steps:[
      {go:()=>CC.abrir('screenSeries'), el:'#lqSerF', h:'Buscar Serie', p:'Filtra por sucursal, origen, tipo, código de serie o código ERP.'},
      {go:()=>CC.abrir('screenSeries'), el:'#lqSerRes', h:'Resultados', p:'Clic en el código de serie para verla, editarla o eliminarla.'},
      {go:()=>{ CC.abrir('screenSeries'); lqSerNuevo(); }, el:'#lqSerFicha', h:'Nueva Serie', p:'Código de exactamente 4 caracteres, correlativo desde 1 y código ERP de hasta 10.'}]}]
  });
})();
