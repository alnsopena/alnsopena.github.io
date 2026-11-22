// E2E corto de la FDA (propuesta HU-COM-06 · I-202): búsqueda, Generar FDA desde Ver PDA, adendas, envío y cierre.
// Uso (desde C:\Users\APENA\Desktop\Mockup): node tests/e2e_fda.js   (MOCKUP_HTML opcional: ruta absoluta al index.html)
const { chromium } = require('playwright');
const path = require('path');
const IGNORAR = /start|onHasParentDirectory|addRow is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!IGNORAR.test(e.message)) errs.push(e.message); });
  let fallas = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++; };
  const W = ms => p.waitForTimeout(ms);
  await p.goto('file://' + (process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html'))); await W(300);
  const txt = sel => p.evaluate(s => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '', sel);
  const toastTxt = () => p.evaluate(() => document.getElementById('toast').textContent);
  await p.evaluate(() => chooseType('maritimo'));

  // 1. Menú PDA > FDA y búsqueda
  await p.click('#ccMenu [data-menu="PDA"]'); await W(150);
  ok(await p.isVisible('#ccDropdown button.cc-prop:has-text("FDA")'), 'opción FDA en el menú PDA, marcada como propuesta');
  await p.click('#ccDropdown button:has-text("FDA")'); await W(200);
  ok(/Buscar FDA/.test(await txt('#ccPbTitle')), 'título Buscar FDA');
  ok(/HU-COM-06 · I-202/.test(await txt('#fdaF')), 'marca HU-COM-06 · I-202');
  for (const id of ['#fdaFCod', '#fdaFNave', '#fdaFViaje', '#fdaFCli', '#fdaFEst']) ok(await p.isVisible(id), 'filtro ' + id);
  ok((await txt('#fdaRes')).includes('Resultados (4)') && (await txt('#fdaRes')).includes('Items por página'), 'Resultados (4) con Items por página');
  const cols = await p.$$eval('#fdaRes th', x => x.map(e => e.textContent.trim()).join('|'));
  ok(cols === 'Código FDA|PDA de origen|Nave|Viaje|Puerto|Cliente|Zarpe|Total|Moneda|Estado|Time-bar', 'columnas de la búsqueda');
  ok(await p.evaluate(() => [...new Set(FDA_LISTA.map(f => f.estado))].length === 3), 'ejemplos con estados Abierta, Enviada y Cerrada');
  ok(await p.evaluate(() => document.querySelectorAll('#fdaRes .fda-aviso').length >= 1), 'aviso de time-bar por vencer (30 días o menos)');
  ok(await p.evaluate(() => { const e = document.querySelector('#fdaRes .fac-scroll'); return e.scrollWidth <= e.clientWidth + 1; }), 'tabla sin desborde a 1366 px');
  await p.selectOption('#fdaFEst', 'Enviada'); await p.click('#fdaF button:has-text("Buscar")'); await W(150);
  ok((await txt('#fdaRes')).includes('Resultados (2)'), 'filtro por estado Enviada');
  await p.click('#fdaF button:has-text("Limpiar")'); await W(100);
  await p.fill('#fdaFNave', 'coral'); await p.click('#fdaF button:has-text("Buscar")'); await W(100);
  ok((await txt('#fdaRes')).includes('Resultados (1)') && (await txt('#fdaRes')).includes('FDA2026000079PESVY'), 'filtro por nave');
  await p.click('#fdaF button:has-text("Limpiar")'); await W(100);

  // 2. Ver PDA aprobada: Generar FDA; la PDA no cambia
  await p.evaluate(() => openSamplePda('PDA2026000041PECLL')); await W(300);
  ok((await txt('#fdaBtnPda')) === 'Generar FDA', 'Ver PDA aprobada muestra Generar FDA');
  const antes = await p.evaluate(() => ({ snap: pdaSnapshot(), st: state.status, n: state.services.filter(s => s.enabled).length, tot: grandTotal() }));
  await p.click('#fdaBtnPda'); await W(300);
  const desp = await p.evaluate(() => ({ snap: pdaSnapshot(), st: state.status }));
  ok(desp.snap === antes.snap && desp.st === antes.st, 'la PDA no cambia al generar la FDA');
  const nueva = await p.evaluate(() => FDA_LISTA.find(f => f.pda === 'PDA2026000041PECLL'));
  ok(!!nueva && /^FDA2026\d{6}PECLL$/.test(nueva.codigo), 'FDA con código propio formato PDA y prefijo FDA: ' + (nueva && nueva.codigo));
  ok(nueva && nueva.lineas.length === antes.n, 'FDA con los mismos servicios de la PDA');
  ok(/Ver FDA/.test(await txt('#ccPbTitle')) && (await txt('.fda-det')).includes(nueva.codigo), 'abre el detalle de la FDA');
  ok(await p.evaluate(t => Math.abs(FDA_LISTA[0].lineas.reduce((a, l) => a + l.cantP * l.tarP, 0) - t) < 0.05, antes.tot), 'PDA estimado igual al total de la PDA');
  const cab = await txt('.fda-cab');
  for (const k of ['Código FDA', 'PDA de origen', 'Nave', 'Viaje', 'Puerto', 'Cliente', 'Zarpe', 'Estado', 'Fecha de envío', 'Time-bar']) ok(cab.includes(k), 'cabecera: ' + k);
  ok(await p.evaluate(() => { const f = FDA_LISTA[0]; const z = new Date(f.zarpe + 'T12:00:00'); z.setDate(z.getDate() + 90); return f.dias === 90 && document.querySelector('.fda-cab').textContent.includes(z.toISOString().slice(0, 10).split('-').reverse().join('/')); }), 'time-bar = zarpe + 90 días');
  ok(await p.isVisible('.fda-comp') && /Profit inicial/.test(await txt('.fda-kpis')) && /Profit final/.test(await txt('.fda-kpis')), 'comparación por línea con profit inicial y final');
  await p.evaluate(() => openSamplePda('PDA2026000041PECLL')); await W(300);
  ok((await txt('#fdaBtnPda')) === 'Ver FDA', 'si ya existe, Ver PDA muestra Ver FDA');
  await p.click('#fdaBtnPda'); await W(250);

  // 3. Adendas: motivo obligatorio, servicio nuevo y cambio de tarifa; al aprobar pasa al viaje
  await p.click('.fda-tabs button:has-text("Adendas")'); await W(100);
  await p.click('button:has-text("Agregar adenda")'); await W(100);
  await p.fill('#fdaAdSvc', 'Suministro de agua dulce'); await p.fill('#fdaAdTar', '1200');
  await p.click('#facModalBox button:has-text("Guardar")'); await W(100);
  ok(/motivo es obligatorio/.test(await toastTxt()), 'adenda sin motivo bloqueada');
  await p.fill('#fdaAdMot', 'Pedido del capitán'); await p.click('#facModalBox button:has-text("Guardar")'); await W(150);
  await p.click('button:has-text("Agregar adenda")'); await W(100);
  await p.selectOption('#fdaAdTipo', 'Cambio de tarifa'); await W(100);
  await p.selectOption('#fdaAdLinea', { index: 1 }); await W(100);
  await p.fill('#fdaAdNuevo', '999'); await p.fill('#fdaAdMot', 'Tarifa del proveedor actualizada');
  await p.click('#facModalBox button:has-text("Guardar")'); await W(150);
  const ads = await p.evaluate(() => FDA_LISTA[0].adendas.map(a => ({ t: a.tipo, e: a.estado, por: a.por, ts: !!a.ts, m: a.motivo })));
  ok(ads.length === 2 && ads.every(a => a.e === 'Pendiente' && a.por && a.ts && a.m), 'dos adendas pendientes con quién, cuándo y motivo');
  const vyAntes = await p.evaluate(() => { const f = FDA_LISTA[0]; const v = VOYAGES.find(x => x.code === f.vy) || VOYAGES.find(x => x.nave === f.nave && x.nro === f.viaje); return v ? v.rows.length : -1; });
  const profAntes = await txt('.fda-kpis');
  await p.click('.fda-ad button:has-text("Aprobar")'); await W(150);
  ok(/servicios operativos del viaje/.test(await toastTxt()), 'aviso: pasa a los servicios operativos del viaje');
  await p.click('.fda-ad button:has-text("Aprobar")'); await W(150);
  const vyDesp = await p.evaluate(() => { const f = FDA_LISTA[0]; const v = VOYAGES.find(x => x.code === f.vy) || VOYAGES.find(x => x.nave === f.nave && x.nro === f.viaje); return v ? v.rows.length : -1; });
  ok(vyAntes >= 0 && vyDesp === vyAntes + 2, 'adendas aprobadas en los servicios operativos del viaje');
  ok(await p.evaluate(() => FDA_LISTA[0].adendas.every(a => a.estado === 'Aprobada' && a.aprPor)), 'adendas aprobadas con quién y cuándo');
  await p.click('.fda-tabs button:has-text("Comparación")'); await W(100);
  ok((await txt('.fda-comp')).includes('Suministro de agua dulce') && (await txt('.fda-kpis')) !== profAntes, 'la comparación y el profit reflejan las adendas');

  // 4. Enviar (vista previa PDF) y cerrar
  await p.click('.fda-det button:has-text("Enviar FDA")'); await W(150);
  ok(await p.isVisible('#facModalBox .pda-doc') && /FINAL DISBURSEMENT ACCOUNT \(FDA\)/.test(await txt('#facModalBox')), 'vista previa del PDF de la FDA');
  await p.click('#facModalBox button:has-text("Enviar al cliente")'); await W(150);
  ok(await p.evaluate(() => FDA_LISTA[0].estado === 'Enviada' && !!FDA_LISTA[0].envio), 'queda Enviada con fecha de envío');
  await p.click('.fda-det button:has-text("Cerrar FDA")'); await W(150);
  ok(await p.evaluate(() => FDA_LISTA[0].estado === 'Cerrada'), 'Cerrar FDA la deja Cerrada');
  ok(!(await p.isVisible('button:has-text("Agregar adenda")')) && !(await p.isVisible('.fda-det button:has-text("Enviar FDA")')), 'FDA cerrada sin acciones de cambio');
  await p.click('.fda-det button:has-text("Historial")'); await W(100);
  const hist = await p.$$eval('#histBody tr', r => r.map(x => x.textContent));
  ok(['Abierta', 'Enviada', 'Cerrada'].every(s => hist.some(h => h.includes(s))) && hist.every(h => /\d{2}\/\d{2}\/\d{4}/.test(h)), 'historial con cada cambio de estado y su fecha');
  await p.evaluate(() => closeModal('historyModal'));

  // 5. Ver propuestas apagado oculta todo
  await p.evaluate(() => CC.alternarPropuestas(false)); await W(150);
  ok(!(await p.isVisible('#screenFda')), 'con Ver propuestas apagado sale de la FDA');
  await p.evaluate(() => openSamplePda('PDA2026000041PECLL')); await W(250);
  ok(!(await p.isVisible('#fdaBtnPda')), 'botón de FDA oculto en Ver PDA');
  await p.click('#ccMenu [data-menu="PDA"]'); await W(150);
  ok(!/FDA/.test(await txt('#ccDropdown')), 'opción FDA oculta en el menú');
  await p.evaluate(() => CC.alternarPropuestas(true));

  ok(errs.length === 0, 'sin errores JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? '\nHAY FALLAS' : '\nTODO OK'); process.exit(fallas ? 1 : 0);
})();
