/* Shared calculation model: UI and printable document use these same results. */
(function(root){
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 function calc(row,pda){
  if(!row.enabled)return {net:0,tax:0,total:0,pending:false};
  if(row.templateManaged){const model=root.TemplateModel||(typeof require==='function'?require('./template-model.js'):null);if(model){const v=model.calculate(row,{...pda,containers:pda.containers||{}},pda.currency||'USD');return {...v,missing:v.pending};}}
  const factor=row.unit==='LOA × horas'?Number(pda.loa):row.unit==='TRG × cantidad'?Number(pda.grt):1;
  const missing=!String(row.rate??'').trim()||!String(row.qty??'').trim()||!Number.isFinite(Number(row.rate))||!Number.isFinite(Number(row.qty))||!Number.isFinite(factor)||factor<=0||Number(row.rate)<0||Number(row.qty)<0;
  const raw=missing?0:round(Number(row.rate)*Number(row.qty)*factor);
  const net=row.tax==='included'?round(raw/1.18):raw;
  const tax=row.tax==='included'?round(raw-net):row.tax==='excluded'?round(net*.18):0;
  return {net,tax,total:round(net+tax),pending:missing||row.tax==='pending',missing};
 }
 function totals(rows,pda){return rows.reduce((t,r)=>{const v=calc(r,pda);t.net=round(t.net+v.net);t.tax=round(t.tax+v.tax);t.total=round(t.total+v.total);t.pending+=Number(v.pending);return t;},{net:0,tax:0,total:0,pending:0});}
 const api={round,calc,totals}; if(typeof module!=='undefined')module.exports=api; else root.PDAEngine=api;
})(typeof window!=='undefined'?window:this);

