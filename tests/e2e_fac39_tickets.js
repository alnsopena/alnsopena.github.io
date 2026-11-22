// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_fac39_tickets.js
// Tickets Reportado I-077, I-168 (HU-FAC-09), I-101 (HU-ATC-13), I-117 (HU-TI-02) e I-175 como propuestas marcadas.
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
const fails = []; const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'FALLA ') + msg); if (!ok) fails.push(msg); };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = [];
  p.on('pageerror', e => { if (!/^(start|onHasParentDirectory|addRow) is not defined/.test(e.message)) errs.push(e.message); });
  await p.goto('file://' + HTML); await p.waitForTimeout(300);
  const W = ms => p.waitForTimeout(ms || 150); const txt = s => p.textContent(s);
  const menu = async (g, o) => { await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await p.click(`#ccMenu [data-menu="${g}"]`); await W(); const dd = await p.$(`#ccDropdown button:has-text("${o}")`); if (dd && await dd.isVisible()) { await dd.click(); await W(); } };
  const prop = s => p.$eval(s, e => e.getAttribute('data-prop') || '');
  const ger = await p.$eval('#currentUser', s => [...s.options].find(o => /Gerencia/.test(o.text)).value);
  await p.selectOption('#currentUser', ger); await W();

  // I-168 e I-077: tarifa especial aplicada al BL
  await menu('Tarifa', 'Tarifa');
  await p.evaluate(() => selectTariff(TARIFFS.find(t => /TARIFA ESPECIAL/.test(t.ref)).id)); await W();
  check(await p.isVisible('#tfEspecial'), 'I-168: bloque Aplicación al BL en la tarifa especial');
  const pe = await prop('#tfEspecial');
  check(/HU-FAC-09/.test(pe) && /I-168/.test(pe) && /I-077/.test(pe), 'I-168 e I-077: marca HU-FAC-09 con ambos tickets');
  check((await p.inputValue('#tfEvalRes')).includes('vigente') && (await txt('#tfEspecial')).includes('USD 65.00') && (await txt('#tfEspecial')).includes('Exoneración'), 'I-168: vigente aplica descuento USD 20 y exoneración');
  await p.fill('#tfEvalF', '2027-01-15'); await p.dispatchEvent('#tfEvalF', 'change'); await W();
  check((await p.inputValue('#tfEvalRes')).includes('vencida') && (await txt('#tfEspecial')).includes('USD 110.00') && (await txt('#tfEspecial')).includes('sin bloquear la facturación'), 'I-168: vencida usa la estándar sin bloquear');
  await p.fill('#tfEvalF', '2026-11-22'); await p.dispatchEvent('#tfEvalF', 'change'); await W();
  await p.evaluate(() => CC.alternarPropuestas(false)); await W();
  check(!(await p.isVisible('#tfEspecial')), 'I-168: oculto con Ver propuestas apagado');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W();

  // I-101: vigencias superpuestas y tramos
  await p.evaluate(() => selectTariff(TARIFFS.find(t => /CAMPAÑA/.test(t.ref)).id)); await W();
  check(await p.isVisible('#tfCruce') && /HU-ATC-13 · I-101/.test(await prop('#tfCruce')), 'I-101: aviso de vigencia cruzada marcado HU-ATC-13 · I-101');
  check(!(await p.$('#tfEditor .tf-repl')), 'I-101: sin reemplazo automático en sobreestadía');
  await p.click('#tfEditor button:has-text("Aprobar")'); await W();
  check((await txt('#toast')).includes('No se puede aprobar') && await p.evaluate(() => TARIFFS.find(t => t.id === tf.selId).status) === 'Pendiente', 'I-101: al aprobar se rechaza el traslape de vigencias');
  await p.evaluate(() => { tf.tab = 'svc'; agTfLineDlg(0); }); await W();
  check(await p.isVisible('#ldHueco') && (await txt('#ldHueco')).includes('los días 6 y 7'), 'I-101: hueco entre tramos se advierte');
  await p.evaluate(() => agTfRngSet(1, 'ini', '5')); await W();
  check((await txt('#ldRngErr')).includes('se cruzan'), 'I-101: cruce de tramos se rechaza');
  await p.evaluate(() => agTfLineOk()); await W();
  check((await txt('#toast')).includes('se cruzan') && await p.evaluate(() => TARIFFS.find(t => t.id === tf.selId).lines[0].ranges[1].ini) === 8, 'I-101: no graba tramos cruzados');
  await p.evaluate(() => { agTfRngSet(1, 'ini', '6'); }); await W();
  check(!(await p.$('#ldHueco')) && !(await p.$('#ldRngErr')), 'I-101: tramos seguidos (1 a 5, 6 a 14) son válidos');
  await p.evaluate(() => CC.cerrarModal()); await W();
  await p.evaluate(() => CC.alternarPropuestas(false)); await W();
  check(!(await p.isVisible('#tfCruce')), 'I-101: oculto con Ver propuestas apagado');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W();

  // I-117: NC a SAP por CreditNotes
  await menu('Liquidación', 'Documentos Contables');
  await p.evaluate(() => { const inv = fcInvs()[0]; FC.assoc = inv.num; FC.lines = []; fcCommit(inv, 'No'); }); await W();
  check(await p.isVisible('#fdNcSap') && /HU-TI-02 · I-117/.test(await prop('#fdNcSap')), 'I-117: bloque Envío a SAP marcado HU-TI-02 · I-117');
  check((await txt('#fdNcSap')).includes('CreditNotes') && (await p.inputValue('#fdNcSap .fac-g4 .fac-f:nth-child(3) input')) === 'Pendiente de envío', 'I-117: NC en Borrador pendiente de envío');
  await p.click('#fdRoot button:has-text("Enviar a SAP")'); await W(); await p.click('#facConfOk'); await W();
  check((await txt('#toast')).includes('CreditNotes') && /^CN-\d+$/.test(await p.inputValue('#fdNcSap .fac-g4 .fac-f:nth-child(4) input')), 'I-117: enviada por CreditNotes con código ERP');
  check(await p.evaluate(() => fdById(FD.sel).hist.some(h => /CreditNotes/.test(h.comment))), 'I-117: historial registra el método CreditNotes');

  // I-175: marca Por definir en Provisiones
  await menu('Liquidación', 'Provisiones');
  check(await p.isVisible('#fpI175') && (await txt('#fpI175')).includes('Por definir') && /I-175/.test(await prop('#fpI175')), 'I-175: marca Por definir en Provisiones');
  await p.evaluate(() => CC.alternarPropuestas(false)); await W();
  check(!(await p.isVisible('#fpI175')), 'I-175: oculto con Ver propuestas apagado');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W();

  check(errs.length === 0, 'sin errores JS ' + JSON.stringify(errs));
  await b.close();
  console.log(fails.length ? `\n${fails.length} FALLA(S)` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})();
