import {inflections} from './lib/inflections.ts';
import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {researchCall} from './research-api.ts';
import type {Message} from '../server/jev.ts';
const format='full';
const arm='greedy';
const corpus=await readFile('.cache/research/google-10000-english.txt','utf8');
const hash=createHash('sha256').update(corpus).digest('hex');
if(hash!=='9c965d384526facc59260e94f8ccff1582633fa385004abe1455ed457062acbc')throw Error('Corpus changed');
const base=corpus.trim().split(/\r?\n/).slice(0,4096);
const cases=[{id:'ice',turns:['Why does ice melt in a warm room?','Explain it to a young child.']},{id:'bird',turns:['Write a short story about a bird missing its home.','Give the story a surprising but happy ending.']}];
const dir=`experiments/results/local-window-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(dir,{recursive:true});
await writeFile(`${dir}/source.ts`,await readFile('experiments/local-window.ts','utf8'));
await writeFile(`${dir}/manifest.json`,JSON.stringify({hash,cases,arm,protocol:'research/R18-local-window-protocol.md'},null,2));
function groups(words:string[]){const n=Math.ceil(words.length/240);return Array.from({length:n},(_,i)=>words.filter((_,j)=>j%n===i));}
function render(prefix:string,word:string){if(/^[.,!?]$/.test(word))return prefix+word;let w=word==='i'?'I':word;if(!prefix||/[.!?]$/.test(prefix))w=w[0].toUpperCase()+w.slice(1);return prefix+(prefix?' ':'')+w;}
const results:any[]=[];
for(const c of cases){
 const history:Message[]=[];
 for(const user of c.turns){
  history.push({role:'user',content:user});let prefix='',requests=0,inputTokens=0,outputTokens=0,reason='limit',firstMs:number|null=null;const started=Date.now();
  async function ask(stage:string,questions:Record<string,unknown>){
   if(Date.now()-started>180000||inputTokens>500000)throw Error('budget');
   const request={model:'jev-latest',state:{conversation:history,assistant:{name:'Jev',provider:'TypeSafe'},reply_so_far:prefix},questions};
   const t=Date.now();const response=await researchCall(request);requests+=response.attempts;
   inputTokens+=response.data.usage?.input_tokens??0;outputTokens+=response.data.usage?.output_tokens??0;
   await appendFile(`${dir}/trace.jsonl`,JSON.stringify({id:c.id,user,stage,request,response,ms:Date.now()-t})+'\n');return response.data.answers;
  }
  try{
   const context=history.flatMap(m=>m.content.match(/[A-Za-z][A-Za-z']*/g)??[]);
   const vocabulary=[...new Set([...base,...context,'Jev','TypeSafe'])];
   const banks=groups(vocabulary);
   const answers=await ask('vocabulary',Object.fromEntries(banks.map((bank,i)=>[`g${i}`,{type:'choice',instructions:'Which listed word is most useful in a concise, correct answer to the latest user message? Use the conversation for context.',criteria:Object.fromEntries(bank.map(w=>[w,null]))}])));
   const active=[...new Set([...base.slice(0,400),...context,'Jev','TypeSafe',...Object.values(answers).flatMap((a:any)=>Object.entries(a.probabilities).sort((a:any,b:any)=>b[1]-a[1]).slice(0,32).map(([w])=>w))])];
   await appendFile(`${dir}/active.jsonl`,JSON.stringify({id:c.id,user,active})+'\n');
   let branchEvents=0;
   async function proposeAt(at:string){
    const saved=prefix;prefix=at;
    try{
    const proposed=await ask('propose',Object.fromEntries(groups(active).map((bank,i)=>[`g${i}`,{type:'choice',instructions:'Choose the next word to append to reply_so_far to answer the latest user message coherently in English. Continue unfinished sentences. Choose OTHER if no listed word fits.',criteria:{...Object.fromEntries(bank.map(w=>[w,null])),OTHER:'No listed word fits'}}])));
    let candidates=[...new Set(Object.values(proposed).flatMap((a:any)=>Object.entries(a.probabilities).filter(([w])=>w!=='OTHER').sort((a:any,b:any)=>b[1]-a[1]).slice(0,4).map(([w])=>w)))];
    const originals=[...candidates];
    const expanded=[...new Set([...originals,...originals.flatMap(inflections)])];
    candidates=expanded.slice(0,250);
    await appendFile(`${dir}/morphology.jsonl`,JSON.stringify({id:c.id,user,prefix,originals,expanded,discarded:expanded.length-candidates.length})+'\n');
    if(prefix&&!/[.,!?]$/.test(prefix))candidates.push('.',',','?','!');
    const seen=new Set<string>();
    const criteria=Object.fromEntries(candidates.flatMap((w,i)=>{const text=render(prefix,w);if(seen.has(text))return [];seen.add(text);return [[`c${i}`,format==='full'?text:text.slice(prefix.length).trimStart()]];}));
    criteria.END='Stop without adding text: the current reply already answers the user adequately.';
    const shown=Object.fromEntries(Object.entries(criteria).map(([key,text])=>{
     if(key==='END')return [key,text];
     const chunks=prefix.split(/\s+/);const tail=chunks.slice(-8).join(' ');
     return [key,chunks.length>8?'...'+tail+(text as string).slice(prefix.length):text];
    }));
    const picked=await ask('rerank',{next:{type:'choice',instructions:'Candidate descriptions may show only the last eight words; reply_so_far in state is the full committed reply. '+(format==='full'?'Each candidate shows the full existing reply with a word or punctuation appended. ':'Each candidate is a word or punctuation to append to reply_so_far. ')+'Choose the most natural, grammatical, factually correct continuation toward answering the latest user message, using conversation context. Choose END only when reply_so_far is already complete. Do not restart the reply. Avoid universal capability claims or promises unsupported by state. Prefer a concrete useful answer; acknowledge uncertainty or limitations when relevant.',criteria:shown}});
    return {answer:picked.next,criteria};
    }finally{prefix=saved;}
   }
   for(let step=0;step<40;){
    const decision=await proposeAt(prefix);
    if(decision.answer.choice==='END'){reason='complete';break;}
    const top=Object.entries(decision.answer.probabilities).filter(([k])=>k!=='END').sort((a:any,b:any)=>b[1]-a[1]).slice(0,3).map(([k])=>decision.criteria[k]);
    if(arm==='branch'&&branchEvents<2&&step<=36&&(!prefix||/[.!?]$/.test(prefix))){
     branchEvents++;
     const branches=[];
     for(const seed of top){let text=seed,used=1,ended=false;
      for(let depth=0;depth<3;depth++){
       const next=await proposeAt(text);
       if(next.answer.choice==='END'){ended=true;break;}
       text=next.criteria[next.answer.choice];used++;
      }
      branches.push({text,used,ended});
     }
     const selection=await ask('branch',{best:{type:'choice',instructions:'Choose the best partial reply toward answering the latest user message: grammatical, coherent, correct, helpful, and able to continue naturally. Do not prefer a shorter fragment merely because it has ended. Respect the latest requested change to the previous answer.',criteria:Object.fromEntries(branches.map((v,i)=>[`b${i}`,v.text]))}});
     const chosen=branches[Number(selection.best.choice.slice(1))];if(!chosen)throw Error('Invalid branch');
     await appendFile(`${dir}/branches.jsonl`,JSON.stringify({id:c.id,user,prefix,branches,chosen})+'\n');
     prefix=chosen.text;step+=chosen.used;firstMs??=Date.now()-started;if(chosen.ended){reason='complete';break;}
    }else{prefix=decision.criteria[decision.answer.choice];step++;firstMs??=Date.now()-started;}
   }
  }catch(e){reason=String(e);}
  const row={arm,id:c.id,user,text:prefix,reason,requests,inputTokens,outputTokens,ms:Date.now()-started,firstMs};results.push(row);console.log(JSON.stringify(row));
  await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));if(prefix)history.push({role:'assistant',content:prefix});
 }
}
console.log(dir);
