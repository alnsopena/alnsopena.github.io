import { nextRange, selectVessels, type Snapshot, type RangeKey, type DashboardOptions } from './dashboard-model.ts';
export type RuntimeState={data:Snapshot|null;pending:{data:Snapshot;stamp:number;signature:string}|null;signature:string;range:RangeKey;page:number;deadline:number;updatedAt:number;error:string;refreshes:number};
export function initialRuntime(options:DashboardOptions):RuntimeState {
  return {data:null,pending:null,signature:'',range:options.range,page:0,deadline:0,updatedAt:0,error:'',refreshes:0};
}
export type Action={type:'loaded';data:Snapshot;now:number}|{type:'tick';now:number}|{type:'range';range:RangeKey;now:number}|{type:'error';message:string};
export function reduceRuntime(state:RuntimeState,action:Action,options:DashboardOptions):RuntimeState {
  if(action.type==='error') return {...state,error:action.message};
  if(action.type==='range') return {...state,range:action.range,page:0,deadline:action.now+options.seconds*1000};
  if(action.type==='loaded') {
    const signature=JSON.stringify(action.data);
    if(!state.data || !options.tv) return {...state,data:action.data,signature,pending:null,updatedAt:action.now,error:'',refreshes:state.refreshes+1,deadline:state.deadline||action.now+options.seconds*1000};
    // A refresh never changes the active page, its rows or its scheduled deadline.
    if(signature===state.signature) return {...state,pending:null,updatedAt:action.now,error:'',refreshes:state.refreshes+1};
    return {...state,pending:{data:action.data,stamp:action.now,signature},error:'',refreshes:state.refreshes+1};
  }
  if(!options.tv || !state.data || action.now<state.deadline) return state;
  const count=Math.max(1,Math.ceil(selectVessels(state.data,options.site,state.range).length/options.rows));
  const completed=state.page+1>=count;
  // Changed rows/order are committed only at a natural cycle boundary.
  const update=completed?state.pending:null;
  return {...state,page:completed?0:state.page+1,range:completed&&options.rotate?nextRange(state.range):state.range,
    data:update?.data??state.data,signature:update?.signature??state.signature,pending:completed?null:state.pending,
    updatedAt:update?.stamp??state.updatedAt,deadline:action.now+options.seconds*1000};
}
