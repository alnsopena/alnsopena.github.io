/* Pure, testable rules for the local template proposal. No portal writes. */
(function(root){
 const clone=x=>JSON.parse(JSON.stringify(x));
 const fields={name:'Nombre de plantilla',port:'Puerto',terminal:'Terminal',vesselType:'Tipo de nave',service:'Tipo de servicio',agency:'Tipo de agenciamiento',operation:'Tipo de operación',cargo:'Tipo de carga',currency:'Moneda'};
 const ports={'Callao':['DP World Callao S.R.L.','APM Terminals Callao S.A.','Valero Peru S.A.C.'],'Pisco':['TERMINAL PORTUARIO PARACAS S.A'],'Paita':['Terminales Portuarios Euroandinos Paita S.A. (TPE)']};
 const units=['Servicio','Hora','LOA × horas','TRG × cantidad','Contenedor'];
 const taxes=['pending','excluded','included','exempt','unaffected'];
 const num=x=>String(x??'').trim()!==''&&Number.isFinite(Number(x));
 function seed(){const list=[];const add=(code,es,en,group,unit,currency='USD',qty='',extra={})=>list.push({id:code,code,es,en,group,unit,currency,qty,rate:'',tax:'pending',enabled:true,comment:'',minimum:'',minRule:'none',surcharge:'none',...extra});
 add('AGENCY-COMMISSION','Comisión de agencia','Agency commission','agency','Servicio');
 add('PORT-BERTH','Uso de amarradero','Berth occupancy','port','LOA × horas');
 add('PORT-PILOTAGE-EXPORT','Practicaje · exportación','Pilotage · export','port','Servicio');
 add('PORT-LAUNCH-PILOT','Lancha · práctico a bordo','Launch · pilot boarding','port','Hora');
 add('PORT-PONTOON','Ocupación de muelles con pontones','Pontoon berth occupancy','port','Servicio');
 for(const size of [20,40])for(const fullness of ['full','empty'])for(const move of ['Load','Unload']){
 const key=fullness+size+move;add('CONT-'+key,(move==='Load'?'Embarque':'Descarga')+' · '+size+' pies · '+(fullness==='full'?'llenos':'vacíos'),(move==='Load'?'Loading':'Unloading')+' · '+size+' ft · '+(fullness==='full'?'full':'empty'),'port','Contenedor','USD','',{containerKey:key,qtySource:'agency'});
 }
 add('PORT-LAUNCH-AUTH','Lancha para autoridades · recepción','Launch for authorities · reception','port','Hora');
 add('AUTH-NAV-AIDS','Ayudas a la navegación','Navigation aids','authority','TRG × cantidad');
 add('AUTH-HEALTH-IN','Sanidad · recepción','Health clearance · arrival','authority','Servicio','PEN');
 add('AUTH-HEALTH-OUT','Sanidad · despacho','Health clearance · departure','authority','Servicio','PEN');
 add('AUTH-APN','Derecho APN','Port authority charge','authority','Servicio','USD','',{enabled:false,catalogPending:true});
 list.forEach(r=>r.templateManaged=true);
 return {id:'PROP-TPL-ZIM-CALLAO',name:'LINEA ZIM - CALLAO - DPW · propuesta',port:'Callao',terminal:ports.Callao[0],vesselType:'Buque de carga general/portacontenedores',service:'Liner',agency:'Agente Marítimo',operation:'Importación/Exportación',cargo:'Carga General',currency:'USD',client:'ZIM INTEGRATED SHIPPING SERVICE LTD',owner:'ZIM INTEGRATED SHIPPING SERVICE LTD',payment:'Sin condición de pago',remarksEn:'',status:'Borrador',rows:list,versions:[],audit:[],savedAt:null,versionSeq:0,rateSource:'',catalogConfirmed:false,requestUses:{}};}
 function issues(d,{publish=false}={}){
 const out=[];for(const [key,label]of Object.entries(fields))if(!String(d[key]??'').trim())out.push({key,message:label+': completa el campo.'});
 if(d.port&&d.terminal&&!ports[d.port]?.includes(d.terminal))out.push({key:'terminal',message:'El terminal no pertenece al puerto seleccionado.'});
 if(d.currency&&!['USD','PEN'].includes(d.currency))out.push({key:'currency',message:'Moneda no válida.'});
 if(!d.rows.some(r=>r.enabled))out.push({key:'services',message:'Activa al menos un servicio.'});
 const seen=new Set();for(const r of d.rows){if(seen.has(r.code))out.push({key:r.id,message:'Servicio duplicado: '+r.es});seen.add(r.code);if(!r.enabled)continue;
 for(const key of ['rate','qty','minimum'])if(String(r[key]??'').trim()!==''&&(!num(r[key])||Number(r[key])<0))out.push({key:r.id,message:r.es+': '+key+' debe ser un número no negativo.'});
 if(!['USD','PEN'].includes(r.currency)||!units.includes(r.unit))out.push({key:r.id,message:r.es+': revisa moneda y unidad.'});
 if(publish){if(!String(r.es).trim()||!String(r.en).trim())out.push({key:r.id,message:r.es+': completa los nombres ES/EN.'});if(!num(r.rate))out.push({key:r.id,message:r.es+': tarifa pendiente.'});if(!taxes.includes(r.tax)||r.tax==='pending')out.push({key:r.id,message:r.es+': clasifica el IGV.'});if(r.unit==='Contenedor'&&!r.containerKey)out.push({key:r.id,message:r.es+': selecciona el tipo de contenedor.'});if(r.minRule!=='none'&&(!num(r.minimum)||Number(r.minimum)<=0))out.push({key:r.id,message:r.es+': completa el mínimo.'});if(r.minRule==='pending')out.push({key:r.id,message:r.es+': define cómo aplicar el mínimo.'});if(r.surcharge!=='none'&&!r.surchargeConfirmed)out.push({key:r.id,message:r.es+': regla de recargo pendiente de aprobación.'});}
 }
 if(publish&&!d.catalogConfirmed)out.push({key:'catalogConfirmed',message:'Confirma con Comercial y Facturación los servicios aplicables y el catálogo.'});
 if(publish&&!String(d.rateSource||'').trim())out.push({key:'rateSource',message:'Indica la fuente o referencia de las tarifas autorizadas.'});return out;
 }
 function calculate(r,c,documentCurrency='USD'){
 if(!r.enabled)return {net:0,tax:0,total:0,pending:false};let quantity=r.unit==='Contenedor'?c.containers?.[r.containerKey]:r.qty; if(quantity===''||quantity==null)quantity=c.qty;
 const factor=r.unit==='TRG × cantidad'?c.grt:r.unit==='LOA × horas'?c.loa:1;
 const fx=r.currency===documentCurrency?1:r.currency==='PEN'?1/Number(c.exchange):Number(c.exchange);
 if(!num(r.rate)||!num(quantity)||!num(factor)||Number(r.rate)<0||Number(quantity)<0||Number(factor)<=0||!Number.isFinite(fx)||fx<=0||(r.currency!==documentCurrency&&(!num(c.exchange)||Number(c.exchange)<=0))||r.tax==='pending'||!taxes.includes(r.tax)||r.minRule==='pending')return {net:0,tax:0,total:0,pending:true};
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;let raw=Number(r.rate)*Number(factor);
 if(r.minRule==='per-unit')raw=Math.max(raw,Number(r.minimum)||0);raw*=Number(quantity);if(r.minRule==='per-line')raw=Math.max(raw,Number(r.minimum)||0);
 raw=round(raw*fx);const net=r.tax==='included'?round(raw/1.18):raw,tax=r.tax==='included'?round(raw-net):r.tax==='excluded'?round(net*.18):0;
 return {net,tax,total:round(net+tax),pending:false,quantity,fx};
 }
 function snapshot(d){const copy=clone(d);delete copy.versions;delete copy.requestUses;return copy;}
 function saveVersion(d){const found=issues(d);if(found.length)return {ok:false,issues:found};const n=(d.versionSeq||0)+1;d.versionSeq=n;d.status='Borrador';const version={number:n,state:'Borrador',at:new Date().toISOString(),data:snapshot(d)};d.versions.push(version);d.savedAt=version.at;return {ok:true,version};}
 function publish(d){const found=issues(d,{publish:true});if(found.length)return {ok:false,issues:found};const saved=saveVersion(d);if(!saved.ok)return saved;d.versions.forEach(v=>{if(v.state==='Publicada')v.state='Anterior';});saved.version.state='Publicada';d.status='Publicada';return saved;}
  function useVersion(d,n,request){const name=String(request||'').trim();if(!name)return {ok:false,error:'Indica el nombre de la PDA para continuar.'};const key=name.toUpperCase();if(d.requestUses[key])return {ok:false,error:'Ya existe una PDA con ese nombre en este mockup.',existing:d.requestUses[key]};const v=d.versions.find(x=>x.number===n&&x.state==='Publicada');if(!v)return {ok:false,error:'Selecciona una versión publicada y vigente.'};d.requestUses[key]=name;return {ok:true,id:name,displayName:name,data:clone(v.data)};}
 const api={seed,issues,calculate,saveVersion,publish,useVersion,fields,ports,units,taxes,clone};if(typeof module!=='undefined')module.exports=api;else root.TemplateModel=api;
})(typeof window!=='undefined'?window:this);

