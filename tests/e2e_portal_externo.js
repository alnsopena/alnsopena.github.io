// Uso: PORTAL_HTML=<ruta a portal.html> node tests/e2e_portal_externo.js
// Portal externo v37: registro de 4 pasos, login simulado con rol, menú por rol, las 8 pantallas con una acción cada una,
// prototipos HU-DM-01, HU-FAC-07, HU-ATC-12, HU-DOC-27 (Direccionamiento) y HU-DOC-40 (SUNAT en Matriz), interruptor "Ver propuestas" y cero errores JS.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const HTML = process.env.PORTAL_HTML || [path.resolve(__dirname, '../pda-mockup/portal.html'), path.resolve(__dirname, '../repo/pda-mockup/portal.html')].find(f => fs.existsSync(f));
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
const pdf = name => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 prueba') });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  const W = (ms = 150) => p.waitForTimeout(ms);
  const txt = s => p.textContent(s).then(x => (x || '').trim());
  const activa = () => p.evaluate(() => document.querySelector('section.panel.active')?.id || '');
  const titulo = () => txt('#ccPbTitle');
  const menu = async (g, o) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click(`#ccMenu [data-menu="${g}"]`); await W(); if (o) { await p.click(`#ccDropdown button:has-text("${o}")`); await W(250); } };
  const conf = async () => { await p.click('#peConfOk'); await W(250); };
  const toast = () => txt('#toast');
  const rol = async c => { await p.evaluate(() => window.scrollTo(0, 0)); await p.selectOption('#currentUser', c); await W(); await conf(); await W(200); };
  const visibles = () => p.$$eval('#ccMenu button[data-menu]', x => x.filter(e => e.offsetParent !== null).map(e => e.dataset.menu));
  const enDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

  await p.goto('file://' + HTML); await W(400);
  check(await activa() === 'screenPeLogin', 'arranca en Login');
  check(!(await p.isVisible('#ccMenu')), 'sin sesión no se ve el menú');
  check((await txt('#screenPeLogin')).includes('Bienvenido a Cosmos'), 'login con textos de Connect');

  // Registro de 4 pasos
  await p.click('#peBtnSolicitar'); await W(250);
  check(await activa() === 'screenPeRegistro', 'Solicitar Ingreso abre el registro');
  check(await p.isDisabled('#peRegNext'), 'paso 1: Siguiente deshabilitado sin carta');
  await p.setInputFiles('#peRegFile', pdf('carta.pdf')); await W();
  await p.click('#peRegNext'); await W();
  await p.fill('#peRegRuc', '20610000301'); await W(500);
  check(await p.inputValue('#peRegRazon') === 'ANDES MINING EXPORT S.A.', 'paso 2: RUC trae la razón social');
  await p.click('#peRegNext'); await W();
  await p.fill('#peReg_nombre', 'Lucía'); await p.fill('#peReg_apellido', 'Prueba'); await p.selectOption('#peReg_tdoc', 'DNI');
  await p.fill('#peReg_ndoc', '40000099'); await p.fill('#peReg_tel', '999888777');
  await p.fill('#peReg_correo', 'malo'); await W(); check((await txt('#peRegErr_correo')).includes('correo electrónico válido'), 'paso 3: valida correo');
  await p.fill('#peReg_correo', 'lucia@andesmining.example'); await p.fill('#peReg_correoRep', 'legal@andesmining.example'); await W();
  await p.click('#peRegNext'); await W();
  await p.check('.pe-roles input[value="CUSTOMER"]'); await W();
  await p.click('#peRegNext'); await W();
  check(await p.isVisible('#pePolOk') && await p.isDisabled('#pePolOk'), 'política de privacidad con Aceptar deshabilitado');
  await p.check('#pePolChk'); await p.click('#pePolOk'); await W(250);
  check(await activa() === 'screenPeRegistroOk' && (await txt('#screenPeRegistroOk')).includes('¡Registro completado!'), 'registro completado');
  check((await txt('#screenPeRegistroOk')).includes('Atención al Cliente'), 'aviso: aprueba Atención al Cliente (propuesta)');
  await p.click('#peRegSalir'); await W(250);

  // Login simulado como Cliente (importador)
  await p.click('#peBtnIngresar'); await W();
  await p.selectOption('#peLgRol', 'CUSTOMER'); await W(); await p.selectOption('#peLgEmp', 'ANDES MINING EXPORT S.A.'); await W();
  await p.click('#peLgOk'); await W(1000);
  check(await activa() === 'screenInicio' && await p.isVisible('#ccMenu'), 'login simulado entra al inicio');
  check((await visibles()).length === 5, `Cliente ve 5 grupos (${(await visibles()).join(', ')})`);
  check(await p.inputValue('#currentUser') === 'CUSTOMER', 'selector de rol en cabecera');

  // 1. Mandato Electrónico: crear
  await menu('Mandato Electrónico');
  check(await titulo() === 'Mandatos Electrónicos', 'Mandato abre');
  await p.click('#peMdF button:has-text("Buscar")'); await W();
  check(!(await txt('#peMdRes')).includes('Acciones'), 'Cliente no ve Aprobar, Observar ni Rechazar');
  await p.click('#peMdNuevo'); await W(250);
  await p.selectOption('#peMdFTipo', 'Por Vigencia'); await W();
  await p.fill('#peMdFDesde', '2026-12-01'); await p.dispatchEvent('#peMdFDesde', 'change'); await W();
  await p.fill('#peMdFHasta', '2027-02-28'); await p.dispatchEvent('#peMdFHasta', 'change'); await W();
  await p.fill('#peMdFTer', 'AGENCIA DE ADUANAS DEMO S.A.C.'); await p.dispatchEvent('#peMdFTer', 'change'); await W();
  await p.selectOption('#peMdFOper', 'Exportación'); await W();
  await p.setInputFiles('#peMdFile', pdf('mandato.pdf')); await W();
  await p.click('#peMdGuardar'); await W(300);
  check((await titulo()).includes('Ver Mandato Electrónico') && (await p.inputValue('#peMdForm .fac-f input >> nth=0')) === 'ME-000105' && (await txt('#peMdForm')).includes('Pendiente'), 'mandato ME-000105 creado y en Pendiente');

  // 2. Direccionamiento: nuevo (BL aún no existe: queda Provisional)
  await menu('Importaciones');
  check(await titulo() === 'Direccionamiento de Carga', 'Direccionamiento abre');
  await p.click('#peDiNuevo'); await W(250);
  await p.fill('#peDiFBl', 'ANDESNEW00001'); await p.dispatchEvent('#peDiFBl', 'change'); await W();
  await p.fill('#peDiFVj', '115E - PACIFIC HORIZON - Callao'); await p.dispatchEvent('#peDiFVj', 'change'); await W();
  await p.selectOption('#peDiFDesp', 'Diferido'); await W();
  await p.fill('#peDiFReg', 'ALMACÉN EXTRAPORTUARIO DEMO S.A.C.'); await p.dispatchEvent('#peDiFReg', 'change'); await W();
  await p.click('#peDiCNuevo'); await W(); await p.fill('.pe-cnt', 'TGHU1234567'); await p.dispatchEvent('.pe-cnt', 'change');
  await p.click('#peDiGuardar'); await W(300);
  check((await toast()).includes('Será procesada cuando el BL exista') && (await txt('#peDiForm')).includes('Provisional'), 'direccionamiento guardado como Provisional');

  // 2b. HU-DOC-27: prototipos I-114 (avisos, por defecto, contenedores, aprobación automática), I-099 (reporte) e I-085 (carga rodante)
  check((await txt('#peDiAvisos')).includes('Registro'), 'I-114: aviso de registro guardado en el direccionamiento');
  // I-025 (HU-DOC-04): BL que aún no existe, sin error y sin duplicar la solicitud provisional
  check((await txt('#peDiProv')).includes('Solicitud provisional') && (await txt('#peDiProv')).includes('HU-DOC-04 · I-025'), 'I-025: la solicitud queda Provisional y se vinculará al llegar el BL (HU-DOC-04 · I-025)');
  await menu('Importaciones'); await p.click('#peDiNuevo'); await W(250);
  await p.fill('#peDiFBl', 'ANDESNEW00001'); await p.dispatchEvent('#peDiFBl', 'change'); await W();
  check((await txt('#peDiProv')).includes('aún no existe en Connect'), 'I-025: avisa que el BL aún no existe y permite registrar la solicitud');
  await p.fill('#peDiFVj', '115E - PACIFIC HORIZON - Callao'); await p.dispatchEvent('#peDiFVj', 'change'); await W();
  await p.selectOption('#peDiFDesp', 'Diferido'); await W();
  await p.fill('#peDiFReg', 'ALMACÉN EXTRAPORTUARIO DEMO S.A.C.'); await p.dispatchEvent('#peDiFReg', 'change'); await W();
  await p.click('#peDiCNuevo'); await W(); await p.fill('.pe-cnt', 'TGHU1234567'); await p.dispatchEvent('.pe-cnt', 'change');
  await p.click('#peDiGuardar'); await W(300);
  check((await toast()).includes('Ya existe una solicitud provisional') && (await p.evaluate(() => PE.dir.filter(d => d.bl === 'ANDESNEW00001').length)) === 1, 'I-025: no duplica la solicitud provisional del mismo BL');
  await menu('Importaciones'); await p.click('#peDiF button:has-text("Buscar")'); await W();
  check((await txt('#peDiRes')).includes('Por defecto') && (await txt('#peDiRep')).includes('Reporte de direccionamiento'), 'I-114 e I-099: BL de Importación por defecto y bloque de reporte');
  const [xls] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('#peDiRepX')]);
  check(xls && /Reporte_Direccionamiento/.test(xls.suggestedFilename()), 'I-099: exporta el reporte de direccionamiento');
  await p.click('#peDiRes button.fac-link:has-text("ZIMUDIR0000021")'); await W(300);
  check((await p.$$('.pe-cnt')).length === 2, 'I-114: contenedores cargados solos desde el BL');
  await p.selectOption('#peDiFDesp', 'Diferido'); await W();
  await p.fill('#peDiFReg', 'ALMACÉN EXTRAPORTUARIO DEMO S.A.C.'); await p.dispatchEvent('#peDiFReg', 'change'); await W();
  await p.click('#peDiGuardar'); await W(300);
  const dr = await p.evaluate(() => PE.dir.find(d => d.bl === 'ZIMUDIR0000021'));
  check(dr && dr.estado === 'APPROVED' && dr.tipo === 'Web' && dr.apl.razon === 'ALMACÉN EXTRAPORTUARIO DEMO S.A.C.' && dr.nave === 'PACIFIC HORIZON' && dr.viaje === '115E', 'I-114: Diferido queda Aprobado, tipo Web, entidad solicitada y misma nave y viaje');
  check((await txt('#peDiAvisos')).includes('Aprobado automáticamente'), 'I-114: aviso de aprobación automática');
  await menu('Importaciones'); await p.click('#peDiNuevo'); await W(250);
  await p.selectOption('#peDiFCarga', 'Carga rodante'); await W();
  check(await p.isVisible('#peDiRod') && !(await p.isVisible('#peDiCNuevo')), 'I-085: carga rodante no pide contenedores');
  await p.fill('#peDiFBl', 'RODANTE00001'); await p.dispatchEvent('#peDiFBl', 'change'); await W();
  await p.fill('#peDiFVj', '115E - PACIFIC HORIZON - Callao'); await p.dispatchEvent('#peDiFVj', 'change'); await W();
  await p.selectOption('#peDiFDesp', 'Anticipado'); await W();
  await p.fill('#peDiFReg', 'ALMACÉN EXTRAPORTUARIO DEMO S.A.C.'); await p.dispatchEvent('#peDiFReg', 'change'); await W();
  await p.click('#peDiGuardar'); await W(300);
  check((await txt('#peDiForm')).includes('Carga rodante') || (await p.evaluate(() => (PE.dir.find(d => d.bl === 'RODANTE00001') || {}).carga)) === 'Carga rodante', 'I-085: carga rodante guardada sin contenedores');
  await menu('Importaciones'); await p.click('#peDiF button:has-text("Buscar")'); await W();
  const nRes = async () => Number(((await txt('#peDiRes')).match(/Resultados \((\d+)\)/) || [])[1]);
  const nAntes = await nRes();
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#propToggle'); await W(250);
  check(!(await p.isVisible('#peDiRep')) && (await p.locator('#screenPeDireccionamiento .cc-prop:visible').count()) === 0 && await nRes() === nAntes, 'apagar propuestas oculta los prototipos de Direccionamiento sin romper la grilla');
  await p.click('#propToggle'); await W(200);
  check(await p.isVisible('#peDiRep'), 'encender propuestas muestra el reporte otra vez');

  // 3. Autorización de Liberación de Línea: liberar el BL del cliente
  await menu('Liberaciones y trámites', 'Autorización de Liberación de Línea');
  check(await titulo() === 'Autorización de Línea por BL', 'Liberación de Línea abre');
  await p.click('#peLnF button:has-text("Buscar")'); await W();
  await p.click('#peLnEditar'); await W();
  await p.check('.pe-lnlib:not([disabled])'); await W(); await p.selectOption('.pe-lnem', 'Original'); await W();
  await p.click('#peLnGuardar'); await W(250);
  check((await txt('#peLnRes')).includes('Liberado') && !(await txt('#peLnRes')).includes('Pendiente'), 'BL liberado por la línea');

  // 4. Solicitud de Liberación de carga: crear con BL endosado y ver aviso de pago (HU-ATC-12)
  await menu('Liberaciones y trámites', 'Solicitud de Liberación de carga');
  check(await titulo() === 'Solicitud de Liberación de Carga', 'Solicitud de Liberación abre');
  await p.click('#peRlF button:has-text("Buscar")'); await W();
  await p.click('#peRlRes button.fac-link:has-text("ZIMUBOX0000012")'); await W(250);
  check(await titulo() === 'Registro de Solicitud', 'abre el registro de solicitud');
  check((await txt('#peRlPago')).includes('Sobreestadía'), 'HU-ATC-12: muestra pago pendiente antes de enviar');
  await p.click('#peRlSubir'); await W(); await p.setInputFiles('#peRlFile', pdf('bl-endosado.pdf')); await W();
  await p.selectOption('.pe-rltipo', 'BL endosado'); await p.click('#peRlUpOk'); await W();
  await p.click('#peRlGuardar'); await W(300);
  check((await toast()).includes('creada correctamente') && await titulo() === 'Visualización de Solicitud', 'solicitud de liberación creada (Pendiente)');

  // 5. Cálculo de Sobreestadía: solo BL propios, cambiar fecha y ver detalle
  await menu('Liquidaciones y Pagos', 'Cálculo de Sobreestadía');
  check(await titulo() === 'Búsqueda de Cálculo de Sobreestadía', 'Cálculo de Sobreestadía abre');
  await p.click('#peOsF button:has-text("Buscar")'); await W();
  const osRes = await txt('#peOsRes');
  check(osRes.includes('ZIMUBOX0000012') && !osRes.includes('ZIMUBOX0000011'), 'el cliente solo ve sus BL');
  await p.click('#peOsRes .pe-ic[title="Ver contenedores"]'); await W();
  await p.fill('.pe-osfecha >> nth=0', enDias(3)); await p.dispatchEvent('.pe-osfecha >> nth=0', 'change'); await W();
  await p.click('#peOsRes .pe-ic[title="Ver"] >> nth=0'); await W();
  check((await txt('#facModalBox')).includes('Detalle del cálculo'), 'detalle del cálculo por contenedor');
  check(await p.isVisible('#peOsDesc.cc-prop') && (await txt('#peOsDesc')).includes('HU-ATC-05 · I-084'), 'I-084: fecha de descarga y cálculo de sobrestadía marcados (HU-ATC-05 · I-084)');
  await p.click('#facModalBox button:has-text("Cerrar")'); await W();

  // 6. Pago: generar liquidación y pagar con ASBANC
  await menu('Liquidaciones y Pagos', 'Pago');
  check(await titulo() === 'Pagos', 'Pago abre');
  check(!(await p.isVisible('#pePgCli')), 'Cliente no ve el filtro Cliente');
  await p.click('#pePgBuscar'); await W();
  await p.check('.pe-pgsel >> nth=0'); await W();
  await p.click('#pePgGenerar'); await W();
  await p.click('#peGenOk'); await W(300);
  check((await toast()).includes('Las siguientes liquidaciones fueron generadas'), 'liquidación generada');
  await p.selectOption('#pePgInfo', 'PAYLESS'); await W(); await p.click('#pePgBuscar'); await W();
  await p.check('.pe-pgsel >> nth=0'); await W(); await p.click('#pePgPagar'); await W();
  check(!(await txt('#facModalBox')).toLowerCase().includes('tarjeta'), 'Pagar sin tarjeta ni pasarela');
  await p.click('#pePaySig'); await W(800);
  check(/^CS\d{9}$/.test(await txt('#peTicket')), 'ticket ASBANC generado');
  check(await p.isVisible('#pePayAsbNota.cc-prop') && (await txt('#pePayAsbNota')).includes('Pago confirmado'), 'I-026: explica la confirmación de ASBANC a Connect');
  await p.click('#pePayFin'); await W(800);
  check((await toast()).includes('Pagos registrados exitosamente'), 'pago finalizado');
  await p.selectOption('#pePgInfo', 'PAYFUL'); await W(); await p.click('#pePgBuscar'); await W();
  check((await txt('#pePgRes')).includes('HU-ATC-09 · I-026') && await p.locator('[data-pg-asbanc-ok]').count() >= 1, 'I-026: pago ASBANC esperando confirmación, marcado HU-ATC-09 · I-026');
  const liqAsb = await p.locator('[data-pg-asbanc-ok]').first().getAttribute('data-pg-asbanc-ok');
  await p.locator('[data-pg-asbanc-ok]').first().click(); await W(250);
  const lq = await p.evaluate(n => PE.liq.find(l => l.n === n), liqAsb);
  check((await toast()).includes('ASBANC confirmó') && lq.estado === 'Pago confirmado' && lq.factura && (await txt(`[data-pg-asbanc="${liqAsb}"]`)).includes('Confirmado por ASBANC'), 'I-026: la confirmación deja la liquidación en Pago confirmado y facturada');

  // 7. Matriz con otro cliente (exportador): HU-FAC-07 y editar BL
  await p.click('#peSalir'); await W(250);
  await p.click('#peBtnIngresar'); await W(); await p.selectOption('#peLgEmp', 'TEXTILES COSTA VERDE S.A.'); await W();
  await p.click('#peLgOk'); await W(1000);
  await menu('Exportaciones');
  check(await titulo() === 'Matriz', 'Matriz abre');
  check(await p.isDisabled('#peMxB'), 'Buscar deshabilitado sin Nave, RUC o Reserva');
  await p.fill('#peMxRes', 'ZIMEXP'); await W(); await p.click('#peMxB'); await W();
  check((await p.$$('#peMxRes .pe-nn .pe-ic:not(.dis)')).length === 1 && (await p.$$('#peMxRes .pe-nn .pe-ic.dis')).length === 1, 'HU-FAC-07: BL No Negociable en Matriz (1 habilitado, 1 bloqueado)');
  await p.click('#peMxRes button.fac-link:has-text("ZIMEXP0026013")'); await W(250);
  check((await txt('#peMxTxEst')).includes('Datos completos'), 'HU-DOC-40: Matriz muestra los campos para transmitir a SUNAT');
  await p.click('#peMxEditar'); await W();
  await p.fill('#peMxRef', 'PO-7781'); await p.dispatchEvent('#peMxRef', 'change'); await W();
  await p.click('#peMxFinal'); await W(); await conf(); await W(200);
  check((await toast()).includes('Datos finales guardados') && (await txt('#screenPeMatriz')).includes('Versión 2'), 'Matriz editada: versión 2 guardada como final');
  check((await txt('#peMxTxEst')).includes('Envío TX-26013-2'), 'HU-DOC-40: al guardar final se replica y se transmite sola');
  await p.click('#peMxEditar'); await W();
  const consRaz = '#screenPeMatriz .fac-card:has(h3:text-is("Consignatario")) input';
  await p.fill(consRaz, ''); await p.dispatchEvent(consRaz, 'change'); await W();
  check((await txt('#peMxTx')).includes('Falta'), 'HU-DOC-40: marca el campo que falta');
  await p.click('#peMxFinal'); await W();
  check((await toast()).includes('Para transmitir a SUNAT falta: Consignatario'), 'HU-DOC-40: mensaje específico y sin transmisión');
  await p.click('#screenPeMatriz .fac-btns button:has-text("Cancelar")'); await W(); await conf();
  check((await txt('#peMxTxEst')).includes('versión 2') && (await p.evaluate(() => PE.mx.ZIMEXP0026013.tx.length)) === 1, 'HU-DOC-40: reabrir no genera un segundo envío');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#propToggle'); await W(250);
  check(!(await p.isVisible('#peMxTx')) && await p.isVisible('#peMxEditar'), 'apagar propuestas oculta el bloque SUNAT sin romper la Matriz');
  await p.click('#propToggle'); await W(200);

  // 8. Mesa de ayuda: aprueba mandato y desglose, ve el memo y el filtro HU-DM-01
  await rol('HELP_DESK');
  check((await visibles()).length === 5 && (await txt('.pe-ses')).includes('COSMOS'), 'cambio de rol a Mesa de ayuda');
  await menu('Mandato Electrónico'); await p.click('#peMdF button:has-text("Buscar")'); await W();
  check((await txt('#peMdRes')).includes('Acciones'), 'Mesa de ayuda ve Aprobar, Observar y Rechazar');
  await p.click('#peMdRes .pe-ic[title="Aprobar"] >> nth=0'); await W(); await conf();
  check((await toast()).includes('Aprobado'), 'mandato aprobado por Mesa de ayuda');
  await menu('Liberaciones y trámites', 'Desglose');
  check(await titulo() === 'Desglose', 'Desglose abre');
  await p.selectOption('#peDgEst', 'PENDIENTE'); await W(); await p.click('#peDgB'); await W();
  await p.click('#peDgRes button.fac-link:has-text("ZIMUBOX0000011")'); await W(250);
  await p.click('#peDgAprobar'); await W(); await conf();
  check((await txt('#peDgForm')).includes('Aprobado'), 'desglose aprobado');
  check(await p.isVisible('#peDgConc.cc-prop') && (await txt('#peDgConc')).includes('HU-ATC-14 · I-108') && (await p.locator('#peDgConc [data-dg-conc]').count()) === 4 && (await txt('#peDgConcTot')) !== '', 'I-108: el desglose aprobado asigna cada concepto una vez y recalcula el total');
  await menu('Liberaciones y trámites', 'Solicitud de Liberación de carga');
  await p.click('#peRlF button:has-text("Buscar")'); await W();
  await p.click('#peRlRes .pe-ic[title="Memo de Devolución"] >> nth=0'); await W();
  check((await txt('#peRlRes')).includes('MD-000101') && (await txt('#peRlRes')).includes('Pagar sobreestadía'), 'memo visible con liberación aprobada (APROVED corregido)');
  check(await p.isVisible('#peMemoNota.cc-prop') && (await txt('#peMemoNota')).includes('HU-ATC-04 · I-089'), 'I-089: MEMO publicado tras la factura y el pago (HU-ATC-04 · I-089)');
  await p.click('[data-pe-memo="MD-000101"]'); await W();
  const mv = (await p.locator('#peMemoPdf input').evaluateAll(x => x.map(i => i.value))).join('|');
  check(await p.isVisible('#peMemoPdf.cc-prop') && ['MD-000101', 'COSMOS AGENCIA MARÍTIMA', 'ZIMUBOX0000011', 'Liberado'].every(t => mv.includes(t)), 'I-089: el cliente abre el PDF del MEMO con número, agencia, BL, depósito y vigencia');
  await p.click('#facModalBox button:has-text("Cerrar")'); await W();
  await menu('Liquidaciones y Pagos', 'Pago');
  await p.selectOption('#pePgOper', 'Importación'); await W();
  check((await p.$$eval('#peDlPgCli option', o => o.map(x => x.value))).includes('ANDES MINING EXPORT S.A.'), 'HU-DM-01: Importación ofrece Consignatarios');
  await p.selectOption('#pePgOper', 'Exportación'); await W();
  check((await p.$$eval('#peDlPgCli option', o => o.map(x => x.value))).includes('TEXTILES COSTA VERDE S.A.'), 'HU-DM-01: Exportación ofrece Embarcadores');

  // Administrador externo: solo Mandato
  await rol('ADMIN-EXTERNAL');
  check((await visibles()).join('|') === 'Mandato Electrónico', 'Administrador externo solo ve Mandato Electrónico');
  // Agente de Aduanas: ve BL del cliente con mandato aprobado
  await rol('CUSTOMS_BROKER');
  await menu('Liquidaciones y Pagos', 'Cálculo de Sobreestadía'); await p.click('#peOsF button:has-text("Buscar")'); await W();
  check((await txt('#peOsRes')).includes('ZIMUBOX0000012'), 'Agente de Aduanas ve el BL del cliente con mandato aprobado');

  // Interruptor de propuestas
  await rol('HELP_DESK');
  await menu('Liquidaciones y Pagos', 'Pago');
  const props = () => p.locator('.cc-prop:visible').count();
  const antes = await props();
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#propToggle'); await W(250);
  check(antes > 0 && await props() === 0 && !(await p.isVisible('#pePgOper')), `apagar propuestas oculta HU-DM-01 (${antes} a 0)`);
  await p.click('#propToggle'); await W(200);
  check(await p.isVisible('#pePgOper'), 'encender propuestas lo muestra de nuevo');

  await p.click('#peSalir'); await W(250);
  check(await activa() === 'screenPeLogin' && !(await p.isVisible('#ccMenu')), 'Cerrar sesión vuelve al login');
  check(await p.evaluate(() => Object.keys(localStorage).length === 0), 'sin localStorage');
  check(errs.length === 0, `sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);
  await b.close();
  console.log(fails ? `\nHAY FALLAS (${fails})` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FALLA', e.message.split('\n')[0]); process.exit(1); });
