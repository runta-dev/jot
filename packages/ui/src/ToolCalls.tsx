import {useEffect,useId,useState} from 'react';
import {ChevronRight,SquareTerminal,FileSearch,PenLine,Wrench} from 'lucide-react';
import type {ToolCall,ToolResult} from '@jot/agent';
export type ToolEntry=ToolCall&{result?:ToolResult;startedAt?:number;finishedAt?:number};
const icons:Record<string,typeof SquareTerminal>={calculate:SquareTerminal,read_context:FileSearch,compose_reply:PenLine};
function invocation(call:ToolEntry){
 if(call.name==='calculate'){
  const signs:Record<string,string>={add:'+',subtract:'−',multiply:'×',divide:'÷'};
  return `${call.name}(${call.arguments.left} ${signs[call.arguments.operator]??call.arguments.operator} ${call.arguments.right})`;
 }
 return `${call.name}(${Object.entries(call.arguments).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join(', ')})`;
}
function time(ms:number){const seconds=Math.max(0,Math.floor(ms/1000));return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;}
export function ToolCalls({calls,status,elapsedMs}:{calls:ToolEntry[];status?:string;elapsedMs?:number}){
 const working=status==='writing';
 const groupId=useId();
 const [expanded,setExpanded]=useState(working);
 useEffect(()=>setExpanded(working),[working]);
 const measured=Math.max(0,elapsedMs??0,...calls.map(c=>c.finishedAt??c.startedAt??0));
 const [liveElapsed,setLiveElapsed]=useState(measured);
 useEffect(()=>{
  setLiveElapsed(measured);
  if(!working)return;
  const started=Date.now();const timer=setInterval(()=>setLiveElapsed(measured+Date.now()-started),1000);
  return ()=>clearInterval(timer);
 },[working,measured]);
 if(!calls.length)return null;
 const elapsed=working?liveElapsed:measured;
 const label=working?(elapsed<1000?'Working':`Working for ${time(elapsed)}`):status==='stopped'?`Stopped after ${time(elapsed)}`:status==='error'?`Failed after ${time(elapsed)}`:elapsed>0?`Worked for ${time(elapsed)}`:'Worked';
 return <section className="tool-activity" aria-label="Tool calls">
  <button type="button" className="tool-work-status" aria-expanded={expanded} aria-controls={groupId} onClick={()=>setExpanded(value=>!value)}>
   <span aria-live="off">{label}</span><ChevronRight size={14} strokeWidth={1.5} className="tool-group-chevron" aria-hidden="true"/>
  </button>
  <div id={groupId} className={`tool-disclosure ${expanded?'is-expanded':''}`} aria-hidden={!expanded} inert={!expanded}>
  <div className="tool-disclosure-inner">
  <div className="tool-list">
   {(working ? [...calls.filter(call=>!call.result),...calls.filter(call=>call.result)] : calls).map(call=>{
    const running=!call.result&&working;
    const failed=call.result?.status==='error';
    const stopped=(!call.result&&!running)||(!!call.result?.reason&&call.result.reason!=='complete');
    const state=running?'Running':failed?'Failed':stopped?'Stopped':'Completed';
    const verb=running?'Running':failed?'Failed':stopped?'Stopped':'Ran';
    const command=invocation(call),Icon=icons[call.name]??Wrench;
    const duration=call.startedAt!==undefined&&call.finishedAt!==undefined?Math.max(0,call.finishedAt-call.startedAt):null;
    return <details className={`tool-row ${state.toLowerCase()}`} key={`${call.id}-${working?"active":"settled"}`}>
     <summary aria-label={`${verb} ${command} — ${state}`} title={`${verb} ${command}`}>
      <Icon className="tool-icon" size={16} strokeWidth={1.5} aria-hidden="true"/>
      <span className="tool-summary"><span className="tool-action">{verb}</span>{' '}{command}</span>
      <ChevronRight size={14} strokeWidth={1.5} className="tool-chevron" aria-hidden="true"/>
     </summary>
     <div className="tool-body">
      <div className="tool-kind"><code>{call.name}</code><span>{state}{duration!==null?` · ${(duration/1000).toFixed(1)}s`:''}</span></div>
      {Object.keys(call.arguments).length>0&&<dl>{Object.entries(call.arguments).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
      {call.result?<div className="tool-output"><span>{failed?'Error':'Result'}</span><pre>{call.result.text??call.result.error??'No output'}</pre></div>:<p className="tool-pending">{running?'Waiting for the tool result.':'This tool call was interrupted.'}</p>}
     </div>
    </details>;
   })}
  </div>
  </div>
  </div>
 </section>;
}
