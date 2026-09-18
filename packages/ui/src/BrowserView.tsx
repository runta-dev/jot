import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,RotateCw,Globe,LoaderCircle,Square,X} from 'lucide-react';
import {browserAddress} from './browser-address';
import {browserFrames} from './browser-frames';
import {remoteKey} from './browser-keyboard';
import type {BrowserEvent,BrowserFrame,BrowserInput,BrowserStatus} from '@jot/browser/types';
const idle:BrowserStatus={state:'idle',url:'about:blank',title:'',loading:false};
export function BrowserView({chatId,active,onTakeOver}:{chatId:string;active:boolean;onTakeOver:()=>void}){
 const [status,setStatus]=useState<BrowserStatus>(idle),[hasFrame,setHasFrame]=useState(false),[address,setAddress]=useState(''),[error,setError]=useState('');
 const screen=useRef<HTMLDivElement>(null),image=useRef<HTMLCanvasElement>(null),frame=useRef<BrowserFrame|undefined>(undefined),keyboard=useRef<HTMLTextAreaElement>(null),addressInput=useRef<HTMLInputElement>(null);
 const editingAddress=useRef(false),pendingAddress=useRef<string|null>(null),latestStatus=useRef<BrowserStatus>(idle);
 const composing=useRef(false),lifetime=useRef(new AbortController()),navigation=useRef<AbortController|null>(null),inputQueue=useRef<BrowserInput[]>([]),sending=useRef(false);
 const takeOver=useRef(onTakeOver);takeOver.current=onTakeOver;
 const base=`/api/browser/${encodeURIComponent(chatId)}`;
 async function request(kind:'command'|'input',body:unknown,signal=lifetime.current.signal){
  const response=await fetch(`${base}/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  const result=await response.json();if(!response.ok)throw Error(result.error??'Browser request failed.');return result;
 }
 useEffect(()=>{
  if(!active)return;
  const controller=new AbortController();lifetime.current=controller;inputQueue.current=[];sending.current=false;latestStatus.current=idle;pendingAddress.current=null;setStatus(idle);setHasFrame(false);frame.current=undefined;setAddress('');setError('');
  const renderer=browserFrames(image.current!,painted=>{frame.current=painted;setHasFrame(true);});
  const source=new EventSource(`${base}/events`);
  source.onmessage=e=>{const event=JSON.parse(e.data) as BrowserEvent;if(event.type==='frame')renderer.push(event.frame);else{latestStatus.current=event.status;setStatus(event.status);if(!editingAddress.current&&!pendingAddress.current)setAddress(event.status.url==='about:blank'?'':event.status.url);if(event.status.error)setError(event.status.error);else if(event.status.state==='ready'&&!event.status.loading)setError('');}};
  source.onerror=()=>setError('Browser connection interrupted. Reconnecting…');source.onopen=()=>setError('');
  return()=>{renderer.close();source.close();controller.abort();navigation.current?.abort();};
 },[base,active]);
 useEffect(()=>{
  if(!active||status.state!=='ready'||!screen.current)return;
  let timer:ReturnType<typeof setTimeout>;let previous='';
  const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;const width=Math.max(320,Math.round(r.width)),height=Math.max(240,Math.round(r.height));const key=`${width}x${height}`;if(key===previous)return;previous=key;clearTimeout(timer);timer=setTimeout(()=>{void request('command',{type:'resize',width,height}).catch(e=>{if(!lifetime.current.signal.aborted)setError(e.message);});},180);});
  observer.observe(screen.current);return()=>{observer.disconnect();clearTimeout(timer);};
 },[base,status.state,active]);
 async function command(type:'navigate'|'back'|'forward'|'reload'){
  takeOver.current();editingAddress.current=false;setError('');navigation.current?.abort();const controller=new AbortController();navigation.current=controller;
  const stop=()=>controller.abort();lifetime.current.signal.addEventListener('abort',stop,{once:true});
  try{
   const url=browserAddress(address);
   if(type==='navigate'){pendingAddress.current=url;setAddress(url);}
   const result=await request('command',type==='navigate'?{type,url}:{type},controller.signal);
   if(navigation.current!==controller)return;
   latestStatus.current=result.status;setStatus(result.status);pendingAddress.current=null;
   if(!editingAddress.current)setAddress(result.status.url==='about:blank'?'':result.status.url);
   if(type==='navigate'&&!editingAddress.current&&document.activeElement===addressInput.current)keyboard.current?.focus({preventScroll:true});
  }
  catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{lifetime.current.signal.removeEventListener('abort',stop);if(navigation.current===controller)navigation.current=null;}
 }
 function input(body:BrowserInput){
  takeOver.current();const queue=inputQueue.current,controller=lifetime.current;
  const last=queue.at(-1);
  // Merge only adjacent pending scrolls. Keys and clicks keep their exact order.
  if(body.type==='wheel'&&last?.type==='wheel'&&Math.abs(last.deltaX+body.deltaX)<=3000&&Math.abs(last.deltaY+body.deltaY)<=3000){last.deltaX+=body.deltaX;last.deltaY+=body.deltaY;last.x=body.x;last.y=body.y;}
  else queue.push(body);
  if(sending.current)return;sending.current=true;
  void (async()=>{try{while(queue.length&&!controller.signal.aborted){const next=queue.shift()!;try{await request('input',next,controller.signal);}catch(e){if(!controller.signal.aborted)setError((e as Error).message);}}}finally{if(lifetime.current===controller)sending.current=false;}})();
 }
 const wheelInput=useRef<(e:WheelEvent)=>void>(()=>{});
 wheelInput.current=e=>{if(!frame.current)return;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?frame.current.height:1;input({type:'wheel',...point(e.clientX,e.clientY),deltaX:e.deltaX*unit,deltaY:e.deltaY*unit});};
 useEffect(()=>{const element=image.current;if(!element)return;const wheel=(e:WheelEvent)=>wheelInput.current(e);element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);},[]);
 function point(clientX:number,clientY:number){const r=image.current!.getBoundingClientRect();return {x:(clientX-r.left)*frame.current!.width/r.width,y:(clientY-r.top)*frame.current!.height/r.height};}
 function flushText(){const element=keyboard.current;if(element?.value){input({type:'text',text:element.value});element.value='';}}
 return <div className="browser-view">
  <form className="browser-navigation" onSubmit={e=>{e.preventDefault();if(address.trim())void command('navigate');}}>
   <button type="button" className="icon-button" aria-label="Browser back" disabled={status.state!=='ready'} onClick={()=>void command('back')}><ArrowLeft size={15}/></button>
   <button type="button" className="icon-button" aria-label="Browser forward" disabled={status.state!=='ready'} onClick={()=>void command('forward')}><ArrowRight size={15}/></button>
   <button type="button" className="icon-button" aria-label={status.loading?'Stop loading':'Reload browser'} disabled={status.state==='idle'} onClick={()=>status.loading?(navigation.current?.abort(),takeOver.current()):void command('reload')}>{status.loading?<Square size={12}/>:<RotateCw size={14}/>}</button>
   <div className="browser-address">{status.loading||status.state==='starting'?<LoaderCircle size={13} className="browser-loading"/>:<Globe size={13}/>}<input ref={addressInput} aria-label="Browser address" placeholder="Search Google or enter a URL" value={address} onChange={e=>{editingAddress.current=true;setAddress(e.target.value);}} onFocus={e=>{editingAddress.current=true;e.target.select();}} onBlur={()=>{editingAddress.current=false;setAddress(pendingAddress.current??(latestStatus.current.url==='about:blank'?'':latestStatus.current.url));}} spellCheck={false}/></div>
  </form>
  {error&&<div className="browser-error" role="alert"><span>{error.replace(/\u001b\[[0-9;]*m/g,'').split('\n')[0]}</span><button className="icon-button" aria-label="Dismiss browser error" onClick={()=>setError('')}><X size={12}/></button></div>}
  <div className="browser-screen" ref={screen}>
   <canvas ref={image} hidden={!hasFrame} role="img" aria-label={status.title?`Browser: ${status.title}`:'Live browser page'}
    onClick={e=>{input({type:'click',...point(e.clientX,e.clientY),clickCount:e.detail===2?2:1});keyboard.current?.focus({preventScroll:true});}}
    onContextMenu={e=>{e.preventDefault();input({type:'click',...point(e.clientX,e.clientY),button:'right'});keyboard.current?.focus({preventScroll:true});}}
    />
   {!hasFrame&&<div className="browser-panel-empty">{status.state==='starting'?'Opening browser…':'Open a page to begin'}</div>}
   <textarea ref={keyboard} className="browser-keyboard" aria-label="Type into browser" tabIndex={-1} autoCapitalize="off" autoCorrect="off" spellCheck={false}
    onCompositionStart={()=>composing.current=true} onCompositionEnd={()=>{composing.current=false;flushText();}} onChange={()=>{if(!composing.current)flushText();}}
    onKeyUp={e=>e.stopPropagation()} onPaste={e=>e.stopPropagation()}
    onKeyDown={e=>{e.stopPropagation();const key=remoteKey(e.nativeEvent);if(key){e.preventDefault();input({type:'key',key});}}}/>
  </div>
 </div>;
}
