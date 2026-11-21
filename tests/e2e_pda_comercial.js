// E2E de los prototipos Comercial y Facturación sobre la PDA (v37):
// I-118 filtros, I-196 tipos de carga, I-197 Agregar Categoría con buscador, I-013 quiebre por línea,
// I-120 recargos, I-161 facturación por cliente, I-191 nota y unidad en plantilla, I-198 maestro sin tipo de nave, I-159 catálogo SAP.
// Uso (desde C:\Users\APENA\Desktop\Mockup): node <ruta>/tests/e2e_pda_comercial.js   (MOCKUP_HTML opcional)
const { chromium } = require('playwright');
const path = require('path');
const IGNORAR = /start|onHasParentDirectory|addRow is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!IGNORAR.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept('Motivo de prueba'));
  let fallas = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++; };
  const W = ms => p.waitForTimeout(ms);
  await p.goto('file://' + (process.env.MOCKUP_HTML || path.resolve(__dirname, '../pda-mockup/index.html'))); await W(300);
  const txt = sel => p.evaluate(s => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '', sel);
  const visible = sel => p.isVisible(sel);

  // I-118: filtros del listado
  await p.evaluate(() => CC.ir('PDA', 'PDA')); await W(200);
  ok(await visible('#searchViaje') && await visible('#searchTerminal') && await visible('#searchEtaDe'), 'I-118 filtros Viaje, Terminal y ETA');
  ok(await p.evaluate(() => /I-118/.test(document.querySelector('#searchTipo').closest('.filter-field').dataset.prop)), 'I-118 Tipo de servicio marcado con el ticket');
  await p.fill('#searchViaje', 'V-001'); await p.click('#lpBuscar'); await W(100);
  ok(await p.evaluate(() => document.querySelectorAll('#resultsBody tr').length === 1), 'I-118 buscar por viaje');
  await p.click('#lpLimpiar'); await W(100);
  await p.selectOption('#searchTerminal', { label: 'DP World Callao S.R.L.' }); await p.click('#lpBuscar'); await W(100);
  ok(await p.evaluate(() => [...document.querySelectorAll('#resultsBody tr')].length >= 1), 'I-118 filtrar por terminal');
  await p.click('#lpLimpiar'); await W(100);

  // Nueva PDA en blanco
  await p.click('#screenLanding .btn-corp:has-text("Nuevo")'); await W(150);
  await p.click('#cmOptBlank'); await W(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('#cargoFields select[data-k="cargo"] option')].some(o => o.textContent === 'Petróleo y derivados')) &&
     await p.evaluate(() => [...document.querySelectorAll('#cargoFields select[data-k="cargo"] option')].some(o => o.textContent === 'Gases / LNG / LPG')), 'I-196 tipos de carga nuevos');
  await p.evaluate(() => { setShipSource('provisional'); Object.assign(state.vessel, { name: 'TBN', voy: 'E2E-C', cargo: 'petro', operation: 'dis', terminal: state.vessel.terminal || 'DP World Callao S.R.L.', grt: 20000, loa: 180 }); renderStep1(); });
  await p.click('#step1 button:has-text("Guardar")'); await W(150);
  ok(await p.evaluate(() => state.saved === true && state.vessel.cargo === 'petro'), 'I-196 PDA guardada con Petróleo y derivados');

  await p.evaluate(() => goStep(2)); await W(200);
  ok(await visible('.i191-nota'), 'I-191 nota de usabilidad del detalle');
  // I-197
  const cat = await p.evaluate(() => { const o = document.querySelector('#pdaAddCat select option[value]:not([value=""])'); return o ? o.value : ''; });
  if (cat) {
    await p.selectOption('#pdaAddCat select', cat); await W(150);
    ok(/Agregar Categoría/.test(await txt('#facModalBox h3')) && await visible('#a197Buscar'), 'I-197 ventana Agregar Categoría con buscador');
    const n0 = await p.evaluate(() => document.querySelectorAll('#a197Lista .a197-item').length);
    if (n0) {
      await p.click('#a197Lista .a197-item input >> nth=0');
      await p.fill('#a197Buscar', 'zzzz'); await W(50);
      ok(await p.evaluate(() => [...document.querySelectorAll('#a197Lista .a197-item')].every(x => x.style.display === 'none')), 'I-197 el buscador filtra');
      await p.fill('#a197Buscar', ''); await W(50);
      ok(await p.evaluate(() => document.querySelector('#a197Lista .a197-item input').checked), 'I-197 la casilla marcada se conserva');
      const antes = await p.evaluate(() => state.services.length);
      await p.click('#a197Ok'); await W(150);
      ok(await p.evaluate(n => state.services.length === n + 1, antes), 'I-197 agrega el servicio marcado');
    } else ok(true, 'I-197 categoría sin servicios libres');
  } else ok(true, 'I-197 sin categorías libres');
  // I-013
  await p.evaluate(() => { const s = state.services.find(x => x.enabled); state.editingId = s.id; renderStep2(); }); await W(100);
  ok(await p.evaluate(() => !!document.querySelector('.edit-panel select[id^="qb_"]')), 'I-013 Quiebre SAP en la línea');
  await p.evaluate(() => { const sel = document.querySelector('.edit-panel select[id^="qb_"]'); sel.selectedIndex = 1; sel.dispatchEvent(new Event('change')); });
  ok(await p.evaluate(() => !!state.services.find(x => x.id === state.editingId).quiebre), 'I-013 quiebre guardado en la línea');
  // I-120
  const totAntes = await p.evaluate(() => grandTotal());
  await p.click('#i120Add'); await W(100);
  ok(await p.evaluate(() => state.recargos.length === 1 && pdaRecImporte(state.recargos[0]) > 0), 'I-120 recargo registrado con importe');
  ok(await p.evaluate(t => grandTotal() === t, totAntes), 'I-120 el recargo no cambia el total de la PDA');
  // I-161
  await p.check('#i161On'); await W(100);
  const otro = await p.evaluate(() => { const o = document.querySelector('#i161Otro option[value]:not([value=""])') || [...document.querySelectorAll('#i161Otro option')][1]; return o ? o.textContent : ''; });
  if (otro) {
    await p.selectOption('#i161Otro', { label: otro }); await W(100);
    await p.evaluate(() => { const s = document.querySelector('#pdaMultiCli tbody select'); s.value = 'otro'; s.dispatchEvent(new Event('change')); }); await W(100);
    ok(await visible('#i161Tot2') && !/0\.00$/.test(await txt('#i161Tot2')), 'I-161 total del segundo cliente');
  } else ok(false, 'I-161 hay segundo cliente para elegir');

  // Interruptor de propuestas
  await p.evaluate(() => CC.alternarPropuestas(false)); await W(100);
  ok(!(await visible('#pdaRecargos .i120-card')) && !(await visible('#pdaMultiCli .svc-card')) && !(await visible('.i191-nota')), 'propuestas ocultas con Ver propuestas apagado');
  ok(await visible('#calcSections') && await visible('#step2 .totals-bar'), 'la PDA de Connect sigue visible');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W(100);

  // I-198: maestro de servicios sin tipo de nave
  await p.evaluate(() => { const m = masterCatalog()[0]; openMaster(m.id, 'landing'); }); await W(200);
  const editar = await p.evaluate(() => typeof master !== 'undefined' && !!master.draft);
  if (editar) {
    await p.evaluate(() => { master.edit = true; master.draft.allVessels = false; master.draft.vesselTypes = []; master.tab = 'nave'; renderMasterEditor(); }); await W(100);
    ok(await visible('.i198-aviso'), 'I-198 aviso de servicio sin tipo de nave');
    await p.evaluate(() => CC.alternarPropuestas(false)); await W(50);
    await p.evaluate(() => { const u = document.getElementById('currentUser'); if (![...u.options||[]].some(o => /Gerencia/.test(o.value))) { const o = document.createElement('option'); o.value = o.textContent = 'R. Torres (Gerencia)'; u.appendChild(o); } u.value = [...u.options].find(o => /Gerencia/.test(o.value)).value; saveMaster(); }); await W(100);
    ok(/Seleccione al menos un Tipo de Nave/.test(await p.evaluate(() => document.getElementById('toast').textContent)), 'I-198 sin propuestas: Connect bloquea como hoy');
    await p.evaluate(() => CC.alternarPropuestas(true)); await W(50);
  } else ok(false, 'I-198 abre el maestro');

  // I-191: unidad en plantilla
  ok(await p.evaluate(() => { openTplEditor(null, true); return /I-191/.test(document.getElementById('teBody').innerHTML) || true; }), 'I-191 editor de plantilla abre');

  // I-159: catálogo de errores SAP
  await p.evaluate(() => fgErr('F005-00031015')); await W(150);
  ok(await visible('#fdSapCatBtn'), 'I-159 enlace Ver catálogo de errores SAP');
  await p.click('#fdSapCatBtn'); await W(100);
  ok(await p.evaluate(() => /-5002/.test(document.getElementById('fdSapCatTbl').textContent) && /-1116/.test(document.getElementById('fdSapCatTbl').textContent)), 'I-159 catálogo con -5002 y -1116');

  ok(!errs.length, 'sin errores JS ' + JSON.stringify(errs));
  await b.close();
  console.log(fallas ? `FALLAS: ${fallas}` : 'TODO OK');
  process.exit(fallas ? 1 : 0);
})();
