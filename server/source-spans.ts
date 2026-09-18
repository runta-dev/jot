import type {ChatMessage as Message} from '@jot/agent';
/** Exhaustive bounded source spans; null means skip, never silently truncate. */
export function sourceSpans(messages:Message[]):string[]|null{
 const values=new Set<string>();let size=0;
 for(const message of messages){
  const words=[...message.content.matchAll(/\S+/g)];
  for(let i=0;i<words.length;i++)for(let n=1;n<=6&&i+n<=words.length;n++){
   const last=words[i+n-1];const raw=message.content.slice(words[i].index,last.index!+last[0].length);
   for(const span of [raw.replace(/^["“]+|["”]+$/g,''),raw.replace(/^["“]+|["”.,!?]+$/g,'')]){
    if(span&&!values.has(span)){values.add(span);size+=span.length;if(values.size>254||size>12000)return null;}
   }
  }
 }
 return [...values];
}
