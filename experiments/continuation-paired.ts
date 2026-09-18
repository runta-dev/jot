import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {researchCall} from './research-api.ts';
import type {Message} from '../server/jev.ts';
const format=process.argv[2];
if(!['full','fragment'].includes(format))throw Error('Expected full or fragment');
const corpus=await readFile('.cache/research/google-10000-english.txt','utf8');
const hash=createHash('sha256').update(corpus).digest('hex');
if(hash!=='9c965d384526facc59260e94f8ccff1582633fa385004abe1455ed457062acbc')throw Error('Corpus changed');
const base=corpus.trim().split(/\r?\n/).slice(0,4096);
const cases=JSON.parse(await readFile('research/evaluations/general-chat-v1.json','utf8')).slice(0,2);
const dir=`experiments/results/continuation-paired-${format}-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(dir,{recursive:true});
await writeFile(`${dir}/manifest.json`,JSON.stringify({hash,cases,format,protocol:'research/R15.3-end-to-end-ablation.md'},null,2));
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
   for(let step=0;step<40;step++){
    const proposed=await ask('propose',Object.fromEntries(groups(active).map((bank,i)=>[`g${i}`,{type:'choice',instructions:'Choose the next word to append to reply_so_far to answer the latest user message coherently in English. Continue unfinished sentences. Choose OTHER if no listed word fits.',criteria:{...Object.fromEntries(bank.map(w=>[w,null])),OTHER:'No listed word fits'}}])));
    const candidates=[...new Set(Object.values(proposed).flatMap((a:any)=>Object.entries(a.probabilities).filter(([w])=>w!=='OTHER').sort((a:any,b:any)=>b[1]-a[1]).slice(0,4).map(([w])=>w)))];
    if(prefix&&!/[.,!?]$/.test(prefix))candidates.push('.',',','?','!');
    const seen=new Set<string>();
    const criteria=Object.fromEntries(candidates.flatMap((w,i)=>{const text=render(prefix,w);if(seen.has(text))return [];seen.add(text);return [[`c${i}`,format==='full'?text:text.slice(prefix.length).trimStart()]];}));
    criteria.END='Stop without adding text: the current reply already answers the user adequately.';
    const picked=await ask('rerank',{next:{type:'choice',instructions:(format==='full'?'Each candidate shows the full existing reply with a word or punctuation appended. ':'Each candidate is a word or punctuation to append to reply_so_far. ')+'Choose the most natural, grammatical, factually correct continuation toward answering the latest user message, using conversation context. Choose END only when reply_so_far is already complete. Do not restart the reply. Avoid universal capability claims or promises unsupported by state. Prefer a concrete useful answer; acknowledge uncertainty or limitations when relevant.',criteria}});
    const selected=picked.next.choice;
    if(selected==='END'){reason='complete';break;}
    const index=Number(selected.slice(1));if(!Number.isInteger(index)||!candidates[index])throw Error('Invalid selection');
    prefix=render(prefix,candidates[index]);firstMs??=Date.now()-started;
   }
  }catch(e){reason=String(e);}
  const row={format,id:c.id,user,text:prefix,reason,requests,inputTokens,outputTokens,ms:Date.now()-started,firstMs};results.push(row);console.log(JSON.stringify(row));
  await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));if(prefix)history.push({role:'assistant',content:prefix});
 }
}
console.log(dir);
