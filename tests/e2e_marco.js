// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_marco.js
// Marco v37: recorre todo el menú real (incluidas las opciones "En construcción"), alterna "Ver propuestas",
// prueba el registro de un módulo (_ejemplo.js) y abre portal.html. Falla si hay errores JS (pageerror).
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
const PORTAL = path.join(path.dirname(HTML), 'portal.html');
const EJEMPLO = path.join(path.dirname(HTML), 'modulos', '_ejemplo.js');
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
// En file:// el iframe del Dashboard muestra el listado de carpeta de Chrome, que lanza estos errores propios
const ruido = /^(start|onHasParentDirectory|addRow) is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!ruido.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept());
  const W = (ms = 150) => p.waitForTimeout(ms);
  const top = () => p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const txt = s => p.textContent(s).then(x => (x || '').trim());
  const activa = () => p.evaluate(() => document.querySelector('section.panel.active')?.id || '');
  await p.goto('file://' + HTML); await W(300);
  check(await p.evaluate(() => typeof CC === 'object' && CC.version === 'v37'), 'API window.CC cargada (v37)');
  check((await txt('header.top .sub')).includes('v37'), 'versión visible v37');
  const grupos = await p.$$eval('#ccMenu button[data-menu]', x => x.map(e => e.dataset.menu));
  check(grupos.join('|') === 'Dashboard|PDA|Agenciamiento|Tarifa|Documentación|Atención al cliente|Liquidación|Cobranzas|Data Maestra|Seguridad', 'menú con los 10 grupos en orden');

  // Recorre cada opción del menú
  const menu = await p.evaluate(() => CC.menu.map(g => ({ g: g.g, ops: g.ops.map((o, i) => ({ i, o: o.o, s: o.s || '' })) })));
  let total = 0, obra = 0;
  for (const g of menu) {
    for (const o of g.ops) {
      await top(); await W(100);
      await p.click(`#ccMenu [data-menu="${g.g}"]`); await W();
      const abierto = await p.isVisible('#ccDropdown.show');
      if (g.ops.length > 1) {
        check(abierto, `${g.g}: abre desplegable`);
        if (!abierto) continue;
        await p.click(`#ccDropdown button[data-cc-op="${o.i}"]`); await W(250);
      } else check(!abierto, `${g.g}: navega directo (una sola opción)`);
      total++;
      const id = await activa(), tit = await txt('#ccPbTitle');
      const on = await p.$eval('#ccMenu button.on', e => e.dataset.menu).catch(() => '');
      if (id === 'screenEnConstruccion') { obra++; check(tit === o.o && (await txt('#screenEnConstruccion')).includes('En construcción'), `${g.g} > ${o.s ? o.s + ' > ' : ''}${o.o}: En construcción con su título`); }
      else check(!!id, `${g.g} > ${o.s ? o.s + ' > ' : ''}${o.o}: abre ${id}`);
      check(on === g.g, `${g.g} > ${o.o}: menú marca ${g.g} (marca ${on})`);
    }
  }
  check(total >= 36, `al menos 36 opciones recorridas (${total}), ${obra} en construcción`);
  await top(); await p.click('#ccMenu [data-menu="Documentación"]'); await W();
  check((await p.$$eval('#ccDropdown .cc-dd-h', x => x.map(e => e.textContent))).join('|') === 'Importación|Exportación', 'Documentación con subgrupos Importación y Exportación');
  await p.click('#ccDropdown .cc-dd-sub:has-text("Importación") button:has-text("Documentos")'); await W(250);
  check((await txt('#ccPbTitle')).includes('Documentación de Importación'), 'Importación > Documentos abre la pantalla existente');

  // Interruptor "Ver propuestas"
  await p.evaluate(() => openCobranzas('val')); await W(250);
  const marcas = () => p.locator('.chg-tag:visible').count();
  const conMarcas = await marcas();
  check(await p.evaluate(() => document.getElementById('propToggle').classList.contains('on')), 'Ver propuestas encendido por defecto');
  await top(); await p.click('#propToggle'); await W(200);
  check(await marcas() === 0 && conMarcas > 0, `apagado oculta marcas fm() (${conMarcas} a 0)`);
  check(await p.evaluate(() => document.body.classList.contains('cc-sin-prop') && !CC.verPropuestas), 'apagado: clase cc-sin-prop');
  await p.click('#ccMenu [data-menu="Cobranzas"]'); await W(250);
  check(!(await p.isVisible('#ccDropdown.show')) && (await activa()) === 'screenCobranzas', 'apagado: Cobranzas queda con 1 opción y navega directo');
  await top(); await p.click('#propToggle'); await W(200);
  check(await marcas() > 0, 'encendido vuelve a mostrar marcas');
  await p.click('#ccMenu [data-menu="Cobranzas"]'); await W();
  check((await p.$$eval('#ccDropdown button', x => x.map(e => e.textContent.trim()))).join('|') === 'Validación de pagos|Medios de pago|Reportes', 'encendido: Cobranzas con propuestas');
  check(await p.$$eval('#ccDropdown button.cc-prop', x => x.length) === 2, 'Medios de pago y Reportes marcados como propuesta');
  await p.click('#ccDropdown button:has-text("Validación de pagos")'); await W(200);
  check(await p.evaluate(() => { try { localStorage.getItem('x'); } catch (e) { } return !Object.keys(localStorage).some(k => /prop/i.test(k)); }), 'interruptor sin localStorage');

  // Registro de un módulo (ejemplo)
  await p.addScriptTag({ path: EJEMPLO }); await W(100);
  await top(); await p.click('#ccMenu [data-menu="Agenciamiento"]'); await W();
  check((await p.$$eval('#ccDropdown button', x => x.map(e => e.textContent.trim()))).includes('Ejemplo'), 'módulo de ejemplo aparece en su grupo');
  await p.click('#ccDropdown button:has-text("Ejemplo")'); await W(250);
  check((await activa()) === 'screenEjemplo' && (await txt('#ccPbTitle')) === 'Consulta de Ejemplo', 'módulo de ejemplo abre con su título');
  check((await txt('#ejRes')).includes('Items por página') && (await txt('#ejRes')).includes('Resultados ('), 'módulo de ejemplo usa tabla con Items por página');
  check(await p.$eval('#ccMenu button.on', e => e.dataset.menu) === 'Agenciamiento', 'módulo de ejemplo marca su grupo');
  check(await p.evaluate(() => Array.isArray(GUIDES.screenEjemplo) && PAGEBAR.screenEjemplo[0] === 'Consulta de Ejemplo'), 'módulo enganchado a GUIDES y PAGEBAR');
  await p.click('#ejRes button:has-text("Anular")'); await W(); check(await p.isVisible('#tfReasonModal.show'), 'helper de motivo abre el modal');
  await p.fill('#tfReasonTxt', 'Prueba'); await p.click('#tfReasonBtn'); await W();
  await top(); await p.click('#propToggle'); await W(200);
  check((await activa()) !== 'screenEjemplo', 'apagar propuestas saca de una pantalla propuesta');
  await p.click('#propToggle'); await W(100);

  // Datos compartidos
  const dat = await p.evaluate(() => { const d = CC.datos; return { n: d.naves.length, s: d.socios.clientes.length + d.socios.embarcadores.length + d.socios.consignatarios.length + d.socios.proveedores.length, v: d.viajes.length, pu: d.puertos.length, l: d.lineas.length, bi: d.blImportacion.length, be: d.blExportacion.length, c: d.contenedores.length, u: d.usuarios.length, ruc: [...Object.values(d.socios).flat()].every(x => /^206100\d{5}$/.test(x.ruc)), mail: d.usuarios.every(u => /\.example$/.test(u.correo)) }; });
  check(Object.entries(dat).every(([k, v]) => v === true || v > 0), `CC.datos completo ${JSON.stringify(dat)}`);

  // Dashboard y PDA siguen igual
  await top(); await p.click('[data-menu="Dashboard"]'); await W(300); check(await p.isVisible('#screenDashboard'), 'Dashboard sigue abriendo');
  await p.click('[data-menu="PDA"]'); await W(200); check(await p.isVisible('#ccDropdown.show'), 'PDA abre desplegable (PDA, PDA Plantilla)');
  check(errs.length === 0, `index sin errores JS ${JSON.stringify(errs.slice(0, 3))}`);

  // Portal externo
  const q = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs2 = [];
  q.on('pageerror', e => errs2.push(e.message));
  await q.goto('file://' + PORTAL); await q.waitForTimeout(300);
  // El portal externo tiene su propia prueba (tests/e2e_portal_externo.js): aquí solo se valida que carga sin errores.
  check(await q.evaluate(() => typeof CC === 'object'), 'portal externo carga la API');
  check(await q.evaluate(() => !!document.querySelector('.cc-portal-link[href="index.html"]')), 'portal: enlace al portal interno');
  check(await p.evaluate(() => !!document.querySelector('.cc-portal-link[href="portal.html"]')), 'index: enlace al portal externo');
  check(errs2.length === 0, `portal sin errores JS ${JSON.stringify(errs2.slice(0, 3))}`);
  await b.close();
  console.log(fails ? `\nHAY FALLAS (${fails})` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})();
