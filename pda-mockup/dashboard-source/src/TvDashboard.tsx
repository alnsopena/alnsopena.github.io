import { useEffect, useState, type CSSProperties } from 'react';
import { OperationalTable } from './OperationalTable';
import { RANGE_CONFIG, sortByCriticality, type DashboardOptions, type Summary, type Vessel } from './dashboard-model';
import type { RuntimeState } from './tv-state';
import { DashboardClock } from './DashboardClock';
import { todayLabel } from './dashboard-clock';

export function TvDashboard({options,state,vessels,summary,now}:{options:DashboardOptions;state:RuntimeState;vessels:Vessel[];summary:Summary;now:Date}) {
 const [viewport,setViewport]=useState(()=>({width:innerWidth,height:innerHeight}));
 useEffect(()=>{const resize=()=>setViewport({width:innerWidth,height:innerHeight});window.addEventListener('resize',resize,{passive:true});return()=>window.removeEventListener('resize',resize);},[]);
 const ordered=sortByCriticality(vessels);
 const pageCount=Math.max(1,Math.ceil(ordered.length/options.rows));
 const currentPage=Math.min(state.page,pageCount-1);
 const rows=ordered.slice(currentPage*options.rows,(currentPage+1)*options.rows);
 const emptyRows=Math.max(0,options.rows-rows.length);
 return <main className={`tv-dashboard theme-${options.theme}`} style={{'--tv-rows':options.rows,'--tv-scale':Math.min(viewport.width/1920,viewport.height/1080)} as CSSProperties} data-mode="tv" data-site={options.site} data-page={currentPage+1} data-range={state.range} data-refresh-count={state.refreshes} data-page-deadline={state.deadline}>
  <header className="tv-brand-header"><div className="tv-identity"><img src="./cosmos-logo.svg" alt="COSMOS Global Logistics"/><div className="tv-site"><strong>{options.site==='paita'?'Paita':'Callao'}</strong><span>Control operativo</span></div></div><div className="tv-heading"><h1>Vista Operativa de Naves y Eventos Críticos</h1><p>Trazabilidad y control de operaciones marítimas</p></div><DashboardClock now={now} updatedAt={state.updatedAt} error={state.error} tv/></header>
  <section className="tv-kpis" aria-label="Indicadores del rango completo">
   <article className="tv-kpi neutral"><span>{state.range==='today'?'Naves Activas Hoy':'Naves en el rango'}</span><strong>{vessels.length}</strong></article>
   <article className="tv-kpi red"><span>Eventos Vencidos</span><strong>{summary.red}</strong></article>
   <article className="tv-kpi yellow"><span>Eventos por Vencer</span><strong>{summary.yellow}</strong></article>
   <article className="tv-kpi green"><span>Eventos en Plazo</span><strong>{summary.green}</strong></article>
  </section>
  <section className="tv-events" aria-label="Eventos operativos críticos">
   <div className="tv-section-heading"><h2>Eventos Operativos Críticos</h2><div className="tv-range-label">{state.range==='today'?todayLabel(now):RANGE_CONFIG[state.range].label}</div><strong className="tv-page-indicator">Página {currentPage+1} de {pageCount}</strong></div>
   <div className="tv-legend"><div><span><i className="legend-color red"/>Vencido / Fuera de Plazo</span><span><i className="legend-color yellow"/>Próximo a Vencer</span><span><i className="legend-color green"/>En Plazo</span><span><i className="legend-color neutral"/>Sin información</span></div><div><span><b className="execution-key">✓</b> Ejecutado</span><span><i className="legend-shape pending"/> Pendiente</span><span><b className="execution-key no-agent">-</b> Sin agente</span></div></div>
   <div className="tv-table-wrap" data-empty-rows={emptyRows}>
    {state.data?<OperationalTable vessels={rows} tv/>:<p className="tv-loading">Cargando datos demostrativos...</p>}
    {state.data&&!vessels.length&&<p className="tv-loading">No hay naves en este rango.</p>}
   </div>
  </section>
  <footer className="tv-footer"><span>Datos demostrativos, corte 05/08/2026</span><span>{summary.neutral} eventos sin información · {summary.executed} ejecutados · {summary.pending} pendientes</span><span className={state.error?'tv-update-error':''}>{state.error?'Actualización pendiente. Se conserva la última lectura.':'Lectura automática cada 5 min'}</span></footer>
 </main>;
}
