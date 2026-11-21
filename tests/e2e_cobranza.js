// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_cobranza.js [carpeta de capturas]
// Recorre Validación de pagos, Medios de pago, Reportes y los espejos de Data Maestra y Documentación. Revisa marcas, los 6 tickets, PEN, guías, errores JS y ancho a 1366 y 1920 px.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TICKETS = ['I-158', 'I-177', 'I-178', 'I-180', 'I-181', 'I-164'];
const fails = []; const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'FALLA ') + msg); if (!ok) fails.push(msg); };
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

(async () => {
  const b = await chromium.launch(); const seen = new Set(); let badMarks = [], badText = [];
  for (const width of [1366, 1920]) {
    const p = await b.newPage({ viewport: { width, height: 900 } }); const errs = [];
    p.on('pageerror', e => { if (!/^(start|onHasParentDirectory|addRow) is not defined/.test(e.message)) errs.push(e.message); });
    await p.goto('file://' + HTML); await p.waitForTimeout(300);
    const W = ms => p.waitForTimeout(ms || 120);
    const txt = s => p.textContent(s);
    const audit = async name => {
      const r = await p.evaluate(() => {
        const zones = [...document.querySelectorAll('section.panel.active.fac-zone, .modal-bg.show .fac-zone')];
        const marks = zones.flatMap(z => [...z.querySelectorAll('.chg-tag, [data-chg]')]);
        return { txt: marks.map(m => m.getAttribute('data-chg') || m.textContent), box: zones.map(z => z.innerText).join('\n'), over: document.documentElement.scrollWidth > window.innerWidth + 1 };
      });
      r.txt.forEach(t => {
        if (!/(HU-[A-Z]+-\d+|Sin HU, bitácora Monday)/.test(t) || !/I-\d{3}/.test(t)) badMarks.push(name + ': ' + t);
        if (/No bloqueante/.test(t)) badMarks.push('Go Live ' + name + ': ' + t);
        TICKETS.forEach(k => { if (t.includes(k)) seen.add(k); });
      });
      if (/—/.test(r.box) || EMOJI.test(r.box)) badText.push(name);
      if (r.over) check(false, `${width}px sin scroll horizontal de página en ${name}`);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${width}_${name}.png`), fullPage: true });
    };
    const openMenu = async item => { await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await W(200); await p.click('[data-menu="Cobranzas"]'); await W(); await p.click(`#ccDropdown button:has-text("${item}")`); await W(); };
    const closeFac = async () => { await p.click('#facModal .fac-btns button:has-text("Cerrar"), #facModal .fac-btns button:has-text("Cancelar")'); await W(); };

    // Menú y listado
    await p.click('[data-menu="Cobranzas"]'); await W();
    const items = await p.$$eval('#ccDropdown button', x => x.map(e => e.textContent.trim()));
    check(items.join('|') === 'Validación de pagos|Medios de pago|Reportes', `${width}: menú Cobranzas con tres opciones`);
    check((await txt('[data-menu="Cobranzas"]')).trim() === 'Cobranzas', `${width}: menú dice Cobranzas`);
    await p.click('#ccDropdown button:has-text("Validación de pagos")'); await W();
    check(await p.isVisible('#screenCobranzas'), `${width}: abre sin elegir Marítimo o Terrestre`);
    check((await txt('#ccPbTitle')).includes('Validación de Órdenes de Pagos'), `${width}: título de Connect`);
    check(await p.$eval('#cbEst', e => e.value) === 'Pendiente de validación', `${width}: Estado llega en Pendiente de validación`);
    await audit('val_lista');
    const est = await p.$$eval('#cbEst option', o => o.map(x => x.value).filter(Boolean));
    check(!est.includes('Facturado') && est.length === 5, `${width}: Estado igual a cert, sin Facturado`);
    const conds = await p.evaluate(() => [...new Set(CB.orders.map(o => o.cond))]);
    check(conds.includes('CONTADO DOC') && conds.includes('CONTADO I'), `${width}: condiciones nuevas`);
    await p.click('section.panel.active button:has-text("Exportar")'); await W(); await audit('val_exportar');
    check((await txt('#facModal')).includes('Estado del Documento'), `${width}: Exportar con estados`); await closeFac();
    await p.click('#cbAvisos button:has-text("Ver aviso") >> nth=0'); await W(); await audit('val_aviso_constancia');
    check((await txt('#cbAvisoBody')).includes('versión 2'), `${width}: aviso marca nueva versión`); await closeFac();
    await p.click('#cbAvisos button:has-text("Ver aviso") >> nth=2'); await W(); await audit('val_aviso_saldo');
    check(/A devolver/.test(await txt('#cbAvisoBody')), `${width}: aviso de saldo con tipo`); await closeFac();
    await p.click('#cbNuevo'); await W(); await audit('val_nuevo_pago');
    check((await txt('#facModal')).includes('Saldo pendiente'), `${width}: Nuevo Pago con saldo`);
    await p.click('#facModal tbody input[type=checkbox] >> nth=0'); await p.click('#facModal button:has-text("Pagar")'); await W();
    const npBanks = await p.$$eval('#npBanco option', o => o.map(x => x.textContent).filter(x => !x.startsWith('Elegir')));
    check(npBanks.length === 3, `${width}: Nuevo Pago lista los bancos de Cosmos: ${npBanks.join(', ')}`); await audit('val_nuevo_form');
    await p.click('#facModal button:has-text("Cancelar")'); await W();

    // CONTADO DOC: ejemplo obligatorio USD 300 = 100 + 200
    await p.evaluate(() => cbOpen('PO-00302')); await W(); await audit('det_contado_doc');
    check(/300\.00/.test(await txt('#cbEjemplo')) && /100\.00/.test(await txt('#cbEjemplo')) && /200\.00/.test(await txt('#cbEjemplo')), `${width}: ejemplo USD 300 = 100 + 200`);
    check((await txt('#cbSaldoVal')).includes('200.00'), `${width}: saldo 200 antes de conciliar`);
    check(await p.evaluate(() => cbOrder('PO-00302').est) === 'Pendiente de validación', `${width}: no se cancela con USD 100`);
    await p.click('#cbTrans tbody tr:nth-child(2) .cb-det'); await W(); await audit('op_detalle');
    const banks = await p.$$eval('#cbBancoO option', o => o.map(x => x.textContent).filter(x => !x.startsWith('Elegir')));
    check(banks.length === 17 && banks.includes('Banco de la Nacion') && banks.includes('Citibank del Perú'), `${width}: banco de origen con el catálogo de Data Maestra`);
    const rcv = await p.$$eval('#cbBancoR option', o => o.map(x => x.textContent).filter(x => !x.startsWith('Elegir')));
    check(rcv.length === 3 && rcv.includes('BBVA Perú'), `${width}: banco receptor con cuentas de Organización`);
    const res = await p.$$eval('#cbResult option', o => o.map(x => x.textContent));
    check(res.join('|') === 'Pendiente de revisión|Aprobado|Aprobado con observaciones|Rechazado', `${width}: cuatro resultados de cert`);
    check(await p.$eval('#cbMoneda', e => e.value) === 'USD', `${width}: USD por defecto`);
    // Reglas
    await p.fill('#cbConfNum', '000111301'); await p.dispatchEvent('#cbConfNum', 'change'); await W();
    await p.fill('#cbConfDate', '2026-10-22'); await p.dispatchEvent('#cbConfDate', 'change'); await W();
    await p.selectOption('#cbBancoO', 'Banco de Crédito del Perú'); await W(); await p.selectOption('#cbBancoR', 'BBVA Perú'); await W();
    await p.fill('#cbReg', '200'); await p.dispatchEvent('#cbReg', 'change'); await W();
    await p.selectOption('#cbResult', 'Rechazado'); await W(); await p.click('#cbConfirm'); await W();
    check(await p.isVisible('#cbConfirm'), `${width}: Rechazado exige motivo`);
    await p.selectOption('#cbResult', 'Aprobado'); await W();
    await p.selectOption('#cbMoneda', 'PEN'); await W(); await p.click('#cbConfirm'); await W();
    check(await p.isVisible('#cbConfirm'), `${width}: PEN exige aprobación de jefatura`); await audit('op_pen');
    await p.selectOption('#cbMoneda', 'USD'); await W();
    await p.click('#cbConfirm'); await W(); await p.click('#cbConfirmOk'); await W(); await audit('op_correo');
    check((await txt('#cbMailBody')).includes('PO-00302') && (await txt('#cbMailRes')).includes('Aprobado'), `${width}: correo con orden y resultado guardados`);
    await p.click('#cbMailSend'); await W();
    check(await p.evaluate(() => cbOrder('PO-00302').est) === 'Validada', `${width}: se cancela con USD 300 conciliados`);
    check((await txt('#cbSaldoVal')).includes('0.00'), `${width}: saldo cero`); await audit('det_cancelada');
    check(await p.evaluate(() => cbOrder('PO-00302').liqs[0].st) === 'Pago confirmado', `${width}: liquidación Pago confirmado`);
    check(await p.evaluate(() => CB.bls.find(b => b.n === 'ZIMUBOX0000012').pay) === 'Liquidación pagada', `${width}: BL pasa a Liquidación pagada`);
    await p.click('#cbTrans tbody tr:nth-child(2) button:has-text("Enviado")'); await W();
    check((await txt('#cbMailCtl')).includes('Enviado 1'), `${width}: control de reenvío`); await closeFac();

    // Aprobado con observaciones exige motivo
    await p.evaluate(() => cbOpOpen('PO-00301', 'a')); await W(); await p.selectOption('#cbResult', 'Aprobado con observaciones'); await W();
    await p.fill('#cbConfNum', 'x'); await p.dispatchEvent('#cbConfNum', 'change'); await W(); await p.fill('#cbConfDate', '2026-10-20'); await p.dispatchEvent('#cbConfDate', 'change'); await W();
    await p.selectOption('#cbBancoO', 'BBVA Perú'); await W(); await p.selectOption('#cbBancoR', 'BBVA Perú'); await W(); await p.fill('#cbReg', '236'); await p.dispatchEvent('#cbReg', 'change'); await W(); await p.click('#cbConfirm'); await W();
    check(await p.isVisible('#cbConfirm'), `${width}: Aprobado con observaciones exige motivo`);
    await p.click('#facModal button:has-text("Cancelar")'); await W();
    // CONTADO I
    await p.evaluate(() => cbOpen('PO-00303')); await W(); await audit('det_contado_i');
    check((await txt('#cbContadoI')).includes('por cobrar'), `${width}: nota CONTADO I`);
    // Crédito
    await p.evaluate(() => cbOpen('PO-00305')); await W(); await audit('det_credito');
    check((await txt('#cbCred')).includes('Por definir'), `${width}: crédito Por definir`);
    // Reverso
    await p.evaluate(() => cbOpen('PO-00307')); await W(); await audit('det_validada');
    await p.click('#cbRevBtn'); await W(); await audit('reverso'); check(/SAP/.test(await txt('#cbRevFx')), `${width}: reverso muestra efectos`);
    await p.click('#cbRevGo'); await W(); await p.click('#tfReasonBtn'); await W();
    check(await p.isVisible('#tfReasonModal'), `${width}: reverso exige motivo`);
    await p.fill('#tfReasonTxt', 'Prueba'); await p.click('#tfReasonBtn'); await W();
    const rev = await p.evaluate(() => { const o = cbOrder('PO-00307'); return [o.ops[0].st, o.est, cbSaldo(o) > 0, !!o.hist.find(h => h.next === 'Revertido')].join('|'); });
    check(rev === 'Revertido|Pendiente de validación|true|true', `${width}: reverso cambia estado y deja traza: ${rev}`);
    await p.click('section.panel.active button:has-text("Historial")'); await W(); check((await txt('#histBody')).includes('Revertido'), `${width}: historial con reverso`);
    await p.click('#historyModal button:has-text("Cerrar")').catch(() => p.evaluate(() => closeModal('historyModal'))); await W();

    // Medios de pago
    await openMenu('Medios de pago');
    check((await txt('#ccPbTitle')).includes('Medios de pago'), `${width}: abre Medios de pago`); await audit('mp');
    const mpH = await txt('#cbRoot');
    check(mpH.includes('Documento Principal') && mpH.includes('Documentos Relacionados') && mpH.includes('Fec. Deposito') && mpH.includes('En Factura'), `${width}: estructura de Blue Ship`);
    check((await p.locator('#screenCobranzas button:has-text("Guardar")').count()) === 0, `${width}: Medios de pago solo consulta`);
    check((await txt('#cbMpAqui')).includes('3,000.00') && (await txt('#cbMpSaldo')).includes('776.00'), `${width}: aplicado y saldo con parcial y revertido`);
    const before = await p.evaluate(() => JSON.stringify(CB.abonos));
    await p.click('#cbMpPag .cb-dist >> nth=0'); await W(); await audit('mp_distribuido');
    check((await txt('#cbDistSum')).includes('2,000.00') || (await txt('#cbDistSum')).includes('2,826.00'), `${width}: abono distribuido suma sin duplicar`);
    check((await txt('#cbDistTbl')).includes('MAERSK') && (await txt('#cbDistTbl')).includes('ZIM'), `${width}: distribuido entre dos socios`); await closeFac();
    check(before === await p.evaluate(() => JSON.stringify(CB.abonos)), `${width}: consulta no cambia aplicaciones`);
    await p.fill('#cbMpNum', '00031014'); await p.dispatchEvent('#cbMpNum', 'change'); await W(); await p.click('#cbMpBuscar'); await W();
    check((await p.evaluate(() => CB.mp.doc)) === 'F005-00031014' && (await p.isVisible('#cbMpDoc')), `${width}: busca por documento`);
    await p.evaluate(() => cbMpOpen('LC51-00000009')); await W(); check((await txt('#cbMpPag')).includes('Único'), `${width}: abono único`);

    // Reportes
    await openMenu('Reportes');
    for (const [k, name, must] of [['bl', 'BL/VB', 'Monto USD'], ['prov', 'Provisiones', 'Provisión Documento'], ['epay', 'Recaudación', 'Responsable Pago'], ['det', 'Facturas', '% Detracción'], ['dia', 'Reporte diario', 'Validado por']]) {
      await p.click(`#cbRepTabs button:has-text("${name}")`); await W(); await audit('rep_' + k);
      check((await txt('#cbRepTbl')).includes(must), `${width}: ${name} con ${must}`);
    }
    await p.click('#cbRepTabs button:has-text("BL/VB")'); await W();
    const allL = await p.$$eval('#cbRepTbl tbody tr', r => r.map(x => x.innerText).join(' '));
    check(/ZIM/.test(allL) && /DMFP/.test(allL), `${width}: BL con ZIM y DMFP`);
    await p.selectOption('#cbRepLinea', 'DMFP'); await W();
    const onlyD = await p.$$eval('#cbRepTbl tbody tr td:nth-child(21)', r => r.map(x => x.innerText)); check(onlyD.every(x => x === 'DMFP'), `${width}: filtro por línea`);
    await p.click('#cbRepTabs button:has-text("Facturas")'); await W();
    check((await txt('#cbRepTbl')).includes('Por definir'), `${width}: % de detracción sin regla`);
    await p.click('#cbRepTabs button:has-text("Reporte diario")'); await W();
    check(/Abonos únicos/.test(await txt('#cbDiaUniq')), `${width}: reporte diario no duplica abonos`);

    // Excepción en Documentos Contables
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await W(200); await p.click('[data-menu="Liquidación"]'); await W(); await p.click('#ccDropdown button:has-text("Documentos Contables")'); await W();
    await p.click('section.panel.active button:has-text("Notificar Devolución") >> nth=0'); await W(); await audit('notificar');
    const ndBox = await txt('#facModal'); check(ndBox.includes('Vista previa del aviso automático') && ndBox.includes('Motivo'), `${width}: Notificar Devolución abre modal con vista previa`);
    await p.click('#ndSend'); await W(); check(await p.isVisible('#ndSend'), `${width}: Notificar Devolución exige saldo y motivo`);
    await p.selectOption('#ndDoc', 'F005-00031012'); await W(); check((await p.inputValue('#ndCli')).length > 0, `${width}: toma datos del documento`);
    await p.fill('#ndSaldo', '50'); await p.dispatchEvent('#ndSaldo', 'change'); await W(); await p.fill('#ndMot', 'Prueba de devolución'); await p.dispatchEvent('#ndMot', 'change'); await W(); await p.click('#ndSend'); await W();
    check(await p.evaluate(() => CB.avisos[0].tipo === 'Saldo' && CB.avisos[0].monto === 50), `${width}: aviso llega a Cobranzas`);

    // Espejos
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await W(200); await p.click('[data-menu="Documentación"]'); await W(); await p.click('#ccDropdown .cc-dd-sub:has-text("Importación") button:has-text("Documentos")'); await W();
    check((await txt('#ccPbTitle')).includes('Documentación de Importación'), `${width}: espejo de Documentación`); await audit('doc_bl');
    const pays = await p.$$eval('#docIPay option', o => o.map(x => x.textContent).filter(x => !x.startsWith('Elegir')));
    check(pays.join('|') === 'Listo para facturar|Liquidación pendiente|Liquidación pagada|Liquidación crédito', `${width}: Estado Pago igual a cert`);
    await p.evaluate(() => { cbOpen('PO-00301'); }); await W(); await p.click('#cbLiqs button.fac-link'); await W();
    check(await p.evaluate(() => document.querySelector('section.panel.active')?.id === 'screenDocImpBl' && document.body.innerText.includes('ZIMUBOX0000011')), `${width}: BL enlaza desde la liquidación a la ficha nueva`);
    await p.evaluate(() => docVolver()); await W(); check(await p.evaluate(() => CB.view === 'detail' && CB.sel === 'PO-00301'), `${width}: Volver regresa a la orden de pago`);
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await W(200); await p.click('[data-menu="Data Maestra"]'); await W(); await p.click('#ccDropdown button:has-text("Organización")'); await W();
    await p.fill('#orNombre', 'COSMOS'); await p.click('#orFBuscar'); await W(); await p.click('#orRes button.fac-link >> nth=0'); await W(); await p.click('#orTabs .fac-tabs button:has-text("Información Financiera")'); await W();
    const org = await txt('#orgFin'); check(org.includes('Scotiabank Perú') && org.includes('Código ERP') && org.includes('SWIFT'), `${width}: espejo de Información Financiera`); await audit('org_fin');
    await p.evaluate(() => { const s = cbSocioFind('MAERSK LINE A/S'); openPartner(s.id, 'landing'); setPtTab('bancos'); }); await W();
    const soc = await p.evaluate(() => document.querySelector('#screenPartners').innerText); check(soc.includes('Interbank'), `${width}: Socio con cuenta coherente`);
    await p.evaluate(() => cbOpen('PO-00301')); await W();

    // PEN
    await p.click('#cbRoot .fac-pentag >> nth=0'); await W(); const pop = await txt('#facPenBox');
    check(/Consulta/.test(pop) && /Propuesta a validar/.test(pop) && /Bloqueante/.test(pop), `${width}: marca PEN muestra consulta y propuesta`);
    await p.click('#facPenBox button:has-text("Cerrar")'); await W();
    const mk = p.locator('#cbRoot [data-chg*="PEN-"]').nth(0); await mk.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await W(); const box = await mk.boundingBox();
    await p.mouse.click(box.x + box.width - 30, box.y - 5); await W();
    check(await p.isVisible('#facPenBox'), `${width}: etiqueta de bloque también abre la consulta`);
    await p.click('#facPenBox button:has-text("Cerrar")'); await W();
    const penScan = await p.evaluate(() => { const fn = [cbListHtml, cbAvisosHtml, cbExport, cbAvisoOpen, cbCondHtml, cbDetailHtml, cbOpRender, cbMail, cbRevOpen, cbMpHtml, cbMpDist, cbRepMark, cbRepHtml, cbNdRender].map(f => f.toString()).join(' '); const c = [...new Set(fn.match(/PEN-[A-Z0-9-]+\d/g))]; return { c, bad: c.filter(k => !FAC_PEN[k] || !FAC_PEN[k].q || !FAC_PEN[k].p || !FAC_PEN[k].w), names: Object.values(FAC_PEN).filter(x => /Jenny|Claudia|Wendy|Italo/i.test(x.w + x.q + x.p)).length }; });
    check(penScan.bad.length === 0, `${width}: cada PEN dibujado tiene texto (${penScan.c.length}) ${penScan.bad}`);
    check(penScan.names === 0, `${width}: PEN sin nombres de personas`);
    check(!penScan.c.includes('PEN-I158-05'), `${width}: D2, PEN-I158-05 no se dibuja`);
    check(await p.evaluate(() => ['I-158','I-177','I-178','I-180','I-181','I-164'].every(t => !facIsNb(t))), `${width}: los 6 son bloqueantes`);

    // Guías
    const gNames = await p.evaluate(() => CB_GUIDES.map(g => g.t));
    TICKETS.forEach(k => check(gNames.some(n => n.startsWith(k + ' ')), `${width}: guía para ${k}`));
    check(gNames[0] === 'Flujo completo de Cobranza', `${width}: guía del flujo completo`);
    const snap = await p.evaluate(() => JSON.stringify(CB.orders) + JSON.stringify(CB.abonos));
    const gBad = [];
    for (let i = 0; i < gNames.length; i++) {
      const n = await p.evaluate(i => { cgVal(); startGuide(i); return tour.steps.length; }, i);
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
    check(snap === await p.evaluate(() => JSON.stringify(CB.orders) + JSON.stringify(CB.abonos)), `${width}: las guías no cambian datos`);

    // Toggle y regreso
    await p.evaluate(() => cgVal()); await W();
    await p.click('#cbRoot .chg-btn'); await W(); check((await p.locator('#cbRoot .chg-tag:visible').count()) === 0, `${width}: toggle oculta marcas`);
    await p.click('#cbRoot .chg-btn'); await W();
    await p.click('[data-menu="Dashboard"]'); await W(300); check(await p.isVisible('#screenDashboard'), `${width}: Dashboard sigue abriendo`);
    await p.reload(); await W(300);
    await openMenu('Validación de pagos'); await p.click('[data-menu="PDA"]'); await W(200); check(await p.isVisible('#ccDropdown.show'), `${width}: PDA sigue abriendo desde Cobranzas`);
    check(errs.length === 0, `${width}: sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);
    await p.close();
  }
  await b.close();
  check(badMarks.length === 0, `todas las marcas con ticket y HU ${JSON.stringify(badMarks.slice(0, 6))}`);
  check(badText.length === 0, `sin emojis ni raya ${JSON.stringify(badText)}`);
  TICKETS.forEach(k => check(seen.has(k), `ticket ${k} aparece en marcas`));
  console.log(fails.length ? `\nHAY FALLAS: ${fails.length}` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
