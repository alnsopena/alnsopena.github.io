import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const base=new URL('../tools/weekly-ppt/apps-script-dispatch/',import.meta.url);
const source=fs.readFileSync(new URL('Code.gs',base),'utf8')+'\n'+fs.readFileSync(new URL('Sync.gs',base),'utf8');
const id='11111111-2222-4333-8444-555555555555';
function setup({email='pmo@cosmos.com.pe',allowed='pmo@cosmos.com.pe',http=204}={}){
 const values=new Map([['PMO_ALLOWED_EMAILS',allowed],['GITHUB_DISPATCH_TOKEN','SECRET-TEST']]);
 const calls=[];
 const run={id:123,run_attempt:1,display_title:'PMO SYNC '+id,event:'workflow_dispatch',head_branch:'main',status:'queued',conclusion:null};
 const config={run,jobs:[]};
 const context=vm.createContext({Date,Number,JSON,Session:{getActiveUser:()=>({getEmail:()=>email})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>values.get(k),setProperty:(k,v)=>values.set(k,v),getProperties:()=>Object.fromEntries(values),deleteProperty:k=>values.delete(k)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},UrlFetchApp:{fetch:(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/dispatches'))return {getResponseCode:()=>http,getContentText:()=>JSON.stringify({workflow_run_id:123})};
  const response=url.includes('/jobs?')?{jobs:config.jobs}:url.includes('/actions/runs/')?config.run:{workflow_runs:[config.run]};
  return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(response)};
 }}});
 vm.runInContext(source,context);return {context,values,calls,config};
}
test('sync uses identity gate and starts only data sync, without a PPT or leaked credential',()=>{
 const {context,calls}=setup();const result=context.requestMondaySync(id);
 assert.equal(result.ok,true);assert.equal(result.phase,'queued');
 assert.deepEqual(JSON.parse(calls[0].options.payload),{ref:'main',inputs:{generate_ppt:'false',request_id:id}});
 assert.doesNotMatch(JSON.stringify(result),/SECRET-TEST|Bearer/);
 assert.equal(context.requestMondaySync(id).ok,true);assert.equal(calls.length,1,'Repeated request ID must not dispatch twice');
});
test('unauthorized identities and malformed request IDs cannot start a run or read its status',()=>{
 for(const options of [{email:''},{email:'x@example.com'},{email:'other@cosmos.com.pe'},{allowed:''}]){
  const {context,calls}=setup(options);assert.equal(context.requestMondaySync(id).ok,false);assert.equal(context.getMondaySyncStatus(id).ok,false);assert.equal(calls.length,0);
 }
 const {context,calls}=setup();assert.equal(context.requestMondaySync('bad-id').ok,false);assert.equal(calls.length,0);
});
test('204 resolves the unique sync run and reports queued, running, publishing and published separately',()=>{
 const {context,config}=setup();context.requestMondaySync(id);
 assert.equal(context.getMondaySyncStatus(id).phase,'queued');
 config.run.status='in_progress';assert.equal(context.getMondaySyncStatus(id).phase,'running');
 config.jobs=[{name:'deploy',status:'in_progress'}];assert.equal(context.getMondaySyncStatus(id).phase,'publishing');
 config.run.status='completed';config.run.conclusion='success';assert.equal(context.getMondaySyncStatus(id).phase,'published');
 config.run.conclusion='failure';assert.equal(context.getMondaySyncStatus(id).phase,'failed');
});
test('a different run cannot complete the request and rejected dispatches are not stored',()=>{
 const {context,config}=setup({http:200});context.requestMondaySync(id);config.run.display_title='PMO PPT '+id;
 assert.equal(context.getMondaySyncStatus(id).phase,'retrying');
 const denied=setup({http:403});assert.equal(denied.context.requestMondaySync(id).ok,false);assert.equal(denied.values.has('SYNC_REQUEST_'+id),false);
});
const clientContext={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../portafolio-ejecutivo-it/assets/js/monday-sync.js',import.meta.url),'utf8'),clientContext);
const {matches,serviceOrigin}=clientContext.module.exports;
test('only the exact published request, run and attempt can finish the visual synchronization',()=>{
 const request={id,runId:'123',runAttempt:'1',verified:true};
 const cut={board_id:'18396270726',items:[{id:'one'}],extracted_at_utc:'2026-10-20T16:00:00Z',publication:{request_id:id,run_id:'123',run_attempt:'1'}};
 assert.equal(matches(cut,request),true);
 assert.equal(matches(cut,{...request,verified:false}),false,'A briefly visible cut cannot finish before the workflow verifies its publication');
 for(const publication of [{...cut.publication,request_id:'other'},{...cut.publication,run_id:'456'},{...cut.publication,run_attempt:'2'}])assert.equal(matches({...cut,publication},request),false);
 assert.equal(matches({...cut,items:[]},request),false);assert.equal(matches({...cut,board_id:'another'},request),false);
 assert.equal(matches({...cut,extracted_at_utc:'invalid'},request),false);
 assert.equal(serviceOrigin('https://n-abc-script.googleusercontent.com'),true);
 assert.equal(serviceOrigin('https://script.googleusercontent.com.evil.test'),false);
 assert.equal(serviceOrigin('https://evil.test'),false);
});
