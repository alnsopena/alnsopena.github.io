/* Seguimiento de cuentas de escala: tablero del reporte diario (DA Digest de Cosmos).
   Propuesta del quick win "Reporte diario de cuentas de escala". No existe en Connect.
   - Menú Agenciamiento > Seguimiento de cuentas.
   - Mismo contenido que el correo diario: total, grupos, indicadores del mes y cada cuenta.
   - "Regularizar" explica qué hacer y lleva a la PDA, la FDA o Cobranzas.
   - Enlace directo desde el correo: ?cuenta=<código> (convive con ?v=...).
   Todo en memoria y con datos ficticios (los mismos del prototipo del correo). */
(function(){
  'use strict';
  const W = window, D = document;
  const ID = 'screenSeguimiento';
  const T = 'QW Reporte diario';
  const esc = x => CC.esc(x);
  const TC = 3.75;                                   /* PEN por USD, ficticio */
  const CORTE = 'lunes 9 nov 2026, 7:30 a. m.';
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
  const fecha = iso => { const [y,m,d] = String(iso).slice(0,10).split('-').map(Number); return `${d} ${MESES[m-1]} ${y}`; };
  const din = n => Number(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});

  const GRUPOS = [
    {k:'urgente',  t:'Urgente',           c:'#e11d48', ayuda:'Necesitan acción hoy'},
    {k:'plazo',    t:'Plazo por vencer',  c:'#d97706', ayuda:'FDA con time-bar en 30 días o menos'},
    {k:'atencion', t:'Requiere atención', c:'#4f46e5', ayuda:'Pendientes que se están demorando'},
    {k:'proximas', t:'Próximas escalas',  c:'#64748b', ayuda:'Llegan en 7 días con la PDA aprobada'},
  ];
  const grupoDe = k => GRUPOS.find(g => g.k===k);

  /* destino: pda | fda | cobranza. que = texto de "Qué hacer". pda = datos para abrirla en el mockup */
  const P = (modo, cargo, op, eta, etd) => ({modo, cargo, op, eta, etd});
  const CUENTAS = [
    {g:'urgente', tipo:'PDA', cod:'PDA2026000412PECLL', viaje:'045S', nave:'PACIFIC AURORA', puerto:'Callao', cliente:'Andina Tankers Ltd.', com:'R. Salas', mon:'USD', monto:21480.00, ft:'ETA', f:'2026-11-11', estado:'Pendiente de aprobación', motivo:'ETA en 2 días y la PDA sigue pendiente', fase:1, destino:'pda',
     que:'La nave llega el 11 nov y la PDA sigue pendiente de aprobación. Revisa la PDA y apruébala para generar la OS, o regístrale una observación.', pda:P('tramps','crude','dis','2026-11-11T06:00','2026-11-12T18:00')},
    {g:'urgente', tipo:'PDA', cod:'PDA2026000405PEPAI', viaje:'112N', nave:'MARE ANDINO', puerto:'Paita', cliente:'Southern Bulk Carriers', com:'L. Torres', mon:'USD', monto:12915.40, ft:'ETA', f:'2026-11-13', estado:'Pendiente de aprobación', motivo:'Observada: falta el GRT de la nave', fase:1, destino:'pda', obs:'Falta el GRT de la nave',
     que:'La PDA está observada porque falta el GRT de la nave. Completa el dato en la ficha de la nave y vuelve a enviar la PDA para su aprobación.', pda:P('tramps','dry_bulk','load','2026-11-13T08:00','2026-11-15T20:00')},
    {g:'urgente', tipo:'FDA', cod:'FDA2026000097PEMRI', viaje:'021E', nave:'ATLANTIC CONDOR', puerto:'Matarani', cliente:'Altiplano Ores Trading', com:'R. Salas', mon:'USD', monto:38204.75, ft:'Zarpe', f:'2026-11-03', estado:'Sin enviar', motivo:'FDA sin enviar: 6 días desde el zarpe', fase:2, destino:'fda',
     que:'La escala zarpó el 3 nov y la FDA aún no se envía al cliente. Revisa la comparación contra la PDA y envíala.'},
    {g:'plazo', tipo:'FDA', cod:'FDA2026000081PEILQ', viaje:'088S', nave:'SOL DE ILO', puerto:'Ilo', cliente:'Andina Tankers Ltd.', com:'L. Torres', mon:'USD', monto:9870.10, ft:'Zarpe', f:'2026-10-14', estado:'Enviada', motivo:'Time-bar vence en 12 días (21 nov)', fase:2, destino:'fda',
     que:'El plazo de reclamo (time-bar) vence el 21 nov. Confirma con el cliente y cierra la FDA antes de esa fecha para no perder el cobro.'},
    {g:'plazo', tipo:'FDA', cod:'FDA2026000079PESVY', viaje:'310N', nave:'CORAL BAY', puerto:'Salaverry', cliente:'Southern Bulk Carriers', com:'R. Salas', mon:'PEN', monto:61250.00, ft:'Zarpe', f:'2026-10-09', estado:'Enviada', motivo:'Time-bar vence en 21 días (30 nov)', fase:2, destino:'fda',
     que:'El plazo de reclamo (time-bar) vence el 30 nov. Haz seguimiento al cliente y cierra la FDA antes de esa fecha.'},
    {g:'atencion', tipo:'PDA', cod:'PDA2026000398PEMRI', viaje:'022E', nave:'AMAZONAS SPIRIT', puerto:'Matarani', cliente:'Altiplano Ores Trading', com:'R. Salas', mon:'USD', monto:18640.00, ft:'ETA', f:'2026-11-24', estado:'Pendiente de aprobación', motivo:'Pendiente de aprobación hace 4 días', fase:1, destino:'pda',
     que:'La PDA lleva 4 días pendiente de aprobación. Apruébala, obsérvala o anúlala para que no quede abierta.', pda:P('tramps','dry_bulk','load','2026-11-24T08:00','2026-11-27T20:00')},
    {g:'atencion', tipo:'PDA', cod:'PDA2026000377PEPAI', viaje:'017S', nave:'NORTE GRANDE', puerto:'Paita', cliente:'Pacific Gas Shipping', com:'L. Torres', mon:'USD', monto:11260.00, ft:'Zarpe', f:'2026-11-01', estado:'Aprobada', motivo:'Zarpó hace 8 días y la PDA sigue sin finalizar', fase:1, destino:'pda',
     que:'La escala zarpó el 1 nov y la PDA sigue aprobada. Revisa costos y facturación de la escala y finaliza la PDA para cerrarla.', pda:P('tramps','chem','dis','2026-10-30T06:00','2026-11-01T18:00')},
    {g:'atencion', tipo:'Factura', cod:'F001-00004521', viaje:'090S', nave:'SANTA ROSA', puerto:'Talara', cliente:'Andina Tankers Ltd.', com:'L. Torres', mon:'USD', monto:3120.00, ft:'Venció', f:'2026-10-22', estado:'Vencida', motivo:'Factura vencida hace 18 días, sin pago', fase:1, destino:'cobranza',
     que:'La factura de la escala venció el 22 oct y no registra pago. Gestiona el cobro en Cobranzas.'},
    {g:'atencion', tipo:'FDA', cod:'FDA2026000088PECLL', viaje:'201N', nave:'PACIFIC TERN', puerto:'Callao', cliente:'Pacific Gas Shipping', com:'R. Salas', mon:'USD', monto:27315.60, ft:'Zarpe', f:'2026-10-20', estado:'Enviada', motivo:'Consulta del cliente sin responder hace 2 días', fase:2, destino:'fda',
     que:'El cliente consultó un cargo de la FDA hace 2 días. Respóndele desde la FDA; si corresponde, registra una adenda.'},
    {g:'atencion', tipo:'PDA', cod:'PDA2026000401PECHM', viaje:'055N', nave:'CHAVÍN TRADER', puerto:'Chimbote', cliente:'Southern Bulk Carriers', com:'L. Torres', mon:'USD', monto:8450.00, ft:'ETA', f:'2026-11-19', estado:'Pendiente de aprobación', motivo:'Pendiente de aprobación hace 3 días', fase:1, destino:'pda',
     que:'La PDA lleva 3 días pendiente de aprobación. Apruébala, obsérvala o anúlala para que no quede abierta.', pda:P('tramps','dry_bulk','load','2026-11-19T08:00','2026-11-21T20:00')},
    {g:'proximas', tipo:'PDA', cod:'PDA2026000415PECLL', viaje:'046S', nave:'PACIFIC GULL', puerto:'Callao', cliente:'Andina Tankers Ltd.', com:'R. Salas', mon:'USD', monto:15980.00, ft:'ETA', f:'2026-11-10', estado:'Aprobada', motivo:'Llega mañana', fase:1, destino:'pda',
     que:'La nave llega mañana con la PDA aprobada. Es solo informativo: no requiere acción.', pda:P('tramps','crude','dis','2026-11-10T06:00','2026-11-11T18:00')},
    {g:'proximas', tipo:'PDA', cod:'PDA2026000409PESVY', viaje:'311N', nave:'ANDES GLORY', puerto:'Salaverry', cliente:'Southern Bulk Carriers', com:'L. Torres', mon:'USD', monto:9340.50, ft:'ETA', f:'2026-11-12', estado:'Aprobada', motivo:'Llega en 3 días', fase:1, destino:'pda',
     que:'La nave llega en 3 días con la PDA aprobada. Es solo informativo: no requiere acción.', pda:P('tramps','dry_bulk','load','2026-11-12T08:00','2026-11-14T20:00')},
    {g:'proximas', tipo:'PDA', cod:'PDA2026000416PEPAI', viaje:'113N', nave:'MARINA DEL SUR', puerto:'Paita', cliente:'Pacific Gas Shipping', com:'R. Salas', mon:'USD', monto:22105.00, ft:'ETA', f:'2026-11-15', estado:'Aprobada', motivo:'Llega en 6 días', fase:1, destino:'pda',
     que:'La nave llega en 6 días con la PDA aprobada. Es solo informativo: no requiere acción.', pda:P('tramps','chem','dis','2026-11-15T06:00','2026-11-16T18:00')},
  ];
  const usd = c => c.mon==='PEN' ? Math.round(c.monto/TC*100)/100 : c.monto;
  const porCodigo = cod => CUENTAS.find(c => c.cod===cod);
  const suma = l => Math.round(l.reduce((a,c)=>a+usd(c),0)*100)/100;

  /* ---------- Estado de la pantalla ---------- */
  const E = { f:{grupo:'', com:'', puerto:'', texto:''}, pagina:1, tam:10, sel:null };
  const filas = () => {
    const t = (E.f.texto||'').trim().toLowerCase();
    const orden = GRUPOS.map(g=>g.k);
    return CUENTAS.filter(c => (!E.f.grupo || c.g===E.f.grupo) && (!E.f.com || c.com===E.f.com) && (!E.f.puerto || c.puerto===E.f.puerto)
        && (!t || [c.cod,c.nave,c.cliente,c.viaje].some(x => String(x).toLowerCase().includes(t))))
      .sort((a,b) => orden.indexOf(a.g) - orden.indexOf(b.g));
  };

  /* ---------- Estilos propios (prefijo sg-) ---------- */
  const css = `
  .sg-banner{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#eef4f7;border-radius:12px;padding:14px 18px;margin-bottom:16px}
  .sg-banner b{color:#021e2f}.sg-banner .sg-sub{font-size:13px;color:#475569}
  .sg-res{display:grid;grid-template-columns:minmax(260px,1fr) 2fr;gap:24px;align-items:start}
  .sg-total{font-size:30px;font-weight:700;color:#021e2f;line-height:1.1;font-variant-numeric:tabular-nums}
  .sg-total-sub{font-size:14px;color:#475569;margin-top:4px}
  .sg-lectura{font-size:14px;font-weight:600;color:#003d53;margin-top:12px}
  .sg-bar{display:flex;height:10px;border-radius:6px;overflow:hidden;margin:4px 0 12px}
  .sg-ley{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px}
  .sg-ley button{all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#334155;padding:6px 8px;border-radius:8px}
  .sg-ley button:hover,.sg-ley button.on{background:#f1f5f9}
  .sg-ley button:focus-visible{outline:2px solid #003d53}
  .sg-num{font-variant-numeric:tabular-nums;white-space:nowrap}
  .sg-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:middle}
  .sg-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .sg-kpi{background:#f4f6f7;border-radius:10px;padding:14px}
  .sg-kpi .l{font-size:12px;color:#64748b}.sg-kpi .v{font-size:22px;font-weight:700;color:#021e2f;font-variant-numeric:tabular-nums}
  .sg-kpi .n{font-size:12px;color:#64748b}.sg-f2{color:#94a3b8}
  .sg-cta{font-size:12px;color:#64748b}
  tr.sg-sel td{background:#fff7e6}
  .sg-mot{display:flex;align-items:flex-start;gap:0;min-width:170px}
  .sg-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border:none;background:transparent;border-radius:8px;cursor:pointer;font-size:20px;color:#475569}
  .sg-x:hover{background:#f1f5f9}
  .sg-modal-k{font-size:12px;font-weight:600;color:#003d53;margin:14px 0 4px}
  .sg-aviso{background:#fff7e6;color:#7a4b00;border-radius:8px;padding:10px 12px;font-size:13px;margin-top:12px}
  @media (max-width:900px){.sg-res{grid-template-columns:1fr}.sg-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:520px){.sg-ley{grid-template-columns:1fr}}`;
  if(!D.getElementById('sgEstilos')){ const st = D.createElement('style'); st.id = 'sgEstilos'; st.textContent = css; D.head.appendChild(st); }

  /* ---------- Acciones ---------- */
  W.sgSet = (k, v) => { E.f[k] = v; };
  W.sgBuscar = () => { const t = D.getElementById('sgTexto'); if(t) E.f.texto = t.value; E.pagina = 1; CC.refrescar(ID); };
  W.sgLimpiar = () => { E.f = {grupo:'', com:'', puerto:'', texto:''}; E.pagina = 1; E.sel = null; CC.refrescar(ID); };
  W.sgGrupo = k => { E.f.grupo = E.f.grupo===k ? '' : k; E.pagina = 1; CC.refrescar(ID); };
  W.sgPagina = (p, tam) => { if(tam) E.tam = tam; E.pagina = p; CC.refrescar(ID); };
  W.sgExportar = () => CC.exportarExcel('Seguimiento_cuentas_escala', 'Cuentas abiertas',
    ['Grupo','Tipo','Código','Viaje','Nave','Puerto','Cliente','Comercial','Moneda','Monto','Monto USD','Fecha','Motivo','Fase'],
    filas().map(c => [grupoDe(c.g).t, c.tipo, c.cod, c.viaje, c.nave, c.puerto, c.cliente, c.com, c.mon, c.monto, usd(c), fecha(c.f), c.motivo, c.fase]));

  /* Las PDA del correo se agregan a los ejemplos del mockup solo al abrirlas, para no cambiar el listado inicial */
  function asegurarPda(c){
    if(typeof SAMPLE_PDAS==='undefined' || SAMPLE_PDAS.some(p => p.code===c.cod)) return;
    SAMPLE_PDAS.push({ code:c.cod, tipo:'maritimo', modo:c.pda.modo, nave:c.nave, servicio:'Tramp', viaje:c.viaje, puerto:c.puerto,
      cliente:c.cliente, estado:c.estado, etapa:c.estado, sub:'Cuenta del reporte diario (datos ficticios)', obs:c.obs,
      data:{ voy:c.viaje, port:c.puerto, terminal:'', cargo:c.pda.cargo, operation:c.pda.op, eta:c.pda.eta, etd:c.pda.etd } });
  }
  const DESTINO = {pda:'Abrir la PDA', fda:'Abrir la FDA', cobranza:'Ir a Cobranzas'};
  W.sgRegularizar = cod => {
    const c = porCodigo(cod); if(!c) return;
    E.sel = cod;
    const g = grupoDe(c.g), info = c.g==='proximas';
    CC.modal(`<button type="button" class="sg-x" aria-label="Cerrar" onclick="CC.cerrarModal()">&times;</button>
      <h3>${info ? 'Ver cuenta' : 'Regularizar cuenta'}</h3>
      <div class="fac-sub">${esc(c.tipo)} · ${esc(c.cod)} · ${esc(c.nave)} · ${esc(c.puerto)}</div>
      <div><span class="sg-dot" style="background:${g.c}"></span><b>${esc(g.t)}:</b> ${esc(c.motivo)}</div>
      <div class="sg-modal-k">Qué hacer</div>
      <p style="margin:0">${esc(c.que)}</p>
      <div class="sg-modal-k">Datos</div>
      <div style="font-size:14px;color:#334155">${esc(c.cliente)} · ${esc(c.mon)} ${din(c.monto)} · ${esc(c.ft)} ${fecha(c.f)} · Comercial ${esc(c.com)}</div>
      ${c.fase===2 ? `<div class="sg-aviso">Fase 2: la FDA es una propuesta del mockup y aún no existe en Connect (pendiente PEN-I016-09).</div>` : ''}
      <div class="fac-btns"><button type="button" class="cc-btn" onclick="sgIr('${esc(c.cod)}')">${DESTINO[c.destino]}</button></div>`);
  };
  W.sgIr = cod => {
    const c = porCodigo(cod); if(!c) return;
    CC.cerrarModal();
    if(c.destino==='fda' && typeof W.fdaIr==='function'){ W.fdaIr(c.cod); return; }
    if(c.destino==='cobranza' && typeof W.openCobranzas==='function'){ W.openCobranzas('val'); CC.toast(`Factura ${c.cod}: gestión de cobro`, 'info'); return; }
    if(c.destino==='pda' && typeof W.openSamplePda==='function'){ asegurarPda(c); W.openSamplePda(c.cod); return; }
    CC.toast('Destino no disponible en este prototipo', 'info');
  };

  /* ---------- Pantalla ---------- */
  function resumen(){
    const tot = suma(CUENTAS), urg = CUENTAS.filter(c=>c.g==='urgente');
    const barra = GRUPOS.map(g => { const n = CUENTAS.filter(c=>c.g===g.k).length; return n ? `<span style="width:${n/CUENTAS.length*100}%;background:${g.c}"></span>` : ''; }).join('');
    const desglose = GRUPOS.map(g => `${g.t.toLowerCase()} ${CUENTAS.filter(c=>c.g===g.k).length}`).join(', ');
    const ley = GRUPOS.map(g => { const l = CUENTAS.filter(c=>c.g===g.k);
      return `<button type="button" class="${E.f.grupo===g.k?'on':''}" aria-pressed="${E.f.grupo===g.k}" title="${esc(g.ayuda)}" onclick="sgGrupo('${g.k}')"><span><span class="sg-dot" style="background:${g.c}"></span>${g.t}</span><span class="sg-num">${l.length} · USD ${din(suma(l))}</span></button>`; }).join('');
    return `<div class="fac-card" id="sgResumen"><div class="fac-head"><div><h3>Resumen del reporte diario</h3><div class="fac-sub">Corte del ${CORTE} · mismo contenido del correo · datos ficticios</div></div></div>
      <div class="sg-res"><div><div class="sg-total">${CUENTAS.length} cuentas abiertas</div><div class="sg-total-sub">USD ${din(tot)} en total</div>
        <div class="sg-lectura">${urg.length} ${urg.length===1?'cuenta necesita':'cuentas necesitan'} acción hoy por USD ${din(suma(urg))}.</div></div>
      <div><div class="sg-bar" role="img" aria-label="Cuentas por grupo: ${desglose}">${barra}</div><div class="sg-ley">${ley}</div>
        <div class="sg-cta">Elige un grupo para filtrar la tabla.</div></div></div></div>`;
  }
  function indicadores(){
    const venc = CUENTAS.filter(c=>c.tipo==='Factura'), plazo = CUENTAS.filter(c=>c.g==='plazo');
    const k = (l, v, n, f2) => `<div class="sg-kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="n">${n}${f2?' · <span class="sg-f2">fase 2</span>':''}</div></div>`;
    return `<div class="fac-card" id="sgIndicadores"><div class="fac-head"><div><h3>Indicadores del mes</h3><div class="fac-sub">Para Gerencia: comparan lo cotizado con lo cobrado y miden el cierre de cada escala</div></div></div>
      <div class="sg-kpis">${k('Variación PDA vs. facturado','+2.8 %','Escalas cerradas en octubre')}${k('Saldo vencido por cobrar','USD '+din(suma(venc)), venc.length+(venc.length===1?' factura':' facturas'))}
      ${k('Días del zarpe a la FDA','4.2 días','Promedio; meta 3 días',true)}${k('FDA en riesgo de time-bar', plazo.length+' · USD '+din(suma(plazo)),'Vencen en 30 días o menos',true)}</div></div>`;
  }
  function filtros(){
    const opts = (lista, v, k, ph) => `<select onchange="sgSet('${k}',this.value)"><option value="">${ph}</option>${lista.map(x=>`<option ${x[0]===v?'selected':''} value="${esc(x[0])}">${esc(x[1])}</option>`).join('')}</select>`;
    const unicos = k => [...new Set(CUENTAS.map(c=>c[k]))].sort().map(x=>[x,x]);
    return CC.filtros({ id:'sgF', titulo:'Buscar cuentas', sub:'Filtra por grupo, comercial, puerto, nave o código', cols:4,
      campos:[CC.campo('Grupo', opts(GRUPOS.map(g=>[g.k,g.t]), E.f.grupo, 'grupo', 'Todos')),
              CC.campo('Comercial', opts(unicos('com'), E.f.com, 'com', 'Todos')),
              CC.campo('Puerto', opts(unicos('puerto'), E.f.puerto, 'puerto', 'Todos')),
              CC.campo('Nave o código', `<input id="sgTexto" placeholder="Ej.: PACIFIC AURORA" value="${esc(E.f.texto)}" onkeydown="if(event.key==='Enter')sgBuscar()">`)],
      buscar:'sgBuscar()', limpiar:'sgLimpiar()' });
  }
  function tabla(){
    const l = filas();
    const t = CC.tablaResultados({ id:'sgRes', titulo:'Cuentas abiertas', filas:l, pagina:E.pagina, tam:E.tam, fnPagina:'sgPagina', exportar:'sgExportar()',
      columnas:[
        {t:'Cuenta', v:c=>`<b>${esc(c.cod)}</b><div class="sg-cta">${esc(c.tipo)} · Viaje ${esc(c.viaje)}${c.fase===2?' · <span class="sg-f2">fase 2</span>':''}</div>`},
        {t:'Nave y cliente', v:c=>`${esc(c.nave)}<div class="sg-cta">${esc(c.puerto)} · ${esc(c.cliente)}</div>`},
        {t:'Monto', v:c=>`<span class="sg-num">${esc(c.mon)} ${din(c.monto)}</span><div class="sg-cta">${esc(c.ft)} ${fecha(c.f)}</div>`},
        {t:'Motivo', v:c=>`<div class="sg-mot"><span class="sg-dot" style="background:${grupoDe(c.g).c};margin-top:5px"></span><span>${esc(c.motivo)}</span></div>`},
        {t:'Acción', v:c=>`<button type="button" class="cc-btn" onclick="sgRegularizar('${esc(c.cod)}')">${c.g==='proximas'?'Ver':'Regularizar'}</button>`},
      ]});
    return E.sel ? t.replace(new RegExp(`<tr>(<td><b>${E.sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</b>)`), '<tr class="sg-sel">$1') : t;
  }
  function banner(){
    const c = E.sel && porCodigo(E.sel); if(!c) return '';
    return `<div class="sg-banner" id="sgBanner"><div><b>Cuenta abierta desde el correo: ${esc(c.cod)}</b><div class="sg-sub">${esc(c.nave)} · ${esc(c.motivo)}</div></div>
      <button type="button" class="cc-btn" onclick="sgRegularizar('${esc(c.cod)}')">${c.g==='proximas'?'Ver':'Regularizar'}</button></div>`;
  }

  CC.registrarPantalla({
    id: ID, grupo:'Agenciamiento', opcion:'Seguimiento de cuentas', propuesta:T,
    titulo:'Seguimiento de cuentas de escala', migas:['Inicio','Agenciamiento','Seguimiento de cuentas'],
    html: () => banner() + resumen() + indicadores() + filtros() + tabla(),
    alAbrir: (sec, cod) => {
      if(cod && porCodigo(cod)){
        E.sel = cod; const c = porCodigo(cod);
        const idx = filas().findIndex(x => x.cod===cod); if(idx >= 0) E.pagina = Math.floor(idx/E.tam) + 1;
        CC.refrescar(ID);
        setTimeout(() => { const tr = D.querySelector('#sgRes tr.sg-sel'); if(tr) tr.scrollIntoView({block:'center', behavior:'smooth'}); }, 150);
        if(c) CC.toast(`${c.cod}: ${c.motivo}`, 'info');
      }
    },
    guia: [{t:'Seguimiento del reporte diario', steps:[
      {go:()=>CC.abrir(ID), el:'#sgResumen', h:'Resumen', p:'Lo mismo que el correo: total abierto, lo urgente y una barra por grupo. Elige un grupo para filtrar.'},
      {el:'#sgIndicadores', h:'Indicadores del mes', p:'Para Gerencia: variación PDA vs. facturado, saldo vencido, días a la FDA y time-bar en riesgo.'},
      {el:'#sgRes', h:'Regularizar', p:'Cada cuenta explica qué hacer y lleva a la PDA, la FDA o Cobranzas.'}]}]
  });

  /* ---------- Enlace directo desde el correo: ?cuenta=<código> ---------- */
  function desdeUrl(){
    const cod = (new URLSearchParams(location.search).get('cuenta') || '').trim().toUpperCase(); if(!cod) return;
    setTimeout(() => CC.abrir(ID, cod), 80);
  }
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', desdeUrl); else desdeUrl();
})();
