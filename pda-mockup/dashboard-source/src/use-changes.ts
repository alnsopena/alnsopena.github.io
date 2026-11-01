import { useEffect, useState } from 'react';
export function useChanges(embedded:boolean,tv:boolean) {
  const [enabled,setEnabled]=useState(()=>{try{return !tv&&localStorage.getItem('pdaChg')!=='0';}catch{return !tv;}});
  useEffect(()=>{
    document.body.classList.toggle('chg-on',enabled&&!tv);
    const onMessage=(event:MessageEvent)=>{
      if(embedded && event.source===parent && event.origin===location.origin && event.data?.type==='cosmos-dashboard-changes' && typeof event.data.enabled==='boolean') setEnabled(event.data.enabled);
    };
    const onStorage=(event:StorageEvent)=>{if(event.key==='pdaChg'&&!tv) setEnabled(event.newValue!=='0');};
    window.addEventListener('message',onMessage); window.addEventListener('storage',onStorage);
    if(embedded&&!tv) parent.postMessage({type:'cosmos-dashboard-ready'},location.origin);
    return()=>{window.removeEventListener('message',onMessage);window.removeEventListener('storage',onStorage);};
  },[embedded,enabled,tv]);
  const toggle=()=>{
    if(tv) return;
    const next=!enabled;
    setEnabled(next);
    try{localStorage.setItem('pdaChg',next?'1':'0');}catch{}
    if(embedded) parent.postMessage({type:'cosmos-dashboard-set-changes',enabled:next},location.origin);
  };
  return {enabled:enabled&&!tv,toggle};
}
