// Uso: MOCKUP_HTML=<ruta a index.html> PORTAL_HTML=<ruta a portal.html> node tests/e2e_buscador_tickets.js [carpeta de capturas]
// Buscador de tickets de la cabecera: lista de resultados, teclado, "/" , I-014 en Pre-registro y Provisiones,
// ticket en pestaña, ticket en modal, ticket del portal externo, "I-999" sin resultados, que TODAS las entradas
// del índice lleguen a su marca, que nada se encime en 1366 y 1920, y cero errores JS (pageerror).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const HTML = process.env.MOCKUP_HTML || [path.resolve(__dirname, '../pda-mockup/index.html'), path.resolve(__dirname, '../repo/pda-mockup/index.html')].find(f => fs.existsSync(f));
const PORTAL = process.env.PORTAL_HTML || path.join(path.dirname(HTML), 'portal.html');
const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const url = f => 'file:///' + f.replace(/\\/g, '/');
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
const ruido = /^(start|onHasParentDirectory|addRow) is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!ruido.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept());
  const W = (ms = 150) => p.waitForTimeout(ms);
  const activa = () => p.evaluate(() => document.querySelector('section.panel.active')?.id || '');
  const items = () => p.$$eval('#ccTkLista li', x => x.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  const escribir = async t => { await p.fill('#ccTkBuscar', ''); await p.type('#ccTkBuscar', t); await W(120); };
  const resaltada = tk => p.evaluate(tk => { for (const e of document.querySelectorAll('.cc-pulso')) { const r = e.getBoundingClientRect();
    const t = e.matches('.chg-tag,.chg-h') ? e.textContent : (e.getAttribute('data-prop') || e.getAttribute('data-chg') || e.getAttribute('title') || '');
    if (t.includes(tk) && r.bottom > 0 && r.top < innerHeight) return e.id || t.slice(0, 60); } return ''; }, tk);
  await p.goto(url(HTML)); await W(300);

  // Campo único en la cabecera, junto a "Ver propuestas"
  check(await p.locator('#ccTkBuscar').count() === 1 && await p.isVisible('#ccTkBuscar'), 'un solo campo "Buscar ticket" visible');
  check(await p.getAttribute('#ccTkBuscar', 'placeholder') === 'Buscar ticket', 'placeholder "Buscar ticket"');
  check(await p.evaluate(() => document.querySelector('.cc-tk').nextElementSibling?.id === 'propToggle'), 'va junto a "Ver propuestas"');
  check(await p.locator('.cc-tk-lupa').count() === 1 && await p.locator('.cc-tk button').count() === 0, 'con lupa y sin botón aparte');
  const n = await p.evaluate(() => ({ e: CC.TICKET_INDEX.length, t: new Set(CC.TICKET_INDEX.map(x => x.t)).size }));
  check(n.t >= 100, `índice con ${n.t} tickets (${n.e} entradas)`);

  // Atajo "/"
  await p.click('#ccPbTitle'); await p.keyboard.press('/'); await W();
  check(await p.evaluate(() => document.activeElement?.id === 'ccTkBuscar'), '"/" lleva el foco al buscador');
  await p.keyboard.press('Escape');
  await p.click('#currentUser'); await p.keyboard.press('Escape');
  await p.evaluate(() => { const i = document.createElement('input'); i.id = 'tmpCampo'; document.body.appendChild(i); i.focus(); });
  await p.keyboard.press('/'); await W();
  check(await p.evaluate(() => document.activeElement?.id === 'tmpCampo' && document.getElementById('tmpCampo').value === '/'), '"/" no roba el foco si se escribe en otro campo');
  await p.evaluate(() => document.getElementById('tmpCampo').remove());

  // Lista de resultados
  await escribir('I-014'); let L = await items();
  check(await p.isVisible('#ccTkLista') && L.length >= 1 && L.length <= 8, `lista visible con ${L.length} resultado(s)`);
  check(L[0].startsWith('I-014') && L[0].includes('HU-FAC-01') && L[0].includes('Facturación > Pre-registro y Provisiones'), 'resultado: ticket, HU, texto y ruta');
  await escribir('014'); L = await items(); check(L[0]?.startsWith('I-014'), '"014" encuentra I-014');
  await escribir('HU-FAC-01'); L = await items(); check(L.length > 0 && L.every(x => x.includes('HU-FAC-01')), `"HU-FAC-01" lista solo esa HU (${L.length})`);
  await escribir('detracción'); L = await items(); check(L.length > 0 && L.length <= 8, `una palabra del título encuentra resultados (${L.length})`);
  await escribir('I-0'); L = await items(); check(L.length === 8, 'máximo 8 resultados');
  const sel0 = await p.$eval('#ccTkLista li.on', e => e.dataset.i);
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await W(80);
  const sel2 = await p.$eval('#ccTkLista li.on', e => e.dataset.i);
  await p.keyboard.press('ArrowUp'); await W(80);
  check(sel0 === '0' && sel2 === '2' && await p.$eval('#ccTkLista li.on', e => e.dataset.i) === '1', 'flechas mueven la selección');
  await p.keyboard.press('Escape'); await W(80); check(!(await p.isVisible('#ccTkLista')), 'Escape cierra la lista');
  await escribir('I-999'); L = await items();
  check(L.length === 1 && L[0] === 'No hay propuestas para ese ticket', '"I-999": "No hay propuestas para ese ticket"');
  await p.keyboard.press('Enter'); await W(); check(await p.isVisible('#ccTkLista'), 'Enter sin resultados no navega');
  await p.keyboard.press('Escape');

  // Encima no se encima en 1366 y 1920
  for (const w of [1366, 1920]) {
    await p.setViewportSize({ width: w, height: 800 }); await W(200);
    await escribir('I-01');
    const r = await p.evaluate(() => {
      const bx = e => e.getBoundingClientRect(), cruza = (a, c) => !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
      const campo = bx(document.querySelector('.cc-tk')), lista = bx(document.getElementById('ccTkLista'));
      const otros = ['#propToggle', '#notesToggle', '#currentUser', '.brand-block', '.cc-tk + *'].map(s => document.querySelector(s)).filter(e => e && e.offsetParent);
      return { choca: otros.some(e => cruza(campo, bx(e))), dentro: lista.left >= 0 && lista.right <= innerWidth, unaLinea: bx(document.querySelector('.user-box')).height < 48,
        encima: document.elementFromPoint(lista.left + 20, lista.top + 20)?.closest('#ccTkLista') != null };
    });
    check(!r.choca && r.dentro && r.unaLinea && r.encima, `${w} de ancho: nada se encima (campo, lista dentro de la pantalla y por encima)`);
    if (SHOTS && w === 1366) { await escribir('I-014'); await p.screenshot({ path: path.join(SHOTS, 'buscador_lista.png'), clip: { x: 0, y: 0, width: 1366, height: 460 } }); }
    await p.keyboard.press('Escape');
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // I-014: con "Ver propuestas" apagado lo enciende y abre Pre-registro y Provisiones con la marca resaltada
  await p.click('#propToggle'); await W();
  check(await p.evaluate(() => !CC.verPropuestas), 'Ver propuestas apagado antes de buscar');
  await escribir('I-014'); await p.keyboard.press('Enter'); await W(700);
  check(await p.evaluate(() => CC.verPropuestas), 'al elegir enciende Ver propuestas');
  check(await activa() === 'screenProvisions' && (await p.textContent('#ccPbTitle')).includes('Pre-registro y Provisiones'), 'I-014 abre Pre-registro y Provisiones');
  const m14 = await resaltada('I-014'); check(!!m14, `I-014 resaltada con pulso morado y en pantalla (${m14})`);
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'buscador_resaltado.png') });
  await W(2400); check(await p.locator('.cc-pulso').count() === 0, 'el pulso se quita a los 2 segundos');

  // Ticket dentro de una pestaña (I-019: Editar BL, pestaña Recargos) y dentro de un modal (I-159: Detalle del Error SAP)
  await escribir('I-019'); await p.keyboard.press('Enter'); await W(900);
  check(!!(await resaltada('I-019')), 'I-019 abre el BL en su pestaña y resalta la marca');
  await escribir('I-159'); await p.keyboard.press('Enter'); await W(900);
  check(!!(await resaltada('I-159')) && await p.evaluate(() => [...document.querySelectorAll('.cc-pulso')].some(e => /I-159/.test(e.getAttribute('data-chg') || e.textContent) && e.closest('.modal-bg.show'))), 'I-159 abre el modal y resalta la marca');
  await escribir('I-197'); await p.click('#ccTkLista li[data-i="0"]'); await W(1200);
  check(!!(await resaltada('I-197')), 'clic en el resultado: I-197 en el asistente de PDA resaltada');

  // Ticket del portal externo (I-084)
  await escribir('I-084'); L = await items(); check(L[0]?.includes('Portal externo'), 'I-084 indica Portal externo');
  await p.keyboard.press('Enter'); await p.waitForURL(/portal\.html\?ticket=I-084/); await W(2200);
  check(/portal\.html\?ticket=I-084/.test(p.url()), 'abre portal.html?ticket=I-084');
  check(!!(await resaltada('I-084')), 'portal externo resalta la marca de I-084');

  // Enlace directo ?ticket= (junto con ?v=...)
  await p.goto(url(HTML) + '?v=v24-public-final&ticket=I-014'); await W(1200);
  check(await activa() === 'screenProvisions' && !!(await resaltada('I-014')), 'carga directa ?v=...&ticket=I-014 abre Provisiones y resalta la marca');
  await p.goto(url(HTML) + '?ticket=I-999&v=v24-public-final'); await W(600);
  check(await p.inputValue('#ccTkBuscar') === 'I-999' && (await items()).join() === 'No hay propuestas para ese ticket', 'carga directa ?ticket=I-999 abre el buscador con "No hay propuestas para ese ticket"');
  await p.goto(url(HTML) + '?ticket=I-084'); await p.waitForURL(/portal\.html\?ticket=I-084/); await W(2000);
  check(!!(await resaltada('I-084')), 'carga directa ?ticket=I-084 redirige al portal externo y resalta');

  // Todas las entradas del índice llegan a su marca (página nueva por entrada)
  const idx = await p.evaluate(() => CC.TICKET_INDEX.map((e, i) => ({ i, t: e.t, portal: !!e.portal, k: e.k || 0 })));
  const malos = [];
  for (const e of idx) {
    if (e.portal) await p.goto(url(PORTAL) + `?ticket=${e.t}&k=${e.k}`);
    else { await p.goto(url(HTML)); await W(150); await p.evaluate(i => CC.irATicket(CC.TICKET_INDEX[i]), e.i); }
    let ok = false; for (let k = 0; k < 30 && !ok; k++) { await W(100); ok = !!(await resaltada(e.t)); }
    if (!ok) malos.push(e.t + (e.portal ? ' (portal)' : ''));
  }
  check(malos.length === 0, `las ${idx.length} entradas del índice llegan a su marca${malos.length ? ': fallan ' + malos.join(', ') : ''}`);

  check(errs.length === 0, `sin errores JS${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
  console.log(fails ? `FALLAS: ${fails}` : 'TODO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
