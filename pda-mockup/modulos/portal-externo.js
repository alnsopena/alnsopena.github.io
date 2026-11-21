/* ============================================================
   Módulo v37: Portal externo para clientes (portal.html)
   Registro de 4 pasos, login simulado con rol, menú por rol y
   las 8 pantallas del portal. Todo en memoria, datos ficticios.
   Fuente: docs/inventario/portal-externo.md
============================================================ */
(function(){
'use strict';
const W = window, D = document, $ = id => D.getElementById(id);
const e = x => CC.esc(x);

/* ---------- 0. Mismas fuentes que el portal interno ----------
   portal.html no carga el script del mockup. Estas copias hacen que CC.datos
   arme los mismos viajes, naves, BL y contenedores que ve el portal interno
   (solo los BL con consignatarios ficticios). */
const loc = d => new Date(d.getTime() - d.getTimezoneOffset()*6e4).toISOString();
const hoyISO = (n=0) => { const d = new Date(); d.setDate(d.getDate()+n); return loc(d).slice(0,10); };
const ahora = () => loc(new Date()).slice(0,16);
if(typeof W.SHIPS_CATALOG === 'undefined') W.SHIPS_CATALOG = [
  {id:'ship-1', name:'NORD VALOUR', grt:29680, loa:183.17, flag:'Panamá', imo:'IMO 9654323', vtype:'tanker'},
  {id:'ship-2', name:'PACIFIC HORIZON', grt:35000, loa:210, flag:'Liberia', imo:'IMO 9712345', vtype:'container'},
  {id:'ship-3', name:'MAERSK ESSEX', grt:35000, loa:210, flag:'Dinamarca', imo:'IMO 9612349', vtype:'container'},
  {id:'ship-4', name:'OCEAN MERIDIAN', grt:28000, loa:175, flag:'Malta', imo:'IMO 9543213', vtype:'bulk'},
  {id:'ship-5', name:'CHEMICAL STAR', grt:24000, loa:170, flag:'Singapur', imo:'IMO 9432103', vtype:'chem'},
  {id:'ship-6', name:'BOX ENDURANCE', grt:21667, loa:171.98, flag:'Bahamas', imo:'IMO 9321005', vtype:'container'},
  {id:'ship-7', name:'REEFER ATLANTIC', grt:22500, loa:180, flag:'Chipre', imo:'IMO 9221009', vtype:'reefer'}];
if(typeof W.facVoys !== 'function') W.facVoys = () => [
  {nro:'115E', nave:'PACIFIC HORIZON', puerto:'Callao', cliente:'MAERSK LINE A/S', eta:hoyISO(7)+'T08:00'},
  {nro:'684', nave:'BOX ENDURANCE', puerto:'Callao', cliente:'ZIM INTEGRATED SHIPPING SERVICE LTD', eta:'2026-09-10T00:00'},
  {nro:'27N', nave:'OCEAN MERIDIAN', puerto:'Paracas', cliente:'', eta:'2026-09-14T08:00'},
  {nro:'PIS-09', nave:'CHEMICAL STAR', puerto:'Pisco', cliente:'', eta:'2026-09-20T10:00'},
  {nro:'V-001', nave:'NORD VALOUR', puerto:'Callao', cliente:'', eta:'2026-09-25T06:00'},
  {nro:'31S', nave:'REEFER ATLANTIC', puerto:'Paita', cliente:'ZIM INTEGRATED SHIPPING SERVICE LTD', eta:hoyISO(9)+'T06:00'}];
if(typeof W.CB === 'undefined') W.CB = {bls:[
  {n:'ZIMUBOX0000011', nave:'BOX ENDURANCE', nro:'684', cons:'PACIFIC CHEMICALS LTD', lin:'ZIM', st:'APROBADO', tp:'House B/L', mani:'2026-0411', emi:'2026-09-08', pc:'Kingston', pd:'Callao'},
  {n:'ZIMUBOX0000012', nave:'BOX ENDURANCE', nro:'684', cons:'ANDES MINING EXPORT S.A.', lin:'ZIM', st:'TRANSMITIDO A SUNAT', tp:'House B/L', mani:'2026-0411', emi:'2026-09-08', pc:'Kingston', pd:'Callao'}]};

/* ---------- 1. Estilos propios (prefijo pe-) ---------- */
D.head.insertAdjacentHTML('beforeend', `<style id="peCss">
body.pe-anon .cc-menu,body.pe-anon .cc-pagebar,body.pe-anon #currentUser,body.pe-anon .pe-ses{display:none!important}
.pe-ses{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--cc-gray)}.pe-ses b{color:var(--cc-ink);font-weight:600}
.pe-ses button{background:#fff;border:1px solid var(--cc-line);border-radius:8px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.pe-login{display:grid;grid-template-columns:1fr 1fr;min-height:520px;background:#fff;border-radius:14px;overflow:hidden}
.pe-login-l{display:flex;flex-direction:column;justify-content:center;gap:14px;padding:48px 64px}
.pe-logo svg{width:190px;height:auto}.pe-logo-s svg{width:130px;height:auto}
.pe-login-l h2{font-size:26px;font-weight:600;color:var(--cc-ink);margin:14px 0 6px}
.pe-login-r{background:linear-gradient(135deg,#00293B,#0B5C7A);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:56px}
.pe-login-r h2{font-size:30px;font-weight:600;margin:0 0 10px}.pe-login-r p{font-size:15px;opacity:.9;margin:0}
.pe-full{width:100%}
.pe-ov{position:fixed;inset:0;background:rgba(255,255,255,.55);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:9999}
.pe-ov.show{display:flex}.pe-ov-c{background:#fff;border-radius:14px;padding:26px 44px;box-shadow:0 10px 40px rgba(0,0,0,.15);text-align:center;font-size:14px;color:var(--cc-ink)}
.pe-spin{width:34px;height:34px;border:3px solid #DCE7EE;border-top-color:var(--cc-blue);border-radius:50%;animation:peSpin 1s linear infinite;margin:14px auto}
@keyframes peSpin{to{transform:rotate(360deg)}}
.pe-reg{max-width:880px;margin:0 auto;position:relative}
.pe-x{position:absolute;top:14px;right:16px;background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:var(--cc-gray)}
.pe-guia{font-size:14px;color:var(--cc-text);margin:10px 0 0}
.pe-step{display:flex;gap:8px;margin:16px 0 22px}.pe-step span{flex:1;border-top:3px solid var(--cc-line);padding-top:8px;font-size:12.5px;color:var(--cc-gray)}
.pe-step span.on{border-color:var(--cc-blue);color:var(--cc-ink);font-weight:600}.pe-step span.ok{border-color:#9AD3AE}
.pe-err{color:#B3261E;font-size:12px;min-height:14px}.pe-help{color:var(--cc-gray);font-size:12px}
.pe-tel{display:flex;gap:6px;align-items:center}.pe-tel span{padding:9px 10px;border:1px solid var(--cc-line);border-radius:7px;background:var(--cc-band);font-size:13.5px}
.pe-roles{display:grid;gap:8px;margin:10px 0}.pe-roles label{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--cc-line);border-radius:8px;cursor:pointer;font-size:14px}
.pe-roles small{display:block;color:var(--cc-gray);font-size:11px}
.pe-legal{max-height:300px;overflow:auto;border:1px solid var(--cc-line2);border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.55;margin:10px 0}
.pe-legal h4{font-size:13px;margin:12px 0 4px;color:var(--cc-ink)}
.pe-okic{width:58px;height:58px;border-radius:50%;background:#E6F4EA;color:#1B6B35;font-size:30px;display:flex;align-items:center;justify-content:center;margin:6px auto 12px}
.pe-ic{background:none;border:none;cursor:pointer;color:var(--cc-blue);padding:3px;border-radius:6px;display:inline-flex;vertical-align:middle}
.pe-ic svg{width:18px;height:18px}.pe-ic:hover{background:#EEF4F8}.pe-ic.dis{color:#B5C0C7;cursor:not-allowed}
.pe-sd{color:var(--cc-gray)}.pe-sd.err{color:#C62828;font-weight:600}
.pe-pills{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.pe-tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:5px;background:#EEF4F8;color:var(--cc-sub);margin-left:6px}
.pe-ticket{font-size:24px;font-weight:700;letter-spacing:.08em;color:var(--cc-ink)}
.pe-grp{border:1px solid var(--cc-line2);border-radius:10px;padding:14px;margin-bottom:14px}
.pe-bad td{background:#FDECEC!important}
.fac-tbl td.pe-wrap{white-space:normal;min-width:220px}
@media(max-width:900px){.pe-login{grid-template-columns:1fr}.pe-login-r{display:none}.pe-login-l{padding:32px}}
</style>`);

/* ---------- 2. Utilidades ---------- */
const F = (l, i, c) => CC.campo(l, i, c);
const dis = ok => ok ? '' : 'disabled';
const sd = (v, err) => (v===''||v==null) ? `<span class="pe-sd${err?' err':''}">Sin datos</span>` : e(v);
const fh = iso => iso ? CC.fecha(iso) : 'Sin datos';
const fhh = iso => { if(!iso) return 'Sin datos'; const [f,h] = String(iso).split('T'); return `${CC.fecha(f)} ${(h||'00:00').slice(0,5)}`; };
const sum = (a, k) => +a.reduce((s,x)=>s+Number(x[k]||0),0).toFixed(2);
const dl = (id, ops) => `<datalist id="${id}">${[...new Set(ops)].map(o=>`<option value="${e(o)}"></option>`).join('')}</datalist>`;
const SVG = {
  ojo:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  imp:'<path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/>',
  desc:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  ok:'<path d="M5 12l5 5 9-10"/>', obs:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>', clip:'<path d="M20 11l-8 8a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7"/>',
  rec:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', doc:'<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/>',
  lap:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', tacho:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  lupa:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>', anular:'<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  hist:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', mas:'<path d="M9 6l6 6-6 6"/>', menos:'<path d="M6 9l6 6 6-6"/>'};
const ic = (k, t, fn, off) => `<button type="button" class="pe-ic${off?' dis':''}" title="${e(t)}" aria-label="${e(t)}" onclick="${fn}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[k]}</svg></button>`;
const ico = k => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:-3px;margin-right:4px">${SVG[k]}</svg>`;
const corrige = t => CC.marca('Corrige', t, 'Error de Connect por reportar');
const leer = (u, ids) => Object.entries(ids).forEach(([k,id])=>{ const el = $(id); if(el) u.f[k] = el.value.trim(); });
const mailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||'');
const LOGO = () => (D.querySelector('.brand-logo')||{}).innerHTML || '<b>COSMOS</b>';
const tblLineas = ls => `<div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Item</th><th>Descripción</th><th class="num">Cantidad</th><th class="num">Precio Unitario</th><th class="num">Total Bruto</th><th class="num">IGV</th><th class="num">Total Neto</th></tr></thead><tbody>${ls.length ? ls.map(l=>`<tr><td>${l.item}</td><td>${e(l.desc)}</td><td class="num">${l.cant}</td><td class="num">${CC.dinero(l.pu)}</td><td class="num">${CC.dinero(l.bruto)}</td><td class="num">${CC.dinero(l.igv)}</td><td class="num">${CC.dinero(l.neto)}</td></tr>`).join('') : '<tr><td colspan="7" class="fac-empty">Sin detalle disponible</td></tr>'}</tbody></table></div>
  <div class="fac-tot"><span>Total Bruto: ${CC.dinero(sum(ls,'bruto'))}</span><span>IGV: ${CC.dinero(sum(ls,'igv'))}</span><span>Total Neto a pagar: ${CC.dinero(sum(ls,'neto'))}</span></div>`;
W.peDescarga = n => CC.toast(`Descarga simulada: ${n}`, 'info');

/* ---------- 3. Roles, empresas y datos ---------- */
const ROLES = [{c:'CUSTOMER', n:'Cliente'}, {c:'ADMIN-EXTERNAL', n:'Administrador externo'}, {c:'HELP_DESK', n:'Mesa de ayuda'},
  {c:'CUSTOMS_BROKER', n:'Agente de Aduanas'}, {c:'LOGISTIC_OPERATOR', n:'Operador Logístico'}];
const G = {M:'Mandato Electrónico', I:'Importaciones', E:'Exportaciones', L:'Liberaciones y trámites', P:'Liquidaciones y Pagos'};
/* Seed de Connect; Liberación de línea, Sobreestadía y Pago no tienen asignación confirmada: se dan a los roles operativos */
const MENU_ROL = {CUSTOMER:[G.M,G.I,G.E,G.L,G.P], 'ADMIN-EXTERNAL':[G.M], HELP_DESK:[G.M,G.I,G.E,G.L,G.P], CUSTOMS_BROKER:[G.I,G.E,G.L,G.P], LOGISTIC_OPERATOR:[G.I,G.E,G.L,G.P]};
const AGENTE = {razonSocial:'AGENCIA DE ADUANAS DEMO S.A.C.', ruc:'20610000501'};
const OPERADOR = {razonSocial:'OPERADOR LOGÍSTICO DEMO S.A.C.', ruc:'20610000601'};
const EMPRESAS = r => r==='CUSTOMER' ? ['ANDES MINING EXPORT S.A.','TEXTILES COSTA VERDE S.A.'] : r==='CUSTOMS_BROKER' ? [AGENTE.razonSocial] : r==='LOGISTIC_OPERATOR' ? [OPERADOR.razonSocial] : ['COSMOS (Portal Web)'];
const correoDe = (r, emp) => ({CUSTOMER: /^ANDES/.test(emp) ? 'importador@andesmining.example' : 'exportador@costaverde.example', 'ADMIN-EXTERNAL':'admin.portal@cosmos.example',
  HELP_DESK:'mesa.ayuda@cosmos.example', CUSTOMS_BROKER:'aduanas@agenciademo.example', LOGISTIC_OPERATOR:'operaciones@operadordemo.example'})[r];
const dat = () => CC.datos;
const CONS = () => dat().socios.consignatarios.map(s=>s.razonSocial);
const EMBS = () => dat().socios.embarcadores.map(s=>s.razonSocial);
const socioDe = r => [...dat().socios.consignatarios, ...dat().socios.embarcadores].find(s=>s.razonSocial===r);
const rucDe = r => (socioDe(r) || [AGENTE,OPERADOR].find(x=>x.razonSocial===r) || {}).ruc || '';
const BLS = () => [...dat().blImportacion, ...dat().blExportacion];
const bl = n => BLS().find(b=>b.numero===n);
const esExp = b => b.indicador==='Exportación';
const parte = b => esExp(b) ? b.embarcador : b.consignatario;
const viaje = (nave, nro) => dat().viajes.find(v=>v.nave===nave && v.numero===nro) || {};
const vjLbl = v => `${v.numero} - ${v.nave} - ${v.puerto}`;
const conts = n => dat().contenedores.filter(c=>c.bl===n);
const lineaNom = c => (dat().lineas.find(l=>l.codigo===c)||{}).nombre || c;
const puertoLbl = nom => { const p = dat().puertos.find(x=>x.nombre===nom); return p ? `${p.codigo} - ${p.nombre}` : nom; };
const ALMACENES = [{razon:'ALMACÉN EXTRAPORTUARIO DEMO S.A.C.', aduana:'3014', ruc:'20610000701'}, {razon:'DEPÓSITO TEMPORAL CALLAO DEMO S.A.', aduana:'3018', ruc:'20610000702'}];
/* BL con estado de pago asignado (pasaron por "Listo para facturar") */
const LISTO = new Set(['ZIMUBOX0000011','ZIMUBOX0000012','ZIMEXP0026013','ZIMEXP0026065','NAPEXP0026026','NAPEXP0026078']);
const DOC = n => ({ZIMUBOX0000011:236, ZIMUBOX0000012:300})[n] || 180;

const PE = W.PE = {ses:null, ui:{}, seqLiq:330};
const rol = () => PE.ses ? PE.ses.rol : '';
const emp = () => PE.ses ? PE.ses.empresa : '';
const esCli = () => rol()==='CUSTOMER';
const esRevisor = () => /ADMIN-EXTERNAL|HELP_DESK/.test(rol());
const hi = (prev, next, com, user, ts) => ({prev, next, com:com||'', user:user||(PE.ses?PE.ses.correo:''), ts:ts||ahora()});

/* Visibilidad de BL según el rol (regla de Connect en Pagos, aplicada a todas las pantallas) */
function veBL(b){
  if(!b || !PE.ses) return false; const r = rol();
  if(r==='HELP_DESK' || r==='ADMIN-EXTERNAL') return true;
  const p = parte(b); if(r==='CUSTOMER') return p===emp();
  const tt = r==='CUSTOMS_BROKER' ? 'Agente de Aduana' : 'Operador Logístico';
  return PE.mand.some(m=>m.estado==='APROBADO' && m.cliente===p && m.tTer===tt && m.tercero===emp() && m.oper===b.indicador
    && (m.tipo==='Por BL' ? m.bl===b.numero : (m.desde<=hoyISO() && hoyISO()<=m.hasta)));
}

/* Semillas (en memoria) */
PE.sol = [{correo:'pendiente@clientedemo.example', doc:'DNI|40000001', estado:'Pendiente', razon:'ANDES MINING EXPORT S.A.'}];
PE.mand = [
  {n:'ME-000101', cliente:'ANDES MINING EXPORT S.A.', tipo:'Por Vigencia', bl:'', desde:'2026-10-01', hasta:'2027-03-31', tTer:'Agente de Aduana', tercero:AGENTE.razonSocial, oper:'Importación', estado:'APROBADO', fReg:'2026-09-28T10:15', archivo:'mandato-andes-agencia.pdf', obs:'',
    hist:[hi('','PENDIENTE','','importador@andesmining.example','2026-09-28T10:15'), hi('PENDIENTE','APROBADO','','mesa.ayuda@cosmos.example','2026-09-29T09:02')]},
  {n:'ME-000102', cliente:'TEXTILES COSTA VERDE S.A.', tipo:'Por BL', bl:'ZIMEXP0026013', desde:'', hasta:'', tTer:'Operador Logístico', tercero:OPERADOR.razonSocial, oper:'Exportación', estado:'PENDIENTE', fReg:'2026-11-18T16:40', archivo:'', obs:'',
    hist:[hi('','PENDIENTE','','exportador@costaverde.example','2026-11-18T16:40')]},
  {n:'ME-000103', cliente:'ANDES MINING EXPORT S.A.', tipo:'Por Vigencia', bl:'', desde:'2026-11-01', hasta:'2027-01-31', tTer:'Operador Logístico', tercero:OPERADOR.razonSocial, oper:'Importación', estado:'OBSERVADO', fReg:'2026-11-10T11:20', archivo:'', obs:'Adjunte la vigencia firmada por el representante legal.',
    hist:[hi('','PENDIENTE','','importador@andesmining.example','2026-11-10T11:20'), hi('PENDIENTE','OBSERVADO','Adjunte la vigencia firmada por el representante legal.','mesa.ayuda@cosmos.example','2026-11-11T08:45')]},
  {n:'ME-000104', cliente:'PACIFIC CHEMICALS LTD', tipo:'Por BL', bl:'ZIMUBOX0000011', desde:'', hasta:'', tTer:'Agente de Aduana', tercero:AGENTE.razonSocial, oper:'Importación', estado:'RECHAZADO', fReg:'2026-10-02T15:00', archivo:'mandato-pacific.pdf', obs:'El documento no corresponde al BL.',
    hist:[hi('','PENDIENTE','','mesa.ayuda@cosmos.example','2026-10-02T15:00'), hi('PENDIENTE','RECHAZADO','El documento no corresponde al BL.','admin.portal@cosmos.example','2026-10-03T10:00')]}];
PE.dir = [
  {id:'DR-000201', bl:'ZIMUBOX0000012', nave:'BOX ENDURANCE', viaje:'684', servicio:'Liner', linea:'ZIM', cons:'ANDES MINING EXPORT S.A.', desp:'Diferido', cc:'', com:'', reg:{...ALMACENES[0]}, apl:{...ALMACENES[0]}, estado:'APPROVED', tipo:'Web', fReg:'2026-09-03T09:00', conts:['ZIMU1023757','ZIMU1031676'], hist:[{fecha:'2026-09-03T09:00', user:'importador@andesmining.example', tipo:'Registro', cambios:[]}]},
  {id:'DR-000200', bl:'ZIMUBOX0000011', nave:'BOX ENDURANCE', viaje:'684', servicio:'Liner', linea:'ZIM', cons:'PACIFIC CHEMICALS LTD', desp:'SADA Extraportuario', cc:'', com:'', reg:{...ALMACENES[1]}, apl:{razon:'', aduana:'', ruc:''}, estado:'PENDING', tipo:'Web', fReg:'2026-09-02T15:30', conts:['ZIMU1007919','ZIMU1015838'], hist:[]}];
PE.des = [{id:'DG-000007', bl:'ZIMUBOX0000011', estado:'PENDIENTE', fReg:'2026-11-17T10:00', fRes:'', hijos:[
    {bl:'ZIMUBOX0000011A', parte:'PACIFIC CHEMICALS LTD', peso:'12500', conts:['ZIMU1007919']}, {bl:'ZIMUBOX0000011B', parte:'IMPORTADORA LIMA NORTE S.A.C.', peso:'9800', conts:['ZIMU1015838']}],
  adj:[{tipo:'Plantilla de Desglose', archivo:'plantilla-desglose.xlsx', fecha:'2026-11-17T10:00', usuario:'mesa.ayuda@cosmos.example'}, {tipo:'Carta de Desglose', archivo:'carta-desglose.pdf', fecha:'2026-11-17T10:00', usuario:'mesa.ayuda@cosmos.example'}, {tipo:'MBL Endosado', archivo:'mbl-endosado.pdf', fecha:'2026-11-17T10:00', usuario:'mesa.ayuda@cosmos.example'}]}];
/* La semilla de Connect guarda "APROVED"; el mockup lo reconoce como Aprobado (ver corrige en el memo) */
PE.rel = [{id:'SLC-000041', bl:'ZIMUBOX0000011', hijo:'', estado:'APROVED', cons:'PACIFIC CHEMICALS LTD', agente:'', com:'', fecha:'2026-10-25T11:00',
  adj:[{archivo:'bl-endosado-zimubox0000011.pdf', tipo:'BL endosado', fecha:'2026-10-24T09:30', usuario:'mesa.ayuda@cosmos.example'}],
  memos:[{n:'MD-000101', vence:hoyISO(5), dep:'Depósito de Vacíos Callao Norte', tipo:'Devolución de vacío', cant:1, ok:true},
         {n:'MD-000102', vence:hoyISO(-3), dep:'Depósito de Vacíos Ventanilla', tipo:'Devolución de vacío', cant:1, ok:false}]}];
PE.lin = {ZIMUBOX0000011:{lib:true, em:'Original', st:'Liberado', uA:'operaciones@zimdemo.example', fA:'2026-10-18T09:00', uN:'', fN:''},
          ZIMUBOX0000012:{lib:false, em:'', st:'Pendiente', uA:'', fA:'', uN:'', fN:''}};
const lineasDoc = total => { const base = +(total/1.18).toFixed(2); return [{item:1, desc:'Visto bueno y documentación', cant:1, pu:base, bruto:base, igv:+(total-base).toFixed(2), neto:total}]; };
PE.liq = [
  {n:'LIQ0000000301', fecha:'2026-10-21T09:10', bl:'ZIMUBOX0000011', tipo:'Documentación', facturar:'PACIFIC CHEMICALS LTD', cond:'Contado', moneda:'USD', total:236, info:'PAYFUL', estado:'Pendiente de confirmación', fPago:'2026-10-20T10:00', medio:'Transferencia', adj:[{archivo:'voucher-000111221.pdf', com:'Transferencia BBVA'}], conts:[], lineas:lineasDoc(236)},
  {n:'LIQ0000000302', fecha:'2026-10-22T16:05', bl:'ZIMUBOX0000012', tipo:'Documentación', facturar:'ANDES MINING EXPORT S.A.', cond:'Contado', moneda:'USD', total:300, info:'PAYFUL', estado:'Pendiente de confirmación', fPago:'2026-10-22T16:10', medio:'Transferencia', adj:[{archivo:'voucher-000111301.pdf', com:''}], conts:[], lineas:lineasDoc(300)},
  {n:'LIQ0000000320', fecha:'2026-10-30T12:00', bl:'ZIMEXP0026013', tipo:'Documentación', facturar:'TEXTILES COSTA VERDE S.A.', cond:'Contado', moneda:'USD', total:180, info:'PAYFUL', estado:'Pago confirmado', fPago:'2026-10-30T12:40', medio:'ASBANC', adj:[], conts:[], lineas:lineasDoc(180), factura:true}];
PE.ostHasta = {};
PE.mx = {};

/* Sobreestadía: tarifa ficticia por día (20' USD 30, 40' USD 60) */
function calc(c, hasta){
  const b = bl(c.bl), imp = !esExp(b), v = viaje(b.nave, b.viaje);
  const devuelto = c.estado==='Devuelto vacío';
  const ini = imp ? (v.eta||b.emision).slice(0,10) : (()=>{ const d = new Date(b.cutoff+'T00:00'); d.setDate(d.getDate()-6); return loc(d).slice(0,10); })();
  const fin = imp ? (hasta || PE.ostHasta[c.numero] || hoyISO()) : b.cutoff;
  const dias = Math.max(0, Math.round((new Date(fin+'T00:00') - new Date(ini+'T00:00'))/864e5) + 1);
  const ost = Math.max(0, dias - c.diasLibres), tarifa = /^20/.test(c.tipo) ? 30 : 60;
  const bruto = +(ost*tarifa).toFixed(2), igv = +(bruto*0.18).toFixed(2);
  return {ini, fin, dias, ost, tarifa, bruto, igv, neto:+(bruto+igv).toFixed(2), devuelto, imp};
}
const ostLiquidado = n => PE.liq.some(l=>l.estado!=='Anulado' && (l.conts||[]).includes(n));
const lineaLiberada = n => !!(PE.lin[n] && PE.lin[n].lib);
const relDe = (n, h) => PE.rel.find(r=>r.bl===n && (r.hijo||'')===(h||''));
const aprobado = st => /^(APROVED|APPROVED|APROBADO)$/i.test(st||'');
const REL_ST = [['PENDING','Pendiente'],['PROCESS','En proceso'],['APROVED','Aprobado'],['REJECTED','Rechazado']];
const relLbl = st => (REL_ST.find(x=>x[0]===st)||[0,st])[1];
const relTono = st => aprobado(st) ? 'aprobada' : st==='REJECTED' ? 'rechazada' : 'pendiente';

/* Pagos pendientes de un BL (HU-ATC-12) */
function pendPago(n){
  const out = [], docs = PE.liq.filter(l=>l.bl===n && l.tipo==='Documentación' && l.estado!=='Anulado');
  if(!docs.length) out.push('Documentación: pendiente de liquidar');
  docs.filter(l=>l.estado!=='Pago confirmado').forEach(l=>out.push(`Documentación: ${l.n} en estado ${l.estado}`));
  const b = bl(n);
  if(b && !esExp(b)){
    const sin = conts(n).filter(c=>!ostLiquidado(c.numero));
    if(sin.length) out.push(`Sobreestadía: ${sin.length} contenedor(es) pendiente(s) de liquidar`);
    PE.liq.filter(l=>l.bl===n && l.tipo==='Sobreestadía' && !/Anulado|Pago confirmado/.test(l.estado)).forEach(l=>out.push(`Sobreestadía: ${l.n} en estado ${l.estado}`));
  }
  return out;
}

/* ---------- 4. Plumbing de pantallas ---------- */
const BARRAS = {};
function barra(id){ const f = BARRAS[id], r = f && f(); if(r) CC.barra(r[0], r[1], r[2]); else if(W.updatePagebar) W.updatePagebar(id); }
const pinta = id => { CC.refrescar(id); barra(id); };
const abrir = id => CC.abrir(id, true);
function pantalla(def){
  BARRAS[def.id] = def.barra;
  return CC.registrarPantalla({id:def.id, grupo:def.grupo, opcion:def.opcion, titulo:def.titulo, migas:def.migas, guia:def.guia,
    html: () => PE.ses ? def.html() : '',
    alAbrir: (s, interno) => { if(!PE.ses){ W.peIrLogin(); return; } if(interno!==true){ def.reset(); CC.refrescar(def.id); } barra(def.id); }});
}
function salirSinGuardar(u, fn){
  if(u.sucio) peConf('Confirmar cancelación', 'Aún mantiene cambios sin guardar. ¿Desea continuar sin guardarlos?', 'Aceptar', ()=>{ u.sucio = false; fn(); });
  else fn();
}
/* Confirmación propia (queda encima de cualquier ventana) */
function peConf(t, p, ok, si, no){ $('peConfT').textContent = t; $('peConfP').textContent = p; $('peConfOk').textContent = ok; PE._si = si; PE._no = no; $('peConfirm').classList.add('show'); }
W.peConfSi = () => { $('peConfirm').classList.remove('show'); const f = PE._si; PE._si = PE._no = null; if(f) f(); };
W.peConfNo = () => { $('peConfirm').classList.remove('show'); const f = PE._no; PE._si = PE._no = null; if(f) f(); };
function overlay(on, txt){ const o = $('peOv'); if(!o) return; $('peOvTxt').textContent = txt || 'Preparando tu acceso...'; o.classList.toggle('show', !!on); const b = $('peBtnIngresar'); if(b) b.disabled = !!on; }

/* ---------- 5. Login, sesión y rol ---------- */
CC.registrarPantalla({id:'screenPeLogin', titulo:'Iniciar sesión', migas:['Iniciar sesión'],
  html: () => `<div class="pe-login"><div class="pe-login-l"><div class="pe-logo">${LOGO()}</div><h2>Iniciar sesión</h2>
    <button type="button" class="cc-btn pe-full" id="peBtnIngresar" onclick="peIngresar()">Ingresar</button>
    <button type="button" class="cc-btn ghost pe-full" id="peBtnSolicitar" onclick="peAbrirRegistro()">Solicitar Ingreso</button></div>
    <div class="pe-login-r"><h2>Bienvenido a Cosmos</h2><p>Liderando el futuro del sector marítimo y portuario en el Perú.</p></div></div>`});
W.peIrLogin = () => CC.abrir('screenPeLogin');
W.peIngresar = () => { PE.lg = PE.lg || {rol:'CUSTOMER', emp:EMPRESAS('CUSTOMER')[0]}; loginModal(); };
function loginModal(){
  const g = PE.lg;
  CC.modal(`<h3>Inicio de sesión</h3><div class="fac-note">Pantalla simulada del proveedor de identidad. Usuarios y empresas ficticios, sin clave.</div>
    <div class="fac-g2" style="margin-top:14px">${F('Rol', CC.selector(ROLES.map(r=>[r.c,r.n]), g.rol, 'id="peLgRol" onchange="peLgRol(this.value)"'))}
    ${F('Empresa', CC.selector(EMPRESAS(g.rol), g.emp, 'id="peLgEmp" onchange="PE.lg.emp=this.value;peLgPinta()"'))}
    ${CC.campoLectura('Correo', correoDe(g.rol, g.emp), 'fac-span2')}</div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="peLgOk" onclick="peLgEntrar()">Iniciar sesión</button></div>`);
}
W.peLgPinta = loginModal;
W.peLgRol = v => { PE.lg.rol = v; PE.lg.emp = EMPRESAS(v)[0]; loginModal(); };
W.peLgEntrar = () => { const g = PE.lg; CC.cerrarModal(); overlay(true); setTimeout(()=>{ iniciarSesion(g.rol, g.emp); overlay(false); }, 600); };
function iniciarSesion(r, empresa){
  PE.ses = {rol:r, empresa, correo:correoDe(r, empresa), cli: r==='CUSTOMER' ? empresa : (PE.ses && PE.ses.cli) || ''};
  D.body.classList.remove('pe-anon');
  const sel = $('currentUser');
  if(sel){ sel.innerHTML = ROLES.map(x=>`<option value="${x.c}">${e(x.n)} (${x.c})</option>`).join(''); sel.value = r; sel.dataset.prev = r; sel.title = 'Rol activo'; sel.setAttribute('onchange','peCambioRol(this)'); }
  const se = $('peSesEmp'); if(se) se.innerHTML = `<b>${e(empresa)}</b> · ${e(PE.ses.correo)}`;
  menuRol(); PE.ui = {}; W.showScreen('screenInicio');
}
function menuRol(){ const ok = PE.ses ? MENU_ROL[PE.ses.rol] : []; D.querySelectorAll('#ccMenu button[data-menu]').forEach(b=>{ b.style.display = ok.includes(b.dataset.menu) ? '' : 'none'; }); }
W.peCambioRol = sel => { const v = sel.value; sel.value = sel.dataset.prev;
  peConf('¿Cambiar de rol?', 'La página se recargará para aplicar el nuevo rol.', 'Aceptar', ()=>iniciarSesion(v, v==='CUSTOMER' ? (PE.ses.cli || EMPRESAS('CUSTOMER')[0]) : EMPRESAS(v)[0])); };
W.peSalir = () => { PE.ses = null; PE.ui = {}; D.body.classList.add('pe-anon'); W.peIrLogin(); };

/* ---------- 6. Registro (solicitud de acceso en 4 pasos) ---------- */
const REG0 = () => ({paso:1, archivo:null, ruc:'', razon:'', rucMsg:'', nombre:'', apellido:'', tdoc:'', ndoc:'', tel:'', correo:'', correoRep:'', roles:[], toc:{}});
const ROLES_REG = [['CUSTOMS_BROKER','Agente de Aduanas'],['CUSTOMER','Cliente'],['LOGISTIC_OPERATOR','Operador Logístico']];
const ETAPAS = ['Carta de responsabilidad','Datos de la empresa','Datos del solicitante','Rol del usuario'];
function regValido(p){
  const r = PE.reg; if(!r) return false;
  if(p===1) return !!r.archivo;
  if(p===2) return r.ruc.length===11 && !!r.razon;
  if(p===3) return !!(r.nombre.trim() && r.apellido.trim() && r.tdoc && r.ndoc.trim() && r.tel.trim() && mailOk(r.correo) && mailOk(r.correoRep));
  return r.roles.length > 0;
}
function regErr(k){
  const r = PE.reg; if(!r.toc[k]) return '';
  if(/correo/.test(k)) return mailOk(r[k]) ? '' : 'Por favor, ingrese un correo electrónico válido.';
  if(k==='roles') return r.roles.length ? '' : 'Debes seleccionar al menos un rol.';
  return String(r[k]).trim() ? '' : 'Por favor, complete todos los campos obligatorios antes de continuar.';
}
function regHtml(){
  const r = PE.reg || (PE.reg = REG0()), p = r.paso;
  const guia = p<=2 ? '¡Bienvenido a Cosmos! Para solicitar tu ingreso, primero descarga y completa la declaración jurada' : 'Solicita tu ingreso al portal, registrando los siguientes datos';
  const inp = (k, lbl, ph, extra) => F(lbl, `<input id="peReg_${k}" placeholder="${ph}" value="${e(r[k])}" ${extra||''} oninput="peRegSet('${k}',this)"><span class="pe-err" id="peRegErr_${k}">${regErr(k)}</span>`);
  let c = '';
  if(p===1) c = `<p style="font-size:14px">Adjunta la carta de responsabilidad con todos los datos solicitados <button type="button" class="fac-link" onclick="peDescarga('declaracion-jurada.docx')">Descárgala aquí</button></p>
    <div class="pe-pills"><input type="file" id="peRegFile" accept=".pdf,.jpg,.jpeg,.png,.docx" hidden onchange="peRegArchivo(this)">
    <button type="button" class="cc-btn ghost" onclick="document.getElementById('peRegFile').click()">Adjuntar documentos</button>
    <span id="peRegFileTxt">${r.archivo ? e(r.archivo.name) : 'No hay archivos seleccionados'}</span></div>
    <div class="pe-help">PDF, JPG, PNG o DOCX (máx. 5MB)</div><div class="pe-err" id="peRegFileErr"></div>`;
  if(p===2) c = `<div class="fac-g2">${F('RUC *', `<input id="peRegRuc" maxlength="11" inputmode="numeric" placeholder="Ingrese el RUC" value="${e(r.ruc)}" oninput="peRegRuc(this)">`)}
    ${F('Empresa / Razón Social', `<input id="peRegRazon" disabled placeholder="Ingrese el nombre de la empresa o razón social" value="${e(r.razon)}">`)}</div>
    <div class="pe-err" id="peRegRucMsg">${e(r.rucMsg)}</div><div class="pe-help">Dato ficticio de prueba: RUC 20610000301 (ANDES MINING EXPORT S.A.).</div>`;
  if(p===3) c = `<div class="fac-g2">${inp('nombre','Nombre *','Ingrese su nombre','maxlength="100"')}${inp('apellido','Apellido *','Ingrese su apellido','maxlength="100"')}
    ${F('Tipo de Documento *', CC.selector(['DNI','Carné de Extranjería','Pasaporte'], r.tdoc, `id="peReg_tdoc" onchange="peRegSet('tdoc',this)"`, ''))}
    ${inp('ndoc','Número de Documento *','Ingrese el número de documento','maxlength="20"')}
    ${F('Número de Teléfono *', `<div class="pe-tel"><span>+51</span><input id="peReg_tel" maxlength="25" inputmode="numeric" placeholder="Ingrese su número de teléfono" value="${e(r.tel)}" oninput="peRegSet('tel',this)"></div>`, 'fac-span2')}
    ${inp('correo','Correo Electrónico *','Ingrese su correo electrónico','type="email" maxlength="256"')}${inp('correoRep','Correo del Representante Legal *','Ingrese el correo del representante legal','type="email" maxlength="256"')}</div>`;
  if(p===4) c = `<p style="font-size:14px">Selecciona los roles que tienes dentro de la empresa *</p><div class="pe-roles">${ROLES_REG.map(([cod,n])=>`<label><input type="checkbox" value="${cod}" ${r.roles.includes(cod)?'checked':''} onchange="peRegRol('${cod}',this.checked)"><span>${n}<small>${cod}</small></span></label>`).join('')}</div>
    <div class="pe-help">Rol: <span id="peRegRolesTxt">${r.roles.length ? e(r.roles.slice(0,3).join('; ') + (r.roles.length>3 ? `; +${r.roles.length-3} más` : '')) : 'Sin seleccionar'}</span></div><div class="pe-err" id="peRegErr_roles">${regErr('roles')}</div>`;
  const btns = `<div class="fac-btns">${p>1 ? '<button type="button" class="cc-btn ghost" onclick="peRegPaso(-1)">Atrás</button>' : ''}
    ${p<4 ? `<button type="button" class="cc-btn" id="peRegNext" onclick="peRegPaso(1)" ${dis(regValido(p))}>Siguiente</button>` : `<button type="button" class="cc-btn" id="peRegNext" onclick="peRegPolitica()" ${dis(regValido(4))}>Registrarme</button>`}</div>`;
  return `<div class="fac-card pe-reg"><button type="button" class="pe-x" title="Cerrar" aria-label="Cerrar" onclick="peRegCerrar()">×</button>
    <div class="pe-logo-s">${LOGO()}</div><p class="pe-guia">${guia}</p>
    <div class="pe-step">${ETAPAS.map((t,i)=>`<span class="${i+1===p?'on':i+1<p?'ok':''}">${t}</span>`).join('')}</div>
    <h3>${p}. ${ETAPAS[p-1]}</h3>${c}${btns}</div>`;
}
CC.registrarPantalla({id:'screenPeRegistro', titulo:'Solicitar Ingreso', migas:['Solicitar Ingreso'], html: regHtml});
const regChk = () => { const b = $('peRegNext'); if(b) b.disabled = !regValido(PE.reg.paso); };
W.peAbrirRegistro = () => { PE.reg = REG0(); CC.abrir('screenPeRegistro'); };
W.peRegCerrar = () => { PE.reg = null; W.peIrLogin(); };
W.peRegPaso = d => { const r = PE.reg; if(d>0 && !regValido(r.paso)) return; r.paso = Math.min(4, Math.max(1, r.paso + d)); CC.refrescar('screenPeRegistro'); };
W.peRegArchivo = inp => {
  const f = inp.files[0], err = $('peRegFileErr'); err.textContent = ''; if(!f) return;
  if(!/\.(pdf|jpe?g|png|docx)$/i.test(f.name)){ err.textContent = 'Tipo de archivo no válido. Solo se permiten PDF, JPG, PNG o DOCX.'; return; }
  if(f.size > 5*1024*1024){ err.textContent = 'El tamaño del archivo excede el máximo permitido de 5MB.'; return; }
  PE.reg.archivo = {name:f.name, size:f.size}; $('peRegFileTxt').textContent = f.name; regChk();
};
W.peRegRuc = el => {
  const r = PE.reg; el.value = el.value.replace(/\D/g,'').slice(0,11); r.ruc = el.value; r.razon = ''; r.rucMsg = '';
  $('peRegRazon').value = ''; $('peRegRucMsg').textContent = ''; regChk();
  clearTimeout(PE._rucT); if(r.ruc.length!==11) return;
  PE._rucT = setTimeout(()=>{ const s = [...Object.values(dat().socios).flat(), AGENTE, OPERADOR].find(x=>x.ruc===r.ruc);
    if(s) r.razon = s.razonSocial; else r.rucMsg = 'Comunicarse con Atención al cliente para la creación de la empresa registrada';
    const z = $('peRegRazon'); if(z) z.value = r.razon; const m = $('peRegRucMsg'); if(m) m.textContent = r.rucMsg; regChk(); }, 300);
};
W.peRegSet = (k, el) => {
  const r = PE.reg; let v = el.value;
  if(k==='nombre' || k==='apellido'){ v = v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]/g,''); el.value = v; }
  if(k==='tel'){ v = v.replace(/\D/g,''); el.value = v; }
  r[k] = v; r.toc[k] = true; const s = $('peRegErr_'+k); if(s) s.textContent = regErr(k); regChk();
};
W.peRegRol = (c, on) => { const r = PE.reg; r.roles = on ? [...new Set([...r.roles, c])] : r.roles.filter(x=>x!==c); r.toc.roles = true;
  $('peRegRolesTxt').textContent = r.roles.length ? r.roles.slice(0,3).join('; ') + (r.roles.length>3 ? `; +${r.roles.length-3} más` : '') : 'Sin seleccionar';
  $('peRegErr_roles').textContent = regErr('roles'); regChk(); };
const LEGAL = ['Tratamiento y Transferencia de Datos Personales','Calidad de los Datos Personales','Confidencialidad y Seguridad de los Datos Personales','Ejercicio de Derechos por el Titular de Datos Personales','Modificaciones a la Política de Privacidad, Términos y Condiciones','Consentimiento','Contenido de la Información','Contactar a LA EMPRESA'];
W.peRegPolitica = () => {
  if(!regValido(4)) return;
  CC.modal(`<h3>Política de Privacidad</h3><div class="pe-legal" id="peLegal">${LEGAL.map((t,i)=>`<h4>${i+1}. ${t}</h4><p>Texto de relleno. Aquí va el texto legal de la política de privacidad de Cosmos para esta sección.</p>`).join('')}</div>
    <label class="fac-chk"><input type="checkbox" id="pePolChk" onchange="document.getElementById('pePolOk').disabled=!this.checked"> He leído y acepto la Política de Privacidad de Cosmos</label>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="pePolOk" disabled onclick="peRegEnviar()">Aceptar y Continuar</button></div>`);
};
W.peRegEnviar = () => {
  const r = PE.reg, doc = `${r.tdoc}|${r.ndoc}`; CC.cerrarModal();
  const pc = PE.sol.find(s=>s.correo.toLowerCase()===r.correo.toLowerCase() && s.estado!=='Rechazada');
  const pd = PE.sol.find(s=>s.doc===doc && s.estado!=='Rechazada');
  if(pc) return CC.toast(pc.estado==='Pendiente' ? 'El correo electrónico ingresado ya cuenta con una solicitud en proceso de aprobación.' : `El correo electrónico ingresado ya se encuentra registrado con la empresa ${pc.razon}.`, 'error');
  if(pd) return CC.toast(pd.estado==='Pendiente' ? 'El documento de identidad ingresado ya cuenta con una solicitud en proceso de aprobación.' : `El documento de identidad ingresado ya se encuentra registrado con la empresa ${pd.razon}.`, 'error');
  PE.sol.push({correo:r.correo, doc, estado:'Pendiente', usuario:'Inactivo', razon:r.razon, ruc:r.ruc, nombre:`${r.nombre} ${r.apellido}`, roles:r.roles.slice(), archivo:r.archivo.name, fecha:ahora()});
  PE.reg = null; CC.abrir('screenPeRegistroOk');
};
CC.registrarPantalla({id:'screenPeRegistroOk', titulo:'Registro completado', migas:['Registro completado'],
  html: () => `<div class="fac-card pe-reg" style="text-align:center"><div class="pe-okic">✓</div><h3>¡Registro completado!</h3>
    <p style="font-size:14px">Su solicitud de ingreso al portal ha sido enviada con éxito y se encuentra en proceso de revisión. Recibirás una notificación en breve.</p>
    <div ${CC.propuesta('Propuesta sin ticket','Aviso de quién aprueba','fac-note')} style="text-align:left;margin-top:16px">Atención al Cliente de Cosmos revisa y aprueba tu solicitud en el portal interno (Aprobación de Usuarios Web). Al aprobarla, recibirás un correo con tu usuario y una clave temporal.</div>
    <div class="fac-btns" style="justify-content:center"><button type="button" class="cc-btn" id="peRegSalir" onclick="peIrLogin()">Salir</button></div></div>`});

/* ---------- 7. Mandato Electrónico ---------- */
const MST = {PENDIENTE:'Pendiente', OBSERVADO:'Observado', APROBADO:'Aprobado', RECHAZADO:'Rechazado'};
const MTONO = {PENDIENTE:'pendiente', OBSERVADO:'pendiente', APROBADO:'aprobada', RECHAZADO:'rechazada'};
const chipsTodos = (lista, actual, tono) => `<div class="cc-chips" style="margin-bottom:14px">${lista.map(([k,v])=> k===actual ? CC.chipEstado(v, tono(k)) : `<span class="cc-chip">${e(v)}</span>`).join('')}</div>`;
const mdUI = () => PE.ui.md || (PE.ui.md = {modo:'buscar', f:{cliente:'', tipo:'', oper:'', estado:'PENDIENTE', desde:'', hasta:''}, buscado:false, pagina:1, tam:10});
function mdFilas(){ const f = mdUI().f; return PE.mand.filter(m=>{
  if(esCli() && m.cliente!==emp()) return false;
  if(/CUSTOMS|LOGISTIC/.test(rol()) && m.tercero!==emp()) return false;
  return (!f.cliente || m.cliente===f.cliente) && (!f.tipo || m.tipo===f.tipo) && (!f.oper || m.oper===f.oper) && (!f.estado || m.estado===f.estado)
    && (!f.desde || m.fReg.slice(0,10)>=f.desde) && (!f.hasta || m.fReg.slice(0,10)<=f.hasta); }); }
const mdAcc = m => `<span class="fac-rowacts">${m.estado==='PENDIENTE' ? ic('ok','Aprobar',`peMdAccion('${m.n}','APROBADO')`) + ic('obs','Observar',`peMdAccion('${m.n}','OBSERVADO')`) : ''}${/PENDIENTE|OBSERVADO/.test(m.estado) ? ic('x','Rechazar',`peMdAccion('${m.n}','RECHAZADO')`) : ''}</span>`;
function mdCols(){ return [
  {t:'Nro Mandato', v:m=>`<button type="button" class="fac-link" onclick="peMdVer('${m.n}')">${m.n}</button>`},
  ...(esCli() ? [] : [{t:'Cliente', k:'cliente'}]),
  {t:'Tipo de socio', k:'tTer'}, {t:'Nombre del socio', k:'tercero'}, {t:'Tipo de Mandato', k:'tipo'},
  {t:'Vigencia', v:m=>m.tipo==='Por Vigencia' ? `${CC.fecha(m.desde)} a ${CC.fecha(m.hasta)}` : sd('')},
  {t:'BL', v:m=>sd(m.bl)}, {t:'Tipo de Operación', k:'oper'}, {t:'Estado', v:m=>CC.chipEstado(MST[m.estado], MTONO[m.estado])},
  {t:'Fecha registro', v:m=>CC.fecha(m.fReg)}, {t:'Adjunto', v:m=>m.archivo ? ic('desc','Descargar',`peDescarga('${e(m.archivo)}')`) : sd('')},
  ...(esRevisor() ? [{t:`Acciones ${corrige('Solo Administrador externo o Mesa de ayuda')}`, v:mdAcc}] : [])]; }
function mdHtml(){
  const u = mdUI();
  if(u.modo!=='buscar') return mdForm();
  const f = u.f, campos = [
    esCli() ? '' : F('Cliente', `<input id="peMdCli" list="peDlCli" placeholder="Ingresar Cliente" value="${e(f.cliente)}">`),
    F('Tipo de Mandato', CC.selector(['Por Vigencia','Por BL'], f.tipo, 'id="peMdTipo"', 'Todos')),
    F('Tipo de Operación', CC.selector(['Importación','Exportación'], f.oper, 'id="peMdOper"', 'Todos')),
    F('Estado', CC.selector(Object.entries(MST), f.estado, 'id="peMdEst"', 'Todos')),
    F('Fecha de registro', `<div class="fac-range"><input type="date" id="peMdDesde" value="${f.desde}"><span>a</span><input type="date" id="peMdHasta" value="${f.hasta}"></div>`)].filter(Boolean);
  const nuevo = (esCli() || esRevisor()) ? '<button type="button" class="cc-btn" id="peMdNuevo" onclick="peMdNuevo()">Nuevo</button>' : '';
  return CC.filtros({id:'peMdF', titulo:'Mandatos Electrónicos', sub:'Ingresar datos', cols:3, campos, buscar:'peMdBuscar()', limpiar:'peMdLimpiar()', acciones:nuevo})
    + (u.buscado ? CC.tablaResultados({id:'peMdRes', columnas:mdCols(), filas:mdFilas(), pagina:u.pagina, tam:u.tam, fnPagina:'peMdPagina', exportar:'peMdExportar()', vacio:'No se encontraron resultados con los criterios seleccionados'}) : '')
    + dl('peDlCli', [...CONS(), ...EMBS()]);
}
function mdForm(){
  const u = mdUI(), m = u.form, md = u.modo, ver = md==='ver', ed = !ver, cur = u.n && PE.mand.find(x=>x.n===u.n);
  const blsCli = BLS().filter(b=>parte(b)===m.cliente).map(b=>b.numero);
  const acts = ver && cur ? [
    '<button type="button" class="cc-btn ghost" onclick="peMdHist()">Ver Historial</button>',
    (esCli() || esRevisor()) ? '<button type="button" class="cc-btn ghost" onclick="peMdNuevo()">Nuevo</button>' : '',
    esRevisor() && cur.estado==='PENDIENTE' ? `<button type="button" class="cc-btn" id="peMdAprobar" onclick="peMdAccion('${cur.n}','APROBADO')">Aprobar</button><button type="button" class="cc-btn ghost" onclick="peMdAccion('${cur.n}','OBSERVADO')">Observar</button><button type="button" class="cc-btn ghost" onclick="peMdAccion('${cur.n}','RECHAZADO')">Rechazar</button>` : '',
    !/APROBADO|RECHAZADO/.test(cur.estado) && (esCli() || esRevisor()) ? '<button type="button" class="cc-btn" id="peMdEditar" onclick="peMdEditar()">Editar</button>' : ''].join('') : '';
  const campos = [
    CC.campoLectura('Número de Mandato', m.n || ''),
    F('Cliente *', `<input list="peDlCli" ${dis(ed && !esCli())} value="${e(m.cliente)}" placeholder="Ingresar Cliente" onchange="peMdF('cliente',this.value)">`),
    F('Tipo de Mandato *', CC.selector(['Por Vigencia','Por BL'], m.tipo, `id="peMdFTipo" ${dis(md==='crear')} onchange="peMdF('tipo',this.value)"`, 'Seleccione')),
    m.tipo==='Por BL' ? F('Número de BL *', `<input id="peMdFBl" list="peDlMdBl" ${dis(ed)} value="${e(m.bl)}" placeholder="Ingrese el BL" onchange="peMdF('bl',this.value)">`) : '',
    m.tipo==='Por Vigencia' ? F('Vigencia *', `<div class="fac-range"><input type="date" id="peMdFDesde" ${dis(ed)} value="${m.desde}" onchange="peMdF('desde',this.value)"><span>a</span><input type="date" id="peMdFHasta" ${dis(ed)} value="${m.hasta}" onchange="peMdF('hasta',this.value)"></div>`) : '',
    F('Tipo de tercero *', `<div class="fac-pills pe-pills" style="margin:6px 0 0">${['Agente de Aduana','Operador Logístico'].map(t=>`<label class="fac-chk"><input type="radio" name="peMdTer" ${dis(ed)} ${m.tTer===t?'checked':''} onchange="peMdF('tTer','${t}')"> ${t}</label>`).join('')}</div>`),
    F(`${m.tTer} *`, `<input id="peMdFTer" list="peDlTer" ${dis(ed)} value="${e(m.tercero)}" placeholder="Ingresar ${m.tTer}" onchange="peMdF('tercero',this.value)">`),
    F('Tipo de Operación *', CC.selector(['Importación','Exportación'], m.oper, `id="peMdFOper" ${dis(ed && !(m.tipo==='Por BL' && m.bl))} onchange="peMdF('oper',this.value)"`, 'Seleccione')),
    F(`Mandato electrónico (PDF/imagen)${m.tTer==='Agente de Aduana' ? ' *' : ''}`, ver ? (m.archivo ? `<button type="button" class="fac-link" onclick="peDescarga('${e(m.archivo)}')">${e(m.archivo)}</button>` : sd(''))
      : `<input type="file" id="peMdFile" accept=".pdf,.jpg,.jpeg,.png" onchange="peMdArchivo(this)"><span class="pe-help">${m.archivo ? e(m.archivo) : 'PDF, JPG o PNG (máx. 10 MB)'}</span>`),
    md!=='crear' && m.obs ? F('Observaciones', `<textarea disabled rows="2">${e(m.obs)}</textarea>`, 'fac-span2') : ''].filter(Boolean);
  return `<div class="fac-card" id="peMdForm"><div class="fac-head"><div><h3>${ver ? 'Ver Mandato Electrónico' : 'Registro de Mandato Electrónico'}</h3></div><div class="fac-acts">${acts}</div></div>
    ${cur && md!=='crear' ? chipsTodos(Object.entries(MST), cur.estado, k=>MTONO[k]) : ''}
    <div class="fac-g3">${campos.join('')}</div>
    ${ed ? '<div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="peMdVolver()">Cancelar</button><button type="button" class="cc-btn" id="peMdGuardar" onclick="peMdGuardar()">Guardar</button></div>' : ''}</div>
    ${dl('peDlCli', [...CONS(), ...EMBS()])}${dl('peDlMdBl', blsCli)}${dl('peDlTer', m.tTer==='Agente de Aduana' ? [AGENTE.razonSocial] : [OPERADOR.razonSocial])}`;
}
pantalla({id:'screenPeMandato', grupo:G.M, opcion:'Mandato Electrónico', titulo:'Mandatos Electrónicos', migas:['Inicio','Mandato Electrónico','Mandatos Electrónicos'],
  html: mdHtml, reset: () => { const u = mdUI(); u.modo = 'buscar'; u.sucio = false; },
  barra: () => { const u = mdUI(); if(u.modo==='buscar') return null; const t = u.modo==='ver' ? 'Ver Mandato Electrónico' : 'Registro de Mandato Electrónico'; return [t, ['Inicio','Mandato Electrónico',t], 'peMdVolver()']; },
  guia:[{t:'Mandato electrónico', steps:[{el:'#peMdF', h:'Buscar', p:'Filtra por estado, tipo y fechas.'}]}]});
const MD_IDS = {cliente:'peMdCli', tipo:'peMdTipo', oper:'peMdOper', estado:'peMdEst', desde:'peMdDesde', hasta:'peMdHasta'};
W.peMdBuscar = () => { const u = mdUI(); leer(u, MD_IDS); u.buscado = true; u.pagina = 1; pinta('screenPeMandato'); if(!mdFilas().length) CC.toast('No se encontraron resultados con los criterios seleccionados', 'info'); };
W.peMdLimpiar = () => { const u = mdUI(); u.f = {cliente:'', tipo:'', oper:'', estado:'PENDIENTE', desde:'', hasta:''}; u.buscado = false; pinta('screenPeMandato'); };
W.peMdPagina = (p, t) => { const u = mdUI(); if(t) u.tam = t; u.pagina = p; pinta('screenPeMandato'); };
W.peMdExportar = () => CC.exportarExcel('Mandatos_Electronicos', 'Mandatos', ['Nro Mandato','Cliente','Tipo de socio','Nombre del socio','Tipo de Mandato','Vigencia','BL','Tipo de Operación','Estado','Fecha registro'],
  mdFilas().map(m=>[m.n, m.cliente, m.tTer, m.tercero, m.tipo, m.tipo==='Por Vigencia' ? `${CC.fecha(m.desde)} a ${CC.fecha(m.hasta)}` : '', m.bl, m.oper, MST[m.estado], CC.fecha(m.fReg)]));
W.peMdNuevo = () => { const u = mdUI(); u.modo = 'crear'; u.n = null; u.sucio = false;
  u.form = {n:'', cliente:esCli() ? emp() : '', tipo:'', bl:'', desde:'', hasta:'', tTer:'Agente de Aduana', tercero:'', oper:'', archivo:'', obs:''}; abrir('screenPeMandato'); };
W.peMdVer = n => { const u = mdUI(); u.modo = 'ver'; u.n = n; u.sucio = false; u.form = {...PE.mand.find(m=>m.n===n)}; abrir('screenPeMandato'); };
W.peMdEditar = () => { const u = mdUI(); u.modo = 'editar'; u.form = {...PE.mand.find(m=>m.n===u.n)}; pinta('screenPeMandato'); };
W.peMdVolver = () => { const u = mdUI(); salirSinGuardar(u, ()=>{ if(u.modo==='editar') W.peMdVer(u.n); else { u.modo = 'buscar'; abrir('screenPeMandato'); } }); };
W.peMdF = (k, v) => { const u = mdUI(), m = u.form; u.sucio = true; m[k] = v;
  if(k==='tipo'){ m.bl = ''; m.desde = ''; m.hasta = ''; }
  if(k==='cliente') m.bl = '';
  if(k==='tTer') m.tercero = '';
  if(k==='bl'){ const b = bl(v); if(b && parte(b)===m.cliente) m.oper = b.indicador; else if(v){ CC.toast('El BL no pertenece al cliente.', 'error'); m.bl = ''; } }
  pinta('screenPeMandato'); };
W.peMdArchivo = inp => { const f = inp.files[0]; if(!f) return;
  if(!/\.(pdf|jpe?g|png)$/i.test(f.name) || f.size > 10*1024*1024) return CC.toast('Error al cargar el archivo. Por favor, verifique el tamaño y el tipo del archivo.', 'error');
  if(f.name.length > 80) return CC.toast('Existen nombres de archivos que contienen más de 80 caracteres.', 'error');
  mdUI().form.archivo = f.name; mdUI().sucio = true; pinta('screenPeMandato'); };
W.peMdGuardar = () => {
  const u = mdUI(), m = u.form;
  const ok = m.cliente && m.tipo && (m.tipo==='Por BL' ? m.bl : (m.desde && m.hasta)) && m.tercero && m.oper && (m.tTer!=='Agente de Aduana' || m.archivo);
  if(!ok) return CC.toast('Por favor complete todos los campos obligatorios.', 'error');
  if(PE.mand.some(x=>x.n!==m.n && x.estado!=='RECHAZADO' && x.cliente===m.cliente && x.bl===m.bl && x.tTer===m.tTer && x.tercero===m.tercero && x.desde===m.desde && x.hasta===m.hasta))
    return CC.toast('Ya existe un mandato registrado con los mismos datos.', 'error');
  if(u.modo==='crear'){ const n = 'ME-' + String(101 + PE.mand.length).padStart(6,'0');
    PE.mand.unshift({...m, n, estado:'PENDIENTE', fReg:ahora(), hist:[hi('','PENDIENTE','')]}); u.n = n; CC.toast('Mandato Electrónico creado correctamente', 'success'); }
  else { const cur = PE.mand.find(x=>x.n===u.n), prev = cur.estado; Object.assign(cur, m, {hist:cur.hist, estado:cur.estado});
    if(prev==='OBSERVADO'){ cur.estado = 'PENDIENTE'; cur.hist.push(hi(prev, 'PENDIENTE', 'Subsanado por el cliente')); }
    CC.toast('Mandato Electrónico actualizado correctamente', 'success'); }
  u.sucio = false; W.peMdVer(u.n);
};
function mdCambia(n, nuevo, com){ const m = PE.mand.find(x=>x.n===n); m.hist.push(hi(m.estado, nuevo, com)); m.estado = nuevo; if(com) m.obs = com;
  CC.toast(`Mandato ${n}: ${MST[nuevo]}`, 'success'); const u = mdUI(); if(u.modo==='ver') u.form = {...m}; pinta('screenPeMandato'); }
W.peMdAccion = (n, nuevo) => {
  if(!esRevisor()) return;
  if(nuevo==='APROBADO') return peConf('Aprobar Mandato Electrónico', '¿Estás seguro de que deseas aprobar el mandato electrónico?', 'Aceptar', ()=>mdCambia(n, 'APROBADO', ''));
  const v = nuevo==='OBSERVADO' ? 'observar' : 'rechazar';
  CC.modal(`<h3>${nuevo==='OBSERVADO' ? 'Observar' : 'Rechazar'} Mandato Electrónico</h3><p style="font-size:13.5px">Favor de ingresar la razón para ${v} este mandato electrónico:</p>
    <div class="fac-f"><textarea id="peMdMot" rows="4" maxlength="800" oninput="document.getElementById('peMdMotOk').disabled=!this.value.trim()"></textarea></div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="peMdMotOk" disabled onclick="peMdMotivo('${n}','${nuevo}')">Aceptar</button></div>`);
};
W.peMdMotivo = (n, nuevo) => { const t = $('peMdMot').value.trim(); if(!t) return; CC.cerrarModal(); mdCambia(n, nuevo, t); };
W.peMdHist = () => { const cur = PE.mand.find(x=>x.n===mdUI().n);
  CC.modal(`<h3>Historial</h3><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Estado Previo</th><th>Estado Actual</th><th>Usuario</th><th>Fecha</th><th>Comentario</th></tr></thead><tbody>
    ${cur.hist.map(h=>`<tr><td>${h.prev ? MST[h.prev] : sd('')}</td><td>${MST[h.next]}</td><td>${e(h.user)}</td><td>${fhh(h.ts)}</td><td class="pe-wrap">${sd(h.com)}</td></tr>`).join('')}</tbody></table></div>
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md'); };

/* ---------- 8. Direccionamiento de Carga ---------- */
const DIR_ST = [['PENDING','Pendiente'],['PROVISIONAL','Provisional'],['REJECTED','Rechazado'],['APPROVED','Aprobado'],['NO_REQUEST','Sin solicitud']];
const DTONO = k => ({APPROVED:'aprobada', REJECTED:'rechazada'})[k] || 'pendiente';
const DESPACHOS = ['Anticipado','Diferido','SADA Extraportuario','SADA Almacén del cliente'];
const diUI = () => PE.ui.di || (PE.ui.di = {modo:'buscar', f:{nave:'', viaje:'', bl:''}, buscado:false, pagina:1, tam:10});
const diVis = d => veBL({indicador:'Importación', consignatario:d.cons, numero:d.bl});
/* Prototipos HU-DOC-27 (I-114, I-085, I-099): solo con "Ver propuestas" encendido */
const P = () => CC.verPropuestas;
const DIR_AUTO = ['Diferido','SADA Extraportuario'];
/* BL ficticio de importación con el periodo de direccionamiento abierto (ETA en 7 días); solo se usa en esta pantalla */
const DI_DEMO = [{numero:'ZIMUDIR0000021', nave:'PACIFIC HORIZON', viaje:'115E', linea:'ZIM', consignatario:'ANDES MINING EXPORT S.A.', indicador:'Importación', contenedores:['ZIMU2100011','ZIMU2100026']}];
const diBLs = () => [...dat().blImportacion, ...DI_DEMO];
/* I-114 (B5): BL de Importación sin solicitud, con el direccionamiento por defecto */
const diDefecto = () => P() ? diBLs().filter(b=>veBL(b) && !PE.dir.some(d=>d.bl===b.numero)).map(b=>({id:'', def:true, bl:b.numero, nave:b.nave, viaje:b.viaje, linea:b.linea,
  cons:b.consignatario, desp:'', cc:'', com:'', reg:{razon:'', aduana:'', ruc:''}, apl:{...ALMACENES[1]}, estado:'NO_REQUEST', tipo:'Defecto', fReg:'', conts:b.contenedores.slice(), hist:[]})) : [];
/* I-099: vigencia = cierre del periodo de direccionamiento (ETA menos 36 horas); fuente por confirmar en PEN-I099-02 */
const diVig = d => { const v = viaje(d.nave, d.viaje); return v.eta ? fhh(loc(new Date(new Date(v.eta) - 36*36e5)).slice(0,16)) : 'Sin datos'; };
const diPara = m => ['Consignatario', 'Documentación Importación', m.cc].filter(Boolean).join(', ');
function diFilas(){ const f = diUI().f; return [...PE.dir.filter(diVis), ...diDefecto()].filter(d=>(!f.nave || d.nave===f.nave) && (!f.viaje || f.viaje.startsWith(d.viaje+' ')) && (!f.bl || d.bl.includes(f.bl.toUpperCase()))); }
const vjsDe = nave => dat().viajes.filter(v=>v.nave===nave).map(vjLbl);
function diHtml(){
  const u = diUI(); if(u.modo!=='buscar') return diForm();
  const f = u.f;
  const campos = [F('Nave', `<input id="peDiNave" list="peDlNave" placeholder="Ingresar Nave" value="${e(f.nave)}" onchange="peDiNave()">`),
    F('Viaje', `<input id="peDiViaje" list="peDlDiVj" placeholder="Ingresar Viaje" value="${e(f.viaje)}" ${dis(f.nave)}>`),
    F('N° BL', `<input id="peDiBl" maxlength="35" placeholder="Ingrese N° BL" value="${e(f.bl)}">`)];
  const cols = [{t:'N° BL', v:d=>d.def ? `<span ${CC.propuesta('I-114','Direccionamiento por defecto','pe-def')}><button type="button" class="fac-link" onclick="peDiDef('${d.bl}')">${e(d.bl)}</button><span class="pe-tag">Por defecto</span></span>`
      : `<button type="button" class="fac-link" onclick="peDiVer('${d.id}')">${ico('ojo')}${e(d.bl)}</button>`}, {t:'Nave', k:'nave'}, {t:'Viaje', k:'viaje'},
    {t:'Puerto Operativo', v:d=>e(viaje(d.nave, d.viaje).puerto || '')}, {t:'Línea', v:d=>e(lineaNom(d.linea))}, {t:'Tipo de Despacho', v:d=>sd(d.desp)},
    {t:'Entidad Receptora Registrada', v:d=>sd(d.reg.razon)}, {t:'Entidad Receptora Aplicada', v:d=>sd(d.apl.razon)}, {t:'Fecha de Registro', v:d=>CC.fecha(d.fReg)},
    {t:'Estado de Direccionamiento', v:d=>CC.chipEstado(Object.fromEntries(DIR_ST)[d.estado], DTONO(d.estado))}, {t:'Historial de versiones', v:d=>d.def ? '' : ic('hist','Historial de versiones',`peDiHist('${d.id}')`)}];
  const rep = `<div ${CC.propuesta('I-099','Reporte y cierre de direccionamiento','fac-note')} id="peDiRep" style="margin-top:14px"><b>Reporte de direccionamiento</b> ${CC.marca('Agrega','HU-DOC-27','I-099','PEN-I099-02')}<br>
    Solo se listan BL de Importación, incluidos los que tienen direccionamiento por defecto ${CC.marca('Modifica','HU-DOC-27','I-114')}.<br>
    Cuando Cosmos cierra el direccionamiento del viaje: Diferido y SADA Extraportuario quedan Aprobados; SADA Almacén del cliente queda Preaprobado, o Rechazado si no culmina el visto bueno ${CC.marca('Agrega','HU-DOC-27','I-099','PEN-I099-01')}.
    <div style="margin-top:10px"><button type="button" class="cc-btn ghost" id="peDiRepX" onclick="peDiReporte()">Exportar reporte</button></div></div>`;
  return CC.filtros({id:'peDiF', titulo:'Consulta y Registro', sub:'Ingresar datos y/o Documentos', cols:3, campos, buscar:'peDiBuscar()', limpiar:'peDiLimpiar()', acciones:'<button type="button" class="cc-btn" id="peDiNuevo" onclick="peDiNuevo()">Nuevo</button>'})
    + (u.buscado ? rep : '')
    + (u.buscado ? CC.tablaResultados({id:'peDiRes', columnas:cols, filas:diFilas(), pagina:u.pagina, tam:u.tam, fnPagina:'peDiPagina', vacio:'No se encontraron resultados con los criterios seleccionados'}) : '')
    + dl('peDlNave', dat().naves.map(n=>n.nombre)) + dl('peDlDiVj', vjsDe(f.nave));
}
function diForm(){
  const u = diUI(), m = u.form, md = u.modo, cr = md==='crear', ed = md!=='ver', v = viaje(m.nave, m.viaje);
  const sadaCli = m.desp==='SADA Almacén del cliente';
  const puedeEditar = md==='ver' && !m.apl.razon && !esRevisor();
  const rod = P() && m.carga==='Carga rodante';
  const campos = [
    F('N° BL *', `<input id="peDiFBl" list="peDlDiBl" ${dis(cr)} maxlength="20" placeholder="Ingrese N° BL" value="${e(m.bl)}" onchange="peDiF('bl',this.value)">`),
    F(`Viaje/Nave * ${CC.marca('Corrige','HU-DOC-27','I-114')}`, `<input id="peDiFVj" list="peDlDiVjAll" ${dis(cr)} placeholder="Ingresar Viaje" value="${e(m.viaje ? vjLbl({...v, numero:m.viaje, nave:m.nave, puerto:v.puerto||''}) : '')}" onchange="peDiF('vj',this.value)">`),
    F('Servicio', CC.selector(['Liner','Tramp'], m.servicio, `${dis(cr)} onchange="peDiF('servicio',this.value)"`, 'Elegir Servicio')),
    F('Línea', `<input list="peDlLin" ${dis(cr)} placeholder="Ingresar Línea" value="${e(m.linea ? lineaNom(m.linea) : '')}" onchange="peDiF('linea',this.value)">`),
    CC.campoLectura('ETA', v.eta ? fhh(v.eta) : ''),
    F('Consignatario', `<input list="peDlCons" ${dis(cr && !esCli())} value="${e(m.cons)}" onchange="peDiF('cons',this.value)">`),
    F('Tipo de Despacho *', CC.selector(DESPACHOS, m.desp, `id="peDiFDesp" ${dis(ed)} onchange="peDiF('desp',this.value)" ${m.desp==='Diferido' ? 'title="Numeración de la carga posterior al término de operaciones de la nave."' : ''}`, 'Elegir')),
    F('Correo CC', `<input type="email" maxlength="200" ${dis(ed)} value="${e(m.cc)}" onchange="peDiF('cc',this.value)">`),
    F('Comentario', `<input maxlength="800" ${dis(ed)} value="${e(m.com)}" onchange="peDiF('com',this.value)">`),
    `<div ${CC.propuesta('I-085','Carga rodante')}>${F(`Tipo de Carga ${CC.marca('Agrega','HU-DOC-27','I-085','PEN-I085-04')}`, CC.selector(['Contenedores','Carga rodante'], m.carga||'Contenedores', `id="peDiFCarga" ${dis(cr)} onchange="peDiF('carga',this.value)"`))}</div>`];
  const reg = [F('Razón Social *', `<input id="peDiFReg" list="peDlAlm" maxlength="100" ${dis(ed && !sadaCli)} value="${e(m.reg.razon)}" onchange="peDiF('regRazon',this.value)">`),
    F('Código de Aduana *', `<input id="peDiFAdu" maxlength="4" ${dis(ed && !sadaCli)} value="${e(m.reg.aduana)}" onchange="peDiF('reg.aduana',this.value)">`),
    F('RUC *', `<input id="peDiFRuc" maxlength="20" ${dis(ed && !sadaCli)} value="${e(m.reg.ruc)}" onchange="peDiF('reg.ruc',this.value)">`)];
  const apl = [CC.campoLectura('Razón Social', m.apl.razon), CC.campoLectura('Código de Aduana', m.apl.aduana), CC.campoLectura('RUC', m.apl.ruc),
    `<div ${CC.propuesta('I-114','Tipo de Direccionamiento')} id="peDiTipo">${CC.campoLectura('Tipo de Direccionamiento', m.tipo || (cr ? 'Web' : ''))}</div>`];
  const avisos = `<div ${CC.propuesta('I-114','Avisos por correo','fac-note')} id="peDiAvisos" style="margin-top:14px"><b>Avisos por correo</b> ${CC.marca('Agrega','HU-DOC-27','I-114','PEN-I114-01')}<br>
    Al registrar y en cada cambio de estado se avisa a: ${e(diPara(m))}.${(m.avisos||[]).map(a=>`<br>${fhh(a.fecha)} · ${e(a.evento)} · ${e(a.para)}`).join('')}</div>`;
  const contsT = rod ? `<div ${CC.propuesta('I-085','Carga rodante sin contenedores','fac-note')} id="peDiRod" style="margin-top:18px">Carga rodante: no se exigen contenedores. Indica las unidades (chasis o VIN) en Comentario.</div>`
    : `<div class="fac-head" style="margin:18px 0 8px"><h3 style="font-size:15px">Contenedores ${cr ? `${CC.marca('Corrige','HU-DOC-27','I-114')} <span ${CC.propuesta('I-114','Carga automática','pe-help')}>Se cargan solos al elegir el BL.</span>` : ''}</h3><div class="fac-acts">${cr ? '<button type="button" class="cc-btn ghost" id="peDiCNuevo" onclick="peDiCont(\'add\')">Nuevo</button><button type="button" class="cc-btn ghost" onclick="peDiCont(\'del\')">Eliminar</button>' : ''}</div></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Número de Contenedor</th></tr></thead><tbody>${m.conts.map((c,i)=>`<tr><td><input type="checkbox" ${dis(cr)} onchange="PE.ui.di.selC[${i}]=this.checked"></td><td><input class="pe-cnt" maxlength="11" ${dis(cr)} placeholder="Ingrese número de contenedor" value="${e(c)}" onchange="peDiContN(${i},this.value)" style="width:200px"></td></tr>`).join('') || '<tr><td colspan="2" class="fac-empty">Sin contenedores</td></tr>'}</tbody></table></div>`;
  return `<div class="fac-card" id="peDiForm">${md!=='crear' ? chipsTodos(DIR_ST, m.estado, DTONO) : ''}
    <div class="fac-head"><h3>Datos Generales</h3><div class="fac-acts">${m.id ? `<button type="button" class="cc-btn ghost" onclick="peDiHist('${m.id}')">Historial de versiones</button>` : ''}${puedeEditar ? '<button type="button" class="cc-btn" id="peDiEditar" onclick="peDiEditar()">Editar</button>' : ''}</div></div>
    <div class="fac-g3">${campos.join('')}</div>
    <div class="fac-sec">Entidad Receptora Registrada (Cliente)</div><div class="fac-g3">${reg.join('')}</div>
    <div class="fac-sec">Entidad Receptora Aplicada</div><div class="fac-g3">${apl.join('')}</div>${contsT}${avisos}
    ${ed ? '<div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="peDiVolver()">Cancelar</button><button type="button" class="cc-btn" id="peDiGuardar" onclick="peDiGuardar()">Guardar</button></div>' : ''}</div>
    ${dl('peDlDiBl', diBLs().filter(veBL).map(b=>b.numero))}${dl('peDlDiVjAll', dat().viajes.map(vjLbl))}${dl('peDlLin', dat().lineas.map(l=>l.nombre))}${dl('peDlCons', CONS())}${dl('peDlAlm', ALMACENES.map(a=>a.razon))}`;
}
pantalla({id:'screenPeDireccionamiento', grupo:G.I, opcion:'Direccionamiento de Carga', titulo:'Direccionamiento de Carga', migas:['Inicio','Importaciones','Direccionamiento de Carga'],
  html: diHtml, reset: () => { const u = diUI(); u.modo = 'buscar'; u.sucio = false; },
  barra: () => diUI().modo==='buscar' ? null : ['Registro de Direccionamiento', ['Inicio','Importaciones','Registro de Direccionamiento'], 'peDiVolver()']});
const DI_IDS = {nave:'peDiNave', viaje:'peDiViaje', bl:'peDiBl'};
W.peDiNave = () => { const u = diUI(); leer(u, DI_IDS); u.f.viaje = ''; pinta('screenPeDireccionamiento'); };
W.peDiBuscar = () => { const u = diUI(); leer(u, DI_IDS); u.buscado = true; u.pagina = 1; pinta('screenPeDireccionamiento'); if(!diFilas().length) CC.toast('No se encontraron resultados con los criterios seleccionados', 'info'); };
W.peDiLimpiar = () => { const u = diUI(); u.f = {nave:'', viaje:'', bl:''}; u.buscado = false; pinta('screenPeDireccionamiento'); };
W.peDiPagina = (p, t) => { const u = diUI(); if(t) u.tam = t; u.pagina = p; pinta('screenPeDireccionamiento'); };
W.peDiNuevo = () => { const u = diUI(); leer(u, DI_IDS); u.modo = 'crear'; u.sucio = false; u.selC = {};
  u.form = {id:'', bl:(u.f.bl||'').toUpperCase(), nave:'', viaje:'', servicio:'', linea:'', cons:esCli() ? emp() : '', desp:'', cc:'', com:'', reg:{razon:'', aduana:'', ruc:''}, apl:{razon:'', aduana:'', ruc:''}, estado:'', conts:[]};
  if(u.form.bl) setTimeout(()=>W.peDiF('bl', u.form.bl)); abrir('screenPeDireccionamiento'); };
W.peDiVer = id => { const u = diUI(); u.modo = 'ver'; u.id = id; u.sucio = false; u.selC = {}; u.form = JSON.parse(JSON.stringify(PE.dir.find(d=>d.id===id))); abrir('screenPeDireccionamiento'); };
W.peDiEditar = () => { diUI().modo = 'editar'; pinta('screenPeDireccionamiento'); };
W.peDiVolver = () => { const u = diUI(); salirSinGuardar(u, ()=>{ if(u.modo==='editar') W.peDiVer(u.id); else { u.modo = 'buscar'; abrir('screenPeDireccionamiento'); } }); };
W.peDiF = (k, v) => {
  const u = diUI(), m = u.form; u.sucio = true;
  if(k==='bl'){ m.bl = v.toUpperCase().replace(/[^A-Z0-9./-]/g,'').slice(0,20); const b = bl(m.bl) || DI_DEMO.find(x=>x.numero===m.bl);
    if(b && esExp(b)){ CC.toast('El número de BL ingresado no corresponde a una importación en el viaje seleccionado.', 'error'); m.bl = ''; }
    else if(b && veBL(b)){ Object.assign(m, {nave:b.nave, viaje:b.viaje, linea:b.linea, cons:b.consignatario, servicio:'Liner', conts:b.contenedores.slice()}); } }
  else if(k==='vj'){ const x = dat().viajes.find(y=>vjLbl(y)===v); m.nave = x ? x.nave : ''; m.viaje = x ? x.numero : ''; if(x && !m.linea) m.linea = x.linea; }
  else if(k==='carga'){ m.carga = v; if(v==='Carga rodante') m.conts = []; }
  else if(k==='linea'){ m.linea = (dat().lineas.find(l=>l.nombre===v)||{}).codigo || v; }
  else if(k==='desp'){ m.desp = v; if(v==='SADA Almacén del cliente'){ if(!m.cons){ CC.toast('El consignatario está vacío.', 'error'); m.desp = ''; } else m.reg = {razon:m.cons, aduana:'3001', ruc:rucDe(m.cons)}; } }
  else if(k==='regRazon'){ const a = ALMACENES.find(x=>x.razon===v); m.reg = a ? {...a} : {...m.reg, razon:v}; }
  else if(k.startsWith('reg.')) m.reg[k.slice(4)] = v;
  else m[k] = v;
  pinta('screenPeDireccionamiento');
};
W.peDiCont = a => { const u = diUI(), m = u.form;
  if(a==='add'){ m.conts.push(''); u.sucio = true; return pinta('screenPeDireccionamiento'); }
  const sel = Object.keys(u.selC||{}).filter(i=>u.selC[i]).map(Number); if(!sel.length) return;
  peConf('Confirmación', '¿Estás seguro de eliminar este registro?', 'Aceptar', ()=>{ m.conts = m.conts.filter((c,i)=>!sel.includes(i)); u.selC = {}; pinta('screenPeDireccionamiento'); }); };
W.peDiContN = (i, v) => { diUI().form.conts[i] = v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,11); diUI().sucio = true; };
W.peDiGuardar = () => {
  const u = diUI(), m = u.form;
  if(!m.bl || !m.viaje || !m.desp || !m.reg.razon || !m.reg.aduana || !m.reg.ruc || (m.cc && !mailOk(m.cc))) return CC.toast('Por favor complete todos los campos obligatorios.', 'error');
  const v = viaje(m.nave, m.viaje);
  if(!v.eta || (new Date(v.eta) - new Date())/36e5 < 36) return CC.toast('El periodo de direccionamiento se encuentra cerrado.', 'error');
  if(u.modo==='crear'){
    const rod = P() && m.carga==='Carga rodante';
    m.conts = m.conts.filter(Boolean); if(!m.conts.length && !rod) return CC.toast('Se requiere agregar al menos un equipo.', 'error');
    const existe = diBLs().some(b=>b.numero===m.bl);
    const auto = existe && P() && DIR_AUTO.includes(m.desp);
    const d = {...JSON.parse(JSON.stringify(m)), id:'DR-' + String(200 + PE.dir.length).padStart(6,'0'), estado:auto ? 'APPROVED' : existe ? 'PENDING' : 'PROVISIONAL', fReg:ahora(), hist:[{fecha:ahora(), user:PE.ses.correo, tipo:'Registro', cambios:[]}]};
    if(P()){ d.tipo = 'Web'; if(auto) d.apl = {...d.reg}; d.avisos = [{fecha:ahora(), evento:'Registro', para:diPara(d)}]; if(auto) d.avisos.push({fecha:ahora(), evento:'Aprobado automáticamente', para:diPara(d)}); }
    PE.dir.unshift(d); u.id = d.id;
    CC.toast(existe ? 'Direccionamiento creado correctamente' : 'Solicitud de direccionamiento registrada. Será procesada cuando el BL exista en el sistema.', 'success');
  } else {
    const cur = PE.dir.find(d=>d.id===u.id), cambios = [['Tipo de Despacho', cur.desp, m.desp], ['Correo CC', cur.cc, m.cc], ['Comentario', cur.com, m.com], ['Entidad Receptora Registrada', cur.reg.razon, m.reg.razon]].filter(x=>x[1]!==x[2]);
    Object.assign(cur, JSON.parse(JSON.stringify(m)), {estado:cur.estado==='PROVISIONAL' ? 'PROVISIONAL' : 'PENDING'}); cur.hist.push({fecha:ahora(), user:PE.ses.correo, tipo:'Edición', cambios});
    if(P()) (cur.avisos = cur.avisos || []).push({fecha:ahora(), evento:'Actualización', para:diPara(cur)});
    CC.toast('Direccionamiento actualizado correctamente', 'success');
  }
  u.sucio = false; W.peDiVer(u.id);
};
W.peDiDef = n => { const i = $('peDiBl'); if(i) i.value = n; W.peDiNuevo(); };
W.peDiReporte = () => CC.exportarExcel('Reporte_Direccionamiento', 'Direccionamiento', ['N° BL','Contenedor','Cliente','Depósito','Vigencia','Estado','Usuario'],
  diFilas().flatMap(d=>(d.conts.length ? d.conts : ['']).map(c=>[d.bl, c, d.cons, d.apl.razon || d.reg.razon, diVig(d), Object.fromEntries(DIR_ST)[d.estado], d.def ? '' : ((d.hist[0]||{}).user || '')])));
W.addEventListener('cc:propuestas', ()=>['screenPeDireccionamiento','screenPeMatriz'].forEach(id=>{ if(PE.ses && $(id) && $(id).classList.contains('active')) pinta(id); }));
W.peDiHist = id => { const d = PE.dir.find(x=>x.id===id);
  CC.modal(`<h3>Historial de versiones</h3>${d.hist.length ? d.hist.map((h,i)=>`<div class="pe-grp"><b>V${i+1}</b> <span class="pe-tag">${e(h.tipo)}</span>${i===d.hist.length-1 ? '<span class="pe-tag">Vigente</span>' : ''} <span class="pe-help">${fhh(h.fecha)} · ${e(h.user)} · ${h.cambios.length ? `${h.cambios.length} ${h.cambios.length===1 ? 'cambio' : 'cambios'}` : 'Sin cambios registrados'}</span>
    ${h.cambios.length ? `<table class="fac-tbl" style="margin-top:8px"><thead><tr><th>Campo</th><th>Anterior</th><th>Nuevo</th></tr></thead><tbody>${h.cambios.map(c=>`<tr><td>${e(c[0])}</td><td>${c[1] ? e(c[1]) : 'Sin valor'}</td><td>${c[2] ? e(c[2]) : 'Sin valor'}</td></tr>`).join('')}</tbody></table>` : ''}</div>`).reverse().join('') : '<p class="fac-empty">Aún no hay cambios registrados para este BL.</p>'}
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md'); };

/* ---------- 9. Matriz de exportación ---------- */
const PARTIDAS = ['6109.10.00 - T-shirts de algodón','0806.10.00 - Uvas frescas','2603.00.00 - Minerales de cobre','0804.40.00 - Paltas frescas'];
const MERC = ['POLOS DE ALGODON PIMA EN CAJAS','UVAS FRESCAS RED GLOBE','CONCENTRADO DE COBRE','PALTAS HASS FRESCAS'];
const EMISION = [['ORIGINAL','Original'],['SEAWAY','Sea WayBill'],['TELEX','Telex Release']];
function mx(n){
  if(PE.mx[n]) return PE.mx[n];
  const b = bl(n), i = Math.max(0, dat().blExportacion.indexOf(b)), zim = /ZIM/.test(b.linea);
  const cs = conts(n).map(c=>({equipo:c.numero, bulto:'Cajas', partida:PARTIDAS[i % 4], peso:18450 + i*120, vgm:22250 + i*120, cant:960, vol:58.2, tara:3800,
    sellos:[{tipo:'Línea', n: zim ? `A${4261080850 + i}` : `ML${4471000 + i*37}`}, {tipo:'Aduana', n:`002PR${String(118700 + i*11).padStart(6,'0')}`}], merc:MERC[i % 4]}));
  return PE.mx[n] = {estado:b.estado, version:1, provisional:false, ediciones:1, ultEd:b.emision,
    partes:{emb:{razon:b.embarcador, ruc:rucDe(b.embarcador), dir:'AV. INDUSTRIAL 1450, ATE\nLIMA, PERU'}, cons:{razon:'NORDIC TRADING IMPORTS B.V.', dir:'HAVENSTRAAT 120\n3011 ROTTERDAM, NL'},
      not1:{razon:'NORDIC TRADING IMPORTS B.V.', dir:'HAVENSTRAAT 120\n3011 ROTTERDAM, NL'}, not2:{razon:'', dir:''}},
    gen:{linea:lineaNom(b.linea), exportRef:'', ff:'', condicion:'PREPAID', emision:'ORIGINAL', tipoCarga:'Contenedor lleno (FCL)'},
    conts:cs, hist:[{v:1, tipo:'Matriz', fecha:b.emision+'T10:00', user:'exportador@costaverde.example', cambios:[]}]};
}
const mxUI = () => PE.ui.mx || (PE.ui.mx = {modo:'buscar', f:{nave:'', viaje:'', ruc:'', reserva:''}, buscado:false, pagina:1, tam:10});
const editable = st => /APROBADO|POR REVISAR/.test(st);
/* Regla HU-FAC-07: misma compuerta que Pago (NotNegotiableDownloadGate) */
function gateNN(n){
  const b = bl(n); if(!b || !esExp(b)) return 'El BL No Negociable sólo se emite para BL de exportación.';
  const m = mx(n); if(m.gen.emision!=='ORIGINAL') return "El tipo de emisión de BL debe ser 'Original'";
  if(m.estado==='ANULADO') return 'El BL No Negociable no se emite para un BL anulado.';
  if(!(m.estado==='TRANSMITIDO A SUNAT' || LISTO.has(n))) return 'El BL No Negociable requiere que el BL esté aceptado por SUNAT o en «Listo para facturar».';
  const docs = PE.liq.filter(l=>l.bl===n && l.tipo==='Documentación' && l.estado!=='Anulado');
  if(!docs.length) return 'La documentación del BL no está liquidada.';
  if(docs.some(l=>l.estado!=='Pago confirmado')) return 'Pendiente pago de documentación.';
  return '';
}
W.peNN = n => { const g = gateNN(n); if(g) return CC.toast(g, 'error'); CC.toast(`Descarga simulada: BL No Negociable ${n}.pdf`, 'success'); };
function mxFilas(){ const f = mxUI().f; return dat().blExportacion.filter(b=>veBL(b) && (!f.nave || b.nave===f.nave) && (!f.viaje || f.viaje.startsWith(b.viaje+' '))
  && (!f.ruc || rucDe(b.embarcador).includes(f.ruc)) && (!f.reserva || b.numero.includes(f.reserva.toUpperCase()))); }
function mxHtml(){
  const u = mxUI(); if(u.modo!=='buscar') return mxForm();
  const f = u.f, ok = !!(f.nave || f.ruc || f.reserva);
  const campos = [F('Nave', `<input id="peMxNave" list="peDlNave" maxlength="100" placeholder="Ingresar nave" value="${e(f.nave)}" oninput="peMxChk()" onchange="peMxNave()">`),
    F('Número de Viaje', `<input id="peMxViaje" list="peDlMxVj" maxlength="10" placeholder="Ingresar número de viaje" value="${e(f.viaje)}" ${dis(f.nave)}>`),
    F('RUC Shipper', `<input id="peMxRuc" maxlength="11" placeholder="Ingresar RUC Shipper" value="${e(f.ruc)}" oninput="peMxChk()">`),
    F('Número de Reserva', `<input id="peMxRes" maxlength="25" placeholder="Ingresar número de reserva" value="${e(f.reserva)}" oninput="peMxChk()">`)];
  const filt = CC.filtros({id:'peMxF', titulo:'Consulta y carga', sub:'Ingresar datos', cols:4, campos, buscar:'peMxBuscar()', limpiar:'peMxLimpiar()'})
    .replace('onclick="peMxBuscar()"', `id="peMxB" onclick="peMxBuscar()" ${dis(ok)}`).replace('onclick="peMxLimpiar()"', `id="peMxL" onclick="peMxLimpiar()" ${dis(ok)}`);
  const cols = [{t:'Número Reserva', v:b=>`<button type="button" class="fac-link" onclick="peMxVer('${b.numero}')">${ico('ojo')}${b.numero}</button>`},
    {t:'ATA', v:b=>fh((viaje(b.nave,b.viaje).eta||'').slice(0,10))}, {t:'Nombre de Nave', k:'nave'}, {t:'Número de Viaje', k:'viaje'}, {t:'Recalada', k:'puertoCarga'},
    {t:'Puerto de Descarga', k:'puertoDescarga'}, {t:'RUC Shipper', v:b=>sd(rucDe(b.embarcador))}, {t:'Razón Social', k:'embarcador'}, {t:'Última Edición', v:b=>fh(mx(b.numero).ultEd)},
    {t:'Cantidad de Ediciones', v:b=>`${mx(b.numero).ediciones} ${ic('hist','Ver versiones',`peMxHist('${b.numero}')`)}`},
    {t:`Descargar ${CC.etiquetaPropuesta('HU-FAC-07','BL No Negociable en Matriz')}`, v:b=>`<span class="fac-rowacts">${mx(b.numero).estado!=='ANULADO' ? ic('imp','Descargar Borrador',`peDescarga('Borrador ${b.numero}.pdf')`) : ''}<span class="cc-prop pe-nn">${ic('doc', gateNN(b.numero) || 'Descargar BL No Negociable', `peNN('${b.numero}')`, !!gateNN(b.numero))}</span></span>`}];
  return filt + (u.buscado ? CC.tablaResultados({id:'peMxRes', columnas:cols, filas:mxFilas(), pagina:u.pagina, tam:u.tam, fnPagina:'peMxPagina', exportar:'peMxExportar()', vacio:'No se encontraron resultados con los criterios seleccionados'}) : '')
    + dl('peDlNave', dat().naves.map(n=>n.nombre)) + dl('peDlMxVj', vjsDe(f.nave));
}
const zimProblemas = m => { if(!/ZIM/.test(m.gen.linea)) return [];
  return [['Embarcador','emb'],['Consignatario','cons'],['Notificante Principal','not1']].flatMap(([t,k])=>{ const p = m.partes[k], out = [];
    if(p.razon.length > 35 || /\n/.test(p.razon)) out.push(`${t}: la razón social debe ocupar una sola fila de máximo 35 caracteres, incluidos los espacios.`);
    const ls = String(p.dir||'').split('\n'); if(!p.dir || ls.length > 4 || ls.some(l=>l.length > 35)) out.push(`${t}: la dirección es obligatoria y admite máximo 4 filas de 35 caracteres cada una.`);
    return out; }); };
function mxForm(){
  const u = mxUI(), ver = u.modo==='ver', m = ver ? mx(u.n) : u.form, ed = !ver, b = bl(u.n), cur = mx(u.n);
  const inp = (l, path, val, ok) => F(l, `<input ${dis(ed && ok)} value="${e(val)}" onchange="peMxF('${path}',this.value)">`);
  const ta = (l, path, val) => F(l, `<textarea rows="4" ${dis(ed)} onchange="peMxF('${path}',this.value)">${e(val)}</textarea><span class="pe-help">Máx 35 caracteres por línea · Máx 4 líneas</span>`);
  const card = (t, html) => `<div class="fac-card"><h3 style="margin-bottom:14px">${t}</h3><div class="fac-g3">${html}</div></div>`;
  const acts = ver ? [editable(cur.estado) && !esRevisor() ? '<button type="button" class="cc-btn" id="peMxEditar" onclick="peMxEditar()">Editar</button>' : '',
    cur.estado==='POR REVISAR' && cur.version>=1 && !esRevisor() ? '<button type="button" class="cc-btn ghost" id="peMxAprobar" onclick="peMxAprobar()">Aprobar</button>' : ''].join('') : '';
  const emis = m.gen.condicion==='PREPAID' ? EMISION.slice(0,1) : m.gen.condicion==='COLLECT' ? EMISION : [];
  const zim = ed ? zimProblemas(m) : [];
  const cutoff = b.cutoff ? `<div class="fac-note warn">Cutoff documentario: ${CC.fecha(b.cutoff)} 18:00. Guarde final antes de esta fecha.</div>` : '';
  const ct = `<div class="fac-card" id="peMxConts"><div class="fac-head"><h3>Detalle de Contenedores</h3>${ed ? '<div class="fac-acts"><button type="button" class="cc-btn ghost" id="peMxAddC" onclick="peMxCont(-1)">Agregar Contenedor</button></div>' : ''}</div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Equipo</th><th>Tipo de Bulto</th><th class="num">Cantidad</th><th class="num">Volumen (M3)</th><th class="num">Peso Bruto (KG) ${corrige('Se guardaba como peso neto')}</th><th class="num">Tara (KG)</th>${ed ? '<th>Acciones</th>' : ''}</tr></thead><tbody>
    ${m.conts.map((c,i)=>`<tr><td>${e(c.equipo)}</td><td>${e(c.bulto)}</td><td class="num">${c.cant}</td><td class="num">${c.vol}</td><td class="num">${CC.dinero(c.peso)}</td><td class="num">${CC.dinero(c.tara)}</td>${ed ? `<td class="fac-rowacts">${ic('lap','Editar',`peMxCont(${i})`)}${ic('tacho','Eliminar',`peMxContDel(${i})`)}</td>` : ''}</tr>`).join('')
      || `<tr><td colspan="7" class="fac-empty">No hay contenedores agregados aún ${ed ? '<br><button type="button" class="cc-btn ghost" style="margin-top:8px" onclick="peMxCont(-1)">Agregar Primer Contenedor</button>' : ''}</td></tr>`}</tbody></table></div></div>`;
  const vmax = cur.version;
  return `<div class="fac-card"><div class="fac-head"><div class="pe-pills"><span class="cc-chip ${m.provisional ? 'on' : ''}">PROVISIONAL</span><span class="cc-chip ${!m.provisional ? 'on' : ''}">FINAL</span>
      <button type="button" class="fac-link" onclick="peMxHist('${u.n}')">Versión ${vmax} · Ver historial</button>${ed ? `<span class="pe-help">Al guardar como final se creará la versión ${vmax+1}.</span>` : ''}</div><div class="fac-acts">${acts}</div></div>
    ${zim.length ? `<div class="fac-note err">Revise los datos de las partes del BL de Zim antes de guardar.<br>${zim.map(e).join('<br>')}</div>` : ''}</div>
    ${card('Embarcador', CC.campoLectura('RUC *', m.partes.emb.ruc) + CC.campoLectura('Razón Social *', m.partes.emb.razon) + ta('Dirección *','partes.emb.dir', m.partes.emb.dir))}
    ${card('Consignatario', inp('Razón Social *','partes.cons.razon', m.partes.cons.razon, true) + ta('Dirección *','partes.cons.dir', m.partes.cons.dir))}
    ${card('Notificante Principal', inp('Razón Social *','partes.not1.razon', m.partes.not1.razon, true) + ta('Dirección *','partes.not1.dir', m.partes.not1.dir))}
    ${card(`Notificante Secundario (Opcional) ${corrige('Sin asterisco: no es obligatorio')}`, inp('Razón Social','partes.not2.razon', m.partes.not2.razon, true) + ta('Dirección','partes.not2.dir', m.partes.not2.dir))}
    <div class="fac-card"><h3 style="margin-bottom:14px">Datos Generales</h3><div class="fac-g4">
      ${CC.campoLectura('N° Booking', 'BK' + u.n.slice(-7))}${CC.campoLectura('Número Reserva', u.n)}
      ${F('Línea *', `<input list="peDlLin" ${dis(ed)} value="${e(m.gen.linea)}" onchange="peMxF('gen.linea',this.value)">`)}
      ${CC.campoLectura('Puerto de origen', b.puertoCarga)}${CC.campoLectura('Puerto de embarque', b.puertoCarga)}${CC.campoLectura('Puerto de descarga', b.puertoDescarga)}${CC.campoLectura('Puerto de destino', b.puertoDescarga)}
      ${F('Export References', `<input id="peMxRef" maxlength="200" ${dis(ed)} value="${e(m.gen.exportRef)}" onchange="peMxF('gen.exportRef',this.value)">`)}
      ${F('Freight Forwarder', `<input maxlength="200" ${dis(ed)} value="${e(m.gen.ff)}" onchange="peMxF('gen.ff',this.value)">`)}
      ${F('Condición de Pago *', CC.selector([['PREPAID','Prepagado'],['COLLECT','Por Cobrar']], m.gen.condicion, `${dis(ed)} onchange="peMxF('gen.condicion',this.value)"`))}
      ${F('Tipo de Emisión *', CC.selector(emis, m.gen.emision, `${dis(ed)} onchange="peMxF('gen.emision',this.value)"`, ''))}
      ${CC.campoLectura('Puerto de Pago *', b.puertoCarga)}
      ${F('Tipo de Carga *', CC.selector(['Contenedor lleno (FCL)','Carga consolidada (LCL)','Carga refrigerada'], m.gen.tipoCarga, `${dis(ed)} onchange="peMxF('gen.tipoCarga',this.value)"`, 'Elegir tipo de carga'))}
      ${CC.campoLectura('Cantidad', sum(m.conts,'cant'))}${CC.campoLectura('Volumen (M3)', sum(m.conts,'vol'))}</div></div>
    ${ct}${cutoff}${txCard(m, u.n)}
    ${ed ? `<div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="peMxVolver()">Cancelar</button><button type="button" class="cc-btn ghost" id="peMxProv" onclick="peMxProvisional()" ${dis(editable(cur.estado) && vmax<=1)}>Guardar Provisional</button><button type="button" class="cc-btn" id="peMxFinal" onclick="peMxFinal()" ${dis(m.conts.length)}>Guardar Final</button></div>` : ''}
    ${dl('peDlLin', dat().lineas.map(l=>l.nombre))}`;
}
pantalla({id:'screenPeMatriz', grupo:G.E, opcion:'Matriz', titulo:'Matriz', migas:['Inicio','Exportaciones','Matriz'],
  html: mxHtml, reset: () => { const u = mxUI(); u.modo = 'buscar'; u.sucio = false; },
  barra: () => { const u = mxUI(); if(u.modo==='buscar') return null; const t = u.modo==='ver' ? 'Ver Matriz' : 'Editar Matriz'; return [`${t} · ${u.n}`, ['Inicio','Exportaciones','Matriz',t], 'peMxVolver()']; }});
const MX_IDS = {nave:'peMxNave', viaje:'peMxViaje', ruc:'peMxRuc', reserva:'peMxRes'};
W.peMxChk = () => { const ok = ['peMxNave','peMxRuc','peMxRes'].some(id=>($(id)||{}).value); ['peMxB','peMxL'].forEach(id=>{ const b = $(id); if(b) b.disabled = !ok; }); };
W.peMxNave = () => { const u = mxUI(); leer(u, MX_IDS); u.f.viaje = ''; pinta('screenPeMatriz'); };
W.peMxBuscar = () => { const u = mxUI(); leer(u, MX_IDS); if(!(u.f.nave || u.f.ruc || u.f.reserva)) return; u.buscado = true; u.pagina = 1; pinta('screenPeMatriz'); if(!mxFilas().length) CC.toast('No se encontraron resultados con los criterios seleccionados', 'info'); };
W.peMxLimpiar = () => { const u = mxUI(); u.f = {nave:'', viaje:'', ruc:'', reserva:''}; u.buscado = false; pinta('screenPeMatriz'); };
W.peMxPagina = (p, t) => { const u = mxUI(); if(t) u.tam = t; u.pagina = p; pinta('screenPeMatriz'); };
W.peMxExportar = () => CC.exportarExcel('Matriz_Exportacion', 'Matriz', ['Número Reserva','ATA','Nombre de Nave','Número de Viaje','Recalada','Puerto de Descarga','RUC Shipper','Razón Social','Última Edición','Cantidad de Ediciones'],
  mxFilas().map(b=>[b.numero, fh((viaje(b.nave,b.viaje).eta||'').slice(0,10)), b.nave, b.viaje, b.puertoCarga, b.puertoDescarga, rucDe(b.embarcador), b.embarcador, fh(mx(b.numero).ultEd), mx(b.numero).ediciones]));
W.peMxVer = n => { const u = mxUI(); u.modo = 'ver'; u.n = n; u.sucio = false; abrir('screenPeMatriz'); };
W.peMxEditar = () => { const u = mxUI(), m = mx(u.n); if(!editable(m.estado)) return CC.toast('El BL no se puede editar en su estado actual.', 'error');
  u.modo = 'editar'; u.form = JSON.parse(JSON.stringify(m)); u.orig = JSON.stringify(m); pinta('screenPeMatriz'); };
W.peMxVolver = () => { const u = mxUI(); salirSinGuardar(u, ()=>{ if(u.modo==='editar'){ u.modo = 'ver'; pinta('screenPeMatriz'); } else { u.modo = 'buscar'; abrir('screenPeMatriz'); } }); };
W.peMxF = (path, v) => { const u = mxUI(), ks = path.split('.'); let o = u.form; ks.slice(0,-1).forEach(k=>o = o[k]); o[ks[ks.length-1]] = v; u.sucio = true;
  if(path==='gen.condicion'){ const ok = (v==='PREPAID' ? EMISION.slice(0,1) : EMISION).map(x=>x[0]); if(!ok.includes(u.form.gen.emision)) u.form.gen.emision = ok[0]; }
  pinta('screenPeMatriz'); };
const contCompleto = c => c.peso>0 && c.vgm>0 && c.tara>0 && c.bulto && c.partida && c.equipo && c.sellos.length && c.merc;
function mxValida(m){
  if(!m.partes.emb.dir || !m.partes.cons.razon.trim() || !m.partes.cons.dir || !m.partes.not1.razon.trim() || !m.partes.not1.dir || !m.gen.linea || !m.gen.condicion || !m.gen.emision || !m.gen.tipoCarga)
    return 'Por favor complete todos los campos obligatorios';
  if(!m.conts.every(contCompleto)) return 'Por favor complete toda la información de contenedores';
  if(zimProblemas(m).length) return 'Revise los datos de las partes del BL de Zim antes de guardar.';
  return '';
}
/* Prototipo HU-DOC-40 (I-183): campos que exige la transmisión a SUNAT. Lista ilustrativa hasta cerrar PEN-TXC-01 */
const CLI = 'Cliente (portal externo)';
const TX_CAMPOS = [['RUC y Razón Social del Embarcador','Maestro de socios', m=>m.partes.emb.ruc && m.partes.emb.razon], ['Dirección del Embarcador', CLI, m=>m.partes.emb.dir],
  ['Consignatario y dirección', CLI, m=>m.partes.cons.razon.trim() && m.partes.cons.dir], ['Notificante Principal y dirección', CLI, m=>m.partes.not1.razon.trim() && m.partes.not1.dir],
  ['Condición de Pago y Tipo de Emisión', CLI, m=>m.gen.condicion && m.gen.emision], ['Puertos de embarque y descarga', 'Reserva (portal interno)', ()=>true],
  ['Contenedores: partida, peso bruto, bultos, precintos y mercadería', CLI, m=>m.conts.length && m.conts.every(contCompleto)]];
const txFaltan = m => TX_CAMPOS.filter(c=>!c[2](m)).map(c=>c[0]);
function txCard(m, n){
  const falt = txFaltan(m), tx = (mx(n).tx || []).slice(-1)[0];
  const est = tx ? `Envío ${tx.id} del ${fhh(tx.fecha)} (versión ${tx.v}): enviado, en espera de respuesta de SUNAT.` : falt.length ? `Pendiente de datos. No se transmite hasta completar: ${falt.join(', ')}.` : 'Datos completos. Se transmite solo al guardar como final.';
  return `<div ${CC.propuesta('I-183','Transmisión SUNAT desde la Matriz','fac-card')} id="peMxTx"><h3 style="margin-bottom:12px">Campos para transmitir a SUNAT ${CC.marca('Agrega','HU-DOC-40','I-183','PEN-TXC-01')}</h3>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>Campo</th><th>Fuente</th><th>Se replica en</th><th>Estado</th></tr></thead><tbody>
    ${TX_CAMPOS.map(c=>`<tr${c[2](m) ? '' : ' class="pe-bad"'}><td>${e(c[0])}</td><td>${e(c[1])}</td><td>BL del portal interno y mensaje a SUNAT</td><td>${c[2](m) ? 'Completo' : 'Falta'}</td></tr>`).join('')}</tbody></table></div>
    <div class="fac-note" style="margin-top:12px">Al guardar como final, estos datos se copian al mismo BL del portal interno, sin volver a digitarlos. Con todos completos, la transmisión a SUNAT se dispara sola, una vez por versión. El envío no es la aceptación de SUNAT. ${CC.marca('Agrega','HU-DOC-40','I-183','PEN-TXC-02')}</div>
    <p class="pe-help" id="peMxTxEst" style="margin-top:8px"><b>Estado de transmisión:</b> ${e(est)}</p></div>`;
}
const MX_CAMPOS = [['Dirección del Embarcador','partes.emb.dir'],['Consignatario','partes.cons.razon'],['Dirección del Consignatario','partes.cons.dir'],['Notificante Principal','partes.not1.razon'],
  ['Notificante Secundario','partes.not2.razon'],['Línea','gen.linea'],['Export References','gen.exportRef'],['Freight Forwarder','gen.ff'],['Condición de Pago','gen.condicion'],['Tipo de Emisión','gen.emision'],['Tipo de Carga','gen.tipoCarga']];
const pathGet = (o, p) => p.split('.').reduce((a,k)=>a && a[k], o);
function mxAplicar(tipo, final){
  const u = mxUI(), m = mx(u.n), nuevo = u.form, viejo = JSON.parse(u.orig);
  const cambios = MX_CAMPOS.map(([t,p])=>[t, pathGet(viejo,p), pathGet(nuevo,p)]).filter(x=>String(x[1]||'')!==String(x[2]||''));
  if(JSON.stringify(viejo.conts)!==JSON.stringify(nuevo.conts)) cambios.push(['Contenedores', `${viejo.conts.length} equipo(s)`, `${nuevo.conts.length} equipo(s)`]);
  Object.assign(m, {partes:nuevo.partes, gen:nuevo.gen, conts:nuevo.conts, provisional:!final, ultEd:hoyISO()}); m.ediciones++;
  if(final){ m.version++; m.hist.push({v:m.version, tipo:m.version===1 ? 'Matriz' : `Corrector ${m.version-1}`, fecha:ahora(), user:PE.ses.correo, cambios});
    if(P() && !txFaltan(m).length) (m.tx = m.tx || []).push({id:`TX-${u.n.slice(-5)}-${m.version}`, v:m.version, fecha:ahora()}); }
  else m.hist.push({v:m.version, tipo:'Provisional', fecha:ahora(), user:PE.ses.correo, cambios});
  u.sucio = false; u.modo = 'ver'; pinta('screenPeMatriz');
  CC.toast(final ? 'Datos finales guardados exitosamente' : 'Datos provisionales guardados exitosamente', 'success');
}
W.peMxProvisional = () => { const err = mxValida(mxUI().form); if(err) return CC.toast(err, 'error');
  peConf('Guardar Provisional', '¿Está seguro que desea guardar como PROVISIONAL?', 'Guardar', ()=>mxAplicar('Provisional', false)); };
W.peMxFinal = () => {
  const u = mxUI(), m = mx(u.n), err = mxValida(u.form), falt = P() ? txFaltan(u.form) : [];
  if(err) return CC.toast(falt.length ? `${err}. Para transmitir a SUNAT falta: ${falt.join(', ')}.` : err, 'error');
  const b = bl(u.n), n = m.version + 1;
  const cobro = () => { const fuera = b.cutoff && hoyISO() > b.cutoff;
    const msg = m.version>=3 ? 'Ha alcanzado el límite. El registro de correctores adicionales requerirá un cargo adicional'
      : fuera ? (m.version===0 ? 'Registro de matriz fuera de plazo. El registro de esta matriz requerirá un cargo adicional.' : 'Corrección fuera de plazo. El registro de este corrector requerirá un cargo adicional')
      : '¿Está seguro que desea guardar como FINAL?';
    peConf('Guardar Final', msg, 'Guardar', ()=>mxAplicar('Final', true)); };
  if(!u.sucio && !m.provisional) peConf('Guardar como final sin cambios', `No has modificado ningún dato de esta reserva. Si continúas, se creará igualmente la versión ${n} con la misma información que la versión actual. ¿Deseas continuar?`, 'Guardar de todos modos', ()=>setTimeout(cobro, 50));
  else cobro();
};
W.peMxAprobar = () => peConf('Aprobar BL', '¿Está seguro que desea aprobar este BL? Esta acción no se puede deshacer.', 'Confirmar', ()=>{ const m = mx(mxUI().n); m.estado = 'APROBADO'; CC.toast('BL aprobado con éxito', 'success'); pinta('screenPeMatriz'); });
W.peMxHist = n => { const m = mx(n), hs = m.hist.slice().reverse();
  CC.modal(`<h3>Historial de versiones</h3>${hs.length ? hs.map((h,i)=>`<div class="pe-grp"><b>V${h.v}</b> <span class="pe-tag">${e(h.tipo)}</span>${i===0 ? '<span class="pe-tag">Vigente</span>' : ''} <span class="pe-help">${fhh(h.fecha)} · ${e(h.user)} · ${h.cambios.length ? `${h.cambios.length} ${h.cambios.length===1 ? 'cambio' : 'cambios'}` : 'Sin cambios registrados'}</span>
    ${h.cambios.length ? `<table class="fac-tbl" style="margin-top:8px"><thead><tr><th>Campo</th><th>Anterior</th><th>Nuevo</th></tr></thead><tbody>${h.cambios.map(c=>`<tr><td>${e(c[0])}</td><td class="pe-wrap">${c[1] ? e(c[1]) : 'Sin valor'}</td><td class="pe-wrap">${c[2] ? e(c[2]) : 'Sin valor'}</td></tr>`).join('')}</tbody></table>` : ''}</div>`).join('') : '<p class="fac-empty">Aún no has guardado esta reserva como final.</p>'}
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md'); };
function mxContModal(){
  const u = mxUI(), c = u.cd.data, zim = /ZIM/.test(u.form.gen.linea);
  CC.modal(`<h3>${u.cd.i<0 ? 'Agregar Contenedor' : 'Editar Contenedor'}</h3>
    <div class="fac-sec">Carga</div><div class="fac-g3">
      ${F('Tipo de Bulto *', CC.selector(['Cajas','Pallets','Sacos','Bultos'], c.bulto, `onchange="peMxCd('bulto',this.value)"`, 'Seleccione'))}
      ${F('Partida Arancelaria *', `<input list="peDlPart" value="${e(c.partida)}" onchange="peMxCd('partida',this.value)">`, 'fac-span2')}
      ${F('Peso Bruto (KG) *', `<input type="number" min="0.01" step="0.001" value="${c.peso}" onchange="peMxCd('peso',+this.value)">`)}
      ${F('VGM (KG) *', `<input type="number" min="0" value="${c.vgm}" onchange="peMxCd('vgm',+this.value)">`)}
      ${F('Cantidad *', `<input type="number" min="0" value="${c.cant}" onchange="peMxCd('cant',+this.value)">`)}
      ${F('Volumen (M3)', `<input type="number" min="0" step="0.01" value="${c.vol}" onchange="peMxCd('vol',+this.value)">`)}</div>
    <div class="fac-sec">Información del Equipo</div><div class="fac-g3">
      ${F('Número de Equipo *', `<input id="peCdEq" maxlength="11" value="${e(c.equipo)}" placeholder="ABCU1234567" onchange="peMxCd('equipo',this.value.toUpperCase())">`)}
      ${F('Tara (KG) *', `<input type="number" min="0" value="${c.tara}" onchange="peMxCd('tara',+this.value)">`)}</div>
    <div class="fac-sec">Sellos</div><table class="fac-tbl"><thead><tr><th>Tipo de Sello</th><th>Número de Sello</th><th></th></tr></thead><tbody>
      ${c.sellos.map((s,i)=>`<tr><td>${CC.selector(['Línea','Aduana','Otro'], s.tipo, `onchange="peMxSello(${i},'tipo',this.value)"`)}</td><td><input maxlength="15" style="width:160px" value="${e(s.n)}" onchange="peMxSello(${i},'n',this.value)"> <span class="pe-help">${s.n.length}/15</span></td><td>${ic('tacho','Eliminar',`peMxSello(${i},'del')`)}</td></tr>`).join('')}</tbody></table>
    <div class="fac-btns" style="position:static;justify-content:flex-start"><button type="button" class="cc-btn ghost" onclick="peMxSello(-1,'add')">Agregar</button></div>
    <div class="pe-help">Sello de aduana: 3 dígitos, 2 letras y 6 dígitos (ej. 002PR118796).${zim ? ' Sello de línea de ZIM: letra A y 10 dígitos (ej. A4261080850).' : ''}</div>
    <div class="fac-sec">Detalle de Mercadería</div><div class="fac-f"><label>Detalle de Mercadería *</label><textarea rows="4" maxlength="4000" onchange="peMxCd('merc',this.value)">${e(c.merc)}</textarea></div>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="peCdOk" onclick="peMxCdGuardar()">Guardar</button></div>${dl('peDlPart', PARTIDAS)}`, 'lg');
}
W.peMxCont = i => { const u = mxUI(); u.cd = {i, data: i<0 ? {equipo:'', bulto:'', partida:'', peso:0, vgm:0, cant:0, vol:0, tara:0, sellos:[{tipo:'Línea', n:''},{tipo:'Aduana', n:''}], merc:''} : JSON.parse(JSON.stringify(u.form.conts[i]))}; mxContModal(); };
W.peMxCd = (k, v) => { mxUI().cd.data[k] = v; };
W.peMxSello = (i, k, v) => { const s = mxUI().cd.data.sellos; if(k==='add') s.push({tipo:'Otro', n:''}); else if(k==='del') s.splice(i,1); else s[i][k] = k==='n' ? v.toUpperCase() : v; mxContModal(); };
W.peMxCdGuardar = () => {
  const u = mxUI(), c = u.cd.data, zim = /ZIM/.test(u.form.gen.linea);
  for(const [k,t] of [['bulto','Tipo de Bulto'],['partida','Partida Arancelaria'],['peso','Peso Bruto (KG)'],['vgm','VGM (KG)'],['cant','Cantidad'],['equipo','Número de Equipo'],['tara','Tara (KG)'],['merc','Detalle de Mercadería']])
    if(!c[k] || (typeof c[k]==='number' && c[k]<=0)) return CC.toast(`Campo obligatorio: ${t}`, 'error');
  if(!/^[A-Z]{4}\d{7}$/.test(c.equipo)) return CC.toast('El número de equipo debe tener 4 letras y 7 dígitos.', 'error');
  if(u.form.conts.some((x,i)=>i!==u.cd.i && x.equipo===c.equipo)) return CC.toast(`El equipo ${c.equipo} ya está agregado a esta Reserva`, 'error');
  if(!c.sellos.length) return CC.toast('Campo obligatorio: Sellos', 'error');
  if(!c.sellos.some(s=>s.tipo==='Línea') || !c.sellos.some(s=>s.tipo==='Aduana')) return CC.toast('Los sellos de Aduana y Línea Naviera son obligatorios', 'error');
  for(const s of c.sellos){
    if(!s.n) return CC.toast('Campo obligatorio', 'error');
    if(!/^[A-Z0-9]+$/.test(s.n)) return CC.toast('Solo letras y números (sin espacios ni caracteres especiales)', 'error');
    if(s.n.length < 4) return CC.toast('Mínimo 4 caracteres', 'error');
    if(s.tipo==='Aduana' && !/^\d{3}[A-Z]{2}\d{6}$/.test(s.n)) return CC.toast('El sello de aduanas debe tener 3 dígitos, 2 letras y 6 dígitos (ej. 002PR118796)', 'error');
    if(s.tipo==='Línea' && zim && !/^A\d{10}$/.test(s.n)) return CC.toast('El sello de línea de ZIM debe ser la letra A seguida de 10 dígitos (ej. A4261080850)', 'error');
  }
  if(new Set(c.sellos.map(s=>s.n)).size !== c.sellos.length) return CC.toast('Este número de sello está repetido en la lista', 'error');
  if(u.cd.i<0) u.form.conts.push(c); else u.form.conts[u.cd.i] = c;
  u.sucio = true; CC.cerrarModal(); CC.toast(u.cd.i<0 ? 'Contenedor agregado exitosamente' : 'Contenedor actualizado exitosamente', 'success'); pinta('screenPeMatriz');
};
W.peMxContDel = i => peConf('Eliminar Contenedor', '¿Está seguro de que desea eliminar este contenedor? Esta acción no se puede deshacer.', 'Eliminar', ()=>{ const u = mxUI(); u.form.conts.splice(i,1); u.sucio = true; CC.toast('Contenedor eliminado exitosamente', 'success'); pinta('screenPeMatriz'); });

/* ---------- 10. Desglose ---------- */
const DGST = [['PENDIENTE','Pendiente'],['APROBADO','Aprobado'],['RECHAZADO','Rechazado']];
const DGTONO = k => ({APROBADO:'aprobada', RECHAZADO:'rechazada'})[k] || 'pendiente';
const DG_TIPOS = ['Plantilla de Desglose','Carta de Desglose','MBL Endosado'];
const dgUI = () => PE.ui.dg || (PE.ui.dg = {modo:'buscar', f:{bl:'', estado:''}, buscado:false, abiertos:{}, pagina:1, tam:10});
const dgElegibles = () => BLS().filter(b=>veBL(b) && (LISTO.has(b.numero) || b.estado==='TRANSMITIDO A SUNAT') && (esExp(b) || lineaLiberada(b.numero))
  && !PE.des.some(d=>d.bl===b.numero && /PENDIENTE|APROBADO/.test(d.estado)));
function dgFilas(){ const f = dgUI().f; return PE.des.filter(d=>veBL(bl(d.bl)) && (!f.bl || d.bl.includes(f.bl.toUpperCase())) && (!f.estado || d.estado===f.estado)); }
function dgHtml(){
  const u = dgUI(); if(u.modo!=='buscar') return dgForm();
  const f = u.f, ok = !!(f.bl || f.estado);
  const acc = `<button type="button" class="cc-btn" id="peDgNuevo" onclick="peDgNuevo()">Nuevo</button><button type="button" class="cc-btn ghost" onclick="peDescarga('Manual de uso de Desglose.pdf')">Manual de uso</button><button type="button" class="cc-btn ghost" onclick="peDgPlantilla()">Plantilla de Desglose</button>`;
  const filt = CC.filtros({id:'peDgF', titulo:'Buscar Desglose', sub:'Ingresar datos para buscar', cols:3, acciones:acc, buscar:'peDgBuscar()', limpiar:'peDgLimpiar()',
    campos:[F('N° BL Master', `<input id="peDgBl" maxlength="25" placeholder="Ingrese N° BL Master" value="${e(f.bl)}" oninput="peDgChk()">`), F('Estado', CC.selector(DGST, f.estado, 'id="peDgEst" onchange="peDgChk()"', 'Elegir Estado'))]})
    .replace('onclick="peDgBuscar()"', `id="peDgB" onclick="peDgBuscar()" ${dis(ok)}`).replace('onclick="peDgLimpiar()"', `id="peDgL" onclick="peDgLimpiar()" ${dis(ok)}`);
  if(!u.buscado) return filt;
  const filas = dgFilas(), pg = CC.paginar(filas, u.pagina, u.tam);
  const rows = pg.filas.map(d=>{ const b = bl(d.bl), ab = u.abiertos[d.id];
    return `<tr><td>${ic(ab ? 'menos' : 'mas', 'Ver BLs Hijos', `peDgExp('${d.id}')`)}</td><td><button type="button" class="fac-link" onclick="peDgVer('${d.id}')">${e(d.bl)}</button><div class="pe-help">Indicador: ${b.indicador}</div></td>
      <td>${e(b.viaje)}</td><td>${e(b.nave)}</td><td>${e(parte(b))}</td><td>${e(viaje(b.nave,b.viaje).puerto||'')}</td><td>${e(lineaNom(b.linea))}</td><td>${fh(d.fReg.slice(0,10))}</td><td>${sd(d.fRes ? CC.fecha(d.fRes) : '')}</td>
      <td>${CC.chipEstado(Object.fromEntries(DGST)[d.estado], DGTONO(d.estado))}</td><td>${ic('doc','Desglose',`peDgVer('${d.id}')`)}</td></tr>`
      + (ab ? `<tr><td colspan="11" class="fac-expand"><div class="fac-expand-in"><div class="fac-sec">BLs Hijos</div><table class="fac-tbl"><thead><tr><th>N° BL Hijo</th><th>Consignatario/Embarcador</th><th>Cant. Bultos / Cntrs o Vins</th></tr></thead><tbody>${d.hijos.map(h=>`<tr><td>${e(h.bl)}</td><td>${e(h.parte)}</td><td>${h.conts.length}</td></tr>`).join('')}</tbody></table></div></td></tr>` : ''); }).join('');
  return filt + `<div class="fac-card" id="peDgRes"><div class="fac-head"><h3>Resultados (${filas.length})</h3></div><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>N° BL Master</th><th>Viaje</th><th>Nave</th><th>Consignatario/Embarcador</th><th>Puerto Operativo</th><th>Linea</th><th>Fecha Registro</th><th>Fecha Aprobación/Rechazo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
    ${rows || '<tr><td colspan="11" class="fac-empty">No se encontraron resultados con los criterios seleccionados</td></tr>'}</tbody></table></div><div class="fac-btns">${CC.paginador(filas.length, pg.pagina, u.tam, 'peDgPagina')}</div></div>`;
}
function dgForm(){
  const u = dgUI(), m = u.form, md = u.modo, ed = md!=='ver', cr = md==='crear', b = bl(m.bl), cur = u.id && PE.des.find(d=>d.id===u.id);
  const imp = b && !esExp(b), partes = b ? (esExp(b) ? EMBS() : CONS()) : [];
  const acts = md==='ver' && cur && cur.estado==='PENDIENTE' ? [
    esRevisor() && (LISTO.has(cur.bl) || bl(cur.bl).estado==='TRANSMITIDO A SUNAT') ? '<button type="button" class="cc-btn" id="peDgAprobar" onclick="peDgEstado(\'APROBADO\')">Aprobar</button>' : '',
    esRevisor() ? '<button type="button" class="cc-btn ghost" onclick="peDgEstado(\'RECHAZADO\')">Rechazar</button>' : '',
    !esRevisor() ? '<button type="button" class="cc-btn" id="peDgEditar" onclick="peDgEditar()">Editar</button>' : ''].join('') : '';
  const hijos = `<div class="fac-head" style="margin-bottom:8px"><span></span><div class="fac-acts">${ed ? `<button type="button" class="cc-btn ghost" id="peDgAddH" onclick="peDgHijo('add')" ${dis(m.bl)}>Agregar</button><button type="button" class="cc-btn ghost" onclick="peDgHijo('del')">Eliminar</button>` : ''}</div></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Bl Hijo</th><th>Consignatario/Embarcador</th><th>Peso</th><th>Cant. Bultos/Contenedores</th><th>Acciones</th></tr></thead><tbody>
    ${m.hijos.map((h,i)=>`<tr><td><input type="checkbox" ${dis(ed)} onchange="PE.ui.dg.selH[${i}]=this.checked"></td><td><input class="pe-hijo" maxlength="25" style="width:170px" ${dis(ed)} value="${e(h.bl)}" onchange="peDgH(${i},'bl',this.value)"></td>
      <td><input list="peDlDgP" style="width:240px" ${dis(ed)} value="${e(h.parte)}" onchange="peDgH(${i},'parte',this.value)"></td><td><input type="number" step="0.01" ${dis(ed)} value="${e(h.peso)}" onchange="peDgH(${i},'peso',this.value)"></td>
      <td>${h.conts.length}</td><td>${ic('lupa','Contenedores Asociados',`peDgConts(${i})`)}</td></tr>`).join('') || '<tr><td colspan="6" class="fac-empty">Sin BL hijos</td></tr>'}</tbody></table></div>`;
  const adj = `<div class="fac-head" style="margin-bottom:8px"><span></span><div class="fac-acts">${ed ? `<button type="button" class="cc-btn ghost" id="peDgAddA" onclick="peDgAdj('add')" ${dis(m.bl)}>Agregar</button><button type="button" class="cc-btn ghost" onclick="peDgAdj('del')">Eliminar</button>` : ''}</div></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Tipo de archivo</th><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
    ${m.adj.map((a,i)=>`<tr><td><input type="checkbox" ${dis(ed)} onchange="PE.ui.dg.selA[${i}]=this.checked"></td><td>${CC.selector(DG_TIPOS, a.tipo, `${dis(ed && !a.archivo)} onchange="peDgA(${i},this.value)"`, 'Elegir Tipo de archivo')}</td>
      <td>${a.archivo ? e(a.archivo) : `<input type="file" class="pe-dgfile" ${dis(ed && a.tipo)} onchange="peDgArchivo(${i},this)">`}</td><td>${fhh(a.fecha)}</td><td>${sd(a.usuario)}</td><td>${a.archivo ? ic('desc','Descargar',`peDescarga('${e(a.archivo)}')`) : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="fac-empty">Sin adjuntos</td></tr>'}</tbody></table></div>`;
  const ayuda = cr ? `<div class="pe-help">Solo se mostrarán BL master activos elegibles para desglose.<br>Importación: Listo para facturar o Transmitido a SUNAT, liberado por la línea naviera y sin desglose Pendiente o Aprobado.<br>Exportación: Listo para facturar o Transmitido a SUNAT y sin desglose Pendiente o Aprobado.</div>` : '';
  return `<div class="fac-card" id="peDgForm"><div class="fac-head"><div>${cur && !cr ? chipsTodos(DGST, cur.estado, DGTONO) : ''}</div><div class="fac-acts">${acts}</div></div>
    <div class="fac-g3">${F('Numero de BL', `<input id="peDgFBl" list="peDlDgBl" ${dis(cr)} placeholder="Ingrese el BL" value="${e(m.bl)}" onchange="peDgF(this.value)">${ayuda}`)}${b ? CC.campoLectura('Indicador', b.indicador) + CC.campoLectura('Nave / Viaje', `${b.nave} / ${b.viaje}`) : ''}</div>
    <div class="fac-tabs" style="margin-top:18px"><button type="button" class="${u.tab==='hijos' ? 'on' : ''}" onclick="peDgTab('hijos')">Registro de Desglose</button><button type="button" id="peDgTabAdj" class="${u.tab==='adj' ? 'on' : ''}" onclick="peDgTab('adj')">Adjuntos</button></div>
    ${u.tab==='adj' ? adj : hijos}${imp && ed ? '<div class="pe-help" style="margin-top:8px">En importación se exige la Carta de Desglose y el MBL Endosado.</div>' : ''}
    ${ed ? '<div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="peDgVolver()">Cancelar</button><button type="button" class="cc-btn" id="peDgGuardar" onclick="peDgGuardar()">Guardar</button></div>' : ''}</div>
    ${dl('peDlDgBl', dgElegibles().map(x=>x.numero))}${dl('peDlDgP', partes)}`;
}
pantalla({id:'screenPeDesglose', grupo:G.L, opcion:'Desglose', titulo:'Desglose', migas:['Inicio','Liberaciones y trámites','Desglose'],
  html: dgHtml, reset: () => { const u = dgUI(); u.modo = 'buscar'; u.sucio = false; },
  barra: () => dgUI().modo==='buscar' ? null : ['Desglose', ['Inicio','Liberaciones y trámites','Desglose', dgUI().modo==='ver' ? 'Ver' : 'Registro'], 'peDgVolver()']});
W.peDgChk = () => { const ok = !!(($('peDgBl')||{}).value || ($('peDgEst')||{}).value); ['peDgB','peDgL'].forEach(id=>{ const b = $(id); if(b) b.disabled = !ok; }); };
W.peDgBuscar = () => { const u = dgUI(); leer(u, {bl:'peDgBl', estado:'peDgEst'}); u.buscado = true; u.pagina = 1; pinta('screenPeDesglose'); };
W.peDgLimpiar = () => { const u = dgUI(); u.f = {bl:'', estado:''}; u.buscado = false; pinta('screenPeDesglose'); };
W.peDgPagina = (p, t) => { const u = dgUI(); if(t) u.tam = t; u.pagina = p; pinta('screenPeDesglose'); };
W.peDgExp = id => { const u = dgUI(); u.abiertos[id] = !u.abiertos[id]; pinta('screenPeDesglose'); };
W.peDgPlantilla = () => CC.exportarExcel('Plantilla_Desglose', 'Desglose', ['BL Hijo','RUC Consignatario/Embarcador','Número de Equipo','Peso'], [['','','','']]);
W.peDgNuevo = () => { const u = dgUI(); u.modo = 'crear'; u.id = null; u.tab = 'hijos'; u.selH = {}; u.selA = {}; u.sucio = false; u.form = {bl:'', hijos:[], adj:[]}; abrir('screenPeDesglose'); };
W.peDgVer = id => { const u = dgUI(); u.modo = 'ver'; u.id = id; u.tab = 'hijos'; u.selH = {}; u.selA = {}; u.sucio = false; u.form = JSON.parse(JSON.stringify(PE.des.find(d=>d.id===id))); abrir('screenPeDesglose'); };
W.peDgEditar = () => { dgUI().modo = 'editar'; pinta('screenPeDesglose'); };
W.peDgVolver = () => { const u = dgUI(); salirSinGuardar(u, ()=>{ if(u.modo==='editar') W.peDgVer(u.id); else { u.modo = 'buscar'; abrir('screenPeDesglose'); } }); };
W.peDgTab = t => { dgUI().tab = t; pinta('screenPeDesglose'); };
W.peDgF = v => { const u = dgUI(), b = dgElegibles().find(x=>x.numero===v.trim().toUpperCase()); u.form.bl = b ? b.numero : ''; u.form.hijos = []; u.sucio = true;
  if(!b && v) CC.toast('El BL no es elegible para desglose.', 'error'); pinta('screenPeDesglose'); };
W.peDgHijo = a => { const u = dgUI(), m = u.form;
  if(a==='add'){ m.hijos.push({bl:'', parte:'', peso:'', conts:[]}); u.sucio = true; return pinta('screenPeDesglose'); }
  const sel = Object.keys(u.selH).filter(i=>u.selH[i]).map(Number); if(!sel.length) return;
  peConf('Confirmar eliminación', '¿Está seguro de que desea eliminar las filas seleccionadas?', 'Aceptar', ()=>{ m.hijos = m.hijos.filter((h,i)=>!sel.includes(i)); u.selH = {}; pinta('screenPeDesglose'); }); };
W.peDgH = (i, k, v) => { const h = dgUI().form.hijos[i]; h[k] = k==='bl' ? v.toUpperCase().replace(/[^A-Z0-9./-]/g,'').slice(0,25) : v; dgUI().sucio = true; if(k==='bl') pinta('screenPeDesglose'); };
W.peDgConts = i => { const u = dgUI(), h = u.form.hijos[i], ver = u.modo==='ver';
  CC.modal(`<h3>Contenedores Asociados</h3><table class="fac-tbl"><thead><tr><th></th><th>Contenedor</th></tr></thead><tbody>${conts(u.form.bl).map(c=>`<tr><td><input type="checkbox" class="pe-dgc" value="${c.numero}" ${h.conts.includes(c.numero) ? 'checked' : ''} ${dis(!ver)}></td><td>${c.numero}</td></tr>`).join('')}</tbody></table>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">${ver ? 'Cerrar' : 'Cancelar'}</button>${ver ? '' : `<button type="button" class="cc-btn" id="peDgCOk" onclick="peDgContsOk(${i})">Guardar</button>`}</div>`); };
W.peDgContsOk = i => { const u = dgUI(); u.form.hijos[i].conts = [...D.querySelectorAll('.pe-dgc:checked')].map(x=>x.value); u.sucio = true; CC.cerrarModal(); pinta('screenPeDesglose'); };
W.peDgAdj = a => { const u = dgUI(), m = u.form;
  if(a==='add'){ m.adj.push({tipo:'', archivo:'', fecha:'', usuario:''}); u.sucio = true; return pinta('screenPeDesglose'); }
  const sel = Object.keys(u.selA).filter(i=>u.selA[i]).map(Number); m.adj = m.adj.filter((x,i)=>!sel.includes(i)); u.selA = {}; pinta('screenPeDesglose'); };
W.peDgA = (i, v) => { const m = dgUI().form; if(v && m.adj.some((a,j)=>j!==i && a.tipo===v)){ CC.toast(`Solo se permite 1 tipo de archivo de ${v}`, 'error'); return pinta('screenPeDesglose'); } m.adj[i].tipo = v; pinta('screenPeDesglose'); };
W.peDgArchivo = (i, inp) => { const f = inp.files[0], a = dgUI().form.adj[i]; if(!f) return;
  const excel = a.tipo==='Plantilla de Desglose';
  if(excel ? !/\.xlsx?$/i.test(f.name) : !/\.pdf$/i.test(f.name)) { CC.toast(`Tipo de archivo incorrecto para la ${a.tipo}. Debe ser un ${excel ? 'excel' : 'pdf'}.`, 'error'); inp.value = ''; return; }
  if(f.size > 10*1024*1024){ CC.toast('Error al cargar el archivo. Por favor, verifique el tamaño', 'error'); inp.value = ''; return; }
  Object.assign(a, {archivo:f.name, fecha:ahora(), usuario:PE.ses.correo}); dgUI().sucio = true; pinta('screenPeDesglose'); };
W.peDgGuardar = () => {
  const u = dgUI(), m = u.form, b = bl(m.bl);
  if(!m.bl || !m.hijos.length || m.hijos.some(h=>!h.bl || !h.parte)) return CC.toast('Por favor complete todos los campos obligatorios', 'error');
  if(m.hijos.some(h=>!h.conts.length)) return CC.toast('Existen Bl Hijos sin equipos asignados', 'error');
  if(new Set(m.hijos.map(h=>h.bl+'|'+h.parte)).size !== m.hijos.length) return CC.toast('Existen Bl Hijos con el mismo Número de BL y Consignatario', 'error');
  if(!esExp(b)){ if(!m.adj.some(a=>a.tipo==='Carta de Desglose' && a.archivo)) return CC.toast('Desglose no cuenta con la Carta de Desglose', 'error');
    if(!m.adj.some(a=>a.tipo==='MBL Endosado' && a.archivo)) return CC.toast('Desglose no cuenta con el MBL Endosado', 'error'); }
  const libres = conts(m.bl).map(c=>c.numero).filter(n=>!m.hijos.some(h=>h.conts.includes(n)));
  if(libres.length) return CC.toast(libres.length===1 ? `El equipo ${libres[0]} no se encuentra asignado a ningún Bl Hijo.` : `Los equipos ${libres.join(', ')} no se encuentran asignados a ningún Bl Hijo.`, 'error');
  m.adj = m.adj.filter(a=>a.archivo);
  if(u.modo==='crear'){ const id = 'DG-' + String(7 + PE.des.length).padStart(6,'0'); PE.des.unshift({...JSON.parse(JSON.stringify(m)), id, estado:'PENDIENTE', fReg:ahora(), fRes:''}); u.id = id; CC.toast('Desglose creado exitosamente.', 'success'); }
  else { Object.assign(PE.des.find(d=>d.id===u.id), JSON.parse(JSON.stringify({hijos:m.hijos, adj:m.adj}))); CC.toast('Desglose modificado exitosamente.', 'success'); }
  u.sucio = false; W.peDgVer(u.id);
};
W.peDgEstado = st => peConf(st==='APROBADO' ? 'Aprobar Desglose' : 'Rechazar Desglose', st==='APROBADO' ? '¿Estás seguro de que desea aprobar el desglose?' : '¿Estás seguro de que deseas rechazar desglose?', 'Aceptar', ()=>{
  const d = PE.des.find(x=>x.id===dgUI().id); if(d.estado!=='PENDIENTE') return CC.toast('El desglose ya fue aprobado o rechazado.', 'error');
  d.estado = st; d.fRes = ahora(); CC.toast(st==='APROBADO' ? 'Desglose aprobado' : 'Desglose rechazado', 'success'); W.peDgVer(d.id); });

/* ---------- 11. Solicitud de Liberación de Carga ---------- */
const rlUI = () => PE.ui.rl || (PE.ui.rl = {modo:'buscar', f:{nave:'', viaje:'', master:'', hijo:'', cont:'', ruc:'', sol:''}, buscado:false, abiertos:{}, pagina:1, tam:10});
function rlFilas(){
  const f = rlUI().f, rows = [];
  dat().blImportacion.filter(veBL).forEach(b=>{ const dg = PE.des.find(d=>d.bl===b.numero && d.estado==='APROBADO');
    (dg && !relDe(b.numero,'') ? dg.hijos.map(h=>h.bl) : ['']).forEach(h=>rows.push({b, hijo:h, r:relDe(b.numero, h), key:`${b.numero}|${h}`})); });
  return rows.filter(x=>(!f.nave || x.b.nave===f.nave) && (!f.viaje || f.viaje.startsWith(x.b.viaje+' ')) && (!f.master || x.b.numero.includes(f.master.toUpperCase()))
    && (!f.hijo || x.hijo.includes(f.hijo.toUpperCase())) && (!f.cont || x.b.contenedores.some(c=>c.includes(f.cont.toUpperCase()))) && (!f.ruc || rucDe(x.b.consignatario).includes(f.ruc))
    && (!f.sol || (x.r && x.r.id.includes(f.sol.toUpperCase())))).sort((a,c)=>a.b.numero.localeCompare(c.b.numero));
}
const memoTabla = (r, conPagar) => `<table class="fac-tbl"><thead><tr><th>Número del Memo</th><th>Fecha de Vencimiento</th><th>Depósito de Devolución</th><th>Tipo de Memo</th><th>Cantidad de Contenedores</th><th>Descargar BL</th></tr></thead><tbody>
  ${r.memos.length ? r.memos.map(mm=>`<tr><td>${mm.n}</td><td>${CC.fecha(mm.vence)}</td><td>${e(mm.dep)}</td><td>${e(mm.tipo)}</td><td>${mm.cant}</td><td>${mm.ok ? `<button type="button" class="cc-btn ghost" onclick="peDescarga('Memo ${mm.n}.pdf')">Descargar Memo</button>` : (conPagar ? '<button type="button" class="cc-btn pink" onclick="CC.ir(\'Liquidaciones y Pagos\',\'Pago\')">Pagar sobreestadía</button>' : '<span class="pe-sd err">Vencido</span>')}</td></tr>`
    + (mm.ok ? '' : '<tr><td colspan="6" class="pe-wrap"><div class="fac-note warn" style="margin:0">El memo se encuentra vencido. Debe regularizar la sobreestadía para poder generarlo.</div></td></tr>')).join('')
  : '<tr><td colspan="6" class="fac-empty">No se encontraron memos de devolución para esta solicitud</td></tr>'}</tbody></table>`;
function rlHtml(){
  const u = rlUI(); if(u.modo!=='buscar') return rlForm();
  const f = u.f;
  const campos = [F('Nave', `<input id="peRlNave" list="peDlNave" maxlength="100" placeholder="Ingrese Nave" value="${e(f.nave)}" onchange="peRlNave()">`),
    F('Número de Viaje', `<input id="peRlViaje" list="peDlRlVj" maxlength="10" placeholder="Ingrese N° de Viaje" value="${e(f.viaje)}" ${dis(f.nave)}>`),
    F('Número BL Master', `<input id="peRlMaster" maxlength="35" placeholder="Ingrese Número BL Master" value="${e(f.master)}">`),
    F('Número BL Hijo', `<input id="peRlHijo" maxlength="35" placeholder="Ingrese Número BL Hijo" value="${e(f.hijo)}">`),
    F('Número de Contenedor', `<input id="peRlCont" maxlength="11" placeholder="Ingrese Número de Contenedor" value="${e(f.cont)}">`),
    F('RUC Consignatario', `<input id="peRlRuc" maxlength="11" placeholder="Ingrese RUC Consignatario" value="${e(f.ruc)}">`),
    F('Número de solicitud', `<input id="peRlSol" maxlength="25" placeholder="Ingrese Número de solicitud" value="${e(f.sol)}">`)];
  const filt = CC.filtros({id:'peRlF', titulo:'Solicitud de Liberación de Carga', sub:'Ingresar datos y/o Documentos', cols:4, campos, buscar:'peRlBuscar()', limpiar:'peRlLimpiar()'}) + dl('peDlNave', dat().naves.map(n=>n.nombre)) + dl('peDlRlVj', vjsDe(f.nave));
  const filas = u.buscado ? rlFilas() : []; if(!filas.length) return filt;
  const pg = CC.paginar(filas, u.pagina, u.tam);
  const rows = pg.filas.map(x=>{ const r = x.r, ab = u.abiertos[x.key], apr = r && aprobado(r.estado);
    return `<tr><td>${apr ? ic(ab ? 'menos' : 'mas', 'Memo de Devolución', `peRlExp('${x.key}')`) : ''}</td>
      <td>${x.hijo ? e(x.b.numero) : `<button type="button" class="fac-link" onclick="peRlAbrir('${x.key}')">${e(x.b.numero)}</button>`}</td>
      <td>${x.hijo ? `<button type="button" class="fac-link" onclick="peRlAbrir('${x.key}')">${e(x.hijo)}</button>` : sd('')}</td><td>${r ? r.id : sd('')}</td>
      <td>${e(x.b.nave)}</td><td>${e(x.b.viaje)}</td><td>${e(viaje(x.b.nave,x.b.viaje).puerto||'')}</td><td>${e(lineaNom(x.b.linea))}</td>
      <td>${r ? CC.chipEstado(relLbl(r.estado), relTono(r.estado)) : sd('', true)}</td></tr>`
      + (ab ? `<tr><td colspan="9" class="fac-expand"><div class="fac-expand-in"><div class="fac-sec">Memo de Devolución ${corrige('El memo se ve con la liberación aprobada')}</div><div class="pe-help" style="margin-bottom:8px">Información detallada del documento</div>${memoTabla(r, true)}</div></td></tr>` : ''); }).join('');
  return filt + `<div class="fac-card" id="peRlRes"><div class="fac-head"><h3>Resultados (${filas.length})</h3></div><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Número BL Master</th><th>Número BL Hijo</th><th>Número de solicitud</th><th>Nave</th><th>Viaje</th><th>Puerto Operativo</th><th>Línea</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="fac-btns">${CC.paginador(filas.length, pg.pagina, u.tam, 'peRlPagina')}</div></div>`;
}
function rlForm(){
  const u = rlUI(), m = u.form, md = u.modo, ed = md!=='ver', b = bl(m.bl), cur = relDe(m.bl, m.hijo), esAg = rol()==='CUSTOMS_BROKER';
  const pend = ed ? pendPago(m.bl) : [];
  const t = md==='crear' ? 'Registro de Solicitud' : md==='ver' ? 'Visualización de Solicitud' : 'Edición de Solicitud';
  const adjT = `<div class="fac-head" style="margin:18px 0 8px">${ed ? '<h3 style="font-size:15px">Adjuntar Documentos</h3>' : '<span></span>'}<div class="fac-acts">${ed ? '<button type="button" class="cc-btn ghost" id="peRlSubir" onclick="peRlSubir()">Subir Archivos</button><button type="button" class="cc-btn ghost" onclick="peRlAdjDel()">Eliminar</button>' : ''}</div></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>Archivo</th><th>Tipo de Documento</th><th>Fecha</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
    ${m.adj.map((a,i)=>`<tr><td><input type="checkbox" ${dis(ed)} onchange="PE.ui.rl.selA[${i}]=this.checked"></td><td>${e(a.archivo)}</td><td>${e(a.tipo)}</td><td>${fhh(a.fecha)}</td><td>${e(a.usuario||'Usuario')}</td><td>${ic('desc','Descargar',`peDescarga('${e(a.archivo)}')`)}</td></tr>`).join('') || '<tr><td colspan="6" class="fac-empty">Sin documentos adjuntos</td></tr>'}</tbody></table></div>`;
  const pago = ed ? `<div ${CC.propuesta('HU-ATC-12','Pago pendiente antes de enviar','fac-note' + (pend.length ? ' warn' : ''))} id="peRlPago" style="margin-top:16px"><b>Estado de pago del BL</b><br>
    ${pend.length ? `${pend.map(e).join('<br>')}<br>Puedes enviar la solicitud, pero Atención al Cliente no la aprobará hasta que estos pagos estén confirmados. <button type="button" class="fac-link" onclick="CC.ir('Liquidaciones y Pagos','Pago')">Ir a Pago</button>` : 'Sin pagos pendientes: la solicitud puede aprobarse.'}</div>` : '';
  return `<div class="fac-card" id="peRlForm">${cur ? chipsTodos(REL_ST, cur.estado, relTono) : chipsTodos(REL_ST, '', relTono)}
    <div class="fac-head"><h3>Registro de Solicitud</h3><div class="fac-acts">${md==='ver' && cur && cur.estado==='PENDING' && !esRevisor() ? '<button type="button" class="cc-btn" id="peRlEditar" onclick="peRlEditar()">Editar</button>' : ''}</div></div>
    <div class="fac-g3">${CC.campoLectura('Número BL Master', m.bl)}${CC.campoLectura('Número BL Hijo', m.hijo)}${CC.campoLectura('Nave/Viaje', b ? `${b.viaje} / ${b.nave}` : '')}
      ${F('Consignatario', `<input list="peDlCons" ${dis(ed)} value="${e(m.cons)}" onchange="peRlF('cons',this.value)">`)}
      ${F('Agente de Aduanas', `<input list="peDlAg" ${dis(ed && !esAg)} placeholder="Ingresar Agente de Aduanas" value="${e(m.agente)}" onchange="peRlF('agente',this.value)">`)}
      ${F('Comentario', `<input maxlength="800" ${dis(ed)} placeholder="Ingresar Comentarios" value="${e(m.com)}" onchange="peRlF('com',this.value)">`)}</div>
    ${adjT}${pago}
    ${ed ? '<div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="peRlVolver()">Cancelar</button><button type="button" class="cc-btn" id="peRlGuardar" onclick="peRlGuardar()">Guardar</button></div>' : ''}</div>
    ${cur && aprobado(cur.estado) && md==='ver' ? `<div class="fac-card"><h3>Memo de Devolución</h3><div class="pe-help" style="margin-bottom:10px">Información detallada del documento</div>${memoTabla(cur, true)}</div>` : ''}
    ${dl('peDlCons', CONS())}${dl('peDlAg', [AGENTE.razonSocial])}`;
}
pantalla({id:'screenPeLiberacion', grupo:G.L, opcion:'Solicitud de Liberación de carga', titulo:'Solicitud de Liberación de Carga', migas:['Inicio','Liberaciones y trámites','Solicitud de Liberación de Carga'],
  html: rlHtml, reset: () => { const u = rlUI(); u.modo = 'buscar'; u.sucio = false; },
  barra: () => { const u = rlUI(); if(u.modo==='buscar') return null; const t = u.modo==='crear' ? 'Registro de Solicitud' : u.modo==='ver' ? 'Visualización de Solicitud' : 'Edición de Solicitud'; return [t, ['Inicio','Liberaciones y trámites','Solicitud de Liberación de Carga',t], 'peRlVolver()']; }});
const RL_IDS = {nave:'peRlNave', viaje:'peRlViaje', master:'peRlMaster', hijo:'peRlHijo', cont:'peRlCont', ruc:'peRlRuc', sol:'peRlSol'};
W.peRlNave = () => { const u = rlUI(); leer(u, RL_IDS); u.f.viaje = ''; pinta('screenPeLiberacion'); };
W.peRlBuscar = () => { const u = rlUI(); leer(u, RL_IDS); u.buscado = true; u.pagina = 1; pinta('screenPeLiberacion'); if(!rlFilas().length) CC.toast('No se encontraron resultados con los criterios seleccionados', 'info'); };
W.peRlLimpiar = () => { const u = rlUI(); Object.keys(u.f).forEach(k=>u.f[k] = ''); u.buscado = false; pinta('screenPeLiberacion'); };
W.peRlPagina = (p, t) => { const u = rlUI(); if(t) u.tam = t; u.pagina = p; pinta('screenPeLiberacion'); };
W.peRlExp = k => { const u = rlUI(); u.abiertos[k] = !u.abiertos[k]; pinta('screenPeLiberacion'); };
W.peRlAbrir = key => { const [n, h] = key.split('|'), u = rlUI(), r = relDe(n, h), b = bl(n); u.selA = {}; u.sucio = false;
  if(r){ u.modo = 'ver'; u.form = JSON.parse(JSON.stringify(r)); }
  else { u.modo = 'crear'; u.form = {bl:n, hijo:h||'', cons:b.consignatario, agente: rol()==='CUSTOMS_BROKER' ? emp() : '', com:'', adj:[]}; }
  abrir('screenPeLiberacion'); };
W.peRlEditar = () => { rlUI().modo = 'editar'; pinta('screenPeLiberacion'); };
W.peRlVolver = () => { const u = rlUI(); salirSinGuardar(u, ()=>{ if(u.modo==='editar') W.peRlAbrir(`${u.form.bl}|${u.form.hijo}`); else { u.modo = 'buscar'; abrir('screenPeLiberacion'); } }); };
W.peRlF = (k, v) => { rlUI().form[k] = v; rlUI().sucio = true; };
W.peRlAdjDel = () => { const u = rlUI(), sel = Object.keys(u.selA).filter(i=>u.selA[i]).map(Number); if(!sel.length) return;
  peConf('Eliminar', '¿Estás seguro de que deseas eliminar los archivos seleccionados?', 'Aceptar', ()=>{ u.form.adj = u.form.adj.filter((a,i)=>!sel.includes(i)); u.selA = {}; pinta('screenPeLiberacion'); }); };
function rlSubirModal(){
  const p = rlUI().up;
  CC.modal(`<h3>Adjuntar Documentos</h3>${p.length ? '' : '<div class="fac-note" style="text-align:center;padding:24px">Suba archivos PDF e imágenes para comenzar</div>'}
    <div class="fac-btns" style="position:static;justify-content:center"><input type="file" id="peRlFile" multiple accept=".pdf,.jpg,.jpeg,.png" hidden onchange="peRlArchivos(this)"><button type="button" class="cc-btn ghost" onclick="document.getElementById('peRlFile').click()">Seleccione Archivos</button></div>
    ${p.length ? `<table class="fac-tbl" style="margin-top:12px"><thead><tr><th>Archivo</th><th>Tipo de Documento</th><th>Fecha</th><th>Usuario</th></tr></thead><tbody>${p.map((a,i)=>`<tr><td>${e(a.archivo)}</td><td>${CC.selector(['BL endosado','Carta de Responsabilidad'], a.tipo, `class="pe-rltipo" onchange="PE.ui.rl.up[${i}].tipo=this.value"`, 'Elegir tipo de documento')}</td><td>${fhh(a.fecha)}</td><td>${e(a.usuario)}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="peRlUpOk" onclick="peRlSubirOk()">Guardar</button></div>`, 'md');
}
W.peRlSubir = () => { rlUI().up = []; rlSubirModal(); };
W.peRlArchivos = inp => { const u = rlUI(); let omit = false;
  [...inp.files].forEach(f=>{ if(!/\.(pdf|jpe?g|png)$/i.test(f.name) || f.size > 10*1024*1024){ omit = true; return; }
    if(f.name.length > 80){ CC.toast('El nombre del archivo no debe superar los 80 caracteres.', 'error'); return; }
    u.up.push({archivo:f.name, tipo:'', fecha:ahora(), usuario:PE.ses.correo}); });
  if(omit) CC.toast('Algunos archivos fueron omitidos. Solo se permiten archivos PDF e imágenes con tamaño menor a 10 MB.', 'error');
  rlSubirModal(); };
W.peRlSubirOk = () => { const u = rlUI(); if(!u.up.length) return CC.cerrarModal(); if(u.up.some(a=>!a.tipo)) return CC.toast('Elija el tipo de documento de cada archivo.', 'error');
  u.form.adj.push(...u.up); u.up = []; u.sucio = true; CC.cerrarModal(); CC.toast('Archivos subidos correctamente', 'success'); pinta('screenPeLiberacion'); };
W.peRlGuardar = () => {
  const u = rlUI(), m = u.form, ends = m.adj.filter(a=>a.tipo==='BL endosado').length;
  if(rol()==='CUSTOMS_BROKER' && !m.agente) return CC.toast('Su usuario logueado como Agente de Aduanas no tiene ningún socio configurado', 'error');
  if(!ends) return CC.toast('BL endosado es requerido.', 'error');
  if(ends > 1) return CC.toast('No puede tener más de un BL endosado.', 'error');
  if(u.modo==='crear'){
    if(!lineaLiberada(m.bl)) return CC.toast('No se puede realizar la solicitud de liberación de la carga: la línea naviera no ha liberado el BL.', 'error');
    if(!LISTO.has(m.bl)) return CC.toast('La solicitud de liberación de carga solo se puede crear cuando el BL está en estado Listo para facturar.', 'error');
    if(relDe(m.bl, m.hijo)) return CC.toast('La solicitud de liberación de carga ya existe', 'error');
    PE.rel.push({...JSON.parse(JSON.stringify(m)), id:'SLC-' + String(41 + PE.rel.length).padStart(6,'0'), estado:'PENDING', fecha:'', memos:[]});
    CC.toast('Solicitud de Liberación de Carga creada correctamente', 'success');
  } else { Object.assign(relDe(m.bl, m.hijo), {cons:m.cons, agente:m.agente, com:m.com, adj:JSON.parse(JSON.stringify(m.adj))}); CC.toast('Solicitud de Liberación de Carga actualizada correctamente', 'success'); }
  u.sucio = false; W.peRlAbrir(`${m.bl}|${m.hijo}`);
};

/* ---------- 12. Autorización de Liberación de Línea ---------- */
const EMISION_LIN = ['Original','Guía marítima'];
const lnUI = () => PE.ui.ln || (PE.ui.ln = {f:{nave:'', viaje:'', fecha:'', puerto:'', bl:'', cons:'', estado:''}, buscado:false, edit:false, draft:{}, sel:{}, pagina:1, tam:10});
const fechaLibCarga = n => { const r = relDe(n, ''); return r && aprobado(r.estado) ? r.fecha : ''; };
function lnFilas(){ const f = lnUI().f, meses = {'Último mes':1,'Últimos dos meses':2,'Últimos tres meses':3,'Últimos seis meses':6}[f.fecha];
  const desde = meses ? (()=>{ const d = new Date(); d.setMonth(d.getMonth()-meses); return loc(d).slice(0,10); })() : '';
  return dat().blImportacion.filter(b=>veBL(b) && (!f.nave || b.nave===f.nave) && (!f.viaje || f.viaje.startsWith(b.viaje+' ')) && (!desde || b.emision>=desde)
    && (!f.puerto || b.puertoDescarga===f.puerto) && (!f.bl || b.numero.includes(f.bl.toUpperCase())) && (!f.cons || b.consignatario===f.cons) && (!f.estado || (PE.lin[b.numero]||{}).st===f.estado)); }
const lnRow = n => PE.lin[n] || (PE.lin[n] = {lib:false, em:'', st:'Pendiente', uA:'', fA:'', uN:'', fN:''});
function lnHtml(){
  const u = lnUI(), f = u.f;
  const campos = [F('Nave', `<input id="peLnNave" list="peDlNave" placeholder="Ingresar nave" value="${e(f.nave)}" onchange="peLnNave()">`), F('Viaje', `<input id="peLnViaje" list="peDlLnVj" placeholder="Ingresar viaje" value="${e(f.viaje)}">`),
    F('Fecha de BL', CC.selector(['Último mes','Últimos dos meses','Últimos tres meses','Últimos seis meses'], f.fecha, 'id="peLnFecha"', 'Elegir fecha de BL')),
    F('Puerto', `<input id="peLnPuerto" list="peDlPto" placeholder="Ingresar puerto" value="${e(f.puerto)}">`), F('BL', `<input id="peLnBl" placeholder="Ingresar BL" value="${e(f.bl)}">`),
    F('Consignatario', `<input id="peLnCons" list="peDlCons" placeholder="Ingresar consignatario" value="${e(f.cons)}">`), F('Estado', CC.selector(['Pendiente','Liberado'], f.estado, 'id="peLnEst"', 'Todos'))];
  const filt = CC.filtros({id:'peLnF', titulo:'Búsqueda de BL', sub:'Ingresar datos para buscar', cols:4, campos, buscar:'peLnBuscar()', limpiar:'peLnLimpiar()'})
    .replace('onclick="peLnBuscar()"', `onclick="peLnBuscar()" ${dis(!u.edit)}`).replace('onclick="peLnLimpiar()"', `onclick="peLnLimpiar()" ${dis(!u.edit)}`)
    + dl('peDlNave', dat().naves.map(n=>n.nombre)) + dl('peDlLnVj', vjsDe(f.nave)) + dl('peDlPto', dat().puertos.map(p=>p.nombre)) + dl('peDlCons', CONS());
  if(!u.buscado) return filt;
  const filas = lnFilas(), pg = CC.paginar(filas, u.pagina, u.tam), nsel = Object.values(u.sel).filter(Boolean).length;
  const rows = pg.filas.map(b=>{ const L = lnRow(b.numero), d = u.draft[b.numero] || L, fl = fechaLibCarga(b.numero), puede = !L.lib && !fl, selec = !fl && !L.lib;
    const bad = u.edit && d.lib && !d.em;
    return `<tr class="${bad ? 'pe-bad' : ''}"><td>${selec ? `<input type="checkbox" class="pe-lnsel" ${u.sel[b.numero] ? 'checked' : ''} ${dis(!u.edit)} onchange="PE.ui.ln.sel['${b.numero}']=this.checked;peLnPinta()">` : ''}</td>
      <td>${e(b.numero)}</td><td>${sd(fl ? fhh(fl) : '')}</td><td>${e(b.consignatario)}</td><td>${e(b.nave)}</td><td>${e(b.viaje)}</td><td>${e(b.puertoDescarga)}</td>
      <td><input type="checkbox" class="pe-lnlib" ${d.lib ? 'checked' : ''} ${dis(u.edit && puede)} onchange="peLnD('${b.numero}','lib',this.checked)"></td>
      <td>${u.edit && puede ? CC.selector(EMISION_LIN, d.em, `class="pe-lnem" onchange="peLnD('${b.numero}','em',this.value)"`, '') : sd(d.em)}</td>
      <td>${CC.chipEstado(L.st, L.lib ? 'aprobada' : 'pendiente')}</td><td>${sd(L.uA)}</td><td>${sd(L.fA ? fhh(L.fA) : '')}</td><td>${sd(L.uN)}</td><td>${sd(L.fN ? fhh(L.fN) : '')}</td>
      <td>${ic('anular','Anular',`peLnAnular('${b.numero}')`, !(L.lib && !fl && !u.edit))}</td></tr>`; }).join('');
  return filt + `<div class="fac-card" id="peLnRes"><div class="fac-head"><h3>Resultados (${filas.length})</h3><div class="fac-acts"><button type="button" class="cc-btn" id="peLnEditar" onclick="peLnEditar()" ${dis(!u.edit)}>Editar</button><button type="button" class="cc-btn ghost" id="peLnMasivo" onclick="peLnMasivo()" ${dis(nsel && !u.edit)}>Liberar Masivo</button></div></div>
    <div class="fac-scroll"><table class="fac-tbl"><thead><tr><th></th><th>BL</th><th>Fecha de liberación carga</th><th>Consignatario</th><th>Nave</th><th>Viaje</th><th>Puerto</th><th>Es liberado</th><th>Tipo de emisión</th><th>Estado</th><th>Usuario autorización</th><th>Fecha autorización</th><th>Usuario anulación</th><th>Fecha anulación</th><th>Acción</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="15" class="fac-empty">No se encontraron resultados con los criterios seleccionados</td></tr>'}</tbody></table></div>
    <div class="fac-btns" style="justify-content:space-between">${u.edit ? '<span><button type="button" class="cc-btn ghost" onclick="peLnCancelar()">Cancelar</button> <button type="button" class="cc-btn" id="peLnGuardar" onclick="peLnGuardar()">Guardar</button></span>' : '<span></span>'}${CC.paginador(filas.length, pg.pagina, u.tam, 'peLnPagina')}</div></div>`;
}
pantalla({id:'screenPeLineaLib', grupo:G.L, opcion:'Autorización de Liberación de Línea', titulo:'Autorización de Línea por BL', migas:['Inicio','Liberaciones y trámites','Autorización de Línea por BL'],
  html: lnHtml, reset: () => { const u = lnUI(); u.edit = false; u.draft = {}; u.sel = {}; }, barra: () => null});
const LN_IDS = {nave:'peLnNave', viaje:'peLnViaje', fecha:'peLnFecha', puerto:'peLnPuerto', bl:'peLnBl', cons:'peLnCons', estado:'peLnEst'};
W.peLnPinta = () => pinta('screenPeLineaLib');
W.peLnNave = () => { const u = lnUI(); leer(u, LN_IDS); u.f.viaje = ''; pinta('screenPeLineaLib'); };
W.peLnBuscar = () => { const u = lnUI(); leer(u, LN_IDS); u.buscado = true; u.pagina = 1; pinta('screenPeLineaLib'); if(!lnFilas().length) CC.toast('No se encontraron resultados con los criterios seleccionados', 'info'); };
W.peLnLimpiar = () => { const u = lnUI(); Object.keys(u.f).forEach(k=>u.f[k] = ''); u.buscado = false; pinta('screenPeLineaLib'); };
W.peLnPagina = (p, t) => { const u = lnUI(); if(t) u.tam = t; u.pagina = p; pinta('screenPeLineaLib'); };
W.peLnEditar = () => { const u = lnUI(); u.edit = true; u.draft = {}; u.sel = {}; pinta('screenPeLineaLib'); };
W.peLnD = (n, k, v) => { const u = lnUI(), d = u.draft[n] || (u.draft[n] = {...lnRow(n)}); d[k] = v; if(k==='lib' && !v) d.em = ''; pinta('screenPeLineaLib'); };
W.peLnCancelar = () => { const u = lnUI(), fin = () => { u.edit = false; u.draft = {}; pinta('screenPeLineaLib'); };
  if(Object.keys(u.draft).length) peConf('Confirmar cancelación', 'Aún mantiene cambios sin guardar. ¿Desea continuar sin guardarlos?', 'Aceptar', fin); else fin(); };
W.peLnGuardar = () => { const u = lnUI();
  if(Object.values(u.draft).some(d=>d.lib && !d.em)){ CC.toast('Por favor complete todos los campos obligatorios', 'error'); return pinta('screenPeLineaLib'); }
  Object.entries(u.draft).forEach(([n,d])=>{ const L = lnRow(n); if(d.lib){ Object.assign(L, {lib:true, em:d.em, st:'Liberado', uA:PE.ses.correo, fA:ahora()}); } else Object.assign(L, {lib:false, em:'', st:'Pendiente'}); });
  u.edit = false; u.draft = {}; CC.toast('Cambios guardados', 'success'); pinta('screenPeLineaLib'); };
W.peLnAnular = n => { const L = lnRow(n); if(!L.lib || fechaLibCarga(n) || lnUI().edit) return;
  peConf('Confirmar anulación', '¿Está seguro que desea anular esta autorización?', 'Aceptar', ()=>{ Object.assign(L, {lib:false, em:'', st:'Pendiente', uN:PE.ses.correo, fN:ahora()}); CC.toast('Autorización anulada', 'success'); pinta('screenPeLineaLib'); }); };
W.peLnMasivo = () => { const u = lnUI(), ns = Object.keys(u.sel).filter(k=>u.sel[k]); if(!ns.length) return;
  const comun = [...new Set(ns.map(n=>lnRow(n).em).filter(Boolean))];
  CC.modal(`<h3>Liberación Masiva</h3><div class="fac-g2">${F('Tipo de emisión *', CC.selector(EMISION_LIN, comun.length===1 ? comun[0] : EMISION_LIN[0], 'id="peLnMEm"'))}</div>
    <p class="pe-help" style="margin-top:10px">Seleccionados ${ns.length} BL(s)</p>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="peLnMOk" onclick="peLnMasivoOk()">Liberar</button></div>`); };
W.peLnMasivoOk = () => { const u = lnUI(), em = $('peLnMEm').value, ns = Object.keys(u.sel).filter(k=>u.sel[k]);
  ns.forEach(n=>Object.assign(lnRow(n), {lib:true, em, st:'Liberado', uA:PE.ses.correo, fA:ahora()})); u.sel = {}; CC.cerrarModal();
  CC.toast(`Liberación masiva completada para ${ns.length} BL(s)`, 'success'); pinta('screenPeLineaLib'); };

/* ---------- 13. Cálculo de Sobreestadía ---------- */
const osUI = () => PE.ui.os || (PE.ui.os = {f:{master:'', hijo:'', cont:'', linea:'', nave:'', viaje:'', oper:'', estado:'', fLib:'', cli:'', pOrig:'', tam:'', pDesc:''}, avz:false, buscado:false, abiertos:{}, pagina:1, tamP:10});
function osFilas(){ const f = osUI().f;
  return BLS().filter(b=>veBL(b) && (!f.master || b.numero.includes(f.master.toUpperCase())) && (!f.linea || lineaNom(b.linea)===f.linea) && (!f.nave || b.nave===f.nave)
    && (!f.viaje || f.viaje.startsWith(b.viaje+' ')) && (!f.oper || b.indicador===f.oper) && (!f.cli || parte(b)===f.cli) && (!f.pOrig || b.puertoCarga===f.pOrig) && (!f.pDesc || b.puertoDescarga===f.pDesc)
    && (!f.fLib || fechaLibCarga(b.numero).slice(0,10)===f.fLib) && (!f.hijo)
    && conts(b.numero).some(c=>(!f.cont || c.numero.includes(f.cont.toUpperCase())) && (!f.tam || c.tipo===f.tam) && (!f.estado || (f.estado==='Devuelto') === (c.estado==='Devuelto vacío')))); }
function osHtml(){
  const u = osUI(), f = u.f;
  const basicos = [F('BL Master', `<input id="peOsMaster" placeholder="Ingrese BL Master" value="${e(f.master)}">`), F('BL Hijo', `<input id="peOsHijo" placeholder="Ingrese BL Hijo" value="${e(f.hijo)}">`),
    F('Contenedor', `<input id="peOsCont" placeholder="Ingrese número de contenedor" value="${e(f.cont)}">`), F('Línea', `<input id="peOsLinea" list="peDlLin" placeholder="Ingrese línea" value="${e(f.linea)}">`),
    F('Nave', `<input id="peOsNave" list="peDlNave" placeholder="Ingrese nombre de nave" value="${e(f.nave)}" onchange="peOsNave()">`), F('Viaje', `<input id="peOsViaje" list="peDlOsVj" placeholder="Ingrese Viaje" value="${e(f.viaje)}">`),
    F('Tipo Operación', CC.selector(['Importación','Exportación'], f.oper, 'id="peOsOper"', 'Seleccione tipo de operación')), F('Estado', CC.selector(['Pendiente','Devuelto'], f.estado, 'id="peOsEst"', 'Todos')),
    F('Fecha de Liberación', `<input type="date" id="peOsFLib" value="${f.fLib}">`)];
  const avz = u.avz ? `<div class="pe-help" style="margin:16px 0 8px">Usa estos filtros para refinar tu búsqueda</div><div class="fac-g4">${F('Cliente', `<input id="peOsCli" list="peDlCliOs" placeholder="Seleccione cliente" value="${e(f.cli)}">`)}
    ${F('Puerto Origen', `<input id="peOsPOrig" list="peDlPto" placeholder="Ingrese puerto de origen" value="${e(f.pOrig)}">`)}${F('Tamaño/Tipo Cnt', CC.selector(['20DV','40DV','40HC','40RH'], f.tam, 'id="peOsTam"', 'Seleccione tamaño'))}
    ${F('Puerto Descarga', `<input id="peOsPDesc" list="peDlPto" placeholder="Ingrese puerto de descarga" value="${e(f.pDesc)}">`)}</div>` : '';
  const filt = `<div class="fac-card" id="peOsF"><div class="fac-head"><div><h3>Búsqueda de Cálculo de Sobreestadía ${corrige('Solo BL del cliente que ingresa')}</h3><div class="fac-sub">Filtros Básicos</div></div><div class="fac-acts"><button type="button" class="cc-btn ghost" onclick="peOsAvz()">Filtros avanzados</button></div></div>
    <div class="fac-g3">${basicos.join('')}</div>${avz}<div class="fac-btns"><button type="button" class="cc-btn" onclick="peOsBuscar()">Buscar</button><button type="button" class="cc-btn" onclick="peOsLimpiar()">Limpiar</button></div></div>
    ${dl('peDlNave', dat().naves.map(n=>n.nombre))}${dl('peDlOsVj', vjsDe(f.nave))}${dl('peDlLin', dat().lineas.map(l=>l.nombre))}${dl('peDlPto', dat().puertos.map(p=>p.nombre))}${dl('peDlCliOs', [...CONS(), ...EMBS()])}`;
  if(!u.buscado) return filt;
  const filas = osFilas(), pg = CC.paginar(filas, u.pagina, u.tamP);
  const rows = pg.filas.map(b=>{ const ab = u.abiertos[b.numero];
    return `<tr><td>${e(b.numero)}</td><td>${sd('')}</td><td>${e(b.nave)} / ${e(b.viaje)}</td><td>${e(viaje(b.nave,b.viaje).puerto||'')}</td><td>${e(lineaNom(b.linea))}</td><td>${e(parte(b))}</td><td>${b.indicador}</td><td>${ic(ab ? 'menos' : 'mas', 'Ver contenedores', `peOsExp('${b.numero}')`)}</td></tr>`
      + (ab ? `<tr><td colspan="8" class="fac-expand"><div class="fac-expand-in">${osDetalle(b)}</div></td></tr>` : ''); }).join('');
  return filt + `<div class="fac-card" id="peOsRes"><div class="fac-head"><h3>Resultados (${filas.length})</h3></div><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th>BL Master</th><th>BL Hijo</th><th>Nave/Viaje</th><th>Puerto Operativo</th><th>Línea</th><th>Cliente</th><th>Tipo Operación</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8" class="fac-empty">No se encontraron resultados</td></tr>'}</tbody></table></div>
    <div class="fac-btns" style="justify-content:space-between"><button type="button" class="cc-btn" onclick="peOsExportar()">Exportar</button>${CC.paginador(filas.length, pg.pagina, u.tamP, 'peOsPagina')}</div></div>`;
}
function osDetalle(b){
  return `<table class="fac-tbl"><thead><tr><th>Contenedor</th><th>Tamaño/Tipo</th><th>Fecha Descarga / Salida Depósito</th><th>Unidad de Conteo</th><th>Fecha Inicial de Cálculo</th><th class="num">Días Libres</th><th class="num">Días Usados</th><th>Fecha Devolución / Embarque</th><th class="num">Días Sobreestadía</th><th class="num">Total Bruto</th><th class="num">IGV</th><th class="num">Total Neto</th><th>Acciones</th></tr></thead><tbody>
    ${conts(b.numero).map(c=>{ const k = calc(c);
      const fecha = !k.imp ? CC.fecha(k.fin) : k.devuelto ? `${CC.fecha(k.fin)} <span class="pe-tag">Devuelto</span>` : `<input type="date" class="pe-osfecha" min="${hoyISO()}" value="${k.fin}" onchange="peOsFecha('${c.numero}',this.value)">`;
      return `<tr><td>${c.numero}</td><td>${c.tipo}</td><td>${CC.fecha(k.ini)}</td><td>Días calendario</td><td>${CC.fecha(k.ini)}</td><td class="num">${c.diasLibres}</td><td class="num">${k.dias}</td><td>${fecha}</td><td class="num">${k.ost}</td>
        <td class="num">${CC.dinero(k.bruto)}</td><td class="num">${CC.dinero(k.igv)}</td><td class="num">${CC.dinero(k.neto)}</td><td>${ic('ojo','Ver',`peOsVer('${c.numero}')`)}</td></tr>`; }).join('')}</tbody></table>`;
}
pantalla({id:'screenPeSobreestadia', grupo:G.P, opcion:'Cálculo de Sobreestadía', titulo:'Búsqueda de Cálculo de Sobreestadía', migas:['Inicio','Cálculo de Sobreestadía','Búsqueda de Cálculo de Sobreestadía'],
  html: osHtml, reset: () => {}, barra: () => null});
const OS_IDS = {master:'peOsMaster', hijo:'peOsHijo', cont:'peOsCont', linea:'peOsLinea', nave:'peOsNave', viaje:'peOsViaje', oper:'peOsOper', estado:'peOsEst', fLib:'peOsFLib', cli:'peOsCli', pOrig:'peOsPOrig', tam:'peOsTam', pDesc:'peOsPDesc'};
W.peOsNave = () => { const u = osUI(); leer(u, OS_IDS); u.f.viaje = ''; pinta('screenPeSobreestadia'); };
W.peOsAvz = () => { const u = osUI(); leer(u, OS_IDS); u.avz = !u.avz; pinta('screenPeSobreestadia'); };
W.peOsBuscar = () => { const u = osUI(); leer(u, OS_IDS); u.buscado = true; u.pagina = 1; pinta('screenPeSobreestadia'); if(!osFilas().length) CC.toast('No se encontraron resultados', 'info'); };
W.peOsLimpiar = () => { const u = osUI(); Object.keys(u.f).forEach(k=>u.f[k] = ''); u.buscado = false; pinta('screenPeSobreestadia'); };
W.peOsPagina = (p, t) => { const u = osUI(); if(t) u.tamP = t; u.pagina = p; pinta('screenPeSobreestadia'); };
W.peOsExp = n => { const u = osUI(); u.abiertos[n] = !u.abiertos[n]; pinta('screenPeSobreestadia'); };
W.peOsFecha = (c, v) => { if(v && v < hoyISO()) return CC.toast('La fecha no puede ser anterior a hoy.', 'error'); PE.ostHasta[c] = v; pinta('screenPeSobreestadia'); };
W.peOsVer = n => { const c = dat().contenedores.find(x=>x.numero===n), k = calc(c);
  const ls = k.ost ? [{item:1, desc:`Sobreestadía ${c.tipo} (${k.ost} días x USD ${k.tarifa})`, cant:k.ost, pu:k.tarifa, bruto:k.bruto, igv:k.igv, neto:k.neto}] : [];
  CC.modal(`<h3>Detalle del cálculo - ${n}</h3>${k.ost ? '' : '<div class="fac-note">El contenedor está dentro de sus días libres.</div>'}${tblLineas(ls).replace('Total Neto a pagar:', 'Total Neto:')}
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md'); };
W.peOsExportar = () => CC.exportarExcel('Calculo_Sobreestadia', 'Sobreestadía', ['BL Master','Contenedor','Tamaño/Tipo','Tipo Operación','Fecha Inicial','Días Libres','Días Usados','Fecha Devolución / Embarque','Días Sobreestadía','Total Bruto','IGV','Total Neto'],
  osFilas().flatMap(b=>conts(b.numero).map(c=>{ const k = calc(c); return [b.numero, c.numero, c.tipo, b.indicador, CC.fecha(k.ini), c.diasLibres, k.dias, CC.fecha(k.fin), k.ost, k.bruto, k.igv, k.neto]; })));

/* ---------- 14. Pago ---------- */
const INFO = [['PENDING','Pendiente de Liquidar'],['PAYLESS','Liquidados sin pago'],['PAYFUL','Liquidados con pago/crédito']];
const pgUI = () => PE.ui.pg || (PE.ui.pg = {f:{nave:'', viaje:'', oper:'', cli:'', info:'PENDING', bl:'', puerto:''}, buscado:false, sel:{}, pagina:1, tam:10});
const consDe = b => esExp(b) ? mx(b.numero).partes.cons.razon : b.consignatario;
function pendientes(){ const rows = [];
  BLS().filter(b=>LISTO.has(b.numero)).forEach(b=>{
    if(!PE.liq.some(l=>l.bl===b.numero && l.tipo==='Documentación' && l.estado!=='Anulado')) rows.push({key:`D|${b.numero}`, b, tipo:'Documentación', concepto:'Documentación liberación de carga'});
    if(!esExp(b)) conts(b.numero).filter(c=>!ostLiquidado(c.numero)).forEach(c=>rows.push({key:`S|${c.numero}`, b, tipo:'Sobreestadía', concepto:c.numero, c})); });
  return rows; }
function pgFiltra(b){ const f = pgUI().f;
  return veBL(b) && (!f.nave || b.nave===f.nave) && (!f.viaje || f.viaje.startsWith(b.viaje+' ')) && (!f.oper || b.indicador===f.oper)
    && (!f.cli || parte(b)===f.cli) && (!f.bl || b.numero.includes(f.bl.toUpperCase())) && (!f.puerto || puertoLbl(viaje(b.nave,b.viaje).puerto)===f.puerto); }
function pgFilas(){ const f = pgUI().f;
  if(f.info==='PENDING') return pendientes().filter(r=>pgFiltra(r.b));
  return PE.liq.filter(l=>l.info===f.info && l.estado!=='Anulado' && pgFiltra(bl(l.bl))).map(l=>({key:l.n, l, b:bl(l.bl)})); }
function pgHtml(){
  const u = pgUI(), f = u.f, prop = CC.verPropuestas;
  const clientes = prop && f.oper ? (f.oper==='Importación' ? CONS() : EMBS()) : EMBS();
  const lblCli = prop && f.oper ? `Cliente (${f.oper==='Importación' ? 'Consignatario' : 'Embarcador'}) ${CC.marca('Modifica','HU-DM-01','Consignatario o Embarcador')}` : 'Cliente';
  const campos = [F('Nave', `<input id="pePgNave" list="peDlNave" placeholder="Ingrese nave" value="${e(f.nave)}" onchange="pePgNave()">`),
    F('Viaje', `<input id="pePgViaje" list="peDlPgVj" placeholder="Ingrese viaje" value="${e(f.viaje)}" ${dis(f.nave)}>`),
    esCli() ? '' : `<div ${CC.propuesta('HU-DM-01','Tipo de Operación')}>${F('Tipo de Operación', CC.selector(['Importación','Exportación'], f.oper, 'id="pePgOper" onchange="pePgOper()"', 'Todos'))}</div>`,
    esCli() ? '' : F(lblCli, `<input id="pePgCli" list="peDlPgCli" placeholder="Ingrese cliente" value="${e(f.cli)}">`),
    F('Información de Pago *', CC.selector(INFO, f.info, 'id="pePgInfo" onchange="pePgInfo()"', 'Elegir Información de Pago')),
    F('BL', `<input id="pePgBl" placeholder="Ingrese BL" value="${e(f.bl)}">`), F('Puerto', `<input id="pePgPuerto" list="peDlPgPto" placeholder="Ingrese puerto" value="${e(f.puerto)}">`)].filter(Boolean);
  const filt = `<div class="fac-card" id="pePgF"><div class="fac-head"><div><h3>Buscar Conceptos y Sobrestadías</h3><div class="fac-sub">Ingresar datos para realizar el pago</div></div></div><div class="fac-g4">${campos.join('')}</div>
    <div class="fac-btns"><button type="button" class="cc-btn" id="pePgBuscar" onclick="pePgBuscar()">Buscar</button><button type="button" class="cc-btn pink" onclick="pePgLimpiar()">Limpiar</button></div></div>
    ${dl('peDlNave', dat().naves.map(n=>n.nombre))}${dl('peDlPgVj', vjsDe(f.nave))}${dl('peDlPgCli', clientes)}${dl('peDlPgPto', dat().puertos.map(p=>`${p.codigo} - ${p.nombre}`))}`;
  if(!u.buscado) return filt;
  const filas = pgFilas(); if(!filas.length) return filt;
  const pg = CC.paginar(filas, u.pagina, u.tam), chk = r => `<input type="checkbox" class="pe-pgsel" ${u.sel[r.key] ? 'checked' : ''} onchange="pePgSel('${r.key}',this.checked)">`;
  const base = r => [r.b.numero, '', parte(r.b), r.b.nave, r.b.viaje, r.b.indicador, puertoLbl(viaje(r.b.nave,r.b.viaje).puerto)];
  let head, rows;
  if(f.info==='PENDING'){
    head = ['BL','BL Hijo','Cliente','Nave','Viaje','Indicador','Puerto','Tipo','Concepto/Equipo'];
    rows = pg.filas.map(r=>{ const [n,h,cl,nv,vj,ind,pt] = base(r); return `<tr><td>${chk(r)}</td><td>${e(n)}</td><td>${sd(h)}</td><td>${e(cl)}</td><td>${e(nv)}</td><td>${e(vj)}</td><td>${ind}</td><td>${e(pt)}</td><td>${r.tipo}</td><td>${e(r.concepto)}</td></tr>`; });
  } else {
    const con = f.info==='PAYFUL';
    head = ['Número de liquidación','Fecha Registro','BL','BL Hijo','Nave','Viaje','Cliente','Consignatario','Indicador','Puerto','Tipo','Facturar a','Condición de pago','Moneda', ...(con ? ['Estado de liquidación'] : []), 'Total a pagar', ...(con ? ['Fecha de pago'] : []), 'Acciones'];
    const primero = {};
    rows = pg.filas.map(r=>{ const l = r.l, [n,h,cl,nv,vj,ind,pt] = base(r); let acc = '';
      if(!con) acc = l.fecha.slice(0,10)===hoyISO() ? ic('tacho','Anular',`pePgAnular('${l.n}')`) : '';
      else { const nn = esExp(r.b) && !primero[l.bl]; primero[l.bl] = true; const g = nn ? gateNN(l.bl) : '';
        acc = ic('clip','Adjuntos',`pePgAdj('${l.n}')`) + (nn ? ic('desc', g || 'Descargar BL No Negociable', `peNN('${l.bl}')`, !!g) : '') + (l.factura ? ic('rec','Factura',`peDescarga('${l.n}.pdf')`) : '')
          + (!esExp(r.b) && relDe(l.bl,'') ? ic('doc','Memo de Devolución',`pePgMemo('${l.bl}')`) : ''); }
      return `<tr><td>${chk(r)}</td><td>${l.n}</td><td>${CC.fecha(l.fecha)}</td><td>${e(n)}</td><td>${sd(h)}</td><td>${e(nv)}</td><td>${e(vj)}</td><td>${e(cl)}</td><td>${sd(consDe(r.b))}</td><td>${ind}</td><td>${e(pt)}</td><td>${l.tipo}</td><td>${e(l.facturar)}</td><td>${l.cond}</td><td>${l.moneda}</td>
        ${con ? `<td>${CC.chipEstado(l.estado, l.estado==='Pago confirmado' ? 'aprobada' : 'pendiente')}</td>` : ''}<td class="num">${CC.dinero(l.total)}</td>${con ? `<td>${fhh(l.fPago)}</td>` : ''}<td class="fac-rowacts">${acc}</td></tr>`; });
  }
  const nsel = Object.values(u.sel).filter(Boolean).length;
  const btn = f.info==='PENDING' ? `<button type="button" class="cc-btn" id="pePgGenerar" onclick="pePgGenerar()" ${dis(nsel)}>Generar liquidación</button>` : f.info==='PAYLESS' ? `<button type="button" class="cc-btn" id="pePgPagar" onclick="pePgPagar()" ${dis(nsel)}>Pagar</button>` : '<span></span>';
  return filt + `<div class="fac-card" id="pePgRes"><div class="fac-head"><h3>Resultados (${filas.length})</h3></div><div class="fac-scroll"><table class="fac-tbl"><thead><tr><th><input type="checkbox" onchange="pePgTodo(this.checked)"></th>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <div class="fac-btns" style="justify-content:space-between">${btn}${CC.paginador(filas.length, pg.pagina, u.tam, 'pePgPagina')}</div></div>`;
}
pantalla({id:'screenPePago', grupo:G.P, opcion:'Pago', titulo:'Pagos', migas:['Inicio','Pagos','Pagar cargos de liberación'], html: pgHtml, reset: () => {}, barra: () => null});
W.addEventListener('cc:propuestas', ()=>{ if(PE.ses && $('screenPePago') && $('screenPePago').classList.contains('active')){ const u = pgUI(); if(!CC.verPropuestas) u.f.oper = ''; pinta('screenPePago'); } });
const PG_IDS = {nave:'pePgNave', viaje:'pePgViaje', oper:'pePgOper', cli:'pePgCli', info:'pePgInfo', bl:'pePgBl', puerto:'pePgPuerto'};
W.pePgNave = () => { const u = pgUI(); leer(u, PG_IDS); u.f.viaje = ''; pinta('screenPePago'); };
W.pePgOper = () => { const u = pgUI(); leer(u, PG_IDS); u.f.cli = ''; pinta('screenPePago'); };
W.pePgInfo = () => { const u = pgUI(); leer(u, PG_IDS); u.sel = {}; u.buscado = false; pinta('screenPePago'); };
W.pePgBuscar = () => { const u = pgUI(); leer(u, PG_IDS);
  if(!u.f.info) return CC.toast('Por favor complete todos los campos obligatorios antes de buscar.', 'error');
  u.buscado = true; u.sel = {}; u.pagina = 1; pinta('screenPePago'); if(!pgFilas().length) CC.toast('No se encontraron resultados para los criterios de búsqueda ingresados.', 'info'); };
W.pePgLimpiar = () => { const u = pgUI(); u.f = {nave:'', viaje:'', oper:'', cli:'', info:'PENDING', bl:'', puerto:''}; u.buscado = false; u.sel = {}; pinta('screenPePago'); };
W.pePgPagina = (p, t) => { const u = pgUI(); if(t) u.tam = t; u.pagina = p; pinta('screenPePago'); };
W.pePgSel = (k, on) => { const u = pgUI();
  if(k.startsWith('S|')){ const r = pendientes().find(x=>x.key===k); pendientes().filter(x=>x.tipo==='Sobreestadía' && x.b.numero===r.b.numero).forEach(x=>u.sel[x.key] = on); }
  else u.sel[k] = on; pinta('screenPePago'); };
W.pePgTodo = on => { const u = pgUI(); pgFilas().forEach(r=>u.sel[r.key] = on); pinta('screenPePago'); };
W.pePgAnular = n => peConf('Anular liquidación', `¿Anular la liquidación ${n}? Sus conceptos quedarán disponibles para generar una nueva.`, 'Anular', ()=>{
  const l = PE.liq.find(x=>x.n===n); if(l.fecha.slice(0,10)!==hoyISO()) return CC.toast('Solo se pueden anular las liquidaciones registradas hoy.', 'error');
  l.estado = 'Anulado'; delete pgUI().sel[n]; CC.toast(`Liquidación ${n} anulada`, 'success'); pinta('screenPePago'); });
W.pePgAdj = n => { const l = PE.liq.find(x=>x.n===n);
  CC.modal(`<h3>Adjuntos · ${n}</h3><div class="fac-sub">Detalle informativo (solo lectura)</div><table class="fac-tbl" style="margin-top:10px"><thead><tr><th>Nombre del archivo ${corrige('Títulos sin texto')}</th><th>Comentarios</th><th>Descargar</th></tr></thead><tbody>
    ${l.adj.length ? l.adj.map(a=>`<tr><td>${e(a.archivo)}</td><td>${sd(a.com)}</td><td>${ic('desc','Descargar',`peDescarga('${e(a.archivo)}')`)}</td></tr>`).join('') : '<tr><td colspan="3" class="fac-empty">No se encontraron archivos adjuntos para esta liquidación.</td></tr>'}</tbody></table>
    <div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'md'); };
W.pePgMemo = n => { const r = relDe(n, '');
  CC.modal(`<h3>Memo de Devolución</h3>${r && aprobado(r.estado) ? memoTabla(r, false) : '<p class="fac-empty">No se encontraron memos de devolución para esta solicitud</p>'}<div class="fac-btns"><button type="button" class="cc-btn" onclick="CC.cerrarModal()">Cerrar</button></div>`, 'lg'); };

/* Diálogo Generar liquidación */
const facturarDef = b => esExp(b) ? (CC.verPropuestas ? b.embarcador : mx(b.numero).partes.cons.razon) : b.consignatario;
W.pePgGenerar = () => { const u = pgUI(), sel = pendientes().filter(r=>u.sel[r.key]); if(!sel.length) return;
  const grupos = {}; sel.forEach(r=>{ const k = `${r.b.numero}|${r.tipo}`; (grupos[k] = grupos[k] || {bl:r.b.numero, tipo:r.tipo, conts:[], facturar:facturarDef(r.b), agente:'', operador:'', com:'', archivo:''}); if(r.c) grupos[k].conts.push({n:r.c.numero, sel:true, hasta:PE.ostHasta[r.c.numero] || hoyISO()}); });
  u.gen = Object.values(grupos); genModal(); };
const genLineas = g => { const b = bl(g.bl); if(g.tipo==='Documentación') return lineasDoc(DOC(g.bl));
  return g.conts.filter(x=>x.sel).map((x,i)=>{ const c = dat().contenedores.find(y=>y.numero===x.n), k = calc(c, x.hasta); return {item:i+1, desc:`Sobreestadía ${x.n} (${c.tipo})`, cant:k.ost, pu:k.tarifa, bruto:k.bruto, igv:k.igv, neto:k.neto}; }); };
const genOk = () => pgUI().gen.every(g=>g.facturar && (g.tipo==='Documentación' || (g.conts.some(x=>x.sel) && g.conts.every(x=>!x.sel || x.hasta))));
function genModal(){
  const gs = pgUI().gen, total = gs.reduce((s,g)=>s + sum(genLineas(g),'neto'), 0);
  CC.modal(`<div class="fac-head"><h3>Generar liquidación</h3><div class="fac-acts"><button type="button" class="cc-btn" id="peGenOk" onclick="peGenGuardar()" ${dis(genOk())}>Guardar</button><button type="button" class="cc-btn pink" onclick="CC.cerrarModal()">Cancelar</button></div></div>
    ${gs.map((g,i)=>{ const b = bl(g.bl), ls = genLineas(g), exp = esExp(b);
      const ost = g.tipo==='Sobreestadía' ? `<table class="fac-tbl"><thead><tr><th>Seleccionar</th><th>Número de equipo</th><th>Tamaño/Tipo</th><th class="num">Días libres</th><th class="num">Días consumidos</th><th class="num">Días OST</th><th>Desde</th><th>Hasta</th></tr></thead><tbody>
        ${g.conts.map((x,j)=>{ const c = dat().contenedores.find(y=>y.numero===x.n), k = calc(c, x.hasta); return `<tr><td><input type="checkbox" ${x.sel ? 'checked' : ''} onchange="peGenC(${i},${j},'sel',this.checked)"></td><td>${x.n}</td><td>${c.tipo}</td><td class="num">${c.diasLibres}</td><td class="num">${k.dias}</td><td class="num">${k.ost}</td><td>${CC.fecha(k.ini)}</td>
          <td><input type="date" min="${hoyISO()}" value="${x.hasta}" onchange="peGenC(${i},${j},'hasta',this.value)"></td></tr>`; }).join('')}</tbody></table><div class="fac-sec">Equipos por liquidación: ${g.conts.length} · Liquidaciones: 1 · Liquidación 1 de 1</div>` : '';
      return `<div class="pe-grp"><div class="fac-g4">${CC.campoLectura('BL Master', g.bl)}${CC.campoLectura('BL Hijo ' + corrige('Decía "BL Child"'), '')}${CC.campoLectura('Indicador', b.indicador)}${CC.campoLectura('Tipo', g.tipo)}</div>
        <div style="margin-top:12px">${ost}${tblLineas(ls)}</div><div class="fac-tot"><span>Total a pagar: USD ${CC.dinero(sum(ls,'neto'))}</span></div>
        <div class="fac-g3">${F('Agente de Aduana', CC.selector([AGENTE.razonSocial], g.agente, `onchange="peGenG(${i},'agente',this.value)"`, 'Seleccione agente de aduana'))}
          ${F('Operador Logístico', CC.selector([OPERADOR.razonSocial], g.operador, `onchange="peGenG(${i},'operador',this.value)"`, 'Seleccione operador logístico'))}
          ${F(`Facturar a *${exp ? ' ' + CC.marca('Modifica','HU-DM-01','Embarcador por defecto en exportación') : ''}`, `<input list="peDlFact" placeholder="Ingrese cliente" value="${e(g.facturar)}" onchange="peGenG(${i},'facturar',this.value)">`)}
          ${CC.campoLectura('Condición de pago', 'Contado')}
          ${F('Comentarios', `<textarea rows="3" onchange="peGenG(${i},'com',this.value)">${e(g.com)}</textarea><span class="pe-help">La información que se consigne en esta casilla se verá reflejada en la factura.</span>`, 'fac-span2')}
          <div class="fac-f"><label>&nbsp;</label><span><input type="file" id="peGenFile${i}" hidden accept=".pdf" onchange="peGenG(${i},'archivo',this.files[0]?this.files[0].name:'')"><button type="button" class="cc-btn ghost" ${dis(g.facturar && g.facturar!==consDe(b))} onclick="document.getElementById('peGenFile${i}').click()">Subir archivo</button> <span class="pe-help">${g.archivo ? e(g.archivo) : ''} * Carta de facturación a terceros</span></span></div></div></div>`; }).join('')}
    <div class="fac-tot" style="font-size:14px"><span>Total general a pagar: USD ${CC.dinero(total)}</span></div>${dl('peDlFact', [...CONS(), ...EMBS()])}`, 'lg');
}
W.peGenG = (i, k, v) => { pgUI().gen[i][k] = v; genModal(); };
W.peGenC = (i, j, k, v) => { if(k==='hasta' && v && v < hoyISO()) return CC.toast('La fecha no puede ser anterior a hoy.', 'error'); pgUI().gen[i].conts[j][k] = v; genModal(); };
W.peGenGuardar = () => { const u = pgUI(); if(!genOk()) return;
  const nums = u.gen.map(g=>{ const ls = genLineas(g), n = 'LIQ' + String(PE.seqLiq++).padStart(10,'0');
    PE.liq.push({n, fecha:ahora(), bl:g.bl, tipo:g.tipo, facturar:g.facturar, cond:'Contado', moneda:'USD', total:sum(ls,'neto'), info:'PAYLESS', estado:'Pago Pendiente', fPago:'', medio:'', adj:g.archivo ? [{archivo:g.archivo, com:'Carta de facturación a terceros'}] : [], conts:g.conts.filter(x=>x.sel).map(x=>x.n), lineas:ls, agente:g.agente, operador:g.operador, com:g.com});
    return n; });
  CC.cerrarModal(); u.sel = {}; CC.toast(`Las siguientes liquidaciones fueron generadas: ${nums.join(', ')}`, 'success'); pinta('screenPePago'); };

/* Diálogo Pagar (ASBANC o transferencia; sin tarjeta ni pasarela) */
W.pePgPagar = () => { const u = pgUI(), ls = PE.liq.filter(l=>u.sel[l.n] && l.estado!=='Anulado'); if(!ls.length) return;
  if(new Set(ls.map(l=>l.moneda)).size > 1) return CC.toast('No se pueden pagar juntas liquidaciones en monedas distintas. Pague por separado las de soles y las de dólares.', 'error');
  u.pay = {liqs:ls.map(l=>l.n), metodo:'ASBANC', ops:[], paso:'pago', op:{fecha:'', banco:'', cuenta:'', num:'', monto:'', voucher:'', com:''}}; payModal(); };
const payTot = () => +PE.liq.filter(l=>pgUI().pay.liqs.includes(l.n)).reduce((s,l)=>s+l.total,0).toFixed(2);
const payOk = () => { const p = pgUI().pay; return p.metodo==='ASBANC' || Math.abs(sum(p.ops,'monto') - payTot()) < 0.01; };
function payModal(){
  const p = pgUI().pay, ls = PE.liq.filter(l=>p.liqs.includes(l.n)), tot = payTot(), bls = [...new Set(ls.map(l=>l.bl))].length;
  let html;
  if(p.paso==='pago'){
    const o = p.op;
    const trans = p.metodo==='TRANSFER' ? `<div class="pe-grp"><b>Transferencia / Depósito</b><div class="fac-g3" style="margin-top:10px">
      ${F('Fecha de pago *', `<input type="date" id="pePayFecha" max="${hoyISO()}" value="${o.fecha}" onchange="pePayOp('fecha',this.value)">`)}
      ${F('Banco de origen *', CC.selector(['Banco de Crédito del Perú','BBVA Perú','Interbank','Scotiabank Perú'], o.banco, `id="pePayBanco" onchange="pePayOp('banco',this.value)"`, 'Seleccione banco de origen'))}
      ${F('Número de cuenta *', `<input id="pePayCta" placeholder="Ingrese número de cuenta" value="${e(o.cuenta)}" onchange="pePayOp('cuenta',this.value)">`)}
      ${F('Número de operación bancaria *', `<input id="pePayNum" placeholder="Ingrese número de operación bancaria" value="${e(o.num)}" onchange="pePayOp('num',this.value)">`)}
      ${F('Monto pagado *', `<input id="pePayMonto" inputmode="decimal" placeholder="Ingrese monto pagado" value="${e(o.monto)}" onchange="pePayOp('monto',this.value)">`)}
      ${F('Voucher *', `<span><input type="file" id="pePayVou" hidden accept="application/pdf" onchange="pePayOp('voucher',this.files[0]?this.files[0].name:'')"><button type="button" class="cc-btn ghost" onclick="document.getElementById('pePayVou').click()">Subir archivo</button> <span class="pe-help">${e(o.voucher)}</span></span>`)}
      ${F('Comentarios', `<input placeholder="Ingrese comentarios" value="${e(o.com)}" onchange="pePayOp('com',this.value)">`, 'fac-span2')}</div>
      <div class="fac-btns" style="position:static"><button type="button" class="cc-btn ghost" id="pePayAdd" onclick="pePayAgregar()">Agregar</button></div>
      <table class="fac-tbl"><thead><tr><th>Número de operación bancaria</th><th>Banco de origen</th><th>Número de cuenta</th><th>Fecha de pago</th><th class="num">Monto pagado</th><th>Comentarios</th><th>Voucher</th><th>Acciones</th></tr></thead><tbody>
      ${p.ops.map((x,i)=>`<tr><td>${e(x.num)}</td><td>${e(x.banco)}</td><td>${e(x.cuenta)}</td><td>${CC.fecha(x.fecha)}</td><td class="num">${CC.dinero(x.monto)}</td><td>${sd(x.com)}</td><td>${ic('desc','Descargar',`peDescarga('${e(x.voucher)}')`)}</td><td>${ic('tacho','Eliminar',`pePayDel(${i})`)}</td></tr>`).join('') || '<tr><td colspan="8" class="fac-empty">Sin operaciones agregadas</td></tr>'}</tbody></table></div>`
      : `<div class="pe-grp"><b>EPay</b><p style="font-size:13px;margin:8px 0 0">Al continuar:<br>1) Se generará un N° de Ticket ASBANC que agrupa todas las liquidaciones del carrito.<br>2) El ticket ASBANC tiene una vigencia de 24h.</p></div>`;
    html = `<h3>Pagar</h3><div class="fac-sec">Resumen rápido</div>${ls.map(l=>`<div class="fac-sec">Número de liquidación: ${l.n}</div>${tblLineas(l.lineas)}`).join('')}
      ${ls.length > 1 ? `<div class="fac-tot" style="font-size:14px"><span>Total general: USD ${CC.dinero(tot)}</span></div>` : ''}
      <div class="pe-grp"><b>Resumen rápido</b><div class="fac-kv" style="margin-top:8px"><span>Liquidaciones totales:</span><b>${ls.length}</b><span>BLs incluidos:</span><b>${bls}</b><span>Total a pagar:</span><b>USD ${CC.dinero(tot)}</b></div></div>
      <div class="fac-sec">Método de pago (selección única)</div><div class="fac-radio"><label><input type="radio" name="pePayM" id="pePayAsb" ${p.metodo==='ASBANC' ? 'checked' : ''} onchange="pePayMetodo('ASBANC')"> ASBANC</label>
        <label><input type="radio" name="pePayM" id="pePayTra" ${p.metodo==='TRANSFER' ? 'checked' : ''} onchange="pePayMetodo('TRANSFER')"> Transferencia / Depósito - registrar operación bancaria y adjuntar voucher</label></div>${trans}
      <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="CC.cerrarModal()">Cancelar</button><button type="button" class="cc-btn" id="pePaySig" onclick="pePaySiguiente()" ${dis(payOk())}>Siguiente</button></div>`;
  } else {
    const asb = p.metodo==='ASBANC';
    html = `<h3>${asb ? 'Epay (Ticket generado)' : 'Transferencia/Depósito (pago registrado)'}</h3>
      ${asb ? `<p style="font-size:13.5px">Ticket ASBANC generado. Realiza el pago desde tu aplicación bancaria usando este número de ticket. ${corrige('Decía "Realize"')}</p><div class="pe-grp"><span class="pe-help">Ticket ASBANC</span><div class="pe-pills"><span class="pe-ticket" id="peTicket">${p.ticket}</span><button type="button" class="cc-btn ghost" onclick="pePayCopiar()">Copiar</button></div></div>`
        : `<p style="font-size:13.5px">Hemos registrado tu pago por transferencia/depósito.</p><table class="fac-tbl"><thead><tr><th>Número de operación bancaria</th><th>Banco de origen</th><th>Número de cuenta</th><th>Fecha de pago</th><th class="num">Monto pagado</th><th>Comentarios</th><th>Moneda</th></tr></thead><tbody>${p.ops.map(x=>`<tr><td>${e(x.num)}</td><td>${e(x.banco)}</td><td>${e(x.cuenta)}</td><td>${CC.fecha(x.fecha)}</td><td class="num">${CC.dinero(x.monto)}</td><td>${sd(x.com)}</td><td>USD</td></tr>`).join('')}</tbody></table>`}
      <div class="fac-kv" style="margin-top:12px"><span>Total</span><b>USD ${CC.dinero(tot)}</b><span>Fecha y hora</span><b>${fhh(p.ts)}</b><span>Estado</span><b>${asb ? 'Pendiente de pago' : 'Pendiente de confirmación'}</b></div>
      <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="pePayAnterior()">Anterior</button><button type="button" class="cc-btn" id="pePayFin" onclick="pePayFinalizar()">Finalizar</button></div>`;
  }
  CC.modal(html, 'lg');
}
W.pePayMetodo = m => { const p = pgUI().pay;
  if(m==='ASBANC' && p.ops.length) return peConf('Confirmación', 'Al cambiar el método de pago a ASBANC, se eliminarán todos los items ingresados en la transferencia, ¿Desea continuar?', 'Aceptar', ()=>{ p.ops = []; p.metodo = 'ASBANC'; payModal(); }, ()=>payModal());
  p.metodo = m; payModal(); };
W.pePayOp = (k, v) => { pgUI().pay.op[k] = v; if(k==='voucher') payModal(); };
W.pePayAgregar = () => { const p = pgUI().pay, o = p.op;
  if(!o.fecha || !o.banco || !o.cuenta || !o.num || !(Number(o.monto) > 0) || !o.voucher) return CC.toast('Por favor complete todos los campos obligatorios', 'error');
  p.ops.push({...o, monto:Number(o.monto)}); p.op = {fecha:'', banco:'', cuenta:'', num:'', monto:'', voucher:'', com:''}; payModal(); };
W.pePayDel = i => { pgUI().pay.ops.splice(i,1); payModal(); };
W.pePaySiguiente = () => { const p = pgUI().pay; if(!payOk()) return;
  overlay(true, 'Se está validando los datos de pago. Por favor espera.');
  setTimeout(()=>{ overlay(false); p.paso = 'conf'; p.ts = ahora(); if(p.metodo==='ASBANC') p.ticket = p.ticket || ('CS' + String(Date.now()).slice(-9)); payModal(); }, 500); };
W.pePayAnterior = () => { pgUI().pay.paso = 'pago'; payModal(); };
W.pePayCopiar = () => { const t = pgUI().pay.ticket; try{ navigator.clipboard && navigator.clipboard.writeText(t); }catch(err){} CC.toast('Ticket copiado', 'info'); };
W.pePayFinalizar = () => { const u = pgUI(), p = u.pay;
  overlay(true, 'Procesando pago, por favor espera...');
  setTimeout(()=>{ overlay(false);
    PE.liq.filter(l=>p.liqs.includes(l.n)).forEach(l=>Object.assign(l, {info:'PAYFUL', estado:p.metodo==='ASBANC' ? 'Pago Pendiente' : 'Pendiente de confirmación', fPago:p.ts, medio:p.metodo==='ASBANC' ? `ASBANC ${p.ticket}` : 'Transferencia',
      adj:[...l.adj, ...p.ops.map(x=>({archivo:x.voucher, com:x.com}))]}));
    CC.cerrarModal(); u.sel = {}; u.pay = null; CC.toast('Pagos registrados exitosamente', 'success'); pinta('screenPePago'); }, 500); };

/* ---------- 15. Arranque ---------- */
D.addEventListener('DOMContentLoaded', () => {
  const box = D.querySelector('.user-box');
  if(box && !$('peSesEmp')) box.insertAdjacentHTML('afterbegin', '<span class="pe-ses"><span id="peSesEmp"></span><button type="button" id="peSalir" onclick="peSalir()">Cerrar sesión</button></span>');
  D.body.insertAdjacentHTML('beforeend', `<div class="pe-ov" id="peOv"><div class="pe-ov-c"><div class="pe-logo-s">${LOGO()}</div><div class="pe-spin"></div><div id="peOvTxt">Preparando tu acceso...</div></div></div>
    <div class="modal-bg" id="peConfirm"><div class="modal fac-modal fac-zone"><h3 id="peConfT"></h3><p id="peConfP" style="font-size:13.5px;margin:10px 0 0;line-height:1.5"></p>
    <div class="fac-btns"><button type="button" class="cc-btn ghost" onclick="peConfNo()">Cancelar</button><button type="button" class="cc-btn" id="peConfOk" onclick="peConfSi()">Aceptar</button></div></div></div>`);
  D.body.classList.add('pe-anon');
  CC.abrir('screenPeLogin');
});
})();
