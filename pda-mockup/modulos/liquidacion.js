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

/* Pre-registro y Provisiones (propuesta HU-FAC-01 · I-014, definición de Facturación del 22/11/2026).
   Con "Ver propuestas" encendido reemplaza la consulta de Provisiones: barra operativa (Nave, Viaje, ETA, Cotización),
   Filtros avanzados, KPIs y grilla plana "Servicios por liquidar". Apagado, Provisiones se ve como Connect.
   Menú: solo cambia el texto visible (Facturación > Pre-registro y Provisiones / Emisión de Documentos); data-menu y funciones no cambian. */
(function(){
  'use strict';
  const MK = k => typeof fm==='function' ? fm(k, 'HU-FAC-01', 'I-014') : '';
  const PROP = t => `class="cc-prop" data-prop="HU-FAC-01 · I-014 · ${t}"`;
  /* Versión mínima (22/11/2026): la grilla toma los servicios del VIAJE que traen código de PDA.
     Un servicio cotizado que aún no pasó al viaje no está aquí; uno cargado a mano por Operaciones (sin PDA) no entra. */
  const SVC_VIAJE = [
    ['PACIFIC HORIZON','115E','PDA2026000041PECLL',[['TAR-0201',1450],['TAR-0310',700],['TAR-0510',2500],['TAR-0610',540],['TAR-0420',180]]],
    ['PACIFIC HORIZON','115E','PDA2026000063PECLL',[['TAR-0312',360],['TAR-0421',180]]],
    ['PACIFIC HORIZON','115E','',[['TAR-0710',800]]],
    ['BOX ENDURANCE','684','PDA2026000035PECLL',[['TAR-0201',1210],['TAR-0510',1250],['TAR-0312',240]]],
    ['OCEAN MERIDIAN','27N','PDA2026000047PEPAR',[['TAR-0420',180],['TAR-0311',620]]],
    ['REEFER ATLANTIC','31S','PDA2026000044PEPAI',[['TAR-0421',180],['TAR-0510',1250]]]
  ].map(([nave, nro, cot, svcs])=>({nave, nro, cot, svcs}));
  const COTS = SVC_VIAJE.filter(c=>c.cot);
  const FILTROS = () => ({prov:'',num:'',sit:'',cat:'',svc:'',est:'',from:'',to:''});
  const S = window.LQP = {nave:'PACIFIC HORIZON', viaje:'115E', cot:'', adv:false, f:FILTROS(), ok:true, page:1, size:10};
  const naves = () => [...new Set(facVoys().map(v=>v.nave))];
  const cotsDe = (nave, nro) => COTS.filter(c=>c.nave===nave && c.nro===nro).sort((a,b)=>a.cot.localeCompare(b.cot));
  const etaTxt = v => v && v.eta ? fmtDate(v.eta) : 'Sin ETA registrado';
  /* Provisión vigente del servicio: la última no anulada ni canjeada con la misma nave, viaje y servicio */
  const provDe = (nave, nro, svc) => FP.list.filter(p=>p.status!=='ANULADO' && !p.linked && p.lines.some(l=>l.nave===nave && l.nro===nro && l.svc===svc)).sort((a,b)=>b.id-a.id)[0] || null;
  /* Ejemplo: remolcaje de PACIFIC HORIZON ya pre-registrado como Provisional (sin documento del proveedor) */
  function semilla(){
    if(!FP.list.length) fpSeed();
    if(FP.list.some(p=>p.id===70)) return;
    const t = FAC_TARIFFS.find(x=>x.code==='TAR-0510'), v = facVoy('PACIFIC HORIZON','115E');
    const p = fpNew({id:70, code:'PRV00000000070', prov:t.prov, sit:'Provisional', docType:'Aviso', docSerie:'PROV', docNum:'0000000070', docDate:'2026-09-06', recDate:'2026-09-06', payDate:'2026-10-06',
      desc:'Servicios de PDA2026000041PECLL', lines:[fpMkLine(t, v.nave, v.nro, v.cliente, 'Reembolsable', 2, v.eta)]});
    p.hist = [{ts:'2026-09-06T09:00:00', user:'P. Díaz (Facturación)', prev:'SIN PROVISIÓN', next:'PROVISIONADO', comment:'Pre-registro desde Servicios por liquidar'}];
    FP.list.unshift(p);
  }
  window.lqpGuiaCanje = () => { semilla(); fpOpen(70); };
  window.lqpReset = () => Object.assign(S, {nave:'PACIFIC HORIZON', viaje:'115E', cot:'', adv:false, f:FILTROS(), ok:true, page:1});
  function filas(){
    semilla();
    const out = [];
    cotsDe(S.nave, S.viaje).filter(c=>!S.cot || c.cot===S.cot).forEach(c=>c.svcs.forEach(([code, imp])=>{
      const t = FAC_TARIFFS.find(x=>x.code===code) || {}, p = provDe(c.nave, c.nro, t.svc);
      out.push({c, t, imp, p, est:p ? fpStL(p.status) : 'Por liquidar', doc:p && p.sit==='Original' && p.docNum ? `${p.docSerie}-${p.docNum}` : 'Pendiente'});
    }));
    const f = S.f, q = x=>normTxt(x||'');
    /* Mismos filtros de Connect; Rango de Fechas como hoy en Connect */
    return out.filter(r=>(!f.prov || q(r.t.prov).includes(q(f.prov)))
      && (!f.num || (r.p && q(r.p.code).includes(q(f.num))))
      && (!f.sit || (r.p && r.p.sit===f.sit))
      && (!f.cat || r.t.cat===f.cat) && (!f.svc || r.t.svc===f.svc)
      && (!f.est || r.est===f.est)
      && (!f.from || (r.p && (r.p.docDate||'')>=f.from)) && (!f.to || (r.p && (r.p.docDate||'')<=f.to)));
  }
  const tono = e => e==='Por liquidar' ? 'lqp-naranja' : /PROVISIONADO|LIQUIDADO|CANJEADO/.test(e) ? 'lqp-verde' : /ERROR/.test(e) ? 'lqp-rojo' : 'lqp-gris';
  const cotTxt = c => c.cot;
  window.lqpRender = function(){
    const root = document.getElementById('fpRoot'); if(!root) return;
    facSetBar('screenProvisions','Pre-registro y Provisiones',['Inicio','Facturación','Pre-registro y Provisiones']);
    const v = facVoys().find(x=>x.nave===S.nave && x.nro===S.viaje), vs = facVoys().filter(x=>x.nave===S.nave), cs = cotsDe(S.nave, S.viaje);
    const rows = S.ok ? filas() : [], pend = rows.filter(r=>!r.p).length, f = S.f;
    const estados = ['Por liquidar', ...fpStOpts().map(o=>Array.isArray(o)?o[1]:o).filter(x=>!/SIN PROVISI|PENDIENTE/.test(x))];
    const cotSel = cs.length>=2
      ? fSel(cs.map(c=>[c.cot, cotTxt(c)]), S.cot, `id="lqpCot" onchange="lqpSet('cot',this.value)"`, `Todas las cotizaciones (${cs.length})`)
      : fSel(cs.map(c=>[c.cot, cotTxt(c)]), cs[0] ? cs[0].cot : '', `id="lqpCot" ${cs.length?'':'disabled'} onchange="lqpSet('cot',this.value)"`, cs.length ? null : 'Sin cotizaciones');
    const pag = rows.slice((S.page-1)*S.size, S.page*S.size);
    root.innerHTML = `
    <div class="fac-acts" style="justify-content:flex-end;margin-bottom:12px">${fChgBtn()}</div>
    <div class="fac-card" id="lqpBar">
      <h3>Pre-registro y Provisiones ${MK('Modifica: título, barra operativa y Consultar')}</h3>
      <div class="lqp-bar" ${PROP('Barra operativa')}>
        ${fF('Nave', `<input id="lqpNave" list="lqpNaves" placeholder="Buscar nave" value="${esc(S.nave)}" onchange="lqpSet('nave',this.value)"><datalist id="lqpNaves">${naves().map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>`)}
        ${fF('N° Viaje / Escala', fSel(vs.map(x=>x.nro), S.viaje, `id="lqpViaje" ${vs.length?'':'disabled'} onchange="lqpSet('viaje',this.value)"`, vs.length?'Elegir un viaje':'Elige una nave'))}
        ${fF('ETA operativo', `<input id="lqpEta" readonly tabindex="-1" class="${v && v.eta?'':'lqp-sineta'}" value="${esc(S.viaje ? etaTxt(v) : '')}" placeholder="DD/MM/AAAA">`)}
        ${fF('N° de Cotización / PDA / OS', cotSel)}
        <div class="lqp-go"><button type="button" class="cc-btn" id="lqpConsultar" onclick="lqpConsultar()">Consultar</button></div>
      </div>
      <button type="button" class="lqp-adv-btn" id="lqpAdvBtn" aria-expanded="${S.adv}" onclick="lqpAdv()"><span>${S.adv?'▲':'▼'}</span> Filtros avanzados</button>
      ${S.adv ? `<div class="lqp-adv" id="lqpAdv" ${PROP('Filtros avanzados')}>
        ${fF('Proveedor', `<input id="lqpProv" list="lqpProvs" placeholder="RUC / Razón Social" value="${esc(f.prov)}" onchange="lqpF('prov',this.value)"><datalist id="lqpProvs">${FAC_PROVS.map(p=>`<option value="${esc(p)}"></option>`).join('')}</datalist>`)}
        ${fF('N° Provisión', `<input id="lqpNum" placeholder="PRV00000000071" value="${esc(f.num)}" onchange="lqpF('num',this.value)">`)}
        ${fF('Situación', fSel(['Provisional','Original'], f.sit, `id="lqpSit" onchange="lqpF('sit',this.value)"`, 'Elegir una situación'))}
        ${fF('Categoría', fSel(FAC_CATS, f.cat, `id="lqpCat" onchange="lqpF('cat',this.value)"`, 'Elegir una categoría'))}
        ${fF('Servicios', fSel([...new Set(FAC_TARIFFS.filter(t=>!f.cat || t.cat===f.cat).map(t=>t.svc))], f.svc, `id="lqpSvc" onchange="lqpF('svc',this.value)"`, 'Elegir un servicio comercial'))}
        ${fF('Estado', fSel(estados, f.est, `id="lqpEst" onchange="lqpF('est',this.value)"`, 'Todos'))}
        ${fF('Rango de Fechas', `<div class="fac-range"><input type="date" id="lqpFrom" value="${f.from}" onchange="lqpF('from',this.value)"><input type="date" id="lqpTo" value="${f.to}" onchange="lqpF('to',this.value)"></div>`)}
        <div class="lqp-go"><button type="button" class="cc-btn pink" onclick="lqpLimpiar()">Limpiar</button></div>
      </div>` : ''}
    </div>
    ${S.ok ? `<div class="lqp-kpis" id="lqpKpis" ${PROP('Resumen de control')}>
      <div class="lqp-kpi"><span>Total servicios cotizados</span><b>${rows.length}</b></div>
      <div class="lqp-kpi lqp-naranja"><span>Pendientes de pre-registro</span><b>${pend}</b></div>
      <div class="lqp-kpi lqp-verde"><span>Pre-registrados / Provisionados</span><b>${rows.length-pend}</b></div>
    </div>
    <div class="fac-card" style="padding:0" id="lqpRes">
      <div class="fac-head" style="padding:20px 26px;margin:0 0 18px;border-bottom:1px solid var(--cx-line2)"><h3>Servicios por liquidar (${rows.length}) ${MK('Modifica: grilla plana por cotización')}</h3></div>
      <div id="lqpOrigen" ${CC.propuesta('HU-FAC-01 · I-014','Origen de la grilla','lqp-nota')} style="margin:-6px 26px 14px">Muestra los servicios del viaje con código de PDA. Lo cotizado que aún no pasa al viaje no aparece.</div>
      <div style="padding:0 26px 26px"><div class="fac-scroll" style="max-height:none"><table class="fac-tbl lqp-tbl"><thead><tr><th>N° Cotización</th><th>Servicio Cotizado</th><th>Proveedor Asignado / Estimado</th><th class="num">Importe Cotizado</th><th>N° Doc. Tercero</th><th>Estado Liquidación</th><th>Acción</th></tr></thead><tbody>
        ${pag.map(r=>`<tr><td class="lqp-nw">${esc(r.c.cot)}</td><td>${esc(r.t.svc)}</td><td>${esc(r.t.prov)}</td><td class="num lqp-nw">USD ${fMoney(r.imp)}</td><td class="lqp-nw">${esc(r.doc)}</td>
          <td class="lqp-nw"><span class="lqp-est ${tono(r.est)}">● ${esc(r.est)}</span></td>
          <td class="lqp-nw">${r.p ? `<button type="button" class="fac-link" onclick="fpOpen(${r.p.id})">Ver Doc</button>` : `<button type="button" class="cc-btn lqp-pre" onclick="lqpPre('${r.c.cot}','${r.t.code}')">+ Pre-registrar</button>`}</td></tr>`).join('')
          || '<tr><td colspan="7" class="fac-empty">No se encontraron servicios cotizados con los criterios seleccionados</td></tr>'}
      </tbody></table></div>
      <div class="cc-pager">${pagerHtml(rows.length, S.page, S.size, 'lqpGo')}</div></div>
    </div>` : ''}
    <div id="fpI175" ${CC.propuesta('Sin HU · I-175','Comisiones a proveedores: por definir','lqp-nota')} style="margin-top:14px">Por definir · Comisiones a proveedores: cálculo, registro y liquidación sin reglas aprobadas. No es parte de esta pantalla.</div>`;
  };
  window.lqpSet = (k, val) => {
    if(k==='nave'){ S.nave = val; const vs = facVoys().filter(x=>x.nave===val); S.viaje = vs.length===1 ? vs[0].nro : ''; S.cot = ''; S.ok = false; }
    if(k==='viaje'){ S.viaje = val; S.cot = ''; S.ok = false; }
    if(k==='cot') S.cot = val;
    lqpRender();
  };
  window.lqpF = (k, val) => { S.f[k] = val; S.page = 1; lqpRender(); };
  window.lqpAdv = () => { S.adv = !S.adv; lqpRender(); };
  window.lqpLimpiar = () => { S.f = FILTROS(); S.page = 1; lqpRender(); };
  window.lqpGo = (p, size) => { if(size) S.size = size; S.page = p || 1; lqpRender(); };
  window.lqpConsultar = () => {
    if(!S.nave || !S.viaje){ toast('Elige Nave y N° Viaje / Escala','error'); return; }
    S.ok = true; S.page = 1; lqpRender();
    if(!filas().length) toast('No se encontraron resultados con los criterios seleccionados','info');
  };
  /* + Pre-registrar: abre Crear Provisión (registro existente) con el servicio cotizado precargado */
  window.lqpPre = (cot, code) => {
    const t = FAC_TARIFFS.find(x=>x.code===code), v = facVoy(S.nave, S.viaje), hoy = new Date().toISOString().slice(0,10);
    if(!t) return;
    FP.draft = fpNew({id:0, prov:t.prov, docType:'Aviso', docSerie:'PROV', docNum:String(FP.nextPrv).padStart(10,'0'), docDate:hoy, recDate:hoy, payDate:hoy,
      desc:`Servicios de ${cot}`, lines:[fpMkLine(t, v.nave, v.nro, v.cliente, 'Reembolsable', 1, v.eta)], picked:[]});
    fpOpen(0);
  };

  /* Menú: con propuestas encendido cambia solo el texto visible; data-menu, opciones y funciones quedan igual */
  const RENOMBRA = {'Liquidación':['Facturación','HU-FAC-01 · I-014'], 'Provisiones':['Pre-registro y Provisiones','HU-FAC-01 · I-014'], 'Documentos Contables':['Emisión de Documentos','HU-FAC-02 · I-042']};
  function envolver(btn, viejo){
    if(!btn || btn.querySelector('.lqp-cx')) return;
    const n = [...btn.childNodes].find(x=>x.nodeType===3 && x.textContent.trim()===viejo); if(!n) return;
    const [nuevo, tk] = RENOMBRA[viejo], s = document.createElement('span');
    s.className = 'lqp-txt';
    s.innerHTML = `<span class="lqp-cx">${viejo}</span><span class="lqp-pr" title="Modifica · ${tk}">${nuevo}</span>`;
    btn.replaceChild(s, n);
  }
  function menu(){
    envolver(document.querySelector('#ccMenu button[data-menu="Liquidación"]'), 'Liquidación');
    const dd = document.getElementById('ccDropdown');
    if(dd && dd.dataset.menu==='Liquidación') dd.querySelectorAll('button[data-cc-op]').forEach(b=>{ envolver(b,'Provisiones'); envolver(b,'Documentos Contables'); });
  }
  function enlazar(){
    menu();
    ['ccMenu','ccDropdown'].forEach(id=>{ const el = document.getElementById(id); if(el && !el.dataset.lqp){ el.dataset.lqp = '1'; new MutationObserver(menu).observe(el, {childList:true}); } });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', enlazar); else setTimeout(enlazar, 0);
  window.addEventListener('load', enlazar);
})();
