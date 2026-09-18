import {useLayoutEffect,useRef,useState,type ReactNode,type Ref,type CSSProperties} from 'react';
import {ChevronsLeft} from 'lucide-react';
export function BrowserOpenButton({onClick,buttonRef}:{onClick:()=>void;buttonRef?:Ref<HTMLButtonElement>}){
 return <button ref={buttonRef} className="browser-open-button" aria-label="Open browser" aria-controls="browser-panel" aria-expanded={false} title="Open browser" onClick={onClick}><ChevronsLeft size={18}/></button>;
}
/** Right-hand shell; its live browser content is supplied separately. */
export function BrowserPanel({open,children}:{open:boolean;children?:ReactNode}){
 const panel=useRef<HTMLElement>(null);
 const manuallySized=useRef(false);
 const [available,setAvailable]=useState(960);
 const maximum=(space=available)=>Math.max(240,Math.min(space-240,window.innerWidth*.55));
 const clamp=(next:number)=>Math.max(240,Math.min(maximum(),next));
 const [width,setWidth]=useState(480);
 const [resizing,setResizing]=useState(false);
 useLayoutEffect(()=>{
  const parent=panel.current?.parentElement;
  if(!parent)return;
  const sidebar=parent.querySelector<HTMLElement>('.sidebar');
  const measure=()=>{
   const sidebarWidth=sidebar&&getComputedStyle(sidebar).position!=='fixed'?sidebar.getBoundingClientRect().width:0;
   const space=parent.getBoundingClientRect().width-sidebarWidth;
   setAvailable(space);
   setWidth(w=>manuallySized.current?Math.max(240,Math.min(maximum(space),w)):maximum(space));
  };
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(parent);
  if(sidebar)observer.observe(sidebar);
  return()=>observer.disconnect();
 },[]);
 return <aside ref={panel} id="browser-panel" className={`browser-panel ${open?"is-open":""} ${resizing?"is-resizing":""}`} aria-label="Browser" aria-hidden={!open} inert={!open} style={{width:open?width:0,"--browser-panel-width":`${width}px`} as CSSProperties}>
  <div className="browser-panel-inner">
  <div className="browser-resize-handle" role="separator" aria-label="Resize browser panel" aria-orientation="vertical" aria-valuemin={240} aria-valuemax={maximum()} aria-valuenow={width} tabIndex={0}
   onPointerDown={e=>{manuallySized.current=true;setResizing(true);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{setResizing(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>setResizing(false)} onLostPointerCapture={()=>setResizing(false)} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))setWidth(clamp(window.innerWidth-e.clientX));}}
   onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();manuallySized.current=true;setWidth(w=>clamp(w+(e.key==='ArrowLeft'?24:-24)));}}}/>
  <div className="browser-panel-content">{children??<div className="browser-panel-empty">No browser connected</div>}</div>
  </div>
 </aside>;
}
