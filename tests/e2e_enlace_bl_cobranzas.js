// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_enlace_bl_cobranzas.js
// El BL de una liquidación en Cobranzas abre la ficha nueva de Documentación y "Volver" regresa a la orden de pago.
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; let ok = true;
  p.on('pageerror', e => errs.push(e.message)); const check = (c, m) => { if (!c) ok = false; console.log(c ? 'OK ' : 'FALLA', m); };
  await p.goto('file://' + HTML); await p.waitForTimeout(300);
  const n = await p.evaluate(() => { cbSeed(); const o = CB.orders.find(x => x.liqs && x.liqs.length); cbOpen(o.n); return o.n; });
  await p.waitForTimeout(200);
  const link = p.locator('#screenCobranzas .fac-link', { hasText: /^[A-Z]{4}/ }).first(); const bl = (await link.textContent()).trim();
  await link.click(); await p.waitForTimeout(300);
  const act = await p.evaluate(() => document.querySelector('section.panel.active, .screen.active')?.id || '');
  check(/DocImp|DocExp|Ed/i.test(act), `abre la ficha del BL ${bl} en Documentación (${act})`);
  await p.evaluate(() => docVolver()); await p.waitForTimeout(300);
  const back = await p.evaluate(() => [document.querySelector('section.panel.active')?.id, CB.view, CB.sel]);
  check(back[0] === 'screenCobranzas' && back[1] === 'detail' && back[2] === n, `Volver regresa a la orden ${n} (${back.join(', ')})`);
  check(errs.length === 0, `sin errores JS ${JSON.stringify(errs.slice(0, 2))}`);
  console.log(ok ? 'TODO OK' : 'HAY FALLAS'); await b.close(); process.exit(ok ? 0 : 1);
})();
