// Uso: MOCKUP_HTML=<ruta a index.html> node tests/e2e_i123.js
// HU-ATC-04 · I-123: EDI MEMO en Socio (rol Depósito, dentro de Configuración SFTP) y pestaña MEMO y EDI en Liberación de la Carga.
const { chromium } = require('playwright'); const path = require('path');
const HTML = process.env.MOCKUP_HTML || path.resolve(__dirname, '../repo/pda-mockup/index.html');
let fails = 0; const check = (c, m) => { console.log(c ? 'OK ' : 'FALLA', m); if (!c) fails++; };
const ruido = /^(start|onHasParentDirectory|addRow) is not defined/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = []; p.on('pageerror', e => { if (!ruido.test(e.message)) errs.push(e.message); }); p.on('dialog', d => d.accept());
  const W = (ms = 200) => p.waitForTimeout(ms);
  const txt = s => p.textContent(s).then(x => (x || '').trim()).catch(() => '');
  const hay = s => p.$(s).then(Boolean);
  await p.goto('file://' + HTML); await W(400);
  await p.selectOption('#currentUser', { label: 'P. Díaz (Facturación)' }); await W();
  await p.evaluate(() => { CC.alternarPropuestas(true); CC.ir('Data Maestra', 'Socio'); }); await W(300);
  const abrir = async (n, ed) => { await p.evaluate(([n, e]) => { selectPartner(PARTNERS.find(y => y.largo === n).id, true); if (e) startPtEdit(); }, [n, ed]); await W(300); };

  // Socio con rol Depósito
  await abrir('DEPÓSITO VACÍOS CALLAO NORTE S.A.C.', false);
  check(await hay('#ptI123Edi.cc-prop') && await hay('#ptI123Nota.cc-prop'), 'Socio Depósito: bloque EDI MEMO y nota SFTP marcados como propuesta');
  check(await p.evaluate(() => document.getElementById('ptI123Edi').closest('.buscar-filters').textContent.includes('Configuración SFTP')), 'Socio: EDI MEMO va dentro de la sección Configuración SFTP');
  check((await p.$$eval('#ptI123Edi [data-edif] label', x => x.map(e => e.textContent.replace(/\s*i\s*$/, '').trim()))).join('|') === 'Variante *|Emisor del UNB (RUC) *|Receptor del UNB *|Canal de entrega *|Carpeta remota de salida *|Último correlativo usado *', 'Socio: 6 campos del EDI MEMO en orden');
  check(await p.$eval('#ptI123Edi [data-edi="variante"]', e => e.disabled), 'Socio consulta: campos en solo lectura');
  check(await p.$$eval('#ptI123Edi [data-edi="variante"] option', x => x.map(o => o.textContent).join('|')) === 'Elegir Variante|DPWL|INFINIA|CONTRANS', 'Socio: combo Variante completo');
  check((await p.$$eval('#ptEditor .md-actions button', x => x.filter(e => e.textContent.trim() === 'Guardar').length)) === 0, 'Socio consulta: sin Guardar extra');
  await abrir('DEPÓSITO VACÍOS CALLAO NORTE S.A.C.', true);
  check((await p.$$eval('#ptEditor button', x => x.filter(e => e.textContent.trim() === 'Guardar').length)) === 1, 'Socio edición: un solo Guardar (el de la ficha)');
  check(!(await txt('#ptEditor')).includes('Directorio de Entrada *'), 'Socio: directorios opcionales si solo recibe EDI MEMO');
  await p.fill('#ptI123Edi [data-edi="emisor"]', '123'); await p.evaluate(() => savePartner()); await W(300);
  check((await txt('#ptEditor [data-err="edi_emisor"]')).includes('11 dígitos'), 'Socio: valida Emisor del UNB de 11 dígitos');
  await p.fill('#ptI123Edi [data-edi="emisor"]', '20600088109'); await p.evaluate(() => savePartner()); await W(300);
  check(await p.evaluate(() => PARTNERS.find(y => y.largo === 'DEPÓSITO VACÍOS CALLAO NORTE S.A.C.').edi.emisor === '20600088109'), 'Socio: se guarda con el Guardar de la ficha');
  await abrir('TERMINAL DE VACÍOS VENTANILLA S.A.C.', true);
  await p.selectOption('#ptI123Edi [data-edi="canal"]', 'SFTP del depósito'); await W(); await p.evaluate(() => savePartner()); await W(300);
  check((await txt('#ptEditor [data-err="edi_canal"]')).includes('Requerir Integración SFTP'), 'Socio: canal SFTP exige Requerir Integración SFTP');
  await p.evaluate(() => discardPartner()); await W();
  await abrir(await p.evaluate(() => PARTNERS.find(y => !y.roles.some(r => /^Depósito/.test(r.rol))).largo), false);
  check(!(await hay('#ptI123Edi')), 'Socio sin rol Depósito: sin bloque EDI MEMO');
  await p.evaluate(() => CC.alternarPropuestas(false)); await W(300);
  await abrir('DEPÓSITO VACÍOS CALLAO NORTE S.A.C.', true);
  check(!(await hay('#ptI123Edi')) && !(await hay('#ptI123Nota')) && (await txt('#ptEditor')).includes('Directorio de Entrada *'), 'Propuestas apagado: Socio como Connect hoy');
  await p.evaluate(() => { discardPartner(); CC.alternarPropuestas(true); }); await W(300);

  // Liberación de la Carga
  await p.evaluate(() => CC.ir('Atención al cliente', 'Liberación de la Carga')); await W(300);
  const ids = await p.evaluate(() => AC.lib().lista.filter(r => r.estado === 'Aprobado').map(r => r.id));
  const vistos = new Set();
  for (const id of ids) {
    await p.evaluate(i => libAbrir(i), id); await W(300);
    check(await hay('#libDet [data-tab="edi"].cc-prop'), `Liberación ${id}: pestaña MEMO y EDI marcada como propuesta`);
    await p.click('#libDet [data-tab="edi"]'); await W(300);
    check((await p.$$eval('#libEdi thead th', x => x.map(e => e.textContent.trim()))).join('|') === 'N.º MEMO|Depósito|Vence|Contenedores|Último envío EDI', `Liberación ${id}: columnas de la pestaña`);
    check(!(await hay('#libEdi input, #libEdi select, #libEdi textarea')), `Liberación ${id}: solo lectura`);
    (await p.$$eval('#libEdi [data-edist]', x => x.map(e => e.dataset.edist))).forEach(s => vistos.add(s));
    check(await p.$$eval('#libEdi [data-edist]', x => x.every(e => (e.dataset.tip || '').length > 10)), `Liberación ${id}: tooltip con el detalle del último envío`);
    if (await hay('#libEdi [data-edi-correo]')) {
      await p.click('#libEdi [data-edi-correo]'); await W(300);
      const m = await txt('#libEdiMail');
      check(m.includes('Error en el envío de EDI MEMO a un depósito') && m.includes('Lista de TI de Cosmos'), 'Correo de error: vista previa con asunto y destinatarios');
      await p.click('[data-ac="cerrar-correo-edi"]'); await W();
    }
  }
  check(['sent', 'retry', 'err', 'noedi'].every(s => vistos.has(s)), 'Liberación: estados Enviado, Pendiente, Error y Sin EDI');
  await p.evaluate(() => CC.alternarPropuestas(false)); await W(300);
  check(!(await hay('#libDet [data-tab="edi"]')) && !(await hay('#libEdi')), 'Propuestas apagado: Liberación sin pestaña MEMO y EDI');
  check(errs.length === 0, 'sin errores JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  if (fails) { console.log(`FALLAS: ${fails}`); process.exit(1); } console.log('TODO OK'); process.exit(0);
})();
