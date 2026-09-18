import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,RotateCw,Globe,LoaderCircle,Square,X} from 'lucide-react';
import {remoteKey} from './browser-keyboard';
import type {BrowserEvent,BrowserFrame,BrowserInput,BrowserStatus} from '@jot/browser/types';
const idle:BrowserStatus={state:'idle',url:'about:blank',title:'',loading:false};
export function BrowserView({chatId,active,onTakeOver}:{chatId:string;active:boolean;onTakeOver:()=>void}){
 const [status,setStatus]=useState<BrowserStatus>(idle),[frame,setFrame]=useState<BrowserFrame>(),[address,setAddress]=useState(''),[error,setError]=useState('');
 const screen=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null),keyboard=useRef<HTMLTextAreaElement>(null),addressInput=useRef<HTMLInputElement>(null);
 const editingAddress=useRef(false);
 const composing=useRef(false),lifetime=useRef(new AbortController()),navigation=useRef<AbortController|null>(null),inputQueue=useRef(Promise.resolve());
 const takeOver=useRef(onTakeOver);takeOver.current=onTakeOver;
 const base=`/api/browser/${encodeURIComponent(chatId)}`;
 async function request(kind:'command'|'input',body:unknown,signal=lifetime.current.signal){
  const response=await fetch(`${base}/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  const result=await response.json();if(!response.ok)throw Error(result.error??'Browser request failed.');return result;
 }
 useEffect(()=>{
  if(!active)return;
  const controller=new AbortController();lifetime.current=controller;inputQueue.current=Promise.resolve();setStatus(idle);setFrame(undefined);setAddress('');setError('');
  const source=new EventSource(`${base}/events`);
  source.onmessage=e=>{const event=JSON.parse(e.data) as BrowserEvent;if(event.type==='frame')setFrame(event.frame);else{setStatus(event.status);if(!editingAddress.current)setAddress(event.status.url==='about:blank'?'':event.status.url);if(event.status.error)setError(event.status.error);else if(event.status.state==='ready'&&!event.status.loading)setError('');}};
  source.onerror=()=>setError('Browser connection interrupted. Reconnecting…');source.onopen=()=>setError('');
  return()=>{source.close();controller.abort();navigation.current?.abort();};
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
  try{const url=/^https?:\/\//i.test(address.trim())?address.trim():`https://${address.trim()}`;await request('command',type==='navigate'?{type,url}:{type},controller.signal);if(type==='navigate'&&!editingAddress.current&&document.activeElement===addressInput.current)keyboard.current?.focus({preventScroll:true});}
  catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{lifetime.current.signal.removeEventListener('abort',stop);if(navigation.current===controller)navigation.current=null;}
 }
 function input(body:BrowserInput){takeOver.current();const controller=lifetime.current;inputQueue.current=inputQueue.current.then(async()=>{if(controller.signal.aborted)return;await request('input',body,controller.signal);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});}
 function point(clientX:number,clientY:number){const r=image.current!.getBoundingClientRect();return {x:(clientX-r.left)*frame!.width/r.width,y:(clientY-r.top)*frame!.height/r.height};}
 function flushText(){const element=keyboard.current;if(element?.value){input({type:'text',text:element.value});element.value='';}}
 return <div className="browser-view">
  <form className="browser-navigation" onSubmit={e=>{e.preventDefault();if(address.trim())void command('navigate');}}>
   <button type="button" className="icon-button" aria-label="Browser back" disabled={status.state!=='ready'} onClick={()=>void command('back')}><ArrowLeft size={15}/></button>
   <button type="button" className="icon-button" aria-label="Browser forward" disabled={status.state!=='ready'} onClick={()=>void command('forward')}><ArrowRight size={15}/></button>
   <button type="button" className="icon-button" aria-label={status.loading?'Stop loading':'Reload browser'} disabled={status.state==='idle'} onClick={()=>status.loading?(navigation.current?.abort(),takeOver.current()):void command('reload')}>{status.loading?<Square size={12}/>:<RotateCw size={14}/>}</button>
   <div className="browser-address">{status.loading||status.state==='starting'?<LoaderCircle size={13} className="browser-loading"/>:<Globe size={13}/>}<input ref={addressInput} aria-label="Browser address" placeholder="Enter a URL" value={address} onChange={e=>{editingAddress.current=true;setAddress(e.target.value);}} onFocus={e=>{editingAddress.current=true;e.target.select();}} onBlur={()=>{editingAddress.current=false;setAddress(status.url==='about:blank'?'':status.url);}} spellCheck={false}/></div>
  </form>
  {error&&<div className="browser-error" role="alert"><span>{error.replace(/\u001b\[[0-9;]*m/g,'').split('\n')[0]}</span><button className="icon-button" aria-label="Dismiss browser error" onClick={()=>setError('')}><X size={12}/></button></div>}
  <div className="browser-screen" ref={screen}>
   {frame?<img ref={image} src={`data:${frame.mimeType};base64,${frame.data}`} alt={status.title?`Browser: ${status.title}`:'Live browser page'} draggable={false}
    onClick={e=>{input({type:'click',...point(e.clientX,e.clientY),clickCount:e.detail===2?2:1});keyboard.current?.focus({preventScroll:true});}}
    onContextMenu={e=>{e.preventDefault();input({type:'click',...point(e.clientX,e.clientY),button:'right'});keyboard.current?.focus({preventScroll:true});}}
    onWheel={e=>{e.preventDefault();input({type:'wheel',...point(e.clientX,e.clientY),deltaX:e.deltaX,deltaY:e.deltaY});}}/>:
    <div className="browser-panel-empty">{status.state==='starting'?'Opening browser…':'Open a page to begin'}</div>}
   <textarea ref={keyboard} className="browser-keyboard" aria-label="Type into browser" tabIndex={-1} autoCapitalize="off" autoCorrect="off" spellCheck={false}
    onCompositionStart={()=>composing.current=true} onCompositionEnd={()=>{composing.current=false;flushText();}} onChange={()=>{if(!composing.current)flushText();}}
    onKeyUp={e=>e.stopPropagation()} onPaste={e=>e.stopPropagation()}
    onKeyDown={e=>{e.stopPropagation();const key=remoteKey(e.nativeEvent);if(key){e.preventDefault();input({type:'key',key});}}}/>
  </div>
 </div>;
}
