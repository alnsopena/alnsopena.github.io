import { EVENT_CONFIG, EVENT_KEYS, formatTableDate, getIndicatorTitle, getPresentation, type Vessel, type EventKey } from './dashboard-model';

function DateValue({value,label,tv}:{value?:string;label:string;tv:boolean}) {
 const [date,time]=formatTableDate(value).split(', ');
 return tv?<><span>{label} {date}</span><strong>{time||' '}</strong></>:<><span>{label}</span><strong>{formatTableDate(value)}</strong></>;
}

export function OperationalTable({vessels,tv=false,onSelect}:{vessels:Vessel[];tv?:boolean;onSelect?:(vesselId:string,eventKey:EventKey)=>void}) {
 return <table className={tv?'operational-table tv-table':'operational-table'}>
  <colgroup><col className="col-vessel"/><col className="col-voyage"/><col className="col-port"/><col className="col-date"/><col className="col-date"/>{EVENT_KEYS.map(k=><col className="col-event" key={k}/>)}</colgroup>
  <thead><tr><th scope="col">Nave</th><th scope="col">Viaje</th><th scope="col">Puerto</th><th scope="col">ETA/ATA</th><th scope="col">ETD</th>{EVENT_KEYS.map(k=><th scope="col" key={k}>{EVENT_CONFIG[k].shortLabel}</th>)}</tr></thead>
  <tbody>{vessels.map(vessel=><tr key={vessel.id} data-vessel-id={vessel.id} className={vessel.staleEstimate?'row-alert':undefined}>
   <td><div className="vessel-cell" data-chg={tv?undefined:'CAMBIADO'} data-change-id="estado-nave"><strong>{vessel.name}</strong><span>{tv&&vessel.staleEstimate?`${vessel.status}, estimado vencido`:tv&&!vessel.agent?'Sin agente marítimo':vessel.status}</span>{!tv&&!vessel.agent&&<em className="no-agent-pill" data-chg="CAMBIADO">Sin agente marítimo</em>}</div></td>
   <td className="mono-cell">{vessel.voyage}</td><td>{vessel.port}</td>
   <td><div className="date-stack" data-chg={tv?undefined:'CAMBIADO'} data-change-id="fechas"><DateValue value={vessel.ata||vessel.eta} label={vessel.ata?'ATA':'ETA'} tv={tv}/></div></td>
   <td><div className="date-stack" data-chg={tv?undefined:'CAMBIADO'}><DateValue value={vessel.sailing||vessel.etd} label={vessel.sailing?'SAILING':'ETD'} tv={tv}/>{vessel.staleEstimate&&!tv&&<em className="estimate-alert" data-chg="NUEVO">Estimado vencido</em>}</div></td>
   {EVENT_KEYS.map(key=>{
     const p=getPresentation(vessel,vessel.events[key]);
     const indicator=<span className={`status-indicator ${p.color} ${p.executed?'executed':'pending'} ${vessel.agent?'has-agent':'without-agent'}`} aria-hidden="true">{p.color==='neutral'?(vessel.agent?'':'-'):p.executed?'✓':''}</span>;
     return <td className="event-cell" key={key}>{tv?<span className="tv-event" role="img" aria-label={getIndicatorTitle(vessel,key,p)}>{indicator}</span>:<button className="event-button" data-chg="NUEVO" data-change-id="ejecucion" onClick={()=>onSelect?.(vessel.id,key)} title={getIndicatorTitle(vessel,key,p)} aria-label={getIndicatorTitle(vessel,key,p)} type="button">{indicator}</button>}</td>;
   })}
  </tr>)}</tbody>
 </table>;
}
