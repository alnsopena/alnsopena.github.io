import { mkdirSync, writeFileSync } from 'node:fs';
import { INITIAL_VESSELS } from '../src/seed-vessels.ts';
import { EVENT_KEYS, getRange, summarize, type Vessel, type SiteKey, type RangeKey } from '../src/dashboard-model.ts';
import { DEMO_NOW, type OperationalEvent } from '../src/event-status.ts';

// Independent fictional fleets. The original v3 cases remain in Callao.
const callaoNames = ['PACIFIC','OCEAN','CAPE','BALTIC','ATLANTIC','ANDES','SILVER','CORAL','NORD','SEA','BLUE','SOUTHERN']
 .flatMap(prefix=>['HORIZON','MERIDIAN','LIBERTY','TRADER','SPIRIT','HARMONY','GLORY','FRONTIER','VALOUR','FORTUNE','BRIDGE','SAPPHIRE','DAWN','VOYAGER','HERITAGE'].map(suffix=>`${prefix} ${suffix}`))
 .filter(name=>!INITIAL_VESSELS.some(v=>v.name===name));
const paitaNames = ['NORTHERN','HUMBOLDT','TROPICAL','COSTA NORTE','TALLAN','MANCORA']
 .flatMap(prefix=>['CONDOR','BREEZE','ORCHID','DOLPHIN','PEARL','REEFER','NAVIGATOR','TRIUMPH','ORION','VENTURE'].map(suffix=>`${prefix} ${suffix}`));
const clients=['Pacific Shipping Lines','Andes Bulk Carriers','Meridian Maritime','Southern Ocean Logistics','Baltic Chartering','Coral Container Lines'];
const minute=60000;
const cut=DEMO_NOW.getTime();
const stamp=(milliseconds:number)=>new Date(milliseconds-5*3600000).toISOString().slice(0,19)+'-05:00';
type Color='red'|'yellow'|'green';

function eventFor(color:Color|undefined, row:number, column:number):OperationalEvent {
 if(!color) return {deadline:null,warningHours:6,source:'SION (demostrativo)'};
 const offset=(row*137+column*53)%4200;
 const executed=(row+column)%3===0;
 let deadline=cut+(color==='red'?-(90+offset):color==='yellow'?30+(row*23+column*11)%290:600+offset)*minute;
 let transmittedAt:string|undefined;
 if(executed&&color!=='yellow') {
  if(color==='green') deadline=cut-(180+offset)*minute;
  transmittedAt=stamp(deadline+(color==='red'?17+(row*7)%53:-(20+(row*11)%97))*minute);
 }
 return {deadline:stamp(deadline),warningHours:6,source:'SION (demostrativo)',...(transmittedAt?{transmittedAt,confirmed:true}:{})};
}

function eventsFor(colors:Color[],row:number):Vessel['events'] {
 // Rotate positions and execution states so neighboring rows do not repeat patterns.
 const events={} as Vessel['events'];
 EVENT_KEYS.forEach((key,column)=>events[key]=eventFor(colors[(column+row*3)%5],row,column));
 return events;
}

function demoVessel(site:SiteKey,index:number,range:RangeKey,colors:Color[],allGray=false):Vessel {
 const paita=site==='paita';
 const name=(paita?paitaNames:callaoNames)[index];
 const sequence=range==='today'?index:(range==='past'?index-48:index-52);
 const local=range==='today'?(paita?index-28:index-102):sequence;
 const arrival=range==='past'?Date.parse('2026-07-23T03:10:00-05:00')+sequence*47*3600000:
  range==='upcoming'?cut+(30+sequence*43)*3600000:
  Date.parse(paita?'2026-08-02T01:10:00-05:00':'2026-08-01T03:17:00-05:00')+local*(paita?239:83)*minute+(local*17%41)*minute;
 const departure=range==='past'?arrival+(29+sequence*5)*3600000:
  range==='upcoming'?arrival+(22+sequence*7)*3600000:
  cut+(paita?4+(local*13)%70:2+(local*37)%120)*3600000+(local*19%59)*minute;
 const voyage=String((paita?240:118)+index*3%330).padStart(3,'0');
 return {id:`${site}-${range}-${String(index+1).padStart(3,'0')}`,site,name,
  voyage:index%4===0?`${voyage}S/${Number(voyage)+1}N`:`${voyage}${['S','N','E','W'][index%4]}`,
  port:paita?'Paita':'Callao',range,
  eta:allGray?'':stamp(arrival-(30+index*17%150)*minute),
  ...(allGray||range==='upcoming'?{}:{ata:stamp(arrival)}),
  etd:allGray?'':stamp(departure),...(range==='past'?{sailing:stamp(departure+23*minute)}:{}),
  status:allGray?'Sin información':range==='past'?'Zarpada':range==='upcoming'?'Programada':['Atracada','Fondeada','En espera de descarga','En maniobra'][index%4],
  client:clients[(index+(paita?2:0))%clients.length],
  agent:allGray&&index%17===0?null:`COSMOS Agencia Marítima - ${paita?'Paita':'Callao'}`,
  events:eventsFor(colors,index+(paita?97:0))};
}

const vesselList:Vessel[]=INITIAL_VESSELS.map(v=>({...structuredClone(v),site:'callao',range:getRange(v)}));
// Callao keeps the observed 179 rows and 84.25% gray composition.
for(let i=0;i<172;i++) {
 const local=i-102;
 const count=i<102?0:local<41?2:1;
 // Interleave eight green events among 103 reds, instead of a uniform trailing block.
 const colors:Array<Color>=[];
 for(let k=0;k<count;k++) {
  const colorIndex=local<41?local*2+k:82+local-41;
  colors.push([4,18,33,49,61,77,92,107].includes(colorIndex)?'green':'red');
 }
 vesselList.push(demoVessel('callao',i,'today',colors,i<102));
}
// Paita is a smaller independent demo: 48 present, four departed, six scheduled.
// 202/240 gray cells (84.17%). Color KPIs differ from Callao: 21 red, 4 yellow, 13 green.
const paitaPalette:Color[]=Array.from({length:38},(_,i)=>[2,11,20,29].includes(i)?'yellow':i%3===0?'green':'red');
let paitaColor=0;
for(let i=0;i<48;i++) {
 const count=i<28?0:i<46?2:1;
 vesselList.push(demoVessel('paita',i,'today',paitaPalette.slice(paitaColor,paitaColor+count),i<28));
 paitaColor+=count;
}
for(let i=48;i<58;i++) vesselList.push(demoVessel('paita',i,i<52?'past':'upcoming',i%3===0?[]:i%2===0?['green','red']:['yellow','green']));

const payload={schemaVersion:1,cut:DEMO_NOW.toISOString(),demonstrative:true,
 referenceMeasurement:{source:'Conteo agregado de la UI de certificación, 01/11/2026, rango Hoy',rows:179,eventCells:895,neutralCells:754,allGrayRows:103,scope:'Referencia de composición visual de Callao. Paita es una simulación independiente, sin volumen real certificado.'},vessels:vesselList};
mkdirSync(new URL('../public/data/',import.meta.url),{recursive:true});
writeFileSync(new URL('../public/data/dashboard-demo.json',import.meta.url),JSON.stringify(payload,null,2)+'\n');
for(const site of ['callao','paita'] as const) {
 const rows=vesselList.filter(v=>v.site===site&&getRange(v)==='today');
 console.log(JSON.stringify({site,today:rows.length,...summarize(rows)}));
}
