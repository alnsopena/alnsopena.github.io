/* ============================================================
   DATOS FICTICIOS COMPARTIDOS v37: window.CC.datos
   Reutiliza los arreglos del mockup cuando existen (naves, puertos,
   viajes, BL de Cobranzas, usuarios) y completa con datos inventados.
   Todo es ficticio: RUC 206100000xx, correos @*.example.
   Las listas se arman al primer uso y luego se reutilizan (en memoria).
============================================================ */
(function(){
'use strict';
const CC = window.CC = window.CC || {};
const has = n => { try{ return typeof eval(n) !== 'undefined'; }catch(e){ return false; } };
const get = n => has(n) ? eval(n) : undefined;
const cache = {};
const lazy = (obj, k, f) => Object.defineProperty(obj, k, {enumerable:true, get(){ return cache[k] || (cache[k] = f()); }});
const ruc = n => '206100' + String(n).padStart(5,'0');
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,18);
const socio = (tipo, i, razon, extra) => Object.assign({id:`${tipo.slice(0,3).toUpperCase()}-${String(i+1).padStart(3,'0')}`, tipo, ruc:ruc(({cliente:100,embarcador:200,consignatario:300,proveedor:400})[tipo]+i), razonSocial:razon, correo:`contacto@${slug(razon)}.example`, estado:'Activo'}, extra||{});

const D = CC.datos = {};

lazy(D, 'naves', () => (get('SHIPS_CATALOG') || [
  {id:'ship-1', name:'NORD VALOUR', grt:29680, loa:183.17, flag:'Panamá', imo:'IMO 9654323', vtype:'tanker'},
  {id:'ship-2', name:'PACIFIC HORIZON', grt:35000, loa:210, flag:'Liberia', imo:'IMO 9712345', vtype:'container'},
  {id:'ship-3', name:'MAERSK ESSEX', grt:35000, loa:210, flag:'Dinamarca', imo:'IMO 9612349', vtype:'container'},
  {id:'ship-4', name:'OCEAN MERIDIAN', grt:28000, loa:175, flag:'Malta', imo:'IMO 9543213', vtype:'bulk'},
  {id:'ship-5', name:'CHEMICAL STAR', grt:24000, loa:170, flag:'Singapur', imo:'IMO 9432103', vtype:'chem'}
]).map(s=>({id:s.id, nombre:s.name, trg:s.grt, eslora:s.loa, bandera:s.flag, imo:s.imo, tipo:s.vtype})));

lazy(D, 'puertos', () => (get('PORTS') || [
  {k:'Callao', code:'PECLL', terminal:'DP World Callao S.R.L.'}, {k:'Paita', code:'PEPAI', terminal:'Terminales Portuarios Euroandinos'},
  {k:'Pisco', code:'PEPIO', terminal:'Terminal Portuario Paracas S.A.'}, {k:'Salaverry', code:'PESVY', terminal:'Salaverry Terminal Internacional'}
]).map(p=>({nombre:p.k, codigo:p.code, terminal:p.terminal})).concat([
  {nombre:'Kingston', codigo:'JMKIN', terminal:'', extranjero:true}, {nombre:'Manzanillo', codigo:'PAMIT', terminal:'', extranjero:true},
  {nombre:'Shanghái', codigo:'CNSHA', terminal:'', extranjero:true}, {nombre:'Rotterdam', codigo:'NLRTM', terminal:'', extranjero:true}
]));

lazy(D, 'lineas', () => [
  {codigo:'MSK', nombre:'MAERSK LINE A/S'}, {codigo:'ZIM', nombre:'ZIM INTEGRATED SHIPPING SERVICE LTD'},
  {codigo:'NAP', nombre:'NAVIERA ANDINA DEL PACÍFICO S.A.'}, {codigo:'LAC', nombre:'LÍNEA AUSTRAL CARGO S.A.C.'}
]);

lazy(D, 'viajes', () => {
  const v = typeof window.facVoys === 'function' ? window.facVoys() : [];
  const base = v.length ? v : [{nro:'115E', nave:'PACIFIC HORIZON', puerto:'Callao', cliente:'MAERSK LINE A/S', eta:'2026-11-25'}];
  return base.map((x,i)=>({numero:x.nro, nave:x.nave, puerto:x.puerto, cliente:x.cliente, eta:x.eta, pda:x.pda||'', linea:D.lineas[i % D.lineas.length].codigo}));
});

lazy(D, 'socios', () => {
  const st = get('state');
  const nombres = [...new Set((get('SAMPLE_PDAS')||[]).map(p=>p.cliente).filter(Boolean))];
  const clientes = (nombres.length ? nombres : ['MAERSK LINE A/S','NAVIERA ANDINA DEL PACÍFICO S.A.']).map((n,i)=>socio('cliente', i, n));
  const embarcadores = ['AGROEXPORTADORA DEL SUR S.A.C.','TEXTILES COSTA VERDE S.A.','MINERA CERRO AZUL S.A.A.','FRUTOS DEL VALLE PERÚ S.A.C.'].map((n,i)=>socio('embarcador', i, n));
  const consignatarios = ['PACIFIC CHEMICALS LTD','ANDES MINING EXPORT S.A.','IMPORTADORA LIMA NORTE S.A.C.','DISTRIBUIDORA EL PUERTO E.I.R.L.','FERRETERA ANDINA S.A.'].map((n,i)=>socio('consignatario', i, n));
  const proveedores = ((st && st.suppliers) || ['Autoridad Portuaria Nacional - APN','SERVICIOS DE PRACTICAJE MARITIMO S.A.']).map((n,i)=>socio('proveedor', i, n));
  return {clientes, embarcadores, consignatarios, proveedores};
});

const CONT_TIPOS = ['20DV','40DV','40HC','40RH'];
const contNum = (pref, i) => `${pref}U${String(1000000 + i*7919).slice(-7)}`;

lazy(D, 'blImportacion', () => {
  if(typeof window.cbSeed === 'function') window.cbSeed();
  const cb = get('CB'), bls = (cb && cb.bls) || [];
  const cons = D.socios.consignatarios.map(c=>c.razonSocial);
  const base = bls.length ? bls.map(b=>({numero:b.n, nave:b.nave, viaje:b.nro, consignatario:b.cons, linea:b.lin, estado:b.st, tipo:b.tp, manifiesto:b.mani, emision:b.emi, puertoCarga:b.pc, puertoDescarga:b.pd}))
    : [{numero:'ZIMUBOX0000011', nave:'BOX ENDURANCE', viaje:'', consignatario:cons[0], linea:'ZIM', estado:'APROBADO', tipo:'House B/L', manifiesto:'2026-0411', emision:'2026-09-08', puertoCarga:'Kingston', puertoDescarga:'Callao'}];
  return base.map((b,i)=>Object.assign(b, {indicador:'Importación', contenedores:[contNum(b.linea.slice(0,3).toUpperCase(), i*2+1), contNum(b.linea.slice(0,3).toUpperCase(), i*2+2)]}));
});

lazy(D, 'blExportacion', () => {
  const emb = D.socios.embarcadores, v = D.viajes, dest = ['Rotterdam','Shanghái','Manzanillo','Kingston'];
  return Array.from({length:8}, (_,i)=>{ const vy = v[i % v.length], ln = D.lineas[i % D.lineas.length];
    return {numero:`${ln.codigo}EXP${String(26000+i*13).padStart(7,'0')}`, nave:vy.nave, viaje:vy.numero, embarcador:emb[i % emb.length].razonSocial, linea:ln.codigo,
      estado:['POR REVISAR','APROBADO','TRANSMITIDO A SUNAT','POR RECTIFICAR'][i % 4], tipo:i % 3 ? 'House B/L' : 'Master B/L', indicador:'Exportación',
      puertoCarga:vy.puerto || 'Callao', puertoDescarga:dest[i % dest.length], emision:`2026-10-${String(5+i*3).padStart(2,'0')}`, cutoff:`2026-11-${String(10+i*2).padStart(2,'0')}`,
      contenedores:[contNum(ln.codigo, 500+i)]};
  });
});

lazy(D, 'contenedores', () => [...D.blImportacion, ...D.blExportacion].flatMap((b,j)=>b.contenedores.map((n,k)=>({
  numero:n, tipo:CONT_TIPOS[(j+k) % CONT_TIPOS.length], bl:b.numero, indicador:b.indicador, linea:b.linea, nave:b.nave, viaje:b.viaje,
  estado:b.indicador==='Importación' ? ['Descargado','En almacén','Retirado','Devuelto vacío'][(j+k) % 4] : ['Asignado','Lleno en puerto','Embarcado'][(j+k) % 3],
  diasLibres:[7,10,14][(j+k) % 3]}))));

lazy(D, 'usuarios', () => {
  const lista = get('US_LIST') || [];
  const sel = document.getElementById('currentUser');
  const opciones = sel ? [...sel.options].map(o=>o.textContent) : [];
  const base = lista.length ? lista.map(u=>({correo:u.e, nombre:u.n, roles:u.roles.slice()})) : [];
  opciones.forEach(t=>{ const m = t.match(/^(.*?) \((.*)\)$/); if(m && !base.some(u=>u.nombre===m[1])) base.push({correo:`${slug(m[1])}@cliente.example`, nombre:m[1], roles:[m[2]]}); });
  base.forEach(u=>{ const o = opciones.find(t=>t.startsWith(u.nombre+' (')); u.perfil = o ? o.slice(u.nombre.length+2, -1) : (u.perfil||''); });
  return base.concat([
    {correo:'importador@clientedemo.example', nombre:'Cliente Demo S.A.C.', roles:['CLIENTE IMPORTADOR'], perfil:'Portal externo', externo:true},
    {correo:'exportador@agentedemo.example', nombre:'Agente de Carga Demo', roles:['AGENTE DE CARGA'], perfil:'Portal externo', externo:true}]);
});

/* Utilidad: busca sin tildes ni mayúsculas en los campos dados */
CC.datos.filtrar = (lista, texto, campos) => { const q = String(texto||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); if(!q) return lista.slice();
  return lista.filter(x=>(campos||Object.keys(x)).some(k=>String(x[k]??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().includes(q))); };
})();
