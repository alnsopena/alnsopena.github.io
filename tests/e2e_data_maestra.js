// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_data_maestra.js
// Data Maestra, Seguridad y Dashboard como Connect, con las propuestas marcadas (interruptor "Ver propuestas").
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
const ruido = /^(start|onHasParentDirectory|addRow) is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!ruido.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept());
  const W = (ms = 150) => p.waitForTimeout(ms);
  const top = () => p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const txt = s => p.textContent(s).then(x => (x || '').replace(/\s+/g, ' ').trim());
  const ir = async (g, o) => { await top(); await W(100); await p.click(`#ccMenu [data-menu="${g}"]`); await W(); await p.click(`#ccDropdown button:has-text("${o}")`); await W(250); };
  const visible = s => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; }, s);
  const props = v => p.evaluate(v => CC.alternarPropuestas(v), v);
  await p.goto('file://' + HTML); await W(300);

  // Menú
  await p.click('#ccMenu [data-menu="Data Maestra"]'); await W();
  const ops = await p.$$eval('#ccDropdown button', x => x.map(e => e.textContent.trim()));
  check(ops.join('|') === 'Catálogo|Organización|Socio|Servicios|Nave|Tipo de cambio|Series|Plantilla Email|Días No Laborables', 'menú Data Maestra con las 9 opciones de Connect');
  await p.click('#ccMenu [data-menu="Data Maestra"]'); await W();

  // Socio
  await ir('Data Maestra', 'Socio');
  check((await txt('#ccPbTitle')).includes('Buscar Socios'), 'Socio: título Buscar Socios sin elegir Marítimo o Terrestre');
  check(await p.isDisabled('#ptBuscar'), 'Socio: Buscar inactivo sin filtros');
  check((await p.$$eval('#screenPartners thead th', x => x.map(e => e.textContent.trim()))).join('|') === 'Número Documento|Nombre Corto|Dirección|Roles|Estado', 'Socio: columnas (Roles es propuesta)');
  await p.selectOption('#pfEst', 'Por homologar'); await W();
  check((await txt('#ptResults')).includes('Pendiente de aprobación') && !(await txt('#ptResults')).includes('Por homologar'), 'Socio: estado Pendiente de aprobación');
  await p.selectOption('#currentUser', { label: 'P. Díaz (Facturación)' }); await W();
  await p.click('#ptResults tr >> nth=0'); await W();
  check((await txt('#ptEditor')).includes('Para guardar o aprobar el socio se requieren dirección, código ERP y al menos un rol.'), 'Socio: aviso de Connect');
  check((await txt('#ptEditor button.tf-ok')) === 'Aprobar socio', 'Socio: botón Aprobar socio');
  check((await txt('#ptEditor')).includes('Configuración SFTP') && (await txt('#ptEditor')).includes('Representante de Línea'), 'Socio: SFTP y Representante de Línea de Connect');
  check(await visible('#ptEditor button.cc-prop[onclick^="rejectPartner"]'), 'Socio: Rechazar visible como propuesta');
  await props(false); await W();
  check(!(await visible('#ptEditor button.cc-prop[onclick^="rejectPartner"]')) && !(await visible('#ptEditor .tf-hist')), 'Socio: Rechazar e historial se ocultan con propuestas apagadas');
  await props(true); await W();
  await p.evaluate(() => { const x = PARTNERS.find(y => y.estado === 'Homologado'); selectPartner(x.id, true); }); await W();
  check(await visible('#ptEditor button[onclick="ptReopen()"]'), 'Socio aprobado: Volver a pendiente');
  await p.click('#ptEditor button[onclick="ptReopen()"]'); await W();
  check((await txt('#facModalBox')).includes('Seguirán asociados') && (await txt('#facModalBox')).includes('Se desbloquea el tipo y número de documento.'), 'Socio: diálogo Volver a pendiente con efectos');
  await p.click('#ptReopenOk'); await W();
  check((await txt('#ptEditor .md-actions')).includes('Pendiente de aprobación'), 'Socio: vuelve a Pendiente de aprobación');

  // I-035 · HU-DM-01: datos por rol (Cliente / Proveedor / Ambos) y sincronización con SAP
  await p.evaluate(() => { const x = PARTNERS.find(y => y.doc && y.roles.length); x.roles = [{ rol: 'Línea naviera', cliente: true, proveedor: true }]; delete x.rd; selectPartner(x.id, true); }); await W();
  check(await visible('#ptRd') && (await txt('#ptRd [data-rdclase]')) === 'Ambos', 'I-035: bloque Datos por rol visible, socio Ambos');
  check((await p.$$('#ptRd [data-rd]')).length === 2, 'I-035: bloques Cliente y Proveedor');
  const tRd = await txt('#ptRd');
  check(tRd.includes('Código ERP Cliente *') && tRd.includes('Moneda Proveedor *') && tRd.includes('Condición Pago Cliente *'), 'I-035: campos obligatorios por rol');
  check(tRd.includes('Copiado de la cabecera') && tRd.includes('BPAddresses') && tRd.includes('CardCode'), 'I-035: transición desde cabecera y mapeo a SAP con dirección');
  check((await p.getAttribute('#ptRd', 'data-prop')) === 'Propuesta · HU-DM-01 · I-035 · Datos por rol y SAP', 'I-035: marca morada HU-DM-01 · I-035');
  check((await p.$$eval('#ptEditor .md-tabs + .md-body thead th', x => x.map(e => e.textContent.trim()))).some(t => t.startsWith('Tipo Socio')) && await visible('#ptEditor [data-rdcom]'), 'I-035: Tipo Socio en Roles y comisión solo en Línea');
  const proErp = await p.inputValue('#ptRd [data-rdf="pro_erp"]');
  await p.click('#ptRd [data-rdsync="cli"]'); await W();
  const doc = await p.evaluate(() => pt.draft.doc);
  check((await p.inputValue('#ptRd [data-rdf="cli_erp"]')) === 'C' + doc && (await txt('#ptRd [data-rd="cli"] [data-rdst]')) === 'SINCRONIZADO CON SAP', 'I-035: sincronizar Cliente carga el bloque y muestra el estado');
  check((await p.inputValue('#ptRd [data-rdf="pro_erp"]')) === proErp && (await txt('#ptRd [data-rd="pro"] [data-rdst]')) === 'SIN SINCRONIZAR', 'I-035: Proveedor no cambia');
  check(((await p.getAttribute('#ptRd [data-rd="cli"] [data-rdst]', 'title')) || '').includes('Actualizado en SAP'), 'I-035: fechas de sincronización en el tooltip');
  await p.click('#ptEditor button[onclick="startPtEdit()"]'); await W();
  await p.fill('#ptRd [data-rdf="pro_erp"]', ''); await p.click('#ptEditor button[onclick="savePartner()"]'); await W();
  check(!!(await p.$('#ptEditor [data-err="rd_pro_erp"]')), 'I-035: Código ERP Proveedor obligatorio al guardar');
  await props(false); await W();
  check(!(await visible('#ptRd')) && !(await visible('#ptEditor [data-rdcom]')), 'I-035: se oculta con Ver propuestas apagado');
  await p.click('#ptEditor button[onclick="savePartner()"]'); await W();
  check(!(await p.evaluate(() => pt.edit)), 'I-035: con propuestas apagadas guarda como Connect');
  await props(true); await W();

  // I-035 · épica completa: catálogo Partner Role, sincronización, faltantes, contactos, cuentas, dirección y selectores
  await ir('Data Maestra', 'Catálogo');
  await p.fill('#caCod', 'PARTNER_ROLE'); await p.click('#caFBuscar'); await W();
  await p.click('#caRes button.fac-link:has-text("PARTNER_ROLE")'); await W();
  const thCa = await p.$$eval('#caItems thead th', x => x.map(e => e.textContent.trim()));
  check(thCa.some(t => t.startsWith('Tipo Socio')) && thCa.includes('Requiere Código Aduanas') && await visible('#caRolNota'), 'I-035: catálogo Partner Role con Tipo Socio y Requiere Código Aduanas');
  await p.click('#caEditar'); await W();
  await p.evaluate(() => caAgregar('elementos')); await W();
  const nFil = (await p.$$('#caItems tbody tr')).length;
  await p.fill(`#caItems tbody tr:nth-child(${nFil}) td:nth-child(2) input`, 'ROL_PRUEBA'); await p.fill(`#caItems tbody tr:nth-child(${nFil}) td:nth-child(3) input`, 'Rol de prueba');
  await p.click('#caGuardar'); await W();
  check((await txt('#toast')).includes('Todo rol debe tener Tipo Socio') && (await txt('#toast')).includes('Rol de prueba'), 'I-035: todo rol tiene clasificación');
  await p.selectOption(`#caItems [data-catipo="${nFil - 1}"]`, 'Proveedor'); await p.check(`#caItems [data-caadu="${nFil - 1}"]`);
  const iBk = await p.evaluate(() => PT_ROLES.indexOf('Broker')); await p.selectOption(`#caItems [data-catipo="${iBk}"]`, 'Cliente');
  await p.click('#caGuardar'); await W();
  check(await p.evaluate(() => PT_ROLES.includes('Rol de prueba') && PT_ROL_CAT['Rol de prueba'][0] === 'Proveedor' && PT_ROL_CAT['Rol de prueba'][1] === true && PT_ROL_CAT['Broker'][0] === 'Cliente'), 'I-035: el catálogo actualiza la clasificación que usa el Socio');
  await props(false); await W();
  check(!(await visible('#caRolNota')) && !(await p.$$eval('#caItems thead th', x => x.filter(e => e.getClientRects().length).map(e => e.textContent.trim()))).some(t => t.startsWith('Tipo Socio')), 'I-035: columnas del catálogo se ocultan con Ver propuestas apagado');
  await props(true); await W();

  await ir('Data Maestra', 'Socio');
  await p.evaluate(() => { const x = PARTNERS.find(y => y.doc && y.estado === 'Homologado' && y.roles.every(r => r.rol === 'Proveedor'));
    x.roles = [{ rol: 'Broker', cliente: true, proveedor: false }, { rol: 'Rol de prueba', cliente: false, proveedor: true }]; x.doc = ''; x.estado = 'Por homologar'; x.contactos = []; x.bancos = []; delete x.rd; window.__rdId = x.id; selectPartner(x.id, true); }); await W();
  check((await txt('#ptRd [data-rdclase]')) === 'Ambos' && (await txt('#ptRd [data-rd="pro"]')).includes('Código de Aduana obligatorio por: Rol de prueba'), 'I-035: clasificación y Código de Aduana según el catálogo');
  check(await p.isDisabled('#ptRd [data-rdsync="cli"]') && await p.isDisabled('#ptRd [data-rdsync="pro"]'), 'I-035: Sincronizar deshabilitado sin Número Documento');
  await p.click('#ptEditor button[onclick="startPtEdit()"]'); await W();
  await p.fill('#ptEditor [data-f=doc]', '20600000999'); await W();
  check(!(await p.isDisabled('#ptRd [data-rdsync="pro"]')), 'I-035: Sincronizar se habilita con Número Documento y tipo');
  await p.click('#ptEditor .md-tabs button:has-text("Roles")'); await W();
  await p.click('#ptEditor .md-body tbody tr:nth-child(1) td:nth-child(4) input[type=checkbox]'); await W();
  check(!(await p.evaluate(() => pt.draft.roles[0].proveedor)) && (await txt('#toast')).includes('es solo Cliente'), 'I-035: un rol Cliente no acepta Proveedor');
  await p.fill('#ptRd [data-rdf="pro_aduana"]', ''); await p.fill('#ptRd [data-rdf="pro_erp"]', '');
  await p.click('#ptEditor button[onclick="savePartner()"]'); await W();
  const tst = await txt('#toast');
  check(tst.includes('Falta el Código ERP Proveedor') && tst.includes('Falta el Código de Aduana Proveedor (lo requiere: Rol de prueba)'), 'I-035: mensaje nombra el código faltante');
  check((await txt('#ptEditor [data-err="rd_pro_erp"]')) === 'Falta el Código ERP Proveedor', 'I-035: error junto al campo del rol');
  await p.click('#ptRd [data-rdsync="pro"]'); await W();
  const sp = await p.evaluate(() => ({ erp: pt.draft.rd.pro.erp, cli: pt.draft.rd.cli.sync, c: pt.draft.contactos.find(c => c.codeErp), b: pt.draft.bancos.find(b => b.cci), dir: [pt.draft.dirPais, pt.draft.dirDep, pt.draft.dirProv, pt.draft.dirDist].join('|') }));
  check(sp.erp === 'P20600000999' && !sp.cli && (await txt('#ptRd [data-rd="pro"] [data-rdst]')) === 'SINCRONIZADO CON SAP', 'I-035: trae Código ERP con prefijo P solo para Proveedor');
  check(((await p.getAttribute('#ptRd [data-rd="pro"] [data-rdst]', 'title')) || '').includes('UpdateTime'), 'I-035: tooltip con UpdateDate y UpdateTime del rol');
  check(await p.isDisabled('#ptRd [data-rdsync="pro"]'), 'I-035: tras sincronizar se deshabilita');
  check(!!sp.c && sp.c.codeErp === 'P20600000999-01' && !!sp.c.movil && !!sp.c.email && !!sp.b && sp.b.detrac === 'Sí' && sp.b.cci.length === 20 && sp.dir === 'Perú|Lima|Lima|San Isidro', 'I-035: trae contacto, cuenta y dirección de SAP');
  check(await visible('#ptEditor [data-rddir="dirDist"]') && (await txt('#ptRdDirNota')).includes('la facturación no cambia') && (await txt('#ptRdDirNota')).includes('Ubigeo no se mapea'), 'I-035: País, Departamento, Provincia y Distrito con nota');
  await p.fill('#ptEditor [data-f=doc]', '20600000998'); await W();
  check(!(await p.isDisabled('#ptRd [data-rdsync="pro"]')), 'I-035: se habilita de nuevo si cambia el Número Documento');
  await p.click('#ptEditor .md-tabs button:has-text("Información de Contacto")'); await W();
  check((await p.$$eval('#ptEditor .md-body thead th', x => x.map(e => e.textContent.trim()))).some(t => t.startsWith('Código ERP')) && !!(await p.$('#ptEditor [data-rdcerp]')), 'I-035: Código ERP del contacto');
  await p.click('#ptEditor .md-tabs button:has-text("Información Financiera")'); await W();
  const thB = await p.$$eval('#ptEditor .md-body thead th', x => x.map(e => e.textContent.trim()));
  check(thB.some(t => t.startsWith('SWIFT')) && thB.includes('País') && thB.includes('Cta. detracción') && thB.includes('CCI'), 'I-035: SWIFT, País, Cuenta de detracción y CCI');
  await p.fill('#ptRd [data-rdf="pro_aduana"]', '0118'); await p.fill('#ptEditor [data-f=doc]', '20600000999');
  await p.click('#ptEditor button[onclick="savePartner()"]'); await W();
  check(!(await p.evaluate(() => pt.edit)), 'I-035: guarda con los datos por rol completos');
  // 3.6 selectores: proveedor solo en Provisiones, cliente en PDA, Documentos Contables y BL
  const sel = await p.evaluate(() => { const pro = FAC_PROVS.find(n => { const x = partnerByName(n); return x && ptRdSides(x).join() === 'pro'; }), cli = state.clients[0].name;
    return { pro, cli, provOk: ptRdFiltra(FAC_PROVS, 'pro').includes(pro), cliEnPro: ptRdOk(cli, 'pro'), proEnCli: ptRdOk(pro, 'cli'), pda: ptRdFiltra(state.clients.map(c => c.name), 'cli').length === state.clients.length }; });
  check(sel.provOk && !sel.cliEnPro && !sel.proEnCli && sel.pda, 'I-035: selectores filtran por tipo de socio');
  await ir('Liquidación', 'Documentos Contables');
  await p.fill('#fdFact', sel.pro); await p.press('#fdFact', 'Tab'); await W();
  check((await p.evaluate(() => FD.f.fact)) === '' && (await txt('#toast')).includes('no tiene rol Cliente'), 'I-035: Documentos Contables no acepta un proveedor como cliente');
  check(!(await p.$$eval('#fdFactL option', x => x.map(o => o.value))).includes(sel.pro), 'I-035: lista de Facturar a sin proveedores');
  check(await p.evaluate(n => { CC.alternarPropuestas(false); const ok = ptRdOk(n, 'cli'); CC.alternarPropuestas(true); return ok; }, sel.pro), 'I-035: con Ver propuestas apagado no filtra');
  // 3.5 y 3.12: los procesos muestran el dato del rol
  check(await p.evaluate(n => /data-rdcons="pro"/.test(ptRdNota(n, 'pro')) && /del rol/.test(ptRdNota(n, 'pro')), sel.pro), 'I-035: Provisiones y Documentos Contables toman el Código ERP del rol');

  // Nave
  await ir('Data Maestra', 'Nave');
  check((await txt('#ccPbTitle')).includes('Buscar Nave'), 'Nave: título Buscar Nave');
  check((await p.$$eval('#screenVessels thead th', x => x.map(e => e.textContent.trim())))[2] === 'Estado', 'Nave: Estado en tercera columna');
  await p.click('#nvAdvBtn'); await W(); check(await visible('#nfR_loa_d'), 'Nave: filtros avanzados por rango');
  await p.fill('#nfR_loa_d', '300'); await p.fill('#nfR_loa_h', '100'); await p.click('#nvBuscar'); await W();
  check((await txt('#toast')).includes('Por favor corrija los campos rangos'), 'Nave: valida rangos');
  await p.selectOption('#currentUser', { label: 'M. Rojas (Agenciamiento)' }); await W();
  await p.evaluate(() => { const s = SHIPS_CATALOG.find(x => x.estado === 'Homologado'); openVessel(s.name, 'landing'); }); await W();
  check(await visible('#nvEditor button[onclick="nvReopen()"]') && (await txt('#nvEditor .md-actions')).includes('Aprobado'), 'Nave aprobada: Aprobado y Volver a pendiente');

  // Servicios
  await p.evaluate(() => { if (!state.categoryType) chooseType('maritimo'); }); await W(200);
  await ir('Data Maestra', 'Servicios');
  check((await txt('#ccPbTitle')).includes('Buscar Servicios'), 'Servicios: título Buscar Servicios');
  const sth = await p.$$eval('#screenMaster thead th', x => x.map(e => e.textContent.trim()));
  check(sth.includes('Cta. Detracción') && sth.includes('Centro de Costo'), 'Servicios: columnas Cta. Detracción y Centro de Costo');
  await props(false); await W();
  check(!(await visible('#mAdvBtn')) && !(await visible('#masterPend')), 'Servicios: filtros propuesta ocultos con propuestas apagadas');
  await props(true); await W();

  // Organización
  await ir('Data Maestra', 'Organización');
  check((await txt('#ccPbTitle')).includes('Buscar Organización') && await p.isDisabled('#orFBuscar'), 'Organización: búsqueda de Connect');
  await p.fill('#orNombre', 'COSMOS'); await p.click('#orFBuscar'); await W();
  check((await txt('#orRes')).includes('Resultados (2)'), 'Organización: resultados');
  await p.click('#orRes button.fac-link >> nth=0'); await W();
  check((await txt('#orTabs')).includes('Contacto') && (await txt('#orTabs')).includes('Direccionamiento'), 'Organización: pestaña Sucursal con Contacto, Puerto, Local, Direccionamiento');
  await p.click('#orTabs .fac-tabs button:has-text("Área")'); await W(); check((await txt('#orTabs')).includes('División de Negocio'), 'Organización: pestaña Área');
  await p.click('#orEditar'); await W(); await p.click('#orTabs .fac-tabs button:has-text("Información Financiera")'); await W();
  await p.evaluate(() => { OR.draft.fin[1].cover = true; OR.draft.fin[1].swift = ''; }); await p.click('#orGuardar'); await W();
  check((await txt('#orTabs')).includes('La cuenta marcada como Cover debe tener banco, número de cuenta y SWIFT completos.'), 'Organización: regla de Cover');
  await p.evaluate(() => { OR.dirty = false; orCancelar(); });

  // Catálogo
  await ir('Data Maestra', 'Catálogo');
  await p.fill('#caCod', 'PARTNER_STATUS'); await p.click('#caFBuscar'); await W(); await p.click('#caRes button.fac-link'); await W();
  await p.click('#screenCatalogo .fac-tabs button:has-text("Estado")'); await W();
  check((await txt('#caItems')).includes('Pendiente de aprobación') && (await txt('#caItems')).includes('Aprobado'), 'Catálogo: estados de PARTNER_STATUS');

  // Tipo de cambio
  await ir('Data Maestra', 'Tipo de cambio');
  await p.selectOption('#tcFMon', 'USD'); await p.click('#tcFBuscar'); await W();
  check((await txt('#tcRes')).includes('Resultados (30)') && (await p.$$eval('#tcRes th', x => x.map(e => e.textContent))).join('|') === 'ID|Fecha|Moneda|TC Compra|TC Venta', 'Tipo de cambio: búsqueda y columnas');
  await p.click('#tcRes button.fac-link >> nth=0'); await W(); await p.click('#tcEditar'); await W();
  check(await p.isDisabled('#tcFecha') && await p.isDisabled('#tcMon'), 'Tipo de cambio: Fecha y Moneda bloqueadas al editar');

  // Plantilla Email
  await ir('Data Maestra', 'Plantilla Email');
  check((await txt('#ccPbTitle')).includes('Buscar Plantilla Email'), 'Plantilla Email: título');
  const total = await p.evaluate(() => { let n = 0; for (const m of ['CUSTOMER_SERVICE', 'BL', 'VOYAGE', 'PDA', 'SECURITY', 'SETTLEMENT', 'CONTAINER_DAMAGE']) { emSet('mod', m); emBuscar(); n += +document.querySelector('#emRes h3').textContent.match(/\d+/)[0]; } return n; });
  check(total === 24, `Plantilla Email: 24 plantillas en los 7 módulos del catálogo, más 2 fuera de él (26): ${total}`);
  await p.click('#emVarBtn'); await W();
  check((await txt('#emVarTbl')).includes('{{vesselName}}') && (await txt('#facModalBox')).includes('¿Cómo ocultar una línea cuando no hay dato?'), 'Plantilla Email: diálogo Variables disponibles');
  await p.evaluate(() => CC.cerrarModal());
  await p.evaluate(() => emNuevo()); await W(); await p.fill('#emNombre', 'Prueba'); await p.fill('#emAsunto', 'Asunto'); await p.click('#emGuardar'); await W();
  check((await p.$$eval('#emGen .f-err', x => x.length)) >= 3, 'Plantilla Email: Módulo, Alerta y Cuerpo obligatorios');
  await p.evaluate(() => { EM.dirty = false; emAbrir(1); }); await W();
  check(await visible('#emNotif') && (await txt('#emNotif')).includes('Evento disparador'), 'Plantilla Email: prototipo I-068 visible');
  await p.click('#emPrevBtn'); await W(); check((await txt('#facModalBox')).includes('PACIFIC HORIZON'), 'Plantilla Email: vista previa con ejemplos'); await p.evaluate(() => CC.cerrarModal());
  await props(false); await W(); check(!(await visible('#emNotif')), 'Plantilla Email: I-068 oculto con propuestas apagadas'); await props(true); await W();

  // Días No Laborables
  await ir('Data Maestra', 'Días No Laborables');
  await p.click('#dnEditar'); await W(); const y = new Date().getFullYear();
  await p.click(`#dnCal [data-iso="${y}-03-10"]`); await W(); await p.click('#dnGuardar'); await W();
  check((await txt('#toast')).includes('Días no laborables guardados correctamente.') && await p.evaluate(iso => !!document.querySelector(`#dnCal [data-iso="${iso}"].on`), `${y}-03-10`), 'Días No Laborables: marcar y guardar');

  // Seguridad
  await ir('Seguridad', 'Usuarios'); await p.click('#usNuevo'); await W(); await p.click('#usGuardar'); await W();
  check((await txt('#usRoot')).includes('Seleccione al menos un rol.'), 'Usuarios: Nuevo valida roles');
  await ir('Seguridad', 'Roles y Permisos'); await p.click('#rlNuevo'); await W(); await p.click('#rlGuardar'); await W();
  check((await txt('#rlRoot')).includes('El sistema es requerido.'), 'Roles: Nuevo valida sistema');

  // Dashboard
  await props(false); await W(); await top(); await p.click('#ccMenu [data-menu="Dashboard"]'); await W(300);
  check(await visible('#screenDashboardConnect') && (await txt('#screenDashboardConnect')).includes('Vista Operativa de Naves y Eventos Críticos'), 'Dashboard de Connect con propuestas apagadas');
  await props(true); await W(300);
  check(await visible('#screenDashboard'), 'Dashboard Operativo v3 (propuesta I-067) con propuestas encendidas');

  const rayas = await p.evaluate(() => ['screenPartners','screenVessels','screenOrganizacion','screenCatalogo','screenTipoCambio','screenPlantillaEmail','screenDiasNoLab','screenDashboardConnect'].map(i => document.getElementById(i)?.innerText || '').join(' '));
  check(!/[—–]/.test(rayas), 'sin rayas en las pantallas del módulo');
  check(errs.length === 0, `sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);
  await b.close(); console.log(fails ? `\nHAY FALLAS: ${fails}` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
