import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {researchCall} from './research-api.ts';
import {inflections} from './lib/inflections.ts';
const source='experiments/results/morphology-conversation-2026-09-18T07-43-54.849Z';
const traces=(await readFile(`${source}/trace.jsonl`,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
const active=(await readFile(`${source}/active.jsonl`,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
const states=traces.filter(t=>t.stage==='rerank'&&t.id==='creative'&&t.request.state.reply_so_far.endsWith('Finally'));
states.push(traces.find(t=>t.stage==='rerank'&&t.id==='chinese'&&t.request.state.reply_so_far));
const dir=`experiments/results/lookahead-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(dir,{recursive:true});
await writeFile(`${dir}/manifest.json`,JSON.stringify({source,protocol:'research/R15.9-lookahead-protocol.md',prefixes:states.map(t=>t.request.state.reply_so_far)},null,2));
function render(p:string,w:string){if(/^[.,!?]$/.test(w))return p+w;let f=w==='i'?'I':w;if(!p||/[.!?]$/.test(p))f=f[0].toUpperCase()+f.slice(1);return p+(p?' ':'')+f;}
const results=[];
for(const s of states){
 const started=Date.now();let inputTokens=0,outputTokens=0,requests=0;
 async function ask(stage:string,state:any,questions:any){const request={model:'jev-latest',state,questions};const response=await researchCall(request);requests+=response.attempts;inputTokens+=response.data.usage?.input_tokens??0;outputTokens+=response.data.usage?.output_tokens??0;await appendFile(`${dir}/trace.jsonl`,JSON.stringify({user:s.user,stage,request,response})+'\n');return response.data.answers;}
 const bank=active.find(a=>a.id===s.id&&a.user===s.user).active as string[];const n=Math.ceil(bank.length/240);const groups=Array.from({length:n},(_,i)=>bank.filter((_,j)=>j%n===i));
 const criteria=s.request.questions.next.criteria;
 const seeds=Object.entries(s.response.data.answers.next.probabilities).filter(([k])=>k!=='END').sort((a:any,b:any)=>b[1]-a[1]).slice(0,3).map(([k])=>criteria[k]);
 const branches=[];
 for(const seed of seeds){let prefix=seed,ended=false;
  for(let step=0;step<3;step++){
   const state={...s.request.state,reply_so_far:prefix};
   const answers=await ask('propose',state,Object.fromEntries(groups.map((g,i)=>[`g${i}`,{type:'choice',instructions:'Choose the next word to append to reply_so_far to answer the latest user message coherently in English. Continue unfinished sentences. Choose OTHER if no listed word fits.',criteria:{...Object.fromEntries(g.map(w=>[w,null])),OTHER:'No listed word fits'}}])));
   const originals=[...new Set(Object.values(answers).flatMap((a:any)=>Object.entries(a.probabilities).filter(([k])=>k!=='OTHER').sort((a:any,b:any)=>b[1]-a[1]).slice(0,4).map(([w])=>w)))];
   const words=[...new Set([...originals,...originals.flatMap(inflections)])];if(words.length>250)throw Error('Option budget exceeded');
   if(prefix&&!/[.,!?]$/.test(prefix))words.push('.',',','?','!');
   const texts=[...new Set(words.map(w=>render(prefix,w)))];
   const answer=await ask('extend',state,{next:{type:'choice',instructions:s.request.questions.next.instructions,criteria:{...Object.fromEntries(texts.map((t,i)=>[`c${i}`,t])),END:'Stop without adding text: the current reply already answers the user adequately.'}}});
   if(answer.next.choice==='END'){ended=true;break;}const next=texts[Number(answer.next.choice.slice(1))];if(!next)throw Error('Invalid selection');prefix=next;
  }
  branches.push({seed,text:prefix,ended});
 }
 const selections=[];
 for(const reverse of [false,true]){
  const options=branches.map((b,i)=>[`b${i}`,b.text]);if(reverse)options.reverse();
  const answer=await ask('compare',s.request.state,{best:{type:'choice',instructions:'Choose the best partial reply toward answering the latest user message: prefer grammatical, coherent prose that can continue naturally. These are partial replies, so do not prefer one merely because it ends sooner. Preserve meaning and avoid unsupported claims.',criteria:Object.fromEntries(options)}});
  selections.push({reverse,choice:answer.best.choice});
 }
 const row={id:s.id,user:s.user,prefix:s.request.state.reply_so_far,branches,selections,inputTokens,outputTokens,requests,ms:Date.now()-started};results.push(row);console.log(JSON.stringify(row));await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));
}
console.log(dir);
