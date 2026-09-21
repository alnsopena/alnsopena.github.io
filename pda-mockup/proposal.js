/* Presentation layer shared by all proposal screens. Reference remains unchanged. */
const baseRenderProposal = render;
const baseFieldProposal = field;
let containerExpanded = false;
field = function(label,key,type='text',opts=null,help='') {
  if(mode==='actual') return baseFieldProposal(label,key,type,opts,help);
  const conditional=['grt','loa'].includes(key), required=label.includes('(*)');
  const title=label.replace(/\s*\([^)]*\)/g,'').trim();
  const marker=required?'<span class="field-mark required" title="Necesario para aprobar">*</span>':conditional?'<span class="field-mark conditional" title="Necesario cuando el servicio utiliza este dato">◆</span>':'<span class="field-optional">Opcional</span>';
  const hints={vessel:'Puedes usar TBN mientras confirmas la nave.',grt:'Se utiliza en servicios calculados por TRG.',loa:'Se utiliza en servicios calculados por eslora.',billTo:'Completa el cliente facturador antes de aprobar.'};
  const value=pda[key]??'', id='proposal-'+key;
  return `<label class="field" for="${id}"><span class="field-label">${esc(title)} ${marker}</span>${opts?`<select id="${id}" data-field="${key}">${opts.map(x=>option(x,value)).join('')}</select>`:`<input id="${id}" data-field="${key}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="any"':''}>`}${hints[key]?`<span class="help">${hints[key]}</span>`:''}</label>`;
};
workflowV2 = function(){
  const current=currentStageV2(), index=lifecycleV2.indexOf(current);
  return `<section class="workflow card" aria-label="Seguimiento de la PDA"><div class="flow-heading"><span>Seguimiento de la PDA</span><span class="badge blue">${esc(current)}</span></div><ol class="flow-track">${lifecycleV2.map((s,i)=>`<li class="${i===index?'current':i<index?'complete':''}" ${i===index?'aria-current="step"':''}><span class="step-dot">${i<index?'✓':i+1}</span><span>${s}</span>${i===index?'<small>Estás aquí</small>':''}</li>`).join('')}</ol><details class="rejection-help" ${['Rechazado','Ajuste'].includes(current)?'open':''}><summary>¿Qué sucede si se rechaza?</summary><p>Rechazado → Ajuste → Enviado → Validado → Aprobado → Completado. En Ajuste puedes editar y volver a enviar.</p></details></section>`;
};
containerPanelV2 = function(){
  const entries=Object.entries(containerLabelsV2);
  return `<details class="container-compact card" ${containerExpanded?'open':''}><summary><span class="container-symbol" aria-hidden="true">▦</span><span><b>Contenedores</b><small>Origen: Agenciamiento · cantidades para el cálculo</small></span><span class="container-count">${containerTotalV2()} <small>unidades</small></span><span class="expand-label">Ver / editar</span></summary><div class="container-body"><p class="help">Al cambiar cantidades se recalculan los servicios por contenedor.</p><div class="container-matrix">${['20′','40′'].map((size,idx)=>`<fieldset><legend>${size} pies</legend><div class="container-inputs">${entries.slice(idx*4,idx*4+4).map(([k,label])=>`<label>${esc(label.replace(/^\d+[′']\s*/,''))}<input aria-label="${esc(label)}" type="number" min="0" step="1" data-container="${k}" value="${Number(pda.containers[k]||0)}"></label>`).join('')}</div></fieldset>`).join('')}</div></div></details>`;
};
render = function(){
  if(mode==='proposed'&&tab==='providers')tab='services';
  baseRenderProposal();
  document.body.classList.toggle('proposal-ui',mode==='proposed');
  if(mode!=='proposed')return;
  const main=document.querySelector('.workspace');
  main.querySelector('[data-tab="providers"]')?.remove();
  main.querySelectorAll('[data-target="providers"]').forEach(b=>b.dataset.target='services');
  if(page==='detail'){
    const intro=main.querySelector(':scope > .notice');
    if(intro)intro.remove();
    const badges=main.querySelectorAll('.heading > div:first-child > .badge');
    badges.forEach((b,i)=>{if(i)b.remove();else b.textContent='Estado: '+primaryStatusV2();});
    const tabs=main.querySelector('.tabs');
    if(tabs){tabs.setAttribute('aria-label','Secciones de la PDA');tabs.querySelectorAll('button').forEach((b,i)=>{b.innerHTML=`<span class="tab-number">${i+1}</span>${b.textContent}`;if(b.classList.contains('active'))b.setAttribute('aria-current','page');});}
    if(tab==='general'){
      tabs.insertAdjacentHTML('afterend','<div class="section-intro"><div><h2>Prepara los datos de tu PDA</h2><p>Completa lo que tengas ahora. Puedes guardar y continuar después.</p></div><div class="field-legend" aria-label="Leyenda de campos"><span><b class="required">*</b> Para aprobar</span><span><b class="conditional">◆</b> Según servicio</span><span>Opcional: sin requisito</span></div></div>');
      main.querySelectorAll('.formbottom').forEach(e=>e.remove());
      main.querySelectorAll('.grid3 > .card > .help').forEach(e=>e.remove());
      const titles=['Nave y viaje','Cliente y facturación','Operación y fechas'];
      main.querySelectorAll('.grid3 > .card').forEach((card,i)=>{card.classList.add('form-section');card.querySelector('h2').textContent=titles[i];card.querySelector('.ico').textContent=String(i+1).padStart(2,'0');});
      const secondary=['owner','charterer','broker','manager','settlementTo'];
      const billing=main.querySelectorAll('.form-section')[1];
      const extra=document.createElement('details');extra.className='secondary-fields';extra.innerHTML='<summary>Otros participantes y liquidación <span>Opcional</span></summary><div class="secondary-grid"></div>';
      secondary.forEach(key=>{const f=billing.querySelector(`[data-field="${key}"]`)?.closest('label');if(f)extra.lastElementChild.append(f);});
      billing.append(extra);
      billing.querySelectorAll('.grid2').forEach(g=>{if(!g.children.length)g.remove();});
      const remarks=main.querySelector('[data-field="remarksEn"]');if(remarks){remarks.id='remarks-en';remarks.closest('label').setAttribute('for','remarks-en');remarks.placeholder='Write the remarks to include in the PDA…';remarks.insertAdjacentHTML('afterend','<span class="help">Se imprime siempre en inglés.</span>');}
    }
    const footer=main.querySelector('.footerbar');
    if(footer){footer.querySelector('[data-action="load-sample"]')?.remove();footer.querySelector('[data-action="new"]')?.remove();const hint=footer.querySelector('.muted');if(hint)hint.innerHTML=primaryStatusV2()==='Aprobado'?'<b>✓ PDA aprobada</b><small>Ya puedes asociarla a una nave y viaje.</small>':'<b>Guarda tu avance cuando lo necesites</b><small>La asociación a nave y viaje se habilita al aprobar.</small>';}
    if(tab==='services'){
      main.querySelectorAll('.notice').forEach(n=>{if(n.textContent.includes('motor compartido'))n.remove();});
      const table=main.querySelector('.tablewrap');if(table){table.tabIndex=0;table.setAttribute('aria-label','Servicios y cálculos; desplázate horizontalmente para ver todas las columnas');}
    }
    if(tab==='surcharges'){
      const config=main.querySelector('.twocol > section');
      if(config){config.querySelector('.kicker')?.remove();config.querySelector('h2').textContent='Recargos de la operación';const grid=config.querySelector('.grid2');if(grid){const d=document.createElement('details');d.className='secondary-fields';d.innerHTML='<summary>Ver configuración de recargos</summary>';grid.before(d);d.append(grid);}}
      const aside=main.querySelector('.twocol aside');if(aside)aside.innerHTML='<span class="ico">↻</span><h2>Cálculo automático</h2><p>Los feriados y horarios de la operación determinan los recargos.</p><p class="help">Si cambias ETA o ETD, revisa y recalcula antes de aprobar.</p>';
    }
  }
};
document.addEventListener('toggle',e=>{if(e.target.matches?.('.container-compact'))containerExpanded=e.target.open;},true);
const templateDraftUI={name:'',scope:'',selected:new Set()};
const templateExtrasUI=['Carga de contenedores llenos','Descarga de contenedores llenos','Carga de contenedores vacíos','Descarga de contenedores vacíos','Sanidad marítima','Derecho APN'];
templates=function(){
  const pending=rows.filter(r=>r.rate===''||r.tax==='pending').length;
  const scopes=['Callao · DP World · Liner','Paracas · Tramp'];
  return `${crumb('PDA Plantilla')}<div class="heading"><div><div class="kicker">CONFIGURACIÓN COMERCIAL</div><h1>PDA Plantilla</h1><span class="tagline">Prepara una base de servicios para tus próximas PDA.</span></div><span class="spacer"></span>${btn('Volver a PDA','back-detail')}</div><div class="template-overview"><div><span class="template-icon">▤</span><div><b>Tu base de trabajo</b><small>${esc(pda.port)} · ${esc(pda.service)} · ${esc(pda.terminal)}</small></div></div><div><strong>${rows.length}</strong><span>Servicios</span></div><div><strong>${pending}</strong><span>Por completar</span></div><div><strong>${versions.length}</strong><span>Versiones guardadas</span></div></div><div class="template-layout"><div class="template-main"><section class="card"><div class="cardhead"><span class="ico">01</span><h2>Identifica tu plantilla</h2><span class="spacer"></span><span class="badge blue">Borrador</span></div><div class="grid2"><label class="field" for="tpl-name"><span class="field-label">Nombre de plantilla <b class="required">*</b></span><input id="tpl-name" value="${esc(templateDraftUI.name||pda.port+' · '+pda.service)}" placeholder="Ej. Callao · Servicios Liner" required></label><label class="field" for="tpl-scope"><span class="field-label">Ámbito de aplicación <b class="required">*</b></span><select id="tpl-scope">${scopes.map(s=>option(s,templateDraftUI.scope||scopes[0])).join('')}</select></label></div><span class="help"><b class="required">*</b> Necesario para guardar la versión.</span></section><section class="card"><div class="cardhead"><span class="ico">02</span><h2>Servicios de la plantilla</h2><span class="spacer"></span><span class="badge">${rows.length} conceptos</span></div><p class="template-description">Revisa la base actual y añade los servicios complementarios que necesitas.</p><div class="template-groups">${Object.entries(groups).map(([key,names])=>{const list=rows.filter(r=>r.group===key);return list.length?`<details class="template-group"><summary><span>${esc(names[0])}</span><span class="badge">${list.length}</span></summary><div>${list.map(r=>`<div class="template-service"><div><b>${esc(r.es)}</b><small>${esc(r.unit)} · ${r.rate===''?'Tarifa pendiente':'USD '+money(r.rate)}</small></div><span class="badge ${r.tax==='pending'?'amber':'green'}">${r.tax==='pending'?'IGV por definir':'IGV definido'}</span></div>`).join('')}</div></details>`:'';}).join('')||'<p class="help">Aún no hay servicios. Selecciona conceptos para empezar.</p>'}</div><h3 class="template-subheading">Añadir servicios complementarios</h3><div class="template-options">${templateExtrasUI.map((name,i)=>{const added=rows.some(r=>r.es===name);return `<label class="template-option ${added?'included':''}"><input type="checkbox" name="tpl-concept" value="${i}" ${added?'checked disabled':templateDraftUI.selected.has(i)?'checked':''}><span><b>${esc(name)}</b><small>${i<4?'Por contenedor · Carga':'Por servicio · Autoridades marítimas'}</small></span>${added?'<span class="included-label">Incluido</span>':''}</label>`;}).join('')}</div><div class="template-addbar"><span id="template-selection-count" role="status">${templateDraftUI.selected.size} seleccionados</span>${btn('Añadir seleccionados','apply-template','primary')}</div></section><div class="footerbar"><span class="muted"><b>Guarda una versión para conservar esta base</b><small>Los cambios de esta PDA no actualizan otras PDA.</small></span><span class="spacer"></span>${btn('Guardar versión','save-template','primary')}</div></div><aside class="template-sidebar"><section class="card"><div class="cardhead"><span class="ico">✓</span><h2>Antes de guardar</h2></div><div class="template-check"><span class="green">✓</span><div><b>Conserva tu avance</b><small>Puedes guardar con tarifas o impuestos pendientes.</small></div></div><div class="template-check"><span class="amber">!</span><div><b>${pending?pending+' servicios por completar':'Revisa la configuración'}</b><small>Completa tarifas e impuestos antes de usar la PDA para aprobación.</small></div></div><button data-action="template-review-services" class="template-review-link">Revisar tarifas en la PDA →</button></section><section class="card"><div class="cardhead"><span class="ico">↺</span><h2>Versiones guardadas</h2></div>${versions.length?versions.map((v,i)=>`<details class="template-version"><summary><span class="badge blue">v${i+1}</span><span><b>${esc(v.name)}</b><small>${esc(v.at)}</small></span></summary><p class="help">${esc(v.scope)} · ${v.rows.length} servicios</p><ul>${v.rows.map(r=>`<li>${esc(r.es)}</li>`).join('')}</ul></details>`).reverse().join(''):'<div class="template-empty"><span>▤</span><b>Tu primera versión empieza aquí</b><p>Al guardar, aparecerá aquí el detalle de los servicios de esa versión.</p></div>'}</section><p class="help template-local-note">Prototipo: las versiones se guardan solo en este navegador.</p></aside></div>`;
};
document.addEventListener('input',e=>{if(e.target.id==='tpl-name')templateDraftUI.name=e.target.value;});
document.addEventListener('change',e=>{if(e.target.id==='tpl-scope')templateDraftUI.scope=e.target.value;if(e.target.name==='tpl-concept'){const i=Number(e.target.value);e.target.checked?templateDraftUI.selected.add(i):templateDraftUI.selected.delete(i);const count=document.querySelector('#template-selection-count');if(count)count.textContent=templateDraftUI.selected.size+' seleccionados';}});
document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='template-review-services'){page='detail';tab='services';render();}if(action==='apply-template'&&page==='templates'){templateDraftUI.selected.clear();render();}});
render();

