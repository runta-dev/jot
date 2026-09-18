import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parse} from 'dotenv';
import {BrowserSession,type BrowserFrame} from '@jot/browser';
import {makeEvaluator,type Evaluate} from '@jot/jev-core';
import {generateChatReply} from '../server/chat-reply.ts';
import {createBrowserTools} from '../server/browser-tools.ts';

const testCase=JSON.parse(await readFile(resolve('tests/browser-regressions/google-flights.json'),'utf8'));
const env=parse(await readFile(resolve('.env'),'utf8').catch(()=>''));
const key=process.env.TYPESAFE_API_KEY||process.env.JEV_API_KEY||env.TYPESAFE_API_KEY||env.JEV_API_KEY;
if(!key)throw Error('Configure a server-side Jev key before running the browser regression.');
const output=resolve('.cache/browser-regressions',`${new Date().toISOString().replace(/[:.]/g,'-')}-${testCase.id}`);
await mkdir(output,{recursive:true});await writeFile(resolve(output,'case.json'),JSON.stringify(testCase,null,2));
const browser=new BrowserSession({headless:process.env.JOT_BROWSER_HEADLESS!=='0'});
let latestFrame:BrowserFrame|undefined;browser.subscribe(event=>{if(event.type==='frame')latestFrame=event.frame;});
const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),180000);
const started=performance.now();let requests=0;const provider=makeEvaluator(key,()=>{});
const evaluate:Evaluate=async(request,signal)=>{
 const id=++requests,start=performance.now();
 try{const response=await provider(request,signal);await appendFile(resolve(output,'requests.ndjson'),JSON.stringify({id,startMs:start-started,durationMs:performance.now()-start,questions:Object.keys(request.questions),stateCharacters:JSON.stringify(request.state).length,usage:response.usage})+'\n');return response;}
 catch(error){await appendFile(resolve(output,'requests.ndjson'),JSON.stringify({id,startMs:start-started,durationMs:performance.now()-start,error:(error as Error).message})+'\n');throw error;}
};
let error:string|undefined,terminal:unknown;const calls:{name:string;arguments:unknown;elapsedMs:number}[]=[];
try{
 for await(const event of generateChatReply(key,[{role:'user',content:testCase.prompt}],controller.signal,{evaluate,extraTools:createBrowserTools(browser),maxTurns:24})){
  const elapsedMs=Math.round(performance.now()-started);await appendFile(resolve(output,'events.ndjson'),JSON.stringify({...event,elapsedMs})+'\n');
  if(event.type==='tool_call'){calls.push({name:event.call.name,arguments:event.call.arguments,elapsedMs});console.log(JSON.stringify({elapsedMs,tool:event.call.name,arguments:event.call.arguments}));}
  if(event.type==='done')terminal=event;
 }
}catch(e){error=(e as Error).message;}
finally{
 clearTimeout(timeout);
 const elapsedMs=Math.round(performance.now()-started);
 const snapshot=browser.current;
 if(snapshot)await writeFile(resolve(output,'page.json'),JSON.stringify(snapshot,null,2));
 if(latestFrame)await writeFile(resolve(output,'page.jpg'),Buffer.from(latestFrame.data,'base64'));
 // Model completion and tool success are never a flight-results assertion.
 const report={case:testCase.id,elapsedMs,requests,calls,terminal,error,verdict:'unverified',reason:'Inspect final page against every expected field and visible flight options; model completion is not success.',pageUrl:snapshot?.url};
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();
 console.log(JSON.stringify({output,elapsedMs,requests,verdict:report.verdict,error}));process.exitCode=2;
}
