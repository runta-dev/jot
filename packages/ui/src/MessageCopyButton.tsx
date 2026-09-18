import {useEffect,useRef,useState} from 'react';
import {Check,Copy} from 'lucide-react';
export function MessageCopyButton({text}:{text:string}){
 const [state,setState]=useState<'idle'|'copied'|'error'>('idle');
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const label=state==='copied'?'Copied':state==='error'?'Could not copy. Try again.':'Copy message';
 return <button type="button" className="message-copy" aria-label={label} title={label} onClick={async()=>{
  clearTimeout(timer.current);
  try{await navigator.clipboard.writeText(text);setState('copied');}catch{setState('error');}
  timer.current=setTimeout(()=>setState('idle'),1800);
 }}>{state==='copied'?<Check size={16} strokeWidth={1.5}/>:<Copy size={16} strokeWidth={1.5}/>}</button>;
}
