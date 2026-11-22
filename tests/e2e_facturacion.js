// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_facturacion.js [carpeta de capturas]
// Recorre Provisiones, Liquidación (canje) y Documentos Contables. Revisa marcas moradas, los 12 tickets, errores JS y ancho a 1366 y 1920 px.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TICKETS = ['I-014','I-041','I-042','I-015','I-040','I-159','I-064','I-007','I-066','I-005','I-065','I-115'];
const fails = []; const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'FALLA ') + msg); if (!ok) fails.push(msg); };
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

(async () => {
  const b = await chromium.launch(); const seen = new Set(); let badMarks = [], badText = [];
  for (const width of [1366, 1920]) {
    const p = await b.newPage({ viewport: { width, height: 900 } }); const errs = [];
    p.on('pageerror', e => { if (!/^(start|onHasParentDirectory|addRow) is not defined/.test(e.message)) errs.push(e.message); }); // en file:// el iframe del Dashboard muestra el listado de carpeta de Chrome p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.goto('file://' + HTML); await p.waitForTimeout(300);
    const W = ms => p.waitForTimeout(ms || 120);
    const audit = async name => {
      const r = await p.evaluate(() => {
        const zones = [...document.querySelectorAll('section.panel.active.fac-zone, .modal-bg.show .fac-zone')];
        const marks = zones.flatMap(z => [...z.querySelectorAll('.chg-tag, [data-chg], .chg-removed .chg-h')]);
        const txt = marks.map(m => m.getAttribute('data-chg') || m.textContent);
        const box = zones.map(z => z.innerText).join('\n');
        const over = document.documentElement.scrollWidth > window.innerWidth + 1;
        return { txt, box, over };
      });
      r.txt.forEach(t => { if (!/HU-FAC-\d+/.test(t) || !/I-\d{3}/.test(t)) badMarks.push(name + ': ' + t); if (/\bI-(041|159)\b/.test(t) !== /^No bloqueante/.test(t) && !/^Se quit/.test(t)) badMarks.push('Go Live ' + name + ': ' + t); TICKETS.forEach(k => { if (t.includes(k)) seen.add(k); }); });
      if (/—/.test(r.box) || EMOJI.test(r.box)) badText.push(name);
      if (r.over) check(false, `${width}px sin scroll horizontal de página en ${name}`);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${width}_${name}.png`), fullPage: true });
    };
    const openMenu = async item => { await p.click('[data-menu="Liquidación"]'); await W(); await p.click(`#ccDropdown button:has-text("${item}")`); await W(); };
    const txt = s => p.textContent(s);

    // Provisiones
    await openMenu('Provisiones');
    check(await p.isVisible('#screenProvisions'), `${width}: abre Provisiones sin elegir Marítimo o Terrestre`);
    // HU-FAC-01 · I-014: definición de Facturación (Pre-registro y Provisiones)
    check((await p.innerText('#ccMenu [data-menu="Liquidación"]')).trim() === 'Facturación', `${width}: menú visible Facturación`);
    await p.click('[data-menu="Liquidación"]'); await W();
    const opsVis = await p.$$eval('#ccDropdown button', x => x.map(e => e.innerText.trim()));
    check(opsVis.join('|') === 'Pre-registro y Provisiones|Emisión de Documentos', `${width}: opciones Pre-registro y Provisiones y Emisión de Documentos: ${opsVis}`);
    await p.click('[data-menu="Liquidación"]'); await W();
    check((await txt('#ccPbTitle')).includes('Pre-registro y Provisiones'), `${width}: título Pre-registro y Provisiones`);
    await audit('prov_buscar');
    check(await p.getAttribute('#lqpEta', 'readonly') !== null && (await p.inputValue('#lqpEta')) === '05/09/2026', `${width}: ETA automático, solo lectura y DD/MM/AAAA`);
    check((await p.$eval('#lqpCot option', o => o.textContent)) === 'Todas las cotizaciones (2)', `${width}: dos cotizaciones: Todas las cotizaciones (2)`);
    check((await txt('#lqpConsultar')).trim() === 'Consultar' && !(await p.isVisible('#lqpAdv')), `${width}: botón Consultar y filtros avanzados cerrados`);
    const kpi = async () => p.$$eval('#lqpKpis b', x => x.map(e => +e.textContent));
    let k = await kpi();
    check(k[0] === k[1] + k[2] && k[0] === await p.$$eval('#lqpRes tbody tr', x => x.length), `${width}: KPIs cuadran con la grilla ${k}`);
    const cots = await p.$$eval('#lqpRes tbody tr td:first-child', x => x.map(e => e.textContent));
    check(cots.join() === [...cots].sort().join() && !cots.some(c => c.includes('(Adicional)')) && await p.isVisible('#lqpOrigen'), `${width}: grilla plana ordenada por cotización, sin (Adicional) y con nota de origen`);
    check(await p.$$eval('#lqpRes tbody tr', x => x.every(r => r.querySelectorAll('td:last-child button').length === 1)), `${width}: una sola acción por fila`);
    await p.click('#lqpAdvBtn'); await W();
    const adv = await txt('#lqpAdv');
    check(['Proveedor','N° Provisión','Situación','Categoría','Servicios','Estado','Rango de Fechas'].every(x => adv.includes(x)) && !['N° Doc. Proveedor','Tipo de Fecha'].some(x => adv.includes(x)),`${width}: Filtros avanzados solo con los filtros de Connect`);
    await p.selectOption('#lqpEst', 'Por liquidar'); await W();
    check(await p.$$eval('#lqpRes tbody tr', x => x.every(r => r.innerText.includes('Por liquidar'))), `${width}: filtro Estado Por liquidar`);
    await p.click('#lqpAdv button:has-text("Limpiar")'); await W(); await p.click('#lqpAdvBtn'); await W();
    await p.selectOption('#lqpCot', 'PDA2026000063PECLL'); await W();
    check(await p.$$eval('#lqpRes tbody tr', x => x.length > 0 && x.every(r => r.innerText.includes('PDA2026000063PECLL'))), `${width}: elegir una cotización filtra la grilla`);
    await p.selectOption('#lqpCot', ''); await W();
    await p.fill('#lqpNave', 'REEFER ATLANTIC'); await p.dispatchEvent('#lqpNave', 'change'); await W();
    check((await p.inputValue('#lqpEta')) === 'Sin ETA registrado', `${width}: viaje sin recalada muestra Sin ETA registrado (PEN-I041-01)`);
    await p.fill('#lqpNave', 'PACIFIC HORIZON'); await p.dispatchEvent('#lqpNave', 'change'); await W(); await p.click('#lqpConsultar'); await W();
    await audit('prov_servicios');
    k = await kpi();
    await p.click('#lqpRes button:has-text("+ Pre-registrar") >> nth=0'); await W();
    check((await txt('#ccPbTitle')).includes('Crear Provisión'), `${width}: + Pre-registrar abre Crear Provisión`);
    check((await txt('#fpRoot')).includes('AYUDAS A LA NAVEGACION') && (await txt('#fpRoot')).includes('PACIFIC HORIZON'), `${width}: servicio cotizado precargado`);
    await p.click('#fpGuardar'); await W();
    check((await txt('#ccPbTitle')).includes('Editar Provisión'), `${width}: pre-registro guardado`);
    await p.click('#fpRoot .fac-tbl .fac-link'); await W(); await audit('prov_detalle_modal');
    await p.click('#facModal button:has-text("Cerrar")'); await W(); await audit('prov_editar');
    await p.click('.cc-back'); await W();
    const k2 = await kpi();
    check(k2[1] === k[1] - 1 && k2[2] === k[2] + 1, `${width}: KPIs se actualizan al pre-registrar ${k} > ${k2}`);
    await p.click('#lqpRes tr:has-text("SERVICIO DE REMOLCAJE") button:has-text("Ver Doc")'); await W();
    check(await p.isVisible('#fpCanjear'), `${width}: Ver Doc abre la provisión y permite Canjear`);
    await audit('prov_generadas');
    await p.evaluate(() => CC.alternarPropuestas(false)); await W();
    await p.evaluate(() => fpBack()); await W();
    check(await p.isVisible('#fpEst') && !(await p.isVisible('#lqpBar')) && (await txt('#ccPbTitle')).includes('Consulta de Provisiones') && (await p.innerText('#ccMenu [data-menu="Liquidación"]')).trim() === 'Liquidación', `${width}: sin propuestas Provisiones se ve como Connect`);
    await p.evaluate(() => CC.alternarPropuestas(true)); await W();
    // tarifa múltiple: cambia de proveedor
    await p.evaluate(() => { fpOpen(73); }); await W();
    check(await p.isDisabled('#fpRoot button.pink'), `${width}: provisión con documento no se anula`);
    await p.evaluate(() => { fpOpen(74); }); await W();
    await p.selectOption('#currentUser', { label: 'P. Díaz (Facturación)' }); await p.evaluate(() => renderFp()); await W();
    check(await p.isEnabled('#fpRoot button.pink'), `${width}: provisión ERROR se puede anular`);
    await p.click('#fpRoot button.pink'); await W(); await p.fill('#tfReasonTxt', 'Prueba'); await p.click('#tfReasonBtn'); await W();
    check((await txt('section.panel.active .cc-chip.on')).includes('ANULADO'), `${width}: anulación cambia estado`);

    // Documentos: lista, error SAP, exportar
    await openMenu('Documentos Contables');
    check((await txt('#ccPbTitle')).includes('Documentos Contables'), `${width}: abre Documentos Contables`);
    await audit('docs_buscar');
    await p.click('button.err >> nth=0'); await W(); await audit('docs_error_sap');
    check((await txt('#facModal')).includes('Qué hacer'), `${width}: error SAP catalogado es legible`);
    await p.click('#facModal button:has-text("Cerrar")'); await W();
    await p.click('button.err >> nth=1'); await W(); check((await txt('#facModal')).includes('SOP-2026-'), `${width}: error no catalogado da referencia de soporte`); await audit('docs_error_sap2');
    await p.click('#facModal button:has-text("Cerrar")'); await W();
    await p.click('section.panel.active button:has-text("Exportar")'); await W(); await audit('docs_exportar');
    check((await txt('#facModal')).includes('Usuario emisor'), `${width}: Excel con tres columnas`);
    await p.click('#facModal button:has-text("Cerrar")'); await W();
    // Filtro documento asociado
    await p.fill('#fdAsoc', 'F005-00031010'); await p.dispatchEvent('#fdAsoc', 'change'); await W();
    check((await txt('#fdRoot')).includes('Resultados (1)'), `${width}: filtro Documento Asociado`);
    await p.click('section.panel.active button:has-text("Limpiar")'); await W();
    // Canje desde provisión
    await p.click('section.panel.active button:has-text("+ Nuevo")'); await W(); await p.click('#facModal input[type=radio] >> nth=1'); await W(); await audit('docs_nuevo_prov');
    await p.click('#facModal tbody input[type=checkbox] >> nth=0'); await p.click('#fnCreate'); await W();
    check((await txt('#fdRoot')).includes('Resultado del canje'), `${width}: canje genera documento y muestra resultado`);
    check(!(await txt('#fdRoot')).includes('>No<'), `${width}: canje conserva cálculo`);
    await audit('doc_canje');
    const coin = await p.$$eval('#fdRoot .fac-pill', e => e.map(x => x.textContent)); console.log('      pills', coin.join(' | '));
    check(coin.includes('Sí') && !coin.includes('No'), `${width}: subtotal provisión = documento`);
    // Connect: Borrador > Provisionar (Registro de documento con I-042) > Emitir
    await p.click('section.panel.active .cc-btn:has-text("Provisionar")'); await W(); await p.click('#facConfOk'); await W();
    await p.click('section.panel.active .cc-btn:has-text("Emitir")'); await W();
    check((await txt('#fdRoot')).includes('Recibido en SAP'), `${width}: envío separa Connect y SAP`);
    await p.click('#fdRoot .cc-btn:has-text("Vista previa PDF")'); await W(); await audit('doc_pdf');
    check((await txt('#facModal')).includes('NAVE'), `${width}: PDF con nave`);
    await p.click('#facModal button:has-text("Cerrar")'); await W();
    // Detracción: sin % precargado
    check((await p.inputValue('#fdDetPct')) === '', `${width}: detracción sin % precargado`);
    // Registro de documento
    await p.evaluate(() => { fdOpen(FD.list.find(d => d.status === 'Registro de documento').id); }); await W(); await audit('doc_registro');
    await p.click('section.panel.active .cc-btn:has-text("Emitir")'); await W();
    const hdr = await txt('#fdRoot .fac-head');
    check(/F005-/.test(hdr) && /RD-2026-/.test(hdr), `${width}: emitir asigna serie y conserva código interno`);
    // LC y extorno
    await p.evaluate(() => { fdOpen(FD.list.find(d => d.tipo === 'Liquidación de Cobranza').id); }); await W(); await audit('doc_lc');
    await p.click('#fdRoot .cc-btn:has-text("Vista previa PDF")'); await W(); await audit('doc_lc_pdf'); await p.click('#facModal button:has-text("Cerrar")'); await W();
    await p.click('section.panel.active .cc-btn:has-text("Extornar")'); await W(); await p.fill('#tfReasonTxt', 'Prueba'); await p.click('#tfReasonBtn'); await W();
    check((await txt('section.panel.active .cc-chip.on')).includes('Anulado'), `${width}: extorno anula sin PDF`);
    // Notas de crédito
    await p.click('.cc-back'); await W(); await p.click('.fac-tabs button:has-text("Notas de Crédito")'); await W(); await audit('nc_lista');
    await p.click('#fdRoot button:has-text("+ Nuevo")'); await W();
    await p.selectOption('#fcAssoc', 'F005-00031010'); await W(); await audit('nc_nueva');
    check((await txt('#fcSaldo')).includes('675.00'), `${width}: saldo disponible 700 - 25 = 675`);
    await p.fill('.fcTarifa', '999'); await p.dispatchEvent('.fcTarifa', 'change'); await W(); await p.click('#fcSave'); await W();
    check(await p.isVisible('#fcSave'), `${width}: no deja superar el saldo`);
    await p.fill('.fcTarifa', '50'); await p.dispatchEvent('.fcTarifa', 'change'); await W(); await p.click('#fcSave'); await W();
    check((await txt('#fdRoot')).includes('Saldo'), `${width}: etiqueta Saldo en la NC`); await audit('nc_detalle');
    await p.click('.cc-back'); await W(); await p.click('#fdRoot button:has-text("+ Nuevo")'); await W();
    await p.selectOption('#fcAssoc', 'F005-00031010'); await W(); await p.selectOption('#fcMov', 'Total con refacturación'); await W();
    const avail = await p.evaluate(() => fdSaldo(fdByNum('F005-00031010')));
    await p.evaluate(a => { FC.lines = [{ svc: 'SERVICIO DE PRACTICAJE', en: 'PILOTAGE SERVICE', date: '2026-09-05', tarifa: a, qty: 1, igv: true, remark: '' }]; }, avail);
    await p.click('#fcSave'); await W(); await audit('nc_reapertura');
    check((await txt('#facModal')).includes('reabrir'), `${width}: NC total consulta reapertura`);
    await p.click('#fcYes'); await W();
    const reopened = await p.evaluate(() => { const x = FP.list.find(q => q.code === 'PRV00000000073'); return x.status + '|' + x.reopen; });
    check(/^PROVISIONADO\|F002-/.test(reopened), `${width}: reabre la provisión asociada: ${reopened}`);
    // Cover
    await p.click('.cc-back'); await W(); await p.click('.fac-tabs button:has-text("Cover")'); await W(); await audit('cover_inicio');
    await p.selectOption('#fcvClient', 'ZIM INTEGRATED SHIPPING SERVICE LTD'); await W(); await p.click('#fcvView'); await W();
    await p.fill('#fcvOp', '778899'); await p.fill('#fcvBank', 'Banco de ejemplo'); await p.fill('#fcvAmt', '500'); await p.click('#fcvAddAdv'); await W();
    check((await txt('#fcvBal')).includes('500.00'), `${width}: adelanto entra al balance`);
    await audit('cover_lote');
    await p.click('#fcvGen'); await W();
    check(/Generar Cover - N/.test(await txt('#fdRoot')), `${width}: genera lote`);
    await p.click('#fcvPrev'); await W(); await audit('cover_preview');
    check(/F005-/.test(await txt('#facModal')), `${width}: cover muestra números e importes`);
    await p.click('#facModal button:has-text("Cerrar")'); await W();
    await p.click('#fcvCtl'); await W(); await audit('cover_control');
    check((await txt('#facModal')).includes('SUPERVISOR DE LIQUIDACIONES'), `${width}: Control de envío con responsables`);
    await p.click('#facModal button:has-text("Cerrar")'); await W();
    await p.click('#fcvCtlRev'); await W(); await p.fill('#tfReasonTxt', 'Prueba'); await p.click('#tfReasonBtn'); await W();
    check((await txt('#fdRoot')).includes('Anulado'), `${width}: anula Control de envío`);
    // PEN: consulta y propuesta visibles al hacer clic en la marca
    await p.click('#fdRoot .fac-pentag >> nth=0'); await W();
    const pop = await txt('#facPenBox');
    check(/Consulta/.test(pop) && /Propuesta a validar/.test(pop), `${width}: marca PEN muestra consulta y propuesta`);
    await p.click('#facPenBox button:has-text("Cerrar")'); await W();
    const mk = p.locator('#fdRoot [data-chg*="PEN-"]').nth(0); await mk.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await W(); const box = await mk.boundingBox();
    await p.mouse.click(box.x + box.width - 30, box.y - 5); await W();
    check(await p.isVisible('#facPenBox'), `${width}: etiqueta de bloque también abre la consulta`);
    await p.click('#facPenBox button:has-text("Cerrar")'); await W();
    const penBad = await p.evaluate(() => { const c = new Set(); const src = document.documentElement.outerHTML; (fac => { for (const m of fac.matchAll(/data-pen="(PEN-[A-Z0-9-]+)"/g)) c.add(m[1]); })(src); return [...c].filter(k => !FAC_PEN[k]); });
    check(penBad.length === 0, `${width}: toda marca PEN tiene texto ${penBad}`);
    // Burbuja guía: flujo completo y los 12 tickets, cada paso resuelve su elemento
    const gNames = await p.evaluate(() => FAC_GUIDES.map(g => g.t));
    TICKETS.forEach(k => check(gNames.some(n => n.startsWith(k + ' ')), `${width}: guía para ${k}`));
    check(gNames[0].startsWith('Flujo completo'), `${width}: guía del flujo completo`);
    const gBad = [];
    for (let i = 0; i < gNames.length; i++) {
      const n = await p.evaluate(i => { startGuide(i); return tour.steps.length; }, i);
      for (let s = 0; s < n; s++) {
        await W(340);
        const r = await p.evaluate(() => ({ el: !!tour.el, h: tour.steps[tour.i]?.h }));
        if (!r.el) gBad.push(`${gNames[i]} > ${r.h}`);
        if (SHOTS && i === 0) await p.screenshot({ path: path.join(SHOTS, `${width}_guia_${String(s + 1).padStart(2, '0')}.png`) });
        await p.evaluate(() => tourGo(1));
      }
      await W(60);
    }
    check(gBad.length === 0, `${width}: todos los pasos de guía resaltan su elemento ${JSON.stringify(gBad)}`);
    // Toggle de marcas y regreso a PDA / Dashboard
    await p.click('#fdRoot .chg-btn'); await W();
    check((await p.locator('#fdRoot .chg-tag:visible').count()) === 0, `${width}: toggle oculta marcas`);
    await p.click('#fdRoot .chg-btn'); await W();
    await p.click('[data-menu="Dashboard"]'); await W(300);
    check(await p.isVisible('#screenDashboard'), `${width}: Dashboard sigue abriendo`);
    await p.click('[data-menu="PDA"]'); await W(200);
    check(await p.isVisible('#ccDropdown.show'), `${width}: PDA sigue abriendo`);
    check(errs.length === 0, `${width}: sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);
    await p.close();
  }
  await b.close();
  check(badMarks.length === 0, `todas las marcas con ticket y HU ${JSON.stringify(badMarks.slice(0, 6))}`);
  check(badText.length === 0, `sin emojis ni raya ${JSON.stringify(badText)}`);
  TICKETS.forEach(k => check(seen.has(k), `ticket ${k} aparece en marcas`));
  console.log(fails.length ? `\nHAY FALLAS: ${fails.length}` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
