import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import js from 'jsrealb';import {researchCall} from './research-api.ts';
import {hole,frontier,expand,structures,lexical,budgetActions,type Tree,type Action} from './lib/syntax-tree.ts';
import {renderTree} from './lib/syntax-render.ts';import {verbSenses} from './lib/wordnet.ts';import {supportedSenses} from './lib/valency.ts';
js.loadEn();const lex=js.getLexicon('en'),senses=await verbSenses();
const words=(await readFile('.cache/research/frequencywords/reference-en.txt','utf8')).trim().split('\n').map(x=>x.split(/\s+/)[0]).filter(w=>/^[a-z][a-z']*$/.test(w)).slice(0,4096);
const prompts=['Why do wet clothes dry?','A child dropped a glass. What might happen next?','How can I begin a difficult task?'];
const dir=`experiments/results/tree-generation-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/manifest.json`,JSON.stringify({protocol:'research/R25-tree-generation.md',prompts},null,2));
const rows=[];
for(const prompt of prompts){let tree:Tree=hole('clause'),requests=0,inputTokens=0,reason='limit',text='';const started=Date.now(),chosenSenses:any[]=[];
 async function ask(stage:string,questions:any){if(inputTokens>=500000)throw Error('Input budget');const request={model:'jev-latest',state:{user_request:prompt,partial_tree:tree,selected_senses:chosenSenses},questions};const response=await researchCall(request);requests+=response.attempts;inputTokens+=response.data.usage?.input_tokens??0;await appendFile(`${dir}/trace.jsonl`,JSON.stringify({prompt,stage,request,response})+'\n');return response.data.answers;}
 try{
 for(let step=0;step<30;step++){
  const target=frontier(tree)[0];if(!target){text=renderTree(tree);reason='complete';break;}
  let actions:Action[]=structures(target.sort);const tag=target.sort==='noun'?'N':target.sort==='verb'?'V':target.sort==='adjective'?'A':undefined;
  let shape:'bare'|'direct-object'='bare';
  if(tag){
   if(tag==='V'){let parent:any=tree;for(const key of target.path.slice(0,-1))parent=parent[key];shape=parent.object?'direct-object':'bare';}
   const pool=[...new Set([...words,...(prompt.toLowerCase().match(/[a-z]+/g)??[])])].filter(w=>lex[w]?.[tag]&&(tag!=='V'||supportedSenses(senses.get(w)??[],shape).length));
   const banks=Array.from({length:Math.ceil(pool.length/180)},(_,i)=>pool.slice(i*180,(i+1)*180));
   const answers=await ask('lexical-proposals',Object.fromEntries(banks.map((bank,i)=>[`g${i}`,{type:'choice',instructions:`Choose the ${target.sort} that best fills hole ${JSON.stringify(target.path)} in partial_tree to answer user_request truthfully and helpfully. Respect all already bound roles and chosen senses.`,criteria:Object.fromEntries(bank.map(w=>[w,null]))}])));
   const finalists=[...new Set(Object.values(answers).flatMap((a:any)=>Object.entries(a.probabilities).sort((a:any,b:any)=>b[1]-a[1]).slice(0,2).map(([w])=>w)))];actions=lexical(target.sort,finalists);
  }
  actions=budgetActions(tree,target.path,actions);
  if(!actions.length){reason='unsupported';break;}
  const answer=await ask('expand',{next:{type:'choice',instructions:`Expand hole ${JSON.stringify(target.path)} so the complete tree will answer user_request. Every choice must respect existing bound roles and selected_senses. Choose UNSUPPORTED if no option permits an adequate response; do not force a false claim.`,criteria:{...Object.fromEntries(actions.map((a,i)=>[`a${i}`,{description:a.label,tree:expand(tree,target.path,a.replacement)}])),UNSUPPORTED:'Available structures or lexical candidates cannot express the needed answer.'}}});
  if(answer.next.choice==='UNSUPPORTED'){reason='unsupported';break;}const action=actions[Number(answer.next.choice.slice(1))];if(!action)throw Error('Invalid action');tree=expand(tree,target.path,action.replacement);
  if(tag==='V'&&action.replacement.kind==='word'){
   const compatible=supportedSenses(senses.get(action.replacement.value)??[],shape);
   const a=await ask('sense',{sense:{type:'choice',instructions:'Which meaning of the selected verb fits this partial tree and user_request? Choose NONE if no meaning fits.',criteria:{...Object.fromEntries(compatible.map((s,i)=>[`s${i}`,{definition:s.definition,examples:s.examples,frames:s.frames}])),NONE:'No compatible sense fits.'}}});
   if(a.sense.choice==='NONE'){reason='unsupported_sense';break;}const selected=compatible[Number(a.sense.choice.slice(1))];if(!selected)throw Error('Invalid sense');chosenSenses.push({path:target.path,lemma:action.replacement.value,...selected});
  }
 }
 }catch(e){reason=String(e);}
 const row={prompt,text,reason,tree,chosenSenses,requests,inputTokens,ms:Date.now()-started};rows.push(row);console.log(JSON.stringify(row));await writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));
}console.log(dir);
