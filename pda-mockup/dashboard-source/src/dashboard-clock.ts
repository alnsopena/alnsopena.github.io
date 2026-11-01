export type ClockMode='demo'|'real';
export const DEMO_CUT='2026-08-05T10:30:00-05:00';
// Keep the cut's calendar day and the current running time in Lima. No timer affects data or paging.
export function dashboardDate(mode:ClockMode,realNow:Date,cut=DEMO_CUT):Date {
 if(mode==='real') return new Date(realNow);
 const limaNow=new Date(realNow.getTime()-5*3600000);
 const day=cut.slice(0,10).split('-').map(Number);
 return new Date(Date.UTC(day[0],day[1]-1,day[2],limaNow.getUTCHours()+5,limaNow.getUTCMinutes(),limaNow.getUTCSeconds(),limaNow.getUTCMilliseconds()));
}
export const clockFormat=new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Lima'});
export const dateFormat=new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Lima'});
export const updateFormat=new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'});
export function todayLabel(now:Date) {
 const day=new Intl.DateTimeFormat('es-PE',{day:'numeric',timeZone:'America/Lima'}).format(now);
 const month=new Intl.DateTimeFormat('es-PE',{month:'long',timeZone:'America/Lima'}).format(now).toLocaleUpperCase('es-PE');
 return `HOY ${day} de ${month}`;
}
