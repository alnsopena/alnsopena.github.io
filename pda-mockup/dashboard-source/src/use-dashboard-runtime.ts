import { useCallback, useEffect, useReducer } from 'react';
import { readManualRecords } from './manual-storage.ts';
import { EVENT_KEYS, type DashboardOptions, type Snapshot, type Vessel } from './dashboard-model.ts';
import { initialRuntime, reduceRuntime } from './tv-state.ts';

export function validateSnapshot(value:unknown):Snapshot {
  const d=value as Snapshot;
  if(d?.schemaVersion!==1 || !Array.isArray(d.vessels) || !d.vessels.length) throw new Error('Datos de dashboard no válidos.');
  const ids=new Set<string>();
  for(const v of d.vessels) {
    if(!v?.id || ids.has(v.id) || !['callao','paita'].includes(v.site) || !v.name || !v.voyage || !v.events ||
      !EVENT_KEYS.every(k=>v.events[k] && (v.events[k].deadline===null || Number.isFinite(Date.parse(v.events[k].deadline!))))) throw new Error('Registro de nave no válido.');
    ids.add(v.id);
  }
  return d;
}

export function useDashboardRuntime(options:DashboardOptions) {
  const [state,dispatch]=useReducer((s:ReturnType<typeof initialRuntime>,a:Parameters<typeof reduceRuntime>[1])=>reduceRuntime(s,a,options),options,initialRuntime);
  const reload=useCallback(async(signal?:AbortSignal)=>{
    try {
      const response=await fetch(new URL('./data/dashboard-demo.json',location.href),{cache:'no-store',signal});
      if(!response.ok) throw new Error('No se pudo actualizar la información. Se conserva la última lectura disponible.');
      const source=validateSnapshot(await response.json());
      let records={};
      try { records=readManualRecords(localStorage,source.vessels.map(v=>v.id)).records; } catch { /* The form handles unavailable storage explicitly. */ }
      const vessels=source.vessels.map(v=>{
        const record=records[v.id as keyof typeof records] as {transmittedAt:string;confirmed:boolean}|undefined;
        return record?{...v,events:{...v.events,manifest:{...v.events.manifest,...record,manual:true,source:'Registro manual / SDA'}}}:v;
      });
      dispatch({type:'loaded',data:{...source,vessels},now:Date.now()});
    } catch(error) {
      if((error as Error).name!=='AbortError') dispatch({type:'error',message:(error as Error).message});
    }
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    void reload(controller.signal);
    const timer=setInterval(()=>void reload(controller.signal),300000);
    const onStorage=(e:StorageEvent)=>{if(e.key==='cosmos-dashboard-operativo-v3:manual:v1') void reload(controller.signal);};
    window.addEventListener('storage',onStorage);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener('storage',onStorage);};
  },[reload]);
  useEffect(()=>{
    if(!options.tv) return;
    const timer=setInterval(()=>dispatch({type:'tick',now:Date.now()}),250);
    return()=>clearInterval(timer);
  },[options.tv]);
  return {state,reload,setRange:(range:typeof state.range)=>dispatch({type:'range',range,now:Date.now()}),
    setVessels:(vessels:Vessel[])=>{if(state.data) dispatch({type:'loaded',data:{...state.data,vessels},now:Date.now()});}};
}
