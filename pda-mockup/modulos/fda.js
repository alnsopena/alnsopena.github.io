/* FDA: cuenta final de escala con adendas y comparación contra la PDA.
   Propuesta HU-COM-06 · I-202 (no existe en Connect). Todo en memoria y con datos ficticios.
   - Menú PDA > FDA: búsqueda de FDA.
   - Ver PDA aprobada: botón "Generar FDA" o "Ver FDA" (la PDA no cambia).
   - Detalle: cabecera, comparación PDA vs FDA, profit, adendas, envío (PDF) y cierre, historial. */
(function(){
  'use strict';
  const W = window, D = document;
  const T = 'HU-COM-06 · I-202';
  const ID = 'screenFda';
  const P = (texto, clases) => CC.propuesta(T, texto, clases);
  const esc = x => CC.esc(x);
  const r2 = n => Math.round((Number(n)||0)*100)/100;
  const dinero = n => CC.dinero(n);
  const hoyIso = () => new Date().toISOString();
  const ESTADOS = ['Abierta','Enviada','Cerrada'];
  const TONO = {Abierta:'pendiente', Enviada:'aprobada', Cerrada:'anulada', Pendiente:'pendiente', Aprobada:'aprobada'};
  const chip = e => CC.chipEstado(e, TONO[e]);

  /* Time-bar: días desde el zarpe; 90 por defecto, ajustable por cliente */
  const TB_DEF = 90;
  const TB_CLIENTE = {'Andina Tankers Ltd.':60, 'Southern Bulk Carriers':60};
  const tbDias = c => TB_CLIENTE[c] || TB_DEF;
  const masDias = (iso, d) => { const x = new Date(String(iso).slice(0,10)+'T12:00:00'); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };
  const tbFecha = f => f.zarpe ? masDias(f.zarpe, f.dias) : '';
  const tbFalta = f => { if(!f.zarpe) return null; const h = new Date(); h.setHours(12,0,0,0); return Math.round((new Date(tbFecha(f)+'T12:00:00') - h)/864e5); };
  const tbAviso = f => { const n = tbFalta(f); if(n===null || f.estado==='Cerrada') return ''; if(n<0) return `<span class="fda-aviso venc">Vencido</span>`; return n<=30 ? `<span class="fda-aviso">Vence en ${n} día${n===1?'':'s'}</span>` : ''; };

  /* ---------- Líneas e importes ---------- */
  let nId = 1;
  const L = (svc, cantP, tarP, cantF, tarF, margen, origen) => ({id:'l'+(nId++), svc, cantP, tarP, cantF, tarF,
    costoU:r2((tarP||tarF)*(1-(margen==null?0.15:margen))), origen:origen||'PDA'});
  const impP = l => r2(l.cantP*l.tarP), impF = l => r2(l.cantF*l.tarF);
  const costoP = l => r2(l.cantP*l.costoU), costoF = l => r2(l.cantF*l.costoU);
  const sum = (f, fn) => r2(f.lineas.reduce((a,l)=>a+fn(l),0));
  const totP = f => sum(f, impP), totF = f => sum(f, impF);
  const profP = f => r2(totP(f) - sum(f, costoP)), profF = f => r2(totF(f) - sum(f, costoF));
  const signo = n => (n>0?'+':'') + dinero(n);
  const difHtml = n => `<span class="fda-dif ${n>0?'up':n<0?'down':''}">${n ? signo(n) : '0.00'}</span>`;

  /* ---------- Datos ficticios (escalas anteriores, coherentes con el reporte de cuentas de escala) ---------- */
  const H = (ts, user, prev, next, comment) => ({ts, user, prev, next, comment});
  const AD = (id, tipo, linea, svc, antes, despues, motivo, por, ts, apr) => ({id, tipo, linea, svc, antes, despues, motivo, por, ts,
    estado:apr ? 'Aprobada' : 'Pendiente', aprPor:apr ? apr[0] : '', aprTs:apr ? apr[1] : ''});
  const FDAS = [];
  (function semilla(){
    const a = [L('Uso de amarradero',1,13906.55,1,13906.55), L('Practicaje entrada/salida',2,1450,3,1450), L('Remolcaje entrada/salida',4,1980,4,1980),
      L('Ayudas a la navegación',1,3118.20,1,3118.20,0.05), L('Amarre y desamarre',2,850,2,850), L('Comisión de agencia',1,4500,1,4500,1),
      L('Lancha para práctico',2,380,2,380), L('Suministro de agua dulce',0,0,1,1950,0.15,'Adenda')];
    FDAS.push({codigo:'FDA2026000097PEMRI', pda:'PDA2026000371PEMRI', nave:'ATLANTIC CONDOR', viaje:'021E', puerto:'Matarani', cliente:'Altiplano Ores Trading',
      eta:'2026-10-31', zarpe:'2026-11-03', moneda:'USD', estado:'Abierta', envio:'', creado:'2026-11-03T18:20:00', vy:'', lineas:a,
      adendas:[AD('a1','Cambio de cantidad',a[1].id,a[1].svc,'2','3','Maniobra adicional por cambio de muelle','G. Zapata (Operaciones)','2026-11-04T09:15:00',['A. Pérez (Comercial)','2026-11-04T11:40:00']),
        AD('a2','Servicio nuevo',a[7].id,a[7].svc,'','1 × 1,950.00','Pedido del capitán durante la escala','M. Rojas (Agenciamiento)','2026-11-04T10:05:00',['A. Pérez (Comercial)','2026-11-04T11:42:00']),
        AD('a3','Servicio nuevo','','Recojo de residuos sólidos','','1 × 620.00','Retiro de residuos solicitado por la nave al zarpar','M. Rojas (Agenciamiento)','2026-11-05T08:30:00',null)],
      hist:[H('2026-11-03T18:20:00','A. Pérez (Comercial)','','Abierta','FDA generada desde la PDA2026000371PEMRI')]});
    const b = [L('Uso de amarradero',1,3240.10,1,3240.10), L('Practicaje entrada/salida',2,1250,2,1250), L('Remolcaje entrada/salida',2,1050,2,1190),
      L('Amarre y desamarre',2,450,2,450), L('Comisión de agencia',1,850,1,850,1)];
    FDAS.push({codigo:'FDA2026000081PEILQ', pda:'PDA2026000352PEILQ', nave:'SOL DE ILO', viaje:'088S', puerto:'Ilo', cliente:'Andina Tankers Ltd.',
      eta:'2026-10-12', zarpe:'2026-10-14', moneda:'USD', estado:'Enviada', envio:'2026-10-20T16:10:00', creado:'2026-10-14T19:00:00', vy:'', lineas:b,
      adendas:[AD('a1','Cambio de tarifa',b[2].id,b[2].svc,'1,050.00','1,190.00','El proveedor aplicó la tarifa vigente desde octubre','J. Ramírez (Comercial)','2026-10-16T10:20:00',['L. Fernández (Gerencia)','2026-10-16T15:00:00'])],
      hist:[H('2026-10-14T19:00:00','J. Ramírez (Comercial)','','Abierta','FDA generada desde la PDA2026000352PEILQ'), H('2026-10-20T16:10:00','J. Ramírez (Comercial)','Abierta','Enviada','PDF de la FDA enviado al cliente')]});
    const c = [L('Uso de amarradero',1,18400,1,18400), L('Practicaje entrada/salida',2,5600,2,5600), L('Remolcaje entrada/salida',4,4850,4,4850),
      L('Vigilancia de nave',0,0,1,3250,0.15,'Adenda'), L('Amarre y desamarre',2,1500,2,1500), L('Comisión de agencia',1,6000,1,6000,1)];
    FDAS.push({codigo:'FDA2026000079PESVY', pda:'PDA2026000349PESVY', nave:'CORAL BAY', viaje:'310N', puerto:'Salaverry', cliente:'Southern Bulk Carriers',
      eta:'2026-10-06', zarpe:'2026-10-09', moneda:'PEN', estado:'Enviada', envio:'2026-10-16T12:30:00', creado:'2026-10-09T20:15:00', vy:'', lineas:c,
      adendas:[AD('a1','Servicio nuevo',c[3].id,c[3].svc,'','1 × 3,250.00','Vigilancia requerida por la autoridad portuaria','G. Zapata (Operaciones)','2026-10-08T07:50:00',['A. Pérez (Comercial)','2026-10-08T09:10:00'])],
      hist:[H('2026-10-09T20:15:00','A. Pérez (Comercial)','','Abierta','FDA generada desde la PDA2026000349PESVY'), H('2026-10-16T12:30:00','A. Pérez (Comercial)','Abierta','Enviada','PDF de la FDA enviado al cliente')]});
    const d = [L('Uso de amarradero',1,8915.60,1,8915.60), L('Practicaje entrada/salida',2,1380,2,1380), L('Remolcaje entrada/salida',4,1560,4,1560),
      L('Ayudas a la navegación',1,2400,1,2400,0.05), L('Amarre y desamarre',2,600,2,600), L('Lancha para práctico',2,400,3,400), L('Comisión de agencia',1,4600,1,4600,1)];
    FDAS.push({codigo:'FDA2026000088PECLL', pda:'PDA2026000360PECLL', nave:'PACIFIC TERN', viaje:'201N', puerto:'Callao', cliente:'Pacific Gas Shipping',
      eta:'2026-10-18', zarpe:'2026-10-20', moneda:'USD', estado:'Cerrada', envio:'2026-10-24T11:00:00', creado:'2026-10-20T21:00:00', vy:'', lineas:d,
      adendas:[AD('a1','Cambio de cantidad',d[5].id,d[5].svc,'2','3','Lancha adicional por relevo de práctico','G. Zapata (Operaciones)','2026-10-19T22:40:00',['A. Pérez (Comercial)','2026-10-20T08:15:00'])],
      hist:[H('2026-10-20T21:00:00','A. Pérez (Comercial)','','Abierta','FDA generada desde la PDA2026000360PECLL'), H('2026-10-24T11:00:00','A. Pérez (Comercial)','Abierta','Enviada','PDF de la FDA enviado al cliente'),
        H('2026-11-12T17:45:00','L. Fernández (Gerencia)','Enviada','Cerrada','Cuenta de la escala cerrada')]});
    FDAS.forEach(f=>f.dias = tbDias(f.cliente));
  })();
  W.FDA_LISTA = FDAS;                       // lectura para pruebas
  const porCodigo = c => FDAS.find(f=>f.codigo===c);
  const dePda = c => FDAS.find(f=>f.pda===c);

  /* ---------- Estado del módulo ---------- */
  const VACIO = {codigo:'', nave:'', viaje:'', cliente:'', estado:''};
  const E = {vista:'lista', f:{...VACIO}, ap:{...VACIO}, pagina:1, tam:10, sel:null, tab:'comp', desde:'', ad:null};
  const nrm = x => W.normTxt ? W.normTxt(x) : String(x||'').toLowerCase();
  const filtradas = () => FDAS.filter(f=>{ const a = E.ap;
    return (!a.codigo || nrm(f.codigo).includes(nrm(a.codigo)) || nrm(f.pda).includes(nrm(a.codigo)))
      && (!a.nave || nrm(f.nave).includes(nrm(a.nave))) && (!a.viaje || nrm(f.viaje).includes(nrm(a.viaje)))
      && (!a.cliente || f.cliente===a.cliente) && (!a.estado || f.estado===a.estado); });

  /* ---------- Búsqueda ---------- */
  const lista = () => {
    const clientes = [...new Set(FDAS.map(f=>f.cliente))].sort();
    return CC.filtros({id:'fdaF', titulo:`Buscar FDA ${CC.etiquetaPropuesta(T,'Pantalla nueva')}`, cols:3, buscar:'fdaBuscar()', limpiar:'fdaLimpiar()', campos:[
        CC.campo('Código FDA', `<input id="fdaFCod" placeholder="Ingrese código FDA o PDA" value="${esc(E.f.codigo)}" oninput="fdaSet('codigo',this.value)">`),
        CC.campo('Nombre de Nave', `<input id="fdaFNave" placeholder="Ingrese nombre de nave" value="${esc(E.f.nave)}" oninput="fdaSet('nave',this.value)">`),
        CC.campo('Viaje', `<input id="fdaFViaje" placeholder="Ingrese número de viaje" value="${esc(E.f.viaje)}" oninput="fdaSet('viaje',this.value)">`),
        CC.campo('Cliente', CC.selector(clientes, E.f.cliente, `id="fdaFCli" onchange="fdaSet('cliente',this.value)"`, 'Todos')),
        CC.campo('Estado', CC.selector(ESTADOS, E.f.estado, `id="fdaFEst" onchange="fdaSet('estado',this.value)"`, 'Todos'))]})
      + `<div class="fda-list">` + CC.tablaResultados({id:'fdaRes', filas:filtradas(), pagina:E.pagina, tam:E.tam, fnPagina:'fdaPagina', exportar:'fdaExportar()',
        columnas:[
          {t:'Código FDA', v:f=>`<button type="button" class="fac-link fda-cod" onclick="fdaVer('${f.codigo}')">${esc(f.codigo)}</button>`},
          {t:'PDA de origen', v:f=>`<span class="fda-cod">${esc(f.pda)}</span>`},
          {t:'Nave', k:'nave'}, {t:'Viaje', k:'viaje'}, {t:'Puerto', k:'puerto'}, {t:'Cliente', k:'cliente'},
          {t:'Zarpe', v:f=>CC.fecha(f.zarpe)},
          {t:'Total', v:f=>`<span class="fda-n">${dinero(totF(f))}</span>`}, {t:'Moneda', k:'moneda'},
          {t:'Estado', v:f=>chip(f.estado)},
          {t:'Time-bar', v:f=>`<div class="fda-tb">${CC.fecha(tbFecha(f))}${tbAviso(f)}</div>`}]}) + `</div>`;
  };
  W.fdaSet = (k, v) => { E.f[k] = v; };
  W.fdaBuscar = () => { E.ap = {...E.f}; E.pagina = 1; pintar(); };
  W.fdaLimpiar = () => { E.f = {...VACIO}; E.ap = {...VACIO}; E.pagina = 1; pintar(); };
  W.fdaPagina = (p, tam) => { if(tam) E.tam = tam; E.pagina = p; pintar(); };
  W.fdaExportar = () => CC.exportarExcel('FDA', 'FDA', ['Código FDA','PDA de origen','Nave','Viaje','Puerto','Cliente','Zarpe','Total','Moneda','Estado','Fecha de envío','Time-bar'],
    filtradas().map(f=>[f.codigo, f.pda, f.nave, f.viaje, f.puerto, f.cliente, CC.fecha(f.zarpe), totF(f), f.moneda, f.estado, f.envio?CC.fecha(f.envio):'', CC.fecha(tbFecha(f))]));

  /* ---------- Detalle ---------- */
  const lineaDe = (f, id) => f.lineas.find(l=>l.id===id);
  const tabComp = f => {
    const tp = totP(f), tf = totF(f), pp = profP(f), pf = profF(f);
    const pct = (p, t) => t ? ` (${(p/t*100).toFixed(1)}%)` : '';
    const filas = f.lineas.map(l=>`<tr><td>${esc(l.svc)}${l.origen==='Adenda'?` <span class="fda-tag">Adenda</span>`:''}</td>
      <td class="fda-n">${l.cantP||'-'}</td><td class="fda-n">${l.cantP?dinero(l.tarP):'-'}</td><td class="fda-n">${dinero(impP(l))}</td>
      <td class="fda-n">${l.cantF}</td><td class="fda-n">${dinero(l.tarF)}</td><td class="fda-n"><b>${dinero(impF(l))}</b></td><td class="fda-n">${difHtml(r2(impF(l)-impP(l)))}</td></tr>`).join('');
    return `<div class="fda-kpis">
        <div><span>Total PDA (estimado)</span><b>${f.moneda} ${dinero(tp)}</b></div>
        <div><span>Total FDA (final)</span><b>${f.moneda} ${dinero(tf)}</b></div>
        <div><span>Profit inicial</span><b>${f.moneda} ${dinero(pp)}</b><i>${pct(pp,tp)}</i></div>
        <div><span>Profit final</span><b>${f.moneda} ${dinero(pf)}</b><i>${pct(pf,tf)} · ${signo(r2(pf-pp))}</i></div></div>
      <div class="fac-scroll"><table class="fac-tbl fda-comp"><thead><tr><th>Servicio</th><th class="fda-n">Cant. PDA</th><th class="fda-n">Tarifa PDA</th><th class="fda-n">PDA estimado</th>
        <th class="fda-n">Cant. FDA</th><th class="fda-n">Tarifa FDA</th><th class="fda-n">FDA final</th><th class="fda-n">Diferencia</th></tr></thead>
        <tbody>${filas}<tr class="fda-tot"><td>Total ${f.moneda}</td><td></td><td></td><td class="fda-n">${dinero(tp)}</td><td></td><td></td><td class="fda-n">${dinero(tf)}</td><td class="fda-n">${difHtml(r2(tf-tp))}</td></tr></tbody></table></div>
      <div class="fac-note">La PDA aprobada queda como línea base y no se modifica. Lo final cambia solo con adendas aprobadas.</div>`;
  };
  const tabAdendas = f => {
    const puede = f.estado!=='Cerrada';
    const filas = f.adendas.map(a=>`<tr><td>${esc(a.tipo)}</td><td>${esc(a.svc)}</td><td class="fda-cambio">${a.antes?esc(a.antes)+' → ':''}${esc(a.despues)}</td><td class="fda-mot">${esc(a.motivo)}</td>
      <td>${esc(a.por)}<div class="fda-sub">${W.vyFmt ? W.vyFmt(a.ts) : CC.fecha(a.ts)}</div></td><td>${chip(a.estado)}${a.aprPor?`<div class="fda-sub">${esc(a.aprPor)}</div><div class="fda-sub">${W.vyFmt ? W.vyFmt(a.aprTs) : CC.fecha(a.aprTs)}</div>`:''}</td>
      <td>${a.estado==='Pendiente' && puede ? `<button type="button" class="cc-btn" onclick="fdaAprobar('${a.id}')">Aprobar</button>` : ''}</td></tr>`).join('');
    return `<div class="fda-adhead"><div class="fac-sub">Servicio nuevo, o cambio de cantidad o tarifa. La adenda aprobada pasa a los servicios operativos del viaje para que Agenciamiento confirme la ejecución.</div>
        ${puede?`<button type="button" class="cc-btn" onclick="fdaNuevaAdenda()">Agregar adenda</button>`:''}</div>
      <div class="fac-scroll"><table class="fac-tbl fda-ad"><thead><tr><th>Tipo</th><th>Servicio</th><th>Cambio</th><th>Motivo</th><th>Registrada por</th><th>Estado</th><th>Acción</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="7" class="fac-empty">Sin adendas registradas.</td></tr>'}</tbody></table></div>`;
  };
  const detalle = () => {
    const f = porCodigo(E.sel); if(!f) return '';
    const pend = f.adendas.filter(a=>a.estado==='Pendiente').length;
    const tb = tbFecha(f);
    const btns = (f.estado!=='Cerrada' ? `<button type="button" class="cc-btn" onclick="fdaEnviar()">Enviar FDA</button>` : '')
      + (f.estado==='Enviada' ? `<button type="button" class="cc-btn" ${pend?'disabled title="Aprueba antes las adendas pendientes"':''} onclick="fdaCerrar()">Cerrar FDA</button>` : '')
      + `<button type="button" class="cc-btn" onclick="fdaHistorial()">Historial</button>`;
    const pdaLink = `<button type="button" class="fac-link fda-cod" onclick="fdaAbrirPda('${f.pda}')">${esc(f.pda)}</button>`;
    return `<div class="fac-card fda-det"><div class="fac-head md-cardhead"><div><h3 class="md-h">${esc(f.codigo)} ${CC.etiquetaPropuesta(T,'Cuenta final de escala')}</h3>
        <div class="fac-sub">${esc(f.nave)} · Viaje ${esc(f.viaje)} · ${esc(f.puerto)}</div></div><div class="fac-acts md-actions">${btns}</div></div>
      <div class="fac-g4 fda-cab">
        ${CC.campoLectura('Código FDA', f.codigo)}${CC.campo('PDA de origen', `<div class="fda-ro">${pdaLink}</div>`)}${CC.campoLectura('Nave', f.nave)}${CC.campoLectura('Viaje', f.viaje)}
        ${CC.campoLectura('Puerto', f.puerto)}${CC.campoLectura('Cliente', f.cliente)}${CC.campoLectura('Zarpe', CC.fecha(f.zarpe))}${CC.campoLectura('Moneda', f.moneda)}
        ${CC.campo('Estado', `<div class="fda-ro">${chip(f.estado)}</div>`)}${CC.campoLectura('Fecha de envío', f.envio ? (W.vyFmt ? W.vyFmt(f.envio) : CC.fecha(f.envio)) : 'Sin enviar')}
        ${CC.campo('Time-bar', `<div class="fda-ro fda-tb">${CC.fecha(tb)}${tbAviso(f)}</div>`)}${CC.campoLectura('Días de time-bar', `${f.dias} días desde el zarpe`)}
      </div>
      <div class="fac-tabs fda-tabs"><button type="button" class="${E.tab==='comp'?'on':''}" onclick="fdaTab('comp')">Comparación PDA y FDA</button>
        <button type="button" class="${E.tab==='ad'?'on':''}" onclick="fdaTab('ad')">Adendas (${f.adendas.length})${pend?` <span class="fda-pend">${pend} pendiente${pend>1?'s':''}</span>`:''}</button></div>
      <div id="fdaBody">${E.tab==='ad' ? tabAdendas(f) : tabComp(f)}</div></div>`;
  };
  const pintar = () => { CC.refrescar(ID); barra(); };
  const barra = () => {
    if(E.vista==='detalle') CC.barra('Ver FDA', ['Inicio','PDA','FDA','Ver FDA'], 'fdaVolver()');
    else W.updatePagebar(ID);
  };
  W.fdaVer = codigo => { E.vista = 'detalle'; E.sel = codigo; E.tab = 'comp'; pintar(); W.scrollTo({top:0}); };
  W.fdaVolver = () => { E.vista = 'lista'; E.sel = null; pintar(); W.scrollTo({top:0}); };
  W.fdaTab = t => { E.tab = t; pintar(); };
  W.fdaHistorial = () => { const f = porCodigo(E.sel); if(f) CC.historial([...f.hist].sort((a,b)=>String(b.ts).localeCompare(String(a.ts)))); };
  W.fdaAbrirPda = code => {
    if(typeof SAMPLE_PDAS!=='undefined' && SAMPLE_PDAS.some(p=>p.code===code)){ W.openSamplePda(code); return; }
    if(typeof state!=='undefined' && state.pdaNumber===code){ W.goStep(2); return; }
    CC.toast('La PDA de origen es de una escala anterior y no está cargada en este prototipo','info');
  };
  const cambiarEstado = (f, nuevo, comentario) => { f.hist.push(H(hoyIso(), CC.usuario(), f.estado, nuevo, comentario)); f.estado = nuevo; };

  /* ---------- Adendas ---------- */
  const adModal = () => {
    const f = porCodigo(E.sel), a = E.ad, nuevo = a.tipo==='Servicio nuevo', l = lineaDe(f, a.linea);
    const lineas = f.lineas.map(x=>[x.id, x.svc]);
    const actual = l ? (a.tipo==='Cambio de cantidad' ? String(l.cantF) : dinero(l.tarF)) : '';
    CC.modal(`<h3>Agregar adenda</h3><div class="fac-sub">${esc(f.codigo)} · ${esc(f.nave)} · Viaje ${esc(f.viaje)}</div><div style="height:14px"></div>
      <div class="fac-g2 fda-adf">
        ${CC.campo('Tipo de adenda', CC.selector(['Servicio nuevo','Cambio de cantidad','Cambio de tarifa'], a.tipo, `id="fdaAdTipo" onchange="fdaAdSet('tipo',this.value)"`))}
        ${nuevo ? CC.campo('Servicio', `<input id="fdaAdSvc" list="fdaSvcList" placeholder="Ingrese el servicio" value="${esc(a.svc)}" oninput="fdaAdSet('svc',this.value,1)"><datalist id="fdaSvcList">${['Suministro de agua dulce','Recojo de residuos sólidos','Vigilancia de nave','Lancha para práctico','Inspección de bodegas','Fumigación'].map(x=>`<option value="${x}">`).join('')}</datalist>`)
          : CC.campo('Servicio de la FDA', CC.selector(lineas, a.linea, `id="fdaAdLinea" onchange="fdaAdSet('linea',this.value)"`, 'Seleccione'))}
        ${nuevo ? CC.campo('Cantidad', `<input id="fdaAdCant" inputmode="decimal" value="${esc(a.cant)}" oninput="fdaAdSet('cant',this.value,1)">`)
          : CC.campoLectura(a.tipo==='Cambio de cantidad' ? 'Cantidad actual' : 'Tarifa actual', actual)}
        ${nuevo ? CC.campo(`Tarifa (${f.moneda})`, `<input id="fdaAdTar" inputmode="decimal" placeholder="0.00" value="${esc(a.tar)}" oninput="fdaAdSet('tar',this.value,1)">`)
          : CC.campo(a.tipo==='Cambio de cantidad' ? 'Nueva cantidad' : `Nueva tarifa (${f.moneda})`, `<input id="fdaAdNuevo" inputmode="decimal" value="${esc(a.nuevo)}" oninput="fdaAdSet('nuevo',this.value,1)">`)}
        ${CC.campo('Motivo', `<textarea id="fdaAdMot" rows="3" placeholder="Motivo obligatorio" oninput="fdaAdSet('motivo',this.value,1)">${esc(a.motivo)}</textarea>`, 'fac-span2')}
      </div>
      <div class="fac-btns"><button type="button" class="cc-btn" onclick="fdaGuardarAdenda()">Guardar</button><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button></div>`, 'md');
  };
  W.fdaNuevaAdenda = () => { E.ad = {tipo:'Servicio nuevo', svc:'', cant:'1', tar:'', linea:'', nuevo:'', motivo:''}; adModal(); };
  W.fdaAdSet = (k, v, sinPintar) => { E.ad[k] = v; if(!sinPintar) adModal(); };
  const num = x => { const n = parseFloat(String(x||'').replace(/,/g,'')); return isNaN(n) ? NaN : n; };
  W.fdaGuardarAdenda = () => {
    const f = porCodigo(E.sel), a = E.ad, nuevo = a.tipo==='Servicio nuevo';
    if(nuevo && !a.svc.trim()) return CC.toast('Ingrese el servicio','error');
    if(nuevo && !(num(a.cant)>0 && num(a.tar)>0)) return CC.toast('Ingrese cantidad y tarifa mayores a cero','error');
    if(!nuevo && !a.linea) return CC.toast('Seleccione el servicio de la FDA','error');
    if(!nuevo && !(num(a.nuevo)>0)) return CC.toast(a.tipo==='Cambio de cantidad' ? 'Ingrese la nueva cantidad' : 'Ingrese la nueva tarifa','error');
    if(!a.motivo.trim()) return CC.toast('El motivo es obligatorio','error');
    const l = lineaDe(f, a.linea), id = 'a' + (f.adendas.length + 1) + '_' + Date.now().toString(36);
    const ad = nuevo ? AD(id, a.tipo, '', a.svc.trim(), '', `${num(a.cant)} × ${dinero(num(a.tar))}`, a.motivo.trim(), CC.usuario(), hoyIso(), null)
      : AD(id, a.tipo, l.id, l.svc, a.tipo==='Cambio de cantidad' ? String(l.cantF) : dinero(l.tarF), a.tipo==='Cambio de cantidad' ? String(num(a.nuevo)) : dinero(num(a.nuevo)), a.motivo.trim(), CC.usuario(), hoyIso(), null);
    if(nuevo){ ad.cant = num(a.cant); ad.tar = num(a.tar); } else ad.valor = num(a.nuevo);
    f.adendas.push(ad);
    f.hist.push(H(ad.ts, ad.por, f.estado, f.estado, `Adenda registrada (${ad.tipo}): ${ad.svc}. Motivo: ${ad.motivo}`));
    CC.cerrarModal(); E.tab = 'ad'; pintar(); CC.toast('Adenda registrada. Queda pendiente de aprobación','success');
  };
  const viajeDe = f => (typeof VOYAGES!=='undefined' && Array.isArray(VOYAGES))
    ? (VOYAGES.find(v=>v.code===f.vy) || VOYAGES.find(v=>nrm(v.nave)===nrm(f.nave) && nrm(v.nro)===nrm(f.viaje))) : null;
  W.fdaAprobar = id => {
    const f = porCodigo(E.sel), a = f && f.adendas.find(x=>x.id===id); if(!a || a.estado!=='Pendiente') return;
    if(a.tipo==='Servicio nuevo'){ const l = L(a.svc, 0, 0, a.cant||1, a.tar||0, 0.15, 'Adenda'); f.lineas.push(l); a.linea = l.id; }
    else { const l = lineaDe(f, a.linea); if(l){ if(a.tipo==='Cambio de cantidad') l.cantF = a.valor; else l.tarF = a.valor; } }
    a.estado = 'Aprobada'; a.aprPor = CC.usuario(); a.aprTs = hoyIso();
    f.hist.push(H(a.aprTs, a.aprPor, f.estado, f.estado, `Adenda aprobada (${a.tipo}): ${a.svc}. Pasa a los servicios operativos del viaje`));
    const v = viajeDe(f);
    if(v && Array.isArray(v.rows)) v.rows.push({id:'fda'+Date.now().toString(36), cat:'port', name:a.svc, ini_est:v.eta||'', ini:'', fin:'', validado:false, proveedor:'', coord:true, ref:'Adenda '+f.codigo, files:0, pda:f.pda});
    pintar();
    CC.toast(`Adenda aprobada: ${a.svc} pasa a los servicios operativos del viaje ${v ? v.code : f.viaje} para que Agenciamiento confirme la ejecución`,'success');
  };

  /* ---------- Envío (PDF para el cliente) y cierre ---------- */
  const pdf = f => {
    const tp = totP(f), tf = totF(f);
    const filas = f.lineas.map(l=>`<tr><td>${esc(l.svc)}${l.origen==='Adenda'?' (adenda)':''}</td><td class="r">${dinero(l.tarF)}</td><td class="r">${l.cantF}</td><td class="r">${dinero(impP(l))}</td><td class="r"><b>${dinero(impF(l))}</b></td></tr>`).join('');
    const motivos = f.adendas.filter(a=>a.estado==='Aprobada');
    return `<div class="pda-doc">
      <div class="pd-top"><div class="pd-logo">${typeof LOGO_COLOR!=='undefined' ? LOGO_COLOR : 'COSMOS'}</div><div class="pd-code">${esc(f.codigo)}</div></div>
      <div class="pd-title">FINAL DISBURSEMENT ACCOUNT (FDA)</div>
      <table class="pd-box"><tr><td class="k">Para</td><td>${esc(f.cliente)}</td><td class="k">Fecha</td><td>${CC.fecha(hoyIso())}</td></tr>
        <tr><td class="k">De</td><td colspan="3">Cosmos Global Logistics S.A.C.</td></tr></table>
      <table class="pd-grid">
        <tr><td class="k">Nave</td><td class="v">${esc(f.nave)}</td><td class="k">Viaje N°</td><td class="v">${esc(f.viaje)}</td></tr>
        <tr><td class="k">Puerto</td><td class="v">${esc(f.puerto)}</td><td class="k">Zarpe</td><td class="v">${CC.fecha(f.zarpe)}</td></tr>
        <tr><td class="k">PDA</td><td class="v">${esc(f.pda)}</td><td class="k">Moneda</td><td class="v">${f.moneda}</td></tr></table>
      <table class="pd-tbl"><thead><tr><th style="width:40%">Servicio</th><th class="r">Tarifa</th><th class="r">Cantidad</th><th class="r">Estimado (PDA)</th><th class="r">Final (FDA)</th></tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr><td colspan="3" class="r">Total ${f.moneda}</td><td class="r">${dinero(tp)}</td><td class="r">${dinero(tf)}</td></tr></tfoot></table>
      <div class="pd-bottom"><div></div><table class="pd-totals"><tr><td>Total PDA</td><td class="r">${f.moneda} ${dinero(tp)}</td></tr>
        <tr><td>Diferencia</td><td class="r">${f.moneda} ${signo(r2(tf-tp))}</td></tr><tr class="grand"><td>TOTAL FDA</td><td class="r">${f.moneda} ${dinero(tf)}</td></tr></table></div>
      ${motivos.length ? `<div class="pd-remarks-t">ADENDAS</div><div class="pd-remarks"><ul>${motivos.map(a=>`<li>${esc(a.svc)}: ${esc(a.tipo.toLowerCase())}. ${esc(a.motivo)}.</li>`).join('')}</ul></div>` : ''}
      <div class="pd-notes">* Plazo de reclamo (time-bar): ${CC.fecha(tbFecha(f))}.</div></div>`;
  };
  W.fdaEnviar = () => {
    const f = porCodigo(E.sel); if(!f) return;
    CC.modal(`<div class="fda-pdfbar"><h3>Vista previa · ${esc(f.codigo)}</h3><div class="fac-acts"><button type="button" class="cc-btn" onclick="CC.toast('PDF descargado (simulado)','info')">Descargar PDF</button></div></div>
      <div class="fda-pdf"><div class="pdf-page">${pdf(f)}</div></div>
      <div class="fac-btns"><button type="button" class="cc-btn" onclick="fdaConfirmarEnvio()">${f.estado==='Enviada'?'Reenviar al cliente':'Enviar al cliente'}</button><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button></div>`, 'lg');
  };
  W.fdaConfirmarEnvio = () => {
    const f = porCodigo(E.sel); if(!f) return;
    f.envio = hoyIso();
    if(f.estado==='Enviada') f.hist.push(H(f.envio, CC.usuario(), 'Enviada', 'Enviada', 'PDF de la FDA reenviado al cliente'));
    else cambiarEstado(f, 'Enviada', 'PDF de la FDA enviado al cliente');
    CC.cerrarModal(); pintar(); CC.toast(`${f.codigo} enviada al cliente`,'success');
  };
  W.fdaCerrar = () => {
    const f = porCodigo(E.sel); if(!f || f.estado!=='Enviada') return;
    if(f.adendas.some(a=>a.estado==='Pendiente')) return CC.toast('Aprueba antes las adendas pendientes','error');
    cambiarEstado(f, 'Cerrada', 'Cuenta de la escala cerrada'); pintar(); CC.toast(`${f.codigo} cerrada`,'success');
  };

  /* ---------- Generar FDA desde Ver PDA ---------- */
  const siguiente = puerto => {
    const n = Math.max(0, ...FDAS.map(f=>+f.codigo.slice(7,13))) + 1;
    return `FDA${new Date().getFullYear()}${String(n).padStart(6,'0')}${puerto}`;
  };
  const pdaApta = () => typeof state!=='undefined' && state.pdaNumber && state.categoryType==='maritimo' && (state.status==='Aprobada' || state.status==='Finalizada');
  W.fdaGenerar = () => {
    if(!pdaApta()) return CC.toast('Solo una PDA aprobada genera su FDA','error');
    const ya = dePda(state.pdaNumber); if(ya){ W.fdaIr(ya.codigo); return; }
    const v = state.vessel || {};
    const lineas = state.services.filter(s=>s.enabled).map(s=>{
      const imp = r2(W.calcItem(s)); let q = Number(typeof W.effQty==='function' ? W.effQty(s) : s.qty) || 1;
      let t = r2(imp/q); if(r2(q*t)!==imp){ q = 1; t = imp; }
      let c = null; try{ c = typeof W.lineCost==='function' ? W.lineCost(s) : null; }catch(e){ c = null; }
      const l = L(s.name, q, t, q, t); l.costoU = c!==null && !isNaN(c) ? r2(c/q) : r2(t*0.85); return l;
    });
    const voy = typeof W.pdaVoyage==='function' ? W.pdaVoyage() : null;
    const cod = siguiente(String(state.pdaNumber).slice(-5));
    const cliente = (state.client && state.client.name) || '';
    const f = {codigo:cod, pda:state.pdaNumber, nave:(typeof W.shipDisplayName==='function' ? W.shipDisplayName() : v.name) || v.name || '', viaje:v.voy||'', puerto:v.port||'', cliente,
      eta:String(v.eta||'').slice(0,10), zarpe:String(v.etd||v.eta||'').slice(0,10), moneda:'USD', estado:'Abierta', envio:'', creado:hoyIso(),
      vy:(voy && voy.code) || (typeof PDA_ASSOC!=='undefined' && PDA_ASSOC[state.pdaNumber]) || '', lineas, adendas:[], dias:tbDias(cliente),
      hist:[H(hoyIso(), CC.usuario(), '', 'Abierta', `FDA generada desde la ${state.pdaNumber}`)]};
    FDAS.unshift(f);
    if(typeof W.log==='function') W.log('FDA', `${cod} generada desde la PDA (la PDA no cambia)`);
    CC.toast(`${cod} generada con ${lineas.length} servicios de la PDA. La PDA no cambia`,'success');
    W.fdaIr(cod);
  };
  W.fdaIr = codigo => { E.vista = 'detalle'; E.sel = codigo; E.tab = 'comp'; CC.abrir(ID, codigo); };

  /* Botón en la cabecera de Ver PDA (sin tocar el index: envuelve renderPdaHead) */
  const origHead = W.renderPdaHead;
  if(typeof origHead==='function'){
    W.renderPdaHead = function(){
      origHead.apply(this, arguments);
      if(!pdaApta()) return;
      const acts = D.querySelector('#ccPdaHead .cc-ph-actions'); if(!acts) return;
      const ya = dePda(state.pdaNumber);
      acts.insertAdjacentHTML('beforeend', ya
        ? `<button type="button" id="fdaBtnPda" ${P('FDA','cc-btn')} title="Abrir la FDA ${esc(ya.codigo)}" onclick="fdaIr('${ya.codigo}')">Ver FDA</button>`
        : `<button type="button" id="fdaBtnPda" ${P('FDA','cc-btn')} title="Crea la FDA con los servicios de esta PDA. La PDA no cambia." onclick="fdaGenerar()">Generar FDA</button>`);
    };
  }

  CC.registrarPantalla({
    id: ID, grupo:'PDA', opcion:'FDA', propuesta:T,
    titulo:'Buscar FDA', migas:['Inicio','PDA','Buscar FDA'],
    html: () => E.vista==='detalle' && porCodigo(E.sel) ? detalle() : lista(),
    alAbrir: (sec, codigo) => {
      if(codigo && porCodigo(codigo)){ E.vista = 'detalle'; E.sel = codigo; CC.refrescar(ID); }
      else if(!codigo){ E.vista = 'lista'; E.sel = null; CC.refrescar(ID); }
      barra();
    },
    guia: [{t:'FDA de una escala', steps:[
      {go:()=>{ CC.abrir(ID); }, el:'#fdaF', h:'Buscar FDA', p:'Filtra por código, nave, viaje, cliente o estado.'},
      {el:'#fdaRes', h:'Time-bar', p:'Aviso cuando el plazo de reclamo vence en 30 días o menos.'},
      {go:()=>W.fdaVer('FDA2026000097PEMRI'), el:'.fda-comp', h:'Comparación', p:'Por servicio: PDA estimado, FDA final y diferencia, con profit inicial y final.'},
      {go:()=>{ W.fdaVer('FDA2026000097PEMRI'); W.fdaTab('ad'); }, el:'.fda-ad', h:'Adendas', p:'Servicio nuevo o cambio de cantidad o tarifa, con motivo. Al aprobar pasa al viaje.'},
      {go:()=>W.fdaVer('FDA2026000097PEMRI'), el:'.fda-det .md-actions', h:'Enviar y cerrar', p:'Enviar FDA muestra el PDF; al confirmar queda Enviada con fecha.'}]}]
  });
})();
