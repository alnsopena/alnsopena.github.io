import { useEffect, useState } from 'react';
import { dashboardDate, clockFormat, dateFormat, updateFormat, type ClockMode } from './dashboard-clock';

export function useDashboardTime(mode:ClockMode,cut?:string) {
 const [realNow,setRealNow]=useState(()=>new Date());
 useEffect(()=>{const timer=window.setInterval(()=>setRealNow(new Date()),1000);return()=>window.clearInterval(timer);},[]);
 return dashboardDate(mode,realNow,cut);
}

export function DashboardClock({now,updatedAt,error,tv=false}:{now:Date;updatedAt:number;error:string;tv?:boolean}) {
 return <div className={tv?'tv-clock':'dashboard-clock'} data-clock-date={now.toISOString()}>
  <time dateTime={now.toISOString()}>{clockFormat.format(now)} <small>PET</small></time>
  <span>{dateFormat.format(now)}</span>
  {tv&&<small className={error?'tv-update-error':''}>Última actualización {updatedAt?updateFormat.format(updatedAt):'pendiente'}</small>}
 </div>;
}
