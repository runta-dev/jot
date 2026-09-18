import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'dotenv';
import {BrowserPool,BrowserSession,type BrowserFrame,type BrowserSnapshot} from '@jot/browser';
import {makeEvaluator,type Evaluate} from '@jot/jev-core';
import {generateChatReply} from '../server/chat-reply.ts';
import {createBrowserTools} from '../server/browser-tools.ts';
import {checkFlights} from '../tests/browser-regressions/flights-oracle.ts';

const testCase=JSON.parse(await readFile(resolve('tests/browser-regressions/google-flights.json'),'utf8'));
const env=parse(await readFile(resolve('.env'),'utf8').catch(()=>''));
const key=process.env.TYPESAFE_API_KEY||process.env.JEV_API_KEY||env.TYPESAFE_API_KEY||env.JEV_API_KEY;
if(!key)throw Error('Configure a server-side Jev key before running the browser regression.');
const warm=process.env.JOT_BROWSER_WARM==='1';
const output=resolve('.cache/browser-regressions',`${new Date().toISOString().replace(/[:.]/g,'-')}-${testCase.id}${warm?'-warm':'-cold'}`);
const sourceFiles=['server/jev-agent.ts','server/agent-tools.ts','server/browser-tools.ts','packages/jev-core/src/word-reply.ts','packages/browser/src/session.ts','packages/browser/src/snapshot.ts','packages/agent/src/loop.ts','packages/jev-core/src/typesafe.ts'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,createHash('sha256').update(await readFile(resolve(file))).digest('hex')])));
const pool=warm?new BrowserPool(1,{headless:process.env.JOT_BROWSER_HEADLESS!=='0'}):undefined;
const warmupStarted=performance.now();
const lease=pool?await pool.acquire('flights-regression'):undefined;
if(lease)await lease.session.ready(AbortSignal.timeout(30000));
const warmupMs=Math.round(performance.now()-warmupStarted);
const browser=lease?.session??new BrowserSession({headless:process.env.JOT_BROWSER_HEADLESS!=='0'});
await mkdir(output,{recursive:true});await writeFile(resolve(output,'environment.json'),JSON.stringify({sourceHashes,platform:process.platform,node:process.version,headless:process.env.JOT_BROWSER_HEADLESS!=='0',freshProfile:true,pool:pool?'BrowserPool':'direct',warm,warmupMs:warm?warmupMs:0,profile:'none',viewport:{width:1120,height:780},maxTurns:24,maxInputTokens:500000,timeoutMs:180000,browserDependencies:JSON.parse(await readFile(resolve('packages/browser/package.json'),'utf8')).dependencies},null,2));await writeFile(resolve(output,'case.json'),JSON.stringify(testCase,null,2));
let latestFrame:BrowserFrame|undefined;browser.subscribe(event=>{if(event.type==='frame')latestFrame=event.frame;});
const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),180000);
const started=performance.now();let requests=0;const provider=makeEvaluator(key,()=>{});
const evaluate:Evaluate=async(request,signal)=>{
 const id=++requests,start=performance.now();
 try{const response=await provider(request,signal);await appendFile(resolve(output,'requests.ndjson'),JSON.stringify({id,startMs:start-started,durationMs:performance.now()-start,model:response.model,questions:Object.keys(request.questions),stateCharacters:JSON.stringify(request.state).length,usage:response.usage})+'\n');return response;}
 catch(error){await appendFile(resolve(output,'requests.ndjson'),JSON.stringify({id,startMs:start-started,durationMs:performance.now()-start,error:(error as Error).message})+'\n');throw error;}
};
let error:string|undefined,terminal:unknown,firstMatchingMs:number|undefined,initialNavigationMs:number|undefined;const calls:{name:string;arguments:unknown;elapsedMs:number}[]=[];
try{
 for await(const event of generateChatReply(key,[{role:'user',content:testCase.prompt}],controller.signal,{evaluate,extraTools:createBrowserTools(browser),maxTurns:24})){
  const elapsedMs=Math.round(performance.now()-started);await appendFile(resolve(output,'events.ndjson'),JSON.stringify({...event,elapsedMs})+'\n');
  if(event.type==='tool_call'){calls.push({name:event.call.name,arguments:event.call.arguments,elapsedMs});console.log(JSON.stringify({elapsedMs,tool:event.call.name,arguments:event.call.arguments}));}
  if(event.type==='tool_result'&&event.message.name==='browser_navigate'&&event.message.result.status==='ok'&&initialNavigationMs===undefined)initialNavigationMs=elapsedMs;
  if(event.type==='tool_result'&&firstMatchingMs===undefined&&checkFlights(browser.current).passed)firstMatchingMs=elapsedMs;
  if(event.type==='done')terminal=event;
 }
}catch(e){error=(e as Error).message;}
finally{
 clearTimeout(timeout);
 const agentElapsedMs=Math.round(performance.now()-started);
 let snapshot:BrowserSnapshot|undefined,verificationError:string|undefined;
 try{snapshot=await browser.observe(AbortSignal.timeout(5000));}catch(e){verificationError=(e as Error).message;}
 const elapsedMs=Math.round(performance.now()-started),verificationMs=elapsedMs-agentElapsedMs;
 const finalFrame=latestFrame;
 if(snapshot)await writeFile(resolve(output,'page.json'),JSON.stringify(snapshot,null,2));
 if(finalFrame)await writeFile(resolve(output,'page.jpg'),Buffer.from(finalFrame.data,'base64'));
 // Model completion and tool success are never a flight-results assertion.
 const acceptance=checkFlights(snapshot);
 if(firstMatchingMs===undefined&&acceptance.passed)firstMatchingMs=elapsedMs;
 const report={case:testCase.id,elapsedMs,agentElapsedMs,verificationMs,verificationError,requests,calls,terminal,error,firstMatchingMs,initialNavigationMs,afterInitialNavigationMs:initialNavigationMs===undefined?undefined:agentElapsedMs-initialNavigationMs,acceptance,verdict:acceptance.passed&&!!finalFrame&&!error&&!verificationError&&(terminal as {reason?:string}|undefined)?.reason==='complete'?'passed':'failed',reason:'All configured flight fields and visible options must match independently of model completion.',pageUrl:snapshot?.url};
 await writeFile(resolve(output,'report.json'),JSON.stringify({...report,warm,warmupMs:warm?warmupMs:0,pool:pool?'BrowserPool':'direct'},null,2));lease?.release();if(pool)await pool.close();else await browser.close();
 console.log(JSON.stringify({output,elapsedMs,requests,verdict:report.verdict,error}));process.exitCode=report.verdict==='passed'?0:1;
}
