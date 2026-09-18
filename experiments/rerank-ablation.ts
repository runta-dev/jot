import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {researchCall} from './research-api.ts';
const source='experiments/results/continuation-2026-09-18T07-32-05.542Z/trace.jsonl';
const states=(await readFile(source,'utf8')).trim().split('\n').map(x=>JSON.parse(x)).filter(x=>x.stage==='rerank');
const dir=`experiments/results/rerank-ablation-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(dir,{recursive:true});await writeFile(`${dir}/manifest.json`,JSON.stringify({source,protocol:'research/R15.2-rerank-ablation.md',states:states.length},null,2));
const rows=[];
for(let n=0;n<states.length;n++){
 const s=states[n],prefix=s.request.state.reply_so_far;
 const seen=new Set<string>();const entries=Object.entries(s.request.questions.next.criteria).filter(([_,v])=>{if(seen.has(v as string))return false;seen.add(v as string);return true;}) as [string,string][];
 for(const reversed of [false,true]){
  const questions:Record<string,unknown>={};
  for(const format of ['full','fragment'])for(const grounded of [false,true]){
   const id=`${format}_${grounded?'grounded':'base'}`;
   const criteria=Object.fromEntries((reversed?[...entries].reverse():entries).map(([k,v])=>[k,k==='END'||format==='full'?v:v.slice(prefix.length).trimStart()]));
   questions[id]={type:'choice',instructions:(format==='full'?s.request.questions.next.instructions:'Each candidate is a word or punctuation to append to reply_so_far. Choose the most natural, grammatical, factually correct continuation toward answering the latest user message, using conversation context. Choose END only when reply_so_far is already complete. Do not restart the reply.')+(grounded?' Avoid universal capability claims or promises unsupported by state. Prefer a concrete useful answer; acknowledge uncertainty or limitations when relevant.':''),criteria};
  }
  const request={model:'jev-latest',state:s.request.state,questions};const started=Date.now();const response=await researchCall(request);
  await appendFile(`${dir}/trace.jsonl`,JSON.stringify({n,reversed,request,response,ms:Date.now()-started})+'\n');
  const selected=Object.fromEntries(Object.entries(response.data.answers).map(([k,a]:[string,any])=>[k,{choice:a.choice,text:s.request.questions.next.criteria[a.choice],confidence:a.confidence}]));
  rows.push({n,id:s.id,user:s.user,prefix,reversed,selected});
  if(prefix==='I can help with')console.log(JSON.stringify(rows.at(-1)));
  await writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));
 }
}
console.log(dir);
