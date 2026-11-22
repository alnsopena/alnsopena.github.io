/* Módulo: Documentación (Importación y Exportación). Espejo de Connect.
   Importación: Documentos (búsqueda y BL), Transbordo, Direccionamiento.
   Exportación: Documentos (búsqueda y Reserva), Cutoff.
   Propuesta I-037 (HU-DOC-23): restricciones de exportación (mantenimiento y alertas que solo avisan).
   Propuestas I-062, I-017, I-080, I-081, I-185, I-069, I-055, I-074, I-078, I-036, I-060, I-019, I-022 e I-182: ver bloque "PROPUESTAS sobre Documentación".
   Lote 39 (I-020, I-030, I-038, I-057, I-070, I-073, I-076, I-079, I-088, I-090, I-093, I-102, I-103, I-112, I-113, I-121, I-174, I-192): ver "PROPUESTAS lote 39".
   Todo en memoria, con CC.datos y datos ficticios propios. La pantalla antigua screenDocBl queda sin enlace en el menú. */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const esc = x => CC.esc(x);
const nt = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const has = (v, q) => !q || nt(v).includes(nt(q));
const clone = o => JSON.parse(JSON.stringify(o));
const ahora = () => new Date().toISOString();
const hoyISO = () => new Date().toISOString().slice(0,10);
const diasISO = d => new Date(Date.now() + d*864e5).toISOString().slice(0,10);
const isoLocal = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
const masHoras = h => isoLocal(new Date(Date.now() + h*36e5));
const fdt = iso => { if(!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).replace(',',''); };
const fd = iso => iso ? CC.fecha(iso) : '';
const n0 = v => v===''||v==null ? '' : Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
const usr = () => String(CC.usuario()||'').replace(/\s*\(.*\)$/,'') || 'Usuario';
const sel = (o, v, a, ph) => CC.selector(o, v, a, ph);
const campo = (l, i, c) => CC.campo(l, i, c);
const btn = (t, f, cls, extra) => `<button type="button" class="cc-btn ${cls||''}" onclick="${f}" ${extra||''}>${t}</button>`;
const ghost = (t, f, extra) => btn(t, f, 'ghost', extra);
const sinDatos = v => (v===''||v==null) ? '<span class="doc-mut">Sin datos</span>' : esc(v);
const P37 = () => CC.verPropuestas;
const PV = () => CC.verPropuestas;
const M37 = (tipo) => CC.marca(tipo||'Agrega', 'HU-DOC-23', 'I-037');

/* ---------- Íconos ---------- */
const SVG = {
  enviar:'<path d="M4 12l16-8-6 16-3-7z"/>', rect:'<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/>',
  cancel:'<circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/>', error:'<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16h.01"/>',
  adv:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>', info:'<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
  hist:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', imp:'<path d="M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z"/>',
  desc:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', lista:'<path d="M5 6h14M5 12h14M5 18h9"/>', lapiz:'<path d="M4 20h4l10-10-4-4L4 16z"/>',
  ok:'<path d="M5 12l5 5 9-10"/>', peso:'<path d="M6 8h12l2 12H4z"/><circle cx="12" cy="5" r="2"/>', linea:'<path d="M4 18h4l3-8 3 5 2-3h4"/>',
  mas:'<path d="M12 5v14M5 12h14"/>'
};
const svgI = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[k]}</svg>`;
const ico = (k, title, fn, o) => { o = o||{}; return `<button type="button" class="doc-ic${o.cls?' '+o.cls:''}${o.dis?' dis':''}" title="${esc(title)}" aria-label="${esc(title)}" ${o.dis?'aria-disabled="true"':`onclick="${fn}"`}>${svgI(k)}</button>`; };

/* ---------- Catálogos ---------- */
const ST_BL = ['POR REVISAR','APROBADO','TRANSMITIDO A SUNAT','POR RECTIFICAR','Anulado'];
const ST_PAGO = ['Listo para facturar','Liquidación pendiente','Liquidación pagada','Liquidación crédito'];
const TONO = {'POR REVISAR':'pendiente','APROBADO':'aprobada','TRANSMITIDO A SUNAT':'aprobada','POR RECTIFICAR':'pendiente','Anulado':'anulada'};
const ST_SUNAT = {PENDING:'Pendiente', ERROR:'Error', COMPLETED:'Completado'};
const COD = {'0103':'Incorporación de manifiesto','0102':'Rectificación de manifiesto','0104':'Anulación de manifiesto','0171':'Numeración de reserva','0172':'Rectificación de reserva','0173':'Anulación de reserva','0154':'Primer envío del BL','0153':'Rectificación del BL','0156':'Anulación del BL'};
const IND_IMP = ['Importación','Transbordo','Tránsito'], IND_EXP = ['Exportación','Transbordo'];
const TIPO_IND = ['A la orden','Nominativo','No Domiciliado'], TIPO_BL = ['Master B/L','House B/L'];
const TIPO_EMI = ['Original','Telex release','Seaway bill'], COND_EMB = ['FCL/FCL','LCL/LCL','FCL/LCL','EMPTY'];
const TIPO_CARGA = ['Contenedorizada','Carga suelta','Rodante','Granel'], INCOTERM = ['FOB','CIF','CFR','EXW','DAP'];
const TERM_FLETE = ['Prepagado','Por cobrar'], DESPACHO = ['Anticipado','Diferido','Urgente'];
const MOD_TRB = ['Transbordo directo','Transbordo con descarga'], COND_PAGO = ['Prepagado','Por cobrar'];
const VIA_EMB = ['Embarque Directo','Depósito Temporal','Extraportuario (EXTRA)'];
const BULTOS = ['Pallets','Cajas','Sacos','Bultos','Unidades'], SELLOS = ['Sello de naviera/transportista','Sello de aduanas','Sello de exportador'];
const ISO = [['22G1','20DV'],['42G1','40DV'],['45G1','40HC'],['45R1','40RH']], TIPOS_CONT = ['20DV','40DV','40HC','40RH'];
const TARA = {'20DV':2200,'40DV':3750,'40HC':3900,'40RH':4800}, PAYLOAD = {'20DV':28280,'40DV':26730,'40HC':26580,'40RH':29200};
const PAIS = {Rotterdam:'Países Bajos','Shanghái':'China',Manzanillo:'Panamá',Kingston:'Jamaica',Callao:'Perú',Paita:'Perú',Pisco:'Perú',Salaverry:'Perú'};
const PARTIDAS = [['0806100000','Uvas frescas'],['0810400000','Arándanos frescos'],['0804400000','Paltas (aguacates) frescas'],['2603000000','Minerales de cobre y sus concentrados'],['6109100031','T-shirts de algodón'],['2710191500','Aceites lubricantes'],['8703239020','Vehículos de cilindrada entre 1500 y 3000 cm3']];
const DEPOSITOS = [{n:'DEPÓSITO PUERTO SUR S.A.C.', ruc:'20610000511', cod:'3014'},{n:'ALMACENES ANDINOS DEL CALLAO S.A.', ruc:'20610000512', cod:'3022'},{n:'TERMINAL DE CARGA LIMA NORTE S.A.C.', ruc:'20610000513', cod:'3030'}];
const TIPOS_RT = ['Permanente (PER)','Por BL (BL)'];
const TERMINAL = p => /callao/i.test(p||'') ? 'DP World' : /paita/i.test(p||'') ? 'Euroandino' : '';
const SUCURSAL = 'Callao';
const lineaNombre = c => (CC.datos.lineas.find(l=>l.codigo===c)||{}).nombre || c || '';
const lineaCod = n => (CC.datos.lineas.find(l=>l.nombre===n||l.codigo===n)||{}).codigo || '';
const puertos = () => CC.datos.puertos.map(p=>p.nombre);

/* ---------- Estado y datos ficticios ---------- */
let S = null;
const ev = (comment, user, ts, sunat) => ({ts:ts||ahora(), user:user||'Sistema', comment, sunat:sunat||null});
const tx = (c, st, extra) => Object.assign({c, st, ts:ahora(), user:'Usuario SUNAT', motivo:''}, extra||{});
const last = l => (l||[])[(l||[]).length-1] || null;
function mkEq(numero, tipo, x){ return Object.assign({numero, tipo, cond:'FCL', tara:TARA[tipo]||2200, payload:PAYLOAD[tipo]||28000, vgm:'', peso:'', olb:'',olf:'',owl:'',owr:'',oh:'', reefer:tipo==='40RH', conectado:false, temp:'', vent:'', hum:'', co2:'', o2:'', ligado:false, soc:false, partida:'', tipoBulto:'Pallets', descCarga:'', diasLibres:'', obs:'', confirmado:false, fEmbarque:'', fDescarga:'', fLiberacion:'', fSalidaDep:'', sellos:[], peligrosos:[], roleado:false}, x||{}); }
function mkImp(b){
  const o = Object.assign({id:'', numero:'', nave:'', viaje:'', manifiesto:'', emision:'', puertoOrigen:'', puertoCarga:'Kingston', puertoDescarga:'Callao', puertoFinal:'Callao',
    tipo:'House B/L', indicador:'Importación', tipoInd:'Nominativo', estado:'POR REVISAR', pago:'', provisional:false, lineaCod:'ZIM', linea:'',
    embarcador:'ORIENT SUPPLY TRADING CO. LTD', consignatario:'', notificante:'', dirEmb:'NO. 88 HARBOUR ROAD, KINGSTON', dirCons:'AV. ARGENTINA 2450, CALLAO', dirNot:'',
    tipoEmision:'Original', fechaEmision:'', condEmbarque:'FCL/FCL', tipoCarga:'Contenedorizada', cantidad:20, pesoTotal:42000, volumen:66, refReserva:'',
    incoterm:'CIF', termFlete:'Prepagado', negociable:false, tipoDespacho:'Anticipado', modalidadTrb:'', entidad:DEPOSITOS[0].n, codAduana:DEPOSITOS[0].cod, ruc:DEPOSITOS[0].ruc,
    sunat:[], errores:[], advertencias:[], info:null, coarri:'', audit:{c:'', cts:'', u:'', ts:''}, equipos:[], carga:[], recargos:[], descripciones:[{descripcion:'SAID TO CONTAIN: MERCANCÍA GENERAL'}],
    hist:[], cambios:[], naveCx:'', viajeCx:'', solicitud:'', detalleTrb:'', sinConceptos:false}, b);
  o.linea = o.linea || lineaNombre(o.lineaCod); o.fechaEmision = o.fechaEmision || o.emision; o.notificante = o.notificante || o.consignatario;
  if(!o.equipos.length) o.equipos = (b.contenedores||[]).map((n,k)=>mkEq(n, TIPOS_CONT[k%2], {vgm:24000+k*500, peso:24000+k*500, partida:PARTIDAS[2][0], descCarga:'MERCANCÍA GENERAL', diasLibres:10, fDescarga:o.coarri?o.coarri+'T08:00':'', sellos:[{tipo:'Sello de naviera/transportista', numero:'ZS'+String(400100+k+o.numero.length*7)}]}));
  if(!o.carga.length) o.carga = o.equipos.map(e=>({tipoBulto:'Pallets', descripcion:'MERCANCÍA GENERAL', equipo:e.numero, cantidad:10, peso:21000, anio:'', modelo:'', marca:'', chasis:'', vins:'', volumen:33, marcas:'S/M', peligroso:false}));
  o.audit = {c:'Carga de archivos', cts:(o.emision||hoyISO())+'T09:10:00', u:'J. Ramos (Documentación)', ts:(o.emision||hoyISO())+'T15:40:00'};
  if(!o.hist.length) o.hist = [ev('BL generado por carga de archivos (MR, MRR, BAPLIE)', 'J. Ramos (Documentación)', o.audit.cts)];
  return o;
}
function seed(){
  if(S) return S;
  const D = CC.datos, cbl = (typeof CB!=='undefined' && CB.bls) ? CB.bls : [];
  S = {imp:[], exp:[], dir:[], cut:{}, restr:[], cerrados:new Set(), etb:{}, manifSalida:new Set(), sinEmail:new Set(['TRAFIGURA PERU']), seq:100,
    fi:{f:{}, q:{}, pag:1, tam:10, sel:new Set()}, fe:{f:{}, q:{}, pag:1, tam:10, sel:new Set()}, ft:{f:{}, q:null, pag:1, tam:10, lote:[]}, fr:{f:{}, q:{}, pag:1, tam:10, sel:new Set()},
    fc:{f:{}}, frs:{f:{}, q:{}}, ed:null, co:null};
  D.blImportacion.forEach((b,i)=>{ const c = cbl.find(x=>x.n===b.numero)||{}; const ts = ['TRANSMITIDO A SUNAT','POR RECTIFICAR'].includes(b.estado);
    const o = mkImp({...clone(b), id:'I'+(i+1), lineaCod:b.linea, pago:c.liq ? c.pay : '', puertoFinal:c.pf||'Callao', coarri:ts ? '2026-09-20' : '',
      sunat:ts ? [tx('0103','COMPLETED',{ts:'2026-09-15T10:00:00'})] : [], info:ts ? {detalle:String(i+1).padStart(4,'0'), electronico:'1180'+String(552000+i)} : null});
    if(i===2) o.falla = '0103';
    if(i===1) o.advertencias = [{codigo:'W015', descripcion:'La fecha de emisión es posterior a la fecha de llegada.'}];
    if(b.estado==='POR RECTIFICAR'){ o.cambios.push({ver:2, origen:'Edición interna', sobre:1, ts:'2026-09-25T11:00:00', user:'J. Ramos (Documentación)', campos:[{campo:'Peso Bruto (KG)', antes:'41500', despues:'42000'}]}); o.hist.push(ev('Cambios guardados. Estado: POR RECTIFICAR','J. Ramos (Documentación)','2026-09-25T11:00:00')); }
    if(ts) o.hist.push(ev('Transmisión SUNAT 0103 (Incorporación de manifiesto): Completado','Usuario SUNAT','2026-09-15T10:00:00',{code:'0103', status:'COMPLETED'}));
    S.imp.push(o); });
  const v = D.viajes, vT = v[0] || {nave:'BOX ENDURANCE', numero:'001'}, vC = v[1] || vT, bx = S.imp[0] || {nave:vT.nave, viaje:vT.numero};
  const trs = (id, num, est, x) => mkImp(Object.assign({id, numero:num, nave:vT.nave, viaje:vT.numero, manifiesto:'2026-0450', emision:'2026-10-02', indicador:'Transbordo', modalidadTrb:'Transbordo directo', puertoFinal:'Guayaquil', estado:est, consignatario:'ANDES MINING EXPORT S.A.', contenedores:[`ZIMU${num.slice(-7)}`]}, x));
  const ok3 = {sunat:[tx('0103','COMPLETED',{ts:'2026-10-03T09:00:00'})], info:{detalle:'0101', electronico:'118055901'}};
  S.imp.push(trs('T1','ZIMUTRS0000041','TRANSMITIDO A SUNAT', Object.assign(clone(ok3), {naveCx:vC.nave, viajeCx:vC.numero})));
  S.imp.push(trs('T2','ZIMUTRS0000042','TRANSMITIDO A SUNAT', Object.assign(clone(ok3), {naveCx:vC.nave, viajeCx:vC.numero, fallaTrb:true})));
  S.imp.push(trs('T3','ZIMUTRS0000043','TRANSMITIDO A SUNAT', Object.assign(clone(ok3), {naveCx:vC.nave, viajeCx:vC.numero, solicitud:'TRB-2026-000118', detalleTrb:'0045'})));
  S.imp.push(trs('T4','ZIMUTRS0000044','APROBADO', {}));
  S.imp.push(mkImp({id:'N1', numero:'ZIMUTRN0000051', nave:bx.nave, viaje:bx.viaje, manifiesto:'2026-0411', emision:'2026-09-08', indicador:'Tránsito', estado:'APROBADO', consignatario:'IMPORTADORA BOLIVIANA DEL ALTIPLANO S.R.L.', puertoFinal:'La Paz', entidad:'', codAduana:'', ruc:'', contenedores:['ZIMU7700511']}));
  S.imp.push(mkImp({id:'B19', numero:'ZIMUBOX0000019', nave:bx.nave, viaje:bx.viaje, manifiesto:'2026-0411', emision:'2026-09-09', estado:'APROBADO', consignatario:'IMPORTADORA LIMA NORTE S.A.C.', contenedores:['ZIMU7700529']}));
  S.imp.push(mkImp({id:'P1', numero:'', provisional:true, nave:bx.nave, viaje:bx.viaje, manifiesto:'', emision:'', estado:'POR REVISAR', consignatario:'DISTRIBUIDORA EL PUERTO E.I.R.L.', entidad:'', codAduana:'', ruc:'', tipoEmision:'', contenedores:['ZIMU7700537']}));
  /* Exportación */
  const cfg = [
    {est:'POR REVISAR', tipo:'20DV', cargaPeso:25600, falta:true},
    {est:'APROBADO', tipo:'40HC', cargaPeso:25000, res:[tx('0171','COMPLETED')], atd:true},
    {est:'TRANSMITIDO A SUNAT', tipo:'40DV', payload:27000, res:[tx('0171','COMPLETED')], bl:[tx('0154','COMPLETED')], atd:true, extRes:true, conc:true},
    {est:'POR RECTIFICAR', tipo:'20DV', res:[tx('0171','COMPLETED')], bl:[tx('0154','COMPLETED')], atd:true, conc:true},
    {est:'POR REVISAR', tipo:'40RH'},
    {est:'APROBADO', tipo:'40HC', res:[], atd:true, extemp:true},
    {est:'TRANSMITIDO A SUNAT', tipo:'20DV', manual:{motivo:'Transmisión registrada por el partner por caída del portal SUNAT.', fecha:'2026-10-20T10:30'}, bl:[tx('0154','COMPLETED')], atd:true, extBl:true, conc:true},
    {est:'POR RECTIFICAR', tipo:'40DV', res:[tx('0171','COMPLETED')], bl:[tx('0154','COMPLETED'), tx('0153','ERROR')], atd:true, err:true, conc:true}];
  D.blExportacion.forEach((b,i)=>{ const c = cfg[i % cfg.length], cont = b.contenedores[0];
    const eq = mkEq(cont, c.tipo, {payload:c.payload||PAYLOAD[c.tipo], vgm:c.tipo==='40RH'?'':String(TARA[c.tipo]+(c.cargaPeso||20000)), partida:c.falta?'':PARTIDAS[i%PARTIDAS.length][0], descCarga:PARTIDAS[i%PARTIDAS.length][1].toUpperCase(),
      confirmado:['TRANSMITIDO A SUNAT','POR RECTIFICAR'].includes(c.est), fEmbarque:c.atd?'2026-10-18T22:00':'', sellos:c.falta?[{tipo:'Sello de naviera/transportista', numero:'ML'+String(80021+i)}]:[{tipo:'Sello de naviera/transportista', numero:b.linea==='ZIM'?'A'+String(1000000200+i):'ML'+String(80021+i)},{tipo:'Sello de aduanas', numero:'002PR'+String(118790+i)}]});
    const eqs = [eq]; if(i===1) eqs.push(mkEq(cont.slice(0,4)+String(9900000+i), '40HC', {vgm:'22000', partida:PARTIDAS[1][0], descCarga:'ARÁNDANOS FRESCOS', sellos:clone(eq.sellos).map((s,k)=>({...s, numero:s.numero.slice(0,-1)+(k+5)}))}));
    const o = Object.assign(clone(b), {id:'E'+(i+1), lineaCod:b.linea, linea:lineaNombre(b.linea), puertoOrigen:'', puertoFinal:b.puertoDescarga, tipoInd:'Nominativo',
      consignatario:i===4?'':['EUROFRUIT TRADING B.V.','HANGZHOU TEXTILE IMPORT CO.','CARIBBEAN METALS S.A.','KINGSTON FOODS LTD'][i%4], notificante:'SAME AS CONSIGNEE', notif2:'', expRefs:'', ff:'',
      dirEmb:'AV. LOS FRUTALES 145, ATE, LIMA', dirCons:'HAVENSTRAAT 12, ROTTERDAM', dirNot:'', condPago:'Prepagado', puertoPago:'Callao', fechaEmision:b.emision, tipoEmision:'Original',
      condEmbarque:'FCL/FCL', tipoCarga:'Contenedorizada', refReserva:'BK-'+b.numero.slice(-5), incoterm:'FOB', termFlete:'Prepagado', negociable:false, via:'Depósito Temporal',
      entidad:DEPOSITOS[i%3].n, codAduana:DEPOSITOS[i%3].cod, ruc:DEPOSITOS[i%3].ruc, manifiesto:c.est==='POR REVISAR'?'':'2026-'+String(5100+i), estado:c.est, pago:c.conc && i===2 ? 'Liquidación pendiente' : '',
      ata:c.atd?'2026-10-17':'', atd:c.atd?'2026-10-18T23:30':'', version:c.est==='POR RECTIFICAR'?3:c.est==='POR REVISAR'?1:2, res:c.res||[], bl:c.bl||[], manual:c.manual||null,
      extRes:!!c.extRes, extBl:!!c.extBl, extemp:!!c.extemp, conceptos:!!c.conc, errores:c.err?[{codigo:'1302', descripcion:'El número de precinto de aduanas no corresponde al contenedor declarado.'}]:[], advertencias:[], info:c.bl?{detalle:String(i+3).padStart(4,'0'), electronico:'2350'+String(41000+i)}:null,
      equipos:eqs, carga:eqs.map(e=>({tipoBulto:'Pallets', equipo:e.numero, descripcion:e.descCarga||'MERCANCÍA GENERAL', cantidad:20, peso:e===eq&&c.cargaPeso?c.cargaPeso:20000, anio:'', modelo:'', marca:'', chasis:'', vins:'', volumen:30, marcas:'S/M', peligroso:false})),
      recargos:[{cargo:'THC', descripcion:'Terminal Handling Charge', tarifa:'150', unidad:'Contenedor', tipoCont:c.tipo, cantidad:1, condPago:'Prepagado', moneda:'USD', monto:150, lugar:'Callao', pagador:'Embarcador', precio:'150'}],
      descripciones:[{descripcion:'SHIPPER LOAD, STOW AND COUNT'}], roleo:null, badge:'', hist:[], cambios:[],
      audit:{c:'J. Ramos (Documentación)', cts:b.emision+'T08:30:00', u:'J. Ramos (Documentación)', ts:b.emision+'T16:00:00'}});
    if(i===4) o.carga = [];
    o.hist = [ev('Reserva generada por carga de Booking List','J. Ramos (Documentación)', b.emision+'T08:30:00')];
    o.res.forEach(t=>o.hist.push(ev(`Transmisión SUNAT ${t.c} (${COD[t.c]}): ${ST_SUNAT[t.st]}`,'Usuario SUNAT',t.ts,{code:t.c,status:t.st})));
    o.bl.forEach(t=>o.hist.push(ev(`Transmisión SUNAT ${t.c} (${COD[t.c]}): ${ST_SUNAT[t.st]}`,'Usuario SUNAT',t.ts,{code:t.c,status:t.st})));
    if(o.version>1) o.cambios.push({ver:2, origen:'Matriz', sobre:1, ts:b.emision+'T12:00:00', user:'Portal externo', campos:[{campo:'Consignatario', antes:'', despues:o.consignatario},{campo:'Notificante Principal', antes:'', despues:o.notificante}]});
    if(o.version>2) o.cambios.push({ver:3, origen:'Corrector 1', sobre:2, ts:b.emision+'T18:00:00', user:'Portal externo', comentario:'Se corrige la descripción según la factura comercial final del embarcador.', avisoTs:b.emision+'T18:01:00', campos:[{campo:'Descripción de la Carga', antes:'MERCANCIA', despues:eq.descCarga}]});
    S.exp.push(o); });
  [...new Set(S.exp.filter(b=>b.atd).map(b=>b.nave+'|'+b.viaje))].slice(0,1).forEach(k=>S.manifSalida.add(k));
  /* I-037: restricciones de exportación */
  const desde = diasISO(-200), hasta = diasISO(165);
  S.restr = [
    {id:'R1', tipo:'20DV', linea:'MSK', cliente:'', puerto:'', pais:'', payload:'25000', peso:'27000', desde, hasta, resp:'L. Torres (Jefatura de Documentación)', obs:'Límite de la línea para 20DV en el Pacífico.', activa:true},
    {id:'R2', tipo:'40HC', linea:'', cliente:'', puerto:'Shanghái', pais:'', payload:'', peso:'28000', desde, hasta, resp:'L. Torres (Jefatura de Documentación)', obs:'Restricción de carretera en destino.', activa:true},
    {id:'R3', tipo:'', linea:'', cliente:'MINERA CERRO AZUL S.A.A.', puerto:'', pais:'', payload:'26500', peso:'', desde, hasta, resp:'M. Salas (Comercial)', obs:'Acuerdo con el cliente por concentrado.', activa:true},
    {id:'R4', tipo:'', linea:'', cliente:'', puerto:'', pais:'Jamaica', payload:'', peso:'24000', desde:diasISO(-400), hasta:diasISO(-30), resp:'L. Torres (Jefatura de Documentación)', obs:'Temporada de lluvias 2025.', activa:true}];
  /* Direccionamiento */
  const bi = id => S.imp.find(b=>b.id===id);
  const rt = (id, b, est, x) => Object.assign({id, bl:b?b.numero:'', blProv:'', nave:b?b.nave:'', viaje:b?b.viaje:'', puerto:'Callao', linea:b?b.lineaCod:'ZIM', consignatario:b?b.consignatario:'', tipoDespacho:'Anticipado',
    entSol:DEPOSITOS[1].n, codSol:DEPOSITOS[1].cod, rucSol:DEPOSITOS[1].ruc, entApl:'', codApl:'', rucApl:'', estado:est, tipoRt:'Por BL (BL)'}, x||{});
  S.dir = [rt('D1', bi('I1'), 'Pendiente', {tipoRt:'Permanente (PER)'}), rt('D2', bi('I2'), 'Pendiente'), rt('D3', null, 'Provisional', {blProv:'ZIMUBOX0000019', nave:bx.nave, viaje:bx.viaje, consignatario:'IMPORTADORA LIMA NORTE S.A.C.'}),
    rt('D4', bi('I4'), 'Aprobado', {entApl:DEPOSITOS[1].n, codApl:DEPOSITOS[1].cod, rucApl:DEPOSITOS[1].ruc}), rt('D5', bi('I5'), 'Rechazado', {tipoDespacho:'Urgente'}), rt('D6', null, 'Anulado', {blProv:'ZIMUBOX0000020', nave:bx.nave, viaje:bx.viaje, consignatario:'FERRETERA ANDINA S.A.'}),
    rt('D7', bi('B19'), 'Pendiente', {entSol:DEPOSITOS[2].n, codSol:DEPOSITOS[2].cod, rucSol:DEPOSITOS[2].ruc})].filter(r=>r.nave);
  if(S.imp[3]) S.etb[S.imp[3].nave+'|'+S.imp[3].viaje] = Date.now() + 30*36e5;
  /* Cutoff existente */
  const e0 = S.exp[0]; if(e0){ const k = [e0.nave, e0.viaje, e0.puertoCarga].join('|');
    S.cut[k] = {id:'C1', nave:e0.nave, viaje:e0.viaje, puerto:e0.puertoCarga, manifiesto:'2026-5100', dry:masHoras(48), reefer:masHoras(36), matrices:masHoras(24), correctores:masHoras(60),
      grupos:[{puertos:['Rotterdam'], matrices:masHoras(20), correctores:masHoras(50)},{puertos:['Shanghái','Manzanillo'], matrices:masHoras(22), correctores:masHoras(55)},{puertos:[], matrices:'', correctores:''}],
      exc:[{id:'X1', reserva:e0.numero, embarcador:e0.embarcador, ruc:(CC.datos.socios.embarcadores.find(s=>s.razonSocial===e0.embarcador)||{}).ruc||'', tipo:'Matrices', amp:masHoras(30), exo:'', motivo:'El cliente solicitó ampliación por demora en la emisión del certificado fitosanitario.', apr:'L. Torres (Jefatura de Documentación)', aprTs:ahora(), marca:'', activa:true}]}; }
  window.addEventListener('cc:propuestas', ()=>{ const a = document.querySelector('section.panel.active'); if(a && CC._pantallas[a.id] && /^screenDoc/.test(a.id)) rerender(a.id); });
  return S;
}
const buscarBL = id => S.imp.find(b=>b.id===id) || S.exp.find(b=>b.id===id);
const voyInfo = (nave, nro) => { const v = CC.datos.viajes.find(x=>x.nave===nave && x.numero===nro); const b = [...S.imp,...S.exp].find(x=>x.nave===nave && x.viaje===nro);
  return {nave, numero:nro, puerto:v ? v.puerto : (b && S.exp.includes(b) ? b.puertoCarga : 'Callao'), eta:v ? v.eta : ''}; };
const naves = () => [...new Set([...S.imp, ...S.exp].map(b=>b.nave).concat(CC.datos.viajes.map(v=>v.nave)))].filter(Boolean).sort();
const viajesDe = nave => [...new Set([...S.imp, ...S.exp].filter(b=>b.nave===nave).map(b=>b.viaje).concat(CC.datos.viajes.filter(v=>v.nave===nave).map(v=>v.numero)))].filter(Boolean);
const dl = (id, lista) => `<datalist id="${id}">${lista.map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>`;

/* ---------- Utilidades de pantalla y diálogos ---------- */
function rerender(id){
  const s = $(id); if(!s) return; const sc = {}; s.querySelectorAll('.fac-scroll[id]').forEach(x=>sc[x.id] = x.scrollLeft);
  CC.refrescar(id); Object.keys(sc).forEach(k=>{ const x = $(k); if(x) x.scrollLeft = sc[k]; });
}
function refrescarActiva(){ const a = document.querySelector('section.panel.active'); if(a && /^screenDoc/.test(a.id)) rerender(a.id); }
function pager(total, page, size, fn){
  const pages = Math.max(1, Math.ceil(total/size)), b = (l,p,d,t)=>`<button type="button" title="${t}" ${d?'disabled':''} onclick="${fn}(${p})">${l}</button>`;
  return `<div class="cc-pager" style="border:none"><span>Items por página</span><select onchange="${fn}(1,Number(this.value))">${[5,10,25].map(n=>`<option ${n===size?'selected':''}>${n}</option>`).join('')}</select><span class="pg-n">${page} de ${pages}</span>${b('«',1,page<=1,'Primera página')}${b('‹',page-1,page<=1,'Página anterior')}${b('›',page+1,page>=pages,'Siguiente página')}${b('»',pages,page>=pages,'Última página')}</div>`;
}
function tabla(o){
  const cols = o.cols, filas = o.filas;
  return `<div class="fac-card" id="${o.id}"><div class="fac-head"><h3>${o.titulo}</h3>${o.acciones?`<div class="fac-acts">${o.acciones}</div>`:''}</div>${o.antes||''}
  <div class="fac-scroll" id="${o.id}Sc"><table class="fac-tbl doc-tbl"><thead><tr>${cols.map(c=>`<th>${c.t}</th>`).join('')}</tr></thead><tbody>
  ${filas.length ? filas.map(f=>`<tr${o.cls?` class="${o.cls(f)||''}"`:''}>${cols.map(c=>`<td>${typeof c.v==='function'?c.v(f):esc(f[c.v]??'')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="fac-empty">${o.vacio||'No se encontraron resultados con los criterios seleccionados'}</td></tr>`}
  </tbody></table></div>${o.pie!=null?`<div class="fac-btns" style="justify-content:space-between;align-items:center;flex-wrap:wrap">${o.pie}</div>`:''}</div>`;
}
const K = {};
function dlg(titulo, cuerpo, botones, tam){
  CC.modal(`<h3>${titulo}</h3><div class="doc-dlg">${cuerpo}</div><div class="fac-btns">${(botones||[]).map(b=>b[2]==='ghost'?ghost(b[0],b[1],b[3]):btn(b[0],b[1],b[2],b[3])).join('')}</div>`, tam);
}
function confirmar(titulo, texto, si, cbSi, no, cbNo){ K.si = cbSi; K.no = cbNo; dlg(titulo, `<p>${texto}</p>`, [[no||'Cancelar','docCbNo()','ghost'],[si||'Confirmar','docCbSi()']]); }
function aviso(titulo, cuerpo, cb){ K.si = cb; dlg(titulo, cuerpo, [['Entendido','docCbSi()']]); }
window.docCbSi = () => { const f = K.si; K.si = K.no = null; CC.cerrarModal(); if(f) f(); };
window.docCbNo = () => { const f = K.no; K.si = K.no = null; CC.cerrarModal(); if(f) f(); };
function pedirMotivo(o){
  K.mot = o; const min = o.min ?? 10, max = o.max ?? 100;
  dlg(o.titulo||'Motivo', `${o.texto?`<p>${o.texto}</p>`:''}<div class="fac-f"><label>${o.label||'Motivo'} *</label><textarea id="docMotTxt" rows="3" maxlength="${max+50}" oninput="document.getElementById('docMotCnt').textContent=this.value.length+' / ${max}'"></textarea><div class="doc-cnt-row"><span class="doc-err" id="docMotErr"></span><span id="docMotCnt">0 / ${max}</span></div></div>${o.extra||''}`,
    [['Cancelar','docCbNo()','ghost'],[o.boton||'Confirmar','docMotOk()']]);
  setTimeout(()=>$('docMotTxt')?.focus(), 40);
}
window.docMotOk = () => { const o = K.mot, t = ($('docMotTxt').value||'').trim(), min = o.min ?? 10, max = o.max ?? 100, e = $('docMotErr');
  if(!t){ e.textContent = 'El motivo es obligatorio.'; return; } if(t.length < min){ e.textContent = `Mín. ${min} caracteres.`; return; } if(t.length > max){ e.textContent = `Máx. ${max} caracteres.`; return; }
  const extra = o.leer ? o.leer() : null; if(extra===false) return; K.mot = null; CC.cerrarModal(); o.cb(t, extra); };
function procesando(titulo, texto, ms, cb, cancelable){
  dlg(titulo, `<p>${texto}</p><div class="doc-prog"><span style="animation-duration:${ms}ms"></span></div>`, cancelable ? [['Cancelar','docProcCancelar()','ghost']] : []);
  K.proc = setTimeout(()=>{ K.proc = null; CC.cerrarModal(); cb(); }, ms); K.procCb = cb; K.procTxt = [titulo, texto, ms];
}
window.docProcCancelar = () => { clearTimeout(K.proc); const [t, x] = K.procTxt;
  confirmar('Cancelar Proceso', '¿Está seguro de que desea cancelar el proceso? Esta acción no se puede deshacer.', 'Sí, cancelar', ()=>CC.toast('Proceso cancelado','info'), 'No', ()=>procesando(t, x, 800, K.procCb, true)); };
function descargarTxt(nombre, texto){ try{ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], {type:'text/plain'})); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); }catch(e){} }
function sello(fecha){ const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`; }
const chipBL = e => e ? CC.chipEstado(e, TONO[e]) : '';
const estSunat = t => t ? `<span title="${esc(`Usuario SUNAT: ${t.user}\nFecha transmisión: ${fdt(t.ts)}${t.motivo?`\nMotivo: ${t.motivo}`:''}`)}">${ST_SUNAT[t.st]}</span>` : '';
const ultTx = t => t ? `${t.c}<div class="doc-mut">${fdt(t.ts)}</div>` : '';
const auditoria = b => `<div class="doc-aud"><span>${esc(b.audit.u)}</span><span class="doc-mut">${fdt(b.audit.ts)}</span></div>`;
function tocar(b){ b.audit.u = CC.usuario(); b.audit.ts = ahora(); }

/* ---------- SUNAT: transmisión simulada (Pendiente y luego respuesta) ---------- */
function transmitir(b, lista, code, motivo, alTerminar){
  const t = tx(code, 'PENDING', {user:CC.usuario(), motivo:motivo||''}); t.env = t.ts; b[lista].push(t);
  b.hist.push(ev(`Transmisión SUNAT ${code} (${COD[code]}) enviada${motivo?`. Motivo: ${motivo}`:''}`, CC.usuario(), t.ts, {code, status:'PENDING'}));
  refrescarActiva();
  setTimeout(()=>{
    const falla = b.falla===code || (code==='0102' && b.fallaTrbLote);
    t.st = falla ? 'ERROR' : 'COMPLETED'; t.ts = ahora();
    if(falla){ b.falla = null; b.errores = [{codigo:'0127', descripcion:'El peso bruto del contenedor no coincide con el manifiesto de carga.'}]; }
    else { b.errores = []; aplicarEfecto(b, code); }
    b.hist.push(ev(`Respuesta SUNAT ${code} (${COD[code]}): ${ST_SUNAT[t.st]}`, 'Usuario SUNAT', t.ts, {code, status:t.st}));
    if(alTerminar) alTerminar(t); refrescarActiva();
  }, 900);
}
function aplicarEfecto(b, c){
  if(c==='0103'){ b.estado = 'TRANSMITIDO A SUNAT'; b.info = b.info || {detalle:String(++S.seq).padStart(4,'0'), electronico:'1180'+String(560000+S.seq)}; }
  if(c==='0102' || c==='0153' || c==='0154'){ b.estado = 'TRANSMITIDO A SUNAT'; if(!b.info) b.info = {detalle:String(++S.seq).padStart(4,'0'), electronico:'2350'+String(42000+S.seq)}; }
  if(c==='0104') b.estado = 'Anulado';
  if(c==='0156') b.estado = 'APROBADO';
}
/* Reglas de importación (0103, 0102, 0104) */
function reglasImp(b){
  const l = last(b.sunat), r = {'0103':'', '0102':'', '0104':''}, no = (c, m) => { r[c] = r[c] || m; };
  if(l && l.st==='PENDING'){ Object.keys(r).forEach(c=>no(c, 'Existe una transmisión SUNAT en curso. Espere a que finalice para continuar.')); return r; }
  if(!l){ if(b.estado!=='APROBADO') no('0103','Solo se transmite un BL en estado APROBADO.'); no('0102','Primero debe transmitir la incorporación (0103).'); no('0104','Primero debe transmitir la incorporación (0103).'); }
  else if(l.c==='0103' && l.st==='ERROR'){ no('0102','La incorporación (0103) terminó con error: reintente 0103.'); no('0104','La incorporación (0103) terminó con error: reintente 0103.'); }
  else if(l.c==='0104' && l.st==='COMPLETED'){ Object.keys(r).forEach(c=>no(c,'El manifiesto del BL ya fue anulado (0104).')); }
  else no('0103','La incorporación (0103) ya fue transmitida.');
  if(!r['0102'] && b.estado!=='POR RECTIFICAR') no('0102','La rectificación (0102) requiere el estado POR RECTIFICAR.');
  if(!r['0104'] && !['APROBADO','TRANSMITIDO A SUNAT','POR RECTIFICAR'].includes(b.estado)) no('0104','La anulación (0104) no aplica al estado actual del BL.');
  if(b.solicitud){ no('0102','No se puede rectificar: ya existe un N° de Solicitud de Transbordo.'); no('0104','No se puede anular: ya existe un N° de Solicitud de Transbordo.'); }
  return r;
}
function iconosImp(b, pref){
  const r = reglasImp(b), l = last(b.sunat), o = [];
  if(l && l.st==='ERROR' || b.errores.length) o.push(ico('error','Ver detalle de error SUNAT',`docSunatDet('${b.id}','err')`,{cls:'rojo'}));
  if(b.advertencias.length) o.push(ico('adv','Ver detalle de advertencia SUNAT',`docSunatDet('${b.id}','adv')`,{cls:'ambar'}));
  [['0103','enviar','Transmitir a SUNAT'],['0102','rect','Rectificar transmisión SUNAT'],['0104','cancel','Cancelar transmisión SUNAT']].forEach(([c,k,t])=>o.push(ico(k, r[c] ? `${t} (${c}): ${r[c]}` : `${t} (${c})`, `docImpSunat('${b.id}','${c}')`, {dis:!!r[c]})));
  return `<div class="doc-sunat">${estSunat(l)}<span class="doc-ics">${o.join('')}</span></div>`;
}
window.docSunatDet = (id, k) => { const b = buscarBL(id), l = k==='err' ? b.errores : b.advertencias;
  dlg(k==='err'?'Detalle de errores SUNAT':'Detalle de advertencias SUNAT', l.length ? `<table class="fac-tbl"><thead><tr><th>Código</th><th>Descripción</th></tr></thead><tbody>${l.map(x=>`<tr><td>${esc(x.codigo)}</td><td style="white-space:normal">${esc(x.descripcion)}</td></tr>`).join('')}</tbody></table>`
    : `<p>${k==='err'?'No se encontraron errores SUNAT para este BL':'No se encontraron advertencias SUNAT para este BL'}</p>`, [['Cerrar','docCbSi()']]); };
window.docInfoSunat = id => { const b = buscarBL(id), i = b.info || {};
  dlg('Informativos SUNAT', `<dl class="fac-kv"><dt>Número de Detalle</dt><dd>${esc(i.detalle||'Sin datos')}</dd><dt>Número Electrónico</dt><dd>${esc(i.electronico||'Sin datos')}</dd></dl>`, [['Cerrar','docCbSi()']]); };
window.docImpSunat = (id, c) => {
  const b = buscarBL(id), m = reglasImp(b)[c]; if(m){ CC.toast(m,'error'); return; }
  const enviar = mot => transmitir(b, 'sunat', c, mot, t=>CC.toast(t.st==='COMPLETED'?'Transmisión a SUNAT realizada exitosamente':'Error al transmitir a SUNAT', t.st==='COMPLETED'?'success':'error'));
  confirmar('Confirmar transmisión SUNAT', `Se enviará la transmisión SUNAT ${c} (${COD[c]}). ¿Está seguro de continuar?`, 'Confirmar', ()=>{
    if(c==='0103'){ enviar(''); return; }
    pedirMotivo({titulo:'Motivo', texto:c==='0102'?'Ingrese el motivo de rectificación SUNAT (0102).':'Ingrese el motivo de anulación SUNAT (0104).', max:200, cb:mot=>{
      const v = voyInfo(b.nave, b.viaje), eta = v.eta ? new Date(v.eta+'T12:00:00').getTime() : 0;
      if(c==='0102' && eta && eta - Date.now() < 864e5 && eta > Date.now()) confirmar('Advertencia de ETA','La ETA del viaje es en menos de 24 horas. ¿Desea continuar con la rectificación?','Continuar',()=>enviar(mot));
      else enviar(mot); }});
  });
};

/* ---------- Historial del BL (Cambios y Eventos) ---------- */
window.docHist = (id, soloEventos) => { const b = buscarBL(id); K.h = {b, tab:soloEventos?'ev':'cam', solo:!!soloEventos, f:{ver:'', origen:'', campo:''}, linea:null}; pintarHist(); };
function pintarHist(){
  const h = K.h, b = h.b, cams = b.cambios || [], campos = [...new Set(cams.flatMap(c=>c.campos.map(x=>x.campo)))];
  const evs = b.hist.slice().reverse().map((e,i)=>`<tr><td>${fdt(e.ts)}</td><td>${esc(e.user)}</td><td style="white-space:normal">${esc(e.comment)}${h.linea===i&&e.sunat?`<ol class="doc-linea"><li>Enviado a SUNAT por ${esc(e.user)}</li><li>Recibido por SUNAT</li><li>Respuesta: ${esc(ST_SUNAT[e.sunat.status]||e.sunat.status)} (${esc(e.sunat.code)})</li></ol>${PV()?txDatosHtml(b, e):''}`:''}</td><td>${e.sunat?ico('linea','Ver línea de tiempo de auditoría',`docHistLinea(${i})`):''}</td></tr>`).join('');
  const evT = `<table class="fac-tbl"><thead><tr><th>Fecha</th><th>Usuario</th><th>Comentario</th><th></th></tr></thead><tbody>${evs||'<tr><td colspan="4" class="fac-empty">Sin eventos</td></tr>'}</tbody></table>`;
  const vis = cams.filter(c=>(!h.f.ver||String(c.ver)===h.f.ver) && (!h.f.origen||(h.f.origen==='Portal'?c.origen!=='Edición interna':c.origen==='Edición interna'))).map(c=>({...c, campos:c.campos.filter(x=>!h.f.campo||x.campo===h.f.campo)})).filter(c=>c.campos.length);
  const camT = `<div class="fac-g4">${campo('Versión',`<input type="number" min="1" value="${esc(h.f.ver)}" onchange="docHistF('ver',this.value)">`)}${campo('Origen',sel(['Todos','Portal','Edición interna'],h.f.origen||'Todos',`onchange="docHistF('origen',this.value==='Todos'?'':this.value)"`))}${campo('Campo',sel(['Todos',...campos],h.f.campo||'Todos',`onchange="docHistF('campo',this.value==='Todos'?'':this.value)"`))}<div class="fac-f"><label>&nbsp;</label>${ghost('Limpiar filtros','docHistF()')}</div></div>${PV()?leyendaAprob(b):''}
    ${vis.length ? vis.slice().reverse().map(c=>`<div class="doc-ver"><div class="doc-ver-h"><b>V${c.ver}</b><span class="cc-chip">${esc(c.origen)}</span>${c.sobre?`<span class="cc-chip">Sobre la V${c.sobre}</span>`:''}<span class="doc-mut">${c.campos.length} ${c.campos.length===1?'campo':'campos'} · ${esc(c.user)} · ${fdt(c.ts)}</span>${PV()?chipAprob(c, b):''}</div>${PV()&&c.comentario?`<p ${CC.propuesta('I-078','Comentario del corrector')} style="margin:6px 0"><b>Comentario del cliente:</b> ${esc(c.comentario)}</p>`:''}
      <table class="fac-tbl"><thead><tr><th>Campo</th><th>Antes</th><th>Después</th>${PV()?`<th>Estado de aprobación ${CC.marca('Agrega','HU-DOC-22','I-080','PEN-I080-01')}</th>`:''}</tr></thead><tbody>${c.campos.map(x=>`<tr${PV()?` style="${estiloAprob(c, b)}"`:''}><td>${esc(x.campo)}</td><td>${x.antes===''?'<span class="doc-mut">Sin valor</span>':esc(x.antes)}</td><td>${x.despues===''?'<span class="doc-mut">Vacío</span>':esc(x.despues)}</td>${PV()?`<td>${esc(estadoAprob(c, b))}</td>`:''}</tr>`).join('')}</tbody></table></div>`).join('') : '<p class="doc-mut">Aún no hay cambios de campos registrados para este BL</p>'}`;
  CC.modal(`<h3>Historial <span class="doc-mut">${esc(b.numero||'Pendiente')}</span></h3>${PV()?vinculoTrb(b):''}${h.solo?evT:`<div class="fac-tabs"><button type="button" class="${h.tab==='cam'?'on':''}" onclick="docHistTab('cam')">Cambios</button><button type="button" class="${h.tab==='ev'?'on':''}" onclick="docHistTab('ev')">Eventos</button></div>${h.tab==='cam'?camT:evT}`}<div class="fac-btns">${btn('Cerrar','docCbSi()')}</div>`, 'lg');
}
window.docHistTab = t => { K.h.tab = t; pintarHist(); };
window.docHistF = (k, v) => { if(!k) K.h.f = {ver:'', origen:'', campo:''}; else K.h.f[k] = v; pintarHist(); };
window.docHistLinea = i => { K.h.linea = K.h.linea===i ? null : i; pintarHist(); };

/* =====================================================================
   IMPORTACIÓN > DOCUMENTOS: Consulta y carga
===================================================================== */
const FI0 = () => ({nave:'', viaje:'', bl:'', ind:'', mani:'', desde:'', hasta:'', est:'', pago:'', prov:false});
function filasImp(){
  const q = S.fi.q;
  return S.imp.filter(b=>has(b.nave,q.nave) && (!q.viaje||b.viaje===q.viaje) && has(b.numero,q.bl) && (!q.ind||b.indicador===q.ind) && has(b.manifiesto,q.mani)
    && (!q.desde||(b.emision&&b.emision>=q.desde)) && (!q.hasta||(b.emision&&b.emision<=q.hasta)) && (!q.est||b.estado===q.est) && (!q.pago||b.pago===q.pago) && (!q.prov||b.provisional));
}
function htmlImp(){
  seed(); if(!('nave' in S.fi.f)){ S.fi.f = FI0(); S.fi.q = FI0(); }
  const f = S.fi.f, all = filasImp(), pg = CC.paginar(all, S.fi.pag, S.fi.tam), selN = S.fi.sel.size;
  const filtros = `<div class="fac-card" id="docIF"><div class="fac-head"><div><h3>Consulta y carga</h3><div class="fac-sub">Ingresar datos y/o documentos</div></div><div class="fac-acts"><span ${CC.propuesta('I-062','Configuración de avisos')}>${ghost('Configurar avisos',"docAvAbrir('Llegada')",'id="docIAvBtn"')}</span><span ${CC.propuesta('I-060','Recargos TUR')}>${ghost('Cargar recargos TUR',"docTurAbrir('imp')",'id="docITurBtn"')}</span>${ghost('Cargar archivos',"docUpAbrir('imp')")}${btn('Nuevo','docImpNuevo()')}</div></div>
    <div class="fac-g4">
      ${campo('Nave',`<input id="docINave" list="docINaves" placeholder="Ingresar nave" value="${esc(f.nave)}" onchange="docIF('nave',this.value)">${dl('docINaves',naves())}`)}
      ${campo('Número de Viaje',`<input id="docIViaje" list="docIViajes" placeholder="Ingresar número de viaje" value="${esc(f.viaje)}" ${f.nave?'':'disabled'} onchange="docIF('viaje',this.value)">${dl('docIViajes',viajesDe(f.nave))}`)}
      ${campo('Número BL',`<input id="docIBl" placeholder="Ingresar número de BL" value="${esc(f.bl)}" onchange="docIF('bl',this.value)">`)}
      ${campo('Indicador',sel(IND_IMP,f.ind,`id="docIInd" onchange="docIF('ind',this.value)"`,'Elegir indicador'))}
      ${campo('Número de Manifiesto',`<input placeholder="Ingresar número de manifiesto" value="${esc(f.mani)}" onchange="docIF('mani',this.value)">`)}
      ${campo('Fecha de Emisión',`<div class="fac-range"><input type="date" value="${f.desde}" onchange="docIF('desde',this.value)"><input type="date" value="${f.hasta}" onchange="docIF('hasta',this.value)"></div>`)}
      ${campo('Estado BL',sel(ST_BL,f.est,`id="docIEst" onchange="docIF('est',this.value)"`,'Elegir estado BL'))}
      ${campo('Estado Pago',sel(ST_PAGO,f.pago,`id="docIPay" onchange="docIF('pago',this.value)"`,'Elegir estado pago'))}
      <label class="doc-chk"><input type="checkbox" id="docIProv" ${f.prov?'checked':''} onchange="docIF('prov',this.checked)"> Solo Mostrar BL Provisionales</label>
    </div><div class="fac-btns">${btn('Buscar','docIBuscar()')}${btn('Limpiar','docILimpiar()')}</div></div>`;
  const todos = pg.filas.length && pg.filas.every(b=>S.fi.sel.has(b.id));
  const cols = [
    {t:`<input type="checkbox" title="Seleccionar página" ${todos?'checked':''} onchange="docISelPag(this.checked)">`, v:b=>`<input type="checkbox" ${S.fi.sel.has(b.id)?'checked':''} onchange="docISel('${b.id}',this.checked)">`},
    {t:'Número BL', v:b=>`<button type="button" class="fac-link" onclick="docImpEditar('${b.id}')">${esc(b.numero||'Pendiente')}</button>`},
    {t:'Consignatario', v:'consignatario'},{t:'Nave', v:'nave'},{t:'Número de Viaje', v:'viaje'},{t:'Fecha de Emisión', v:b=>fd(b.emision)},{t:'Número de Manifiesto', v:'manifiesto'},
    {t:'Puerto Carga', v:'puertoCarga'},{t:'Puerto Descarga', v:'puertoDescarga'},{t:'Puerto Final', v:'puertoFinal'},{t:'Tipo de BL', v:'tipo'},{t:'Indicador', v:'indicador'},
    {t:'Estado BL', v:b=>chipBL(b.estado)},{t:'Estado Pago', v:'pago'},{t:'Auditoría', v:auditoria},{t:'Última Tx SUNAT', v:b=>ultTx(last(b.sunat))},
    {t:'Estado SUNAT', v:b=>iconosImp(b)},{t:'Informativos SUNAT', v:b=>ico('info','Informativos SUNAT',`docInfoSunat('${b.id}')`,{dis:!b.sunat.length})},
    {t:'Ver historial', v:b=>ico('hist','Ver historial',`docHist('${b.id}')`)},{t:'Fecha Descarga (COARRI)', v:b=>fd(b.coarri)},
    {t:'Acciones', v:b=>ico('desc','Descargar Aviso de Llegada',`docPdf('Aviso de Llegada','${b.id}')`,{dis:b.provisional})}];
  const res = tabla({id:'docIRes', titulo:`Resultados (${all.length})`, cols, filas:pg.filas,
    acciones:`${btn('Transmitir BL','docImpLote()')}${ghost('Aviso de llegada','docAvisoLlegada()')}${ghost('Enviar CDL',"docCdl('enviar')")}${ghost('Enviar Discrepancias','docDiscrepancias()')}<span ${CC.propuesta('I-055','Eliminación en bloque')}>${ghost('Eliminar BL en bloque',"docElAbrir('imp')",'id="docIElBtn"')}</span>${selN?`<span class="doc-mut">${selN} seleccionado(s)</span>`:''}`,
    pie:`<div class="fac-acts">${ghost('Exportar','docImpExportar()')}<span title="Incluye los BL de la nave y viaje seleccionados, o los de todas las naves en el rango de fecha de emisión (máximo un mes).">${ghost('Reporte de Documentación',"docReporte('imp')",'id="docIRep"')}</span>${ghost('Descargar CDL',"docCdl('descargar')")}</div>${pager(all.length, pg.pagina, S.fi.tam, 'docIPag')}`});
  return filtros + res;
}
window.docIF = (k, v) => { S.fi.f[k] = v; if(k==='nave'){ S.fi.f.viaje = ''; rerender('screenDocImp'); } };
window.docIBuscar = () => { S.fi.q = clone(S.fi.f); S.fi.pag = 1; S.fi.sel.clear(); rerender('screenDocImp'); };
window.docILimpiar = () => { S.fi.f = FI0(); S.fi.q = FI0(); S.fi.pag = 1; S.fi.sel.clear(); rerender('screenDocImp'); };
window.docIPag = (p, t) => { if(t) S.fi.tam = t; S.fi.pag = p; rerender('screenDocImp'); };
window.docISel = (id, on) => { S.fi.sel[on?'add':'delete'](id); rerender('screenDocImp'); };
window.docISelPag = on => { CC.paginar(filasImp(), S.fi.pag, S.fi.tam).filas.forEach(b=>S.fi.sel[on?'add':'delete'](b.id)); rerender('screenDocImp'); };
window.docPdf = (que, id) => { const b = buscarBL(id); CC.toast(que==='BL'?'Generando PDF del BL...':`Generando PDF del ${que}...`,'info'); setTimeout(()=>{ b.hist.push(ev(`Descarga de ${que} en PDF`, CC.usuario())); CC.toast(`${que} ${b.numero} descargado en PDF`,'success'); }, 500); };
const selImp = () => S.imp.filter(b=>S.fi.sel.has(b.id));
window.docAvisoLlegada = () => {
  const l = selImp(); if(!l.length){ CC.toast('Debe seleccionar al menos un BL.','error'); return; }
  if(l.some(b=>b.indicador!=='Importación')){ CC.toast("Solo se puede enviar a BLs con indicador 'IMPORTACIÓN'.",'error'); return; }
  if(l.some(b=>S.sinEmail.has(b.consignatario))){ CC.toast('Uno o más BLs seleccionados no tienen destinatarios de email configurados. Revise los contactos de tipo Importación del consignatario.','error'); return; }
  l.forEach(b=>b.hist.push(ev('Aviso de llegada enviado por correo', CC.usuario())));
  CC.toast(l.length>1?'Emails de BLs fueron enviados exitosamente':'Email de BL fue enviado exitosamente','success');
};
window.docDiscrepancias = () => {
  if(!S.fi.q.viaje){ CC.toast('Ingrese el número de viaje para enviar las discrepancias.','error'); return; }
  dlg('Enviar Email', `<p>Por favor seleccione al destinatario que recibirá el email</p>${campo('Destinatario *', sel(['Cliente','Terminal'],'','id="docDisDest"','Elegir destinatario'))}`, [['Cancelar','docCbNo()','ghost'],['Enviar Email','docDisEnviar()']]);
};
window.docDisEnviar = () => { const d = $('docDisDest').value; if(!d){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(d==='Cliente' && !S.fi.sel.size){ CC.toast("Por favor seleccione al menos un BL para el destinatario 'CLIENTE'.",'error'); return; }
  CC.cerrarModal(); CC.toast('El correo de discrepancias ha sido enviado exitosamente','success'); };
window.docCdl = modo => {
  const q = S.fi.q; if(!q.viaje){ CC.toast('Ingrese el número de viaje para generar el CDL.','error'); return; }
  const v = voyInfo(q.nave || (S.imp.find(b=>b.viaje===q.viaje)||{}).nave, q.viaje), term = TERMINAL(v.puerto);
  if(!term){ CC.toast('El terminal del viaje no está configurado para generar el CDL.','error'); return; }
  const bls = S.imp.filter(b=>b.viaje===q.viaje && b.nave===v.nave), eqs = bls.flatMap(b=>b.equipos.map(e=>({b, e})));
  const errs = eqs.filter(x=>!x.e.sellos.length).map(x=>`Contenedor ${x.e.numero} del BL ${x.b.numero||'Pendiente'} sin sellos registrados.`);
  K.cdl = {modo, v, term, bls, eqs};
  dlg('Validación CDL', `<div class="fac-sec">Mensajes Generales</div><ul class="doc-ul"><li>Formato del terminal: ${esc(term)}</li><li>Viaje ${esc(v.numero)}: ${bls.length} BL y ${eqs.length} contenedores.</li></ul>
    <div class="fac-sec">Mensajes de Error</div>${errs.length?`<ul class="doc-ul err">${errs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="doc-mut">Sin errores.</p>'}${PV()?cdlPrev(K.cdl):''}`,
    errs.length ? [['Cerrar','docCbSi()']] : [['Cancelar','docCbNo()','ghost'],[modo==='enviar'?'Enviar':'Descargar','docCdlOk()']], PV() ? 'lg' : undefined);
};
window.docCdlOk = () => { const c = K.cdl; CC.cerrarModal();
  if(c.modo==='enviar'){ CC.toast('El correo ha sido enviado exitosamente','success'); return; }
  const cab = ['Número BL','Contenedor','Tipo','Peso Bruto (KG)','Sellos','Puerto Descarga'], fila = x=>[x.b.numero, x.e.numero, x.e.tipo, x.e.peso||x.e.vgm, x.e.sellos.map(s=>s.numero).join(' '), x.b.puertoDescarga];
  if(PV()) CC.exportarExcel(`CDL_${c.term.replace(/\s/g,'')}_${c.v.numero}`, 'CDL', [...cab,'Régimen','Receptor de carga','Bultos manifestados','Commodities','Peso manifestado (kg)','Observaciones'], c.eqs.map(x=>{ const r = cdlFila(x, c.term); return [...fila(x), r.reg, r.rec, r.bultos, r.com, r.peso, r.obs||'']; }));
  else CC.exportarExcel(`CDL_${c.term.replace(/\s/g,'')}_${c.v.numero}`, 'CDL', cab, c.eqs.map(fila));
  CC.toast('El archivo ha sido descargado exitosamente.','success'); };
window.docImpExportar = () => CC.exportarExcel(`Importaciones_${sello()}`, 'Importaciones', ['Número BL','Consignatario','Nave','Número de Viaje','Fecha de Emisión','Número de Manifiesto','Puerto Carga','Puerto Descarga','Puerto Final','Tipo de BL','Indicador','Estado BL','Estado Pago','Última Tx SUNAT','Estado SUNAT'],
  filasImp().map(b=>{ const l = last(b.sunat); return [b.numero||'Pendiente', b.consignatario, b.nave, b.viaje, fd(b.emision), b.manifiesto, b.puertoCarga, b.puertoDescarga, b.puertoFinal, b.tipo, b.indicador, b.estado, b.pago, l?l.c:'', l?ST_SUNAT[l.st]:'']; }));
window.docReporte = k => {
  const q = (k==='imp'?S.fi:S.fe).q, lista = k==='imp' ? S.imp : S.exp;
  if(!((q.nave && q.viaje) || (q.desde && q.hasta))){ CC.toast('Selecciona una nave y un viaje, o un rango de fechas de emisión, para descargar el reporte.','error'); return; }
  if(q.desde && q.hasta && (new Date(q.hasta) - new Date(q.desde)) > 31*864e5){ CC.toast('El rango de fechas de emisión no puede superar un mes.','error'); return; }
  const b0 = $(k==='imp'?'docIRep':'docERep'); if(b0){ b0.textContent = 'Generando reporte...'; b0.disabled = true; }
  setTimeout(()=>{ const rows = lista.filter(b=>(q.nave&&q.viaje) ? b.nave===q.nave && b.viaje===q.viaje : (b.emision>=q.desde && b.emision<=q.hasta));
    CC.exportarExcel(`Reporte_Documentacion_${k==='imp'?'Importacion':'Exportacion'}_${sello()}`, 'Reporte', ['Número','Nave','Viaje','Indicador','Estado BL','Estado Pago','Contenedores'], rows.map(b=>[b.numero||'Pendiente', b.nave, b.viaje, b.indicador, b.estado, b.pago, b.equipos.length]));
    rerender(k==='imp'?'screenDocImp':'screenDocExp'); }, 400);
};
/* Transmitir BL en lote (Importación) */
window.docImpLote = () => {
  const l = selImp(); if(!l.length){ CC.toast('Debe seleccionar al menos un BL antes de transmitir a SUNAT.','error'); return; }
  if(l.length>20){ CC.toast('Puede seleccionar como máximo 20 BL por transmisión.','error'); return; }
  const el = b => { const r = reglasImp(b); return !r['0103'] ? '0103' : !r['0102'] ? '0102' : ''; };
  if(!l.some(el)){ CC.toast('Ninguno de los BLs seleccionados es elegible para transmitir a SUNAT según las reglas de negocio vigentes.','error'); return; }
  K.lote = l.map(b=>({b, c:el(b)}));
  dlg('Transmitir BL', `<table class="fac-tbl"><thead><tr><th>Número BL</th><th>Estado</th></tr></thead><tbody>${K.lote.map(x=>`<tr><td>${esc(x.b.numero||'Pendiente')}</td><td>${x.c?CC.chipEstado('Elegible','aprobada'):CC.chipEstado('No elegible','anulada')}</td></tr>`).join('')}</tbody></table>`, [['Cancelar','docCbNo()','ghost'],['Transmitir','docImpLoteOk()']], 'md');
};
window.docImpLoteOk = () => { CC.cerrarModal(); const lote = K.lote, ok = lote.filter(x=>x.c);
  procesando('Transmitir BL', 'Procesando transmisión a SUNAT, espere…', 1000, ()=>{
    const res = ok.map(x=>{ const pend = x.b.falla===x.c ? ['Peso Bruto (KG)','Partida Arancelaria'] : []; transmitir(x.b, 'sunat', x.c, 'Transmisión en lote'); return {b:x.b, ok:!pend.length, pend, conc:x.b.sinConceptos?0:2}; });
    K.res = res; const nOk = res.filter(r=>r.ok).length, ex = lote.filter(x=>!x.c);
    dlg('Resultado de transmisión a SUNAT', `<p><b>Transmitidos correctamente: ${nOk}. Con error: ${res.length-nOk}.</b></p>
      ${ex.length?`<p>De ${lote.length} BLs evaluados, ${ok.length} se procesaron. ${ex.length} no se procesaron:</p><ul class="doc-ul">${ex.map(x=>`<li>${esc(x.b.numero||'Pendiente')}</li>`).join('')}</ul>`:''}
      <table class="fac-tbl"><thead><tr><th>Número BL</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>${res.map(r=>`<tr><td>${esc(r.b.numero)}</td><td>${r.ok?CC.chipEstado('Correcto','aprobada'):CC.chipEstado('Error','rechazada')}</td>
      <td style="white-space:normal">${r.ok?`Conceptos de pago insertados: ${r.conc}`:`${r.pend.length} campos pendientes <details><summary>Ver detalle</summary><ul class="doc-ul">${r.pend.map(p=>`<li title="Ruta XML del campo: /Manifiesto/BL/${esc(p.replace(/\W/g,''))}">${esc(p)}</li>`).join('')}</ul></details>`}</td></tr>`).join('')}</tbody></table>`,
      [['Aceptar','docLoteAceptar()']], 'md');
  }, true); };
window.docLoteAceptar = () => { CC.cerrarModal(); const sin = (K.res||[]).filter(r=>r.ok && r.b.sinConceptos);
  if(sin.length) aviso('BL sin conceptos de pago', `<p>Los siguientes números de BL no generaron conceptos de pago (la transmisión del lote siguió según las reglas aplicables):</p><ul class="doc-ul">${sin.map(r=>`<li>${esc(r.b.numero)}</li>`).join('')}</ul>`); };

/* Cargar archivos (Importación y Exportación) */
const TA_IMP = [['MRR','MRR'],['MR','MR'],['BAPLIE','BAPLIE'],['SOC','SOC'],['SBL','SBL'],['DFD','Días libres (DFD)'],['LDD','Listado de Descarga (LDD)']];
const TA_EXP = [['LLR','Loading List (LLR)'],['BLL','Booking List (BLL)'],['CBR','Cargo List (CBR)']];
function conSucursal(nave, viaje, go){
  const v = voyInfo(nave, viaje);
  if(v.puerto && v.puerto!==SUCURSAL) confirmar('Advertencia de Sucursal', `El viaje seleccionado pertenece a la sucursal ${esc(v.puerto)}, pero la sucursal activa es ${SUCURSAL}. ¿Desea continuar de todas formas?`, 'Continuar', go);
  else go();
}
window.docUpAbrir = k => {
  const q = (k==='imp'?S.fi:S.fe).f;
  if(!q.nave || !q.viaje){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  const go = () => { K.up = {k, nave:q.nave, viaje:q.viaje, servicio:'', ind:k==='imp'?'Importación':'', afecta:'', linea:'', tipo:'', files:[], err:''}; pintarUp(); };
  if(k==='exp') conSucursal(q.nave, q.viaje, go); else go();
};
function pintarUp(){
  const u = K.up, imp = u.k==='imp', liner = u.servicio==='LINER', TA = imp ? TA_IMP : TA_EXP;
  CC.modal(`<h3>Cargar archivos</h3><div class="fac-sec">${imp?'Información BL':'Información de Reserva'}</div>
    <div class="fac-g3">${CC.campoLectura('Número de Viaje', u.viaje)}${CC.campoLectura('Nave', u.nave)}
    ${campo('Tipo de Servicio *', sel(['LINER','TRAMP'], u.servicio, `id="docUpSrv" onchange="docUpSet('servicio',this.value)"`, 'Elegir tipo de servicio'))}
    ${imp?campo('Indicador', sel(IND_IMP, u.ind, `onchange="docUpSet('ind',this.value)"`)):''}
    ${!imp&&liner?campo('Afecta a *', sel(['Solo reservas','Solo CAL/VGM','Reservas y CAL/VGM'], u.afecta, `id="docUpAfe" onchange="docUpSet('afecta',this.value)"`, 'Elegir')):''}
    ${liner?campo('Línea *', sel(CC.datos.lineas.map(l=>[l.codigo,l.nombre]), u.linea, `id="docUpLin" onchange="docUpSet('linea',this.value)"`, 'Elegir línea')):''}
    ${liner?campo('Tipo de Archivo *', sel(TA, u.tipo, `id="docUpTipo" onchange="docUpSet('tipo',this.value)"`, 'Elegir tipo de archivo')):''}</div>
    <label class="doc-drop"><input type="file" id="docUpFile" accept="${liner?(imp?'.xlsx,.xls,.pdf':'.xlsx,.xls'):'.pdf'}" onchange="docUpFile(this)"><span>Arrastre o seleccione el archivo ${liner?'Excel':'PDF'}</span></label>
    ${u.err?`<div class="fac-note err" id="docUpErr">${esc(u.err)}</div>`:''}
    <table class="fac-tbl"><thead><tr><th></th><th>Archivo</th><th>Tipo de Archivo</th><th>Fecha</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
    ${u.files.map((f,i)=>`<tr><td><input type="checkbox" ${f.sel?'checked':''} onchange="docUpSelF(${i},this.checked)"></td><td>${esc(f.nombre)}</td><td>${esc(f.tipo)}</td><td>${fdt(f.ts)}</td><td>${esc(f.user)}</td><td>${ico('desc','Descargar',`docUpDesc(${i})`)}</td></tr>`).join('') || '<tr><td colspan="6" class="fac-empty">Sin archivos</td></tr>'}</tbody></table>
    <div class="fac-btns">${ghost('Eliminar','docUpEliminar()')}${ghost('Cancelar','docCbNo()')}${btn('Guardar','docUpGuardar()','','id="docUpGuardar"')}</div>`, 'md');
}
window.docUpSet = (k, v) => { K.up[k] = v; K.up.err = ''; if(k==='servicio'){ K.up.files = []; K.up.tipo = ''; } pintarUp(); };
window.docUpSelF = (i, on) => { K.up.files[i].sel = on; };
window.docUpDesc = i => CC.toast(`Descargando ${K.up.files[i].nombre}`,'info');
window.docUpEliminar = () => { K.up.files = K.up.files.filter(f=>!f.sel); pintarUp(); };
window.docUpFile = inp => {
  const u = K.up, f = inp.files && inp.files[0]; if(!f) return; const ext = (f.name.split('.').pop()||'').toLowerCase(), imp = u.k==='imp';
  const err = m => { u.err = m; pintarUp(); };
  if(!u.servicio) return err('Seleccione un tipo de servicio para comenzar el proceso de carga.');
  if(u.servicio==='TRAMP'){ if(ext!=='pdf') return err('El tipo de archivo no está permitido para el Tipo de Archivo seleccionado.'); if(u.files.length) return err('Para el tipo de servicio TRAMP, solo se puede cargar un archivo.'); u.files.push({nombre:f.name, tipo:'PDF', ts:ahora(), user:CC.usuario()}); u.err=''; return pintarUp(); }
  if(!u.tipo) return err('Seleccione un tipo de archivo para comenzar el proceso de carga.');
  if(!(imp ? ['xlsx','xls','pdf'] : ['xlsx','xls']).includes(ext)) return err('El tipo de archivo no está permitido para el Tipo de Archivo seleccionado.');
  if(u.files.some(x=>x.cod===u.tipo)) return err(imp ? 'Este Tipo de Archivo ya fue utilizado. Seleccione otro.' : 'Solo se permite un archivo por cada Tipo de Archivo.');
  if(u.tipo==='LDD' && !(u.ind==='Importación' && u.linea==='ZIM')) return err("Tipo de archivo 'Listado de Descarga' disponible para Indicador 'Importación' y Línea 'ZIM'.");
  if((u.tipo==='LDD' && u.files.length) || u.files.some(x=>x.cod==='LDD')) return err("Tipo de archivo 'Listado de Descarga' solo se puede procesar individualmente.");
  u.files.push({nombre:f.name, cod:u.tipo, tipo:(imp?TA_IMP:TA_EXP).find(t=>t[0]===u.tipo)[1], ts:ahora(), user:CC.usuario()}); u.err = ''; pintarUp();
};
window.docUpGuardar = () => {
  const u = K.up, imp = u.k==='imp', err = m => { u.err = m; pintarUp(); };
  if(!u.servicio) return err('Seleccione un tipo de servicio para comenzar el proceso de carga.');
  if(u.servicio==='LINER' && (!u.linea || (!imp && !u.afecta))) return err('Por favor complete todos los campos obligatorios');
  if(!u.files.length) return err(u.servicio==='LINER' ? 'Seleccione un tipo de archivo para comenzar el proceso de carga.' : 'Seleccione el archivo PDF para comenzar el proceso de carga.');
  const ldd = u.files.some(f=>f.cod==='LDD');
  if(imp && u.servicio==='LINER' && !ldd){ const falta = ['BAPLIE','MR','MRR'].filter(c=>!u.files.some(f=>f.cod===c)); if(falta.length) return err(`Faltan adjuntar los archivos requeridos: ${falta.join(', ')}.`); }
  CC.cerrarModal();
  procesando('Procesando Archivos', imp ? 'Validando archivos, generando BLs y asignando tipos' : 'Validando archivos, generando Reservas y asignando tipos', 1200, ()=>imp ? (ldd ? lddResultado(u) : generarBL(u)) : generarReserva(u), true);
};
function lddResultado(u){
  const eqs = S.imp.filter(b=>b.nave===u.nave && b.viaje===u.viaje).flatMap(b=>b.equipos);
  K.ldd = [['Contenedor(es) extra', ['ZIMU9988771']], ['Contenedor(es) faltante(s)', eqs.slice(0,1).map(e=>e.numero)], ['Contenedor(es) con precintos(s) diferente(s)', eqs.slice(1,2).map(e=>`${e.numero}: sistema ${e.sellos[0]?e.sellos[0].numero:'sin sello'}, terminal ZS900001`)], ['BL(s) no encontrado(s)', ['ZIMUBOX0000099']]];
  K.ldd73 = ldd73Filas(u); K.lddF = 'Todos'; pintarLdd();
}
window.docLddExp = () => PV() ? CC.exportarExcel('Listado_Descarga_Conciliacion', 'Conciliación', ['Contenedor','Número BL','Resultado','Precinto en el sistema','Precinto del terminal','Fecha y hora de descarga','Estado del BL'], (K.ldd73||[]).map(r=>[r.cont, r.bl, r.st, r.ps, r.pt, r.f?fdt(r.f):'', r.eb]))
  : CC.exportarExcel('Listado_Descarga_Discrepancias', 'Discrepancias', ['Bloque','Detalle'], K.ldd.flatMap(([t,l])=>l.map(x=>[t,x])));
function generarBL(u){
  const n = u.servicio==='TRAMP' ? 1 : 2, nuevos = [];
  for(let i=0;i<n;i++){ const num = `${u.linea||'TRP'}U${u.nave.replace(/\W/g,'').slice(0,3).toUpperCase()}${String(++S.seq).padStart(7,'0')}`;
    const b = mkImp({id:'I'+num, numero:num, nave:u.nave, viaje:u.viaje, indicador:u.ind, estado:'POR REVISAR', lineaCod:u.linea||'ZIM', consignatario:i?'':'IMPORTADORA LIMA NORTE S.A.C.', emision:hoyISO(), manifiesto:'', contenedores:[`${(u.linea||'TRP').slice(0,3)}U${String(8800000+S.seq)}`], entidad:'', codAduana:'', ruc:''});
    b.audit = {c:'Carga de archivos', cts:ahora(), u:CC.usuario(), ts:ahora()}; b.hist = [ev(`BL generado por carga de archivos (${u.files.map(f=>f.cod||f.tipo).join(', ')})`, CC.usuario())];
    S.imp.push(b); nuevos.push(b); }
  dlg('Mensajes de Generación del BL', `<div class="fac-sec">Mensajes Generales</div><ul class="doc-ul"><li>Se generaron ${nuevos.length} BL en estado POR REVISAR.</li><li>Archivos procesados: ${u.files.map(f=>esc(f.nombre)).join(', ')}.</li></ul>
    <div class="fac-sec">Mensajes del BL</div><table class="fac-tbl"><thead><tr><th>Número BL</th><th>Mensaje</th></tr></thead><tbody>${nuevos.map(b=>{ const p = pendImp(b); return `<tr><td>${esc(b.numero)}</td><td style="white-space:normal">${p.length?`Campos pendientes para aprobar: ${p.slice(0,3).map(esc).join(', ')}${p.length>3?'…':''}`:'Sin observaciones'}</td></tr>`; }).join('')}</tbody></table>${!PV() ? '' : u.servicio==='LINER' ? linerHtml(u, nuevos) : trampHtml(u, nuevos[0])}`,
    [['Cerrar',"docGenFin('imp')"]], PV() ? 'lg' : 'md');
}
window.docGenFin = k => { CC.cerrarModal(); CC.toast(k==='imp'?'El proceso de importación ha finalizado.':'El proceso de carga de reservas ha finalizado.','success'); refrescarActiva(); };

/* =====================================================================
   MANTENIMIENTO: Crear/Editar BL (Importación) y Crear/Editar Reserva (Exportación)
===================================================================== */
const OPC = {
  lineas:()=>CC.datos.lineas.map(l=>l.nombre), cons:()=>rdFiltra(CC.datos.socios.consignatarios.map(s=>s.razonSocial).concat(sociosNuevos(['Consignatario','Notificante']))), emb:()=>rdFiltra(CC.datos.socios.embarcadores.map(s=>s.razonSocial).concat(sociosNuevos(['Embarcador']))),
  dep:()=>DEPOSITOS.map(d=>d.n), puertos
};
const GEN_IMP = [['tipo','Tipo de BL','s',TIPO_BL],['indicador','Indicador','s',IND_IMP,1],['tipoInd','Tipo de indicador','s',TIPO_IND,1],['linea','Línea Naviera','dl','lineas'],
  ['embarcador','Embarcador','t'],['consignatario','Consignatario','dl','cons'],['notificante','Notificante','dl','cons'],['dirEmb','Dirección de Embarcador','ta'],['dirCons','Dirección de Consignatario','ta'],['dirNot','Dirección de Notificante','ta'],
  ['tipoEmision','Tipo de Emisión','s',TIPO_EMI],['fechaEmision','Fecha de Emisión','d'],['condEmbarque','Condición de Embarque','s',COND_EMB],['tipoCarga','Tipo de Carga','s',TIPO_CARGA],
  ['cantidad','Cantidad de Carga','n'],['pesoTotal','Peso Bruto (KG)','n'],['volumen','Volumen (M3)','n'],['refReserva','Referencia de Reserva','t'],['incoterm','Incoterm','s',INCOTERM],['termFlete','Término de Flete','s',TERM_FLETE],
  ['negociable','Negociable','c'],['tipoDespacho','Tipo de Despacho','s',DESPACHO],['modalidadTrb','Modalidad de Transbordo','s',MOD_TRB,0,d=>d.indicador==='Transbordo'],['entidad','Entidad Receptora','dl','dep'],['codAduana','Código Aduana','t'],['ruc','RUC','t']];
const GEN_EXP = [['tipo','Tipo de BL','ro'],['indicador','Indicador','ro'],['tipoInd','Tipo de indicador','s',TIPO_IND,1],['linea','Línea Naviera','dl','lineas'],
  ['embarcador','Embarcador','emb',null,1],['consignatario','Consignatario','t'],['notificante','Notificante Principal','t'],['dirEmb','Dirección de Embarcador','ta'],['dirCons','Dirección de Consignatario','ta'],['dirNot','Dirección de Notificante','ta'],
  ['notif2','Notificante Secundario','t'],['expRefs','Referencias de Exportación','t'],['ff','Agente de Carga (Freight Forwarder)','t'],['condPago','Condición de Pago','s',COND_PAGO],['puertoPago','Puerto de Pago','dl','puertos'],
  ['fechaEmision','Fecha de Emisión','d'],['tipoEmision','Tipo de Emisión','s',TIPO_EMI],['condEmbarque','Condición de Embarque','s',COND_EMB],['tipoCarga','Tipo de Carga','s',TIPO_CARGA],
  ['cantidad','Cantidad de Carga','calc',d=>d.carga.reduce((s,c)=>s+(+c.cantidad||0),0)],['peso','Peso Bruto (KG)','calc',d=>n0(d.equipos.filter(e=>!e.roleado).reduce((s,e)=>s+pesoBruto(d,e),0))],['volumen','Volumen (M3)','calc',d=>n0(d.carga.reduce((s,c)=>s+(+c.volumen||0),0))],
  ['refReserva','Referencia de Reserva','t'],['incoterm','Incoterm','s',INCOTERM],['termFlete','Término de Flete','s',TERM_FLETE],['negociable','Negociable','c'],['via','Vía de Embarque','s',VIA_EMB],
  ['entidad','Entidad Receptora','dl','dep'],['codAduana','Código Aduana','t'],['ruc','RUC','t']];
const EQ_BASE = [['numero','Número de Equipo','numEq'],['tipo','Tipo de Contenedor','s',TIPOS_CONT],['cond','Condición de Embarque','s',['FCL','LCL','EMPTY']],['tara','Tara (KG)','n'],['payload','Payload (KG)','n'],['vgm','VGM (KG)','n']];
const OOG = [['olb','OLB','n'],['olf','OLF','n'],['owl','OWL','n'],['owr','OWR','n'],['oh','OH','n'],['reefer','¿Es Reefer?','c'],['conectado','¿Está conectado?','c'],['temp','Temperatura (C)','n'],['vent','Ventilación','t'],['hum','Humedad','t']];
const EQ_IMP = [...EQ_BASE, ['peso','Peso Bruto (KG)','n'], ...OOG, ['ligado','¿Está Ligado?','c'],['soc','¿Es SOC?','c'],['partida','Partida Arancelaria','partida'],['tipoBulto','Tipo de Bulto','s',BULTOS],['cantBultos','Cantidad de Bultos','n'],
  ['descCarga','Descripción de la Carga','t'],['diasLibres','Días Libres','n'],['obs','Observaciones','t'],['fDescarga','Fecha y Hora de Descarga','dt'],['fLiberacion','Fecha de liberación','d'],['sellos','Sellos','sellos'],['peligrosos','Material Peligroso','pelig']];
const EQ_EXP = [...EQ_BASE, ['peso','Peso Bruto (KG)','pesoCalc'], ['r37','Restricción','r37'], ...OOG, ['co2','CO2','n'],['o2','O2','n'],['ligado','¿Está Ligado?','c'],['soc','¿Es SOC?','c'],['partida','Partida Arancelaria','partida'],['tipoBulto','Tipo de Bulto','s',BULTOS],
  ['descCarga','Descripción de la Carga','desc'],['diasLibres','Días Libres','n'],['obs','Observaciones','t'],['confirmado','Confirmación de Embarque','c'],['fEmbarque','Fecha y Hora de Embarque','dt'],['fDescarga','Fecha y Hora de Descarga','dt'],['fSalidaDep','Fecha de salida del depósito','dt'],['sellos','Sellos','sellos'],['peligrosos','Material Peligroso','pelig']];
const CARGA_IMP = [['tipoBulto','Tipo de Bulto','s',BULTOS],['descripcion','Descripción','t'],['equipo','Número de Equipo','eqSel'],['cantidad','Cantidad','n'],['peso','Peso (KG)','n'],['anio','Año','n'],['modelo','Modelo','t'],['marca','Marca','t'],['chasis','Chasis','t'],['vins','VINs','t'],['volumen','Volumen','n'],['marcas','Marcas y Números','t'],['peligroso','Material Peligroso','c']];
const CARGA_EXP = [['tipoBulto','Tipo de Bulto','s',BULTOS],['equipo','Número de Equipo','eqSel'],['descripcion','Descripción','desc'],['cantidad','Cantidad','n'],['peso','Peso (KG)','n'],['anio','Año','n'],['modelo','Modelo','t'],['marca','Marca','t'],['chasis','Chasis','t'],['vins','VINs','t'],['volumen','Volumen (M3)','n'],['marcas','Marcas y Números','t'],['peligroso','Material Peligroso','c']];
const RECARGOS = [['cargo','Recargo - Cláusula','s',['THC','BL FEE','ISPS','BAF','CAF']],['descripcion','Descripción','t'],['tarifa','Tarifa','n'],['unidad','Unidad Base','s',['Contenedor','BL','Tonelada']],['tipoCont','Tipo de Contenedor','s',TIPOS_CONT],['cantidad','Cantidad','n'],
  ['condPago','Condición de Pago','s',COND_PAGO],['moneda','Moneda','s',['USD','PEN']],['monto','Monto','monto'],['lugar','Lugar de Pago','t'],['pagador','Pagador','s',['Embarcador','Consignatario']],['precio','Precio','n']];
const DESCS = [['descripcion','Descripción','t']];
const NUEVA = {carga:{tipoBulto:'Pallets', descripcion:'', equipo:'', cantidad:'', peso:'', anio:'', modelo:'', marca:'', chasis:'', vins:'', volumen:'', marcas:'', peligroso:false},
  recargos:{cargo:'', descripcion:'', tarifa:'', unidad:'', tipoCont:'', cantidad:'', condPago:'', moneda:'USD', monto:0, lugar:'', pagador:'', precio:''}, descripciones:{descripcion:''}};
const TIPO_NAVE = {container:'Portacontenedores', tanker:'Tanquero', bulk:'Granelero', chem:'Quimiquero'};
const tipoNave = nave => TIPO_NAVE[(CC.datos.naves.find(n=>n.nombre===nave)||{}).tipo] || 'Portacontenedores';
function pesoBruto(b, e){ const c = (b.carga||[]).filter(x=>x.equipo===e.numero); return c.length ? (+e.tara||0) + c.reduce((s,x)=>s+(+x.peso||0),0) : (+e.peso || +e.vgm || 0); }

/* I-037: restricciones que aplican y excesos (la alerta solo avisa, no bloquea) */
function restrEstado(r){ if(!r.activa) return 'Inactiva'; const h = hoyISO(); if(r.hasta && r.hasta < h) return 'Vencida'; if(r.desde && r.desde > h) return 'Programada'; return 'Vigente'; }
function restrDe(b, e){ return S.restr.filter(r=>restrEstado(r)==='Vigente' && (!r.tipo||r.tipo===e.tipo) && (!r.linea||r.linea===(b.lineaCod||lineaCod(b.linea))) && (!r.cliente||nt(r.cliente)===nt(b.embarcador)) && (!r.puerto||r.puerto===b.puertoDescarga) && (!r.pais||r.pais===PAIS[b.puertoDescarga])); }
function excesos(b){
  const out = [];
  (b.equipos||[]).filter(e=>!e.roleado && e.numero).forEach(e=>{ const rs = restrDe(b, e), peso = pesoBruto(b, e);
    const pl = rs.filter(r=>r.payload).sort((x,y)=>x.payload-y.payload)[0], pb = rs.filter(r=>r.peso).sort((x,y)=>x.peso-y.peso)[0];
    if(pl && +e.payload > +pl.payload) out.push({eq:e.numero, campo:'Payload (KG)', valor:+e.payload, limite:+pl.payload, r:pl});
    if(pb && peso > +pb.peso) out.push({eq:e.numero, campo:'Peso Bruto (KG)', valor:peso, limite:+pb.peso, r:pb}); });
  return out;
}
const restrTxt = r => [r.tipo&&`Tipo ${r.tipo}`, r.linea&&`Línea ${r.linea}`, r.cliente&&`Cliente ${r.cliente}`, r.puerto&&`Puerto ${r.puerto}`, r.pais&&`País ${r.pais}`].filter(Boolean).join(', ') || 'General';
const excTxt = x => `Número de Equipo ${x.eq}: ${x.campo} ${n0(x.valor)} supera el límite de ${n0(x.limite)} (${restrTxt(x.r)}; responsable ${x.r.resp}).`;

/* Pendientes para aprobar */
function pendImp(d){
  const p = [], v = k => d[k]!==''&&d[k]!=null;
  [['tipo','Tipo de BL'],['linea','Línea Naviera'],['embarcador','Embarcador'],['consignatario','Consignatario'],['dirEmb','Dirección de Embarcador'],['tipoEmision','Tipo de Emisión'],['fechaEmision','Fecha de Emisión'],['condEmbarque','Condición de Embarque'],['tipoCarga','Tipo de Carga'],['pesoTotal','Peso Bruto (KG)'],['volumen','Volumen (M3)']].forEach(([k,l])=>{ if(!v(k)) p.push(l); });
  if(!d.indicador || !d.tipoInd) p.splice(1, 0, 'Indicador y Tipo de indicador');
  if(d.tipoInd!=='No Domiciliado' && !v('notificante')) p.push('Notificante');
  if(!(+d.cantidad > 0)) p.push('Cantidad de Carga (mayor que 0)');
  if(d.indicador==='Transbordo' && !d.modalidadTrb) p.push('Modalidad de Transbordo');
  if(d.indicador!=='Tránsito'){ if(!v('entidad')) p.push('Entidad Receptora'); if(!v('codAduana')) p.push('Código Aduana'); if(!v('ruc')) p.push('RUC'); }
  if(d.consignatario && S.sinEmail.has(d.consignatario)) p.push('El Consignatario debe contar con un email del tipo Importación.');
  if(d.equipos.some(e=>e.cond==='EMPTY') && d.carga.length > 1) p.push('Para contenedores vacíos (EMPTY) solo se permite un registro de información de carga.');
  return p;
}
function pendExp(d){
  const p = [], v = k => d[k]!==''&&d[k]!=null;
  [['puertoCarga','Puerto de embarque'],['puertoDescarga','Puerto de descarga'],['puertoFinal','Puerto Final'],['embarcador','Embarcador'],['linea','Línea Naviera'],['consignatario','Consignatario'],['notificante','Notificante Principal'],['condPago','Condición de Pago'],['tipoEmision','Tipo de Emisión'],['tipoCarga','Tipo de Carga'],['via','Vía de Embarque']].forEach(([k,l])=>{ if(!v(k)) p.push(l); });
  if(!d.carga.length) p.push('Debe existir al menos un registro de información de carga para poder aprobar.');
  if(d.via==='Extraportuario (EXTRA)' && !v('entidad')) p.push('Entidad Receptora');
  d.equipos.filter(e=>!e.roleado).forEach(e=>{ const n = e.numero || '(sin número)';
    if(!e.numero || !e.tipo) p.push(`Número de Equipo ${n}: Información de equipo: ${[!e.numero&&'Número de Equipo', !e.tipo&&'Tipo de Contenedor'].filter(Boolean).join(', ')}`);
    if(e.cond!=='EMPTY'){ const f = [!e.cond&&'Condición de Embarque', !e.partida&&'Partida Arancelaria', !e.tipoBulto&&'Tipo de Bulto', !e.descCarga&&'Descripción de la Carga'].filter(Boolean);
      if(f.length) p.push(`Número de Equipo ${n}: Configuración de carga: ${f.join(', ')}`);
      if(!d.carga.some(c=>c.equipo===e.numero && c.descripcion && +c.cantidad>0 && +c.peso>0)) p.push(`Número de Equipo ${n}: Información de carga: al menos un bulto completo`);
      const s = ['Sello de naviera/transportista','Sello de aduanas'].filter(t=>!e.sellos.some(x=>x.tipo===t && x.numero));
      if(s.length) p.push(`Número de Equipo ${n}: Información de sellos: ${s.join(', ')}`); } });
  return p;
}
function pendSunatExp(d){
  const p = []; if(!d.manifiesto) p.push('Número de Manifiesto'); if(!d.atd) p.push('Fecha de zarpe (ATD)');
  d.equipos.filter(e=>!e.roleado).forEach(e=>{ if(!(+e.vgm>0)) p.push(`Número de Equipo ${e.numero}: VGM (KG)`); });
  return p;
}
const lastRes = b => last(b.res), lastBl = b => last(b.bl);
const resOk = b => !!b.manual || (()=>{ const l = (b.res||[]).filter(t=>t.st==='COMPLETED').pop(); return l && ['0171','0172'].includes(l.c) && lastRes(b).st!=='PENDING' && !(lastRes(b).c==='0173' && lastRes(b).st==='COMPLETED'); })();

/* Abrir mantenimiento */
const ED_ID = k => k==='imp' ? 'screenDocImpBl' : 'screenDocExpRes';
function abrirEd(k, b, nuevo){ const otro = $(ED_ID(k==='imp'?'exp':'imp')); if(otro) otro.innerHTML = ''; S.ed = {k, id:b.id, nuevo, ro:!nuevo, d:clone(b), tab:'gen', dirty:false, selR:{}}; CC.abrir(ED_ID(k)); }
window.docImpNuevo = () => { seed(); const f = S.fi.f; abrirEd('imp', mkImp({id:'', numero:'', nave:f.nave||'', viaje:f.viaje||'', estado:'', equipos:[], carga:[], contenedores:[], descripciones:[], entidad:'', codAduana:'', ruc:'', embarcador:'', dirEmb:'', dirCons:'', cantidad:'', pesoTotal:'', volumen:''}), true); };
window.docImpEditar = id => abrirEd('imp', buscarBL(id), false);
/* Abre la ficha de un BL por su número en modo consulta; "Volver" ejecuta volver() si se indica (por ejemplo, regresar a Cobranzas) */
window.docAbrirBLNumero = (num, volver) => { seed();
  let b = S.imp.find(x=>x.numero===num), k = 'imp';
  if(!b){ b = S.exp.find(x=>x.numero===num); if(b) k = 'exp'; }
  if(!b){ const bx = S.imp[0] || {}; b = mkImp({id:'C'+num, numero:num, nave:bx.nave||'', viaje:bx.viaje||'', estado:'APROBADO'}); S.imp.push(b); }
  abrirEd(k, b, false); if(volver) S.ed.volver = volver; };
window.docExpEditar = id => abrirEd('exp', buscarBL(id), false);
window.docExpNuevo = () => { seed(); const f = S.fe.f; if(!f.nave || !f.viaje){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  conSucursal(f.nave, f.viaje, ()=>{ const v = voyInfo(f.nave, f.viaje);
    abrirEd('exp', {id:'', numero:'', nave:f.nave, viaje:f.viaje, embarcador:'', linea:'', lineaCod:'', estado:'', tipo:'House B/L', indicador:'Exportación', tipoInd:'', puertoOrigen:'', puertoCarga:v.puerto||'Callao', puertoDescarga:'', puertoFinal:'',
      consignatario:'', notificante:'', dirEmb:'', dirCons:'', dirNot:'', notif2:'', expRefs:'', ff:'', condPago:'', puertoPago:'', fechaEmision:'', tipoEmision:'', condEmbarque:'', tipoCarga:'', refReserva:'', incoterm:'', termFlete:'', negociable:false, via:'',
      entidad:'', codAduana:'', ruc:'', manifiesto:'', pago:'', emision:'', ata:'', atd:'', version:0, res:[], bl:[], manual:null, conceptos:false, errores:[], advertencias:[], info:null, equipos:[], carga:[], recargos:[], descripciones:[], roleo:null, badge:'', hist:[], cambios:[], audit:{c:'',cts:'',u:'',ts:''}}, true); }); };
function edHtml(k){
  seed(); const E = S.ed; if(!E || E.k!==k) return '<div class="fac-card">Sin documento abierto.</div>';
  const real = buscarBL(E.id); if(E.ro && real) E.d = clone(real);
  const d = E.d, imp = k==='imp', ro = E.ro, dis = ro ? 'disabled' : '', l0 = imp ? lastOf(d.sunat) : lastOf(d.bl), lr = imp ? null : lastOf(d.res);
  const alerta = (l0 && l0.st==='ERROR' && ['0102','0153'].includes(l0.c)) || (lr && lr.st==='ERROR' && lr.c==='0172')
    ? `<div class="fac-note err doc-alert">${imp?'La transmisión de rectificación 0102 a SUNAT finalizó con error. Revise el detalle y vuelva a intentar.':'La transmisión de rectificación a SUNAT finalizó con error. Revise el detalle y vuelva a intentar.'}</div>` : '';
  const cab = E.nuevo ? '' : `<div class="fac-card" id="docEdCab"><div class="fac-head"><div><h3>${esc(d.numero||'Pendiente')}</h3><div class="cc-chips doc-estados">${ST_BL.map(s=>`<span class="cc-chip ${s===d.estado?'on st-'+TONO[s]:''}">${s}</span>`).join('')}</div>
      ${d.badge?`<div class="doc-badges"><span class="doc-badge">${esc(d.badge)}</span></div>`:''}</div><div class="fac-acts">${botonesCab(k, d)}</div></div></div>`;
  const ident = E.nuevo ? (imp ? `<div class="fac-card"><div class="fac-g4">${campo('Número BL *',`<input id="docEdNum" maxlength="20" placeholder="Ingresar número de BL" value="${esc(d.numero)}" onchange="docEd('numero',this.value.toUpperCase())">`)}</div></div>`
      : `<div class="fac-card"><div class="fac-sec" style="margin-top:0">Reserva</div><div class="fac-g4">${campo('Número de Reserva *',`<input id="docEdNum" maxlength="20" placeholder="Ingresar número de reserva" value="${esc(d.numero)}" onchange="docEd('numero',this.value.toUpperCase())">`)}</div></div>`) : '';
  const voys = [...new Set([...S.imp,...S.exp].map(b=>b.viaje+' | '+b.nave).concat(CC.datos.viajes.map(v=>v.numero+' | '+v.nave)))];
  const pv = (key, lbl, req) => campo(lbl+(req?' *':''), `<input list="docEdPuertos" value="${esc(d[key])}" ${dis} onchange="docEd('${key}',this.value)">`);
  const nv = `<div class="fac-card" id="docEdNv"><div class="fac-sec" style="margin-top:0">Nave/Viaje ${d.roleo&&d.roleo.destino?'<span class="cc-chip">Asignada por roleo</span>':''}</div><div class="fac-g4">
    ${campo('Número de Viaje *', `<input list="docEdVoys" id="docEdViaje" value="${esc(d.viaje)}" ${E.nuevo?'':'disabled'} onchange="docEdViaje(this.value)">${dl('docEdVoys',voys)}`)}
    ${CC.campoLectura('Tipo de Nave', d.nave?tipoNave(d.nave):'')}${CC.campoLectura('Nave', d.nave)}${pv('puertoOrigen','Puerto de origen')}
    ${imp ? pv('puertoCarga','Puerto Embarque') + pv('puertoDescarga','Puerto Descarga') + pv('puertoFinal','Puerto Final') : pv('puertoCarga','Puerto de embarque',1) + pv('puertoDescarga','Puerto de descarga',1) + pv('puertoFinal','Puerto de destino',1)}
    </div>${dl('docEdPuertos', puertos())}</div>`;
  const sunatInfo = imp && d.info ? `<div class="fac-card"><div class="fac-sec" style="margin-top:0">Información SUNAT</div><div class="fac-g4">${CC.campoLectura('Número de Detalle', d.info.detalle)}${CC.campoLectura('Número Electrónico', d.info.electronico)}</div></div>` : '';
  const tabs = [['gen','Información General'],['eq','Información de Equipos'],['carga','Información de Carga'],['rec','Recargo - Cláusula'],['desc','Descripciones']].concat(!imp && !E.nuevo ? [['traz','Trazabilidad']] : []);
  const cuerpo = E.tab==='gen' ? genHtml(k, d, ro) : E.tab==='eq' ? eqHtml(k, d, ro) : E.tab==='carga' ? grid('carga', imp?CARGA_IMP:CARGA_EXP, d, ro) : E.tab==='rec' ? (PV() && !E.nuevo ? recPropHtml(k, d) : '') + grid('recargos', RECARGOS, d, ro) : E.tab==='desc' ? (PV() && !E.nuevo ? desc70Html(d) : '') + grid('descripciones', DESCS, d, ro) : trazHtml(d);
  const pend = imp ? pendImp(d) : pendExp(d), exc = imp || !P37() ? [] : excesos(d);
  const pie = `${(d.estado==='POR REVISAR'||!d.estado) ? `<div class="fac-card" id="docEdPend"><h3>${imp?'Campos pendientes para Aprobar BL':'Campos pendientes para Aprobar Reserva'}</h3>${pend.length?`<ul class="doc-ul">${pend.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Ninguno</p>'}</div>` : ''}
    ${!imp && !E.nuevo && d.estado==='POR REVISAR' && PV() ? parcialHtml(d) : ''}
    ${exc.length ? `<div class="fac-card" ${CC.propuesta('I-037','Restricciones de exportación')} id="docEdR37"><h3>Restricciones de exportación ${M37()}</h3><p class="doc-mut">Aviso: los equipos superan una restricción vigente. No bloquea el guardado ni la transmisión.</p><ul class="doc-ul warn">${exc.map(x=>`<li>${esc(excTxt(x))}</li>`).join('')}</ul></div>` : ''}
    ${!imp && !E.nuevo && d.estado==='APROBADO' && resOk(d) && !S.manifSalida.has(d.nave+'|'+d.viaje) ? '<div class="fac-card"><h3>Manifiesto de salida pendiente</h3><p>El viaje del BL aún no cuenta con el manifiesto de salida completado.</p></div>' : ''}
    ${!imp && !E.nuevo && PV() ? coarriHtml(d) + tmgHtml(d) : ''}
    ${!imp && !E.nuevo && d.estado!=='POR REVISAR' && pendSunatExp(d).length ? `<div class="fac-card" id="docEdPendS"><h3>Campos pendientes para transmitir a SUNAT</h3><ul class="doc-ul">${pendSunatExp(d).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`;
  const botones = ro ? '' : `<div class="fac-btns">${ghost('Cancelar','docEdCancelar()')}${btn(E.nuevo?'Crear':'Guardar','docEdGuardar()','','id="docEdGuardar"')}</div>`;
  return `${alerta}${cab}${!imp && !E.nuevo && PV() ? borradorHtml(d) + nnHtml(d) : ''}${ident}${nv}${sunatInfo}<div class="fac-card" id="docEdTabs"><div class="fac-tabs">${tabs.map(([t,l])=>`<button type="button" class="${E.tab===t?'on':''}" onclick="docEdTab('${t}')">${l}</button>`).join('')}</div>${cuerpo}</div>${pie}${botones}`;
}
function lastOf(l){ return last(l); }
function botonesCab(k, d){
  const imp = k==='imp', o = [], ro = S.ed.ro;
  o.push(ghost('Ver historial',`docHist('${d.id}')`));
  if(imp){
    o.push(ghost('Descargar BL',`docPdf('BL','${d.id}')`));
    if(d.estado==='APROBADO' && !d.pago) o.push(ghost('Listo para facturar','docListo()'));
    if(d.estado==='POR RECTIFICAR') o.push(ghost('Transferir Rectificación','docRectImp()', d.solicitud?'disabled title="No se puede rectificar: ya existe un N° de Solicitud de Transbordo."':''));
  } else {
    const lb = lastBl(d);
    if(lb && lb.c==='0154' && lb.st==='COMPLETED' && !d.conceptos) o.push(ghost('Generar conceptos de pago','docConceptos()'));
    if(d.extemp) o.push(ghost('Transmisión Extemporánea','docExtemp()'));
    if(d.estado==='APROBADO' && resOk(d) && d.atd && !lb) o.push(ghost('Transmitir BL','docExpTxBl()'));
    if((d.estado==='APROBADO' && !d.manual && lastRes(d) && lastRes(d).st==='COMPLETED' && lastRes(d).c!=='0173') || d.estado==='POR RECTIFICAR') o.push(ghost('Transferir Rectificación','docRectExp()'));
    if(d.estado==='APROBADO' && !d.pago) o.push(ghost('Listo para facturar','docListo()'));
    if(!(lb && lb.st==='COMPLETED') && d.estado!=='Anulado' && d.equipos.some(e=>!e.roleado)) o.push(btn('Roleo','docRoleo()','doc-amar'));
  }
  if(ro) o.push(btn('Editar','docEdEditar()','','id="docEdEditar"'));
  o.push(ghost('Eliminar','docEdEliminar()'));
  return o.join('');
}
function inputDe(tipo, val, on, opts, dis, extra){
  if(tipo==='s') return sel(opts, val, `${dis} onchange="${on}" ${extra||''}`, 'Elegir');
  if(tipo==='c') return `<input type="checkbox" ${val?'checked':''} ${dis} onchange="${on.replace('this.value','this.checked')}" ${extra||''}>`;
  if(tipo==='ta') return `<textarea rows="2" ${dis} onchange="${on}" ${extra||''}>${esc(val)}</textarea>`;
  const t = tipo==='n' ? 'number" min="0' : tipo==='d' ? 'date' : tipo==='dt' ? 'datetime-local' : 'text';
  return `<input type="${t}" value="${esc(val??'')}" ${dis} onchange="${on}" ${extra||''}>`;
}
function genHtml(k, d, ro){
  const spec = k==='imp' ? GEN_IMP : GEN_EXP, dis = ro ? 'disabled' : '';
  const cs = spec.filter(f=>!f[5] || f[5](d)).map(([key,l,t,o,req])=>{
    const lbl = l + (req?' *':''), on = `docEd('${key}',this.value)`, sx = (!ro && PV() && ROL_SOCIO[k+'.'+key]) ? socioBtn(k, key) : '';
    if(t==='ro') return CC.campoLectura(l, d[key]);
    if(t==='calc') return CC.campoLectura(l, o(d));
    if(t==='dl') return campo(lbl, `<input list="docEdL${key}" value="${esc(d[key])}" ${dis} onchange="${on}">${dl('docEdL'+key, OPC[o]())}${sx}`);
    if(t==='emb') return d.tipoInd==='Nominativo' ? campo(lbl, `<input list="docEdLemb" value="${esc(d[key])}" ${dis} maxlength="200" onchange="${on}">${dl('docEdLemb', OPC.emb())}${sx}`) : campo(lbl, `<input value="${esc(d[key])}" ${dis} maxlength="200" onchange="${on}">${sx}`);
    if(key==='codAduana' && d.via==='Embarque Directo') return CC.campoLectura(l, '9998');
    if(key==='codAduana') return campo(lbl, inputDe(t, d[key], on, o, dis) + `<small ${CC.propuesta('HU-DM-01 · I-035','Código de Aduana del rol','doc-mut')} data-rdadu style="display:block;font-size:12px">Se toma del rol del socio Entidad Receptora (Código de Aduana por rol), no de la cabecera.</small>`);
    if(key==='entidad' && d.via==='Embarque Directo') return CC.campoLectura(l, d.embarcador);
    return campo(lbl, inputDe(t, d[key], on, o, dis) + sx, t==='ta'?'':'');
  }).join('');
  const manual = k==='exp' && !S.ed.nuevo ? `<div class="fac-sec">Transmisión de Reserva Manual</div><div class="doc-man"><label class="doc-chk" title="Registro de transmisión de reserva manual 0171"><input type="checkbox" ${d.manual?'checked':''} disabled> Transmisión de reserva manual</label>
      ${!lastRes(d) || lastRes(d).st!=='COMPLETED' ? ico('lapiz','Actualizar datos de transmisión manual',`docManual('${d.id}')`) : ''}
      ${d.manual?`<dl class="fac-kv"><dt>Motivo</dt><dd>${esc(d.manual.motivo)}</dd><dt>Fecha</dt><dd>${d.manual.fecha?fdt(d.manual.fecha):'Sin registro'}</dd></dl>`:''}</div>` : '';
  return `<div class="fac-g4" id="docEdGen">${cs}</div>${manual}`;
}
function eqHtml(k, d, ro){
  const vig = d.equipos.filter(e=>!e.roleado).map(e=>e.numero), rol = d.equipos.filter(e=>e.roleado).map(e=>e.numero);
  const nota = k==='exp' && rol.length ? `<p class="doc-mut">Equipos vigentes en este BL: ${esc(vig.join(', ')||'ninguno')}. ${esc(rol.join(', '))} ya fueron roleados a otro BL.</p>` : '';
  const exc = k==='exp' && P37() ? excesos(d) : [];
  const av = exc.length ? `<div class="fac-note warn" ${CC.propuesta('I-037','Alerta de restricción')} id="docEqR37">${M37()} ${exc.length} aviso(s) de restricción de exportación. La alerta solo avisa: puede guardar.</div>` : '';
  return nota + av + grid('equipos', k==='imp' ? EQ_IMP : EQ_EXP.filter(c=>c[0]!=='r37' || P37()), d, ro || (k==='exp' && !!d.roleo && !!d.roleo.destino && false));
}
function grid(lista, spec, d, ro){
  const filas = d[lista], dis = ro ? 'disabled' : '', E = S.ed, selR = E.selR[lista] || (E.selR[lista] = new Set()), exp = E.k==='exp';
  const celda = (r, i, [key, l, t, o]) => {
    const on = `docEdR('${lista}',${i},'${key}',this.value)`;
    if(t==='numEq') return `<div class="doc-cell">${inputDe('t', r.numero, on, null, dis, 'maxlength="11"')}${ro?'':ico('mas','Agregar equipo',`docAddEq(${i})`)}</div>`;
    if(t==='pesoCalc') return `<span class="doc-num">${n0(pesoBruto(d, r))}</span>`;
    if(t==='r37'){ const x = excesos({...d, equipos:[r]}); return x.length ? `<span class="doc-r37 cc-prop" title="${esc(x.map(excTxt).join('\n'))}">${svgI('peso')} Supera</span>` : '<span class="doc-mut cc-prop">Sin alerta</span>'; }
    if(t==='monto') return `<span class="doc-num">${n0((+r.tarifa||0)*(+r.cantidad||0))}</span>`;
    if(t==='eqSel') return sel(d.equipos.filter(e=>!e.roleado).map(e=>e.numero), r.equipo, `${dis} onchange="${on}"`, 'Elegir');
    if(t==='sellos') return `<button type="button" class="fac-link" onclick="docSellos(${i})">Sellos (${r.sellos.length})</button>`;
    if(t==='pelig') return `<button type="button" class="fac-link" onclick="docPelig(${i})">Material Peligroso (${r.peligrosos.length})</button>`;
    if(t==='partida') return `<div class="doc-cell">${inputDe('t', r.partida, on, null, dis, 'style="width:110px"')}${ro?'':ico('lista','Elegir partida arancelaria',`docPartida(${i})`)}</div>${exp?partidaMsg(r.partida):''}`;
    if(t==='desc') return `<div class="doc-cell"><span class="doc-desc" title="${esc(r[key])}">${esc(r[key]||'')}</span>${ro?'':ico('lapiz','Editar descripción',`docDescEd('${lista}',${i},'${key}')`)}</div>`;
    return inputDe(t, r[key], on, o, dis, t==='t'?'style="width:150px"':'');
  };
  const todos = filas.length && filas.every((_,i)=>selR.has(i));
  return `<div class="fac-acts doc-gridacts">${ro?'':ghost('Agregar',`docEdAdd('${lista}')`)+ghost('Eliminar',`docEdDel('${lista}')`)}</div>
    <div class="fac-scroll" id="docG${lista}"><table class="fac-tbl doc-grid"><thead><tr>${ro?'':`<th><input type="checkbox" ${todos?'checked':''} onchange="docEdSelAll('${lista}',this.checked)"></th>`}${spec.map(c=>`<th>${c[1]}${c[2]==='r37'?' '+M37():''}</th>`).join('')}</tr></thead><tbody>
    ${filas.map((r,i)=>`<tr class="${r.roleado?'doc-roleado':''}">${ro?'':`<td><input type="checkbox" ${selR.has(i)?'checked':''} onchange="docEdSel('${lista}',${i},this.checked)"></td>`}${spec.map(c=>`<td>${celda(r,i,c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${spec.length+1}" class="fac-empty">Sin registros</td></tr>`}
    </tbody></table></div>`;
}
function trazHtml(d){
  const r = d.roleo;
  if(!r) return '<p class="doc-mut">Este BL no tiene trazabilidad de roleo.</p>';
  return `<div class="fac-sec">Cadena de Roleo</div><p>BL Origen: <button type="button" class="fac-link" onclick="docExpEditar('${r.origenId}')">${esc(r.origen)}</button></p>
    <div class="fac-sec">Origen de este BL</div><table class="fac-tbl"><thead><tr><th>Nave/Viaje origen</th><th>Nave/Viaje destino</th><th>Fecha de roleo</th><th>Usuario</th><th>Equipos roleados</th><th>Estado</th></tr></thead><tbody>
    <tr><td>${esc(r.nvOrigen)}</td><td>${esc(r.nvDestino)}</td><td>${fdt(r.ts)}</td><td>${esc(r.user)}</td><td>${r.equipos.length}</td><td>EJECUTADO</td></tr></tbody></table>
    <div class="fac-sec">Equipos</div><table class="fac-tbl"><thead><tr><th>Número de Equipo</th><th>BL Origen</th><th>BL Destino</th><th>Nave/Viaje Origen</th><th>Nave/Viaje Destino</th><th>Estado</th></tr></thead><tbody>
    ${r.equipos.map(n=>`<tr><td>${esc(n)}</td><td>${esc(r.origen)}</td><td>${esc(r.destino)}</td><td>${esc(r.nvOrigen)}</td><td>${esc(r.nvDestino)}</td><td>${r.destino===d.numero?'Recibido por Roleo':'Enviado para Roleo'}</td></tr>`).join('')}</tbody></table>`;
}
const edRe = () => { S.ed.dirty = true; rerender(ED_ID(S.ed.k)); };
window.docEdTab = t => { S.ed.tab = t; rerender(ED_ID(S.ed.k)); };
/* HU-DM-01 · I-035: consignatario, notificante y embarcador solo aceptan socios de tipo Cliente */
const rdFiltra = l => typeof window.ptRdFiltra==='function' ? window.ptRdFiltra(l, 'cli') : l;
window.docEd = (key, v) => { const d = S.ed.d;
  if(['embarcador','consignatario','notificante'].includes(key) && typeof window.ptRdAviso==='function' && !window.ptRdAviso(v, 'cli')){ rerender(ED_ID(S.ed.k)); return; }
  d[key] = v;
  if(key==='linea') d.lineaCod = lineaCod(v);
  if(key==='via' && v==='Embarque Directo'){ d.codAduana = '9998'; d.entidad = d.embarcador; }
  if(key==='entidad'){ const dp = DEPOSITOS.find(x=>x.n===v); if(dp){ d.codAduana = dp.cod; d.ruc = dp.ruc; } }
  if(key==='puertoDescarga' && !d.puertoFinal) d.puertoFinal = v;
  edRe(); };
window.docEdViaje = v => { const [nro, nave] = String(v).split('|').map(x=>x.trim()); S.ed.d.viaje = nro || ''; if(nave) S.ed.d.nave = nave; edRe(); };
window.docEdR = (lista, i, key, v) => { const d = S.ed.d, r = d[lista][i], viejo = r[key]; r[key] = v;
  if(lista==='equipos' && key==='numero'){ r.numero = String(v).toUpperCase(); d.carga.forEach(c=>{ if(c.equipo===viejo) c.equipo = r.numero; });
    if(d.equipos.some((e,j)=>j!==i && e.numero===r.numero)){ CC.toast(`El equipo ${r.numero} ya está agregado a ${S.ed.k==='imp'?'este BL':'esta Reserva'}`,'error'); r.numero = viejo; } }
  if(lista==='equipos' && key==='tipo'){ r.tara = TARA[v]||r.tara; r.payload = PAYLOAD[v]||r.payload; }
  if(lista==='recargos' && (key==='cargo'||key==='tipoCont')){ const dup = d.recargos.some((x,j)=>j!==i && x.cargo===r.cargo && (x.tipoCont||'')===(r.tipoCont||''));
    if(dup){ const que = S.ed.k==='imp'?'este BL':'esta Reserva'; CC.toast(r.tipoCont ? `El tipo de contenedor ${r.tipoCont} con Recargo - Cláusula ${r.cargo} ya ha sido agregado a ${que}` : `El tipo de cargo ${r.cargo} ya ha sido agregado a ${que}`,'error'); r[key] = viejo; } }
  if(lista==='recargos') r.monto = (+r.tarifa||0)*(+r.cantidad||0);
  edRe(); };
window.docEdSel = (lista, i, on) => { S.ed.selR[lista][on?'add':'delete'](i); };
window.docEdSelAll = (lista, on) => { S.ed.d[lista].forEach((_,i)=>S.ed.selR[lista][on?'add':'delete'](i)); rerender(ED_ID(S.ed.k)); };
window.docEdAdd = lista => { const d = S.ed.d;
  if(lista==='equipos'){ if(S.ed.k==='exp' && d.roleo && d.roleo.destino===d.numero){ CC.toast('No se pueden agregar equipos a un BL generado por roleo.','error'); return; } d.equipos.push(mkEq('', '', {tara:'', payload:''})); }
  else { if(lista==='carga' && d.equipos.some(e=>e.cond==='EMPTY') && d.carga.length>=1){ CC.toast('Para contenedores vacíos (EMPTY) solo se permite un registro de información de carga.','error'); return; } d[lista].push(clone(NUEVA[lista])); }
  edRe(); };
window.docEdDel = lista => { const s = S.ed.selR[lista]; if(!s || !s.size){ CC.toast('Seleccione al menos un registro.','error'); return; }
  const go = () => { S.ed.d[lista] = S.ed.d[lista].filter((_,i)=>!s.has(i)); s.clear(); edRe(); };
  if(lista==='equipos') confirmar('Eliminar equipos','¿Estás seguro de que deseas eliminar esto(s) equipo(s)?','Eliminar',go); else go(); };
window.docEdEditar = () => { const d = S.ed.d;
  if(d.solicitud){ CC.toast('No se puede editar el BL: ya existe un N° de Solicitud de Transbordo.','error'); return; }
  S.ed.ro = false; S.ed.d = clone(buscarBL(S.ed.id)); rerender(ED_ID(S.ed.k));
  if(S.ed.k==='imp'){ const r = S.dir.find(x=>x.bl===d.numero && x.estado==='Aprobado');
    if(r && (r.entSol!==d.entidad || r.codSol!==d.codAduana || r.rucSol!==d.ruc)){ K.rt = r;
      dlg('Routing aplicable encontrado', `<p>Existe un routing aprobado de tipo ${esc(r.tipoRt)} para este BL. ¿Desea aplicar los datos de Entidad Receptora, Código Aduana y RUC al formulario?</p><dl class="fac-kv"><dt>Entidad Receptora</dt><dd>${esc(r.entSol)}</dd><dt>Código Aduana</dt><dd>${esc(r.codSol)}</dd><dt>RUC</dt><dd>${esc(r.rucSol)}</dd></dl>`, [['Omitir','docCbNo()','ghost'],['Aplicar al BL','docRtAplicar()']]); } } };
window.docRtAplicar = () => { const r = K.rt, d = S.ed.d; d.entidad = r.entSol; d.codAduana = r.codSol; d.ruc = r.rucSol; CC.cerrarModal(); edRe(); };
window.docEdCancelar = () => { const E = S.ed, salir = () => { if(E.nuevo) docVolver(true); else { E.ro = true; E.dirty = false; rerender(ED_ID(E.k)); } };
  if(E.dirty) confirmar('Descartar Cambios','Tiene cambios no guardados. ¿Está seguro de que desea salir sin guardar?','Salir sin guardar', salir); else salir(); };
window.docVolver = forzar => { const E = S.ed, ir = () => { const k = E.k, vol = E.volver; S.ed = null; if(vol) vol(); else CC.abrir(k==='imp'?'screenDocImp':'screenDocExp'); };
  if(!forzar && E && !E.ro && E.dirty) confirmar('Descartar Cambios','Tiene cambios no guardados. ¿Está seguro de que desea salir sin guardar?','Salir sin guardar', ir); else ir(); };
window.docEdEliminar = () => { const E = S.ed, imp = E.k==='imp';
  confirmar('Eliminar', imp ? '¿Estás seguro de que deseas eliminar este BL?' : '¿Estás seguro de que deseas eliminar esta Reserva?', 'Eliminar', ()=>{
    const l = imp ? S.imp : S.exp, i = l.findIndex(b=>b.id===E.id); if(i>=0) l.splice(i,1);
    CC.toast(imp?'BL eliminado correctamente':'Reserva eliminada correctamente','success'); docVolver(true); }); };
/* Guardar */
const CAMPOS_HIST = {tipo:'Tipo de BL', tipoInd:'Tipo de indicador', linea:'Línea Naviera', embarcador:'Embarcador', consignatario:'Consignatario', notificante:'Notificante', tipoEmision:'Tipo de Emisión', fechaEmision:'Fecha de Emisión', condEmbarque:'Condición de Embarque', tipoCarga:'Tipo de Carga', cantidad:'Cantidad de Carga', pesoTotal:'Peso Bruto (KG)', volumen:'Volumen (M3)', incoterm:'Incoterm', tipoDespacho:'Tipo de Despacho', entidad:'Entidad Receptora', codAduana:'Código Aduana', ruc:'RUC', puertoCarga:'Puerto Embarque', puertoDescarga:'Puerto Descarga', puertoFinal:'Puerto Final', via:'Vía de Embarque', condPago:'Condición de Pago'};
window.docEdGuardar = () => {
  const E = S.ed, d = E.d, imp = E.k==='imp', falta = [];
  if(E.nuevo){ if(!d.numero) falta.push(imp?'Número BL':'Número de Reserva'); if(!d.viaje) falta.push('Número de Viaje'); }
  if(!d.indicador) falta.push('Indicador'); if(!d.tipoInd) falta.push('Tipo de indicador');
  if(!imp){ if(!d.puertoCarga) falta.push('Puerto de embarque'); if(!d.puertoDescarga) falta.push('Puerto de descarga'); if(!d.puertoFinal) falta.push('Puerto de destino'); if(!d.embarcador) falta.push('Embarcador'); }
  if(falta.length){ CC.toast(`Complete los siguientes campos obligatorios: ${falta.join(', ')}.`,'error'); return; }
  if(!imp && E.nuevo && !/^[A-Z0-9./-]{1,20}$/.test(d.numero)){ CC.toast('El Número de Reserva solo admite mayúsculas, dígitos y los caracteres . / -','error'); return; }
  const l = imp ? S.imp : S.exp; if(E.nuevo && l.some(b=>b.numero===d.numero)){ CC.toast(`${imp?'El BL':'La Reserva'} ${d.numero} ya existe.`,'error'); return; }
  const real = buscarBL(E.id);
  const paso2 = () => {
    if(real && real.estado==='TRANSMITIDO A SUNAT'){
      if(imp) { K.si = ()=>aplicarGuardar('POR RECTIFICAR'); K.no = ()=>aplicarGuardar(null);
        dlg('Guardar cambios de un BL transmitido', '<p>El BL ya fue transmitido a SUNAT. ¿Desea pasarlo a Por Rectificar para luego transmitir la rectificación (0102)? Si solo guarda, SUNAT no recibe los cambios.</p>', [['No, solo guardar','docCbNo()','ghost'],['Sí, pasar a Por Rectificar','docCbSi()']]); }
      else confirmar('Cambiar estado a Por Rectificar','¿Desea cambiar el estado del BL a "Por Rectificar"? Solo se actualizarán los datos del BL.','Sí, cambiar estado',()=>aplicarGuardar('POR RECTIFICAR'));
    } else aplicarGuardar(null);
  };
  const exc = !imp && P37() ? excesos(d) : [];
  if(exc.length){ K.si = paso2; K.no = null;
    CC.modal(`<div ${CC.propuesta('I-037','Aviso al guardar')}><h3>Aviso de restricción de exportación ${M37()}</h3><p>Los siguientes equipos superan una restricción vigente. La alerta solo avisa: puede guardar igual.</p><ul class="doc-ul warn">${exc.map(x=>`<li>${esc(excTxt(x))}</li>`).join('')}</ul></div><div class="fac-btns">${ghost('Revisar','docCbNo()')}${btn('Entendido, guardar','docCbSi()','','id="docR37Ok"')}</div>`, 'md');
  } else paso2();
};
function aplicarGuardar(nuevoEstado){
  const E = S.ed, d = E.d, imp = E.k==='imp', l = imp ? S.imp : S.exp, real = buscarBL(E.id);
  const cambios = real ? Object.keys(CAMPOS_HIST).filter(k=>String(real[k]??'')!==String(d[k]??'')).map(k=>({campo:CAMPOS_HIST[k], antes:String(real[k]??''), despues:String(d[k]??'')})) : [];
  const eraPR = !imp && real && real.estado==='POR REVISAR';
  if(!real){ d.id = (imp?'I':'E') + (++S.seq); d.estado = 'POR REVISAR'; d.emision = d.emision || d.fechaEmision || hoyISO(); d.audit = {c:CC.usuario(), cts:ahora(), u:CC.usuario(), ts:ahora()}; d.hist = [ev(imp?'BL creado':'Reserva creada', CC.usuario())]; d.version = 1; l.push(d); }
  else { Object.assign(real, d); }
  const b = buscarBL(d.id); tocar(b);
  if(nuevoEstado) b.estado = nuevoEstado;
  if((b.estado==='POR REVISAR' || !b.estado) && !(imp ? pendImp(b) : pendExp(b)).length) b.estado = 'APROBADO';
  if(eraPR) registrarParcial(b);
  if(cambios.length){ b.version = (b.version||1) + 1; b.cambios.push({ver:b.version, origen:'Edición interna', sobre:b.version-1, ts:ahora(), user:CC.usuario(), campos:cambios}); }
  b.hist.push(ev(`${E.nuevo?'Registro':'Cambios guardados'}. Estado: ${b.estado}`, CC.usuario()));
  const eraNuevo = E.nuevo; S.ed = {...E, id:b.id, nuevo:false, ro:true, dirty:false, d:clone(b)};
  CC.toast(imp ? (eraNuevo?'Importación creada correctamente':'Importación actualizada correctamente') : (eraNuevo?'Reserva creada correctamente':'Reserva actualizada correctamente'), 'success');
  rerender(ED_ID(E.k));
  if(!imp && !eraNuevo && !nuevoEstado){ const lr = lastRes(b);
    if(b.estado==='APROBADO' && !b.manual && lr && lr.st==='COMPLETED' && lr.c!=='0173' && cambios.length) confirmar('Reserva Rectificada','¿Desea Transmitir la rectificación a Sunat?','Transmitir',()=>expTx(b,'res','0172','Rectificación por cambios en la reserva'));
    else if(b.estado==='POR RECTIFICAR' && cambios.length) confirmar('BL Rectificado','¿Desea Transmitir la rectificación a Sunat?','Transmitir',()=>docRectExp()); }
}
/* Acciones de cabecera */
window.docListo = () => { const b = buscarBL(S.ed.id);
  confirmar('Listo para facturar','¿Desea cambiar el BL al estado Listo para facturar?','Sí',()=>{
    if(b.sinConceptos){ CC.toast('No se encontraron conceptos de pago para este BL. Configure la tarifa de documentación o los requisitos antes de continuar.','error'); return; }
    b.pago = 'Listo para facturar'; b.conceptos = true; b.hist.push(ev('Estado Pago: Listo para facturar. Conceptos de pago generados', CC.usuario())); tocar(b);
    CC.toast('Documento BL modificado a Listo para facturar','success'); rerender(ED_ID(S.ed.k)); }, 'No'); };
function validacionesTx(lista, sub){ dlg('Validaciones para transmisión a SUNAT', `<p>${sub}</p><table class="fac-tbl"><thead><tr><th>Nombre del Campo</th><th>Ruta XML</th></tr></thead><tbody>${lista.map(x=>`<tr><td>${esc(x)}</td><td class="doc-mut">/Manifiesto/BL/${esc(x.replace(/[^A-Za-z]/g,''))}</td></tr>`).join('')}</tbody></table>`, [['Entendido','docCbSi()']], 'md'); }
window.docRectImp = () => { const b = buscarBL(S.ed.id);
  if(b.solicitud){ CC.toast('No se puede rectificar: ya existe un N° de Solicitud de Transbordo.','error'); return; }
  if(last(b.sunat) && last(b.sunat).st==='PENDING'){ CC.toast('Existe una transmisión SUNAT en curso. Espere a que finalice para continuar.','error'); return; }
  confirmar('Transferir Rectificación','¿Estás seguro de enviar la transmisión 0102 a SUNAT?','Enviar',()=>{
    const p = pendImp(b).concat(b.equipos.filter(e=>!e.sellos.length).map(e=>`Número de Equipo ${e.numero}: Sellos`));
    if(p.length){ validacionesTx(p, 'Antes de transmitir la rectificación (0102), completa los siguientes datos obligatorios en el mantenimiento del BL.'); return; }
    transmitir(b, 'sunat', '0102', 'Rectificación desde el mantenimiento del BL', t=>CC.toast(t.st==='COMPLETED'?'Transmisión a SUNAT realizada exitosamente':'Error al transmitir a SUNAT', t.st==='COMPLETED'?'success':'error')); }); };
/* SUNAT de exportación: reserva (0171, 0172, 0173) y BL (0154, 0153, 0156) */
const NO_EST = 'La transmisión SUNAT no está permitida para el estado actual del BL.';
const enCurso = l => `Ya existe la transmisión SUNAT ${l.c} en curso (Pendiente). Espere la respuesta antes de transmitir o cancelar.`;
function opsRes(b){
  if(b.manual) return null; if(b.estado==='POR REVISAR' || b.estado==='Anulado') return {block:NO_EST};
  const l = lastRes(b); if(l && l.st==='PENDING') return {block:enCurso(l)};
  if(!l || (l.c==='0173' && l.st==='COMPLETED')) return {send:'0171'};
  if(l.st==='ERROR') return l.c==='0173' ? {cancel:'0173', retry:true} : {send:l.c, retry:true};
  return {send:'0172', cancel:'0173'};
}
function opsBl(b){
  if(b.estado==='POR REVISAR' || b.estado==='Anulado') return {block:NO_EST};
  if(!resOk(b)) return {block:'Requiere la transmisión previa de la reserva (0171).'};
  const l = lastBl(b); if(l && l.st==='PENDING') return {block:enCurso(l)};
  if(!l || (l.c==='0156' && l.st==='COMPLETED')) return {send:'0154'};
  if(l.st==='ERROR') return l.c==='0156' ? {cancel:'0156', retry:true} : {send:l.c, retry:true};
  return {send:'0153', cancel:'0156'};
}
const MSJ_TX = {res:['¿Desea transmitir la reserva de carga a SUNAT?','¿Desea cancelar la transmisión de la reserva de carga a SUNAT?','La transmisión de la reserva a SUNAT se realizó correctamente.','La cancelación de la reserva en SUNAT se realizó correctamente.'],
  bl:['¿Desea transmitir este BL a SUNAT?','¿Desea cancelar la transmisión de este BL a SUNAT?','La transmisión del BL a SUNAT se realizó correctamente.','La cancelación del BL en SUNAT se realizó correctamente.']};
function expTx(b, w, code, motivo){ const cancel = ['0173','0156'].includes(code);
  transmitir(b, w, code, motivo, t=>CC.toast(t.st==='COMPLETED' ? MSJ_TX[w][cancel?3:2] : 'Error al transmitir a SUNAT', t.st==='COMPLETED'?'success':'error')); }
function camposPendSunat(lista){ aviso('Campos pendientes para transmitir a SUNAT', `<p>Complete los siguientes campos para poder transmitir a SUNAT:</p><ul class="doc-ul">${lista.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`); }
window.docExpSunat = (id, w, accion) => {
  const b = buscarBL(id), o = w==='res' ? opsRes(b) : opsBl(b); if(!o) return; if(o.block){ CC.toast(o.block,'error'); return; }
  const code = accion==='cancel' ? o.cancel : o.send; if(!code) return;
  if(w==='bl' && accion!=='cancel'){ if(PV() && bloqueoPartida(b)) return; const p = pendSunatExp(b); if(p.length){ camposPendSunat(p); return; } }
  confirmar('Transmisión SUNAT', MSJ_TX[w][accion==='cancel'?1:0], 'Confirmar', ()=>{
    const primero = ['0171','0154'].includes(code) || o.retry;
    if(primero) expTx(b, w, code, ''); else pedirMotivo({titulo:'Motivo', max:100, cb:m=>expTx(b, w, code, m)}); });
};
function iconosExp(b, w){
  if(b.estado==='POR REVISAR') return '-';
  const o = w==='res' ? opsRes(b) : opsBl(b); if(!o) return '';
  const l = w==='res' ? lastRes(b) : lastBl(b), pend = l && l.st==='PENDING', ic = [];
  if(w==='bl' && (b.errores.length || (l && l.st==='ERROR'))) ic.push(ico('error','Ver detalle de error SUNAT',`docSunatDet('${b.id}','err')`,{cls:'rojo'}));
  if(w==='bl' && b.advertencias.length) ic.push(ico('adv','Ver detalle de advertencia SUNAT',`docSunatDet('${b.id}','adv')`,{cls:'ambar'}));
  if(w==='bl' && pendSunatExp(b).length) ic.push(ico('lista','Ver campos pendientes para transmitir a SUNAT',`docPendSunat('${b.id}')`,{cls:'ambar'}));
  const t1 = w==='res' ? 'Transmitir reserva a SUNAT' : 'Transmitir BL a SUNAT', t2 = w==='res' ? 'Cancelar transmisión de reserva a SUNAT' : 'Cancelar transmisión de BL a SUNAT';
  ic.push(ico('enviar', o.block ? o.block : `${t1}. ${l?`Última transmisión: ${l.c}. `:''}Enviará: ${o.send||'-'}`, `docExpSunat('${b.id}','${w}','send')`, {dis:!!o.block || pend || !o.send}));
  ic.push(ico('cancel', o.block ? o.block : `${t2}${o.cancel?`. Enviará: ${o.cancel}`:''}`, `docExpSunat('${b.id}','${w}','cancel')`, {dis:!!o.block || pend || !o.cancel}));
  return `<div class="doc-sunat">${estSunat(l)}<span class="doc-ics">${ic.join('')}</span></div>`;
}
window.docPendSunat = id => camposPendSunat(pendSunatExp(buscarBL(id)));
window.docRectExp = () => { const b = buscarBL(S.ed.id), w = b.estado==='POR RECTIFICAR' ? 'bl' : 'res', l = w==='bl' ? lastBl(b) : lastRes(b);
  if(l && l.st==='PENDING'){ CC.toast('Existe una transmisión SUNAT en curso. Espere a que finalice para continuar.','error'); return; }
  confirmar('Rectificación de BL','¿Está seguro de enviar la rectificación a SUNAT?','Enviar',()=>{
    const p = w==='bl' ? pendExp(b).concat(pendSunatExp(b)) : pendExp(b);
    if(p.length){ validacionesTx(p, 'Antes de transmitir la rectificación, complete los siguientes datos obligatorios en el mantenimiento del BL.'); return; }
    pedirMotivo({titulo:'Motivo', max:100, cb:m=>expTx(b, w, w==='bl'?'0153':'0172', m)}); }); };
window.docExpTxBl = () => docExpSunat(S.ed.id, 'bl', 'send');
window.docConceptos = () => { const b = buscarBL(S.ed.id); confirmar('Generar conceptos de pago','¿Desea generar los conceptos de pago para este BL?','Generar',()=>{ b.conceptos = true; b.hist.push(ev('Conceptos de pago generados', CC.usuario())); CC.toast('Conceptos de pago generados correctamente','success'); rerender('screenDocExpRes'); }); };
window.docExtemp = () => { const b = buscarBL(S.ed.id); confirmar('Transmisión Extemporánea','¿Está seguro de retransmitir una reserva de manera extemporánea?','Confirmar',()=>{
  b.extemp = false; b.extRes = true; transmitir(b, 'res', '0171', 'Transmisión extemporánea', t=>CC.toast(t.st==='COMPLETED'?'Reserva transmitida correctamente.':'Error al transmitir a SUNAT', t.st==='COMPLETED'?'success':'error')); }); };
/* Transmisión de Reserva Manual */
window.docManual = id => { const b = buscarBL(id);
  confirmar('Transmisión de Reserva Manual','¿Desea registrar una transmisión de reserva manual?','Sí',()=>pedirMotivo({titulo:'Transmisión de Reserva Manual', min:1, max:100,
    extra:campo('Fecha de Transmisión',`<input type="datetime-local" id="docManFecha" value="${b.manual&&b.manual.fecha||''}"><div class="doc-mut">Opcional. Fecha real de la transmisión realizada por el partner.</div>`),
    leer:()=>$('docManFecha').value, cb:(m, fecha)=>{ b.manual = {motivo:m, fecha}; b.hist.push(ev(`Transmisión de reserva manual registrada. Motivo: ${m}`, CC.usuario())); CC.toast('Transmisión de reserva manual registrada.','success'); refrescarActiva(); }}), 'No'); };
/* Roleo */
window.docRoleo = () => { const b = buscarBL(S.ed.id);
  if(lastBl(b) && lastBl(b).st==='COMPLETED'){ CC.toast('No se puede rolear un BL ya transmitido a SUNAT.','error'); return; }
  K.rol = {b, paso:1, tipo:'', sel:new Set(), nave:'', viaje:''}; pintarRoleo(); };
function pintarRoleo(){
  const r = K.rol, b = r.b, vig = b.equipos.filter(e=>!e.roleado), pasos = ['Tipo de Roleo','Contenedores','Nueva Nave/Viaje','Confirmar'];
  let c = '';
  if(r.paso===1) c = `<div class="doc-cards">${[['Total','Roleo Total','Todos los contenedores pasan a una nueva reserva.'],['Parcial','Roleo Parcial','Solo los contenedores elegidos pasan a una nueva reserva.']].map(([k,t,x])=>`<button type="button" class="doc-card ${r.tipo===k?'on':''}" onclick="docRol('tipo','${k}')"><b>${t}</b><span>${x}</span></button>`).join('')}</div>`;
  if(r.paso===2) c = `<table class="fac-tbl"><thead><tr><th></th><th>Número de equipo</th><th>Tipo</th><th>Condición</th><th>Peso Bruto (Kg)</th></tr></thead><tbody>${vig.map(e=>`<tr><td><input type="checkbox" ${r.sel.has(e.numero)?'checked':''} onchange="docRolSel('${e.numero}',this.checked)"></td><td>${esc(e.numero)}</td><td>${esc(e.tipo)}</td><td>${esc(e.cond)}</td><td>${n0(pesoBruto(b,e))}</td></tr>`).join('')}</tbody></table><p class="doc-mut">${r.sel.size} de ${vig.length} seleccionados</p>`;
  if(r.paso===3) c = `<div class="fac-g2">${campo('Nave *',`<input list="docRolNaves" value="${esc(r.nave)}" onchange="docRol('nave',this.value)">${dl('docRolNaves',naves())}`)}${campo('Número de viaje *',`<input list="docRolViajes" value="${esc(r.viaje)}" ${r.nave?'':'disabled'} onchange="docRol('viaje',this.value)">${dl('docRolViajes',viajesDe(r.nave))}`)}</div>`;
  if(r.paso===4) c = `<dl class="fac-kv"><dt>Tipo de Roleo</dt><dd>Roleo ${r.tipo}</dd><dt>Origen</dt><dd>${esc(b.numero)} · ${esc(b.nave)} / ${esc(b.viaje)}</dd><dt>Nuevo BL</dt><dd>${esc(b.numero)}-R${(b.roleos||0)+1} · ${esc(r.nave)} / ${esc(r.viaje)} · POR REVISAR</dd><dt>Contenedores</dt><dd>${r.tipo==='Total'?vig.length:r.sel.size}</dd><dt>Usuario</dt><dd>${esc(CC.usuario())}</dd><dt>Fecha</dt><dd>${fdt(ahora())}</dd></dl>`;
  CC.modal(`<h3>Roleo de BL: ${esc(b.numero)}</h3><div class="doc-pasos">${pasos.map((p,i)=>`<span class="${r.paso===i+1?'on':r.paso>i+1?'ok':''}">${i+1}. ${p}</span>`).join('')}</div>${c}
    <div class="fac-btns">${ghost('Cancelar','docCbNo()')}${r.paso>1?ghost('Anterior','docRolPaso(-1)'):''}${r.paso<4?btn('Siguiente','docRolPaso(1)'):btn('Confirmar','docRolOk()')}</div>`, 'md');
}
window.docRol = (k, v) => { K.rol[k] = v; if(k==='nave') K.rol.viaje = ''; pintarRoleo(); };
window.docRolSel = (n, on) => { K.rol.sel[on?'add':'delete'](n); pintarRoleo(); };
window.docRolPaso = s => { const r = K.rol, vig = r.b.equipos.filter(e=>!e.roleado);
  if(s>0 && r.paso===1 && !r.tipo){ CC.toast('Seleccione el tipo de roleo.','error'); return; }
  if(s>0 && r.paso===2){ if(!r.sel.size){ CC.toast('Selecciona al menos un contenedor.','error'); return; } if(r.sel.size===vig.length){ CC.toast('El roleo parcial debe dejar al menos un contenedor en el BL de origen.','error'); return; } }
  if(s>0 && r.paso===3 && (!r.nave || !r.viaje)){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  r.paso += s; if(r.paso===2 && r.tipo==='Total') r.paso += s; pintarRoleo(); };
window.docRolOk = () => { const r = K.rol, b = r.b, nums = r.tipo==='Total' ? b.equipos.filter(e=>!e.roleado).map(e=>e.numero) : [...r.sel];
  b.roleos = (b.roleos||0) + 1; const n = clone(b); n.id = 'E' + (++S.seq); n.numero = `${b.numero}-R${b.roleos}`; n.nave = r.nave; n.viaje = r.viaje; n.estado = 'POR REVISAR'; n.res = []; n.bl = []; n.manual = null; n.info = null; n.errores = [];
  n.equipos = b.equipos.filter(e=>nums.includes(e.numero)).map(e=>({...e, roleado:false})); n.carga = b.carga.filter(c=>nums.includes(c.equipo)); n.version = 1; n.cambios = []; n.badge = `Generado por roleo ${r.tipo.toLowerCase()}`;
  const traz = {origen:b.numero, origenId:b.id, destino:n.numero, nvOrigen:`${b.nave} / ${b.viaje}`, nvDestino:`${r.nave} / ${r.viaje}`, ts:ahora(), user:CC.usuario(), equipos:nums};
  n.roleo = traz; n.hist = [ev(`Generado por roleo ${r.tipo.toLowerCase()} desde ${b.numero}`, CC.usuario())]; tocar(n); S.exp.push(n);
  b.equipos.forEach(e=>{ if(nums.includes(e.numero)) e.roleado = true; }); b.roleo = traz; b.badge = r.tipo==='Total' ? 'Afectado por roleo total' : 'Afectado por roleo parcial'; if(r.tipo==='Total') b.badge += ' · Histórico';
  b.hist.push(ev(`Roleo ${r.tipo.toLowerCase()} ejecutado hacia ${n.numero} (${nums.join(', ')})`, CC.usuario())); CC.cerrarModal();
  if(r.tipo==='Total'){ CC.toast('Roleo total ejecutado. Se abrirá la nueva reserva.','success'); docExpEditar(n.id); }
  else { CC.toast('Roleo parcial completado. Se creó un nuevo BL con los contenedores seleccionados.','success'); S.ed.d = clone(b); rerender('screenDocExpRes'); } };

/* Diálogos de equipos: Sellos, Materiales Peligrosos, Partida, Descripción, Agregar equipo */
window.docSellos = i => { const e = S.ed.d.equipos[i]; K.se = {i, l:clone(e.sellos), sel:new Set(), err:{}}; pintarSellos(); };
function validarSello(s, j){
  const imp = S.ed.k==='imp', d = S.ed.d, n = String(s.numero||'');
  if(!n) return '';
  if(imp){ if(n.length>30) return 'Máximo 30 caracteres'; }
  else { if(n.length>15) return 'Máximo 15 caracteres: SUNAT no acepta un sello más largo'; if(/[\s$%]/.test(n)) return 'El sello no puede tener espacios ni los símbolos $ o %';
    if(s.tipo==='Sello de aduanas' && !/^\d{3}[A-Z]{2}\d{6}$/.test(n)) return 'El sello de aduanas debe tener 3 dígitos, 2 letras y 6 dígitos (ej. 002PR118796)';
    if(s.tipo==='Sello de naviera/transportista' && (d.lineaCod||lineaCod(d.linea))==='ZIM' && !/^A\d{10}$/.test(n)) return 'El sello de línea ZIM debe tener la letra A y 10 dígitos'; }
  if(K.se.l.some((x,k)=>k!==j && x.numero===n)) return 'Este número de sello está repetido en la lista';
  const eq = d.equipos[K.se.i];
  for(const b of [...S.imp, ...S.exp]) for(const e of b.equipos) if(!(b.id===d.id && e.numero===eq.numero) && e.sellos.some(x=>x.numero===n)) return `Este número de sello ya existe. BL: ${b.numero} - Contenedor: ${e.numero}`;
  return '';
}
function pintarSellos(){
  const s = K.se, ro = S.ed.ro, dis = ro ? 'disabled' : '', eq = S.ed.d.equipos[s.i];
  CC.modal(`<h3>Sellos <span class="doc-mut">${esc(eq.numero)}</span></h3>${ro?'':`<div class="fac-acts doc-gridacts">${ghost('Agregar','docSeAdd()')}${ghost('Eliminar','docSeDel()')}</div>`}
    <table class="fac-tbl"><thead><tr>${ro?'':'<th></th>'}<th>Tipo de Sello</th><th>Número de Sello</th></tr></thead><tbody>${s.l.map((x,j)=>`<tr>${ro?'':`<td><input type="checkbox" ${s.sel.has(j)?'checked':''} onchange="docSeSel(${j},this.checked)"></td>`}<td>${sel(SELLOS, x.tipo, `${dis} onchange="docSeSet(${j},'tipo',this.value)"`, 'Elegir')}</td>
    <td><input value="${esc(x.numero)}" ${dis} style="width:180px" onchange="docSeSet(${j},'numero',this.value)">${s.err[j]?`<div class="doc-err">${esc(s.err[j])}</div>`:''}</td></tr>`).join('') || `<tr><td colspan="3" class="fac-empty">Sin sellos</td></tr>`}</tbody></table>
    <div class="fac-btns">${ro?btn('Cerrar','docCbNo()'):ghost('Cancelar','docSeCancelar()')+btn('Guardar','docSeGuardar()')}</div>`, 'md');
}
window.docSeAdd = () => { K.se.l.push({tipo:'', numero:''}); pintarSellos(); };
window.docSeDel = () => { K.se.l = K.se.l.filter((_,j)=>!K.se.sel.has(j)); K.se.sel.clear(); K.se.err = {}; pintarSellos(); };
window.docSeSel = (j, on) => { K.se.sel[on?'add':'delete'](j); };
window.docSeSet = (j, k, v) => { K.se.l[j][k] = k==='numero' ? String(v).trim().toUpperCase() : v; K.se.err[j] = validarSello(K.se.l[j], j); pintarSellos(); };
window.docSeCancelar = () => { const inc = K.se.l.filter(x=>!x.tipo || !x.numero).length;
  if(inc) confirmar('Hay registros incompletos', `Hay ${inc} registro(s) de Sellos sin completar. Si sale, se descartarán. ¿Desea salir?`, 'Salir', null, 'Seguir editando', pintarSellos); else CC.cerrarModal(); };
window.docSeGuardar = () => { const s = K.se; s.l.forEach((x,j)=>s.err[j] = validarSello(x, j));
  if(Object.values(s.err).some(Boolean)){ pintarSellos(); return; }
  if(s.l.some(x=>!x.tipo || !x.numero)){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  S.ed.d.equipos[s.i].sellos = s.l; CC.cerrarModal(); edRe(); };
window.docPelig = i => { K.pg = {i, l:clone(S.ed.d.equipos[i].peligrosos)}; pintarPelig(); };
function pintarPelig(){
  const p = K.pg, ro = S.ed.ro, dis = ro ? 'disabled' : '';
  CC.modal(`<h3>Materiales Peligrosos</h3>${ro?'':`<div class="fac-acts doc-gridacts">${ghost('Agregar','docPgAdd()')}</div>`}<table class="fac-tbl"><thead><tr><th>IMDG *</th><th>Número UN *</th><th>¿Es Contaminante Marino?</th><th>Nombre de Envío Adecuado</th>${ro?'':'<th></th>'}</tr></thead><tbody>
    ${p.l.map((x,j)=>`<tr><td>${sel(['1','2.1','2.2','3','4.1','5.1','6.1','8','9'], x.imdg, `${dis} onchange="docPgSet(${j},'imdg',this.value)"`, 'Elegir')}</td><td><input value="${esc(x.un)}" ${dis} maxlength="4" style="width:80px" onchange="docPgSet(${j},'un',this.value)"></td>
    <td><input type="checkbox" ${x.cont?'checked':''} ${dis} onchange="docPgSet(${j},'cont',this.checked)"></td><td><input value="${esc(x.nombre)}" ${dis} maxlength="200" onchange="docPgSet(${j},'nombre',this.value)"></td>${ro?'':`<td>${ico('cancel','Eliminar',`docPgDel(${j})`)}</td>`}</tr>`).join('') || '<tr><td colspan="5" class="fac-empty">Sin materiales peligrosos</td></tr>'}</tbody></table>
    <div class="fac-btns">${ro?btn('Cerrar','docCbNo()'):ghost('Cancelar','docCbNo()')+btn('Guardar','docPgGuardar()')}</div>`, 'md');
}
window.docPgAdd = () => { K.pg.l.push({imdg:'', un:'', cont:false, nombre:''}); pintarPelig(); };
window.docPgDel = j => { K.pg.l.splice(j,1); pintarPelig(); };
window.docPgSet = (j, k, v) => { K.pg.l[j][k] = v; };
window.docPgGuardar = () => { const l = K.pg.l, inc = l.filter(x=>!x.imdg || !x.un).length;
  if(inc){ CC.toast(`Hay ${inc} registro(s) de Materiales Peligrosos sin completar (le falta la clase IMDG o el número UN).`,'error'); return; }
  const dup = l.filter((x,j)=>l.findIndex(y=>y.imdg===x.imdg && y.un===x.un)!==j);
  if(dup.length){ CC.toast(`Se encontraron materiales peligrosos duplicados: ${dup.map(x=>`IMDG ${x.imdg} UN ${x.un}`).join(', ')}`,'error'); return; }
  S.ed.d.equipos[K.pg.i].peligrosos = l; CC.cerrarModal(); edRe(); };
window.docPartida = i => { K.pa = {i, q:'', v:S.ed.d.equipos[i].partida}; pintarPartida(); };
function pintarPartida(){
  const p = K.pa, l = PARTIDAS.filter(x=>has(x[0]+' '+x[1], p.q));
  CC.modal(`<h3>Partida Arancelaria</h3>${campo('Buscar',`<input placeholder="Elegir partida arancelaria" value="${esc(p.q)}" oninput="docPaQ(this.value)" id="docPaQ">`)}
    <div class="doc-lista">${l.map(x=>`<label class="doc-chk"><input type="radio" name="docPa" ${p.v===x[0]?'checked':''} onchange="docPaV('${x[0]}')"> ${x[0]} · ${esc(x[1])}</label>`).join('') || '<p class="doc-mut">No se encontraron resultados con los criterios seleccionados</p>'}</div>
    <div class="fac-btns">${ghost('Cancelar','docCbNo()')}${btn('Guardar','docPaOk()')}</div>`, 'md');
  const q = $('docPaQ'); if(q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}
window.docPaQ = q => { K.pa.q = q; pintarPartida(); };
window.docPaV = v => { K.pa.v = v; };
window.docPaOk = () => { S.ed.d.equipos[K.pa.i].partida = K.pa.v; CC.cerrarModal(); edRe(); };
window.docDescEd = (lista, i, key) => { K.de = {lista, i, key}; const v = S.ed.d[lista][i][key] || '', bulto = lista==='carga';
  dlg('Descripción', `<div class="fac-f"><textarea id="docDeTxt" rows="8">${esc(v)}</textarea><div class="doc-mut">${bulto?'Máximo 4000 caracteres en total':'Máximo 70 caracteres por línea'}</div></div>`, [['Cancelar','docCbNo()','ghost'],['Guardar','docDeOk()']], 'md'); };
window.docDeOk = () => { const k = K.de; let v = $('docDeTxt').value;
  if(k.lista==='carga'){ if(v.length>4000){ CC.toast('Máximo 4000 caracteres en total','error'); return; } }
  else v = v.split('\n').flatMap(l=>l.match(/.{1,70}/g)||['']).join('\n');
  S.ed.d[k.lista][k.i][k.key] = v; CC.cerrarModal(); edRe(); };
window.docAddEq = i => { K.ae = {i};
  dlg('Agregar equipo', `<div class="fac-g2">${campo('Número de Equipo *','<input id="docAeNum" maxlength="11" placeholder="ABCD1234567">')}${campo('Tamaño de Contenedor / Código ISO *', sel(ISO.map(x=>[x[0],`${x[0]} (${x[1]})`]), '', 'id="docAeIso" onchange="document.getElementById(\'docAeTipo\').value=this.selectedOptions[0].text.slice(6,10)"', 'Elegir'))}
    ${campo('Tipo de Contenedor *','<input id="docAeTipo" disabled>')}${campo('Peso (Máx. Bruto KG)','<input id="docAePeso" type="number" min="0">')}${campo('Tara (KG)','<input id="docAeTara" type="number" min="0">')}${campo('Payload (KG)','<input id="docAePay" type="number" min="0">')}
    <label class="doc-chk"><input type="checkbox" id="docAeSoc"> ¿Es SOC?</label>${campo('Socio',`<input id="docAeSocio" list="docAeSocios">${dl('docAeSocios', OPC.emb().concat(OPC.cons()))}`)}</div>`, [['Cancelar','docCbNo()','ghost'],['Guardar','docAeOk()']], 'md'); };
window.docAeOk = () => { const num = $('docAeNum').value.trim().toUpperCase(), iso = $('docAeIso').value, tipo = (ISO.find(x=>x[0]===iso)||[])[1];
  if(!num || !iso){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(S.ed.k==='exp' && !/^[A-Z]{4}\d{7}$/.test(num)){ CC.toast('El Número de Equipo debe tener 4 letras y 7 dígitos.','error'); return; }
  const d = S.ed.d; if(d.equipos.some((e,j)=>j!==K.ae.i && e.numero===num)){ CC.toast(`El equipo ${num} ya está agregado a ${S.ed.k==='imp'?'este BL':'esta Reserva'}`,'error'); return; }
  Object.assign(d.equipos[K.ae.i], {numero:num, tipo, tara:+$('docAeTara').value||TARA[tipo], payload:+$('docAePay').value||PAYLOAD[tipo], soc:$('docAeSoc').checked});
  CC.cerrarModal(); CC.toast('Equipo creado correctamente','success'); edRe(); };

/* =====================================================================
   EXPORTACIÓN > DOCUMENTOS: Consulta y carga
===================================================================== */
const FE0 = () => ({nave:'', viaje:'', res:'', ind:'', mani:'', desde:'', hasta:'', est:'', pago:''});
function filasExp(){
  const q = S.fe.q;
  return S.exp.filter(b=>has(b.nave,q.nave) && (!q.viaje||b.viaje===q.viaje) && has(b.numero,q.res) && (!q.ind||b.indicador===q.ind) && has(b.manifiesto,q.mani)
    && (!q.desde||(b.emision&&b.emision>=q.desde)) && (!q.hasta||(b.emision&&b.emision<=q.hasta)) && (!q.est||b.estado===q.est) && (!q.pago||b.pago===q.pago));
}
const puedeCorreo = b => !['POR REVISAR','Anulado'].includes(b.estado);
function htmlExp(){
  seed(); if(!('nave' in S.fe.f)){ S.fe.f = FE0(); S.fe.q = FE0(); }
  const f = S.fe.f, all = filasExp(), pg = CC.paginar(all, S.fe.pag, S.fe.tam), conViaje = f.nave && f.viaje;
  const filtros = `<div class="fac-card" id="docEF"><div class="fac-head"><div><h3>Consulta y carga</h3><div class="fac-sub">Ingresar datos y/o documentos</div></div><div class="fac-acts">
      <span ${CC.propuesta('I-037','Restricciones de exportación')}>${ghost('Restricciones de exportación',"CC.abrir('screenDocExpRestr')",'id="docERestrBtn"')}</span><span ${CC.propuesta('I-062','Configuración de avisos')}>${ghost('Configurar avisos',"docAvAbrir('Salida')",'id="docEAvBtn"')}</span><span ${CC.propuesta('I-060','Recargos TUR')}>${ghost('Cargar recargos TUR',"docTurAbrir('exp')",'id="docETurBtn"')}</span>${ghost('Cargar archivos',"docUpAbrir('exp')")}${btn('Nuevo','docExpNuevo()')}</div></div>
    <div class="fac-g4">
      ${campo('Nave',`<input id="docENave" list="docENaves" placeholder="Ingresar nave" value="${esc(f.nave)}" onchange="docEF('nave',this.value)">${dl('docENaves',naves())}`)}
      ${campo('Número de Viaje',`<input id="docEViaje" list="docEViajes" placeholder="Ingresar número de viaje" value="${esc(f.viaje)}" ${f.nave?'':'disabled'} onchange="docEF('viaje',this.value)">${dl('docEViajes',viajesDe(f.nave))}`)}
      ${campo('Número de Reserva',`<input id="docEResv" placeholder="Ingresar número de reserva" value="${esc(f.res)}" onchange="docEF('res',this.value)">`)}
      ${campo('Indicador',sel(IND_EXP,f.ind,`onchange="docEF('ind',this.value)"`,'Elegir indicador')+`<small ${PR('HU por definir','I-192','Cabotaje')} id="docE192" style="display:block;font-size:12px;margin-top:4px">Transmisiones de cabotaje: por definir</small>`)}
      ${campo('Número de Manifiesto',`<input placeholder="Ingresar número de manifiesto" value="${esc(f.mani)}" onchange="docEF('mani',this.value)">`)}
      ${campo('Fecha de Emisión',`<div class="fac-range"><input type="date" value="${f.desde}" onchange="docEF('desde',this.value)"><input type="date" value="${f.hasta}" onchange="docEF('hasta',this.value)"></div>`)}
      ${campo('Estado BL',sel(ST_BL,f.est,`id="docEEst" onchange="docEF('est',this.value)"`,'Elegir estado BL'))}
      ${campo('Estado Pago',sel(ST_PAGO,f.pago,`onchange="docEF('pago',this.value)"`,'Elegir estado pago'))}
    </div><div class="fac-btns">${conViaje?ghost('Descargar CAL/VGM',"docCal('descargar')")+ghost('Enviar CAL/VGM',"docCal('enviar')"):''}${btn('Buscar','docEBuscar()')}${btn('Limpiar','docELimpiar()')}</div></div>`;
  const cnt = b => { const v = b.equipos.filter(e=>!e.roleado), c = v.filter(e=>e.confirmado).length; return `<span class="doc-cnt ${c===0?'rojo':c<v.length?'ambar':'verde'}">${c} / ${v.length}</span>`; };
  const cols = [
    {t:'', v:b=>puedeCorreo(b)?`<input type="checkbox" ${S.fe.sel.has(b.id)?'checked':''} onchange="docESel('${b.id}',this.checked)">`:''},
    {t:'Número de Reserva', v:b=>{ const x = P37() ? excesos(b) : [];
      return `<button type="button" class="fac-link" onclick="docExpEditar('${b.id}')">${esc(b.numero)}</button>${b.extRes?' <span class="doc-ext" title="Reserva transmitida dentro de las 24h previas al ETA del viaje">(Reserva extemporánea)</span>':''}${b.extBl?' <span class="doc-ext" title="BL transmitido después de los 2 días calendario del Fin de Embarque">(BL extemporáneo)</span>':''}${x.length?` <span class="doc-r37 cc-prop" title="${esc('Restricción de exportación: '+x.map(excTxt).join(' '))}">${svgI('peso')}</span>`:''}`; }},
    {t:'Embarcador', v:'embarcador'},{t:'Nave', v:'nave'},{t:'Número de Viaje', v:'viaje'},{t:'ATA', v:b=>fd(b.ata)},{t:'Versión', v:'version'},...colCorrectores(),{t:'Fecha de Emisión', v:b=>fd(b.emision)},{t:'Número de Manifiesto', v:'manifiesto'},
    {t:'Puerto de Embarque', v:'puertoCarga'},{t:'Puerto de Descarga', v:'puertoDescarga'},{t:'Puerto Final', v:'puertoFinal'},{t:'Tipo de BL', v:'tipo'},{t:'Indicador', v:'indicador'},
    {t:'Estado BL', v:b=>chipBL(b.estado)+rect112(b)},{t:'Última Tx SUNAT', v:b=>ultTx([...b.res,...b.bl].sort((x,y)=>x.ts<y.ts?-1:1).pop())},{t:'Estado Pago', v:'pago'},
    {t:'Auditoría', v:b=>`<div class="doc-aud"><span class="doc-mut">Creación: ${fdt(b.audit.cts)} · ${esc(b.audit.c)}</span><span class="doc-mut">Modificación: ${fdt(b.audit.ts)} · ${esc(b.audit.u)}</span></div>`},
    {t:'Descargar BL', v:b=>puedeCorreo(b)?ico('imp','Descargar Borrador',`docPdf('BL','${b.id}')`):''},
    {t:'Estado SUNAT Reserva', v:b=>iconosExp(b,'res')},
    {t:'Trans. Reserva Manual', v:b=>b.manual?`<span class="doc-ok" title="${esc(`Motivo: ${b.manual.motivo}\nFecha: ${b.manual.fecha?fdt(b.manual.fecha):'Sin registro'}`)}">${svgI('ok')}</span>`:(!lastRes(b)||lastRes(b).st!=='COMPLETED') && b.estado!=='POR REVISAR'?`<input type="checkbox" title="Registrar transmisión de reserva manual" onclick="this.checked=false;docManual('${b.id}')">`:'-'},
    {t:'Estado SUNAT BL', v:b=>iconosExp(b,'bl')},{t:'Informativos SUNAT', v:b=>ico('info','Informativos SUNAT',`docInfoSunat('${b.id}')`,{dis:!b.bl.length})},
    {t:'Ver historial', v:b=>ico('hist','Ver historial',`docHist('${b.id}')`)},{t:'Equipos Confirmados', v:cnt},
    {t:'Acciones', v:b=>puedeCorreo(b)?ico('desc','Descargar Aviso de Zarpe',`docPdf('Aviso de Zarpe','${b.id}')`):''}];
  return filtros + tabla({id:'docERes', titulo:`Resultados (${all.length})`, cols, filas:pg.filas, vacio:'No se encontraron resultados con los criterios seleccionados',
    acciones:`${btn('Transmitir BL','docExpLote()', '', all.length && conViaje ? '' : 'disabled')}${ghost('Enviar Aviso de Zarpe','docZarpe()', S.fe.sel.size?'':'disabled')}<span ${CC.propuesta('I-055','Eliminación en bloque')}>${ghost('Eliminar BL en bloque',"docElAbrir('exp')",'id="docEElBtn"')}</span>`,
    pie:`<div class="fac-acts">${ghost('Exportar','docExpExportar()')}<span title="Incluye los BL de la nave y viaje seleccionados, o los de todas las naves en el rango de fecha de emisión (máximo un mes).">${ghost('Reporte de Documentación',"docReporte('exp')",'id="docERep"')}</span><span ${PR('HU-DOC-10','I-103','Reporte de BL transmitidos')}>${ghost('Reporte de BL transmitidos','docRepTx()','id="docERepTx"')}</span></div>${pager(all.length, pg.pagina, S.fe.tam, 'docEPag')}`});
}
window.docEF = (k, v) => { S.fe.f[k] = v; if(k==='nave') S.fe.f.viaje = ''; if(k==='nave' || k==='viaje') rerender('screenDocExp'); };
window.docEBuscar = () => { const f = S.fe.f;
  if(f.desde && f.hasta && (new Date(f.hasta) - new Date(f.desde)) > 31*864e5){ CC.toast('El rango de fechas de emisión no puede superar un mes.','error'); return; }
  S.fe.q = clone(f); S.fe.pag = 1; S.fe.sel.clear(); rerender('screenDocExp'); if(!filasExp().length) CC.toast('No se encontraron resultados con los criterios seleccionados','info'); };
window.docELimpiar = () => { S.fe.f = FE0(); S.fe.q = FE0(); S.fe.pag = 1; S.fe.sel.clear(); rerender('screenDocExp'); };
window.docEPag = (p, t) => { if(t) S.fe.tam = t; S.fe.pag = p; rerender('screenDocExp'); };
window.docESel = (id, on) => { S.fe.sel[on?'add':'delete'](id); rerender('screenDocExp'); };
window.docExpExportar = () => { const l = filasExp().slice(0,1000); if(!l.length){ CC.toast('No se pudo exportar el archivo.','error'); return; }
  CC.exportarExcel(`Exportaciones_${sello()}`, 'Exportaciones', ['Número de Reserva','Embarcador','Nave','Número de Viaje','ATA','Versión','Fecha de Emisión','Número de Manifiesto','Puerto de Embarque','Puerto de Descarga','Puerto Final','Tipo de BL','Indicador','Estado BL','Estado Pago','Equipos Confirmados'],
    l.map(b=>[b.numero, b.embarcador, b.nave, b.viaje, fd(b.ata), b.version, fd(b.emision), b.manifiesto, b.puertoCarga, b.puertoDescarga, b.puertoFinal, b.tipo, b.indicador, b.estado, b.pago, `${b.equipos.filter(e=>e.confirmado).length}/${b.equipos.length}`])); };
window.docZarpe = () => { const l = S.exp.filter(b=>S.fe.sel.has(b.id)); if(!l.length) return;
  const sin = l.filter(b=>!b.atd).map(b=>b.numero);
  if(sin.length){ CC.toast(sin.length>1?`No es posible realizar el envío porque los BL aún no han zarpado: ${sin.join(', ')}`:`No es posible realizar el envío porque el BL aún no ha zarpado: ${sin[0]}`,'error'); return; }
  if(PV()){ K.zar = l; dlg('Enviar Aviso de Zarpe', zarpeHtml(l), [['Cancelar','docCbNo()','ghost'],['Enviar','docZarpeOk()','','id="docZarOk"']], 'lg'); return; }
  enviarZarpe(l); };
window.docCal = modo => {
  const f = S.fe.f; if(!f.viaje){ CC.toast('Ingrese el número de viaje para generar el CAL/VGM','error'); return; }
  const v = voyInfo(f.nave, f.viaje), term = TERMINAL(v.puerto); if(!term){ CC.toast('El viaje no tiene configurado un formato CAL para el terminal.','error'); return; }
  const bls = S.exp.filter(b=>b.nave===f.nave && b.viaje===f.viaje), eqs = bls.flatMap(b=>b.equipos.filter(e=>!e.roleado).map(e=>({b, e}))), sinVgm = eqs.filter(x=>!(+x.e.vgm>0));
  K.cal = {v, term, bls, eqs, sinVgm, avisos:sinVgm.map(x=>`Reserva ${x.b.numero}, Equipo ${x.e.numero}: VGM (KG) vacío`)};
  if(modo==='descargar'){
    CC.exportarExcel(`CAL_VGM_${term.replace(/\s/g,'')}_${f.viaje}`, 'CAL', ['Número de Reserva','Equipo','Tipo','VGM (KG)','Peso Bruto (KG)','Sellos','Puerto de Descarga'], eqs.map(x=>[x.b.numero, x.e.numero, x.e.tipo, x.e.vgm, pesoBruto(x.b,x.e), x.e.sellos.map(s=>s.numero).join(' '), x.b.puertoDescarga]));
    CC.toast('El archivo ha sido descargado exitosamente.','success');
    if(sinVgm.length) dlg('Avisos del CAL', `<ul class="doc-ul warn">${K.cal.avisos.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`, [['Descargar avisos (.txt)','docCalTxt()','ghost'],['Cerrar','docCbSi()']], 'md');
    return; }
  if(sinVgm.length){ dlg('Resultados de la Validación VGM', `<div class="fac-sec">Mensajes Generales</div><ul class="doc-ul"><li>Formato del terminal: ${esc(term)}. ${bls.length} reservas y ${eqs.length} equipos.</li></ul>
      <div class="fac-sec">Mensajes de Error</div><p class="doc-err">No puede enviarse correo, los campos del VGM están incompletos.</p><table class="fac-tbl"><thead><tr><th>Número de Reserva</th><th>Equipo</th><th>Detalle</th></tr></thead><tbody>${sinVgm.map(x=>`<tr><td>${esc(x.b.numero)}</td><td>${esc(x.e.numero)}</td><td>VGM (KG) vacío</td></tr>`).join('')}</tbody></table>`,
      [['Descargar avisos (.txt)','docCalTxt()','ghost'],['Cerrar','docCbSi()']], 'md'); return; }
  dlg('Enviar Email', `<p>Por favor elegir la plantilla del correo a enviar</p>${campo('Plantilla *', sel(['CAL/VGM DP World','CAL/VGM Euroandino','CAL/VGM General'], '', 'id="docCalPl"', 'Seleccionar plantilla'))}${PV()?cal113Html(K.cal):''}`, [['Cancelar','docCbNo()','ghost'],['Enviar Email','docCalEnviar()']]);
};
window.docCalTxt = () => descargarTxt(`Avisos_CAL_${K.cal.v.numero}.txt`, K.cal.avisos.join('\r\n'));
window.docCalEnviar = () => { if(!$('docCalPl').value){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(PV()){ const d = calDest(K.cal); if(!d.length){ CC.toast('La terminal y la sucursal no tienen contactos configurados para enviar el CAL/VGM. Puede descargarlo sin correo.','error'); return; }
    K.cal.bls.forEach(b=>b.hist.push(ev(`CAL/VGM enviado a ${d.join(', ')}. Recepción registrada para el retest`, CC.usuario()))); }
  CC.cerrarModal(); CC.toast('El correo ha sido enviado exitosamente.','success'); };
/* Transmitir BL en lote (Exportación) */
window.docExpLote = () => { const f = S.fe.f; if(!f.nave || !f.viaje){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  const c = S.exp.filter(b=>b.nave===f.nave && b.viaje===f.viaje && (()=>{ const o = opsBl(b); return o && !o.block && o.send; })());
  if(!c.length){ CC.toast('No se encontraron resultados con la nave y viaje seleccionados','error'); return; }
  K.el = {c, q:'', sel:new Set()}; pintarExpLote(); };
function pintarExpLote(){ const L = K.el, l = L.c.filter(b=>has(b.numero, L.q));
  CC.modal(`<h3>Transmitir BL</h3>${campo('Número de Reserva',`<input value="${esc(L.q)}" onchange="docElQ(this.value)" placeholder="Ingresar número de reserva">`)}
    <table class="fac-tbl"><thead><tr><th></th><th>Número de Reserva</th></tr></thead><tbody>${l.map(b=>`<tr><td><input type="checkbox" ${L.sel.has(b.id)?'checked':''} onchange="docElSel('${b.id}',this.checked)"></td><td>${esc(b.numero)}</td></tr>`).join('')}</tbody></table>
    <div class="fac-btns">${ghost('Cancelar','docCbNo()')}${btn('Transmitir','docElOk()','',L.sel.size?'':'disabled')}</div>`, 'md'); }
window.docElQ = q => { K.el.q = q; pintarExpLote(); };
window.docElSel = (id, on) => { K.el.sel[on?'add':'delete'](id); pintarExpLote(); };
window.docElOk = () => { const L = K.el; if(L.sel.size>20){ CC.toast('Puede seleccionar como máximo 20 BL por transmisión.','error'); return; }
  pedirMotivo({titulo:'Motivo', texto:'¿Desea transmitir los BL seleccionados a SUNAT?', max:100, cb:m=>procesando('Transmitir BL','Procesando transmisión a SUNAT, espere…',900,()=>{
    const l = L.c.filter(b=>L.sel.has(b.id)), conP = l.filter(b=>pendSunatExp(b).length), ok = l.filter(b=>!pendSunatExp(b).length);
    ok.forEach(b=>expTx(b,'bl',opsBl(b).send,m));
    CC.toast(`Lote procesado. Transmitidos correctamente: ${ok.length}. Con error: ${conP.length}.`, conP.length?'info':'success');
    if(conP.length) camposPendSunat(conP.flatMap(b=>pendSunatExp(b).map(x=>`${b.numero}: ${x}`))); })}); };
function generarReserva(u){
  const n = u.servicio==='TRAMP' ? 1 : 2, nuevos = [], v = voyInfo(u.nave, u.viaje);
  for(let i=0;i<n;i++){ const lc = u.linea||'MSK', num = `${lc}EXP${String(27000 + (++S.seq)).padStart(7,'0')}`, tipo = TIPOS_CONT[i%4], cont = `${lc}U${String(7300000+S.seq)}`;
    const b = {id:'E'+S.seq, numero:num, nave:u.nave, viaje:u.viaje, embarcador:CC.datos.socios.embarcadores[i%4].razonSocial, lineaCod:lc, linea:lineaNombre(lc), estado:'POR REVISAR', tipo:'House B/L', indicador:'Exportación', tipoInd:'Nominativo',
      puertoOrigen:'', puertoCarga:v.puerto||'Callao', puertoDescarga:['Rotterdam','Shanghái'][i%2], puertoFinal:['Rotterdam','Shanghái'][i%2], consignatario:'', notificante:'', dirEmb:'', dirCons:'', dirNot:'', notif2:'', expRefs:'', ff:'', condPago:'Prepagado', puertoPago:'',
      fechaEmision:hoyISO(), emision:hoyISO(), tipoEmision:'Original', condEmbarque:'FCL/FCL', tipoCarga:'Contenedorizada', refReserva:'', incoterm:'FOB', termFlete:'Prepagado', negociable:false, via:'Depósito Temporal', entidad:'', codAduana:'', ruc:'',
      manifiesto:'', pago:'', ata:'', atd:'', version:1, res:[], bl:[], manual:null, conceptos:false, errores:[], advertencias:[], info:null, extRes:false, extBl:false,
      equipos:[mkEq(cont, tipo, {vgm:''})], carga:[{tipoBulto:'Pallets', equipo:cont, descripcion:'', cantidad:20, peso:18000, anio:'', modelo:'', marca:'', chasis:'', vins:'', volumen:28, marcas:'', peligroso:false}],
      recargos:[], descripciones:[], roleo:null, badge:'', hist:[ev(`Reserva generada por carga de archivos (${u.files.map(f=>f.cod||'PDF').join(', ')})`, CC.usuario())], cambios:[], audit:{c:CC.usuario(), cts:ahora(), u:CC.usuario(), ts:ahora()}};
    S.exp.push(b); nuevos.push(b); }
  K.gen = nuevos;
  dlg('Mensajes de Generación de la Reserva', `<div class="fac-sec">Mensajes Generales</div><ul class="doc-ul"><li>Se generaron ${nuevos.length} reservas en estado POR REVISAR.</li></ul>
    <div class="fac-sec">Mensajes de la Reserva</div><table class="fac-tbl"><thead><tr><th>Número de Reserva</th><th>Mensaje</th></tr></thead><tbody>${nuevos.map(b=>`<tr><td>${esc(b.numero)}</td><td style="white-space:normal">Campos pendientes para aprobar: ${pendExp(b).length}</td></tr>`).join('')}</tbody></table>`,
    [['Cerrar','docGenExp()']], 'md');
}
window.docGenExp = () => { CC.cerrarModal(); const m = S.exp.filter(b=>b.version>1 && b.nave===K.up.nave && b.viaje===K.up.viaje).slice(0,1);
  if(m.length) confirmar('Discrepancias en la Reserva', `Los siguientes BLs cuentan con matriz ingresada y presentan diferencias. ¿Desea actualizar la información?<ul class="doc-ul">${m.map(b=>`<li>${esc(b.numero)}</li>`).join('')}</ul>`, 'Sí, actualizar', ()=>docGenFin('exp'), 'No', ()=>docGenFin('exp'));
  else docGenFin('exp'); };

/* =====================================================================
   I-037 · HU-DOC-23: Restricciones de exportación (propuesta)
===================================================================== */
function htmlRestr(){
  seed(); const f = S.frs.f, q = S.frs.q;
  const l = S.restr.filter(r=>(!q.tipo||r.tipo===q.tipo) && (!q.linea||r.linea===q.linea) && (!q.estado||restrEstado(r)===q.estado) && has(r.cliente+' '+r.puerto+' '+r.pais, q.texto));
  const tono = {Vigente:'aprobada', Programada:'pendiente', Vencida:'anulada', Inactiva:'anulada'};
  return `<div class="fac-note warn" id="docRsNota">${M37()} Las restricciones avisan en Exportación &gt; Documentos: en la lista de resultados, en la pestaña Información de Equipos y al guardar la reserva. <b>Solo avisan: no bloquean el guardado ni la transmisión.</b> Si aplican varias, se toma el límite más bajo.</div>
    <div class="fac-card" id="docRsF"><div class="fac-head"><div><h3>Restricciones de exportación</h3><div class="fac-sub">Límite de peso o payload por tipo de contenedor, línea, cliente y puerto o país</div></div></div>
    <div class="fac-g4">${campo('Tipo de Contenedor', sel(TIPOS_CONT, f.tipo, `onchange="docRsF('tipo',this.value)"`, 'Todos'))}${campo('Línea Naviera', sel(CC.datos.lineas.map(x=>[x.codigo,x.nombre]), f.linea, `onchange="docRsF('linea',this.value)"`, 'Todas'))}
    ${campo('Cliente, puerto o país', `<input value="${esc(f.texto||'')}" placeholder="Ingresar texto" onchange="docRsF('texto',this.value)">`)}${campo('Estado', sel(['Vigente','Programada','Vencida','Inactiva'], f.estado, `onchange="docRsF('estado',this.value)"`, 'Todos'))}</div>
    <div class="fac-btns">${btn('Buscar','docRsBuscar()')}${btn('Limpiar','docRsLimpiar()')}</div></div>`
    + tabla({id:'docRsRes', titulo:`Resultados (${l.length})`, filas:l, acciones:btn('Nueva restricción','docRsEditar()','','id="docRsNueva"'), pie:'',
      cols:[{t:'Tipo de Contenedor', v:r=>esc(r.tipo||'Todos')},{t:'Línea Naviera', v:r=>esc(r.linea?lineaNombre(r.linea):'Todas')},{t:'Cliente', v:r=>esc(r.cliente||'Todos')},{t:'Puerto de destino', v:r=>esc(r.puerto||'Todos')},{t:'País de destino', v:r=>esc(r.pais||'Todos')},
        {t:'Payload máximo (KG)', v:r=>n0(r.payload)},{t:'Peso Bruto máximo (KG)', v:r=>n0(r.peso)},{t:'Vigencia', v:r=>`${fd(r.desde)} a ${r.hasta?fd(r.hasta):'sin fin'}`},{t:'Responsable', v:'resp'},{t:'Estado', v:r=>CC.chipEstado(restrEstado(r), tono[restrEstado(r)])},
        {t:'Acciones', v:r=>`<div class="fac-rowacts"><button type="button" class="fac-link" onclick="docRsEditar('${r.id}')">Editar</button><button type="button" class="fac-link" onclick="docRsActivar('${r.id}')">${r.activa?'Desactivar':'Activar'}</button></div>`}]});
}
window.docRsF = (k, v) => { S.frs.f[k] = v; };
window.docRsBuscar = () => { S.frs.q = clone(S.frs.f); rerender('screenDocExpRestr'); };
window.docRsLimpiar = () => { S.frs.f = {}; S.frs.q = {}; rerender('screenDocExpRestr'); };
window.docRsActivar = id => { const r = S.restr.find(x=>x.id===id);
  if(r.activa) pedirMotivo({titulo:'Desactivar restricción', max:200, cb:m=>{ r.activa = false; r.obs = `${r.obs} Desactivada: ${m}`.trim(); CC.toast('Restricción desactivada','info'); rerender('screenDocExpRestr'); }});
  else { r.activa = true; CC.toast('Restricción activada','success'); rerender('screenDocExpRestr'); } };
window.docRsEditar = id => { const r = id ? S.restr.find(x=>x.id===id) : {id:'', tipo:'', linea:'', cliente:'', puerto:'', pais:'', payload:'', peso:'', desde:hoyISO(), hasta:'', resp:CC.usuario(), obs:'', activa:true}; K.rs = clone(r);
  dlg(id?'Editar restricción':'Nueva restricción', `<div class="fac-g2">${campo('Tipo de Contenedor', sel(TIPOS_CONT, r.tipo, 'id="docRsTipo"', 'Todos'))}${campo('Línea Naviera', sel(CC.datos.lineas.map(x=>[x.codigo,x.nombre]), r.linea, 'id="docRsLinea"', 'Todas'))}
    ${campo('Cliente', `<input id="docRsCli" list="docRsClis" value="${esc(r.cliente)}" placeholder="Todos">${dl('docRsClis', OPC.emb())}`)}${campo('Puerto de destino', sel(puertos().filter(p=>PAIS[p]!=='Perú'), r.puerto, 'id="docRsPto"', 'Todos'))}
    ${campo('País de destino', sel([...new Set(Object.values(PAIS))].filter(p=>p!=='Perú'), r.pais, 'id="docRsPais"', 'Todos'))}<span></span>
    ${campo('Payload máximo (KG)', `<input id="docRsPay" type="number" min="0" value="${esc(r.payload)}">`)}${campo('Peso Bruto máximo (KG)', `<input id="docRsPeso" type="number" min="0" value="${esc(r.peso)}">`)}
    ${campo('Vigencia desde *', `<input id="docRsDesde" type="date" value="${esc(r.desde)}">`)}${campo('Vigencia hasta', `<input id="docRsHasta" type="date" value="${esc(r.hasta)}">`)}
    ${campo('Responsable *', `<input id="docRsResp" value="${esc(r.resp)}">`)}${campo('Observación', `<input id="docRsObs" value="${esc(r.obs)}">`)}</div>`, [['Cancelar','docCbNo()','ghost'],['Guardar','docRsGuardar()','','id="docRsGuardar"']], 'md'); };
window.docRsGuardar = () => { const r = K.rs, g = id => $(id).value.trim();
  Object.assign(r, {tipo:g('docRsTipo'), linea:g('docRsLinea'), cliente:g('docRsCli'), puerto:g('docRsPto'), pais:g('docRsPais'), payload:g('docRsPay'), peso:g('docRsPeso'), desde:g('docRsDesde'), hasta:g('docRsHasta'), resp:g('docRsResp'), obs:g('docRsObs')});
  if(!r.desde || !r.resp){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(!r.payload && !r.peso){ CC.toast('Ingrese al menos un límite: Payload máximo o Peso Bruto máximo.','error'); return; }
  if(r.hasta && r.hasta < r.desde){ CC.toast('La vigencia hasta no puede ser anterior a la vigencia desde.','error'); return; }
  if(r.id){ Object.assign(S.restr.find(x=>x.id===r.id), r); } else { r.id = 'R' + (++S.seq); S.restr.push(r); }
  CC.cerrarModal(); CC.toast('Restricción guardada correctamente','success'); rerender('screenDocExpRestr'); };

/* =====================================================================
   IMPORTACIÓN > TRANSBORDO
===================================================================== */
const trsDe = (nave, viaje) => S.imp.filter(b=>b.indicador==='Transbordo' && b.nave===nave && b.viaje===viaje);
function htmlTrb(){
  seed(); const T = S.ft; if(!('nave' in T.f)){ const t = S.imp.find(b=>b.indicador==='Transbordo') || {}; T.f = {nave:t.nave||'', viaje:t.viaje||'', bl:''}; T.q = clone(T.f); }
  const f = T.f, q = T.q, all = q ? trsDe(q.nave, q.viaje).filter(b=>has(b.numero, q.bl)) : [], pg = CC.paginar(all, T.pag, T.tam);
  const filtros = `<div class="fac-card" id="docTF"><div class="fac-head"><div><h3>Consulta y carga</h3><div class="fac-sub">Ingresar datos y/o documentos</div></div></div><div class="fac-g3">
    ${campo('Nave *',`<input id="docTNave" list="docTNaves" placeholder="Ingrese el nombre del buque" value="${esc(f.nave)}" onchange="docTF('nave',this.value)">${dl('docTNaves',naves())}`)}
    ${campo('Número de Viaje *',`<input id="docTViaje" list="docTViajes" placeholder="Ingrese el número de viaje" value="${esc(f.viaje)}" ${f.nave?'':'disabled'} onchange="docTF('viaje',this.value)">${dl('docTViajes',viajesDe(f.nave))}`)}
    ${campo('Número de BL',`<input placeholder="Ingrese el número de BL" value="${esc(f.bl)}" onchange="docTF('bl',this.value)">`)}</div>
    <div class="fac-btns">${btn('Buscar','docTBuscar()')}${btn('Limpiar','docTLimpiar()')}</div></div>`;
  const lote = T.lote.map(id=>buscarBL(id)).filter(Boolean), cat = {esp:[], sin:[], con:[]};
  lote.forEach(b=>{ const l = last(b.sunat); if(!l || l.c!=='0102') return; if(l.st==='PENDING') cat.esp.push(b); else if(l.st==='ERROR') (l.propio ? cat.con : cat.sin).push(b); });
  const nums = l => l.map(b=>b.numero).join(', ');
  const resumen = lote.length && (cat.esp.length||cat.sin.length||cat.con.length) ? `<div class="fac-card" id="docTResumen"><h3>Numeración de solicitud de transbordo: BL que requieren atención</h3><ul class="doc-ul">
    ${cat.esp.length?`<li>${cat.esp.length} BL esperando respuesta de SUNAT (${esc(nums(cat.esp))}). El resultado se verá al volver a buscar.</li>`:''}
    ${cat.sin.length?`<li>${cat.sin.length} BL sin errores propios (${esc(nums(cat.sin))}): SUNAT los rechazó por errores de otros BL de su envío; se pueden reenviar tal cual. ${btn(`Reenviar (${cat.sin.length})`,`docTReenviar()`,'','id="docTReenviar"')}</li>`:''}
    ${cat.con.length?`<li>${cat.con.length} BL con errores propios (${esc(nums(cat.con))}): corregir el BL y volver a enviarlo. El detalle está en el icono de errores de la grilla.</li>`:''}</ul></div>` : '';
  const iconos = b => { const l = last(b.sunat), pend = l && l.st==='PENDING', o = [];
    if(l && l.st==='ERROR') o.push(ico('error','Ver detalle de error SUNAT',`docSunatDet('${b.id}','err')`,{cls:'rojo'}));
    if(b.advertencias.length) o.push(ico('adv','Ver detalle de advertencia SUNAT',`docSunatDet('${b.id}','adv')`,{cls:'ambar'}));
    if(b.estado==='APROBADO' && !reglasImp(b)['0103']) o.push(ico('enviar','Transmitir incorporación SUNAT (0103)',`docTTx('${b.id}')`,{cls:'ambar', dis:pend}));
    if(b.solicitud) o.push(ico('cancel','Cancelar Numeración de Transbordo',`docTCancelar('${b.id}')`,{cls:'rojo', dis:pend}));
    return `<div class="doc-sunat">${estSunat(l)}<span class="doc-ics">${o.join('')}</span></div>`; };
  const res = tabla({id:'docTRes', titulo:`Resultados (${all.length})`, filas:pg.filas, antes:resumen,
    acciones:`${ghost('Registro Nave Conexión','docTConex()')}${btn('Numeración de solicitud de transbordo','docTNum()')}${ghost('Enviar Listado','docTListado()')}<span ${CC.propuesta('I-069','Anulación en bloque')}>${ghost('Anulación de numeración en bloque','docAnAbrir()','id="docTAnBtn"')}</span>`,
    cols:[{t:'Número de BL', v:b=>`<button type="button" class="fac-link" onclick="docImpEditar('${b.id}')">${esc(b.numero)}</button>`},{t:'Nave - Viaje', v:b=>sinDatos(`${b.nave} - ${b.viaje}`)},{t:'Nave Conexión - Viaje Conexión', v:b=>b.naveCx?esc(`${b.naveCx} - ${b.viajeCx}`):sinDatos('')},
      {t:'N° de Solicitud', v:b=>b.solicitud?esc(b.solicitud):'Sin Asignar'},{t:'N° de Detalle', v:b=>b.detalleTrb?esc(b.detalleTrb):'Sin Asignar'},{t:'Embarcador', v:b=>sinDatos(b.embarcador)},{t:'Fecha de Emisión', v:b=>sinDatos(fd(b.emision))},
      {t:'Número de Manifiesto', v:b=>sinDatos(b.manifiesto)},{t:'Puerto de Carga', v:b=>sinDatos(b.puertoCarga)},{t:'Puerto de Descarga', v:b=>sinDatos(b.puertoDescarga)},{t:'Puerto Final de Destino', v:b=>sinDatos(b.puertoFinal)},
      {t:'Tipo', v:b=>sinDatos(b.tipo)},{t:'Indicador', v:'indicador'},{t:'Estado BL', v:b=>chipBL(b.estado)},{t:'Última Tx SUNAT', v:b=>ultTx(last(b.sunat))||sinDatos('')},{t:'Estado SUNAT', v:iconos},
      {t:'Informativos SUNAT', v:b=>ico('info','Informativos SUNAT',`docInfoSunat('${b.id}')`,{dis:!b.sunat.length})},{t:'Ver historial', v:b=>ico('hist','Ver historial',`docHist('${b.id}',true)`)}],
    pie:`<span></span>${pager(all.length, pg.pagina, T.tam, 'docTPag')}`});
  return filtros + res;
}
window.docTF = (k, v) => { S.ft.f[k] = v; if(k==='nave'){ S.ft.f.viaje = ''; rerender('screenDocTrb'); } };
window.docTBuscar = () => { const f = S.ft.f; if(!f.nave || !f.viaje){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; } S.ft.q = clone(f); S.ft.pag = 1; rerender('screenDocTrb'); if(!trsDe(f.nave,f.viaje).length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); };
window.docTLimpiar = () => { S.ft.f = {nave:'', viaje:'', bl:''}; S.ft.q = null; S.ft.lote = []; rerender('screenDocTrb'); };
window.docTPag = (p, t) => { if(t) S.ft.tam = t; S.ft.pag = p; rerender('screenDocTrb'); };
window.docTTx = id => { const b = buscarBL(id); confirmar('Confirmar transmisión SUNAT','¿Desea ejecutar la transmisión 0103 (Incorporación inicial (0103))?','Confirmar',()=>transmitir(b,'sunat','0103','',t=>CC.toast(t.st==='COMPLETED'?'Transmisión SUNAT procesada correctamente':'Error al transmitir a SUNAT', t.st==='COMPLETED'?'success':'error'))); };
window.docTConex = () => { const q = S.ft.q; if(!q || !q.nave || !q.viaje){ CC.toast('Debe seleccionar una nave y un viaje para buscar conexiones','error'); return; }
  const l = S.imp.filter(b=>b.nave===q.nave && b.viaje===q.viaje && (b.indicador==='Transbordo' || b.provisional));
  if(!l.length){ CC.toast('No se encontraron conexiones de nave','info'); return; }
  K.cx = {l, nave:'', viaje:'', sel:new Set()}; pintarConex(); };
function pintarConex(){ const c = K.cx;
  CC.modal(`<h3>Registro Nave Conexión</h3><div class="fac-g2">${campo('Nave',`<input list="docCxNaves" placeholder="Seleccionar nave a asignar" value="${esc(c.nave)}" onchange="docCx('nave',this.value)">${dl('docCxNaves',naves())}`)}
    ${c.nave?campo('Viaje',`<input list="docCxViajes" placeholder="Seleccionar viaje a asignar" value="${esc(c.viaje)}" onchange="docCx('viaje',this.value)">${dl('docCxViajes',viajesDe(c.nave))}`):''}</div>
    <table class="fac-tbl"><thead><tr><th></th><th>Número de BL</th><th>Nave</th><th>Viaje</th><th>Nave a Asignar</th><th>Viaje a Asignar</th></tr></thead><tbody>${c.l.map(b=>`<tr><td><input type="checkbox" ${c.sel.has(b.id)?'checked':''} onchange="docCxSel('${b.id}',this.checked)"></td><td>${esc(b.numero||'Pendiente')}</td><td>${esc(b.nave)}</td><td>${esc(b.viaje)}</td><td>${c.sel.has(b.id)?esc(c.nave):''}</td><td>${c.sel.has(b.id)?esc(c.viaje):''}</td></tr>`).join('')}</tbody></table>
    <div class="fac-btns">${ghost('Cancelar','docCbNo()')}${btn(`Confirmar (${c.sel.size})`,'docCxOk()','',c.sel.size&&c.nave&&c.viaje?'':'disabled')}</div>`, 'md'); }
window.docCx = (k, v) => { K.cx[k] = v; if(k==='nave') K.cx.viaje = ''; pintarConex(); };
window.docCxSel = (id, on) => { K.cx.sel[on?'add':'delete'](id); pintarConex(); };
window.docCxOk = () => { const c = K.cx, res = c.l.filter(b=>c.sel.has(b.id)).map(b=>{
    const m = b.provisional ? 'BL provisional' : b.indicador!=='Transbordo' ? 'BL sin indicador TRS' : !viajesDe(c.nave).includes(c.viaje) ? 'El viaje no pertenece a la nave seleccionada' : '';
    if(!m){ b.naveCx = c.nave; b.viajeCx = c.viaje; b.hist.push(ev(`Nave de conexión registrada: ${c.nave} - ${c.viaje}`, CC.usuario())); } return {b, m}; });
  const ok = res.filter(r=>!r.m).length; if(ok) CC.toast(`Se actualizaron ${ok} conexiones de nave exitosamente`,'success');
  dlg('Resultado registro nave conexión', `<p>Actualizados: ${ok}. No actualizados: ${res.length-ok}.</p><table class="fac-tbl"><thead><tr><th>Número de BL</th><th>Estado</th><th>Motivo</th></tr></thead><tbody>${res.map(r=>`<tr class="${r.m?'doc-fila-err':''}"><td>${esc(r.b.numero||'Pendiente')}</td><td>${r.m?'Error':'Ok'}</td><td>${esc(r.m)}</td></tr>`).join('')}</tbody></table>`, [['Cerrar','docCbSi()']], 'md');
  rerender('screenDocTrb'); };
window.docTNum = () => { const q = S.ft.q; if(!q){ CC.toast('Debe seleccionar una nave y un viaje para buscar conexiones','error'); return; }
  const l = trsDe(q.nave, q.viaje), proc = l.filter(b=>last(b.sunat) && last(b.sunat).st==='PENDING');
  const disp = l.filter(b=>!proc.includes(b) && b.sunat.some(t=>t.c==='0103' && t.st==='COMPLETED') && b.naveCx && !b.solicitud && b.estado!=='Anulado');
  K.nu = {disp, proc, sel:new Set()}; pintarNum(); };
function pintarNum(){ const n = K.nu, fila = (b, chk) => `<tr>${chk?`<td><input type="checkbox" ${n.sel.has(b.id)?'checked':''} onchange="docNuSel('${b.id}',this.checked)"></td>`:''}<td>${esc(b.numero)}</td><td>${esc(b.naveCx)}</td><td>${esc(b.viajeCx)}</td><td>${esc((last(b.sunat)||{}).c||'')}</td><td>${esc(ST_SUNAT[(last(b.sunat)||{}).st]||'')}</td></tr>`;
  const th = chk => `<thead><tr>${chk?'<th></th>':''}<th>Número de BL</th><th>Nave de Conexión</th><th>Viaje de Conexión</th><th>Última Tx SUNAT</th><th>Estado SUNAT</th></tr></thead>`;
  CC.modal(`<h3>Numeración de solicitud de transbordo</h3><p>Seleccione los BL de transbordo ya transmitidos a SUNAT (incorporados desde Importaciones), con nave y viaje de conexión asignados y sin N° de Solicitud.</p>
    ${n.proc.length?'<div class="fac-note warn">Los BL con estado SUNAT Pendiente tienen una transmisión en curso; no pueden seleccionarse hasta recibir respuesta de SUNAT.</div>':''}
    <div class="fac-sec">Disponibles para transmitir</div>${n.disp.length?`<table class="fac-tbl">${th(1)}<tbody>${n.disp.map(b=>fila(b,1)).join('')}</tbody></table>`:`<p class="doc-mut">${n.proc.length?`No hay BL disponibles para transmitir. ${n.proc.length} BL(s) en proceso de transmisión SUNAT.`:'No hay BL disponibles para la numeración de solicitud de transbordo. Revise que estén transmitidos a SUNAT y con nave y viaje de conexión.'}</p>`}
    ${n.proc.length?`<div class="fac-sec">En proceso de transmisión SUNAT</div><table class="fac-tbl">${th(0)}<tbody>${n.proc.map(b=>fila(b,0)).join('')}</tbody></table>`:''}
    <div class="fac-btns" style="justify-content:space-between"><span class="doc-mut">${n.sel.size} BL(s) seleccionado(s)</span><span class="fac-acts">${ghost('Cancelar','docCbNo()')}${btn(`Confirmar (${n.sel.size})`,'docNuOk()','',n.sel.size?'':'disabled')}</span></div>`, 'md'); }
window.docNuSel = (id, on) => { if(on && K.nu.sel.size>=20){ CC.toast('Puede seleccionar como máximo 20 BL por transmisión.','error'); pintarNum(); return; } K.nu.sel[on?'add':'delete'](id); pintarNum(); };
window.docNuOk = () => { const ids = [...K.nu.sel]; confirmar('Numeración de solicitud de transbordo', `Se enviará a SUNAT la numeración de solicitud de transbordo de ${ids.length} BL(s). Son transmisiones reales ante la autoridad. ¿Confirma?`, 'Confirmar', ()=>enviarNumeracion(ids)); };
window.docTReenviar = () => { const ids = S.ft.lote.filter(id=>{ const l = last(buscarBL(id).sunat); return l && l.st==='ERROR' && !l.propio; }); enviarNumeracion(ids); };
function enviarNumeracion(ids){
  procesando('Numeración de solicitud de transbordo','Enviando la numeración de solicitud de transbordo a SUNAT...',800,()=>{
    const bls = ids.map(buscarBL), propio = bls.filter(b=>b.fallaTrb);
    S.ft.lote = ids; bls.forEach(b=>{ const t = tx('0102','PENDING',{user:CC.usuario(), motivo:'Numeración de solicitud de transbordo'}); b.sunat.push(t); b.hist.push(ev('Numeración de solicitud de transbordo enviada (0102)', CC.usuario(), t.ts, {code:'0102', status:'PENDING'})); });
    dlg('Resultado de transmisión a SUNAT', `<p><b>Enviados: ${bls.length}.</b> El resultado se verá al volver a buscar.</p>`, [['Aceptar','docCbSi()']]);
    rerender('screenDocTrb');
    setTimeout(()=>{ bls.forEach(b=>{ const t = last(b.sunat); t.ts = ahora();
        if(propio.length){ t.st = 'ERROR'; t.propio = propio.includes(b); if(t.propio){ b.errores = [{codigo:'0458', descripcion:'La nave de conexión no tiene manifiesto de salida registrado.'}]; b.fallaTrb = false; } }
        else { t.st = 'COMPLETED'; b.solicitud = `TRB-2026-${String(++S.seq).padStart(6,'0')}`; b.detalleTrb = String(S.seq).padStart(4,'0'); b.errores = []; }
        b.hist.push(ev(`Respuesta SUNAT 0102 (numeración de transbordo): ${ST_SUNAT[t.st]}`, 'Usuario SUNAT', t.ts, {code:'0102', status:t.st})); });
      refrescarActiva(); }, 1500);
  });
}
window.docTCancelar = id => { const b = buscarBL(id);
  if(!['APROBADO','TRANSMITIDO A SUNAT','POR RECTIFICAR'].includes(b.estado)){ CC.toast(`El BL ${b.numero} no cumple las condiciones para anular la numeración de transbordo.`,'error'); return; }
  pedirMotivo({titulo:'Cancelar numeración de transbordo', texto:`BL ${esc(b.numero)}`, min:10, max:500, extra:campo('Nro Expediente *','<input id="docTExp" maxlength="60">'),
    leer:()=>{ const v = $('docTExp').value.trim(), e = $('docMotErr'); if(!v){ e.textContent = 'El Nro de Expediente es obligatorio.'; return false; } if(v.length>50){ e.textContent = 'El Nro de Expediente no puede superar 50 caracteres.'; return false; } return v; },
    cb:(m, exp)=>{ b.hist.push(ev(`Numeración de transbordo ${b.solicitud} anulada. Expediente ${exp}. Motivo: ${m}`, CC.usuario())); b.solicitud = ''; b.detalleTrb = ''; CC.toast('La numeración de transbordo fue anulada correctamente','success'); rerender('screenDocTrb'); }}); };
window.docTListado = () => { const q = S.ft.q; if(!q){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(!/callao/i.test(voyInfo(q.nave, q.viaje).puerto||'Callao')){ CC.toast('No se encontró tipo de contacto de Control Cargo configurado para la sucursal del viaje seleccionado.','error'); return; }
  if(PV()) trsDe(q.nave, q.viaje).forEach(b=>b.hist.push(ev('Listado de transbordo enviado (traza propuesta I-017)', CC.usuario())));
  CC.toast('El listado ha sido enviado exitosamente','success'); };

/* =====================================================================
   IMPORTACIÓN > DIRECCIONAMIENTO: Consulta y aprobaciones/ rechazos
===================================================================== */
const ESTS_RT = ['Provisional','Pendiente','Aprobado','Rechazado','Anulado'];
const cerrado = r => S.cerrados.has(r.nave+'|'+r.viaje);
function filasDir(){ const q = S.fr.q;
  return S.dir.filter(r=>has(r.nave,q.nave) && (!q.viaje||r.viaje===q.viaje) && has(r.bl||r.blProv,q.bl) && has(r.rucSol,q.ruc) && (!q.desp||r.tipoDespacho===q.desp) && (!q.est||r.estado===q.est) && has(r.consignatario,q.cons)); }
function htmlDir(){
  seed(); if(!('nave' in S.fr.f)){ S.fr.f = {nave:'', viaje:'', bl:'', ruc:'', desp:'', est:'', cons:''}; S.fr.q = clone(S.fr.f); }
  const f = S.fr.f, q = S.fr.q, all = filasDir(), pg = CC.paginar(all, S.fr.pag, S.fr.tam), k = q.nave+'|'+q.viaje;
  const cierreOk = q.nave && q.viaje && all.length && !S.cerrados.has(k);
  const filtros = `<div class="fac-card" id="docRF"><div class="fac-head"><div><h3>Consulta y aprobaciones/ rechazos</h3><div class="fac-sub">Ingresar datos</div></div></div><div class="fac-g4">
    ${campo('Nave',`<input id="docRNave" list="docRNaves" placeholder="Ingresar nave" value="${esc(f.nave)}" onchange="docRFs('nave',this.value)">${dl('docRNaves',naves())}`)}
    ${campo('Número de Viaje',`<input id="docRViaje" list="docRViajes" placeholder="Ingresar número de viaje" value="${esc(f.viaje)}" onchange="docRFs('viaje',this.value)">${dl('docRViajes',viajesDe(f.nave))}`)}
    ${campo('Número BL',`<input placeholder="Ingresar número BL" value="${esc(f.bl)}" onchange="docRFs('bl',this.value)">`)}
    ${campo('Ruc de Entidad Receptora',`<input list="docRRucs" placeholder="Ingresar RUC de entidad receptora" value="${esc(f.ruc)}" onchange="docRFs('ruc',this.value)">${dl('docRRucs',DEPOSITOS.map(d=>d.ruc))}`)}
    ${campo('Tipo de Despacho',sel(DESPACHO,f.desp,`onchange="docRFs('desp',this.value)"`,'Todos'))}${campo('Estado Direccionamiento',sel(ESTS_RT,f.est,`id="docREst" onchange="docRFs('est',this.value)"`,'Todos'))}
    ${campo('Consignatario',`<input list="docRCons" placeholder="Ingresar consignatario" value="${esc(f.cons)}" onchange="docRFs('cons',this.value)">${dl('docRCons',[...new Set(S.dir.map(r=>r.consignatario))])}`)}</div>
    <div class="fac-btns">${btn('Buscar','docRBuscar()')}${btn('Limpiar','docRLimpiar()')}</div></div>`;
  const nv = r => { const etb = S.etb[r.nave+'|'+r.viaje]; return `${esc(r.nave)} / ${esc(r.viaje)}${cerrado(r)?' <span class="doc-badge">Direccionamiento cerrado</span>':etb && etb - Date.now() < 36*36e5 ? ' <span class="doc-ambar">Dentro de las 36 horas del ETB</span>':''}`; };
  return filtros + tabla({id:'docRRes', titulo:`Resultados (${all.length})`, filas:pg.filas,
    acciones:`${ghost('Cierre de Direccionamiento','docRCierre()','',cierreOk?'':'disabled')}${btn('Aprobar','docRAccion(\'Aprobado\')','',S.fr.sel.size?'':'disabled')}${btn('Rechazar','docRAccion(\'Rechazado\')','pink',S.fr.sel.size?'':'disabled')}`,
    cols:[{t:'', v:r=>`<input type="checkbox" ${S.fr.sel.has(r.id)?'checked':''} ${cerrado(r)||['Aprobado','Rechazado','Anulado'].includes(r.estado)?'disabled':''} onchange="docRSel('${r.id}',this.checked)">`},
      {t:'Número BL', v:r=>r.bl?esc(r.bl):`<span class="doc-mut">${esc(r.blProv)} (provisional)</span>`},{t:'Nave/Viaje', v:nv},{t:'Puerto Operativo', v:'puerto'},{t:'Línea', v:'linea'},{t:'Consignatario', v:'consignatario'},{t:'Tipo de Despacho', v:'tipoDespacho'},
      {t:'Entidad Receptora Solicitada', v:'entSol'},{t:'Cód. Aduana Solicitado', v:'codSol'},{t:'RUC Solicitado', v:'rucSol'},{t:'Entidad Receptora Aplicada', v:'entApl'},{t:'Cód. Aduana Aplicado', v:'codApl'},{t:'RUC Aplicado', v:'rucApl'},
      {t:'Estado Direccionamiento', v:r=>CC.chipEstado(r.estado)},{t:'Tipo Direccionamiento', v:'tipoRt'},
      {t:'Acciones', v:r=>!r.bl && r.estado!=='Anulado' && !cerrado(r) ? `<button type="button" class="fac-link" onclick="docRRelacionar('${r.id}')">Relacionar BL</button>` : ''}],
    pie:`<span></span>${pager(all.length, pg.pagina, S.fr.tam, 'docRPag')}`});
}
window.docRFs = (k, v) => { S.fr.f[k] = v; if(k==='nave'){ S.fr.f.viaje = ''; rerender('screenDocDir'); } };
window.docRBuscar = () => { S.fr.q = clone(S.fr.f); S.fr.pag = 1; S.fr.sel.clear(); rerender('screenDocDir'); if(!filasDir().length) CC.toast('No se encontraron resultados con los criterios seleccionados.','info'); };
window.docRLimpiar = () => { S.fr.f = {nave:'', viaje:'', bl:'', ruc:'', desp:'', est:'', cons:''}; S.fr.q = clone(S.fr.f); S.fr.sel.clear(); rerender('screenDocDir'); };
window.docRPag = (p, t) => { if(t) S.fr.tam = t; S.fr.pag = p; rerender('screenDocDir'); };
window.docRSel = (id, on) => { S.fr.sel[on?'add':'delete'](id); rerender('screenDocDir'); };
window.docRAccion = est => {
  let l = S.dir.filter(r=>S.fr.sel.has(r.id) && !cerrado(r)); if(!l.length){ CC.toast('Debe seleccionar al menos un direccionamiento','error'); return; }
  if(est==='Aprobado'){ const sinBl = l.filter(r=>!r.bl); if(sinBl.length) CC.toast('Los direccionamientos sin BL no se pueden aprobar.','info'); l = l.filter(r=>r.bl && r.estado==='Pendiente'); }
  else l = l.filter(r=>['Provisional','Pendiente'].includes(r.estado));
  if(!l.length) return; const ap = est==='Aprobado';
  confirmar(ap?'Confirmar Aprobación':'Confirmar Rechazo', `¿Estás seguro de que deseas ${ap?'aprobar':'rechazar'} ${l.length} direccionamiento(s)?`, ap?'Aprobar':'Rechazar', ()=>{
    l.forEach(r=>{ r.estado = est; const b = S.imp.find(x=>x.numero===r.bl);
      if(ap){ r.entApl = r.entSol; r.codApl = r.codSol; r.rucApl = r.rucSol; if(b){ b.entidad = r.entSol; b.codAduana = r.codSol; b.ruc = r.rucSol; b.hist.push(ev(`Direccionamiento aprobado: ${r.entSol}`, CC.usuario())); } }
      else if(b){ b.tipoDespacho = 'Diferido'; const t = (CC.datos.puertos.find(p=>p.nombre===r.puerto)||{}).terminal || 'Depósito del puerto'; b.entidad = t; b.hist.push(ev('Direccionamiento rechazado: despacho Diferido y depósito por defecto del puerto', CC.usuario())); } });
    S.fr.sel.clear(); CC.toast(ap?'Direccionamiento(s) aprobado(s) correctamente':'Direccionamiento(s) rechazado(s) correctamente','success'); rerender('screenDocDir'); }); };
window.docRCierre = () => { const q = S.fr.q; confirmar('Confirmar cierre','¿Está seguro de cerrar el direccionamiento del viaje seleccionado?','Cerrar direccionamiento',()=>{ S.cerrados.add(q.nave+'|'+q.viaje); S.fr.sel.clear(); CC.toast('Direccionamiento cerrado correctamente','success'); rerender('screenDocDir'); }); };
window.docRRelacionar = id => { const r = S.dir.find(x=>x.id===id); K.rl = {r, bl:'', viaje:'', res:null, pick:''}; pintarRel(); };
function pintarRel(){ const k = K.rl, r = k.r;
  CC.modal(`<h3>Relacionar BL</h3><dl class="fac-kv"><dt>Nro BL Provisional</dt><dd>${esc(r.blProv)}</dd><dt>Viaje Provisional</dt><dd>${esc(r.viaje)}</dd><dt>Nave Provisional</dt><dd>${esc(r.nave)}</dd></dl>
    <div class="fac-g3">${campo('Número BL',`<input id="docRlBl" placeholder="Buscar por número BL" value="${esc(k.bl)}">`)}${campo('Viaje',`<input id="docRlViaje" placeholder="Buscar por número de viaje" value="${esc(k.viaje)}">`)}<div class="fac-f"><label>&nbsp;</label>${btn('Buscar','docRlBuscar()','','id="docRlBuscar"')}</div></div>
    ${k.res?`<table class="fac-tbl"><thead><tr><th></th><th>Número BL</th><th>Viaje</th><th>Nave</th><th>Consignatario</th><th>Entidad Receptora</th></tr></thead><tbody>${k.res.map(b=>`<tr><td><input type="radio" name="docRl" ${k.pick===b.id?'checked':''} onchange="docRlPick('${b.id}')"></td><td>${esc(b.numero)}</td><td>${esc(b.viaje)}</td><td>${esc(b.nave)}</td><td>${esc(b.consignatario)}</td><td>${esc(b.entidad)}${b.ruc?` (${esc(b.ruc)})`:''}</td></tr>`).join('') || '<tr><td colspan="6" class="fac-empty">No se encontraron BLs con los criterios indicados.</td></tr>'}</tbody></table>`:''}
    <div class="fac-btns">${ghost('Cancelar','docCbNo()')}${btn('Relacionar','docRlOk()','',k.pick?'':'disabled')}</div>`, 'md'); }
window.docRlBuscar = () => { const k = K.rl; k.bl = $('docRlBl').value.trim(); k.viaje = $('docRlViaje').value.trim(); const b0 = $('docRlBuscar'); b0.textContent = 'Buscando...'; b0.disabled = true;
  setTimeout(()=>{ k.res = S.imp.filter(b=>b.numero && has(b.numero,k.bl) && has(b.viaje,k.viaje)).slice(0,20); k.pick = ''; pintarRel(); }, 300); };
window.docRlPick = id => { K.rl.pick = id; pintarRel(); };
window.docRlOk = () => { const r = K.rl.r, b = buscarBL(K.rl.pick);
  const err = r.estado==='Anulado' ? 'Un direccionamiento anulado no se puede relacionar con un BL.' : b.viaje!==r.viaje || b.nave!==r.nave ? 'El BL pertenece a otro viaje que el del direccionamiento.' : nt(b.consignatario)!==nt(r.consignatario) ? 'El BL es de otro consignatario que el que registró el direccionamiento.' : b.numero!==r.blProv ? 'El número de BL no coincide con el registrado en el direccionamiento.' : '';
  if(err){ CC.toast(err,'error'); return; }
  r.bl = b.numero; if(r.estado!=='Rechazado') r.estado = 'Pendiente'; b.hist.push(ev(`BL relacionado con el direccionamiento provisional ${r.blProv}`, CC.usuario()));
  CC.cerrarModal(); CC.toast('BL relacionado correctamente','success'); rerender('screenDocDir'); };

/* =====================================================================
   EXPORTACIÓN > CUTOFF: Consulta y carga, Registro y Edición
===================================================================== */
const GRUPOS = ['Puerto de Descarga 1','Puerto de Descarga 2','Puerto de Descarga 3'];
function htmlCut(){
  seed(); if(!('nave' in S.fc.f)){ const e = S.exp[0] || {}; S.fc.f = {nave:e.nave||'', viaje:e.viaje||'', puerto:e.puertoCarga||''}; }
  const f = S.fc.f;
  return `<div class="fac-card" id="docCF"><div class="fac-head"><div><h3>Consulta y carga</h3><div class="fac-sub">Ingrese datos</div></div></div><div class="fac-g3">
    ${campo('Nave *',`<input id="docCNave" list="docCNaves" placeholder="Ingresar Nave" value="${esc(f.nave)}" onchange="docCFs('nave',this.value)">${dl('docCNaves',naves())}`)}
    ${campo('Número de Viaje *',`<input id="docCViaje" list="docCViajes" placeholder="Ingresar número de viaje" value="${esc(f.viaje)}" ${f.nave?'':'disabled'} onchange="docCFs('viaje',this.value)">${dl('docCViajes',viajesDe(f.nave))}`)}
    ${campo('Puerto de Embarque *',`<input id="docCPuerto" list="docCPuertos" placeholder="Ingresar puerto de embarque" value="${esc(f.puerto)}" onchange="docCFs('puerto',this.value)">${dl('docCPuertos',puertos())}`)}</div>
    <div class="fac-btns">${btn('Buscar','docCBuscar()')}${btn('Limpiar','docCLimpiar()')}</div></div>
    <div class="fac-note">Al buscar se abre el cutoff del viaje: Edición de Cutoffs si ya existe o Registro de Cutoffs si es nuevo.</div>`;
}
window.docCFs = (k, v) => { S.fc.f[k] = v; if(k==='nave'){ S.fc.f.viaje = ''; rerender('screenDocCut'); } };
window.docCLimpiar = () => { S.fc.f = {nave:'', viaje:'', puerto:''}; rerender('screenDocCut'); };
window.docCBuscar = () => { const f = S.fc.f; if(!f.nave || !f.viaje || !f.puerto){ CC.toast('Por favor complete todos los campos requeridos.','error'); return; }
  const k = [f.nave, f.viaje, f.puerto].join('|'), c = S.cut[k];
  S.co = {k, nuevo:!c, ro:!!c, d:c ? clone(c) : {id:'', nave:f.nave, viaje:f.viaje, puerto:f.puerto, manifiesto:(S.exp.find(b=>b.nave===f.nave&&b.viaje===f.viaje&&b.manifiesto)||{}).manifiesto||'', dry:'', reefer:'', matrices:'', correctores:'', grupos:GRUPOS.map(()=>({puertos:[], matrices:'', correctores:''})), exc:[]},
    ex:{tipo:'', crit:'', amp:'', exo:'', por:'emb', emb:'', res:[], resTxt:'', motivo:''}, sel:new Set()};
  CC.abrir('screenDocCutForm'); };
function htmlCutForm(){
  seed(); const C = S.co; if(!C) return '';
  const d = C.d, ro = C.ro, dis = ro ? 'disabled' : '', x = C.ex, dt = (k, v, ph, on) => `<input type="datetime-local" value="${esc(v||'')}" ${dis} placeholder="${ph}" onchange="${on}">`;
  const exts = puertos().filter(p=>PAIS[p]!=='Perú');
  const grupos = d.grupos.map((g,i)=>`<div class="doc-grupo"><div class="fac-sec">${GRUPOS[i]}</div><div class="fac-g3">${campo('Puertos',`<select multiple size="3" ${dis} onchange="docCoG(${i},'puertos',[...this.selectedOptions].map(o=>o.value))" title="Seleccione puertos">${exts.map(p=>`<option ${g.puertos.includes(p)?'selected':''}>${esc(p)}</option>`).join('')}</select>`)}
    ${campo('Matrices', dt('', g.matrices, '', `docCoG(${i},'matrices',this.value)`))}${campo('Correctores', dt('', g.correctores, '', `docCoG(${i},'correctores',this.value)`))}</div></div>`).join('');
  const mtx = x.tipo==='MTX', crt = x.tipo==='CRT';
  const crit = !x.tipo ? '<p class="doc-mut">Seleccione primero el tipo de excepción.</p>' : mtx
    ? `<div class="fac-g2"><label class="doc-chk"><input type="radio" name="docCoCrit" ${x.crit==='amp'?'checked':''} onchange="docCoX('crit','amp')"> Ampliación de Fecha</label><label class="doc-chk"><input type="radio" name="docCoCrit" ${x.crit==='exo'?'checked':''} onchange="docCoX('crit','exo')"> Exoneración de Pago</label>
       ${x.crit==='amp'?campo('Ampliación de Fecha',`<input type="datetime-local" id="docCoAmp" value="${esc(x.amp)}" placeholder="Ingresar ampliación de fecha" onchange="docCoX('amp',this.value,1)">`):''}${x.crit==='exo'?campo('Exoneración de Pago','<input type="number" value="1" disabled>'):''}</div>`
    : `<div class="fac-g2">${campo('Ampliación de Fecha',`<input type="datetime-local" id="docCoAmp" value="${esc(x.amp)}" onchange="docCoX('amp',this.value,1)">`)}${campo('Exoneración de Pago',`<input type="number" min="1" max="99" value="${esc(x.exo)}" placeholder="Ingresar cantidad de exoneraciones" onchange="docCoX('exo',this.value,1)">`)}</div>`;
  const excForm = ro ? '' : `<div class="fac-card" id="docCoExc"><h3>Excepciones</h3>
    <div class="fac-f"><label>Seleccionar Tipo de Excepción *</label><div class="doc-radios"><label class="doc-chk"><input type="radio" name="docCoTipo" ${mtx?'checked':''} onchange="docCoX('tipo','MTX')"> Matrices</label><label class="doc-chk"><input type="radio" name="docCoTipo" ${crt?'checked':''} onchange="docCoX('tipo','CRT')"> Correctores</label></div></div>
    <div class="fac-f"><label>Criterios</label>${crit}</div>
    <div class="fac-f"><label>Buscar Exportación por</label><div class="doc-radios"><label class="doc-chk"><input type="radio" name="docCoPor" ${x.por==='emb'?'checked':''} onchange="docCoX('por','emb')"> Embarcador</label><label class="doc-chk"><input type="radio" name="docCoPor" ${x.por==='res'?'checked':''} onchange="docCoX('por','res')"> Número(s) de Reserva</label></div>
      ${x.por==='emb'?`<input id="docCoEmb" list="docCoEmbs" maxlength="100" placeholder="Ingresar embarcador" value="${esc(x.emb)}" onchange="docCoX('emb',this.value,1)">${dl('docCoEmbs',[...new Set(S.exp.filter(b=>b.nave===d.nave&&b.viaje===d.viaje).map(b=>b.embarcador))])}`
        :`<div class="doc-chips">${x.res.map((r,i)=>`<span class="cc-chip">${esc(r)} <button type="button" class="doc-x" onclick="docCoResDel(${i})">x</button></span>`).join('')}<input id="docCoResIn" placeholder="Ingresar número de reservas" onkeydown="if(event.key==='Enter'){docCoResAdd(this.value);}" onchange="docCoResAdd(this.value)"></div>`}</div>
    ${PV()?`<div class="fac-f cc-prop" data-prop="${esc(CC.textoPropuesta('I-074','Vencimiento'))}" style="max-width:320px"><label>Vence el ${CC.marca('Agrega','HU-DOC-25','I-074','PEN-I074-01')}</label><input type="datetime-local" id="docCoVence" value="${esc(x.vence||'')}" onchange="docCoX('vence',this.value,1)"><span class="doc-mut">Vacío: sin vencimiento.</span></div>`:''}
    <div class="fac-f"><label>Motivo de la excepción *</label><textarea id="docCoMot" rows="3" maxlength="500" placeholder="Ingresar el motivo de la excepción" oninput="docCoX('motivo',this.value,1);document.getElementById('docCoCnt').textContent=this.value.length+' / 500'">${esc(x.motivo)}</textarea><div class="doc-cnt-row"><span class="doc-mut">Se aplicará a todas las reservas que agregues.</span><span id="docCoCnt">${x.motivo.length} / 500</span></div></div>
    <div class="fac-btns">${btn('Agregar','docCoAgregar()','','id="docCoAgregar"')}${ghost('Eliminar','docCoEliminar()', C.sel.size?'':'disabled')}</div></div>`;
  const filas = d.exc.filter(e=>e.activa);
  const grilla = `<div class="fac-card" id="docCoGrid"><div class="fac-scroll"><table class="fac-tbl"><thead><tr>${ro?'':'<th></th>'}<th>Número de Reserva</th><th>Embarcador</th><th>RUC</th><th>Tipo de Excepción</th><th>Ampliación de Fecha</th><th>Exoneración de Pago</th><th>Motivo</th><th>Aprobado por</th>${PV()?`<th>Vencimiento ${CC.marca('Agrega','HU-DOC-25','I-074','PEN-I074-01')}</th>`:''}<th>Historial</th></tr></thead><tbody>
    ${filas.map(e=>`<tr>${ro?'':`<td><input type="checkbox" ${C.sel.has(e.id)?'checked':''} onchange="docCoSel('${e.id}',this.checked)"></td>`}<td>${esc(e.reserva)} ${e.marca?`<span class="cc-chip">${e.marca}</span>`:''}</td><td>${esc(e.embarcador)}</td><td>${esc(e.ruc)}</td><td>${esc(e.tipo)}</td>
      <td>${ro?esc(fdt(e.amp)):`<input type="datetime-local" value="${esc(e.amp)}" onchange="docCoFila('${e.id}','amp',this.value)" style="width:190px">`}</td><td>${esc(e.exo)}</td>
      <td style="white-space:normal;min-width:220px">${ro?(e.motivo?`<details><summary>${esc(e.motivo.slice(0,40))}${e.motivo.length>40?'…':''}</summary>${esc(e.motivo)}</details>`:'Sin registro'):`<label class="doc-mut">Motivo de la reserva ${esc(e.reserva)}</label><textarea rows="2" maxlength="500" onchange="docCoFila('${e.id}','motivo',this.value)">${esc(e.motivo)}</textarea>`}</td>
      <td>${e.marca==='Nueva'?'Se registrará al guardar':e.apr?`${esc(e.apr)}<div class="doc-mut">${fdt(e.aprTs)}</div>`:'Sin registro'}</td>${PV()?`<td>${e.vence?esc(fdt(e.vence)):'Sin vencimiento'}</td>`:''}<td>${ico('hist','Historial',`docCoHist('${esc(e.reserva)}')`)}</td></tr>`).join('') || `<tr><td colspan="11" class="fac-empty">Sin excepciones</td></tr>`}</tbody></table></div></div>`;
  return `<div class="fac-card" id="docCoViaje"><div class="fac-head"><h3>Información del Viaje</h3>${ro?btn('Editar','docCoEditar()','','id="docCoEditar"'):''}</div><div class="fac-g4">${CC.campoLectura('Viaje', d.viaje)}${CC.campoLectura('Nave', d.nave)}${CC.campoLectura('Número de Manifiesto', d.manifiesto)}${CC.campoLectura('Puerto de Embarque', d.puerto)}</div></div>
    <div class="fac-card"><h3>Cutoffs Operativos</h3><div class="fac-g2">${campo('Dry Cutoff', dt('', d.dry, 'Ingresar fecha dry cutoff', "docCoD('dry',this.value)"))}${campo('Reefer Cutoff', dt('', d.reefer, 'Ingresar fecha reefer cutoff', "docCoD('reefer',this.value)"))}</div></div>
    <div class="fac-card" id="docCoDoc"><h3>Cutoffs Documentarios</h3><div class="fac-g2">${campo('Matrices *', dt('', d.matrices, 'Ingresar fecha matriz', "docCoD('matrices',this.value)"))}${campo('Correctores *', dt('', d.correctores, 'Ingresar fecha corrector', "docCoD('correctores',this.value)"))}</div>${grupos}</div>
    ${excForm}${grilla}${ro?'':`<div class="fac-btns">${ghost('Cancelar','docCoCancelar()')}${btn(C.nuevo?'Crear':'Guardar','docCoGuardar()','','id="docCoGuardar"')}</div>`}`;
}
const coRe = () => { S.co.dirty = true; rerender('screenDocCutForm'); };
window.docCoD = (k, v) => { S.co.d[k] = v; S.co.dirty = true; };
window.docCoG = (i, k, v) => { S.co.d.grupos[i][k] = v; S.co.dirty = true; };
window.docCoX = (k, v, sinPintar) => { const x = S.co.ex; x[k] = v; if(k==='tipo'){ x.crit = ''; x.amp = ''; x.exo = ''; } if(k==='crit' && v==='exo') x.exo = '1'; if(k==='crit' && v==='amp') x.exo = ''; if(!sinPintar) coRe(); };
window.docCoResAdd = v => { v = String(v||'').trim().toUpperCase(); if(!v) return; v.split(/[\s,;]+/).forEach(r=>{ if(r && !S.co.ex.res.includes(r)) S.co.ex.res.push(r); }); coRe(); setTimeout(()=>$('docCoResIn')?.focus(), 30); };
window.docCoResDel = i => { S.co.ex.res.splice(i,1); coRe(); };
window.docCoSel = (id, on) => { S.co.sel[on?'add':'delete'](id); coRe(); };
window.docCoFila = (id, k, v) => { const e = S.co.d.exc.find(x=>x.id===id); e[k] = v; if(!e.marca) e.marca = 'Modificada'; coRe(); };
window.docCoEditar = () => { S.co.ro = false; rerender('screenDocCutForm'); };
window.docCoHist = reserva => { const b = S.exp.find(x=>x.numero===reserva); if(b) docHist(b.id, true); };
const grupoDe = (d, puerto) => d.grupos.find(g=>g.puertos.includes(puerto));
window.docCoAgregar = () => {
  const C = S.co, d = C.d, x = C.ex;
  if(!d.matrices || !d.correctores){ CC.toast('Por favor ingrese fechas del Cutoff Documentario.','error'); return; }
  if(!x.tipo || (x.por==='emb' ? !x.emb : !x.res.length) || !x.motivo.trim()){ CC.toast('Por favor complete todos los campos requeridos.','error'); return; }
  if(x.tipo==='MTX' && (!x.crit || (x.crit==='amp' && !x.amp))){ CC.toast('Por favor complete todos los campos requeridos.','error'); return; }
  if(x.tipo==='CRT' && !x.amp && !x.exo){ CC.toast('Por favor ingrese al menos un criterio de excepción.','error'); return; }
  const lim = x.tipo==='MTX' ? d.matrices : d.correctores;
  if(x.amp && x.amp < lim){ CC.toast(`La ampliación de fecha no puede ser anterior a la fecha de Cutoff Documentario de ${x.tipo==='MTX'?'Matrices':'Correctores'}.`,'error'); return; }
  if(x.motivo.trim().length < 10){ CC.toast('El motivo debe tener entre 10 y 500 caracteres.','error'); return; }
  if(PV() && x.vence && x.vence < masHoras(0)){ CC.toast('La fecha de vencimiento no puede ser anterior a la fecha actual.','error'); return; }
  const cand = S.exp.filter(b=>b.nave===d.nave && b.viaje===d.viaje && (x.por==='emb' ? nt(b.embarcador)===nt(x.emb) : x.res.includes(b.numero)));
  if(!cand.length){ CC.toast('No se encontraron reservas con los criterios proporcionados.','error'); return; }
  const tipoT = x.tipo==='MTX' ? 'Matrices' : 'Correctores', dup = cand.filter(b=>d.exc.some(e=>e.activa && e.reserva===b.numero && e.tipo===tipoT)), nuevas = cand.filter(b=>!dup.includes(b));
  const agregar = () => { nuevas.forEach(b=>d.exc.push({id:'X'+(++S.seq), reserva:b.numero, embarcador:b.embarcador, ruc:(CC.datos.socios.embarcadores.find(s=>s.razonSocial===b.embarcador)||{}).ruc||'', tipo:tipoT, amp:x.amp||'', exo:x.exo||'', motivo:x.motivo.trim(), apr:'', aprTs:'', marca:'Nueva', activa:true, vence:PV()?(x.vence||''):''}));
    C.ex = {tipo:'', crit:'', amp:'', exo:'', por:x.por, emb:'', res:[], motivo:'', vence:''}; coRe(); };
  const seguir = () => { if(!nuevas.length) return;
    const antes = x.amp ? nuevas.filter(b=>{ const g = grupoDe(d, b.puertoDescarga); const gl = g && (x.tipo==='MTX' ? g.matrices : g.correctores); return gl && x.amp < gl; }) : [];
    if(antes.length) confirmar('Confirmar', `La ampliación de fecha es anterior al cutoff del puerto de descarga de: ${esc(antes.map(b=>b.numero).join(', '))}. ¿Desea continuar?`, 'Continuar', agregar); else agregar(); };
  if(dup.length) aviso('Información', `<p>No se pudo agregar la(s) reserva(s) ${esc(dup.map(b=>b.numero).join(', '))} porque ya existe(n) en las excepciones.</p>`, seguir); else seguir();
};
window.docCoEliminar = () => { const C = S.co; if(!C.sel.size) return;
  if(PV()) return bajaConMotivo(C);
  confirmar('Eliminar','¿Está seguro que desea eliminar esta(s) excepción(es) de cutoff? La baja queda registrada en el historial de cada reserva.','Eliminar',()=>{
    C.d.exc.forEach(e=>{ if(C.sel.has(e.id)){ if(e.marca==='Nueva') e.activa = false; else { e.activa = false; e.baja = true; } } }); C.sel.clear(); coRe(); }); };
window.docCoCancelar = () => { const C = S.co, salir = () => { if(C.nuevo) CC.abrir('screenDocCut'); else { S.co = {...C, ro:true, dirty:false, d:clone(S.cut[C.k]), sel:new Set()}; rerender('screenDocCutForm'); } };
  confirmar('Cancelar', `¿Está seguro que desea cancelar la ${C.nuevo?'creación':'edición'} del cutoff? Se perderán los cambios no guardados.`, 'Sí, cancelar', salir, 'No'); };
window.docCoGuardar = () => {
  const C = S.co, d = C.d;
  if(!d.matrices || !d.correctores){ CC.toast('Por favor ingrese fechas del Cutoff Documentario.','error'); return; }
  if(d.correctores < d.matrices){ CC.toast('La fecha de Corrector no puede ser anterior a la fecha de Matriz para los Cutoffs Documentarios.','error'); return; }
  for(let i=0;i<3;i++){ const g = d.grupos[i], suf = i ? ` ${i+1}.` : '';
    if(g.puertos.length && (!g.matrices || !g.correctores)){ CC.toast(`Por favor ingrese fecha de Matriz y Corrector para el Puerto de Descarga${suf}`,'error'); return; }
    if(!g.puertos.length && (g.matrices || g.correctores)){ CC.toast(`Por favor seleccione al menos un puerto para el Puerto de Descarga${suf}`,'error'); return; }
    if(g.matrices && g.correctores && g.correctores < g.matrices){ CC.toast(`La fecha de Corrector no puede ser anterior a la fecha de Matriz para el Puerto de Descarga${suf}`,'error'); return; } }
  const mod = d.exc.filter(e=>e.activa && e.marca), sinMot = mod.filter(e=>!e.motivo.trim()), malMot = mod.filter(e=>e.motivo.trim() && (e.motivo.trim().length<10 || e.motivo.length>500));
  if(sinMot.length){ CC.toast(`Falta el motivo en: ${sinMot.map(e=>e.reserva).join(', ')}`,'error'); return; }
  if(malMot.length){ CC.toast(`El motivo debe tener entre 10 y 500 caracteres: ${malMot.map(e=>e.reserva).join(', ')}.`,'error'); return; }
  const fin = () => {
    d.exc.forEach(e=>{ const b = S.exp.find(x=>x.numero===e.reserva);
      if(e.activa && e.marca){ e.apr = CC.usuario(); e.aprTs = ahora(); if(b) b.hist.push(ev(`Excepción de cutoff (${e.tipo}) ${e.marca==='Nueva'?'registrada':'modificada'}. Motivo: ${e.motivo}`, CC.usuario())); e.marca = ''; }
      if(e.baja && !e.bajaReg){ e.bajaReg = true; if(b) b.hist.push(ev(`Excepción de cutoff (${e.tipo}) dada de baja${e.motivoBaja?'. Motivo: '+e.motivoBaja:''}`, CC.usuario())); } });
    if(!d.id) d.id = 'C' + (++S.seq); S.cut[C.k] = clone(d);
    CC.toast(C.nuevo ? 'Cutoff creado exitosamente.' : 'Cutoff actualizado exitosamente.', 'success');
    S.co = {...C, nuevo:false, ro:true, dirty:false, d:clone(d), sel:new Set()}; rerender('screenDocCutForm'); };
  const antes = mod.filter(e=>{ const b = S.exp.find(x=>x.numero===e.reserva), g = b && grupoDe(d, b.puertoDescarga), gl = g && (e.tipo==='Matrices' ? g.matrices : g.correctores); return e.amp && gl && e.amp < gl; });
  if(antes.length) confirmar('Confirmar', `La ampliación de fecha es anterior al cutoff del puerto de descarga de: ${esc(antes.map(e=>e.reserva).join(', '))}. ¿Desea continuar?`, 'Continuar', fin); else fin();
};

/* =====================================================================
   PROPUESTAS sobre Documentación (todo marcado en morado; se oculta con "Ver propuestas" apagado)
   I-062 HU-DOC-05 avisos · I-017/I-080/I-081/I-185 HU-DOC-22 trazabilidad · I-069 HU-DOC-09 anulación en bloque
   I-055 HU-DOC-20 eliminación en bloque · I-074 HU-DOC-25 vencimiento y baja con motivo · I-078 HU-DOC-19 correctores
   I-036 HU-DOC-02 creación rápida de socios · I-060 HU-DOC-01 recargos TUR · I-019 HU-DOC-05 recargos en el aviso
   I-022 HU-DOC-21 BL No Negociable · I-182 HU-DOC-39 guardado parcial de la Reserva
===================================================================== */
const MKP = (hu, t, pen) => CC.marca('Agrega', hu, t, pen);

/* ---------- I-080 / I-185: estado de aprobación y log de cambios ---------- */
const TONO_AP = {'Aprobado':['#E8F5EE','#1E7B45'], 'Pendiente de aprobación':['#FFF7E6','#8A5A00'], 'Rechazado':['#FDECEC','#B3261E']};
const estadoAprob = (c, b) => c.estadoAprob || (/^Corrector/.test(c.origen) && b.estado==='POR RECTIFICAR' && c.ver===b.version ? 'Pendiente de aprobación' : 'Aprobado');
const estiloAprob = (c, b) => `background:${TONO_AP[estadoAprob(c, b)][0]}`;
const chipAp = e => `<span class="cc-chip" style="background:${TONO_AP[e][0]};color:${TONO_AP[e][1]}">${e}</span>`;
const chipAprob = (c, b) => chipAp(estadoAprob(c, b));
const leyendaAprob = b => `<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">
  <span ${CC.propuesta('I-080','Leyenda de estados')} id="docHistLeyenda" style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="doc-mut">Leyenda ${MKP('HU-DOC-22','I-080','PEN-I080-01')}</span>${Object.keys(TONO_AP).map(chipAp).join('')}<span class="doc-mut">Todos los campos de una misma corrección llevan el mismo color.</span></span>
  <span ${CC.propuesta('I-185','Log de cambios')}>${ghost('Exportar log de cambios',`docLogExp('${b.id}')`,'id="docLogExp"')}</span></div>`;
window.docLogExp = id => { const b = buscarBL(id);
  CC.exportarExcel(`Log_cambios_${b.numero||'BL'}_${sello()}`, 'Cambios', ['Versión','Origen','Campo','Valor anterior','Valor nuevo','Usuario','Fecha y hora','Estado de aprobación','Comentario'],
    (b.cambios||[]).flatMap(c=>c.campos.map(x=>['V'+c.ver, c.origen, x.campo, x.antes, x.despues, c.user, fdt(c.ts), estadoAprob(c, b), c.comentario||''])));
  b.hist.push(ev('Log de cambios exportado a Excel', CC.usuario())); };

/* ---------- I-017: vínculo del transbordo con el BL de Exportación ---------- */
const vinculoTrb = b => b.indicador!=='Transbordo' ? '' : `<div class="fac-note" ${CC.propuesta('I-017','Vínculo con BL de Exportación')} id="docHistVinc"><b>Vínculo con el BL de Exportación</b> ${MKP('HU-DOC-22','I-017','PEN-I017-03')}<br>
  ${b.solicitud ? `BL replicado en la nave de conexión ${esc(b.naveCx)} / ${esc(b.viajeCx)} con el número ${esc(b.numero)} y N° de Solicitud ${esc(b.solicitud)}. Conserva los campos del BL de importación.`
    : b.naveCx ? `Se replicará en la nave de conexión ${esc(b.naveCx)} / ${esc(b.viajeCx)} al numerar la solicitud de transbordo.` : 'Sin nave de conexión registrada.'}
  <br><span class="doc-mut">Las acciones críticas (transmisión, rectificación, anulación, nave de conexión, numeración y listado) quedan en Eventos con usuario y fecha.</span></div>`;

/* ---------- I-081: borrador vigente en la Reserva ---------- */
function borradorHtml(d){
  const real = buscarBL(d.id) || d, fin = (real.bl||[]).some(t=>t.c==='0154' && t.st==='COMPLETED');
  const filas = (real.cambios||[]).map(c=>({ts:c.ts, op:`Versión V${c.ver} guardada (${c.origen})`, user:c.user, res:'Guardada'}))
    .concat((real.hist||[]).filter(e=>/^Descarga de (borrador|BL final)/.test(e.comment)).map(e=>({ts:e.ts, op:e.comment, user:e.user, res:'Completada'})))
    .sort((x,y)=>x.ts<y.ts?1:-1);
  return `<div class="fac-card" ${CC.propuesta('I-081', fin?'BL final':'Borrador vigente')} id="docEdDraft"><div class="fac-head"><div><h3>${fin?'BL final':'BL borrador'}: versión vigente V${esc(real.version||0)} ${MKP('HU-DOC-22','I-081','PEN-I081-01')}</h3>
    <div class="fac-sub">${fin?'El BL ya fue transmitido (0154). La descarga corresponde al BL final.':'Es la última versión guardada y todavía no es el BL final. Para cambiarla use Editar.'}</div></div>
    <div class="fac-acts"><span class="cc-chip" style="background:${TONO_AP[fin?'Aprobado':'Pendiente de aprobación'][0]};color:${TONO_AP[fin?'Aprobado':'Pendiente de aprobación'][1]}">${fin?'Final':'Borrador'}</span>${ghost(fin?'Descargar BL final':'Descargar borrador',`docDraftDesc('${real.id}')`,'id="docDraftDesc"')}</div></div>
    <details><summary>Historial de versiones y descargas (${filas.length})</summary><table class="fac-tbl"><thead><tr><th>Fecha y hora</th><th>Operación</th><th>Usuario</th><th>Resultado</th></tr></thead><tbody>
    ${filas.map(f=>`<tr><td>${fdt(f.ts)}</td><td>${esc(f.op)}</td><td>${esc(f.user)}</td><td>${f.res}</td></tr>`).join('') || '<tr><td colspan="4" class="fac-empty">Sin versiones guardadas</td></tr>'}</tbody></table></details></div>`;
}
window.docDraftDesc = id => { const b = buscarBL(id), fin = (b.bl||[]).some(t=>t.c==='0154' && t.st==='COMPLETED');
  b.hist.push(ev(`${fin?'Descarga de BL final':'Descarga de borrador'} V${b.version||0} en PDF`, CC.usuario()));
  CC.toast(`${fin?'BL final':'Borrador'} V${b.version||0} de ${b.numero} descargado en PDF`,'success'); rerender(ED_ID('exp')); };

/* ---------- I-078: correctores en la búsqueda de Exportación ---------- */
const correctoresDe = b => (b.cambios||[]).filter(c=>/^Corrector/.test(c.origen));
const colCorrectores = () => PV() ? [{t:`Correctores ${MKP('HU-DOC-19','I-078','PEN-I078-01')}`, v:b=>{ const l = correctoresDe(b), c = l[l.length-1];
  return c ? `<button type="button" class="fac-link" onclick="docCorrDet('${b.id}')">${esc(c.origen)}</button>` : '<span class="doc-mut">Sin correctores</span>'; }}] : [];
window.docCorrDet = id => { const b = buscarBL(id);
  CC.modal(`<div ${CC.propuesta('I-078','Detalle de correctores')} id="docCorrDet"><h3>Correctores de la reserva ${esc(b.numero)} ${MKP('HU-DOC-19','I-078','PEN-I078-01')}</h3>
    <p class="doc-mut">El corrector actualiza el BL al guardarse de forma definitiva en el portal externo; no hay traslado manual. Consultar esta ventana no genera avisos nuevos.</p>
    ${correctoresDe(b).slice().reverse().map(c=>`<div class="doc-ver"><div class="doc-ver-h"><b>${esc(c.origen)}</b><span class="cc-chip">V${c.ver}</span>${chipAprob(c, b)}<span class="doc-mut">Guardado definitivo · ${esc(c.user)} · ${fdt(c.ts)}</span></div>
      <table class="fac-tbl"><thead><tr><th>Campo</th><th>Valor anterior</th><th>Valor propuesto</th><th>Comentario</th></tr></thead><tbody>${c.campos.map(x=>`<tr><td>${esc(x.campo)}</td><td>${x.antes===''?'<span class="doc-mut">Sin valor</span>':esc(x.antes)}</td><td>${esc(x.despues)}</td><td style="white-space:normal">${esc(c.comentario||'Sin comentario')}</td></tr>`).join('')}</tbody></table>
      <p class="doc-mut">Aviso enviado al buzón de Exportación de la sede ${SUCURSAL} (contactos tipo Exportación; alterno Importación/Exportación) el ${fdt(c.avisoTs||c.ts)}.</p></div>`).join('')}</div>
    <div class="fac-btns">${btn('Cerrar','CC.cerrarModal()')}</div>`, 'lg'); };

/* ---------- I-069: anulación de numeración en bloque por nave de origen ---------- */
const anElegible = b => !['APROBADO','TRANSMITIDO A SUNAT','POR RECTIFICAR'].includes(b.estado) ? 'El BL no cumple las condiciones para anular la numeración' : (last(b.sunat)||{}).st==='PENDING' ? 'Transmisión SUNAT en curso' : '';
window.docAnAbrir = () => { const q = S.ft.q; if(!q || !q.nave || !q.viaje){ CC.toast('Seleccione la nave y el viaje de origen para anular en bloque.','error'); return; }
  K.an = {l:trsDe(q.nave, q.viaje).filter(b=>b.solicitud), sel:new Set(), exp:'', mot:'', err:''}; pintarAn(); };
function pintarAn(){ const a = K.an, q = S.ft.q, elig = a.l.filter(b=>!anElegible(b));
  CC.modal(`<div ${CC.propuesta('I-069','Anulación en bloque')} id="docAnDlg"><h3>Anulación de numeración en bloque ${MKP('HU-DOC-09','I-069','PEN-I069-01')}</h3>
    <p>Nave de origen <b>${esc(q.nave)}</b>, viaje <b>${esc(q.viaje)}</b>. Seleccione las solicitudes de transbordo que desea anular.</p>
    ${a.l.length ? `<table class="fac-tbl"><thead><tr><th><input type="checkbox" title="Seleccionar todas" ${elig.length && elig.every(b=>a.sel.has(b.id))?'checked':''} onchange="docAnTodos(this.checked)"></th><th>Número de BL</th><th>N° de Solicitud</th><th>Nave Conexión - Viaje Conexión</th><th>Estado BL</th><th>Observación</th></tr></thead><tbody>
      ${a.l.map(b=>{ const m = anElegible(b); return `<tr><td><input type="checkbox" ${a.sel.has(b.id)?'checked':''} ${m?'disabled':''} onchange="docAnSel('${b.id}',this.checked)"></td><td>${esc(b.numero)}</td><td>${esc(b.solicitud)}</td><td>${esc(b.naveCx)} - ${esc(b.viajeCx)}</td><td>${chipBL(b.estado)}</td><td>${esc(m||'Elegible')}</td></tr>`; }).join('')}</tbody></table>`
      : '<p class="doc-mut">No hay BL con N° de Solicitud en la nave y viaje de origen.</p>'}
    <div class="fac-g2">${campo('Nro Expediente *',`<input id="docAnExp" maxlength="60" value="${esc(a.exp)}" onchange="K_an('exp',this.value)">`)}${campo('Motivo *',`<textarea id="docAnMot" rows="2" maxlength="500" onchange="K_an('mot',this.value)">${esc(a.mot)}</textarea>`)}</div>
    <span class="doc-err" id="docAnErr">${esc(a.err)}</span></div>
    <div class="fac-btns">${ghost('Cancelar','CC.cerrarModal()')}${btn(`Anular (${a.sel.size})`,'docAnOk()','',`id="docAnOk" ${a.sel.size?'':'disabled'}`)}</div>`, 'lg'); }
window.K_an = (k, v) => { K.an[k] = v; };
window.docAnSel = (id, on) => { K.an.sel[on?'add':'delete'](id); pintarAn(); };
window.docAnTodos = on => { K.an.l.filter(b=>!anElegible(b)).forEach(b=>K.an.sel[on?'add':'delete'](b.id)); pintarAn(); };
window.docAnOk = () => { const a = K.an; a.exp = ($('docAnExp').value||'').trim(); a.mot = ($('docAnMot').value||'').trim();
  a.err = !a.exp ? 'El Nro de Expediente es obligatorio.' : a.exp.length>50 ? 'El Nro de Expediente no puede superar 50 caracteres.' : a.mot.length<10 || a.mot.length>500 ? 'El motivo debe tener entre 10 y 500 caracteres.' : '';
  if(a.err) return pintarAn();
  const bls = a.l.filter(b=>a.sel.has(b.id));
  confirmar('Anulación de numeración en bloque', `Se anulará la numeración de transbordo de ${bls.length} BL(s) de la nave de origen. ¿Confirma?`, 'Anular', ()=>{
    const res = bls.map(b=>{ const m = anElegible(b); if(m) return {b, sol:b.solicitud, m};
      const sol = b.solicitud; b.hist.push(ev(`Numeración de transbordo ${sol} anulada en bloque. Expediente ${a.exp}. Motivo: ${a.mot}`, CC.usuario())); b.solicitud = ''; b.detalleTrb = ''; return {b, sol, m:''}; });
    rerender('screenDocTrb');
    dlg('Resultado de la anulación en bloque', `<p>Anuladas: ${res.filter(r=>!r.m).length}. No anuladas: ${res.filter(r=>r.m).length}.</p><table class="fac-tbl"><thead><tr><th>Número de BL</th><th>N° de Solicitud</th><th>Resultado</th></tr></thead><tbody>${res.map(r=>`<tr class="${r.m?'doc-fila-err':''}"><td>${esc(r.b.numero)}</td><td>${esc(r.sol)}</td><td>${esc(r.m||'Anulada')}</td></tr>`).join('')}</tbody></table>`, [['Aceptar','docCbSi()']], 'md'); }); };

/* ---------- I-055: eliminación de BL en bloque con permiso especial ---------- */
const puedeEliminarBloque = () => /Gerencia|Supervis|Coordinad|Jefatur/i.test(CC.usuario());
const elElegible = b => { const tx = b.sunat ? b.sunat : [...(b.res||[]), ...(b.bl||[])].sort((x,y)=>x.ts<y.ts?-1:1), ok = tx.filter(t=>t.st==='COMPLETED'), u = ok[ok.length-1];
  if(tx.some(t=>t.st==='PENDING')) return 'Transmisión SUNAT en curso';
  if(u && !['0104','0173','0156'].includes(u.c)) return 'Transmitido a SUNAT: requiere anulación SUNAT aprobada';
  if(b.pago) return 'Tiene estado de pago o liquidación';
  return ''; };
window.docElAbrir = k => { const q = (k==='imp'?S.fi:S.fe).q;
  if(!q.nave || !q.viaje){ CC.toast('Busque primero por nave y número de viaje para eliminar BL en bloque.','error'); return; }
  K.el = {k, nave:q.nave, viaje:q.viaje, ind:'', sel:new Set(), mot:'', err:''}; pintarEl(); };
function pintarEl(){ const e = K.el, imp = e.k==='imp', l = (imp?S.imp:S.exp).filter(b=>b.nave===e.nave && b.viaje===e.viaje && (!e.ind || b.indicador===e.ind)), perm = puedeEliminarBloque();
  e.l = l; const elig = l.filter(b=>!elElegible(b));
  CC.modal(`<div ${CC.propuesta('I-055','Eliminación en bloque')} id="docElDlg"><h3>Eliminar BL en bloque ${MKP('HU-DOC-20','I-055','PEN-I055-01')}</h3>
    ${perm ? '' : '<div class="fac-note err" id="docElSinPerm">Su perfil no tiene el permiso especial Eliminar BL en bloque. Lo tienen los perfiles Coordinador, Supervisor y Jefatura.</div>'}
    <p>Nave <b>${esc(e.nave)}</b>, viaje <b>${esc(e.viaje)}</b>. La eliminación es definitiva en la operación; la traza (usuario, fecha y motivo) se conserva.</p>
    <div class="fac-g3">${campo('Tipo de operación', sel(imp?IND_IMP:IND_EXP, e.ind, `onchange="docElInd(this.value)"`, 'Todas'))}</div>
    <table class="fac-tbl"><thead><tr><th><input type="checkbox" title="Seleccionar elegibles" ${!perm?'disabled':''} ${elig.length && elig.every(b=>e.sel.has(b.id))?'checked':''} onchange="docElTodos(this.checked)"></th><th>${imp?'Número BL':'Número de Reserva'}</th><th>Indicador</th><th>Estado BL</th><th>Elegibilidad</th></tr></thead><tbody>
    ${l.map(b=>{ const m = elElegible(b); return `<tr><td><input type="checkbox" ${e.sel.has(b.id)?'checked':''} ${m||!perm?'disabled':''} onchange="docElSel('${b.id}',this.checked)"></td><td>${esc(b.numero||'Pendiente')}</td><td>${esc(b.indicador)}</td><td>${chipBL(b.estado)}</td><td>${esc(m||'Elegible')}</td></tr>`; }).join('') || '<tr><td colspan="5" class="fac-empty">Sin BL para la nave y viaje</td></tr>'}</tbody></table>
    ${campo('Motivo *',`<textarea id="docElMot" rows="2" maxlength="500" ${!perm?'disabled':''} onchange="docSoV('mot',this.value,1)">${esc(e.mot)}</textarea>`)}<span class="doc-err" id="docElErr">${esc(e.err)}</span></div>
    <div class="fac-btns">${ghost('Cancelar','CC.cerrarModal()')}${btn(`Eliminar (${e.sel.size})`,'docElOk()','',`id="docElOk" ${perm && e.sel.size?'':'disabled'}`)}</div>`, 'lg'); }
window.docElInd = v => { K.el.ind = v; K.el.sel.clear(); pintarEl(); };
window.docElSel = (id, on) => { K.el.mot = ($('docElMot')||{}).value||K.el.mot; K.el.sel[on?'add':'delete'](id); pintarEl(); };
window.docElTodos = on => { K.el.mot = ($('docElMot')||{}).value||K.el.mot; K.el.l.filter(b=>!elElegible(b)).forEach(b=>K.el.sel[on?'add':'delete'](b.id)); pintarEl(); };
window.docElOk = () => { const e = K.el; if(!puedeEliminarBloque()) return; e.mot = ($('docElMot').value||'').trim();
  e.err = e.mot.length<10 || e.mot.length>500 ? 'El motivo debe tener entre 10 y 500 caracteres.' : ''; if(e.err) return pintarEl();
  const imp = e.k==='imp', lista = imp ? S.imp : S.exp, bls = e.l.filter(b=>e.sel.has(b.id));
  confirmar('Eliminar BL en bloque', `Se eliminarán ${bls.length} BL de forma definitiva. Esta acción no se puede deshacer. ¿Confirma?`, 'Eliminar', ()=>{
    S.elim = S.elim || [];
    const res = bls.map(b=>{ const m = elElegible(b); if(m) return {b, m};
      const i = lista.indexOf(b); if(i>=0) lista.splice(i,1); (imp?S.fi:S.fe).sel.delete(b.id);
      S.elim.push({numero:b.numero, nave:b.nave, viaje:b.viaje, user:CC.usuario(), ts:ahora(), motivo:e.mot}); return {b, m:''}; });
    rerender(imp ? 'screenDocImp' : 'screenDocExp');
    dlg('Resultado de la eliminación en bloque', `<p>Eliminados: ${res.filter(r=>!r.m).length}. No eliminados: ${res.filter(r=>r.m).length}.</p><table class="fac-tbl"><thead><tr><th>Número BL</th><th>Resultado</th></tr></thead><tbody>${res.map(r=>`<tr class="${r.m?'doc-fila-err':''}"><td>${esc(r.b.numero||'Pendiente')}</td><td>${esc(r.m||'Eliminado. Traza registrada con usuario, fecha y motivo.')}</td></tr>`).join('')}</tbody></table>`, [['Aceptar','docCbSi()']], 'md'); }); };

/* ---------- I-074: baja de excepción con motivo ---------- */
function bajaConMotivo(C){
  pedirMotivo({titulo:'Dar de baja excepción', texto:`Excepciones seleccionadas: ${C.sel.size}. La baja y su motivo quedan en el historial de cada reserva. ${MKP('HU-DOC-25','I-074','PEN-I074-01')}`, min:10, max:500, boton:'Dar de baja',
    cb:m=>{ C.d.exc.forEach(e=>{ if(C.sel.has(e.id)){ e.activa = false; if(e.marca!=='Nueva'){ e.baja = true; e.motivoBaja = m; } } }); C.sel.clear(); coRe(); }});
}

/* ---------- I-036: creación rápida de socios desde el BL ---------- */
const ROL_SOCIO = {'imp.embarcador':'Embarcador','imp.consignatario':'Consignatario','imp.notificante':'Notificante','exp.embarcador':'Embarcador','exp.consignatario':'Consignatario','exp.notificante':'Notificante','exp.notif2':'Notificante'};
const DIR_SOCIO = {embarcador:'dirEmb', consignatario:'dirCons', notificante:'dirNot'};
const PAISES = ['Perú', ...new Set(Object.values(PAIS).filter(p=>p!=='Perú')), 'Chile', 'Ecuador', 'Estados Unidos'];
const sociosNuevos = roles => S && S.socios ? S.socios.filter(s=>s.roles.some(r=>roles.includes(r))).map(s=>s.razonSocial) : [];
const socioBtn = (k, key) => `<span ${CC.propuesta('I-036','Alta rápida')}><button type="button" class="fac-link doc-socbtn" id="docSoc_${key}" onclick="docSocAbrir('${key}')">+ Crear socio (${ROL_SOCIO[k+'.'+key]})</button></span>`;
window.docSocAbrir = key => { const k = S.ed.k, rol = ROL_SOCIO[k+'.'+key];
  K.so = {key, rol, tipoDoc:'RUC', num:'', razon:'', dir:'', pais:'Perú', tipoCont:k==='imp'?'Importación':'Exportación', correo:'', err:'', dup:null}; pintarSoc(); };
function pintarSoc(){ const o = K.so, v = (f, ph, extra) => `<input id="docSo_${f}" value="${esc(o[f])}" placeholder="${ph}" onchange="docSoV('${f}',this.value)" ${extra||''}>`;
  CC.modal(`<div ${CC.propuesta('I-036','Creación rápida de socio')} id="docSocDlg"><h3>Crear socio: ${esc(o.rol)} ${MKP('HU-DOC-02','I-036','PEN-I036-02')}</h3>
    <p class="doc-mut">Solo los datos mínimos. El socio queda en estado Pendiente de aprobación y se completa después en Data Maestra. Lo ingresado en el BL se conserva.</p>
    <div class="fac-g2">${CC.campoLectura('Rol', o.rol)}${campo('País *', sel(PAISES, o.pais, `id="docSo_pais" onchange="docSocPais(this.value)"`))}
      ${campo('Tipo de documento *', sel(o.pais==='Perú'?['RUC']:['Documento extranjero (Tax ID)','Sin documento'], o.tipoDoc, `id="docSo_tipoDoc" onchange="docSoV('tipoDoc',this.value)"`))}${campo(`Número de documento${o.pais==='Perú'?' *':''}`, v('num', o.pais==='Perú'?'11 dígitos':'Opcional', 'maxlength="20"'))}
      ${campo('Razón social *', v('razon','Ingresar razón social','maxlength="200"'))}${campo('Dirección *', v('dir','Ingresar dirección','maxlength="200"'))}
      ${campo('Tipo de contacto *', sel(['Importación','Exportación','Importación/Exportación'], o.tipoCont, `id="docSo_tipoCont" onchange="docSoV('tipoCont',this.value)"`))}${campo('Correo de contacto *', v('correo','correo@empresa.example','type="email" maxlength="120"'))}</div>
    ${o.dup ? `<div class="fac-note warn" id="docSocDup">Ya existe el socio ${esc(o.dup.razonSocial)} (${esc(o.dup.ruc||'sin documento')}, ${esc(o.dup.estado||'Aprobado')}). Para no duplicarlo puede usarlo en el BL y agregarle el rol ${esc(o.rol)}.</div>` : ''}
    <span class="doc-err" id="docSocErr">${esc(o.err)}</span></div>
    <div class="fac-btns">${ghost('Cancelar','CC.cerrarModal()')}${o.dup ? btn('Usar socio existente','docSocUsar()','','id="docSocUsar"') : btn('Crear socio','docSocCrear()','','id="docSocCrear"')}</div>`, 'md'); }
window.docSoV = (f, v, el) => { (el ? K.el : K.so)[f] = v; };
window.docSocPais = p => { const o = K.so; ['num','razon','dir','correo'].forEach(f=>{ const x = $('docSo_'+f); if(x) o[f] = x.value; }); o.pais = p; o.tipoDoc = p==='Perú' ? 'RUC' : 'Documento extranjero (Tax ID)'; o.dup = null; pintarSoc(); };
const todosSocios = () => { const s = CC.datos.socios; return [...s.clientes, ...s.embarcadores, ...s.consignatarios, ...(S.socios||[])]; };
window.docSocCrear = () => { const o = K.so; ['num','razon','dir','correo'].forEach(f=>{ o[f] = ($('docSo_'+f).value||'').trim(); });
  o.err = !o.razon || !o.dir || !o.correo || (o.pais==='Perú' && !o.num) ? 'Por favor complete todos los campos obligatorios' : o.pais==='Perú' && !/^(10|20)\d{9}$/.test(o.num) ? 'El RUC debe tener 11 dígitos y empezar con 10 o 20.' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.correo) ? 'Ingrese un correo de contacto válido.' : '';
  if(o.err) return pintarSoc();
  o.dup = todosSocios().find(s=>(o.num && s.ruc===o.num) || nt(s.razonSocial)===nt(o.razon)) || null;
  if(o.dup) return pintarSoc();
  S.socios = S.socios || [];
  const s = {id:'SN'+(++S.seq), tipo:o.tipoDoc, ruc:o.num, razonSocial:o.razon.toUpperCase(), direccion:o.dir, pais:o.pais, roles:[o.rol], contactos:[{tipo:o.tipoCont, correo:o.correo}], estado:'Pendiente de aprobación',
    origen:S.ed.k==='imp'?'Documentación > BL de Importación':'Documentación > Reserva de Exportación', user:CC.usuario(), ts:ahora()};
  S.socios.push(s); aplicarSocio(s.razonSocial, o.dir, `Socio ${s.razonSocial} creado en estado Pendiente de aprobación y seleccionado en el BL.`); };
window.docSocUsar = () => { const o = K.so, s = o.dup; if(s.roles && !s.roles.includes(o.rol)) s.roles.push(o.rol);
  (S.rolesAgregados = S.rolesAgregados || []).push({socio:s.razonSocial, rol:o.rol, user:CC.usuario(), ts:ahora()});
  aplicarSocio(s.razonSocial, '', `Se usó el socio existente ${s.razonSocial} con el rol ${o.rol}.`); };
function aplicarSocio(nombre, dir, msg){ const E = S.ed, key = K.so.key, dk = DIR_SOCIO[key];
  E.d[key] = nombre; if(dir && dk && !E.d[dk]) E.d[dk] = dir; E.dirty = true; CC.cerrarModal(); CC.toast(msg,'success'); rerender(ED_ID(E.k)); }

/* ---------- I-062: configuración de Avisos de Llegada y Salida ---------- */
const AV_PUERTOS = ['Callao','Paita','Pisco'], AV_SECC = [['fletes','Fletes y recargos'],['direcc','Instrucciones de direccionamiento'],['deposito','Depósito por defecto'],['devolucion','Devolución de contenedores'],['sobrestadia','Sobrestadía'],['cuentas','Cuentas bancarias']];
const AV_URL = 'https://connect.cosmos.example';
function avSeed(){
  if(S.av) return S.av;
  const ls = CC.datos.lineas.map(l=>l.codigo), otra = ls.find(c=>c!=='ZIM') || 'MSC';
  const mk = (tipo, linea, puerto, x) => Object.assign({id:'AV'+(++S.seq), tipo, linea, puerto, suc:puerto,
    contacto:`${tipo==='Llegada'?'importaciones':'exportaciones'}.${nt(puerto)}@cosmos.example`,
    secc:{fletes:true, direcc:tipo==='Llegada', deposito:tipo==='Llegada', devolucion:tipo==='Llegada', sobrestadia:true, cuentas:true},
    esp:'Su carga arribará al puerto de {PUERTO}. Para consultas comuníquese con {CONTACTO}.', eng:'Your cargo will arrive at the port of {PUERTO}. For inquiries please contact {CONTACTO}.',
    enlDir:AV_URL+'/direccionamiento', enlDes:AV_URL+'/desglose', enlPag:AV_URL+'/pagos', depCont:DEPOSITOS[0].n, depRod:DEPOSITOS[2].n,
    devol:`Devolver el contenedor vacío en el depósito asignado por la línea en ${puerto}.`, sobre:'Según tarifa vigente de la línea: días libres del BL y luego cobro diario por contenedor.',
    cuentas:'Banco de ejemplo, cuenta corriente USD 000-0000000-0-00 (ficticia)', user:'J. Ramos (Documentación)', ts:'2026-11-10T10:00:00'}, x||{});
  S.av = {tipo:'Llegada', f:{linea:'', puerto:'', suc:''}, ed:null, cfg:[mk('Llegada','ZIM','Callao'), mk('Llegada','ZIM','Paita'), mk('Llegada',otra,'Callao',{secc:{fletes:true, direcc:true, deposito:true, devolucion:false, sobrestadia:false, cuentas:true}}), mk('Llegada',otra,'Pisco'),
    mk('Salida','ZIM','Callao'), mk('Salida',otra,'Callao')]};
  return S.av;
}
window.docAvAbrir = tipo => { seed(); avSeed().tipo = tipo; S.av.ed = null; CC.abrir('screenDocAvisos'); };
const avModelo = l => l==='ZIM' ? 'Modelo 1: logos Cosmos y ZIM' : 'Modelo 2: solo logo Cosmos';
const avTxt = (t, c) => String(t||'').replace(/\{PUERTO\}/g, c.puerto).replace(/\{CONTACTO\}/g, c.contacto);
function avPrevia(c){
  const ej = (c.tipo==='Llegada' ? S.imp : S.exp).find(b=>(b.lineaCod||'')===c.linea) || (c.tipo==='Llegada' ? S.imp[0] : S.exp[0]) || {};
  const s = k => c.secc[k];
  return `<div id="docAvPrev" style="border:1px solid #DDE3EC;border-radius:10px;padding:14px;background:#fff;font-size:12.5px;line-height:1.5">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="display:flex;gap:6px"><b style="border:1px solid #1F3B6E;color:#1F3B6E;padding:2px 8px;border-radius:4px">COSMOS</b>${c.linea==='ZIM'?'<b style="border:1px solid #333;padding:2px 8px;border-radius:4px">ZIM</b>':''}</span><span class="doc-mut">${esc(avModelo(c.linea))}</span></div>
    <h4 style="margin:4px 0">${c.tipo==='Llegada'?'AVISO DE LLEGADA / ARRIVAL NOTICE':'AVISO DE SALIDA / DEPARTURE NOTICE'}</h4>
    <div class="doc-mut">BL ${esc(ej.numero||'EJEMPLO0001')} · Nave ${esc(ej.nave||'')} · Viaje ${esc(ej.viaje||'')} · Puerto de operación ${esc(c.puerto)} · Sucursal ${esc(c.suc)}</div>
    <p style="margin:8px 0 2px">${esc(avTxt(c.esp, c))}</p><p style="margin:0 0 8px" class="doc-mut">${esc(avTxt(c.eng, c))}</p>
    ${s('fletes') ? (c.tipo==='Llegada' ? avFletes(ej, 'docAvPrevFletes') : `<div><b>Fletes y recargos:</b> según condición de pago del BL.</div>`) : ''}
    ${s('direcc')?`<div><b>Direccionamiento:</b> <span style="color:#1F5FBF">${esc(c.enlDir)}</span></div>`:''}
    ${s('deposito')?`<div><b>Depósito por defecto:</b> contenedor ${esc(c.depCont)}; rodante ${esc(c.depRod)}</div>`:''}
    ${s('devolucion')?`<div><b>Devolución:</b> ${esc(c.devol)}</div>`:''}
    ${s('sobrestadia')?`<div><b>Sobrestadía:</b> ${esc(c.sobre)}</div>`:''}
    ${s('cuentas')?`<div><b>Cuentas bancarias:</b> ${esc(c.cuentas)}</div>`:''}
    <div><b>Desglose:</b> <span style="color:#1F5FBF">${esc(c.enlDes)}</span> · <b>Pagos:</b> <span style="color:#1F5FBF">${esc(c.enlPag)}</span></div>
    <div style="margin-top:8px"><b>Contacto de ${c.tipo==='Llegada'?'Importación':'Exportación'} (${esc(c.suc)}):</b> ${esc(c.contacto)}</div>
    <p class="doc-mut" style="margin-top:8px">El correo y el PDF usan esta misma configuración.</p></div>`;
}
function htmlAvisos(){
  seed(); const A = avSeed(), f = A.f, ls = CC.datos.lineas.map(l=>l.codigo);
  const filas = A.cfg.filter(c=>c.tipo===A.tipo && (!f.linea||c.linea===f.linea) && (!f.puerto||c.puerto===f.puerto) && (!f.suc||c.suc===f.suc));
  const tabs = `<div class="fac-tabs">${['Llegada','Salida'].map(t=>`<button type="button" class="${A.tipo===t?'on':''}" onclick="docAvTipo('${t}')">Aviso de ${t}</button>`).join('')}</div>`;
  const filtros = `<div class="fac-card" id="docAvF"><div class="fac-head"><div><h3>Configuración de avisos ${MKP('HU-DOC-05','I-062','PEN-I062-01')}</h3><div class="fac-sub">Contenido, cláusulas, enlaces y datos por línea, puerto y sucursal</div></div><div class="fac-acts">${btn('Nueva configuración','docAvNuevo()','','id="docAvNuevo"')}</div></div>${tabs}
    <div class="fac-g3">${campo('Línea', sel(ls, f.linea, `onchange="docAvF('linea',this.value)"`, 'Todas'))}${campo('Puerto de operación', sel(AV_PUERTOS, f.puerto, `onchange="docAvF('puerto',this.value)"`, 'Todos'))}${campo('Sucursal', sel(AV_PUERTOS, f.suc, `onchange="docAvF('suc',this.value)"`, 'Todas'))}</div>
    <div class="fac-note warn">Por definir: PEN-I062-01 (logos y secciones visibles por línea), PEN-I062-02 (prioridad entre instrucciones permanentes, maestro de línea, puerto y sucursal) y PEN-I062-03 (cuentas, depósitos, contactos y enlaces finales). Los valores son de ejemplo.</div></div>`;
  const res = tabla({id:'docAvRes', titulo:`Resultados (${filas.length})`, filas, cols:[
    {t:'Línea', v:c=>`<button type="button" class="fac-link" onclick="docAvEditar('${c.id}')">${esc(lineaNombre(c.linea)||c.linea)}</button>`},{t:'Puerto de operación', v:'puerto'},{t:'Sucursal', v:'suc'},{t:'Modelo', v:c=>esc(avModelo(c.linea))},
    {t:'Contacto', v:'contacto'},{t:'Secciones visibles', v:c=>String(AV_SECC.filter(([k])=>c.secc[k]).length)+' de '+AV_SECC.length},{t:'Modificado por', v:c=>`${esc(c.user)}<div class="doc-mut">${fdt(c.ts)}</div>`}], pie:'<span></span>'});
  return filtros + res + (A.ed ? avForm(A.ed) : '');
}
function avForm(c){
  const ls = CC.datos.lineas.map(l=>l.codigo), on = k => `onchange="docAvE('${k}',this.value)"`, t = (k, ph) => `<input value="${esc(c[k])}" placeholder="${ph||''}" ${on(k)} oninput="docAvE('${k}',this.value,1)">`;
  return `<div class="fac-card" id="docAvEd"><div class="fac-head"><h3>${c.id?'Editar':'Nueva'} configuración: Aviso de ${esc(c.tipo)}</h3></div>
    <div class="fac-g2" style="align-items:start"><div>
      <div class="fac-g3">${campo('Línea *', sel(ls, c.linea, `id="docAvLinea" ${on('linea')}`, 'Elegir'))}${campo('Puerto de operación *', sel(AV_PUERTOS, c.puerto, `id="docAvPuerto" ${on('puerto')}`, 'Elegir'))}${campo('Sucursal *', sel(AV_PUERTOS, c.suc, `id="docAvSuc" ${on('suc')}`, 'Elegir'))}</div>
      ${CC.campoLectura('Modelo', c.linea ? avModelo(c.linea) : '')}
      ${campo(`Contacto de ${c.tipo==='Llegada'?'Importación':'Exportación'} *`, `<input id="docAvContacto" type="email" value="${esc(c.contacto)}" ${on('contacto')} oninput="docAvE('contacto',this.value,1)">`)}
      <div class="fac-f"><label>Secciones visibles</label><div class="doc-radios" style="flex-wrap:wrap">${AV_SECC.map(([k,l])=>`<label class="doc-chk"><input type="checkbox" ${c.secc[k]?'checked':''} onchange="docAvSec('${k}',this.checked)"> ${l}</label>`).join('')}</div></div>
      ${campo('Cláusula en español (use {PUERTO} y {CONTACTO})', `<textarea id="docAvEsp" rows="2" ${on('esp')} oninput="docAvE('esp',this.value,1)">${esc(c.esp)}</textarea>`)}
      ${campo('Cláusula en inglés', `<textarea rows="2" ${on('eng')} oninput="docAvE('eng',this.value,1)">${esc(c.eng)}</textarea>`)}
      <div class="fac-g3">${campo('Enlace de direccionamiento', t('enlDir'))}${campo('Enlace de desglose', t('enlDes'))}${campo('Enlace de pagos', t('enlPag'))}</div>
      <div class="fac-g2">${campo('Depósito por defecto (contenedor)', sel(DEPOSITOS.map(x=>x.n), c.depCont, on('depCont')))}${campo('Depósito por defecto (rodante)', sel(DEPOSITOS.map(x=>x.n), c.depRod, on('depRod')))}</div>
      ${campo('Devolución de contenedores', t('devol'))}${campo('Sobrestadía', t('sobre'))}${campo('Cuentas bancarias', t('cuentas'))}
    </div><div><div class="fac-sec" style="margin-top:0">Vista previa</div>${avPrevia(c)}</div></div>
    <div class="fac-btns">${ghost('Cancelar','docAvCancelar()')}${btn('Guardar','docAvGuardar()','','id="docAvGuardar"')}</div></div>`;
}
const avPrevRe = () => { const p = $('docAvPrev'); if(p) p.outerHTML = avPrevia(S.av.ed); };
window.docAvTipo = t => { S.av.tipo = t; S.av.ed = null; rerender('screenDocAvisos'); };
window.docAvF = (k, v) => { S.av.f[k] = v; rerender('screenDocAvisos'); };
window.docAvEditar = id => { S.av.ed = clone(S.av.cfg.find(c=>c.id===id)); rerender('screenDocAvisos'); setTimeout(()=>$('docAvEd')?.scrollIntoView({block:'start'}), 30); };
window.docAvNuevo = () => { const A = S.av, base = A.cfg.find(c=>c.tipo===A.tipo) || {};
  A.ed = Object.assign(clone(base), {id:'', tipo:A.tipo, linea:'', puerto:'', suc:'', contacto:'', user:'', ts:''}); rerender('screenDocAvisos'); setTimeout(()=>$('docAvEd')?.scrollIntoView({block:'start'}), 30); };
window.docAvE = (k, v, soloPrevia) => { const c = S.av.ed; c[k] = v; if(k==='puerto' && !c.suc) c.suc = v; if(soloPrevia) avPrevRe(); else rerender('screenDocAvisos'); };
window.docAvSec = (k, on) => { S.av.ed.secc[k] = on; avPrevRe(); };
window.docAvCancelar = () => { S.av.ed = null; rerender('screenDocAvisos'); };
window.docAvGuardar = () => { const A = S.av, c = A.ed;
  if(!c.linea || !c.puerto || !c.suc || !c.contacto){ CC.toast('Por favor complete todos los campos obligatorios','error'); return; }
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.contacto)){ CC.toast('Ingrese un correo de contacto válido.','error'); return; }
  if(A.cfg.some(x=>x.id!==c.id && x.tipo===c.tipo && x.linea===c.linea && x.puerto===c.puerto && x.suc===c.suc)){ CC.toast('Ya existe una configuración para esa línea, puerto y sucursal.','error'); return; }
  c.user = CC.usuario(); c.ts = ahora();
  if(c.id){ const i = A.cfg.findIndex(x=>x.id===c.id); A.cfg[i] = clone(c); } else { c.id = 'AV'+(++S.seq); A.cfg.push(clone(c)); }
  A.ed = null; CC.toast('Configuración de aviso guardada correctamente','success'); rerender('screenDocAvisos'); };

/* ---------- I-060 · HU-DOC-01: recargos TUR 07108 / 07100 (carga, homologación y vínculo al BL) ---------- */
const TUR_REP = ['TUR 07108 · BL Freight and Charge Report','TUR 07100'];
const TUR_CARGO = {OFT:['FLETE','Flete marítimo'], BAF:['BAF','Bunker Adjustment Factor'], ISP:['ISPS','International Ship and Port Security'], THD:['THC','Terminal Handling Charge'], DOC:['BL FEE','Emisión de BL']};
const r2 = n => Math.round((+n||0)*100)/100;
const condTxt = c => c==='Por cobrar' ? 'Collect' : 'Prepaid';
/* Prepaid: puerto de embarque y embarcador pagador. Collect: puerto de descarga y consignatario pagador. */
const turLinea = (b, cod, cond, monto, rep) => { const h = TUR_CARGO[cod];
  return {cod, cargo:h[0], descripcion:h[1], condPago:cond, moneda:'USD', monto:r2(monto), unidad:'BL', cantidad:1,
    lugar:cond==='Por cobrar' ? b.puertoDescarga : b.puertoCarga, pagador:cond==='Por cobrar' ? 'Consignatario' : 'Embarcador', rep}; };
function turSeed(){
  seed(); if(S.turOk) return; S.turOk = true;
  const ev0 = {archivo:'TUR07108_ejemplo.xlsx', rep:TUR_REP[0], ts:'2026-11-18T09:20:00', user:'J. Ramos (Documentación)'};
  const imps = S.imp.filter(b=>b.indicador==='Importación' && b.numero), zim = imps.filter(b=>b.lineaCod==='ZIM'), otra = imps.find(b=>b.lineaCod!=='ZIM');
  const dar = (b, l) => { if(!b) return; b.tur = l.map(([c,cd,m])=>turLinea(b, c, cd, m, ev0.rep)); b.turCarga = clone(ev0); };
  dar(zim[0], [['OFT','Prepagado',1850],['BAF','Por cobrar',320.5],['THD','Por cobrar',145],['ISP','Prepagado',12]]);
  dar(zim[1], [['OFT','Prepagado',1720],['BAF','Prepagado',300]]);
  dar(otra, [['OFT','Prepagado',1600],['THD','Por cobrar',150],['DOC','Por cobrar',75]]);
  /* I-022: datos de pago y bloqueo del BL No Negociable (ficticios) */
  const e = id => S.exp.find(b=>b.id===id) || {};
  e('E7').vbPagado = true; e('E4').vbPagado = true; e('E8').vbPagado = true; e('E8').sobrExpo = true;
  /* I-182: la reserva en Por revisar ya tuvo su primera edición */
  S.exp.filter(b=>b.estado==='POR REVISAR').forEach(b=>{ b.edPR = 1; });
}
window.docTurAbrir = k => { seed(); turSeed(); const q = (k==='imp'?S.fi:S.fe).f;
  if(!q.nave || !q.viaje){ CC.toast('Seleccione la nave y el viaje para cargar los recargos TUR.','error'); return; }
  K.tur = {k, nave:q.nave, viaje:q.viaje, rep:'', archivo:'', err:''}; pintarTur(); };
function pintarTur(){ const t = K.tur;
  CC.modal(`<div id="docTurDlg"><h3>Cargar recargos TUR ${MKP('HU-DOC-01','I-060','PEN-I060-01')}</h3>
    <div class="fac-g3">${CC.campoLectura('Nave', t.nave)}${CC.campoLectura('Número de Viaje', t.viaje)}${campo('Reporte *', sel(TUR_REP, t.rep, `id="docTurRep" onchange="K_tur('rep',this.value)"`, 'Elegir reporte'))}</div>
    <label class="doc-drop"><input type="file" id="docTurFile" accept=".xlsx,.xls,.csv" onchange="docTurFile(this)"><span>${t.archivo ? esc(t.archivo) : 'Arrastre o seleccione el archivo Excel del reporte'}</span></label>
    ${t.err?`<div class="fac-note err" id="docTurErr">${esc(t.err)}</div>`:''}
    <ul class="doc-ul doc-mut" style="margin-top:8px"><li>Homologa moneda (CURRENCY_DOC), puerto (PORT_DOC con UN/LOCODE) y recargo (CHARGE_TYPE). No inventa valores: lo que no homologa queda en observaciones.</li>
    <li>Cada recargo se vincula a su BL con Unidad base BL y Cantidad 1. Prepaid: puerto de embarque y paga el embarcador. Collect: puerto de descarga y paga el consignatario.</li>
    <li>Los importes del mismo recargo se suman y se redondean a dos decimales.</li></ul>
    <div class="fac-note warn">Por definir: PEN-I060-01 (formato y muestras finales, tránsitos), PEN-I060-02 (clave del recargo y recarga del mismo archivo; el prototipo reemplaza lo cargado antes con el mismo reporte para no duplicar el cobro), PEN-I060-03 (qué se bloquea con observaciones) y PEN-I060-04 (lugar de pago y pagador del 07100).</div>
    <div class="fac-btns">${ghost('Cancelar','docCbNo()')}${btn('Procesar','docTurOk()','','id="docTurOk"')}</div></div>`, 'md'); }
window.K_tur = (k, v) => { K.tur[k] = v; K.tur.err = ''; pintarTur(); };
window.docTurFile = inp => { const f = inp.files && inp.files[0]; if(!f) return; const ext = (f.name.split('.').pop()||'').toLowerCase();
  K.tur.err = ['xlsx','xls','csv'].includes(ext) ? '' : 'El tipo de archivo no está permitido. Cargue el reporte en Excel.'; K.tur.archivo = K.tur.err ? '' : f.name; pintarTur(); };
window.docTurOk = () => { const t = K.tur;
  if(!t.rep || !t.archivo){ t.err = 'Por favor complete todos los campos obligatorios'; pintarTur(); return; }
  const lista = (t.k==='imp' ? S.imp : S.exp).filter(b=>b.nave===t.nave && b.viaje===t.viaje && b.numero && b.estado!=='Anulado').slice(0,4);
  const ev1 = {archivo:t.archivo, rep:t.rep, ts:ahora(), user:CC.usuario()}, ok = [], obs = []; let fila = 1;
  lista.forEach((b,i)=>{ const crudo = [['OFT', i%2?'Prepagado':'Por cobrar', 1500+i*50], ['BAF', i%2?'Prepagado':'Por cobrar', 200.255], ['ISP','Prepagado',12]];
    if(i===0) crudo.push(['BAF','Por cobrar',30.1]);
    const sum = {}; crudo.forEach(([c,cd,m])=>{ fila++; const k = c+'|'+cd; if(sum[k]) sum[k].monto = r2(sum[k].monto + m); else sum[k] = turLinea(b, c, cd, m, t.rep); });
    b.tur = (b.tur||[]).filter(x=>x.rep!==t.rep).concat(Object.values(sum)); b.turCarga = clone(ev1);
    Object.values(sum).forEach(x=>ok.push({bl:b.numero, ...x})); });
  const b0 = (lista[0]||{}).numero || '';
  obs.push({fila:++fila, bl:b0, campo:'Moneda', valor:'USDX', motivo:'Moneda sin homologación en CURRENCY_DOC'});
  obs.push({fila:++fila, bl:b0, campo:'Recargo', valor:'XFE', motivo:'Recargo sin homologación en CHARGE_TYPE'});
  obs.push({fila:++fila, bl:'ZIMUNOEXISTE01', campo:'Número BL', valor:'ZIMUNOEXISTE01', motivo:'BL no registrado en el viaje'});
  CC.modal(`<div id="docTurRes"><h3>Resultado de la carga ${MKP('HU-DOC-01','I-060')}</h3>
    <dl class="fac-kv"><dt>Archivo</dt><dd>${esc(ev1.archivo)} (${esc(ev1.rep)})</dd><dt>Fecha y hora</dt><dd>${fdt(ev1.ts)}</dd><dt>Usuario</dt><dd>${esc(ev1.user)}</dd></dl>
    <div class="fac-sec">Recargos vinculados: ${ok.length} en ${lista.length} BL</div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Número BL</th><th>Código en archivo</th><th>Recargo homologado</th><th>Condición</th><th>Moneda</th><th>Monto</th><th>Unidad Base</th><th>Cantidad</th><th>Lugar de Pago</th><th>Pagador</th></tr></thead><tbody>
    ${ok.map(x=>`<tr><td>${esc(x.bl)}</td><td>${esc(x.cod)}</td><td>${esc(x.cargo)}</td><td>${condTxt(x.condPago)}</td><td>${esc(x.moneda)}</td><td class="doc-num">${x.monto.toFixed(2)}</td><td>BL</td><td>1</td><td>${esc(x.lugar)}</td><td>${esc(x.pagador)}</td></tr>`).join('') || '<tr><td colspan="10" class="fac-empty">El viaje no tiene BL válidos</td></tr>'}</tbody></table></div>
    <div class="fac-sec">Observaciones: ${obs.length} filas no cargadas</div>
    <table class="fac-tbl" id="docTurObs"><thead><tr><th>Fila</th><th>Número BL</th><th>Campo</th><th>Valor</th><th>Motivo</th></tr></thead><tbody>${obs.map(o=>`<tr><td>${o.fila}</td><td>${esc(o.bl)}</td><td>${o.campo}</td><td>${esc(o.valor)}</td><td>${o.motivo}</td></tr>`).join('')}</tbody></table>
    <p class="doc-mut">Los BL válidos se procesaron. Las observaciones se regularizan en los catálogos y se vuelve a cargar el archivo.</p>
    <div class="fac-btns">${btn('Aceptar','docCbSi()')}</div></div>`, 'lg'); };
/* Tarjetas de la pestaña Recargo - Cláusula */
function recPropHtml(k, d){ turSeed(); const b = buscarBL(d.id) || d, l = b.tur || [], c = b.turCarga;
  const tur = `<div class="fac-card" ${CC.propuesta('I-060','Recargos TUR')} id="docRecTur"><h3>Recargos cargados desde TUR ${MKP('HU-DOC-01','I-060','PEN-I060-02')}</h3>
    ${l.length ? `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Recargo - Cláusula</th><th>Descripción</th><th>Condición de Pago</th><th>Moneda</th><th>Monto</th><th>Unidad Base</th><th>Cantidad</th><th>Lugar de Pago</th><th>Pagador</th></tr></thead><tbody>
      ${l.map(x=>`<tr><td>${esc(x.cargo)}</td><td>${esc(x.descripcion)}</td><td>${condTxt(x.condPago)}</td><td>${esc(x.moneda)}</td><td class="doc-num">${x.monto.toFixed(2)}</td><td>BL</td><td>1</td><td>${esc(x.lugar)}</td><td>${esc(x.pagador)}</td></tr>`).join('')}</tbody></table></div>
      <p class="doc-mut">Carga: ${esc(c.archivo)} (${esc(c.rep)}) · ${fdt(c.ts)} · ${esc(c.user)}</p>`
    : `<p class="doc-mut">Este BL aún no tiene recargos del reporte TUR. Se cargan desde Documentos con «Cargar recargos TUR».</p>`}</div>`;
  return tur + (k==='imp' ? `<div class="fac-card" ${CC.propuesta('I-019','Recargos en el Aviso de Llegada')} id="docRecAviso"><h3>Así se verán en el Aviso de Llegada ${MKP('HU-DOC-05','I-019','PEN-I019-01')}</h3>${reglaAviso()}
    ${avFletes(b, 'docRecAvisoTbl') || '<p class="doc-mut" id="docRecAvisoTbl">Con esta regla el aviso no muestra el recuadro de fletes y recargos (ni título ni filas).</p>'}</div>` : ''); }

/* ---------- I-019 · HU-DOC-05: recargos del Aviso de Llegada según Carrier Code ---------- */
const AV_REGLAS = [['linea','Por línea: ZIM solo Collect; otras líneas Collect y Prepaid'],['regimen','Por régimen (área, 09/10): Importación solo Collect']];
const reglaAv = () => (S.avRegla = S.avRegla || 'linea');
const visibleAv = (b, r) => reglaAv()==='regimen' ? r.condPago==='Por cobrar' : (b.lineaCod==='ZIM' ? r.condPago==='Por cobrar' : true);
function reglaAviso(){ return `<div class="fac-g2">${campo('Regla aplicada', sel(AV_REGLAS, reglaAv(), `id="docAvRegla" onchange="docAvRegla(this.value)"`))}</div>
  <p class="doc-mut">Por definir PEN-I019-01: una sola tabla línea × régimen × condición de pago, y si el usuario puede cambiar la selección. El visor, el PDF descargado y el correo usan este mismo detalle.</p>`; }
window.docAvRegla = v => { S.avRegla = v; refrescarActiva(); };
function avFletes(b, id){ turSeed(); b = b || {};
  const l = (b.recargos||[]).concat(b.tur||[]).filter(r=>visibleAv(b, r)); if(!l.length) return '';
  const monto = r => r.unidad==='BL' ? (+r.monto||0) : ((+r.tarifa||0)*(+r.cantidad||0) || +r.monto || 0);
  const tot = {}; l.forEach(r=>{ tot[r.moneda] = r2((tot[r.moneda]||0) + monto(r)); });
  return `<div id="${id||''}"><b>Fletes y recargos</b> <span class="doc-mut">(BL ${esc(b.numero||'')} · Carrier Code ${esc(b.lineaCod||'')})</span>
    <table class="fac-tbl"><thead><tr><th>Concepto</th><th>Condición</th><th>Moneda</th><th>Monto</th></tr></thead><tbody>
    ${l.map(r=>`<tr><td>${esc(r.cargo)}${r.descripcion?` <span class="doc-mut">${esc(r.descripcion)}</span>`:''}</td><td>${condTxt(r.condPago)}</td><td>${esc(r.moneda)}</td><td class="doc-num">${monto(r).toFixed(2)}</td></tr>`).join('')}
    ${Object.entries(tot).map(([m,v])=>`<tr><td colspan="2"><b>Total</b></td><td>${esc(m)}</td><td class="doc-num"><b>${v.toFixed(2)}</b></td></tr>`).join('')}</tbody></table></div>`; }

/* ---------- I-022 · HU-DOC-21: estado y emisión del BL No Negociable ---------- */
function nnCond(b){ const tx = (b.bl||[]).some(t=>t.c==='0154' && t.st==='COMPLETED');
  return [['Tipo de emisión Original', b.tipoEmision==='Original', 'El BL No Negociable solo se emite para un BL Original.'],
    ['BL no anulado', b.estado!=='Anulado', 'El BL No Negociable no se emite para un BL anulado.'],
    ['Transmitido a SUNAT o en «Listo para facturar»', tx || b.pago==='Listo para facturar', 'El BL aún no está transmitido a SUNAT ni en «Listo para facturar».'],
    ['VB de exportación pagado', !!b.vbPagado, 'Pendiente pago de documentación.'],
    ['Sin sobrestadía de exportación pendiente', !b.sobrExpo, 'El cliente tiene sobrestadía de exportación pendiente.'],
    ['Cliente no suspendido', !b.suspendido, 'El cliente está suspendido.']]; }
function nnHtml(d){ turSeed(); const b = buscarBL(d.id) || d, c = nnCond(b), falta = c.filter(x=>!x[1]), draft = ['APROBADO','TRANSMITIDO A SUNAT','POR RECTIFICAR'].includes(b.estado);
  const rect = b.estado==='POR RECTIFICAR' && b.vbPagado, tono = TONO_AP[falta.length?'Rechazado':'Aprobado'];
  return `<div class="fac-card" ${CC.propuesta('I-022','BL No Negociable')} id="docEdNN"><div class="fac-head"><div><h3>BL No Negociable ${MKP('HU-DOC-21','I-022','PEN-I022-04')}</h3>
    <div class="fac-sub">Draft: ${draft?'disponible (BL aprobado, última versión del corrector)':'se habilita al aprobar el BL'} · NN: ${falta.length?'bloqueado':'habilitado'}</div></div>
    <div class="fac-acts"><span class="cc-chip" style="background:${tono[0]};color:${tono[1]}">${falta.length?'NN bloqueado':'NN habilitado'}</span>${btn('Descargar BL No Negociable',`docNnVer('${b.id}')`,'',`id="docNnDesc" ${falta.length?'disabled':''}`)}</div></div>
    <table class="fac-tbl" id="docNnCond"><thead><tr><th>Condición para emitir el NN</th><th>Estado</th></tr></thead><tbody>${c.map(([t,ok])=>`<tr><td>${t}</td><td>${ok?'Cumple':'<b>Falta</b>'}</td></tr>`).join('')}</tbody></table>
    ${falta.length?`<div class="fac-note warn" id="docNnMotivo"><b>Motivo:</b> ${falta.map(x=>esc(x[2])).join(' ')}</div>`:''}
    ${rect?`<div class="fac-note" id="docNnRect">El BL se corrigió después de la transmisión a SUNAT y del pago del VB: se registra el concepto Rectificación de manifiesto y, al pagarlo, el NN se genera con la última versión. Qué descarga el cliente mientras tanto: por definir (PEN-I022-04).</div>`:''}
    <p class="doc-mut">Por definir PEN-I022-04: si habilita la transmisión enviada o la aceptada por SUNAT (el prototipo usa la aceptada). El mismo estado se ve en el portal externo, opción Matriz.</p></div>`; }
window.docNnVer = id => { const b = buscarBL(id); if(nnCond(b).some(x=>!x[1])) return;
  const fe = (b.equipos.find(e=>e.fEmbarque)||{}).fEmbarque || b.atd || b.emision;
  CC.modal(`<div id="docNnPrev"><h3>Vista previa del BL No Negociable ${MKP('HU-DOC-21','I-022')}</h3>
    <div style="border:1px solid #DDE3EC;border-radius:10px;padding:14px;background:#fff;font-size:12.5px">
    <div style="text-align:center;font-weight:800;letter-spacing:3px;color:#B3261E;border:2px solid #B3261E;padding:4px;margin-bottom:10px">NOT NEGOTIABLE</div>
    <dl class="fac-kv"><dt>Número BL</dt><dd>${esc(b.numero)} · versión V${esc(b.version||1)}</dd><dt>Embarcador</dt><dd>${esc(b.embarcador)}</dd><dt>Consignatario</dt><dd>${esc(b.consignatario)}</dd>
    <dt>Nave / Viaje</dt><dd>${esc(b.nave)} / ${esc(b.viaje)}</dd><dt>Puertos</dt><dd>${esc(b.puertoCarga)} a ${esc(b.puertoDescarga)}</dd><dt>Contenedores</dt><dd>${esc(b.equipos.filter(e=>!e.roleado).map(e=>e.numero).join(', '))}</dd>
    <dt>Fecha de emisión</dt><dd>${fd(String(fe||'').slice(0,10))} (fecha de embarque)</dd><dt>Fletes</dt><dd><b>AS PER AGREEMENT</b></dd></dl>
    <div style="margin-top:16px;border-top:1px solid #333;width:220px;padding-top:4px" class="doc-mut">Firma del representante legal</div></div>
    <p class="doc-mut">Solo cambia la marca respecto al Draft (sin «DRAFT», con «NOT NEGOTIABLE»). Todos los Draft y NN ocultan los fletes con «As per Agreement» (fase 1). La firma y el texto final se atienden en I-195.</p>
    <div class="fac-btns">${ghost('Cerrar','docCbNo()')}${btn('Descargar PDF',`docNnPdf('${b.id}')`,'','id="docNnPdf"')}</div></div>`, 'md'); };
window.docNnPdf = id => { const b = buscarBL(id); CC.cerrarModal(); CC.toast(`BL No Negociable ${b.numero} descargado en PDF`,'success'); };

/* ---------- I-182 · HU-DOC-39: guardado parcial de la Reserva en Por revisar ---------- */
function registrarParcial(b){ turSeed(); b.edPR = (b.edPR||1) + 1;
  b.parcial = b.estado==='POR REVISAR' ? {n:b.edPR, ts:ahora(), user:CC.usuario(), pend:pendExp(b).length} : null; }
function parcialHtml(d){ turSeed(); const b = buscarBL(d.id) || d, p = b.parcial;
  return `<div class="fac-card" ${CC.propuesta('I-182','Guardado parcial')} id="docEdParcial"><h3>Guardado parcial en Por revisar ${MKP('HU-DOC-39','I-182','PEN-RES-02')}</h3>
    <p>En cualquier edición puede guardar solo lo que cambió (por ejemplo, el cliente o el embarcador). Los campos pendientes no bloquean el guardado: se exigen al aprobar o transmitir.</p>
    ${p?`<div class="fac-note" id="docParcialUlt">Edición ${p.n} guardada el ${fdt(p.ts)} por ${esc(p.user)}. La reserva sigue en Por revisar: faltan ${p.pend} ${p.pend===1?'dato':'datos'} para aprobar.</div>`:`<p class="doc-mut">Ediciones guardadas en Por revisar: ${esc(b.edPR||1)}.</p>`}
    <p class="doc-mut">Por definir PEN-RES-02: matriz de campos exigidos al guardar, aprobar y transmitir.</p></div>`; }

/* =====================================================================
   PROPUESTAS lote 39 (tickets de Documentación en Reportado). Marca "HU-xxx · I-xxx"; se ocultan con "Ver propuestas" apagado.
   I-020 I-030 transmisión · I-070 I-112 rectificación · I-076 partida · I-038 I-057 CDL · I-073 listado de descarga
   I-079 I-088 I-093 carga Liner · I-090 PDF Tramp · I-102 aviso de salida · I-103 reporte de envíos · I-113 CAL/VGM
   I-121 COARRI · I-174 consulta TMG · I-192 cabotaje (por definir)
===================================================================== */
const PR = (hu, t, texto, cls) => CC.propuesta(`${hu} · ${t}`, texto, cls);
const chipT = (t, k) => { const c = TONO_AP[k==='ok'?'Aprobado':k==='mal'?'Rechazado':'Pendiente de aprobación']; return `<span class="cc-chip" style="background:${c[0]};color:${c[1]}">${esc(t)}</span>`; };
const kv = l => `<dl class="fac-kv">${l.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
const tbl = (cab, filas, vacio) => `<div class="fac-scroll"><table class="fac-tbl"><thead><tr>${cab.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.length ? filas.map(f=>`<tr>${f.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cab.length}" class="fac-empty">${vacio||'Sin registros'}</td></tr>`}</tbody></table></div>`;

/* ---------- I-020 · HU-DOC-06 y I-030 · HU-DOC-07: qué se envía en la transmisión del manifiesto ---------- */
const MANIF = ['0103','0102','0154','0153'];
function condCarga(b){ const eq = (b.equipos||[]).filter(e=>!e.roleado), v = eq.filter(e=>e.cond==='EMPTY').length;
  if(eq.length && v===eq.length) return '<b>10</b> · Carga vacía (todos los contenedores vacíos)';
  if(v) return 'BL con contenedores llenos y vacíos: por definir (PEN-I020-02)';
  return '<b>4</b> · Valor por defecto'; }
function txDatosHtml(b, e){
  if(!e.sunat || !MANIF.includes(e.sunat.code)) return '';
  const info = [...new Set((b.carga||[]).map(x=>x.descripcion).filter(Boolean))], desc = (b.descripciones||[]).map(x=>x.descripcion).filter(Boolean);
  return `<div ${PR('HU-DOC-06','I-020','Condición de carga enviada', 'fac-note')} data-p20><b>Condición de carga enviada</b> ${MKP('HU-DOC-06','I-020','PEN-I020-01')}<br>GoodsStatusCode (catálogo 239): ${condCarga(b)}. SUNAT debe mostrar la misma condición al consultar el BL.</div>
    <div ${PR('HU-DOC-07','I-030','Descripción enviada a SDA', 'fac-note')} data-p30><b>Descripción enviada a SDA</b> ${MKP('HU-DOC-07','I-030','PEN-I030-02')}<br>Versión vigente V${esc(b.version||1)}, en una sola transacción. Información de Carga: ${esc(info.join(' / ')||'Sin datos')}. Descripciones: ${esc(desc.join(' / ')||'Sin datos')}.<br><span class="doc-mut">Cómo se combinan ambas según el tipo de carga: por definir (PEN-I030-02).</span></div>`;
}

/* ---------- I-070 · HU-DOC-22: valores previos al editar un BL transmitido ---------- */
const txManif = b => [...(b.sunat||[]), ...(b.bl||[])].some(t=>['0103','0154'].includes(t.c) && t.st==='COMPLETED');
function desc70Html(d){ const b = buscarBL(d.id) || d; if(!txManif(b)) return '';
  return `<div ${PR('HU-DOC-22','I-070','Valores previos al editar', 'fac-note')} id="docDesc70"><b>BL transmitido: se conservan los valores previos</b> ${MKP('HU-DOC-22','I-070','PEN-I070-01')}<br>Al pulsar Editar se muestran las ${(b.descripciones||[]).length} descripción(es) y los demás campos ya guardados. Al guardar y pasar a Por rectificar solo cambia lo editado; Cancelar no borra valores.</div>`; }

/* ---------- I-112 · HU-DOC-22: resultado de la rectificación en la grilla ---------- */
function rect112(b){ if(!PV()) return ''; const l = lastBl(b); let t = '';
  if(l && l.c==='0153') t = l.st==='PENDING' ? 'Rectificación 0153: pendiente de respuesta' : l.st==='ERROR' ? 'Rectificación 0153: con error' : 'Rectificación 0153: aceptada';
  else if(b.estado==='POR RECTIFICAR') t = 'Rectificación 0153: por enviar';
  return t ? `<small ${PR('HU-DOC-22','I-112','Rectificación en la grilla')} data-r112 style="display:block;font-size:12px;white-space:nowrap;margin-top:4px">${t}</small>` : ''; }

/* ---------- I-076 · HU-DOC-16: partida no vigente con mensaje claro ---------- */
const PARTIDA_MSG = 'La informacion registrada no corresponde a una partida vigente';
const partidaInvalida = p => { const x = String(p||'').replace(/\D/g,''); return !!x && !PARTIDAS.some(c=>c[0]===x); };
const partidaMsg = p => PV() && partidaInvalida(p) ? `<small ${PR('HU-DOC-16','I-076','Partida no vigente','doc-err')} data-p76 style="display:block;font-size:12px;white-space:normal;max-width:220px;margin-top:4px">${PARTIDA_MSG}</small>` : '';
function bloqueoPartida(b){ const l = b.equipos.filter(e=>!e.roleado && partidaInvalida(e.partida)); if(!l.length) return false;
  CC.modal(`<div ${PR('HU-DOC-16','I-076','Bloqueo por partida no vigente')} id="docP76"><h3>No se puede transmitir el BL ${MKP('HU-DOC-16','I-076','PEN-I076-01')}</h3>
    <ul class="doc-ul err">${l.map(e=>`<li>Equipo ${esc(e.numero)}, partida ${esc(e.partida)}: ${PARTIDA_MSG}</li>`).join('')}</ul>
    <p class="doc-mut">No se envía nada a SUNAT y el BL conserva sus datos y su estado. Corrija la partida en Información de Equipos.</p></div><div class="fac-btns">${btn('Entendido','CC.cerrarModal()')}</div>`, 'md');
  return true; }

/* ---------- I-038 y I-057 · HU-DOC-08: formato y Observaciones del CDL ---------- */
const TERM_COD = {'DP World':'DPW', 'Euroandino':'TPE'};
function obsCdl(b, e, term){
  if(e.cond==='EMPTY') return '';
  if(b.indicador==='Transbordo') return `transbordo vía ${TERM_COD[term]||term}`;
  if(b.lineaCod!=='ZIM') return '';
  if(b.tipoDespacho==='Diferido' || /extraportuario/i.test(b.tipoDespacho||'')) return 'OIMF';
  if(/SADA/i.test(b.tipoDespacho||'')) return 'OICF';
  return null; }
function cdlFila(x, term){ const c = (x.b.carga||[]).find(k=>k.equipo===x.e.numero) || {}, o = obsCdl(x.b, x.e, term);
  return {bl:x.b.numero||'Pendiente', cont:x.e.numero, reg:x.b.indicador, rec:[x.b.ruc, x.b.codAduana].filter(Boolean).join(' · '), bultos:c.cantidad??'', com:c.descripcion||'', peso:c.peso??'', obs:o}; }
function cdlPrev(c){
  const f = c.eqs.map(x=>cdlFila(x, c.term)), paita = c.term==='Euroandino', vis = f.slice(0, 8);
  return `<div ${PR('HU-DOC-08','I-038','Formato y mapeo del CDL')} id="docCdl38" style="margin-top:12px"><div class="fac-sec">Vista previa del CDL ${MKP('HU-DOC-08','I-038','PEN-I038-03')}</div>
    <p class="doc-mut" style="white-space:normal">${paita ? 'Formato Paita: se retiran RUC_IMPORTADOR, RUC_REMITENTE, RUC_ALMACEN_DESTINO, RUC_DESTINATARIO, DIR_LLEGADA y UBIGEO.' : `Formato ${esc(c.term)}: plantilla por puerto, terminal y tipo de carga (CDL o UDL) por confirmar en PEN-I038-03.`} Régimen sale del Indicador, Receptor de carga de la Entidad receptora (RUC y código, sin razón social), Bultos de la Cantidad de bultos y Commodities de la descripción por contenedor. Peso manifestado en kg, igual que en SDA (campo fuente: PEN-I038-01).</p>
    ${tbl(['Contenedor','Número BL','Observaciones','Régimen','Receptor de carga','Bultos manifestados','Commodities','Peso manifestado (kg)'].map(t=>`<span style="white-space:normal;display:inline-block">${t}</span>`),
      vis.map(r=>[esc(r.cont), esc(r.bl), r.obs===null ? '<span class="doc-mut">Por confirmar</span>' : r.obs ? `<b>${esc(r.obs)}</b>` : '<span class="doc-mut">En blanco</span>', esc(r.reg), esc(r.rec||'Sin datos'), esc(r.bultos), esc(r.com), esc(n0(r.peso))]))}
    ${f.length>vis.length?`<p class="doc-mut">Y ${f.length-vis.length} contenedor(es) más en el archivo.</p>`:''}
    <div ${PR('HU-DOC-08','I-057','Observaciones automáticas', 'fac-note')} data-p57 style="margin-top:8px"><b>Observaciones automáticas</b> ${MKP('HU-DOC-08','I-057','PEN-I057-02')}<br>Solo ZIM, OICF para SADA a almacén del cliente y OIMF para Diferido o SADA extraportuario; en todas las líneas, Transbordo genera «transbordo vía» y la terminal del viaje (${esc(TERM_COD[c.term]||c.term)}); vacíos y otras líneas sin transbordo quedan en blanco. Equivalencia de «SADA Descarga Directa» y precedencia: PEN-I057-01 y PEN-I057-02.</div></div>`;
}

/* ---------- I-073 · HU-DOC-38: conciliación del listado de descarga ---------- */
const LDD_F = ['Todos','Descargado','Descargado con precinto distinto','Faltante','Excedente'];
function ldd73Filas(u){
  const bls = S.imp.filter(b=>b.nave===u.nave && b.viaje===u.viaje), filas = [];
  bls.forEach(b=>b.equipos.forEach(e=>{ const k = filas.length, st = k===0 ? 'Faltante' : k===1 ? 'Descargado con precinto distinto' : 'Descargado';
    filas.push({cont:e.numero, bl:b.numero||'Pendiente', st, ps:e.sellos[0]?e.sellos[0].numero:'Sin sello', pt:st==='Faltante'?'':k===1?'ZS900001':(e.sellos[0]?e.sellos[0].numero:''), f:st==='Faltante'?'':`2026-11-20T0${(k%8)+1}:15:00`}); }));
  filas.push({cont:'ZIMU9988771', bl:'Sin BL en el sistema', st:'Excedente', ps:'', pt:'ZS900777', f:'2026-11-20T09:40:00'});
  const estBl = n => { const l = filas.filter(r=>r.bl===n), d = l.filter(r=>/^Descargado/.test(r.st)).length; return !l.length || n==='Sin BL en el sistema' ? 'No registrado' : d===l.length ? 'Descargado' : d ? 'Descarga parcial' : 'No descargado'; };
  return filas.map(r=>({...r, eb:estBl(r.bl)}));
}
function ldd73Html(){ const f = K.lddF || 'Todos', l = (K.ldd73||[]).filter(r=>f==='Todos' || r.st===f);
  return `<div ${PR('HU-DOC-38','I-073','Conciliación por contenedor')} id="docLdd73" style="margin-top:12px"><div class="fac-sec">Conciliación por contenedor ${MKP('HU-DOC-38','I-073','PEN-I073-02')}</div>
    <div class="fac-g3">${campo('Resultado', sel(LDD_F, f, 'id="docLddF" onchange="docLddF(this.value)"'))}</div>
    ${tbl(['Contenedor','Número BL','Resultado','Precinto en el sistema','Precinto del terminal','Fecha y hora de descarga','Estado del BL'], l.map(r=>[esc(r.cont), esc(r.bl), chipT(r.st, r.st==='Descargado'?'ok':r.st==='Faltante'?'mal':'pend'), esc(r.ps||'Sin datos'), esc(r.pt||'Sin datos'), r.f?fdt(r.f):'<span class="doc-mut">Sin descarga</span>', esc(r.eb)]), 'No hay contenedores con ese resultado')}
    <p class="doc-mut" style="white-space:normal">Exportar lleva estas filas y columnas. Si el archivo no es válido, el mensaje indica la fila y el campo rechazado (formato del puerto: PEN-I073-01). Aviso al cliente: PEN-I073-03.</p></div>`; }
function pintarLdd(){
  dlg('Listado de Descarga - Mensajes', `<p>Existen discrepancias entre la información del sistema y el listado de descarga del terminal</p>${K.ldd.map(([t,l])=>`<div class="fac-sec">${t}</div>${l.length?`<ul class="doc-ul">${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="doc-mut">Ninguno</p>'}`).join('')}${PV()?ldd73Html():''}`,
    [['Exportar','docLddExp()','ghost'],['Cerrar','docCbSi()']], PV() ? 'lg' : 'md'); }
window.docLddF = v => { K.lddF = v; pintarLdd(); };

/* ---------- I-079, I-088 e I-093 · HU-DOC-26 y HU-DOC-28: carga Liner ---------- */
function linerHtml(u, nuevos){
  const eqs = nuevos.flatMap(b=>b.equipos.map(e=>({b, e})));
  K.cruce = [...eqs.map(x=>['Coincidente', x.e.numero, x.b.numero, 'En BAPLIE y Manifest Report']), ['Solo en BAPLIE', 'ZIMU7711002', nuevos[0].numero, 'Retirado del Manifest Report: no se agrega al BL'], ['Solo en Manifest Report', 'ZIMU7711010', nuevos[nuevos.length-1].numero, 'Sin posición en el BAPLIE: no se agrega al BL']];
  const fuentes = [['Consignatario, notificante, bultos y pesos','Manifest Report Romania (MRR) y Manifest Report 07097 (MR)','Prioritaria'],['Puerto de descarga (POD) y destino final (FPD)','Manifest Report 07097 (MR)','Prioritaria'],['Posición de estiba','BAPLIE','Se integra'],['Datos faltantes del BL','SBL','Solo completa vacíos'],['Contenedor del embarcador','SOC','Solo completa vacíos']];
  return `<div ${PR('HU-DOC-26','I-079','Cruce BAPLIE y Manifest Report')} id="docLin79" style="margin-top:12px"><div class="fac-sec">Cruce BAPLIE y Manifest Report ${MKP('HU-DOC-26','I-079','PEN-I079-01')}</div>
      <p class="doc-err">Existen discrepancias: ${K.cruce.filter(r=>r[0]!=='Coincidente').length} contenedor(es) excluido(s).</p>
      ${tbl(['Resultado','Contenedor','Número BL','Motivo'], K.cruce.map(r=>[chipT(r[0], r[0]==='Coincidente'?'ok':'mal'), esc(r[1]), esc(r[2]), esc(r[3])]))}
      <div class="fac-btns" style="justify-content:flex-start">${ghost('Exportar discrepancias','docCruceExp()','id="docCruceExp"')}</div></div>
    <div ${PR('HU-DOC-28','I-088','Consolidación de fuentes Liner')} id="docLin88" style="margin-top:12px"><div class="fac-sec">Fuentes usadas por campo ${MKP('HU-DOC-28','I-088','PEN-I088-01')}</div>
      ${tbl(['Campo','Fuente','Regla'], fuentes.map(r=>r.map(esc)))}
      <p class="doc-mut" style="white-space:normal">Si vuelve a cargar una actualización, se actualiza el mismo BL, sin duplicarlo, y se muestra este reporte de observaciones.</p></div>
    <div ${PR('HU-DOC-28','I-093','Puertos e indicador')} id="docLin93" style="margin-top:12px"><div class="fac-sec">Puertos e indicador ${MKP('HU-DOC-28','I-093','PEN-I093-01')}</div>
      ${tbl(['Número BL','POD (07097)','FPD (07097)','Indicador'], nuevos.map(b=>[esc(b.numero), esc(b.puertoDescarga), esc(b.puertoFinal), b.puertoDescarga===b.puertoFinal ? esc(b.indicador) : '<span class="doc-mut">Según matriz POD y FPD (PEN-I093-01)</span>']))}
      <p class="doc-mut" style="white-space:normal">POD y FPD se toman del Manifest Report 07097 y se completan con la descarga del BAPLIE. Si el POD es nacional y el FPD es distinto, el indicador sigue la matriz por aprobar.</p></div>`;
}
window.docCruceExp = () => CC.exportarExcel(`Cruce_BAPLIE_Manifest_${sello()}`, 'Discrepancias', ['Resultado','Contenedor','Número BL','Motivo'], (K.cruce||[]).filter(r=>r[0]!=='Coincidente'));

/* ---------- I-090 · HU-DOC-29: lectura del PDF de BL Tramp ---------- */
const trampHtml = (u, b) => `<div ${PR('HU-DOC-29','I-090','Lectura del PDF Tramp')} id="docTr90" style="margin-top:12px"><div class="fac-sec">Datos leídos del PDF ${MKP('HU-DOC-29','I-090','PEN-I090-02')}</div>
  ${tbl(['Dato','Valor del PDF','Resultado'], [['Nave', esc(u.nave), 'Encontrada en Connect'], ['Número de Viaje', esc(u.viaje), 'Encontrado en Connect'], ['Número BL', esc(b.numero), 'BL único asociado a la nave y viaje'], ['Estado inicial', esc(b.estado), '<span class="doc-mut">Creado o Por revisar: PEN-I090-02</span>']])}
  <p class="doc-mut" style="white-space:normal">Si la nave, el viaje u otro dato obligatorio no se reconoce, el mensaje indica cuál y no se crea el BL. Formatos admitidos: PEN-I090-01.</p></div>`;

/* ---------- I-102 · HU-DOC-05: contenido del Aviso de salida ---------- */
const enviarZarpe = l => { l.forEach(b=>b.hist.push(ev('Aviso de Zarpe enviado por correo', CC.usuario())));
  CC.toast(l.length>1?'Emails de Aviso de Zarpe fueron enviados exitosamente':'Email de Aviso de Zarpe fue enviado exitosamente','success'); };
function zarpeHtml(l){
  return `<div ${PR('HU-DOC-05','I-102','Contenido del Aviso de salida')} id="docZar102"><p>${MKP('HU-DOC-05','I-102','PEN-I102-01')} Revise el contenido antes de enviar. El PDF y el correo llevan los mismos datos.</p>
    ${l.map(b=>{ const eq = b.equipos.filter(e=>!e.roleado).map(e=>e.numero);
      return `<div class="doc-ver"><div class="doc-ver-h"><b>Asunto:</b> <span>Aviso de salida · Reserva ${esc(b.refReserva||b.numero)} · BL ${esc(b.numero)}</span></div>
      ${kv([['Nave', esc(b.nave)], ['Viaje', esc(b.viaje)], ['BL', esc(b.numero)], ['Fecha de zarpe', fdt(b.atd)], ['Destino', `${esc(b.puertoFinal)}${PAIS[b.puertoFinal]?' ('+esc(PAIS[b.puertoFinal])+')':''}`], ['Contenedor', eq.length ? esc(eq.join(', ')) : '<span class="doc-mut">Carga sin contenedor: PEN-I102-01</span>'], ['Destinatario', 'Contactos del booking (embarcador), sin un segundo registro']])}</div>`; }).join('')}
    <p class="doc-mut" style="white-space:normal">Logo y cuentas bancarias: los del maestro de la línea y la sucursal (Configurar avisos, I-062).</p></div>`;
}
window.docZarpeOk = () => { CC.cerrarModal(); enviarZarpe(K.zar || []); };

/* ---------- I-103 · HU-DOC-10: reporte de BL transmitidos (una fila por envío) ---------- */
const REP_TX = ['Número BL','Booking','Fecha de envío','Número de envío','Código SUNAT','Estado SUNAT','Fecha de respuesta'];
function repTxFilas(){ const q = S.fe.q;
  return S.exp.filter(b=>(!q.nave||b.nave===q.nave) && (!q.viaje||b.viaje===q.viaje)).flatMap(b=>(b.bl||[]).map(t=>{ t.nEnv = t.nEnv || String(880000 + (++S.seq));
    return [b.numero, b.refReserva||'', fdt(t.env||t.ts), t.nEnv, `${t.c} ${COD[t.c]||''}`.trim(), t.st==='PENDING' ? 'Pendiente de respuesta' : ST_SUNAT[t.st], t.st==='PENDING' ? '' : fdt(t.ts)]; })); }
window.docRepTx = () => { const f = repTxFilas(), q = S.fe.q;
  CC.modal(`<div ${PR('HU-DOC-10','I-103','Reporte de BL transmitidos')} id="docRepTx"><h3>Reporte de BL transmitidos ${MKP('HU-DOC-10','I-103','PEN-I103-01')}</h3>
    <p class="doc-mut">Una fila por envío a SUNAT, cada una con su número de envío. ${q.nave&&q.viaje?`Nave ${esc(q.nave)}, viaje ${esc(q.viaje)}.`:'Todas las naves de la búsqueda.'}</p>
    ${tbl(REP_TX, f.map(r=>r.map(x=>esc(x)||'<span class="doc-mut">Sin respuesta</span>')), 'No hay BL transmitidos')}</div>
    <div class="fac-btns">${ghost('Exportar','docRepTxExp()')}${btn('Cerrar','CC.cerrarModal()')}</div>`, 'lg'); };
window.docRepTxExp = () => CC.exportarExcel(`Reporte_BL_transmitidos_${sello()}`, 'Envíos', REP_TX, repTxFilas());

/* ---------- I-113 · HU-DOC-37: destinatarios del CAL/VGM por terminal y sucursal ---------- */
const CAL_CT = {'DP World':['cal.vgm@terminal-callao.example','documentacion@terminal-callao.example'], 'Euroandino':[]};
const calDest = c => CAL_CT[c.term] || [];
const cal113Html = c => { const d = calDest(c);
  return `<div ${PR('HU-DOC-37','I-113','Destinatarios del CAL/VGM', d.length?'fac-note':'fac-note warn')} id="docCal113"><b>Destinatarios</b> ${MKP('HU-DOC-37','I-113','PEN-I113-01')}<br>Terminal ${esc(c.term)}, sucursal ${SUCURSAL}. Tipo de contacto: por definir (PEN-I113-01).<br>
    ${d.length ? esc(d.join(', ')) : 'La terminal y la sucursal no tienen contactos configurados: no se puede enviar.'}<br><span class="doc-mut">El correo solo se pide para enviar. Descargar CAL/VGM no pide ni valida correo.</span></div>`; };

/* ---------- I-121 · HU-TI-03: COARRI de la terminal contra el BL ---------- */
function coarriHtml(d){
  const ad = (d.errores||[]).some(x=>x.codigo==='1302'), filas = d.equipos.filter(e=>!e.roleado).map(e=>{ const s = (e.sellos.find(x=>x.tipo==='Sello de aduanas')||e.sellos[0]||{}).numero || '', t = ad ? s.slice(0,-1)+'9' : s;
    return [esc(e.numero), esc(s||'Sin sello'), esc(t||'Sin sello'), esc(d.puertoCarga), esc(e.cond), s===t ? chipT('Conforme','ok') : chipT('Discrepancia: precinto','mal')]; });
  return `<div ${PR('HU-TI-03','I-121','COARRI de la terminal', 'fac-card')} id="docCoarri"><div class="fac-head"><div><h3>COARRI de la terminal ${MKP('HU-TI-03','I-121','PEN-I121-02')}</h3>
    <div class="fac-sub">${d.atd ? `Recibido y leído: COARRI_${esc(d.viaje)}_${esc(d.id)}.edi, identificador CO-${esc(d.viaje)}-${esc(d.id)}, ${fdt(d.atd)}.` : 'Aún no se recibe el COARRI del viaje.'}</div></div></div>
    ${d.atd ? tbl(['Contenedor','Precinto en el BL','Precinto informado por la terminal','Puerto','Condición','Resultado'], filas) : ''}
    <p class="doc-mut" style="white-space:normal">Se verifican dos pasos: la lectura del archivo y el cruce con el BL (contenedor, precintos, puerto y condición). Claves y mensajes de discrepancia: PEN-I121-02.</p></div>`;
}

/* ---------- I-174 · HU-DOC-36: consulta TMG de Exportación habilitada BL por BL ---------- */
function tmgHtml(d){ const b = buscarBL(d.id) || d, ok = !!b.tmg;
  return `<div ${PR('HU-DOC-36','I-174','Consulta TMG', 'fac-card')} id="docTmg"><div class="fac-head"><div><h3>Consulta TMG ${MKP('HU-DOC-36','I-174','PEN-I174-02')}</h3>
    <div class="fac-sub">${ok ? `Disponible para TMG desde ${fdt(b.tmg.ts)} (${esc(b.tmg.user)}).` : 'No disponible para TMG: la consulta no devuelve ningún dato de este BL.'}</div></div>
    <div class="fac-acts">${ok ? chipT('Disponible para TMG','ok') : chipT('No disponible para TMG','pend') + (b.estado!=='POR REVISAR' && b.estado!=='Anulado' ? ghost('Aprobar fletes y recargos',`docTmgAprobar('${b.id}')`,'id="docTmgOk"') : '')}</div></div>
    <p class="doc-mut" style="white-space:normal">Exportación: el BL se expone a TMG solo después de esta segunda aprobación de fletes y recargos, BL por BL; la carga del reporte de fletes no lo habilita sola. Luego, los cambios de equipos, precintos y embarque se ven en la consulta. Importación sigue igual: desde el Aviso de llegada Emitido.</p></div>`; }
window.docTmgAprobar = id => { const b = buscarBL(id);
  confirmar('Aprobar fletes y recargos', `¿Aprueba los fletes y recargos del BL ${esc(b.numero)} para la consulta de TMG?`, 'Aprobar', ()=>{
    b.tmg = {ts:ahora(), user:CC.usuario()}; b.hist.push(ev('Fletes y recargos aprobados: BL disponible para la consulta TMG', CC.usuario()));
    CC.toast('BL disponible para la consulta TMG','success'); rerender(ED_ID('exp')); }); };

/* =====================================================================
   Registro de pantallas
===================================================================== */
const G = 'Documentación';
CC.registrarPantalla({id:'screenDocImp', grupo:G, subgrupo:'Importación', opcion:'Documentos', titulo:'Documentación de Importación', migas:['Inicio','Importación','Documentación de Importación'], html:htmlImp,
  guia:[{t:'Documentos de Importación', steps:[{el:'#docIF', h:'Consulta y carga', p:'Filtra por nave, viaje, BL, indicador, estado BL y Estado Pago. Cargar archivos genera los BL.'},{el:'#docIRes', h:'Resultados', p:'Marca BL para transmitir a SUNAT en lote, enviar avisos o el CDL. Clic en el número abre el BL.'}]}]});
CC.registrarPantalla({id:'screenDocImpBl', grupo:G, titulo:'Editar BL', migas:['Inicio','Importación','Documentación de Importación','Editar BL'], html:()=>edHtml('imp'),
  alAbrir:()=>CC.barra(S.ed.nuevo?'Crear BL':'Editar BL', ['Inicio','Importación','Documentación de Importación', S.ed.nuevo?'Crear BL':'Editar BL'], 'docVolver()')});
CC.registrarPantalla({id:'screenDocTrb', grupo:G, subgrupo:'Importación', opcion:'Transbordo', titulo:'Transbordo', migas:['Inicio','Importación','Transbordo'], html:htmlTrb,
  guia:[{t:'Transbordo', steps:[{el:'#docTF', h:'Nave y viaje', p:'Son obligatorios para buscar los BL de transbordo.'},{el:'#docTRes', h:'Numeración', p:'Registra la nave de conexión y envía la numeración de solicitud de transbordo a SUNAT.'}]}]});
CC.registrarPantalla({id:'screenDocDir', grupo:G, subgrupo:'Importación', opcion:'Direccionamiento', titulo:'Direccionamiento', migas:['Inicio','Importación','Direccionamiento'], html:htmlDir,
  guia:[{t:'Direccionamiento', steps:[{el:'#docRF', h:'Buscar', p:'Filtra por nave, viaje, BL o estado.'},{el:'#docRRes', h:'Aprobar o rechazar', p:'Marca los pendientes. Los provisionales primero se relacionan con su BL.'}]}]});
CC.registrarPantalla({id:'screenDocExp', grupo:G, subgrupo:'Exportación', opcion:'Documentos', titulo:'Documentación de Exportación', migas:['Inicio','Exportaciones','Documentación de Exportación'], html:htmlExp,
  guia:[{t:'Documentos de Exportación', steps:[{el:'#docEF', h:'Consulta y carga', p:'Con nave y viaje aparecen Descargar y Enviar CAL/VGM.'},{el:'#docERes', h:'Resultados', p:'Estado SUNAT de la reserva y del BL por separado. El ícono de peso avisa una restricción de exportación (propuesta I-037).'}]}]});
CC.registrarPantalla({id:'screenDocExpRes', grupo:G, titulo:'Editar Reserva', migas:['Inicio','Exportaciones','Editar Reserva'], html:()=>edHtml('exp'),
  alAbrir:()=>CC.barra(S.ed.nuevo?'Crear Reserva':'Editar Reserva', ['Inicio','Exportaciones', S.ed.nuevo?'Crear Reserva':'Editar Reserva'], 'docVolver()')});
CC.registrarPantalla({id:'screenDocExpRestr', grupo:G, propuesta:'I-037', titulo:'Restricciones de exportación', migas:['Inicio','Exportaciones','Restricciones de exportación'], html:htmlRestr,
  alAbrir:()=>CC.barra('Restricciones de exportación', ['Inicio','Exportaciones','Restricciones de exportación'], "CC.abrir('screenDocExp')"),
  guia:[{t:'I-037 Restricciones de exportación', steps:[{el:'#docRsNota', h:'Solo avisa', p:'La alerta no bloquea el guardado ni la transmisión.'},{el:'#docRsRes', h:'Mantenimiento', p:'Límite de payload o peso bruto por tipo de contenedor, línea, cliente y puerto o país, con vigencia y responsable.'}]}]});
CC.registrarPantalla({id:'screenDocCut', grupo:G, subgrupo:'Exportación', opcion:'Cutoff', titulo:'Cutoff', migas:['Inicio','Exportación','Cutoff'], html:htmlCut,
  guia:[{t:'Cutoff', steps:[{el:'#docCF', h:'Nave, viaje y puerto', p:'Los tres son obligatorios. Abre la edición si el cutoff existe o el registro si es nuevo.'}]}]});
CC.registrarPantalla({id:'screenDocAvisos', grupo:G, propuesta:'I-062', titulo:'Configuración de avisos', migas:['Inicio','Documentación','Configuración de avisos'], html:htmlAvisos,
  alAbrir:()=>CC.barra('Configuración de avisos', ['Inicio', S.av.tipo==='Llegada'?'Importación':'Exportación', 'Configuración de avisos'], S.av.tipo==='Llegada'?"CC.abrir('screenDocImp')":"CC.abrir('screenDocExp')"),
  guia:[{t:'I-062 Configuración de avisos', steps:[{el:'#docAvF', h:'Llegada y Salida', p:'Filtra por línea, puerto de operación y sucursal.'},{el:'#docAvRes', h:'Configuraciones', p:'Clic en la línea para editar y ver la vista previa del aviso.'}]}]});
CC.registrarPantalla({id:'screenDocCutForm', grupo:G, titulo:'Edición de Cutoffs', migas:['Inicio','Exportación','Cutoff'], html:htmlCutForm,
  alAbrir:()=>CC.barra(S.co.nuevo?'Registro de Cutoffs':'Edición de Cutoffs', ['Inicio','Exportación','Cutoff', S.co.nuevo?'Registro de Cutoffs':'Edición de Cutoffs'], "CC.abrir('screenDocCut')")});
})();
