const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept('ok'));
 const W=ms=>p.waitForTimeout(ms); const R={}; const toasts=[];
 await p.goto('file://'+(process.env.MOCKUP_HTML||require('path').resolve(__dirname,'../repo/pda-mockup/index.html'))); await p.evaluate(()=>{ if(!state.categoryType) chooseType('maritimo'); }); await W(200);
 await p.evaluate(()=>{ const o = window.toast; window.toast = (m,t)=>{ (window._t=window._t||[]).push(m); o(m,t); }; });
 const as = async u => { await p.selectOption('#currentUser',{label:u}); await W(150); };
 // 1. Comercial crea PDA Tramps desde cero, cliente nuevo, nave TBN
 await p.click('#screenLanding .btn-corp:has-text("Nueva PDA")'); await p.click('#cmMode [data-mode=tramps]'); await p.click('.cm-opt:has-text("Desde cero")'); await W(300);
 await p.evaluate(()=>{ openClientModal(); });
 await p.fill('#ncName','Cliente E2E S.A.C.'); await p.fill('#ncTax','20600099911'); await p.click('#clientModal button:has-text("Guardar")'); await W(150);
 await p.evaluate(()=>{ setShipSource('provisional'); Object.assign(state.vessel,{name:'TBN', voy:'E2E-1', grt:26000, loa:182, eta:'2026-10-20T08:00', etd:'2026-10-21T18:00'}); goStep(2); });
 await W(300); R.paso2 = await p.evaluate(()=>[state.step, state.pdaNumber]);
 // 2. Solicita servicio nuevo y preregistra proveedor
 await p.click('#calcSections .btn-add >> nth=0'); await p.fill('.dd-menu.show .dd-search','AGUA DULCE'); await p.click('.dd-menu.show .dd-req'); await W(150);
 await p.click('#reqNewModal button:has-text("Enviar")'); await W(150);
 await p.selectOption('#calcSections tbody tr:not(.edit-row) td:nth-child(6) select >> nth=0','__new'); await W(150);
 await p.fill('#spName','PROVEEDOR E2E SAC'); await p.fill('#spRuc','20600088822'); await p.click('#supModal button:has-text("Preregistrar")'); await W(200);
 R.bloqueos = await p.evaluate(()=>blockMsg(pdaBlockers()));
 const pdaCode = R.paso2[1];
 // 3. Agenciamiento homologa nave y viaje
 await as('M. Rojas (Agenciamiento)');
 await p.evaluate(()=>{ const s = SHIPS_CATALOG.find(x=>x.estado==='Por homologar'); openVessel(s.name,'pda'); }); await W(200);
 await p.evaluate(()=>{ startNvEdit(); });
 await p.fill('#nvEditor [data-f=name]','E2E STAR'); await p.fill('#nvEditor [data-f=imo]','9876543');
 await p.selectOption('#nvEditor .filter-field:has-text("Tipo de Nave") select','tanker'); await p.selectOption('#nvEditor .filter-field:has-text("Bandera") select','Panamá');
 await p.fill('#nvEditor [data-f=armador]','MAERSK LINE A/S'); await p.fill('#nvEditor [data-f=manga]','30'); await p.fill('#nvEditor [data-f=calado]','10');
 await p.click('#nvEditor button:has-text("Aprobar nave")'); await W(200);
 await p.evaluate(()=>{ const v = VOYAGES.find(x=>x.estado==='Por homologar'); openVoyage(v.code,'pda'); }); await W(200);
 await p.click('#vyEditor button:has-text("Homologar")'); await W(200);
 R.nave_viaje = await p.evaluate(()=>[SHIPS_CATALOG.find(s=>s.name==='E2E STAR')?.estado, VOYAGES.find(v=>v.nave==='E2E STAR')?.estado]);
 // 4. Área homologa la solicitud de servicio y Facturación la aprueba
 const req = await p.evaluate(pc=>{ const r = SERVICE_REQUESTS.find(x=>x.pda===pc); return [r.code, r.area]; }, pdaCode);
 R.req = req;
 await p.evaluate(()=>{ document.getElementById('currentUser').value = 'L. Fernández (Gerencia)'; });
 await as('L. Fernández (Gerencia)');
 await p.evaluate(c=>openReqDetail(c), req[0]); await W(200);
 await p.evaluate(c=>{ const r = SERVICE_REQUESTS.find(x=>x.code===c); r.homDraft = r.homDraft || homDefaults(r); Object.assign(r.homDraft,{erp:'R00999', ctaIng:'7041103', rate:25, unit:'Servicio'}); }, req[0]);
 R.homForm = await p.evaluate(()=>[...document.querySelectorAll('#reqBody input,#reqBody select')].map(e=>(e.dataset.h||e.id||e.name)+'='+e.value).slice(0,20));
 await p.evaluate(c=>{ try{ homologateReq(c); }catch(e){ window._err=e.message; } }, req[0]); await W(200);
 R.reqEst1 = await p.evaluate(c=>[SERVICE_REQUESTS.find(x=>x.code===c).status, (window._t||[]).slice(-1)[0]], req[0]);
 await as('P. Díaz (Facturación)');
 await p.evaluate(c=>{ openReqDetail(c); approveReq(c); }, req[0]); await W(200);
 R.reqEst2 = await p.evaluate(c=>[SERVICE_REQUESTS.find(x=>x.code===c).status, state.services.some(s=>s.fromRequest===c)], req[0]);
 // 5. Facturación homologa cliente y proveedor en Socios
 for(const n of ['CLIENTE E2E S.A.C.','PROVEEDOR E2E SAC']){
   await p.evaluate(n=>{ const pp = partnerByName(n); openPartner(pp.id,'pda'); startPtEdit(); }, n); await W(150);
   // Con Ver propuestas (I-035) el Código ERP, Moneda y Condición de Pago van por rol en la pestaña Datos comerciales
   const erp = 'X'+Date.now()%100000;
   if(await p.$('#ptEditor [data-f=erp]')) await p.fill('#ptEditor [data-f=erp]', erp);
   else { await p.evaluate(()=>setPtTab('comercial')); await W(100);
     for(const e of await p.$$('#ptRd [data-rdf$=_erp]')) await e.fill(erp);
     for(const e of await p.$$('#ptRd select[data-rdf]')) await e.selectOption({index:1}); }
   await p.fill('#ptEditor [data-f=dir]','LIMA - PERÚ');
   await p.click('#ptEditor button:has-text("Aprobar socio")'); await W(200);
 }
 R.socios = await p.evaluate(()=>[partnerByName('CLIENTE E2E S.A.C.').estado, partnerByName('PROVEEDOR E2E SAC').estado]);
 // 6. Comercial aprueba la PDA
 await as('A. Pérez (Comercial)');
 await p.evaluate(()=>{ goStep(3); }); await W(200);
 R.antes = await p.evaluate(()=>[pdaBlockers().n, blockMsg(pdaBlockers())]);
 await p.evaluate(()=>{ openStatusModal('approve'); }); await W(150);
 const modal = await p.evaluate(()=>document.getElementById('stModal').classList.contains('show'));
 if(modal){ await p.click('#stOk'); await W(1800); }
 R.aprobada = await p.evaluate(()=>[state.status, !!state.os, state.os?.number]);
 await p.evaluate(()=>{ document.querySelectorAll('#autoEmailCloseBtn').forEach(b=>b.click()); });
 // 7. Agenciamiento asocia la PDA al viaje
 await as('M. Rojas (Agenciamiento)');
 await p.evaluate(()=>{ const v = VOYAGES.find(x=>x.nave==='E2E STAR'); openVoyage(v.code,'pda'); openAssocPda(); }); await W(200);
 R.modal = await p.evaluate(()=>document.getElementById('amList').textContent.replace(/\s+/g,' ').trim());
 await p.click('#amList .am-card >> nth=0'); await p.click('#amOk'); await W(200);
 R.asociada = await p.evaluate(pc=>[PDA_ASSOC[pc], voyByCode(vy.selId).rows.length], pdaCode);
 R.historial = await p.evaluate(()=>state.traceability.length);
 console.log(JSON.stringify(R,null,1), errs, await p.evaluate(()=>window._err||'')); await b.close();})();
