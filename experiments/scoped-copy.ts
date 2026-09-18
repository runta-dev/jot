import {inflections} from '../server/inflections.ts';
import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';import {parse} from 'dotenv';import {generateWordReply} from '../server/word-reply.ts';import {makeEvaluator,type Evaluate} from '../server/typesafe.ts';import type {Message} from '../server/jev.ts';
const cases=[{id:'deadline',turns:['Rewrite politely: "Send the report by Tuesday."','Change the deadline to Thursday and keep it polite.']},{id:'invitation',turns:['Write a friendly one-sentence invitation to dinner.','Make it formal, still one sentence.']},{id:'quoted',turns:['Shorten this without changing its meaning: "Please return the library book before Friday."','Now change Friday to Monday, preserving the rest.']}];const dir=`experiments/results/scoped-copy-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/manifest.json`,JSON.stringify({protocol:'research/R38-scoped-copy.md',cases},null,2));
const env=parse(await readFile('.env','utf8')),key=process.env.TYPESAFE_API_KEY||process.env.JEV_API_KEY||env.TYPESAFE_API_KEY||env.JEV_API_KEY;if(!key)throw Error('No key');const inner=makeEvaluator(key),rows=[];
for(const arm of ['baseline','copy'])for(const c of cases){const history:Message[]=[];for(const user of c.turns){history.push({role:'user',content:user});
 const evaluate:Evaluate=async(request,signal)=>{const modified=request;const response=await inner(modified,signal);await appendFile(`${dir}/trace.jsonl`,JSON.stringify({arm,id:c.id,user,request:modified,response})+'\n');return response;};
 const spans=new Map<string,Set<string>>();
 const sources=[...history.filter(m=>m.role==='assistant').slice(-1).map(m=>m.content),...[...user.matchAll(/"([^"]+)"/g)].map(m=>m[1])];
 for(const source of sources)for(const sentence of source.split(/[.!?\n]+/)){
  const tokens=sentence.trim().split(/\s+/).filter(Boolean);
  for(let start=0;start<tokens.length;start++)for(let n=2;n<=4&&start+n<=tokens.length;n++){
   const first=tokens[start].toLowerCase();if(!/^[a-z]+$/.test(first))continue;
   const set=spans.get(first)??new Set<string>();set.add(tokens.slice(start,start+n).join(' '));spans.set(first,set);
  }
 }
 await appendFile(`${dir}/spans.jsonl`,JSON.stringify({arm,id:c.id,user,spans:Object.fromEntries([...spans].map(([k,v])=>[k,[...v]]))})+'\n');
 let text='',done:any;const start=Date.now();try{for await(const event of generateWordReply(key,history,AbortSignal.timeout(180000),{evaluate,...(arm==='copy'?{forms:(word:string)=>[...inflections(word),...(spans.get(word.toLowerCase())??[])]}:{})})){if(event.type==='character')text+=event.character;else done=event;}}catch(e){done={error:String(e)};}const row={arm,id:c.id,user,text,words:text.trim().split(/\s+/).length,done,ms:Date.now()-start};rows.push(row);console.log(JSON.stringify(row));await writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));if(text)history.push({role:'assistant',content:text});
}}console.log(dir);
