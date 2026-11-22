// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_atencion_cliente.js
// Copiar a Mockup/tests junto a e2e_marco.js (allí resuelve playwright de Mockup/node_modules).
// Atención al cliente v37: recorre las 9 pantallas; en cada una abre un detalle, un diálogo y un cambio de estado.
// Falla si hay errores JS (pageerror).
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
  const nDlg = () => p.locator('.ac-dlg.show').count();
  const enDlg = async (sel) => { await dlg().locator(sel).first().click(); await W(); };
  const activa = () => p.evaluate(() => document.querySelector('section.panel.active')?.id || '');
  const ir = async (op) => {
    await top(); await p.click('#ccMenu [data-menu="Atención al cliente"]'); await W();
    const i = await p.evaluate(o => CC.menu.find(g => g.g === 'Atención al cliente').ops.findIndex(x => x.o === o), op);
    await p.click(`#ccDropdown button[data-cc-op="${i}"]`); await W(250);
  };
  await p.goto('file://' + HTML); await W(300);
  check(await p.evaluate(() => typeof AC === 'object' && typeof AC.depositoInstruccion === 'function' && typeof AC.suspensionVigente === 'function'), 'módulo Atención al cliente cargado (2 archivos)');

  // 1. Liberación de la Carga
  await ir('Liberación de la Carga');
  check(await activa() === 'screenAcLiberacion' && await txt('#ccPbTitle') === 'Liberación de carga', 'Liberación: abre con su título');
  check((await txt('#libRes')).includes('Resultados (') && (await txt('#libRes')).includes('Items por página'), 'Liberación: resultados con Items por página');
  await p.click('[data-lib="LC2026000101"]'); await W(250);
  check((await txt('#libDet')).includes('Estado de Validaciones') && (await txt('#libDet')).includes('Listo para aprobar'), 'Liberación: detalle con validaciones');
  check((await txt('#libDet .cc-chip.on')) === 'En proceso', 'Liberación: al abrir pasa a En proceso (bloqueo)');
  await p.click('#libDet [data-tab="adj"]'); await W(); await p.click('#libAdjAdd'); await W();
  await enDlg('[data-ac="sel-archivo"]'); await enDlg('[data-ac="adj-guardar"]');
  check((await txt('#libDet')).includes('Documento_'), 'Liberación: diálogo Agregar adjunto agrega archivo');
  await p.click('#libDet [data-tab="info"]'); await W(); await p.click('#libAprobar'); await W(); await enDlg('[data-ac="confirmar"]'); await W(200);
  check((await txt('#libDet .cc-chip.on')) === 'Aprobado' && (await toast()).includes('aprobó correctamente'), 'Liberación: Aprobar cambia a Aprobado');
  check((await dlg().textContent()).includes('Autorización de Liberación de Visto Bueno'), 'Liberación: correo de aprobación simulado');
  await enDlg('[data-ac="cerrar-correo"]'); await p.locator('[data-memo]').first().click(); await W();
  check((await dlg().textContent()).includes('Constancia de devolución'), 'Liberación: MEMO en PDF simulado');
  await enDlg('[data-ac="cerrar-memo"]');
  await p.evaluate(() => libVolver()); await W(200); await p.click('#libNuevo'); await W();
  await dlg().locator('[data-bl]').first().click(); await W(); await enDlg('[data-ac="lib-sel-guardar"]');
  check((await txt('#ccPbTitle')).includes('Nueva liberación de carga'), 'Liberación: Nuevo precarga desde el BL');
  await p.click('#libGuardar'); await W(); check((await toast()).includes('BL Endosado'), 'Liberación: exige BL Endosado al crear');

  // 2. Instrucciones
  await ir('Instrucciones');
  check(await txt('#ccPbTitle') === 'Consulta Instrucciones BL', 'Instrucciones: título');
  const bl0 = await p.evaluate(() => AC.bls()[0].numero);
  await p.fill('#insFBl', bl0); await p.click('#insF button:has-text("Buscar")'); await W(200);
  await p.click(`[data-ins="${bl0}"]`); await W();
  check((await dlg().textContent()).includes('Días Libres') && (await dlg().textContent()).includes('Contenedores'), 'Instrucciones: diálogo Días Libres con pestañas');
  await enDlg('#insEditar');
  await enDlg('[data-accion="registrar"]');
  await dlg().locator('#insDF').fill(await p.evaluate(() => AC.hoy())); await dlg().locator('#insDM').selectOption('Venta');
  await enDlg('[data-ac="sel-sustento"]'); await enDlg('[data-ac="devol-guardar"]');
  check((await toast()) === 'Devolución registrada.' && (await dlg().textContent()).includes('Devuelto'), 'Instrucciones: Registrar devolución cambia a Devuelto');
  await enDlg('#insGuardar'); check((await toast()).includes('nuevo archivo'), 'Instrucciones: Guardar exige archivo nuevo');
  await enDlg('[data-tab="adj"]'); await enDlg('#insSubir'); await enDlg('[data-ac="seleccionar"]'); await enDlg('[data-ac="guardar-adj"]');
  await enDlg('#insGuardar'); await W();
  check((await toast()).includes('guardadas exitosamente') && await nDlg() === 0, 'Instrucciones: Guardar con adjunto cierra el diálogo');

  // 3. Direccionamiento Permanente
  await ir('Direccionamiento Permanente');
  check(await txt('#ccPbTitle') === 'Direccionamiento Permanente', 'Dir. Permanente: título');
  await p.click('#dpF button:has-text("Buscar")'); await W();
  check((await txt('#dpRes')).includes('Defecto del Sistema') && await p.locator('#dpRes [data-lock]').count() === 1, 'Dir. Permanente: registro del sistema con candado');
  await p.click('[data-dp="2"]'); await W(200);
  check((await txt('#ccPbTitle')).includes('Editar Direccionamiento Permanente'), 'Dir. Permanente: abre el formulario de edición');
  await p.click('#dpAgregar'); await W(); await p.click('#dpGuardar'); await W();
  check((await toast()).includes('campos obligatorios'), 'Dir. Permanente: valida campos obligatorios');
  await p.evaluate(() => dpCancelar()); await W(); await enDlg('[data-ac="confirmar"]'); await W(200);
  await p.click('#dpF button:has-text("Buscar")'); await W(); await p.evaluate(() => dpAnular(3)); await W(); await enDlg('[data-ac="confirmar"]');
  check((await toast()).includes('anulado exitosamente') && !(await txt('#dpRes')).includes('PACIFIC CHEMICALS'), 'Dir. Permanente: anular quita el registro');

  // 4. Direccionamiento de Vacíos (y prototipo HU-ATC-02)
  await ir('Direccionamiento de Vacíos');
  check(await txt('#ccPbTitle') === 'Instrucciones de Direccionamiento de Vacíos', 'Dir. Vacíos: título');
  check(await p.isDisabled('[data-tab="res"]'), 'Dir. Vacíos: Resultado deshabilitada sin Línea, Nave y Viaje');
  await p.selectOption('#dvF1Lin', 'ZIM'); await W(); await p.selectOption('#dvF1Nave', 'BOX ENDURANCE'); await W(); await p.selectOption('#dvF1Viaje', '684'); await W();
  check(!(await p.isDisabled('[data-tab="res"]')), 'Dir. Vacíos: Resultado se habilita');
  await p.click('#dvBuscar1'); await W(); await p.click('#dvEditar1'); await W();
  await p.locator('#dvRes1 input[type=checkbox]').first().check(); await W();
  await p.click('#dvAprobar'); await W(); await enDlg('[data-ac="dv-aceptar"]');
  check((await toast()).includes('aprobada(s) exitosamente') && (await txt('#dvRes1')).includes('APROBADO'), 'Dir. Vacíos: aprobar instrucción pendiente');
  await p.locator('[data-exp]').first().click(); await W(); check((await txt('#dvRes1')).includes('TIPO / TAMAÑO') || (await txt('#dvRes1')).includes('DEPÓSITOS'), 'Dir. Vacíos: detalle expandido');
  await p.click('[data-tab="res"]'); await W(); await p.click('#dvGenerar'); await W();
  check((await txt('#dvRes3')).includes('Vista previa generada'), 'Dir. Vacíos: Generar vista previa');
  await p.click('#dvAsignar'); await W(); await enDlg('[data-ac="confirmar"]');
  check(await p.isVisible('#dvResumen'), 'Dir. Vacíos: Asignar graba la preasignación');
  await p.click('[data-tab="reg"]'); await W(); await p.click('#dvNuevo'); await W();
  await dlg().locator('#dvNL').selectOption('ZIM'); await dlg().locator('#dvNS').selectOption('Callao'); await enDlg('[data-ac="dv-anadir"]');
  check((await txt('#ccPbTitle')).includes('Nueva Instrucción'), 'Dir. Vacíos: formulario Nueva Instrucción');
  await p.selectOption('#dvTipo', 'Por Contenedor'); await W();
  check(await p.isVisible('#dvProv'), 'HU-ATC-02: opción de contenedor no registrado visible');
  await p.check('#dvCProv'); await W();
  await p.fill('#dvCNum', 'TEMU1234567'); await p.selectOption('#dvCTipo', '42G1'); await p.fill('#dvCBl', 'BLPROV0001');
  await p.selectOption('#dvCCli', { index: 1 }); await p.selectOption('#dvCDep', '3014'); await W(); await p.click('#dvAgregarCont'); await W();
  check((await txt('#dvForm')).includes('TEMU1234567') && (await txt('#dvForm')).includes('Provisional'), 'HU-ATC-02: contenedor provisional agregado y marcado');
  await top(); await p.click('#propToggle'); await W(200);
  check(!(await p.isVisible('#dvProv')), 'HU-ATC-02: Ver propuestas apagado oculta el prototipo');
  await p.click('#propToggle'); await W(200);
  await p.click('#dvSelArchivos'); await W(); await p.click('#dvGuardar'); await W(200);
  check((await toast()).includes('Instrucción creada exitosamente') && (await toast()).includes('provisional'), 'Dir. Vacíos: guardar borrador con provisional');
  check((await txt('#dvRes2')).includes('BORRADOR'), 'Dir. Vacíos: borrador en Registro de Instrucciones');

  // 5. Sobreestadía
  await ir('Sobreestadía');
  check(await txt('#ccPbTitle') === 'Consulta Configuración de Días Libres', 'Sobreestadía: título');
  await p.selectOption('#soFAmb', 'Línea'); await W(); await p.selectOption('#soFLin', 'ZIM'); await p.selectOption('#soFOper', 'Importación');
  await p.click('#soF button:has-text("Buscar")'); await W();
  check((await txt('#soRes')).includes('22G1'), 'Sobreestadía: muestra la configuración');
  await p.click('#soEditar'); await W(); await p.click('#soAgregar'); await W(); await p.click('#soGuardar'); await W();
  check((await toast()).includes('campos obligatorios'), 'Sobreestadía: valida filas incompletas');
  await p.click('#soRes [data-tab="adj"]'); await W(); await p.click('#soSubir'); await W(); await enDlg('[data-ac="seleccionar"]'); await enDlg('[data-ac="guardar-adj"]');
  await p.click('#soRes [data-tab="dias"]'); await W(); await p.click('#soRes .pink:has-text("Cancelar")'); await W();
  check(await p.isVisible('#soEditar'), 'Sobreestadía: Cancelar vuelve a lectura');

  // 6. Daño de Contenedores
  await ir('Daño de Contenedores');
  check(await txt('#ccPbTitle') === 'Búsqueda de Daños', 'Daños: título');
  await p.click('#daF button:has-text("Buscar")'); await W();
  await p.locator('#daRes tbody tr:has-text("Pendiente") input[type=checkbox]').first().check(); await W();
  await p.click('#daAprobar'); await W(); check((await toast()).includes('Solo se permite desde Notificado'), 'Daños: controla la transición de estados');
  await p.click('#daNotificar'); await W(); await dlg().locator('#daMot').fill('Daño en puerta trasera'); await enDlg('[data-ac="da-confirmar"]');
  const daMail = await dlg().textContent();
  check(daMail.includes('Notificación de daño') || daMail.includes('AVISO DE COBRANZA'), 'Daños: Notificar envía correo simulado');
  check(/\[AVISO DE COBRANZA - DAÑOS DE CONTENEDORES\] BL \S+ CONT \S+ - .+ Viaje: \S+/.test(daMail) && daMail.includes('HU-ATC-06 · I-094'), 'I-094: el asunto identifica BL, contenedor, nave y viaje');
  check(daMail.includes('(Consignatario)') && daMail.includes('(Embarcador)') && daMail.includes('(Naviera)') && daMail.includes('Sucursal') && daMail.includes('HU-ATC-07 · I-028'), 'I-028: destinatarios de Atención al Cliente con copia a la sucursal');
  check(daMail.includes('Daño en puerta trasera') && daMail.includes('Depósito notificante'), 'I-028/I-094: conserva mensaje y sustentos, y muestra el depósito notificante');
  await enDlg('[data-ac="cerrar-correo"]');
  check((await txt('#daRes')).includes('Notificado') && (await toast()).includes('Estado actualizado'), 'Daños: cambia a Notificado');
  await p.locator('[data-da-adj]').first().click(); await W(); check((await dlg().textContent()).includes('Descargar'), 'Daños: diálogo de adjuntos'); await enDlg('[data-ac="cerrar-adj"]');
  await p.click('#daNuevo'); await W(); await p.fill('#daNBl', bl0); await p.click('#daNBuscar'); await W();
  check((await txt('#daNuevoF')).includes('Contenedores encontrados para BL'), 'Daños: Nuevo Daño busca por BL');

  // 7. Gestión de Suspensiones
  await ir('Gestión de Suspensiones');
  check(await txt('#ccPbTitle') === 'Buscar suspensiones', 'Suspensiones: título');
  await p.selectOption('#suFEst', 'Todos'); await p.click('#suF button:has-text("Buscar")'); await W();
  await p.click('[data-su="1"]'); await W(); check((await dlg().textContent()).includes('Detalle de suspensión'), 'Suspensiones: Ver detalle');
  await enDlg('button:has-text("Cerrar")');
  await p.click('[data-su-lev="1"]'); await W();
  await dlg().locator('#suLD').fill('7'); await dlg().locator('#suLD').dispatchEvent('change'); await W();
  await dlg().locator('#suLM').fill('Pago a cuenta realizado'); await enDlg('[data-ac="su-lev-subir"]'); await enDlg('[data-ac="seleccionar"]'); await enDlg('[data-ac="guardar-adj"]');
  await enDlg('[data-ac="su-lev-guardar"]');
  check((await toast()).includes('levantada correctamente') && (await txt('#suRes')).includes('Levantamiento temporal activo'), 'Suspensiones: levantamiento temporal');
  await p.click('[data-su="1"]'); await W(); check((await dlg().textContent()).includes('7 días'), 'Suspensiones: guarda los días del levantamiento'); await enDlg('button:has-text("Cerrar")');
  await p.locator('#suRes button:has-text("Historial")').first().click(); await W(); check((await dlg().textContent()).includes('Historial ('), 'Suspensiones: historial'); await enDlg('[data-ac="cerrar-hist"]');

  // 8. Reporte de Comisiones por Pagar
  await ir('Reporte de Comisiones por Pagar');
  check(await txt('#ccPbTitle') === 'Reporte de Participaciones por Pagar', 'Comisiones: título de Connect');
  await p.click('#coF button:has-text("Buscar")'); await W(); check((await toast()).includes('Línea y Fechas son obligatorios'), 'Comisiones: valida obligatorios');
  await p.selectOption('#coFLin', { index: 2 }); await p.fill('#coFDesde', '2026-11-01'); await p.fill('#coFHasta', '2026-11-30');
  await p.click('#coF button:has-text("Buscar")'); await W();
  check((await txt('#coRes')).includes('Resultados (') && await p.isVisible('#coTot'), 'Comisiones: resultados y totales');

  // 9. Aprobación de Usuarios Web
  await ir('Aprobación de Usuarios Web');
  check(await txt('#ccPbTitle') === 'Buscar Aprobación de Usuarios Web', 'Usuarios Web: título');
  await p.click('#uwF button:has-text("Buscar")'); await W();
  await p.click('[data-uw-dj="1"]'); await W(); check((await dlg().textContent()).includes('DECLARACIÓN JURADA'), 'Usuarios Web: Declaración Jurada en PDF'); await enDlg('[data-ac="cerrar-dj"]');
  await p.check('[data-uw="1"]'); await W(); await p.click('#uwAprobar'); await W(); await enDlg('[data-ac="confirmar"]');
  check((await toast()).includes('aprobadas exitosamente') && (await dlg().textContent()).includes('Usuario web creado'), 'Usuarios Web: aprobar con correo');
  await enDlg('[data-ac="cerrar-correo"]');
  await p.click('[data-uw-inact="1"]'); await W(); await dlg().locator('textarea').fill('Dejó la empresa'); await enDlg('[data-ac="motivo-ok"]'); await enDlg('[data-ac="confirmar"]');
  check((await toast()).includes('inactivado exitosamente'), 'Usuarios Web: inactivar con motivo');

  // Integraciones y reglas generales
  check(await p.evaluate(() => AC.suspensionVigente('ANDES MINING EXPORT S.A.') === false), 'Integración: el levantamiento quita la suspensión vigente que ve Liberación');
  check(await p.evaluate(() => !Object.keys(localStorage).length), 'sin localStorage');
  check(await p.evaluate(() => !/[–—]/.test(document.body.innerText)), 'sin rayas en los textos visibles');
  check(errs.length === 0, `sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);
  await b.close();
  console.log(fails ? `\nHAY FALLAS (${fails})` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})();
