import {Check,ChevronRight,LoaderCircle,Minus,AlertCircle,Calculator,FileSearch,PenLine,Wrench} from 'lucide-react';
import type {ToolCall,ToolResult} from '@jot/agent';
export type ToolEntry=ToolCall&{result?:ToolResult;startedAt?:number;finishedAt?:number};
const names:Record<string,{label:string;active:string;icon:typeof Calculator}>={
 calculate:{label:'Calculation',active:'Calculating',icon:Calculator},
 read_context:{label:'Conversation',active:'Reading conversation',icon:FileSearch},
 compose_reply:{label:'Reply',active:'Writing reply',icon:PenLine},
};
function summary(call:ToolEntry){
 if(call.name==='calculate'){
  const signs:Record<string,string>={add:'+',subtract:'−',multiply:'×',divide:'÷'};
  return `${call.arguments.left} ${signs[call.arguments.operator]??call.arguments.operator} ${call.arguments.right}${call.result?.text?` = ${call.result.text}`:''}`;
 }
 if(call.result?.status==='error')return call.result.error??'Tool failed';
 if(call.name==='read_context')return call.result?.text??'Looking for an exact answer';
 if(call.name==='compose_reply')return call.result?.text?'Reply prepared':'Using the conversation and tool results';
 return call.result?.text??Object.values(call.arguments).join(' · ');
}
export function ToolCalls({calls,status}:{calls:ToolEntry[];status?:string}){
 return <div className="tool-activity" aria-label="Tool calls">
  {calls.map(call=>{
   const running=!call.result&&status==='writing';
   const failed=call.result?.status==='error';
   const interrupted=!call.result&&!running||!!call.result?.reason&&call.result.reason!=='complete';
   const info=names[call.name]??{label:call.name,active:call.name,icon:Wrench},Icon=info.icon;
   const state=running?'Running':failed?'Failed':interrupted?'Stopped':'Completed';
   const duration=call.startedAt!==undefined&&call.finishedAt!==undefined?Math.max(0,call.finishedAt-call.startedAt):null;
   return <details className={`tool-row ${running?'running':failed?'failed':interrupted?'stopped':'completed'}`} key={call.id}>
    <summary aria-label={`${info.label}: ${summary(call)} — ${state}`}>
     <span className="tool-state" title={state}>{running?<LoaderCircle size={13}/>:failed?<AlertCircle size={13}/>:interrupted?<Minus size={13}/>:<Check size={13}/>}</span>
     <span className="tool-name">{running?info.active:info.label}</span>
     <span className="tool-summary">{summary(call)}</span>
     {duration!==null&&<span className="tool-duration">{(duration/1000).toFixed(1)}s</span>}
     <ChevronRight size={12} className="tool-chevron"/>
    </summary>
    <div className="tool-body">
     <div className="tool-kind"><Icon size={13}/><code>{call.name}</code><span>{state}</span></div>
     {Object.keys(call.arguments).length>0&&<dl>{Object.entries(call.arguments).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
     {call.result?<div className="tool-output"><span>{failed?'Error':'Result'}</span><pre>{call.result.text??call.result.error??'No output'}</pre></div>:<p className="tool-pending">{running?'Waiting for the tool result.':'This tool call was interrupted.'}</p>}
    </div>
   </details>;
  })}
 </div>;
}
