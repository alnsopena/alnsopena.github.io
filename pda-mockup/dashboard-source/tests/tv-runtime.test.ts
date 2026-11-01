import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { EVENT_KEYS, getPresentation, parseOptions, selectVessels, sortByCriticality, vesselPriority, type Snapshot } from '../src/dashboard-model.ts';
import { initialRuntime, reduceRuntime } from '../src/tv-state.ts';
const data=JSON.parse(readFileSync(new URL('../public/data/dashboard-demo.json',import.meta.url),'utf8')) as Snapshot;
const options=parseOptions('?modo=tv&sede=callao&rango=hoy&seg=15&rotar=1');

test('sites have distinct fleets, volumes and color KPIs while preserving the observed missingness',()=>{
 const callao=selectVessels(data,'callao','today');
 const paita=selectVessels(data,'paita','today');
 assert.equal(callao.length,179); assert.equal(paita.length,48);
 const gray=(rows:typeof callao)=>rows.flatMap(v=>EVENT_KEYS.map(k=>getPresentation(v,v.events[k]))).filter(p=>p.color==='neutral').length;
 assert.equal(gray(callao),754); assert.equal(gray(paita),202);
 const callaoNames=new Set(data.vessels.filter(v=>v.site==='callao').map(v=>v.name));
 assert.ok(data.vessels.filter(v=>v.site==='paita').every(v=>!callaoNames.has(v.name)));
 assert.equal(new Set(data.vessels.map(v=>v.id)).size,data.vessels.length);
 const kpis=(rows:typeof callao)=>['red','yellow','green'].map(color=>rows.flatMap(v=>EVENT_KEYS.map(k=>getPresentation(v,v.events[k]))).filter(p=>p.color===color).length);
 kpis(callao).forEach((value,i)=>assert.notEqual(value,kpis(paita)[i]));
});
test('ATA and ETD have no more than two vessels per date/hour and honor chronology',()=>{
 for(const site of ['callao','paita'] as const) for(const range of ['past','today','upcoming'] as const) {
  const rows=selectVessels(data,site,range);
  for(const field of ['ata','etd'] as const) {
   const hours=new Map<string,number>();
   for(const vessel of rows) if(vessel[field]) {const bucket=vessel[field]!.slice(0,13);hours.set(bucket,(hours.get(bucket)??0)+1);}
   for(const [hour,count] of hours) assert.ok(count<=2,`${site} ${range} ${field} ${hour}: ${count}`);
  }
  for(const v of rows) {
   if(v.ata) assert.ok(Date.parse(v.ata)<=Date.parse(data.cut));
   if(v.eta&&v.ata) assert.ok(Date.parse(v.eta)<=Date.parse(v.ata));
   if(v.ata&&v.etd&&!v.staleEstimate) assert.ok(Date.parse(v.ata)<Date.parse(v.etd));
   for(const event of Object.values(v.events)) if(event.transmittedAt) assert.ok(Date.parse(event.transmittedAt)<=Date.parse(data.cut));
  }
 }
});

test('TV preserves all rows and sorts criticality before ETA',()=>{
 const rows=selectVessels(data,'callao','today');
 const sorted=sortByCriticality(rows);
 assert.deepEqual(new Set(sorted.map(v=>v.id)),new Set(rows.map(v=>v.id)));
 for(let i=1;i<sorted.length;i++) {
  assert.ok(vesselPriority(sorted[i-1])<=vesselPriority(sorted[i]));
  if(vesselPriority(sorted[i-1])===vesselPriority(sorted[i])) assert.ok((Date.parse(sorted[i-1].eta)||Infinity)<=(Date.parse(sorted[i].eta)||Infinity));
 }
 assert.equal(vesselPriority(sorted.at(-1)!),3);
});
test('a five-minute refresh never resets the current page or its timer',()=>{
 let state=reduceRuntime(initialRuntime(options),{type:'loaded',data,now:1000},options);
 state=reduceRuntime(state,{type:'tick',now:16000},options);
 const before={page:state.page,deadline:state.deadline,range:state.range,ids:selectVessels(state.data,'callao','today').map(v=>v.id)};
 state=reduceRuntime(state,{type:'loaded',data:structuredClone(data),now:20000},options);
 assert.equal(state.page,before.page); assert.equal(state.deadline,before.deadline); assert.equal(state.range,before.range);
 assert.deepEqual(selectVessels(state.data,'callao','today').map(v=>v.id),before.ids);
 assert.equal(state.refreshes,2);
});
test('changed data is queued and applied only at the natural cycle boundary',()=>{
 let state=reduceRuntime(initialRuntime(options),{type:'loaded',data,now:1000},options);
 state=reduceRuntime(state,{type:'tick',now:16000},options);
 const updated=structuredClone(data); updated.vessels[0].name='ANDES STAR ACTUALIZADA';
 const previous=state.data; const deadline=state.deadline;
 state=reduceRuntime(state,{type:'loaded',data:updated,now:17000},options);
 assert.equal(state.page,1); assert.equal(state.deadline,deadline); assert.equal(state.data,previous); assert.ok(state.pending);
 for(let i=0;i<14;i++) state=reduceRuntime(state,{type:'tick',now:state.deadline},options);
 assert.equal(state.page,0); assert.equal(state.range,'upcoming'); assert.equal(state.data?.vessels[0].name,'ANDES STAR ACTUALIZADA'); assert.equal(state.pending,null);
});
test('a stale-tab tick advances one page without rapid catch-up jumps',()=>{
 let state=reduceRuntime(initialRuntime(options),{type:'loaded',data,now:1000},options);
 state=reduceRuntime(state,{type:'tick',now:600000},options);
 assert.equal(state.page,1);assert.equal(state.deadline,615000);
 assert.equal(reduceRuntime(state,{type:'tick',now:600001},options),state);
});
test('failed refresh retains the current dataset, page and scheduled transition',()=>{
 const state=reduceRuntime(initialRuntime(options),{type:'loaded',data,now:1000},options);
 const failed=reduceRuntime(state,{type:'error',message:'Sin conexión'},options);
 assert.equal(failed.data,state.data);assert.equal(failed.page,state.page);assert.equal(failed.deadline,state.deadline);assert.ok(failed.error);
});
test('URL options select site, bound timers and keep rotation optional',()=>{
 assert.equal(parseOptions('?modo=tv&sede=paita').site,'paita');
 assert.equal(parseOptions('').rotate,false);
 assert.equal(parseOptions('?seg=-1&filas=100').seconds,1);
 assert.equal(parseOptions('?seg=-1&filas=100').rows,12);
});
