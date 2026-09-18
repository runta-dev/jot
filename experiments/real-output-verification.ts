import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {researchCall} from './research-api.ts';
const specs=[{root:'bounded-branch-greedy-2026-09-18T07-49-04.111Z',labels:[false,true,false,false]},{root:'bounded-branch-branch-2026-09-18T07-50-00.111Z',labels:[true,true,null,false]},{root:'broad-diagnostic-2026-09-18T07-39-21.753Z',labels:[true,true,true,true]}];
const dir=`experiments/results/real-output-verification-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(dir,{recursive:true});
await writeFile(`${dir}/manifest.json`,JSON.stringify({protocol:'research/R17-real-output-verification.md',specs},null,2));const rows=[];
for(const spec of specs){
 const root=`experiments/results/${spec.root}`;const results=JSON.parse(await readFile(`${root}/results.json`,'utf8')).slice(0,spec.labels.length);
 const traces=(await readFile(`${root}/trace.jsonl`,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
 for(let i=0;i<results.length;i++){
  const r=results[i];const trace=traces.find(t=>t.user===r.user&&t.request?.state?.conversation);
  if(!trace)throw Error('Missing state');
  const request={model:'jev-latest',state:{conversation:trace.request.state.conversation,proposed_reply:r.text},questions:{adequate:{type:'noul',instructions:'Does proposed_reply adequately answer the latest user request in conversation, using prior messages as context? Judge the actual text, not what it might intend.'},grammar:{type:'noul',instructions:'Is proposed_reply grammatical, readable English appropriate for this conversation? Short factual answers may be fragments; requested narrative prose should have coherent sentences.'},constraints:{type:'noul',instructions:'Does proposed_reply satisfy all explicit requirements in the latest user request, including any requested change to earlier content? A related or positive-sounding answer is insufficient if a requirement is missing.'}}};
  const response=await researchCall(request);await appendFile(`${dir}/trace.jsonl`,JSON.stringify({source:spec.root,request,response})+'\n');
  const row={source:spec.root,user:r.user,text:r.text,expectedAdequate:spec.labels[i],answers:response.data.answers};rows.push(row);console.log(JSON.stringify(row));
 }
}
await writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));console.log(dir);
