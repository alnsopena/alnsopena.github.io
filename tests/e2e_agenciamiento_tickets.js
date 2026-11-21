// Uso: MOCKUP_HTML=<ruta a index.html> node e2e_agenciamiento_tickets.js
// Propuestas sobre Viaje: I-013 (quiebres SAP por servicio), I-021 (rectificar o anular manifiesto), I-036 (alta rápida de socio Armador).
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
  const usuario = async re => { const v = await p.$eval('#currentUser', (s, r) => [...s.options].find(o => new RegExp(r).test(o.text)).value, re); await p.selectOption('#currentUser', v); await W(); };
  await p.goto('file://' + HTML); await W(300);
  await p.evaluate(() => { if (!state.categoryType) chooseType('maritimo'); }); await W(200);
  await usuario('Gerencia');
  await p.evaluate(() => CC.ir('Agenciamiento', 'Viaje')); await W(300);
  const code = await p.evaluate(() => { const org = 'COSMOS AGENCIA MARITIMA S.A.C.', L = VOYAGES.filter(x => x.estado === 'Creado' && x.agente === org);
    const v = L.find(x => x.manif && x.rows.length) || L.find(x => x.rows.length) || L[0]; if (!v.manif) v.manif = '01-118-2026-1-0999'; return v.code; });
  await p.evaluate(c => selectVoyage(c), code); await W();
  check(await txt('#ccPbTitle') === 'Edición de Viaje', 'Viaje: Edición de Viaje abierta');

  // ---------- I-021: Rectificar o Anular Manifiesto ----------
  check(await p.isVisible('#agMfBtn') && !(await p.$eval('#agMfBtn', e => e.disabled)), 'I-021: botón Rectificar o Anular Manifiesto habilitado (Gerencia)');
  check(await p.$eval('#agMfBtn', e => /HU-OPS-01/.test(e.dataset.prop || '')), 'I-021: marcado como propuesta HU-OPS-01');
  await p.click('#agMfBtn'); await W();
  check((await txt('#facModalBox h3')) === 'Rectificar o Anular Manifiesto', 'I-021: diálogo abierto');
  check(await p.$eval('#mfOk', e => e.disabled), 'I-021: Transmitir deshabilitado sin acción ni motivo');
  await p.check('input[name="mfAcc"][value="0102"]'); await W(50);
  check(await p.$eval('#mfOk', e => e.disabled), 'I-021: motivo obligatorio');
  await p.fill('#mfMot', 'Corrección del puerto de origen'); await W(50);
  await p.click('#mfOk'); await W();
  check((await toast()).includes('Rectificación del manifiesto enviada a SUNAT'), 'I-021: rectificación enviada');
  check(await p.$eval('#agMfBtn', e => e.disabled), 'I-021: botón bloqueado mientras SUNAT responde');
  await W(2800);
  const h1 = await p.evaluate(c => { const v = VOYAGES.find(x => x.code === c); return {manif: v.manif, ok: v.hist.some(h => /rectificación del manifiesto .* aceptada/.test(h.comment))}; }, code);
  check(h1.manif && h1.ok, 'I-021: rectificación aceptada conserva el número y queda en historial');
  await p.click('#agMfBtn'); await W();
  await p.check('input[name="mfAcc"][value="0103"]'); await p.fill('#mfMot', 'Manifiesto generado por error'); await W(50);
  await p.click('#mfOk'); await W(2900);
  const h2 = await p.evaluate(c => { const v = VOYAGES.find(x => x.code === c); return {manif: v.manif, an: (v.manifAnulados || []).length}; }, code);
  check(!h2.manif && h2.an === 1, 'I-021: anulación aceptada deja el viaje sin manifiesto');
  const btns = await p.$$eval('#vyEditor .md-actions button', x => x.map(e => e.textContent.trim()));
  check(btns.includes('Ingresar Nro. de Manifiesto') && !btns.includes('Rectificar o Anular Manifiesto'), 'I-021: vuelve a ofrecer Ingresar Nro. de Manifiesto');
  // Rol no autorizado
  await p.evaluate(c => { VOYAGES.find(x => x.code === c).manif = '01-118-2026-1-0998'; }, code);
  await usuario('Operaciones'); await p.evaluate(() => renderVyDetail()); await W();
  check(await p.$eval('#agMfBtn', e => e.disabled), 'I-021: rol no autorizado ve el botón deshabilitado');
  await usuario('Gerencia'); await p.evaluate(() => renderVyDetail()); await W();

  // ---------- I-036: alta rápida de socio Armador ----------
  await p.click('#vyEditor .md-tabs button:has-text("Información General")'); await W();
  await p.click('#vyEditor .md-actions button:has-text("Editar")'); await W();
  check(await p.isVisible('#agSocioBtn'), 'I-036: botón Crear socio junto a Armador en Editar');
  await p.click('#agSocioBtn'); await W();
  check((await txt('#facModalBox h3')) === 'Crear Socio', 'I-036: diálogo Crear Socio');
  const lbls = await p.$$eval('#facModalBox label', x => x.map(e => e.textContent.trim()));
  check(['Tipo de documento *', 'Número de documento *', 'Razón social *', 'Dirección *', 'País *', 'Rol'].every(l => lbls.includes(l)), 'I-036: campos mínimos del área');
  await p.click('#sqOk'); await W(100);
  check((await toast()).includes('Por favor complete todos los campos obligatorios'), 'I-036: valida obligatorios');
  await p.fill('#sqDoc', '20610099911'); await p.fill('#sqRazon', 'Naviera Demo Rápida S.A.C.'); await p.fill('#sqDir', 'Av. Ficticia 123, Callao');
  await p.click('#sqOk'); await W();
  const arm = await p.evaluate(c => VOYAGES.find(x => x.code === c).armador, code);
  check(arm === 'NAVIERA DEMO RÁPIDA S.A.C.', 'I-036: socio creado queda seleccionado como Armador');
  check(/Socio pendiente de aprobación · creado por L\. Fernández/.test(await txt('#vyEditor')), 'I-036: estado Pendiente de aprobación con usuario, fecha y origen');
  await p.click('#agSocioBtn'); await W();
  await p.fill('#sqDoc', '20610099911'); await p.fill('#sqRazon', 'naviera demo rápida s.a.c.'); await p.fill('#sqDir', 'Otra'); await p.click('#sqOk'); await W();
  check(await p.isVisible('#sqUsar'), 'I-036: detecta duplicado y ofrece usar el existente');
  await p.click('#sqUsar'); await W();
  check(await p.evaluate(() => !document.querySelector('#facModal.show')), 'I-036: usa el existente sin duplicar');

  // ---------- I-013: Quiebre SAP por servicio ----------
  await p.evaluate(c => { const v = VOYAGES.find(x => x.code === c); if (!v.rows.length) { const m = masterCatalog()[0];
    v.rows.push({id: 'rT1', cat: m.cat, name: m.name, ini_est: '', ini: '', fin: '', validado: false, proveedor: '', coord: false, ref: '', files: 0, pda: 'PDA-DEMO-0001', citado: false, docs: []}); } }, code);
  await p.click('#vyEditor .md-tabs button:has-text("Servicios operativos")'); await W();
  const ths = await p.$$eval('#vyEditor .vy-tbl thead th', x => x.map(e => e.textContent.trim()));
  check(ths.includes('Quiebre SAP'), 'I-013: columna Quiebre SAP en servicios del viaje');
  const hayPda = await p.evaluate(c => VOYAGES.find(x => x.code === c).rows.some(r => r.pda), code);
  if (hayPda) check((await txt('#vyEditor .vy-tbl')).includes('heredado de la PDA'), 'I-013: el servicio hereda el quiebre de la línea de PDA');
  const rid = await p.evaluate(c => { const v = VOYAGES.find(x => x.code === c); const r = v.rows[0]; agSvcDlg(r.cat, r.id); return r.id; }, code); await W();
  const opts = await p.$$eval('#sv_qb option', o => o.map(x => x.value));
  check(opts.length >= 3 && !opts.includes('QB-0199'), 'I-013: solo ofrece quiebres activos del servicio');
  const elegido = opts.find(x => x && x !== (opts[1])) || opts[1];
  await p.selectOption('#sv_qb', elegido); await p.click('#facModalBox button:has-text("Guardar")'); await W();
  const q = await p.evaluate(([c, id]) => { const r = VOYAGES.find(x => x.code === c).rows.find(x => x.id === id); return [r.quiebre, r.qbOrigen]; }, [code, rid]);
  check(q[0] === elegido && q[1] === 'Viaje', 'I-013: guarda el quiebre elegido en el servicio');

  // ---------- Ver propuestas apagado ----------
  await p.evaluate(() => CC.alternarPropuestas(false)); await W();
  check(!(await p.isVisible('#vyEditor .vy-tbl th.cc-prop')), 'Propuestas apagado: oculta Quiebre SAP');
  await p.click('#vyEditor .md-tabs button:has-text("Información General")'); await W();
  check(!(await p.isVisible('#agSocioBtn')), 'Propuestas apagado: oculta Crear socio');
  await p.click('#vyEditor .md-actions button:has-text("Cancelar")'); await W();
  await p.evaluate(c => { VOYAGES.find(x => x.code === c).manif = '01-118-2026-1-0997'; renderVyDetail(); }, code); await W();
  check(!(await p.isVisible('#agMfBtn')) && await p.$('#agMfBtn') !== null, 'Propuestas apagado: oculta Rectificar o Anular Manifiesto');
  check(await p.isVisible('#vyEditor .md-tabs'), 'Propuestas apagado: la pantalla de Connect sigue completa');
  await p.evaluate(() => CC.alternarPropuestas(true)); await W();

  check(errs.length === 0, 'Sin errores JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? `\n${fails} FALLA(S)` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})();
