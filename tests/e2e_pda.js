// E2E corto del módulo PDA y PDA Plantilla alineados a Connect (v37).
// Uso (desde C:\Users\APENA\Desktop\Mockup): node tests/e2e_pda.js   (MOCKUP_HTML opcional: ruta absoluta al index.html)
const { chromium } = require('playwright');
const path = require('path');
const IGNORAR = /start|onHasParentDirectory|addRow is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!IGNORAR.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept('Motivo de prueba'));
  let fallas = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++; };
  const W = ms => p.waitForTimeout(ms);
  await p.goto('file://' + (process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html'))); await W(300);
  const txt = sel => p.evaluate(s => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '', sel);
  const toastTxt = () => p.evaluate(() => document.getElementById('toast').textContent);

  // 1. Buscar PDA como Connect
  await p.evaluate(() => CC.ir('PDA', 'PDA')); await W(200);
  ok(/Buscar PDA/.test(await txt('#ccPbTitle')), 'título Buscar PDA');
  ok(await p.isVisible('#searchCode') && await p.isVisible('#searchNave') && await p.isVisible('#searchCliente'), 'filtros Código PDA, Nombre de Nave y Cliente');
  ok(await p.evaluate(() => [...document.querySelectorAll('#searchEstado option')].some(o => o.textContent === 'Finalizada')), 'estado Finalizada en el filtro');
  ok(await p.isDisabled('#lpBuscar') && await p.isDisabled('#lpLimpiar'), 'Buscar y Limpiar deshabilitados sin filtros');
  ok(/Resultados \(\d+\)/.test(await txt('#screenLanding .results-head h2')), 'Resultados (n)');
  ok(/Items por página/.test(await txt('#lpPager')), 'Items por página');
  ok(await p.isVisible('#lpExport'), 'botón Exportar');
  await p.fill('#searchNave', 'NORD'); await p.click('#lpBuscar'); await W(100);
  ok(await p.evaluate(() => document.querySelectorAll('#resultsBody tr').length === 1), 'buscar por nave filtra');
  await p.click('#lpLimpiar'); await W(100);

  // 2. Crear nueva PDA
  await p.click('#screenLanding .btn-corp:has-text("Nuevo")'); await W(150);
  ok(/Crear nueva PDA/.test(await txt('#createModal h3')), 'diálogo Crear nueva PDA');
  await p.click('#cmOptTpl'); await W(100);
  ok(await p.isDisabled('#cmCreateBtn'), 'Crear PDA deshabilitado hasta elegir plantilla');
  ok(await p.evaluate(() => [...document.querySelectorAll('#pickList .tpl-row')].length > 0 && /PLT/.test(document.getElementById('pickList').textContent)), 'lista de plantillas aprobadas con código');
  await p.click('#pickList .tpl-row >> nth=0'); ok(!(await p.isDisabled('#cmCreateBtn')), 'Crear PDA se habilita al elegir');
  await p.click('#cmOptBlank'); await W(300);
  ok(await p.evaluate(() => state.step === 1 && !!state.pdaNumber && !state.saved), 'Iniciar en Blanco abre Información General');
  ok(await p.evaluate(() => [...document.querySelectorAll('#opFields label,#cargoFields label')].map(l => l.textContent).join('|')).then(t => /Puerto \*/.test(t) && /Terminal \*/.test(t) && /Tipo de Operación \*/.test(t)), 'obligatorios con asterisco como Connect');
  await p.evaluate(() => { state.vessel.cargo = ''; }); await p.click('#step1 button:has-text("Guardar")'); await W(100);
  ok(/Por favor complete todos los campos obligatorios/.test(await toastTxt()), 'Guardar pide obligatorios');
  await p.evaluate(() => { setShipSource('provisional'); Object.assign(state.vessel, { name: 'TBN', voy: 'E2E-9', cargo: 'refined', operation: 'dis', terminal: state.vessel.terminal || 'DP World Callao S.R.L.', grt: 20000, loa: 180 }); renderStep1(); });
  await p.click('#step1 button:has-text("Guardar")'); await W(150);
  ok(await p.evaluate(() => state.saved === true && state.status === 'Pendiente'), 'PDA guardada en Pendiente de aprobación');
  await p.evaluate(() => openClientModal()); await p.fill('#ncName', 'Foreign Trader Ltd'); await p.fill('#ncEmail', 'malo'); await p.click('#clientModal button:has-text("Guardar")'); await W(100);
  ok(/Ingresa un correo válido/.test(await toastTxt()), 'valida correo del cliente nuevo');
  await p.fill('#ncEmail', 'ops@trader.example'); await p.fill('#ncTax', 'US-77812'); await p.click('#clientModal button:has-text("Guardar")'); await W(150);
  ok(await p.evaluate(() => state.client.name === 'Foreign Trader Ltd'), 'acepta Tax ID extranjero');

  // 3. Detalle
  await p.evaluate(() => goStep(2)); await W(200);
  ok(await p.isVisible('#step2 button:has-text("Recalcular (F9)")'), 'botón Recalcular (F9)');
  ok(/Total Neto/.test(await txt('#step2 .totals-bar')) && /Total VAT/.test(await txt('#step2 .totals-bar')) && /Total Bruto/.test(await txt('#step2 .totals-bar')), 'totales Neto, VAT y Bruto');
  ok(/Tarifa \(P\)/.test(await txt('#calcSections thead')), 'columnas Tarifa (P) y Cantidad (Q)');
  await p.evaluate(() => { document.getElementById('currentUser').value = 'G. Zapata (Operaciones)'; renderStep2(); });
  ok(await p.isVisible('#calcSections th:has-text("Val. Ope.") >> nth=0'), 'vista Operaciones con Val. Ope.');
  await p.evaluate(() => { document.getElementById('currentUser').value = 'A. Pérez (Comercial)'; renderStep2(); });
  // envío: cliente nuevo sin contactos de liquidación y operaciones
  await p.evaluate(() => openEmailModal()); await W(100);
  ok(await p.isDisabled('#emailSendBtn') && /contacto de liquidación/.test(await txt('#emailErr')), 'bloquea envío sin contactos del cliente');
  await p.evaluate(() => closeModal('emailModal'));

  // 4. Ver PDA aprobada
  await p.evaluate(() => openSamplePda('PDA2026000041PECLL')); await W(300);
  const head = await txt('#ccPdaHead');
  ok((head.match(/Enviar PDA/g) || []).length === 1 && !/Previsualizar PDF/.test(head), 'un solo botón Enviar PDA');
  ok(/Duplicar/.test(head), 'Duplicar en PDA aprobada');
  ok(await p.evaluate(() => document.querySelector('#ccPdaHead button[onclick="editPda()"]').disabled), 'Editar bloqueado en Aprobada (volver antes a pendiente)');
  await p.evaluate(() => openEmailModal()); await W(100);
  ok(/Comercial/.test(await txt('#emailModal')) && /Liquidación/.test(await txt('#emailModal')) && /Operaciones/.test(await txt('#emailModal')) && await p.evaluate(() => document.getElementById('emailSubject').readOnly), 'correo a contactos del cliente con plantilla fija');
  await p.evaluate(() => closeModal('emailModal'));
  await p.evaluate(() => goStep(3)); await W(150);
  await p.click('#statusActions button:has-text("Finalizar")'); await W(200);
  ok(await p.evaluate(() => state.status === 'Finalizada'), 'PDA Finalizada');
  ok(/No hay acciones disponibles para esta PDA/.test(await txt('#statusActions')), 'sin acciones en Finalizada');
  await p.evaluate(() => duplicatePda()); await W(300);
  ok(await p.evaluate(() => state.status === 'Pendiente' && state.pdaNumber !== 'PDA2026000041PECLL' && !state.vessel.eta && state.services.length > 0), 'Duplicar crea PDA nueva con ETA vacía');

  // 5. Plantillas
  await p.evaluate(() => CC.ir('PDA', 'PDA Plantilla')); await W(200);
  ok(/Consulta Plantilla PDA/.test(await txt('#ccPbTitle')), 'título Consulta Plantilla PDA');
  ok(/Tipo de Agenciamiento/.test(await txt('#screenTemplates thead')) && /Filtros Avanzados/.test(await txt('#tplFilters')), 'columnas y filtros de Connect');
  await p.click('#screenTemplates .buscar-head .btn-corp:has-text("Nuevo")'); await W(150);
  await p.fill('#teName', 'Abc'); await p.click('#teFoot button:has-text("Guardar")'); await W(100);
  ok(/al menos 5 caracteres/.test(await toastTxt()), 'nombre mínimo 5 caracteres');
  ok(!/Tarifa\b(?! de)/.test((await txt('#teBody thead')).replace('Unidad de Tarifa', '')), 'la plantilla no muestra tarifa');
  await p.evaluate(() => { Object.assign(tplEditing, { name: 'Plantilla E2E Callao', port: 'Callao', terminal: 'DP World Callao S.R.L.', vtype: 'tanker', agencia: 'Agenciamiento completo', operation: 'dis', cargo: 'refined', moneda: 'USD' }); });
  await p.click('#teFoot button:has-text("Guardar")'); await W(150);
  ok(await p.evaluate(() => TEMPLATE_STORE.find(t => t.name === 'Plantilla E2E Callao')?.estado === 'Pendiente de aprobación'), 'nueva plantilla queda Pendiente de aprobación');
  ok(await p.evaluate(() => TEMPLATE_STORE.find(t => t.name === 'Plantilla E2E Callao').services.every(s => s.rate == null)), 'plantilla guardada sin tarifa');
  await p.click('#teActs button:has-text("Aprobar")'); await W(150);
  ok(await p.evaluate(() => TEMPLATE_STORE.find(t => t.name === 'Plantilla E2E Callao').estado === 'Aprobada'), 'plantilla aprobada');
  await p.click('#teActs button:has-text("Inactivar")'); await W(100); await p.fill('#tfReasonTxt', 'Ya no se usa'); await p.click('#tfReasonBtn'); await W(150);
  ok(await p.evaluate(() => TEMPLATE_STORE.find(t => t.name === 'Plantilla E2E Callao').estado === 'Inactiva'), 'plantilla inactivada con motivo');

  // 6. Interruptor Ver propuestas
  await p.evaluate(() => backToLanding()); await W(150);
  await p.evaluate(() => CC.alternarPropuestas(false)); await W(100);
  ok(!(await p.isVisible('#searchObs')) && !(await p.isVisible('#searchTipo')), 'propuestas ocultas con Ver propuestas apagado');
  await p.evaluate(() => CC.alternarPropuestas(true));

  ok(errs.length === 0, 'sin errores JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? '\nHAY FALLAS' : '\nTODO OK'); process.exit(fallas ? 1 : 0);
})();
