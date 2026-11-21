// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_documentacion.js
// Documentación v37: Importación (Documentos, BL, Transbordo, Direccionamiento), Exportación (Documentos, Reserva, Cutoff)
// y las propuestas I-037, I-062, I-017, I-080, I-081, I-185, I-069, I-055, I-074, I-078, I-036, I-060, I-019, I-022 e I-182. Falla si hay errores JS.
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
const ruido = /^(start|onHasParentDirectory|addRow) is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const errs = []; p.on('pageerror', e => { if (!ruido.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept());
  const W = (ms = 150) => p.waitForTimeout(ms);
  const top = () => p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const txt = s => p.textContent(s).then(x => (x || '').trim());
  const activa = () => p.evaluate(() => document.querySelector('section.panel.active')?.id || '');
  let toasts = [];
  await p.exposeFunction('__toast', m => toasts.push(m));
  const toast = () => { const t = toasts.join(' | '); toasts = []; return t; };
  const menu = async (s, o) => { await top(); await W(80); await p.click('#ccMenu [data-menu="Documentación"]'); await W(); await p.click(`#ccDropdown .cc-dd-sub:has-text("${s}") button:has-text("${o}")`); await W(250); };
  const modal = () => txt('#facModalBox');
  const abierto = () => p.isVisible('#facModal.show');
  const modalBtn = async t => { await p.click(`#facModalBox .fac-btns button:has-text("${t}")`); await W(200); };
  await p.goto('file://' + HTML); await W(300);
  await p.evaluate(() => { const o = window.toast; window.toast = function(m, t){ window.__toast(String(m)); return o.apply(this, arguments); }; });

  // Importación > Documentos
  await menu('Importación', 'Documentos');
  check(await activa() === 'screenDocImp' && (await txt('#ccPbTitle')).includes('Documentación de Importación'), 'Importación > Documentos abre screenDocImp');
  const fi = await txt('#docIF');
  check(['Consulta y carga', 'Ingresar datos y/o documentos', 'Cargar archivos', 'Nuevo', 'Solo Mostrar BL Provisionales', 'Estado Pago'].every(x => fi.includes(x)), 'filtros y botones de Connect');
  check(await p.isDisabled('#docIViaje'), 'Número de Viaje deshabilitado hasta elegir Nave');
  const ind = await p.$$eval('#docIInd option', o => o.map(x => x.textContent).slice(1).join('|')); check(ind === 'Importación|Transbordo|Tránsito', 'Indicador de Importación sin Exportación');
  const ri = await txt('#docIRes');
  check(/Resultados \(\d+\)/.test(ri) && ['Transmitir BL', 'Aviso de llegada', 'Enviar CDL', 'Enviar Discrepancias', 'Estado SUNAT', 'Fecha Descarga (COARRI)', 'Exportar', 'Reporte de Documentación', 'Descargar CDL', 'Items por página'].every(x => ri.includes(x)), 'resultados con columnas y botones de Connect');
  await p.check('#docIProv'); await p.click('#docIF button:has-text("Buscar")'); await W();
  check((await txt('#docIRes')).includes('Resultados (1)') && (await txt('#docIRes')).includes('Pendiente'), 'Solo Mostrar BL Provisionales filtra (sin número muestra Pendiente)');
  await p.click('#docIF button:has-text("Limpiar")'); await W();
  // 0103 con error y reintento
  const tx = '#docIRes tr:has-text("ZIMUREE0000031") button[title^="Transmitir a SUNAT (0103)"]';
  await p.click(tx); await W(); check((await modal()).includes('Se enviará la transmisión SUNAT 0103'), 'confirmación 0103');
  await modalBtn('Confirmar'); await W(1200);
  check(await p.isVisible('#docIRes tr:has-text("ZIMUREE0000031") button[title="Ver detalle de error SUNAT"]'), '0103 con error muestra detalle de error');
  await p.click(tx); await W(); await modalBtn('Confirmar'); await W(1200);
  check((await txt('#docIRes tr:has-text("ZIMUREE0000031")')).includes('TRANSMITIDO A SUNAT'), 'reintento 0103 pasa a TRANSMITIDO A SUNAT');
  toast(); await p.click('#docIRes button:has-text("Transmitir BL")'); await W(); check(toast().includes('Debe seleccionar al menos un BL'), 'Transmitir BL exige selección');
  await p.click('#docIRes tr:has-text("ZIMUREE0000031") button[title="Ver historial"]'); await W();
  check((await modal()).includes('Cambios') && (await modal()).includes('Eventos'), 'historial con pestañas Cambios y Eventos');
  await p.click('#facModalBox .fac-tabs button:has-text("Eventos")'); await W(); check((await modal()).includes('0103'), 'eventos con transmisión SUNAT');
  await modalBtn('Cerrar');
  await p.click('#docIF button:has-text("Cargar archivos")'); await W(); check(toast().includes('complete todos los campos obligatorios'), 'Cargar archivos exige nave y viaje');
  // Lote con selección
  await p.fill('#docIBl', 'ZIMUBOX0000019'); await p.dispatchEvent('#docIBl', 'change'); await p.click('#docIF button:has-text("Buscar")'); await W();
  await p.click('#docIRes tr:has-text("ZIMUBOX0000019") input[type=checkbox]'); await W();
  await p.click('#docIRes button:has-text("Transmitir BL")'); await W(); check((await modal()).includes('Elegible'), 'diálogo Transmitir BL con elegibilidad');
  await modalBtn('Transmitir'); await W(1300); check((await modal()).includes('Transmitidos correctamente: 1'), 'resultado de transmisión en lote'); await modalBtn('Aceptar'); await W(1000);
  await p.click('#docIF button:has-text("Limpiar")'); await W();
  // Editar BL
  await p.click('#docIRes button.fac-link:has-text("ZIMUBOX0000011")'); await W(250);
  check(await activa() === 'screenDocImpBl' && (await txt('#ccPbTitle')).includes('Editar BL'), 'abre Editar BL');
  const cab = await txt('#docEdCab'); check(['Ver historial', 'Descargar BL', 'Editar', 'Eliminar', 'POR REVISAR', 'TRANSMITIDO A SUNAT'].every(x => cab.includes(x)), 'cabecera con estados y botones');
  const tabs = await p.$$eval('#docEdTabs .fac-tabs button', x => x.map(e => e.textContent).join('|'));
  check(tabs === 'Información General|Información de Equipos|Información de Carga|Recargo - Cláusula|Descripciones', 'pestañas del BL de Importación');
  check(await p.isDisabled('#docEdGen select >> nth=0'), 'modo lectura hasta Editar');
  await p.click('#docEdEditar'); await W(250); if (await abierto()) await modalBtn('Omitir');
  await p.click('#docEdTabs .fac-tabs button:has-text("Información de Equipos")'); await W();
  await p.click('#docGequipos button:has-text("Sellos")'); await W(); check((await modal()).includes('Tipo de Sello'), 'diálogo Sellos'); await modalBtn('Cancelar');
  await p.click('#docEdTabs .fac-tabs button:has-text("Información General")'); await W();
  await p.click('#docEdGuardar'); await W(250); check(toast().includes('Importación actualizada correctamente'), 'guardar BL');
  await p.click('#ccPbTitle .cc-back'); await W(250); check(await activa() === 'screenDocImp', 'volver a la búsqueda');
  await p.click('#docIF button:has-text("Nuevo")'); await W(250); check((await txt('#ccPbTitle')).includes('Crear BL') && (await txt('#docEdPend')).includes('Campos pendientes para Aprobar BL'), 'Nuevo abre Crear BL con pendientes');
  await p.click('#docEdGuardar'); await W(); check(toast().includes('Complete los siguientes campos obligatorios'), 'Crear BL valida obligatorios');
  await p.click('#ccPbTitle .cc-back'); await W(250);

  // Transbordo
  await menu('Importación', 'Transbordo');
  check(await activa() === 'screenDocTrb', 'Transbordo abre su pantalla');
  const rt = await txt('#docTRes'); check(['Registro Nave Conexión', 'Numeración de solicitud de transbordo', 'Enviar Listado', 'N° de Solicitud', 'Sin Asignar', 'TRB-2026-000118'].every(x => rt.includes(x)), 'columnas y botones de Transbordo');
  await p.click('#docTRes button:has-text("Numeración de solicitud de transbordo")'); await W();
  check((await modal()).includes('Disponibles para transmitir'), 'diálogo de numeración');
  await p.click('#facModalBox tr:has-text("ZIMUTRS0000041") input'); await W(); await p.click('#facModalBox tr:has-text("ZIMUTRS0000042") input'); await W();
  await modalBtn('Confirmar (2)'); await modalBtn('Confirmar'); await W(1100); await modalBtn('Aceptar'); await W(1700);
  const res = await txt('#docTResumen'); check(res.includes('sin errores propios') && res.includes('con errores propios'), 'resumen de numeración con errores propios y ajenos');
  await p.click('#docTReenviar'); await W(1000); await modalBtn('Aceptar'); await W(1700);
  check((await txt('#docTRes tr:has-text("ZIMUTRS0000041")')).includes('TRB-2026-'), 'reenvío asigna N° de Solicitud');
  await p.click('#docTRes tr:has-text("ZIMUTRS0000043") button[title="Cancelar Numeración de Transbordo"]'); await W();
  await p.fill('#docTExp', 'EXP-2026-001'); await p.fill('#docMotTxt', 'Solicitud anulada por cambio de nave de conexión'); await modalBtn('Confirmar'); await W();
  check((await txt('#docTRes tr:has-text("ZIMUTRS0000043")')).includes('Sin Asignar'), 'cancelar numeración libera el N° de Solicitud');

  // Direccionamiento
  await menu('Importación', 'Direccionamiento');
  check(await activa() === 'screenDocDir' && (await txt('#docRF')).includes('Consulta y aprobaciones/ rechazos'), 'Direccionamiento abre su pantalla');
  await p.click('#docRRes tr:has-text("ZIMUBOX0000011") input[type=checkbox]'); await W();
  await p.click('#docRRes button:has-text("Aprobar")'); await W(); check((await modal()).includes('aprobar 1 direccionamiento'), 'confirmar aprobación');
  await modalBtn('Aprobar'); check((await txt('#docRRes tr:has-text("ZIMUBOX0000011")')).includes('Aprobado'), 'direccionamiento aprobado');
  await p.click('#docRRes tr:has-text("ZIMUBOX0000019 (provisional)") button:has-text("Relacionar BL")'); await W();
  await p.fill('#docRlBl', 'ZIMUBOX0000019'); await p.click('#docRlBuscar'); await W(500);
  await p.click('#facModalBox input[name=docRl]'); await W(); await modalBtn('Relacionar');
  check(toast().includes('BL relacionado correctamente'), 'relacionar BL provisional');

  // Exportación > Documentos
  await menu('Exportación', 'Documentos');
  check(await activa() === 'screenDocExp' && (await txt('#ccPbTitle')).includes('Documentación de Exportación'), 'Exportación > Documentos abre screenDocExp');
  const re = await txt('#docERes');
  check(['Número de Reserva', 'Nave', 'ATA', 'Versión', 'Estado SUNAT Reserva', 'Trans. Reserva Manual', 'Estado SUNAT BL', 'Equipos Confirmados', 'Enviar Aviso de Zarpe', '(Reserva extemporánea)'].every(x => re.includes(x)) && !re.includes('Vessel Name'), 'columnas de Exportación (Nave en español)');
  check(await p.locator('#docERes .doc-r37:visible').count() >= 2, 'I-037: ícono de restricción en la lista');
  await p.click('#docERes button[title*="Enviará: 0171"]:not(.dis) >> nth=0'); await W(); await modalBtn('Confirmar'); await W(1200);
  check(toast().includes('transmisión de la reserva a SUNAT se realizó correctamente'), 'transmitir reserva 0171');
  const r1 = await p.$$eval('#docERes tr', rows => { const r = rows.find(x => x.querySelector('.doc-r37') && x.textContent.includes('APROBADO')); return r ? r.querySelector('button.fac-link').textContent : ''; });
  await p.click(`#docERes button.fac-link:has-text("${r1}")`); await W(250);
  check(await activa() === 'screenDocExpRes' && (await txt('#ccPbTitle')).includes('Editar Reserva'), 'abre Editar Reserva');
  check((await p.$$eval('#docEdTabs .fac-tabs button', x => x.map(e => e.textContent))).includes('Trazabilidad'), 'pestaña Trazabilidad');
  check(await p.isVisible('#docEdR37'), 'I-037: tarjeta de restricciones en la reserva');
  check((await txt('#docEdCab')).includes('Roleo'), 'botón Roleo');
  await p.click('#docEdEditar'); await W(); await p.click('#docEdTabs .fac-tabs button:has-text("Información de Equipos")'); await W();
  check(await p.isVisible('#docEqR37') && await p.locator('#docGequipos .doc-r37:visible').count() >= 1, 'I-037: alerta en la pestaña Información de Equipos');
  await p.click('#docEdGuardar'); await W(); check((await modal()).includes('Aviso de restricción de exportación') && (await modal()).includes('solo avisa'), 'I-037: aviso al guardar');
  await p.click('#docR37Ok'); await W(300); check(toast().includes('Reserva actualizada correctamente'), 'I-037: guarda igual (no bloquea)');
  if (await abierto()) await modalBtn('Cancelar');
  await p.click('#ccPbTitle .cc-back'); await W(250);
  await p.click('#docERestrBtn'); await W(250);
  check(await activa() === 'screenDocExpRestr' && (await txt('#docRsRes')).includes('Payload máximo (KG)'), 'I-037: mantenimiento de restricciones');
  await p.click('#docRsNueva'); await W(); await p.click('#docRsGuardar'); await W();
  check(toast().includes('Ingrese al menos un límite'), 'I-037: exige un límite');
  await p.fill('#docRsPeso', '30000'); await p.selectOption('#docRsTipo', '40RH'); await p.click('#docRsGuardar'); await W();
  check((await txt('#docRsRes')).includes('40RH'), 'I-037: crea restricción');
  await top(); await p.click('#propToggle'); await W(250);
  check(await activa() !== 'screenDocExpRestr', 'apagar propuestas saca de la pantalla I-037');
  await menu('Exportación', 'Documentos');
  check(!(await p.isVisible('#docERestrBtn')) && await p.locator('#docERes .doc-r37:visible').count() === 0, 'apagado oculta I-037 en Exportación');
  await top(); await p.click('#propToggle'); await W(200);

  // Cutoff
  await menu('Exportación', 'Cutoff');
  check(await activa() === 'screenDocCut' && (await txt('#docCF')).includes('Ingrese datos'), 'Cutoff abre su búsqueda');
  await p.click('#docCF button:has-text("Buscar")'); await W(250);
  check(await activa() === 'screenDocCutForm' && (await txt('#ccPbTitle')).includes('Edición de Cutoffs'), 'cutoff existente abre Edición de Cutoffs');
  await p.click('#docCoEditar'); await W();
  await p.check('#docCoExc input[name=docCoTipo] >> nth=1'); await W();
  await p.fill('#docCoAmp', await p.evaluate(() => { const d = new Date(Date.now() + 90 * 36e5); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); })); await p.dispatchEvent('#docCoAmp', 'change'); await W();
  await p.check('#docCoExc input[name=docCoPor] >> nth=1'); await W();
  const resv = await p.evaluate(() => { const c = document.querySelectorAll('#docCoGrid tbody td'); return c[1] ? c[1].textContent.trim().split(' ')[0] : ''; });
  await p.fill('#docCoResIn', resv); await p.press('#docCoResIn', 'Enter'); await W();
  await p.fill('#docCoMot', 'Ampliación pedida por el cliente para corregir datos'); await p.dispatchEvent('#docCoMot', 'input'); await p.click('#docCoAgregar'); await W();
  if (await abierto()) await modalBtn('Continuar');
  check((await txt('#docCoGrid')).includes('Nueva') && (await txt('#docCoGrid')).includes('Se registrará al guardar'), 'agrega excepción de Correctores');
  await p.click('#docCoGuardar'); await W(); if (await abierto()) await modalBtn('Continuar');
  check(toast().includes('Cutoff actualizado exitosamente.'), 'guardar cutoff');
  // I-074 (HU-DOC-25): vencimiento y baja con motivo
  check((await txt('#docCoGrid')).includes('Vencimiento') && (await txt('#docCoGrid')).includes('Sin vencimiento'), 'I-074: columna Vencimiento');
  await p.click('#docCoEditar'); await W();
  check(await p.isVisible('#docCoVence'), 'I-074: campo Vence el en la excepción');
  await p.click('#docCoGrid tbody tr input[type=checkbox] >> nth=0'); await W();
  await p.click('#docCoExc button:has-text("Eliminar")'); await W();
  check((await modal()).includes('Dar de baja excepción'), 'I-074: la baja pide motivo');
  await p.fill('#docMotTxt', 'Baja solicitada por el coordinador de exportación'); await modalBtn('Dar de baja');
  await p.click('#docCoGuardar'); await W(); if (await abierto()) await modalBtn('Continuar');
  check(toast().includes('Cutoff actualizado'), 'I-074: guarda la baja con motivo');
  await p.evaluate(() => CC.abrir('screenDocCut')); await p.fill('#docCPuerto', 'Paita'); await p.dispatchEvent('#docCPuerto', 'change'); await p.click('#docCF button:has-text("Buscar")'); await W(250);
  check((await txt('#ccPbTitle')).includes('Registro de Cutoffs'), 'cutoff nuevo abre Registro de Cutoffs');

  // ===== Propuestas de tickets sobre Documentación =====
  // I-062 (HU-DOC-05): configuración de avisos con vista previa
  await menu('Importación', 'Documentos');
  await p.click('#docIAvBtn'); await W(250);
  check(await activa() === 'screenDocAvisos' && (await txt('#docAvRes')).includes('Resultados (4)'), 'I-062: Configurar avisos abre los avisos de llegada');
  await p.click('#docAvRes tr:has-text("Paita") button.fac-link'); await W();
  const prev = await txt('#docAvPrev');
  check(prev.includes('Paita') && prev.includes('ZIM') && prev.includes('importaciones.paita') && !prev.includes('{PUERTO}'), 'I-062: vista previa con puerto, logos y contacto de la sucursal');
  await p.uncheck('#docAvEd input[type=checkbox] >> nth=5'); await W();
  check(!(await txt('#docAvPrev')).includes('Cuentas bancarias'), 'I-062: ocultar una sección actualiza la vista previa');
  await p.click('#docAvGuardar'); await W(); check(toast().includes('Configuración de aviso guardada'), 'I-062: guardar configuración');
  await p.click('#docAvF .fac-tabs button:has-text("Salida")'); await W();
  check((await txt('#docAvRes')).includes('Resultados (2)'), 'I-062: pestaña Aviso de Salida');

  // I-019 (HU-DOC-05): recargos del Aviso de Llegada según Carrier Code
  await menu('Importación', 'Documentos'); await p.evaluate(() => docIPag(1, 50)); await W();
  const ids = await p.evaluate(() => { const t = document.querySelector('#docIRes').textContent, z = [], o = [];
    CC.datos.blImportacion.forEach(b => { if (b.numero && t.includes(b.numero)) (b.linea === 'ZIM' ? z : o).push(b.numero); }); return { zA: z[0], zB: z[1], ot: o[0] }; });
  const recTab = async n => { await p.evaluate(x => docAbrirBLNumero(x), n); await W(250); await p.click('#docEdTabs .fac-tabs button:has-text("Recargo - Cláusula")'); await W(); };
  await recTab(ids.zA);
  const avZ = await txt('#docRecAvisoTbl');
  check((await txt('#docRecTur')).includes('TUR07108_ejemplo.xlsx') && (await txt('#docRecTur')).includes('Consignatario'), 'I-060: el BL muestra los recargos TUR con evidencia de carga y pagador');
  check(avZ.includes('Collect') && !avZ.includes('Prepaid') && avZ.includes('465.50'), 'I-019: BL ZIM con Collect y Prepaid muestra solo Collect y su total');
  await p.evaluate(() => docVolver(true)); await W();
  await recTab(ids.zB);
  check((await txt('#docRecAvisoTbl')).includes('no muestra el recuadro'), 'I-019: BL ZIM solo Prepaid no muestra el recuadro de fletes');
  await p.evaluate(() => docVolver(true)); await W();
  await recTab(ids.ot);
  const avO = await txt('#docRecAvisoTbl');
  check(avO.includes('Collect') && avO.includes('Prepaid') && avO.includes('1825.00'), 'I-019: BL de otra línea muestra Collect y Prepaid con su total');
  await p.selectOption('#docAvRegla', 'regimen'); await W();
  check(!(await txt('#docRecAvisoTbl')).includes('Prepaid'), 'I-019: la regla alternativa del área (PEN-I019-01) se puede comparar');
  await p.selectOption('#docAvRegla', 'linea'); await W();
  await p.evaluate(() => docVolver(true)); await W();
  await p.evaluate(() => docAvAbrir('Llegada')); await W(250);
  await p.click('#docAvRes tbody tr >> nth=0 >> button.fac-link'); await W(250);
  const pv = await txt('#docAvPrevFletes');
  check(pv.includes('Collect') && !pv.includes('Prepaid'), 'I-019: la vista previa del aviso ZIM aplica la misma regla');

  // I-060 (HU-DOC-01): carga de recargos TUR desde Documentos de Importación
  await menu('Importación', 'Documentos');
  await p.evaluate(() => { const b = CC.datos.blImportacion[0]; docIF('nave', b.nave); docIF('viaje', b.viaje); }); await W();
  await p.click('#docITurBtn'); await W();
  check(await p.isVisible('#docTurDlg'), 'I-060: abre la carga de recargos TUR');
  await p.click('#docTurOk'); await W();
  check((await txt('#docTurErr')).includes('obligatorios'), 'I-060: exige reporte y archivo');
  await p.selectOption('#docTurRep', { index: 1 }); await W();
  await p.setInputFiles('#docTurFile', { name: 'TUR07108_viaje.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('demo') }); await W();
  await p.click('#docTurOk'); await W();
  const tr = await txt('#docTurRes');
  check(tr.includes('TUR07108_viaje.xlsx') && /Recargos vinculados: \d+/.test(tr) && tr.includes('Collect') && tr.includes('Prepaid'), 'I-060: vincula recargos al BL con condición, lugar y pagador');
  check((await txt('#docTurObs')).includes('CURRENCY_DOC') && (await txt('#docTurObs')).includes('BL no registrado'), 'I-060: reporte de observaciones sin inventar valores');
  await modalBtn('Aceptar');

  // I-022 (HU-DOC-21): BL No Negociable
  await p.evaluate(() => docExpEditar('E7')); await W(250);
  check((await txt('#docEdNN')).includes('NN habilitado') && !(await p.isDisabled('#docNnDesc')), 'I-022: NN habilitado con todas las condiciones');
  await p.click('#docNnDesc'); await W();
  const nn = await txt('#docNnPrev');
  check(nn.includes('NOT NEGOTIABLE') && nn.includes('AS PER AGREEMENT') && nn.includes('Firma del representante legal'), 'I-022: vista previa con marca, fletes ocultos y firma');
  await p.click('#docNnPdf'); await W(); check(toast().includes('BL No Negociable'), 'I-022: descarga del NN');
  await p.evaluate(() => docVolver(true)); await W();
  await p.evaluate(() => docExpEditar('E3')); await W(250);
  check(await p.isDisabled('#docNnDesc') && (await txt('#docNnMotivo')).includes('Pendiente pago de documentación.'), 'I-022: bloqueado muestra el motivo visible');
  await p.evaluate(() => docVolver(true)); await W();
  await p.evaluate(() => docExpEditar('E4')); await W(250);
  check(await p.isVisible('#docNnRect'), 'I-022: corrección después del pago pide rectificación de manifiesto');
  await p.evaluate(() => docVolver(true)); await W();

  // I-182 (HU-DOC-39): guardado parcial en Por revisar desde la segunda edición
  const parcial = async (cons, n) => {
    await p.click('#docEdEditar'); await W(200);
    await p.evaluate(v => docEd('consignatario', v), cons); await W();
    await p.click('#docEdGuardar'); await W(250);
    if (await p.isVisible('#docR37Ok')) { await p.click('#docR37Ok'); await W(250); }
    check(toast().includes('Reserva actualizada correctamente') && (await txt('#docParcialUlt')).includes(`Edición ${n}`) && (await txt('#docEdCab .doc-estados .on')).includes('POR REVISAR'), `I-182: edición ${n} guarda solo el consignatario y sigue en Por revisar`);
  };
  await p.evaluate(() => docExpEditar('E1')); await W(250);
  await parcial('NUEVO CLIENTE UNO S.A.C.', 2);
  await parcial('NUEVO CLIENTE DOS S.A.C.', 3);
  check((await txt('#docEdPend')).length > 0 && !(await txt('#docEdPend')).includes('Ninguno'), 'I-182: los pendientes se mantienen para aprobar');
  await p.evaluate(() => docVolver(true)); await W();

  // I-055 (HU-DOC-20): eliminación en bloque con permiso especial
  await menu('Importación', 'Documentos');
  const nv = await p.$$eval('#docIRes tr', r => { const x = r.find(t => t.textContent.includes('ZIMUBOX0000011')); const td = x.querySelectorAll('td'); return [td[3].textContent.trim(), td[4].textContent.trim()]; });
  await p.fill('#docINave', nv[0]); await p.dispatchEvent('#docINave', 'change'); await W();
  await p.fill('#docIViaje', nv[1]); await p.dispatchEvent('#docIViaje', 'change'); await p.click('#docIF button:has-text("Buscar")'); await W();
  await p.click('#docIElBtn'); await W();
  check(await p.isVisible('#docElSinPerm') && await p.isDisabled('#docElOk'), 'I-055: sin permiso especial no se puede eliminar');
  await p.click('#facModalBox .fac-btns button:has-text("Cancelar")'); await W();
  await top(); await p.selectOption('#currentUser', { index: 4 }); await W();
  await p.click('#docIElBtn'); await W();
  check((await txt('#docElDlg')).includes('requiere anulación SUNAT aprobada') || (await txt('#docElDlg')).includes('Elegible'), 'I-055: elegibilidad por BL');
  await p.click('#docElDlg tbody input[type=checkbox]:not([disabled]) >> nth=0'); await W();
  await p.fill('#docElMot', 'BL duplicados por carga de archivos repetida'); await p.click('#docElOk'); await W();
  await modalBtn('Eliminar'); await W();
  check((await modal()).includes('Eliminados: 1'), 'I-055: resultado por BL de la eliminación en bloque'); await modalBtn('Aceptar');
  await top(); await p.selectOption('#currentUser', { index: 0 }); await W();
  await p.click('#docIF button:has-text("Limpiar")'); await W();

  // I-078 (HU-DOC-19) e I-080 / I-185 (HU-DOC-22): correctores y estado de aprobación
  await menu('Exportación', 'Documentos');
  check((await txt('#docERes')).includes('Correctores') && (await txt('#docERes')).includes('Corrector 1'), 'I-078: columna Correctores en la búsqueda de Exportación');
  await p.click('#docERes button.fac-link:has-text("Corrector 1") >> nth=0'); await W();
  const cd = await txt('#docCorrDet');
  check(cd.includes('Valor propuesto') && cd.includes('factura comercial') && cd.includes('buzón de Exportación'), 'I-078: detalle con comentario y aviso a Exportación');
  await modalBtn('Cerrar');
  await p.click('#docERes tr:has(button:has-text("Corrector 1")) button[title="Ver historial"] >> nth=0'); await W();
  const hc = await modal();
  check(hc.includes('Estado de aprobación') && hc.includes('Pendiente de aprobación') && hc.includes('Comentario del cliente'), 'I-080: historial con estado de aprobación y comentario');
  check(await p.isVisible('#docLogExp'), 'I-185: exportar log de cambios');
  await modalBtn('Cerrar');

  // I-081 (HU-DOC-22): borrador vigente
  const rc = await p.$$eval('#docERes tr', r => { const x = r.find(t => t.textContent.includes('Corrector 1')); return x.querySelector('button.fac-link').textContent; });
  await p.click(`#docERes button.fac-link:has-text("${rc}")`); await W(250);
  check((await txt('#docEdDraft')).includes('versión vigente V3') && (await txt('#docEdDraft')).includes('Historial de versiones y descargas'), 'I-081: versión vigente con historial');
  await p.click('#docDraftDesc'); await W(); check(toast().includes('descargado en PDF') && (await txt('#docEdDraft')).includes('Descarga de'), 'I-081: descarga registrada en el historial');

  // I-036 (HU-DOC-02): creación rápida de socio
  await p.click('#docEdEditar'); await W(250); if (await abierto()) await modalBtn('Omitir');
  await p.click('#docSoc_consignatario'); await W();
  check((await txt('#docSocDlg')).includes('Pendiente de aprobación') && (await txt('#docSocDlg')).includes('Consignatario'), 'I-036: alta rápida con rol preseleccionado');
  await p.selectOption('#docSo_pais', 'Países Bajos'); await W();
  await p.fill('#docSo_razon', 'Nordic Fresh Imports B.V.'); await p.fill('#docSo_dir', 'Havenweg 5, Rotterdam'); await p.fill('#docSo_correo', 'compras@nordicfresh.example');
  await p.click('#docSocCrear'); await W();
  check(toast().includes('Pendiente de aprobación') && (await p.$eval('#docSoc_consignatario', e => e.closest('.fac-f').querySelector('input').value)) === 'NORDIC FRESH IMPORTS B.V.', 'I-036: socio creado y seleccionado en el BL');
  await p.click('#docSoc_notificante'); await W();
  await p.selectOption('#docSo_pais', 'Países Bajos'); await W();
  await p.fill('#docSo_razon', 'nordic fresh imports b.v.'); await p.fill('#docSo_dir', 'Otra dirección'); await p.fill('#docSo_correo', 'otro@nordicfresh.example');
  await p.click('#docSocCrear'); await W();
  check(await p.isVisible('#docSocDup'), 'I-036: detecta socio existente');
  await p.click('#docSocUsar'); await W(); check(toast().includes('socio existente'), 'I-036: reutiliza el socio y agrega el rol');
  await p.evaluate(() => docEdCancelar()); await W(); if (await abierto()) await modalBtn('Salir sin guardar');

  // I-069 (HU-DOC-09): anulación en bloque por nave de origen
  await menu('Importación', 'Transbordo');
  await p.click('#docTAnBtn'); await W();
  check((await txt('#docAnDlg')).includes('Nave de origen'), 'I-069: anulación en bloque por nave de origen');
  await p.click('#docAnDlg tbody input[type=checkbox]:not([disabled]) >> nth=0'); await W();
  await p.fill('#docAnExp', 'EXP-2026-777'); await p.fill('#docAnMot', 'Cambio de nave de conexión para todo el lote');
  await p.click('#docAnOk'); await W(); await modalBtn('Anular'); await W();
  check((await modal()).includes('Anuladas: 1'), 'I-069: resultado por solicitud'); await modalBtn('Aceptar');
  await p.click('#docTRes tr:has-text("ZIMUTRS0000041") button[title="Ver historial"]'); await W();
  check(await p.isVisible('#docHistVinc'), 'I-017: vínculo del transbordo con el BL de Exportación'); await modalBtn('Cerrar');

  // Interruptor: apagado oculta las propuestas sin romper Connect
  await top(); await p.click('#propToggle'); await W(250);
  check(!(await p.isVisible('#docTAnBtn')) && (await txt('#docTRes')).includes('Numeración de solicitud de transbordo'), 'apagado oculta I-069 y deja Transbordo de Connect');
  await menu('Importación', 'Documentos');
  check(!(await p.isVisible('#docIAvBtn')) && !(await p.isVisible('#docIElBtn')) && (await txt('#docIRes')).includes('Aviso de llegada'), 'apagado oculta I-062 e I-055 en Importación');
  await menu('Exportación', 'Documentos');
  check(!(await txt('#docERes')).includes('Corrector 1'), 'apagado oculta la columna Correctores (I-078)');
  check(!(await p.isVisible('#docETurBtn')), 'apagado oculta Cargar recargos TUR (I-060)');
  await p.evaluate(() => docExpEditar('E7')); await W(250);
  check(!(await p.isVisible('#docEdNN')) && (await txt('#docEdCab')).includes('TRANSMITIDO A SUNAT'), 'apagado oculta el BL No Negociable (I-022) y deja la Reserva de Connect');
  await p.click('#docEdTabs .fac-tabs button:has-text("Recargo - Cláusula")'); await W();
  check(!(await p.isVisible('#docRecTur')) && (await txt('#docEdTabs')).includes('Lugar de Pago'), 'apagado oculta los recargos TUR y deja la grilla de Connect');
  await p.evaluate(() => docVolver(true)); await W();
  await top(); await p.click('#propToggle'); await W(200);

  check(errs.length === 0, `sin errores JS ${JSON.stringify(errs)}`);
  await b.close();
  console.log(fails ? `\n${fails} FALLA(S)` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
