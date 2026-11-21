// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_liquidacion_v37.js
// Liquidación, Series y Cobranzas en v37: Connect tal cual con "Ver propuestas" apagado y prototipos marcados al encenderlo.
// Copia para Mockup/tests: requiere playwright instalado en Mockup/node_modules.
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
const fails = []; const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'FALLA ') + msg); if (!ok) fails.push(msg); };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = [];
  p.on('pageerror', e => { if (!/^(start|onHasParentDirectory|addRow) is not defined/.test(e.message)) errs.push(e.message); });
  await p.goto('file://' + HTML); await p.waitForTimeout(300);
  const W = ms => p.waitForTimeout(ms || 150); const txt = s => p.textContent(s);
  const menu = async (g, o) => { await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await p.click(`#ccMenu [data-menu="${g}"]`); await W(); await p.click(`#ccDropdown button:has-text("${o}")`); await W(); };

  // Series (Data Maestra)
  await menu('Data Maestra', 'Series');
  check((await txt('#ccPbTitle')).includes('Búsqueda de Series'), 'Series: título');
  check((await txt('#lqSerF')).includes('Buscar Serie') && (await txt('#lqSerF')).includes('Código ERP'), 'Series: filtros de Connect');
  check(/Resultados \(8\)/.test(await txt('#lqSerRes')) && (await txt('#lqSerRes')).includes('Items por página'), 'Series: resultados y paginador');
  await p.selectOption('#lqOrig', 'Provisión'); await p.click('#lqSerF button:has-text("Buscar")'); await W();
  check(/Resultados \(1\)/.test(await txt('#lqSerRes')), 'Series: filtra por origen');
  await p.click('#lqSerF button:has-text("Limpiar")'); await W();
  await p.click('#lqSerNuevo'); await W();
  check((await txt('#ccPbTitle')).includes('Nueva Serie'), 'Series: Nueva Serie');
  await p.selectOption('#lqfSuc', 'Paita'); await p.selectOption('#lqfOrig', 'Provisión'); await W();
  check((await txt('#lqSerFicha')).includes('Tipo de Documento de Provisión'), 'Series: origen Provisión pide tipo de provisión');
  await p.selectOption('#lqfTipo', 'Aviso'); await p.fill('#lqfCod', 'PR1'); await p.dispatchEvent('#lqfCod', 'change'); await p.fill('#lqfErp', 'SAP-PR1'); await p.dispatchEvent('#lqfErp', 'change');
  await p.click('#lqSerGuardar'); await W();
  check(await p.isVisible('#lqSerGuardar'), 'Series: código de 3 caracteres no se guarda');
  await p.fill('#lqfCod', 'PRV2'); await p.dispatchEvent('#lqfCod', 'change'); await p.click('#lqSerGuardar'); await W();
  check((await txt('#ccPbTitle')).includes('Ver Serie') && await p.isVisible('#lqSerEditar'), 'Series: crea y queda en Ver Serie');
  await p.click('#lqSerEliminar'); await W(); await p.click('#lqSerEliminarOk'); await W();
  check(/Resultados \(8\)/.test(await txt('#lqSerRes')), 'Series: elimina');

  // Con propuestas encendidas: prototipos visibles
  await menu('Liquidación', 'Documentos Contables');
  check(await p.isVisible('#fdRoot .fac-tabs'), 'Docs: pestañas Cover y NC visibles como propuesta');
  check((await p.locator('#fdRoot button:has-text("Notificar Devolución")').count()) === 1, 'Docs: Notificar Devolución sin duplicar');
  await p.click('#fdRoot button:has-text("+ Nuevo")'); await W(); await p.click('#fnCreate'); await W();
  check((await txt('#ccPbTitle')).includes('Crear Documento Contable'), 'Docs: En blanco abre Crear Documento Contable');
  await p.click('#fdCrear'); await W();
  check((await txt('#facModal')).includes('Seleccionar Serie'), 'Docs: varias series piden Seleccionar Serie');
  await p.selectOption('#fdSerieSel', 'F006'); await p.click('#fdSerieOk'); await W();
  check(/F006-/.test(await txt('#fdRoot .fac-head')), 'Docs: usa la serie elegida');

  // Apagar propuestas: Connect tal cual
  await p.evaluate(() => CC.alternarPropuestas(false)); await W();
  await menu('Liquidación', 'Provisiones');
  const est = await p.$$eval('#fpEst option', o => o.map(x => x.textContent));
  check(est.includes('CANJEADO') && est.includes('PENDIENTE') && !est.includes('LIQUIDADO'), 'Prov: estados de Connect sin propuestas');
  await menu('Liquidación', 'Documentos Contables');
  check(!(await p.isVisible('#fdRoot .fac-tabs')), 'Docs: pestañas propuestas ocultas');
  check(!(await p.isVisible('#fdAsoc')), 'Docs: filtro Documento Asociado oculto');
  const ests = await p.$$eval('#fdEst option', o => o.map(x => x.textContent));
  check(ests.includes('Provisionado') && !ests.includes('Registro de documento'), 'Docs: estado Provisionado de Connect');
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await p.click('#ccMenu [data-menu="Cobranzas"]'); await W();
  check(await p.isVisible('#screenCobranzas'), 'Cobranzas: sin propuestas abre directo Validación de pagos');
  check(!(await p.isVisible('#cbSaldoCol')) && !(await p.isVisible('#cbAvisos')), 'Cobranzas: Saldo pendiente y Avisos ocultos');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W();
  check(await p.isVisible('#cbAvisos'), 'Cobranzas: propuestas vuelven al encender');
  check(errs.length === 0, `sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);
  await b.close();
  console.log(fails.length ? `\nHAY FALLAS: ${fails.length}` : '\nTODO OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
