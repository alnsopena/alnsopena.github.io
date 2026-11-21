// Uso: MOCKUP_HTML=<ruta a index.html> node e2e_agenciamiento_tarifa.js
// (también se puede copiar a Mockup/tests/ y usar con MOCKUP_HTML)
// Agenciamiento (Viaje, Itinerario) y Tarifa con el formato de Connect y las propuestas marcadas.
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../pda-mockup/index.html');
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
const ruido = /^(start|onHasParentDirectory|addRow) is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!ruido.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept());
  const W = (ms = 200) => p.waitForTimeout(ms);
  const txt = s => p.textContent(s).then(x => (x || '').replace(/\s+/g, ' ').trim()).catch(() => '');
  const toast = () => txt('#toast');
  const menu = async (g, o) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click(`#ccMenu [data-menu="${g}"]`); await W(); if (await p.isVisible('#ccDropdown.show')) { await p.click(`#ccDropdown button:has-text("${o}")`); await W(300); } };
  await p.goto('file://' + HTML); await W(300);
  await p.evaluate(() => { if (!state.categoryType) chooseType('maritimo'); }); await W(200);
  const ger = await p.$eval('#currentUser', s => [...s.options].find(o => /Gerencia/.test(o.text)).value);
  await p.selectOption('#currentUser', ger); await W();

  // ---------- Viaje: Consulta Viaje ----------
  await menu('Agenciamiento', 'Viaje');
  check(await txt('#ccPbTitle') === 'Consulta Viaje', 'Viaje: título Consulta Viaje');
  check((await txt('#vyFilters h3')) === 'Buscar Viaje', 'Viaje: tarjeta Buscar Viaje');
  const etiquetas = await p.$$eval('#vyFilters .fac-f label', x => x.map(e => e.textContent.trim()));
  check(['Puerto de Operación', 'Armador', 'Rango ETA', 'Rango ETD'].every(l => etiquetas.includes(l)), 'Viaje: filtros de Connect (Puerto, Armador, Rango ETA y ETD)');
  check(await p.$eval('#vyFilters button.ag-needf', e => e.disabled), 'Viaje: Buscar deshabilitado sin filtros');
  check(await p.$$eval('#vf_estado option', o => o.map(x => x.textContent).includes('Direccionamiento cerrado')), 'Viaje: estado Direccionamiento cerrado');
  await p.selectOption('#vf_estado', 'Creado'); await p.click('#vyFilters button.ag-needf'); await W();
  check(/Resultados \(\d+\)/.test(await txt('#vyRes h3')), 'Viaje: Resultados (n)');
  const cols = await p.$$eval('#vyRes thead th', x => x.map(e => e.childNodes[0].textContent.trim()));
  check(['Armador', 'ATA', 'ATD'].every(c => cols.includes(c)), 'Viaje: columnas Armador, ATA y ATD');
  check(await p.$$eval('#vyRes .cc-pager option', o => o.map(x => x.textContent).join(',')) === '5,10,25', 'Viaje: paginador 5, 10, 25');
  // + Nuevo
  await p.click('#vyNewBtn'); await W();
  check(await p.isVisible('#facModal.show') && (await txt('#facModalBox h3')) === 'Crear Nuevo Viaje', 'Viaje: diálogo Crear Nuevo Viaje');
  await p.click('#facModalBox label:has-text("Usar PDA Aprobada")'); await W(); await p.click('#facModalBox button:has-text("Buscar")'); await W();
  check(await p.$$eval('#nvList .am-card', x => x.length) > 0, 'Viaje: lista de PDAs aprobadas');
  await p.click('#facModalBox label:has-text("Iniciar en blanco")'); await W(); await p.click('#nvOk'); await W();
  check(await txt('#ccPbTitle') === 'Nuevo Viaje', 'Viaje: pantalla Nuevo Viaje');
  await p.click('#vyEditor > .fac-zone > .fac-btns button:has-text("Guardar")'); await W(100);
  check((await toast()).includes('Por favor complete todos los campos obligatorios'), 'Viaje: valida obligatorios');
  await p.click('#vyEditor > .fac-zone > .fac-btns button:has-text("Cancelar")'); await W();
  // Edición de Viaje
  const code = await p.evaluate(() => VOYAGES.find(v => v.estado === 'Creado' && v.manif).code);
  await p.evaluate(c => selectVoyage(c), code); await W();
  check(await txt('#ccPbTitle') === 'Edición de Viaje', 'Viaje: Edición de Viaje');
  const tabs = await p.$$eval('#vyEditor .md-tabs button', x => x.map(e => e.childNodes[0].textContent.trim()));
  check(tabs.join('|') === 'Información General|Tiempos de Arribo y Zarpe|Servicios operativos|Documentos adjuntos', 'Viaje: 4 pestañas de Connect');
  const btns = await p.$$eval('#vyEditor .md-actions button', x => x.map(e => e.textContent.trim()));
  check(['Asociar PDA', 'Enviar Email', 'Editar', 'Transmitir Aviso de Arribo (0117)', 'Transmitir Término de Descarga (0119)', 'Anular'].every(t => btns.includes(t)), 'Viaje: botones de cabecera y SUNAT');
  check(await p.$$eval('#vyEditor .ag-aviso', x => x.length) > 0, 'Viaje: avisos amarillos');
  await p.click('#vyEditor button:has-text("Transmitir Aviso de Arribo (0117)")'); await W();
  check((await txt('#facModalBox h3')) === 'Transmitir aviso de arribo (0117)', 'Viaje: confirmación 0117');
  await p.click('#agOkBtn'); await W(1500);
  check((await toast()).includes('Aviso de arribo enviado a SUNAT'), 'Viaje: 0117 enviado (simulado)');
  await p.click('#vyEditor .md-tabs button:has-text("Tiempos de Arribo y Zarpe")'); await W();
  check(await p.$$eval('#vyEditor .ag-subtabs button', x => x.length) === 4, 'Viaje: subpestañas Arribo, Operaciones, Zarpe y Remolcadores');
  check(await p.$$eval('#vyEditor [title="Editar individualmente"]', x => x.length) >= 1, 'Viaje: lápiz SUNAT tras 0117');
  await p.click('#vyEditor .md-tabs button:has-text("Información General")'); await W();
  await p.click('#vyEditor button:has-text("Ver Historial")'); await W();
  check((await txt('#facModalBox')).includes('Estado Previo'), 'Viaje: Historial con columnas de Connect');
  await p.click('#facModalBox .fac-btns button:has-text("Cerrar")'); await W();
  await p.click('#vyEditor .md-actions button.pink:has-text("Anular")'); await W();
  check((await txt('#facModalBox h3')) === 'Anular Viaje' && await p.$eval('#anOk', e => e.disabled), 'Viaje: Anular pide motivo');
  await p.click('#facModalBox button:has-text("Cancelar")'); await W();
  await p.click('#vyEditor .md-actions button:has-text("Enviar Email")'); await W();
  check((await txt('#facModalBox h3')) === 'Enviar Email', 'Viaje: diálogo Enviar Email');
  await p.click('#facModalBox button:has-text("Cancelar")'); await W();
  await p.click('#vyEditor .md-actions button:has-text("Editar")'); await W();
  check(await p.isVisible('#vyEditor .md-actions button:has-text("Guardar")'), 'Viaje: modo Editar con Guardar y Cancelar');
  await p.click('#vyEditor .md-actions button:has-text("Guardar")'); await W();
  check((await toast()).includes('Viaje modificado exitosamente.'), 'Viaje: guardar con validaciones de Connect');
  // Ingresar Nro. de Manifiesto
  const code2 = await p.evaluate(() => VOYAGES.find(v => v.estado === 'Creado' && !v.manif).code);
  await p.evaluate(c => selectVoyage(c), code2); await W();
  await p.click('#vyEditor button:has-text("Ingresar Nro. de Manifiesto")'); await W();
  await p.fill('#mnTxt', '01-118-2026-1-0999'); await p.click('#mnOk'); await W();
  check(await p.evaluate(c => voyByCode(c).manif, code2) === '01-118-2026-1-0999', 'Viaje: Ingresar Nro. de Manifiesto');
  await p.evaluate(() => backToVyList()); await W();
  check(await p.isVisible('#vyBackBtn') && await p.isVisible('#vyRes th.cc-prop'), 'Viaje: propuestas visibles (Volver y PDA asociada)');
  await p.evaluate(() => CC.alternarPropuestas(false)); await W();
  check(!(await p.isVisible('#vyBackBtn')) && !(await p.isVisible('#vyRes th.cc-prop')), 'Viaje: "Ver propuestas" apagado las oculta');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W();

  // ---------- Itinerario ----------
  await menu('Agenciamiento', 'Itinerario');
  check(await txt('#ccPbTitle') === 'Importar Itinerario', 'Itinerario: título Importar Itinerario');
  await p.fill('#itLinea', 'ZIM'); await p.dispatchEvent('#itLinea', 'change'); await W(100);
  await p.fill('#itServ', 'Colibri'); await p.dispatchEvent('#itServ', 'change'); await W(100);
  await p.click('#itForm button:has-text("Cargar archivo")'); await W();
  await p.setInputFiles('#facModalBox input[type=file] >> nth=0', { name: 'itinerario_colibri.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') }); await W();
  await p.click('#itOk'); await W();
  const it = await txt('#itRes');
  check(/Resultados \(\d+\)/.test(it) && it.includes('Creado') && it.includes('Rechazado'), 'Itinerario: crea viajes y muestra rechazados');

  // ---------- Tarifa ----------
  await menu('Tarifa', 'Tarifa');
  check(await txt('#ccPbTitle') === 'Consulta Tarifa' && (await txt('#tfFilters h3')) === 'Buscar Tarifa', 'Tarifa: Consulta Tarifa y Buscar Tarifa');
  check(await p.$eval('#tf_clase', s => s.value) === 'Tarifa Comercial' && await p.$$eval('#tf_clase option', o => o.length) === 6, 'Tarifa: Clase por defecto Tarifa Comercial y 5 clases');
  check(await p.$$eval('#tf_contrato option', o => o.map(x => x.textContent).join('|')) === 'Elegir Tipo de Contrato|Estándar|Lumpsum', 'Tarifa: contrato Estándar y Lumpsum');
  check(await p.$$eval('#tf_tipo option', o => o.map(x => x.textContent).includes('Tercero Interno')), 'Tarifa: Tercero Interno');
  await p.click('#tfVig'); await p.click('#tfFilters button:has-text("Buscar")'); await W();
  const colores = [];
  for (const e of ['Pendiente', 'Aprobada', 'Rechazada', 'Anulada']) { await p.selectOption('#tfEstado', e); await p.click('#tfFilters button:has-text("Buscar")'); await W(); colores.push(await p.$eval('#tfResults .tf-st', x => x.className).catch(() => '')); }
  check(new Set(colores.filter(Boolean)).size === 4, 'Tarifa: cada estado con su color en la búsqueda');
  await p.selectOption('#tfEstado', 'Rechazada'); await p.click('#tfFilters button:has-text("Buscar")'); await W();
  await p.click('#tfResults a >> nth=0'); await W();
  check(await txt('#ccPbTitle') === 'Edición de Tarifa', 'Tarifa: Edición de Tarifa');
  check(await p.$$eval('#tfEditor .cc-chips .cc-chip', x => x.length) === 4, 'Tarifa: 4 chips de estado');
  check(await p.isVisible('#tfEditor .md-actions button:has-text("Editar")'), 'Tarifa: Rechazada se puede editar');
  await p.click('#tfEditor .md-actions button:has-text("Editar")'); await W();
  await p.click('#tfEditor > .fac-zone > .fac-btns button:has-text("Guardar")'); await W();
  check(await p.evaluate(() => TARIFFS.find(t => t.id === tf.selId).status) === 'Pendiente', 'Tarifa: al guardar vuelve a Pendiente');
  await p.click('#tfEditor button:has-text("Aprobar")'); await W();
  check((await txt('#facModalBox h3')) === 'Confirmar Aprobación', 'Tarifa: confirmación de aprobación');
  await p.click('#agOkBtn'); await W();
  check(await p.evaluate(() => TARIFFS.find(t => t.id === tf.selId).status) === 'Aprobada', 'Tarifa: aprobada');
  await p.click('#tfEditor .md-actions button:has-text("Anular")'); await W();
  check((await txt('#facModalBox h3')) === 'Anular Tarifa' && (await txt('#tfMotN')) === '0 / 200', 'Tarifa: diálogo de motivo con contador');
  await p.click('#facModalBox button:has-text("Cancelar")'); await W();
  // Sobreestadía y HU-ATC-10
  await p.evaluate(() => backToTfList()); await W();
  await p.selectOption('#tf_clase', 'Tarifa de Sobreestadía de Importación'); await W();
  check(!(await p.$('#tf_tipo')) && !(await p.$('#tf_contrato')), 'Tarifa: filtros propios de Sobreestadía');
  if (!(await p.isVisible('#tfAdv'))) { await p.click('#tfAdvBtn'); await W(); }
  check(await p.isVisible('#tf_iso') && await p.isVisible('#tf_tramo'), 'Tarifa: filtros HU-ATC-10 (ISO y tramo)');
  await p.selectOption('#tfEstado', ''); await p.fill('#tf_tramo', '10'); await p.click('#tfFilters button:has-text("Buscar")'); await W();
  const th = await txt('#tfRes thead');
  check(th.includes('Tramos') && th.includes('HU-ATC-10'), 'Tarifa: columnas Línea, ISO y Tramos marcadas HU-ATC-10');
  await p.evaluate(() => CC.alternarPropuestas(false)); await W();
  check(!(await p.isVisible('#tf_iso')) && !(await p.isVisible('#tfRes th.cc-prop')), 'Tarifa: "Ver propuestas" apagado oculta HU-ATC-10');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W();
  // Nueva tarifa
  await p.click('#tfNewBtn'); await W();
  await p.fill('#tfEditor [data-f=ref]', 'PRUEBA E2E');
  await p.evaluate(() => { agTfSet('contrato', 'Estándar'); agTfMs('suc', 0, true); agTfMs('puerto', 'ALL', true); agTfMs('terminal', 'ALL', true); agTfMs('cliente', 'ALL', true); agTfMs('armador', 'ALL', true); agTfMs('nave', 0, true); agTfMs('nave', 1, true); agTfCritAdd(); }); await W();
  check(await p.evaluate(() => tf.draft.crit.length) === 2, 'Tarifa: Agregar genera una fila por combinación');
  await p.click('#tfEditor > .fac-zone > .fac-btns button:has-text("Crear")'); await W();
  check((await toast()).includes('se ha registrado correctamente'), 'Tarifa: Crear con mensaje de Connect');

  check(errs.length === 0, 'sin errores JS ' + JSON.stringify(errs));
  await b.close();
  console.log(fails ? `\n${fails} FALLA(S)` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})();
