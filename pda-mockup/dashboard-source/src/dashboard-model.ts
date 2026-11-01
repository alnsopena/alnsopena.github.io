import { DEMO_NOW, evaluateEvent, type OperationalEvent, type EventPresentation } from './event-status.ts';

export type RangeKey = 'past' | 'today' | 'upcoming';
export type EventKey = 'manifest' | 'arrivalNotice' | 'dischargeEnd' | 'loadAuthorization' | 'boardingEnd';
export type SiteKey = 'callao' | 'paita';
export type Vessel = {
  id: string; name: string; voyage: string; port: string; site: SiteKey; client?:string;
  eta: string; ata?: string; etd: string; sailing?: string; range?: RangeKey;
  status: string; agent: string | null; staleEstimate?: boolean;
  events: Record<EventKey, OperationalEvent>;
};
export type Snapshot = { schemaVersion: 1; cut: string; vessels: Vessel[] };
export const EVENT_KEYS: EventKey[] = ['manifest', 'arrivalNotice', 'dischargeEnd', 'loadAuthorization', 'boardingEnd'];
export const EVENT_CONFIG: Record<EventKey, {label: string; shortLabel: string; rule: string}> = {
  manifest: {label:'Numeración de manifiesto',shortLabel:'N° Manifiesto',rule:'Fecha límite: ETA - 7 días'},
  arrivalNotice: {label:'Aviso de llegada y solicitud de descarga',shortLabel:'Aviso Llegada',rule:'Fecha límite: ATA / amarre + 1 hora'},
  dischargeEnd: {label:'Término de descarga',shortLabel:'Término Descarga',rule:'Fecha límite: fin de descarga + 6 horas'},
  loadAuthorization: {label:'Autorización de carga',shortLabel:'Autorización Carga',rule:'Umbral de demostración; pendiente de validación COSMOS'},
  boardingEnd: {label:'Término de embarque',shortLabel:'Término Embarque',rule:'Umbral de demostración; pendiente de validación COSMOS'},
};
export const RANGE_CONFIG: Record<RangeKey,{label:string;eyebrow:string;description:string}> = {
  past:{label:'Últimas 2 Semanas',eyebrow:'Sailing registrado',description:'Sailing dentro de los 14 días previos al corte operativo.'},
  today:{label:'HOY 5 de AGOSTO',eyebrow:'Arrival sin sailing',description:'Arrival registrado sin sailing. Se incluyen registros sin fechas asignados a este rango por la fuente.'},
  upcoming:{label:'Próximas 2 Semanas',eyebrow:'Sin arrival',description:'Sin arrival, con ETA en los próximos 14 días.'},
};
export function getRange(vessel: Pick<Vessel, 'range' | 'sailing' | 'ata'>): RangeKey {
  return vessel.range ?? (vessel.sailing ? 'past' : vessel.ata ? 'today' : 'upcoming');
}
export function inRange(vessel: Vessel, range: RangeKey): boolean {
  if (getRange(vessel) !== range) return false;
  if (vessel.range || range === 'today') return true;
  const date = Date.parse(range === 'past' ? vessel.sailing! : vessel.eta);
  const delta = (date - DEMO_NOW.getTime()) / 86400000;
  return Number.isFinite(date) && (range === 'past' ? delta >= -14 && delta <= 0 : delta >= 0 && delta <= 14);
}
export function getPresentation(vessel: Vessel, event: OperationalEvent): EventPresentation {
  return evaluateEvent({hasAgent:Boolean(vessel.agent),vesselStatus:vessel.status,staleEstimate:Boolean(vessel.staleEstimate),event});
}
const shortDate = new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'});
const detailDate = new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'});
export const formatDateTime = (value?: string | null) => value ? detailDate.format(new Date(value)).replace('.','') : 'Sin información';
export const formatTableDate = (value?: string) => value ? shortDate.format(new Date(value)) : '-';
export function getIndicatorTitle(vessel: Vessel,key: EventKey,presentation: EventPresentation) {
  const event=vessel.events[key];
  return `${EVENT_CONFIG[key].label}: ${presentation.stateLabel}, ${presentation.timingLabel}. ${event.transmittedAt ? `Transmisión: ${formatDateTime(event.transmittedAt)}.` : 'Sin transmisión.'}`;
}
export function selectVessels(data: Snapshot | null,site:SiteKey,range:RangeKey) {
  return data?.vessels.filter(v=>v.site===site && inRange(v,range)) ?? [];
}
const priority = {red:0,yellow:1,green:2,neutral:3};
export function vesselPriority(vessel:Vessel) {
  return Math.min(...EVENT_KEYS.map(k=>priority[getPresentation(vessel,vessel.events[k]).color]));
}
export function sortByCriticality(vessels:Vessel[]) {
  return [...vessels].sort((a,b)=>vesselPriority(a)-vesselPriority(b) ||
    (Date.parse(a.eta)||Infinity)-(Date.parse(b.eta)||Infinity) ||
    a.name.localeCompare(b.name,'es') || a.voyage.localeCompare(b.voyage) || a.id.localeCompare(b.id));
}
export function summarize(vessels:Vessel[]) {
  const counts={green:0,yellow:0,red:0,neutral:0,pending:0,executed:0,alerts:0};
  for(const vessel of vessels) {
    if(vessel.staleEstimate) counts.alerts++;
    for(const key of EVENT_KEYS) {
      const p=getPresentation(vessel,vessel.events[key]); counts[p.color]++;
      if(p.color!=='neutral') counts[p.executed?'executed':'pending']++;
    }
  }
  return counts;
}
export type Summary = ReturnType<typeof summarize>;
export type DashboardOptions = {tv:boolean;site:SiteKey;range:RangeKey;seconds:number;rows:number;rotate:boolean;theme:'claro'|'navy';clock:'demo'|'real'};
export function parseOptions(search:string):DashboardOptions {
  const p=new URLSearchParams(search);
  const ranges:Record<string,RangeKey>={hoy:'today',ultimas:'past',proximas:'upcoming'};
  const bounded=(key:string,fallback:number,min:number,max:number)=>{const v=Number(p.get(key));return p.has(key)&&Number.isFinite(v)?Math.max(min,Math.min(max,Math.floor(v))):fallback;};
  return {tv:p.get('modo')==='tv',site:p.get('sede')==='paita'?'paita':'callao',range:ranges[p.get('rango')??'hoy']??'today',seconds:bounded('seg',15,1,300),rows:bounded('filas',12,5,12),rotate:p.get('rotar')==='1',theme:p.get('tema')==='claro'?'claro':'navy',clock:p.get('fecha')==='real'?'real':'demo'};
}
export const nextRange=(range:RangeKey):RangeKey=>({past:'today',today:'upcoming',upcoming:'past'} as const)[range];
export function makeTvUrl(options:DashboardOptions,range:RangeKey) {
  const p=new URLSearchParams({modo:'tv',sede:options.site,rango:({past:'ultimas',today:'hoy',upcoming:'proximas'} as const)[range],seg:'15',tema:'navy',v:'v36',...(options.clock==='real'?{fecha:'real'}:{})});
  return `./?${p}`;
}
