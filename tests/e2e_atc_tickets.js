// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_atc_tickets.js
// Prototipos sobre Connect: I-046 (HU-ATC-01) Mandato en Atención al cliente, I-047 (HU-ATC-06) adjuntos por contenedor,
// I-044 (HU-ATC-05) unidad y fecha en el masivo, I-045 (HU-ATC-02) alerta de VB, I-051 (HU-DOC-14) mantenimiento ISOCODE.
// Verifica que cada propuesta se oculte con "Ver propuestas" apagado y que no haya errores JS.
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(path.resolve(__dirname, '../../../../../node_modules/playwright')); }
const { chromium } = pw;
const local = path.resolve(__dirname, '../pda-mockup/index.html');
const HTML = process.env.MOCKUP_HTML || (fs.existsSync(local) ? local : path.resolve(__dirname, '../repo/pda-mockup/index.html'));
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
const ruido = /^(start|onHasParentDirectory|addRow) is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!ruido.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept());
  const W = (ms = 150) => p.waitForTimeout(ms);
  const top = () => p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const txt = s => p.textContent(s).then(x => (x || '').trim()).catch(() => '');
  const toast = () => txt('#toast');
  const dlg = () => p.locator('.ac-dlg.show').last();
  const enDlg = async (sel) => { await dlg().locator(sel).first().click(); await W(); };
  const activa = () => p.evaluate(() => document.querySelector('section.panel.active')?.id || '');
  const prop = async (on) => { await top(); const v = await p.evaluate(() => CC.verPropuestas); if (v !== on) { if (await p.locator('.modal-bg.show').count()) await p.evaluate(x => CC.alternarPropuestas(x), on); else await p.click('#propToggle'); await W(200); } };
  const ir = async (op) => {
    await top(); await p.click('#ccMenu [data-menu="Atención al cliente"]'); await W();
    const i = await p.evaluate(o => CC.menu.find(g => g.g === 'Atención al cliente').ops.findIndex(x => x.o === o), op);
    await p.click(`#ccDropdown button[data-cc-op="${i}"]`); await W(250);
  };
  await p.goto('file://' + HTML); await W(300);

  // I-046 · Mandato electrónico en Atención al cliente (pantalla propuesta)
  check(await p.evaluate(() => (CC.opcion('Atención al cliente', 'Mandato Electrónico') || {}).prop === 'I-046'), 'I-046: opción de menú marcada como propuesta');
  await ir('Mandato Electrónico');
  check(await activa() === 'screenAcMandato' && await txt('#ccPbTitle') === 'Mandatos Electrónicos', 'I-046: abre Mandatos Electrónicos');
  check(await p.evaluate(() => document.getElementById('screenAcMandato').classList.contains('cc-prop')), 'I-046: pantalla marcada en morado');
  await p.click('#mdF button:has-text("Buscar")'); await W();
  check((await txt('#mdRes')).includes('Resultados (2)') && (await txt('#mdRes')).includes('Items por página'), 'I-046: lista los 2 mandatos pendientes');
  await p.click('[data-md-aprobar="ME-000102"]'); await W(); await enDlg('[data-ac="confirmar"]');
  check((await toast()).includes('ME-000102: Aprobado'), 'I-046: aprobar desde el portal interno');
  await p.click('[data-md-observar="ME-000105"]'); await W(); await dlg().locator('textarea').fill('Falta la firma del representante legal'); await enDlg('[data-ac="motivo-ok"]');
  check((await toast()).includes('ME-000105: Observado'), 'I-046: observar con motivo');
  await p.selectOption('#mdFEst', ''); await p.click('#mdF button:has-text("Buscar")'); await W();
  await p.click('[data-md-ver="ME-000105"]'); await W();
  check((await dlg().textContent()).includes('Falta la firma del representante legal') && (await dlg().textContent()).includes('Historial'), 'I-046: el detalle guarda la decisión en el historial');
  await enDlg('[data-md-descargar]');
  check(await dlg().locator('#mdPdfProp.cc-prop').isVisible() && (await dlg().textContent()).includes('HU-ATC-01 · I-083'), 'I-083: la descarga abre el mandato (marca HU-ATC-01 · I-083)');
  await enDlg('[data-ac="md-pdf-descargar"]'); check((await toast()).includes('mandato-pacific-vigencia.pdf'), 'I-046/I-083: descarga del mandato sin error interno');
  await enDlg('[data-ac="md-pdf-cerrar"]');
  await enDlg('[data-md-correo="1"]');
  const mail = await dlg().textContent();
  check(mail.includes('Falta la firma del representante legal') && mail.includes('Mandato electrónico ME-000105: Observado') && mail.includes('HU-ATC-01 · I-034') && mail.includes('usuario que decidió'), 'I-034: aviso al cliente con el comentario, la decisión y copia al usuario interno');
  await enDlg('[data-ac="md-correo-cerrar"]');
  await enDlg('[data-ac="md-cerrar"]');
  await p.click('[data-md-rechazar="ME-000105"]'); await W(); await dlg().locator('textarea').fill('Documento ilegible'); await enDlg('[data-ac="motivo-ok"]');
  check((await toast()).includes('ME-000105: Rechazado'), 'I-046: rechazar un observado');
  await prop(false);
  check(await activa() !== 'screenAcMandato', 'I-046: con propuestas apagadas sale de la pantalla');
  await p.click('#ccMenu [data-menu="Atención al cliente"]'); await W();
  check(!(await p.isVisible('#ccDropdown button:has-text("Mandato Electrónico")')), 'I-046: la opción se oculta con Ver propuestas apagado');
  await p.keyboard.press('Escape'); await prop(true);

  // I-044 · Unidad de Conteo y Fecha Inicial de Cálculo en Actualización Masiva
  await ir('Instrucciones');
  const bl0 = await p.evaluate(() => AC.bls()[0].numero);
  await p.fill('#insFBl', bl0); await p.click('#insF button:has-text("Buscar")'); await W(200);
  await p.click(`[data-ins="${bl0}"]`); await W(); await enDlg('#insEditar'); await enDlg('#insMasiva');
  check(await dlg().locator('#insMProp.cc-prop').isVisible(), 'I-044: campos nuevos marcados como propuesta');
  const tipo = await p.evaluate(() => AC.contsDe(AC.bls()[0].numero).map(c => AC.isoDe(c.tipo))[0]);
  await dlg().locator('#insMT').selectOption(tipo); await dlg().locator('#insMD').fill('12');
  await dlg().locator('#insMU').selectOption('Días hábiles'); await dlg().locator('#insMF').selectOption('Fecha de arribo');
  await enDlg('[data-ac="masiva-archivo"]'); await enDlg('[data-ac="seleccionar"]'); await enDlg('[data-ac="guardar-adj"]');
  check(await dlg().locator('#insMU').inputValue() === 'Días hábiles', 'I-044: conserva la unidad al subir el archivo');
  await enDlg('[data-ac="masiva-guardar"]'); await enDlg('[data-ac="confirmar"]');
  const fila = await p.evaluate(t => { const c = AC.contsDe(AC.bls()[0].numero).filter(x => AC.isoDe(x.tipo) === t); return c.length; }, tipo);
  const vals = await dlg().locator('tbody tr select').evaluateAll(s => s.map(x => x.value));
  check(vals.filter(v => v === 'Días hábiles').length === fila && vals.filter(v => v === 'Fecha de arribo').length === fila, `I-044: aplica unidad y fecha a los ${fila} contenedor(es) del tipo`);
  check((await toast()).includes('unidad y fecha inicial'), 'I-044: aviso de valores aplicados, falta Guardar');
  await enDlg('#insGuardar'); check((await toast()).includes('guardadas exitosamente'), 'I-044: Guardar persiste');
  await p.click(`[data-ins="${bl0}"]`); await W(); await enDlg('#insEditar'); await enDlg('#insMasiva');
  await prop(false); check(!(await dlg().locator('#insMProp').isVisible()), 'I-044: Ver propuestas apagado oculta los campos nuevos');
  await prop(true);
  await p.evaluate(() => { document.querySelectorAll('.ac-dlg').forEach(e => e.remove()); });

  // I-045 · Alerta de VB al registrar una instrucción por contenedor
  const conVb = await p.evaluate(() => (CC.datos.contenedores.filter(c => c.indicador === 'Importación' && c.estado !== 'Devuelto vacío').find(c => AC.vbDe(c.numero)) || {}).numero);
  const sinVb = await p.evaluate(() => (CC.datos.contenedores.filter(c => c.indicador === 'Importación' && c.estado !== 'Devuelto vacío').find(c => !AC.vbDe(c.numero)) || {}).numero);
  check(!!conVb && !!sinVb, `I-045: hay contenedor con VB (${conVb}) y sin VB (${sinVb})`);
  await ir('Direccionamiento de Vacíos');
  await p.click('[data-tab="reg"]'); await W(); await p.click('#dvNuevo'); await W();
  await dlg().locator('#dvNL').selectOption('ZIM'); await dlg().locator('#dvNS').selectOption('Callao'); await enDlg('[data-ac="dv-anadir"]');
  await p.selectOption('#dvTipo', 'Por Contenedor'); await W();
  await p.fill('#dvCNum', conVb); await p.press('#dvCNum', 'Tab'); await W(); await p.selectOption('#dvCDep', '3014'); await W();
  await p.click('#dvAgregarCont'); await W();
  const alerta = await dlg().textContent().catch(() => '');
  check(alerta.includes(`El contenedor ${conVb} ya cuenta con un Visto Bueno generado el`) && /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(alerta), 'I-045: alerta con fecha y hora del VB');
  check(await dlg().locator('#dvVbAlerta.cc-prop').isVisible(), 'I-045: alerta marcada como propuesta');
  await enDlg('[data-ac="vb-ok"]');
  check(!(await p.locator('#dvForm table').last().textContent()).includes(conVb), 'I-045: el contenedor con VB no se agrega');
  await p.fill('#dvCNum', sinVb); await p.press('#dvCNum', 'Tab'); await W(); await p.selectOption('#dvCDep', '3014'); await W();
  await p.click('#dvAgregarCont'); await W();
  check((await p.locator('#dvForm table').last().textContent()).includes(sinVb), 'I-045: un contenedor sin VB continúa su registro');
  await prop(false);
  await p.fill('#dvCNum', conVb); await p.press('#dvCNum', 'Tab'); await W(); await p.selectOption('#dvCDep', '3022'); await W();
  await p.click('#dvAgregarCont'); await W();
  check((await p.locator('#dvForm table').last().textContent()).includes(conVb), 'I-045: con propuestas apagadas se comporta como Connect (sin alerta)');
  await prop(true);

  // I-047 · Adjuntos agrupados por contenedor en Registro de Daño
  await ir('Daño de Contenedores');
  const blMulti = await p.evaluate(() => AC.bls().find(b => AC.contsDe(b.numero).length > 1).numero);
  await p.click('#daNuevo'); await W(); await p.fill('#daNBl', blMulti); await p.click('#daNBuscar'); await W();
  check(await p.isVisible('#daNAdjCont.cc-prop') && !(await p.isVisible('#daNSubir')), 'I-047: adjuntos por contenedor en lugar de la lista única');
  const conts = await p.locator('.daNCont').evaluateAll(x => x.map(i => i.value));
  await p.locator('.daNCont').nth(0).check(); await W(); await p.locator('.daNCont').nth(1).check(); await W();
  check(await p.locator('#daNAdjCont details[data-da-grupo]').count() === 2, 'I-047: un desplegable por contenedor seleccionado');
  for (const t of ['Liquidación', 'Fotos', 'EIR']) {
    await p.click(`[data-da-subir="${conts[0]}"]`); await W();
    await dlg().locator('#daNT').selectOption(t); await enDlg('[data-ac="da-n-cargar"]'); await enDlg('[data-ac="da-n-guardar"]');
  }
  const g0 = await txt(`#daNAdjCont details[data-da-grupo="${conts[0]}"]`), g1 = await txt(`#daNAdjCont details[data-da-grupo="${conts[1]}"]`);
  check(g0.includes('Completo') && g0.includes('3 archivo(s)') && g1.includes('0 archivo(s)'), 'I-047: lo cargado en un contenedor no se asocia al otro');
  await p.fill('#daNCos', '250'); await p.fill('#daNPre', 'PRE-TEST-01');
  check((await txt('#daNuevoF')).includes('Depósito notificante *') && (await txt('#daNuevoF')).includes('HU-ATC-06 · I-094'), 'I-094: Depósito notificante obligatorio y marcado');
  await p.click('#daNGuardar'); await W();
  check((await toast()).includes('depósito notificante'), 'I-094: no graba sin depósito notificante en el Portal Interno');
  await p.selectOption('#daNDep', { index: 1 }); await W();
  await p.click('#daNGuardar'); await W();
  check((await toast()).includes(conts[1]) && (await p.isVisible(`#daNAdjCont details[data-da-grupo="${conts[1]}"][open]`)), 'I-047: exige los adjuntos de cada contenedor y abre el que falta');
  await p.click(`#daNAdjCont details[data-da-grupo="${conts[0]}"] summary`); await W();
  await p.locator(`#daNAdjCont details[data-da-grupo="${conts[0]}"] button:has-text("Quitar")`).first().click(); await W();
  check((await txt(`#daNAdjCont details[data-da-grupo="${conts[0]}"]`)).includes('2 archivo(s)') && (await txt(`#daNAdjCont details[data-da-grupo="${conts[1]}"]`)).includes('0 archivo(s)'), 'I-047: quitar un adjunto no afecta al otro contenedor');
  await prop(false);
  check(!(await p.isVisible('#daNAdjCont')) && await p.isVisible('#daNSubir'), 'I-047: Ver propuestas apagado vuelve a la lista única de Connect');
  await prop(true);
  await ir('Daño de Contenedores'); await p.click('#daF button:has-text("Buscar")'); await W();
  await p.locator('[data-da-adj]').first().click(); await W();
  check(await dlg().locator('#daAdjGrupos details[data-da-grupo]').count() >= 1, 'I-047: la consulta agrupa los adjuntos por contenedor');
  await enDlg('[data-ac="cerrar-adj"]');

  // I-051 · Mantenimiento ISOCODE dentro de Data Maestra > Catálogo
  await top(); await p.evaluate(() => CC.ir('Data Maestra', 'Catálogo')); await W(250);
  check(await p.isVisible('#caIso.cc-prop'), 'I-051: botón Mantenimiento ISOCODE marcado como propuesta');
  check(await p.evaluate(() => CC.menu.find(g => g.g === 'Data Maestra').ops.length) === 9, 'I-051: sin opciones nuevas en el menú de Data Maestra');
  await p.click('#caIso'); await W();
  check(await txt('#ccPbTitle') === 'Mantenimiento ISOCODE' && (await txt('#isoCard')).includes('Resultados (11)'), 'I-051: lista de ISOCODE');
  await p.click('#isoNuevo'); await W(); await p.fill('#isoCod', '22G1'); await p.selectOption('#isoTam', '20'); await p.selectOption('#isoTipo', 'DV'); await p.fill('#isoDesc', 'Duplicado');
  await p.click('#isoGuardar'); await W(); check((await toast()).includes('Ya existe'), 'I-051: no permite código duplicado');
  await p.fill('#isoCod', '25G1'); await p.click('#isoGuardar'); await W();
  check((await txt('#isoCard')).includes('25G1') && (await toast()).includes('guardado'), 'I-051: alta de ISOCODE');
  await p.click('[data-iso="25G1"] button:has-text("Editar")'); await W(); await p.fill('#isoDesc', 'High cube 20 pies'); await p.selectOption('#isoTipo', 'HC'); await p.click('#isoGuardar'); await W();
  await p.click('[data-iso="25G1"] button:has-text("Inactivar")'); await W();
  await p.click('[data-iso="25G1"] button:has-text("Historial")'); await W();
  const hist = await txt('.modal-bg.show');
  check(hist.includes('Edición') && hist.includes('Inactivación') && hist.includes('Creación') && /\d{2}:\d{2}/.test(hist), 'I-051: historial con usuario, fecha y hora');
  await p.click('.modal-bg.show button:has-text("Cerrar")'); await W();
  await prop(false);
  check(!(await p.isVisible('#isoCard')) && await p.isVisible('#caF'), 'I-051: Ver propuestas apagado vuelve a Buscar Catálogo');
  check(!(await p.isVisible('#caIso')), 'I-051: el botón se oculta con Ver propuestas apagado');
  await prop(true);

  // ===== Tickets Reportado de Atención al cliente (portal interno), atc39 =====
  // I-075 · Reporte de liberaciones en los cuatro estados
  await ir('Liberación de la Carga');
  check(await p.isVisible('#libRepNota.cc-prop') && (await txt('#libRepNota')).includes('HU-DOC-10 · I-075'), 'I-075: reporte de liberaciones marcado HU-DOC-10 · I-075');
  let repOk = true;
  for (const est of ['Pendiente', 'En proceso', 'Aprobado', 'Rechazado']) {
    await p.selectOption('#libFEst', est); await p.click('#libF button:has-text("Buscar")'); await W();
    await p.click('#libRes button:has-text("Exportar")'); await W();
    const r = await p.evaluate(() => AC.lib().ultRep);
    repOk = repOk && !!r && r.estado === est && r.filas > 0 && r.cols.slice(0, 7).join('|') === 'BL|Cliente|Contenedor|Fecha|Usuario|Pago|Estado';
  }
  check(repOk, 'I-075: descarga el reporte en Pendiente, En proceso, Aprobado y Rechazado con BL, cliente, contenedor, fecha, usuario, pago y estado');
  // I-110 · Reporte de memos emitidos
  await p.click('#libMemoRepBtn'); await W(); await enDlg('[data-ac="memo-rep-generar"]');
  const mr = await dlg().textContent();
  check(/Resultados \([1-9]\d*\)/.test(mr) && ['Número de memo', 'Depósito', 'Fecha de emisión', 'Vigencia', 'Estado'].every(t => mr.includes(t)), 'I-110: genera el reporte de memos emitidos del periodo');
  await enDlg('[data-ac="memo-rep-exportar"]');
  check((await p.evaluate(() => (AC.lib().ultMemoRep || {}).filas)) > 0, 'I-110: exporta el reporte con sus filas');
  await enDlg('[data-ac="memo-rep-cerrar"]');
  // I-105 e I-087 · MEMO emitido con estado, vigencia e instrucción aplicada
  await p.selectOption('#libFEst', 'Aprobado'); await p.click('#libF button:has-text("Buscar")'); await W();
  await p.locator('#libRes [data-lib]').first().click(); await W(250);
  await p.click('#libDet [data-tab="dep"]'); await W();
  await p.locator('[data-memo]').first().click(); await W();
  const memo = await dlg().textContent();
  const memoVals = (await dlg().locator('#memoEmitido input').evaluateAll(x => x.map(i => i.value))).join('|');
  check(await dlg().locator('#memoEmitido.cc-prop').isVisible() && memoVals.includes('Emitido') && /Hasta el \d{2}\/\d{2}\/\d{4}/.test(memoVals) && memoVals.includes('Disponible en el Portal Externo') && memo.includes('HU-ATC-04 · I-105'), 'I-105: el MEMO queda Emitido, con vigencia y publicado (HU-ATC-04 · I-105)');
  check(await dlg().locator('#memoInstr.cc-prop').isVisible() && memo.includes('Instrucción que fijó el depósito') && memo.includes('HU-ATC-04 · I-087'), 'I-087: el MEMO muestra la instrucción aplicada a cada contenedor (HU-ATC-04 · I-087)');
  await enDlg('[data-ac="cerrar-memo"]');
  await p.evaluate(() => libVolver()); await W(250);
  // I-092 · Sustento obligatorio en Direccionamiento Permanente
  await ir('Direccionamiento Permanente');
  await p.click('#dpF button:has-text("Buscar")'); await W(); await p.click('#dpNuevo'); await W(250);
  check(await p.isVisible('#dpSustento.cc-prop') && (await txt('#dpSustento')).includes('HU-DOC-30 · I-092'), 'I-092: aviso de sustento obligatorio marcado');
  await p.selectOption('#dpCli', { index: 1 }); await p.click('#dpAgregar'); await W();
  await p.evaluate(() => { dpSet(0, 'linea', 'ZIM'); dpSet(0, 'carga', 'Carga suelta'); dpSet(0, 'dep', '3014'); dpSet(0, 'desde', '2026-12-01'); dpSet(0, 'hasta', '2027-06-30', 1); }); await W();
  await p.click('#dpGuardar'); await W();
  check((await toast()).includes('documento de sustento') && await p.isVisible('#dpSubir'), 'I-092: sin sustento no se guarda y abre Adjuntos');
  await p.click('#dpSubir'); await W(); await enDlg('[data-ac="seleccionar"]'); await enDlg('[data-ac="guardar-adj"]');
  await p.click('#dpGuardar'); await W();
  check((await toast()).includes('creado exitosamente'), 'I-092: con sustento se guarda');
  // I-107 · Días libres aplicados al grabar, con usuario y fecha
  await ir('Instrucciones');
  await p.fill('#insFBl', bl0); await p.click('#insF button:has-text("Buscar")'); await W(200);
  await p.click(`[data-ins="${bl0}"]`); await W(); await enDlg('#insEditar');
  check(await dlg().locator('#insAplica.cc-prop').isVisible(), 'I-107: aviso de aplicación inmediata marcado');
  await dlg().locator('.ac-tbl-in tbody tr').first().locator('input[type=number]').fill('33'); await dlg().locator('.ac-tbl-in tbody tr').first().locator('input[type=number]').dispatchEvent('change');
  await enDlg('[data-tab="adj"]'); await enDlg('#insSubir'); await enDlg('[data-ac="seleccionar"]'); await enDlg('[data-ac="guardar-adj"]');
  await enDlg('#insGuardar');
  check((await toast()).includes('Días libres aplicados al BL'), 'I-107: los días libres se aplican al grabar, sin aprobación');
  await p.click(`[data-ins="${bl0}"]`); await W();
  check(await dlg().locator('[data-ins-aplicado]').count() >= 1 && (await dlg().textContent()).includes('HU-ATC-03 · I-107'), 'I-107: queda el usuario con fecha y hora');
  await enDlg('button:has-text("Cerrar")');
  // I-097 · Vigencias superpuestas de días libres
  await ir('Sobreestadía');
  await p.selectOption('#soFAmb', 'Cliente'); await W(); await p.selectOption('#soFCli', 'ANDES MINING EXPORT S.A.'); await p.selectOption('#soFOper', 'Importación');
  await p.click('#soF button:has-text("Buscar")'); await W(); await p.click('#soEditar'); await W();
  check(await p.isVisible('#soCruce.cc-prop') && (await txt('#soCruce')).includes('HU-ATC-11 · I-097'), 'I-097: regla de vigencias marcada');
  await p.click('#soAgregar'); await W();
  await p.evaluate(() => { const v = {linea:'ZIM', tam:'42G1', dias:'18', unidad:'Días calendario', fini:'Fecha de descarga', desde:'2026-12-31', hasta:'2027-02-28'}; Object.entries(v).forEach(([k, x]) => soSet(2, k, x)); });
  await p.click('#soGuardar'); await W();
  check((await toast()).includes('duplicados') && (await txt('#soCruceMsg')).includes('se cruza') && (await txt('#soCruceMsg')).includes('31/12/2026'), 'I-097: rechaza la vigencia que se cruza (extremos inclusivos) e identifica la regla');
  await p.click('#soRes .pink:has-text("Cancelar")'); await W();
  check(await p.locator('#soRes .ac-tbl-in tbody tr').count() === 2 && !(await txt('#soRes')).includes('18'), 'I-097: la regla existente no cambia y no se crea otra');
  await p.click('#soEditar'); await W(); await p.click('#soAgregar'); await W();
  await p.evaluate(() => { const v = {linea:'ZIM', tam:'42G1', dias:'18', unidad:'Días calendario', fini:'Fecha de descarga', desde:'2027-01-01', hasta:'2027-03-31'}; Object.entries(v).forEach(([k, x]) => soSet(2, k, x)); });
  await p.click('#soRes [data-tab="adj"]'); await W(); await p.click('#soSubir'); await W(); await enDlg('[data-ac="seleccionar"]'); await enDlg('[data-ac="guardar-adj"]');
  await p.click('#soGuardar'); await W();
  check((await toast()).includes('modificado exitosamente'), 'I-097: una vigencia sin cruce se registra');
  // Interruptor: las propuestas de los tickets se ocultan con Ver propuestas apagado
  await ir('Liberación de la Carga'); await prop(false);
  check(!(await p.isVisible('#libRepNota')) && !(await p.isVisible('#libMemoRepNota')), 'I-075/I-110: se ocultan con Ver propuestas apagado');
  await p.click('#libRes button:has-text("Exportar")'); await W();
  await prop(true);

  check(await p.evaluate(() => !Object.keys(localStorage).length), 'sin localStorage');
  check(await p.evaluate(() => !/[–—]/.test(document.body.innerText)), 'sin rayas en los textos visibles');
  check(errs.length === 0, `sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);
  await b.close();
  console.log(fails ? `\nHAY FALLAS (${fails})` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})();
