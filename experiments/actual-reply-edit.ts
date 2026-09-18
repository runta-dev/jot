import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {repairDraft} from './lib/editor.ts';
const source='experiments/results/subtitle-vocabulary-2026-09-18T07-57-33.319Z';
const cases=JSON.parse(await readFile(`${source}/results.json`,'utf8'));
const traces=(await readFile(`${source}/trace.jsonl`,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
const dir=`experiments/results/actual-reply-edit-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(dir,{recursive:true});
await writeFile(`${dir}/manifest.json`,JSON.stringify({source,cases,protocol:'research/R21-actual-reply-edit-protocol.md'},null,2));const rows=[];
for(const c of cases){
 const history=traces.find(t=>t.user===c.user).request.state.conversation;
 const revisions=[c.text],start=Date.now();let reason='limit',requests=0,inputTokens=0;
 for(let iteration=0;iteration<3;iteration++){
  const result=await repairDraft({id:c.id,draft:revisions.at(-1),instruction:'Make the smallest edit that improves this assistant reply so it correctly and grammatically answers the latest user request. Preserve correct facts. Do not invent information. Leave correct text unchanged.',context:JSON.stringify(history)},async trace=>{await appendFile(`${dir}/trace.jsonl`,JSON.stringify({user:c.user,iteration,trace})+'\n');});
  requests+=result.requests;inputTokens+=result.usage.input_tokens;
  if(result.error){reason=`error:${result.error}`;break;}
  if(result.selected===revisions.at(-1)){reason='unchanged';break;}
  if(revisions.includes(result.selected)){reason='cycle';break;}
  revisions.push(result.selected);
 }
 const row={id:c.id,user:c.user,revisions,reason,requests,inputTokens,ms:Date.now()-start};rows.push(row);console.log(JSON.stringify(row));await writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));
}
console.log(dir);
