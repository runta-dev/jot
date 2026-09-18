import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {question,parseChoice,isRepetition,END,type Message} from '../server/jev.ts';
import {researchCall} from './research-api.ts';
const cases=JSON.parse(await readFile('research/evaluations/general-chat-v1.json','utf8'));
const dir=`experiments/results/promotion-ascii-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(dir,{recursive:true});
await writeFile(`${dir}/cases.json`,JSON.stringify(cases,null,2));
const results=[];
for(const c of cases){
 const history:Message[]=[];
 for(const user of c.turns){
  history.push({role:'user',content:user});
  let text='',reason='limit',requests=0,firstMs:number|null=null;
  const started=Date.now();
  try{
   while(text.length<280){
    if(Date.now()-started>=180000){reason='timeout';break;}
    const request=question(history,text), t=Date.now();
    const response=await researchCall(request);requests++;
    await appendFile(`${dir}/trace.jsonl`,JSON.stringify({id:c.id,turn:user,request,response,ms:Date.now()-t})+'\n');
    const step=parseChoice(response.data);
    if(step.choice===END){reason='complete';break;}
    text+=step.choice;firstMs??=Date.now()-started;
    if(isRepetition(text)){reason='repetition';break;}
   }
  }catch(e){reason=`error: ${String(e)}`;}
  const result={id:c.id,user,text,reason,requests,ms:Date.now()-started,firstMs};
  results.push(result);console.log(JSON.stringify(result));
  // Keep empty outputs as evidence; do not insert a fabricated assistant message.
  if(text)history.push({role:'assistant',content:text});
  await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));
 }
}
console.log(dir);
