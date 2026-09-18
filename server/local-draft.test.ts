import {test} from 'node:test';import assert from 'node:assert/strict';
import {createLocalDraft,draftMessages} from './local-draft.ts';
import {generateChatReply} from './chat-reply.ts';
import type {Evaluate} from '@jot/jev-core';
const history=[{role:'user' as const,content:'Explain this result.'},{role:'tool' as const,name:'calculate',toolCallId:'c1',result:{status:'ok' as const,text:'13'}}];
test('local draft forwards history and tool evidence and streams the actual model text',async()=>{
 let request:any;
 const fetcher:typeof fetch=async(_url,init)=>{request=JSON.parse(String(init?.body));
  const wire='data: '+JSON.stringify({choices:[{delta:{content:'结果是 '}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:'13.'},finish_reason:'stop'}],usage:{completion_tokens:5}})+'\n\ndata: [DONE]\n\n';
  const bytes=new TextEncoder().encode(wire);
  return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}}));};
 const generator=createLocalDraft({fetch:fetcher})(history,new AbortController().signal);let text='';let result;
 while(true){const item=await generator.next();if(item.done){result=item.value;break;}text+=item.value.delta;}
 assert.equal(text,'结果是 13.');assert.equal(result.text,text);assert.equal(result.reason,'complete');assert.deepEqual(request.messages,draftMessages(history));assert.equal(request.max_tokens,512);
 assert.equal((result.data as any).provider,'local-mlx');
 assert.match(JSON.stringify(request.messages),/calculate: ok \| 13/);
});
test('draft prompt keeps tool text and drops snapshot control lists',()=>{
 const messages=[{role:'user' as const,content:'What is on the page?'},{role:'tool' as const,name:'browser_observe',toolCallId:'b1',result:{status:'ok' as const,text:'Zurich to London',data:{url:'https://flights.example',title:'Flights',elements:Array.from({length:40},(_,i)=>({id:String(i),role:'button'}))}}}];
 const packed=JSON.stringify(draftMessages(messages as any));
 assert.match(packed,/Zurich to London/);
 assert.match(packed,/https:\/\/flights.example/);
 assert.doesNotMatch(packed,/"elements"/);
 assert.doesNotMatch(packed,/"role":"button"/);
});
test('draft prompt includes an optional must-keep phrase',()=>{
 const packed=JSON.stringify(draftMessages(history,'13 then 26'));
 assert.match(packed,/Must keep this phrase/);
 assert.match(packed,/13 then 26/);
});
test('truncated or aborted local streams never report completion',async()=>{
 const draft=createLocalDraft({fetch:async()=>new Response('data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n')});
 const stream=draft(history,new AbortController().signal);await stream.next();await assert.rejects(stream.next(),/before completion/);
 const controller=new AbortController();controller.abort();await assert.rejects(draft(history,controller.signal).next());
});
test('draft_answer delegates only its text generation while Jev still selects actions',async()=>{
 let localCalls=0,decisions=0;
 const evaluate:Evaluate=async request=>{const answers:any={};if(request.questions.notes)answers.notes={type:'choice',choice:'NONE',confidence:1,probabilities:{NONE:1}};if(request.questions.action){const choice=decisions++?'respond_0':'draft_answer';answers.action={type:'choice',choice,confidence:1,probabilities:{[choice]:1}};}return {model:'fixture',answers};};
 const events=[];for await(const e of generateChatReply('',[{role:'user',content:'Explain rain.'}],new AbortController().signal,{evaluate,draft:async function*(messages){localCalls++;assert.equal((messages[0] as any).content,'Explain rain.');yield {type:'text_delta',delta:'Local answer.'};return {status:'ok',text:'Local answer.'};}}))events.push(e);
 assert.equal(localCalls,1);assert.equal(decisions,2);assert.ok(events.some(e=>e.type==='tool_call'&&e.call.name==='draft_answer'));assert.equal(events.at(-1)?.type,'done');
});

test('draft prompt includes a markdown flight table extracted from page evidence',()=>{
 const text=`Search results\nBest\n7:40 AM\n–\n8:35 AM\nBritish Airways\n1 hr 55 min\nNonstop\n$178\n4:45 PM\n–\n5:35 PM\neasyJet\n1 hr 50 min\nNonstop\n$188`;
 const packed=JSON.stringify(draftMessages([{role:'user',content:'Find one-way flights from Zurich to London on September 20.'},{role:'tool',name:'browser_observe',toolCallId:'b1',result:{status:'ok',text}}] as any));
 assert.match(packed,/Formatted flight options/);
 assert.match(packed,/\| Depart \| Arrive \| Airline \| Duration \| Stops \| Price \|/);
 assert.match(packed,/7:40 AM/);
 assert.match(packed,/easyJet/);
 assert.match(packed,/\$178/);
});

test('draft_answer emits a markdown flight table from evidence without calling the local generator',async()=>{
 let called=0;const fetcher:typeof fetch=async()=>{called++;throw Error('should not call');};
 const text=`Search results\n7:40 AM\n–\n8:35 AM\nBritish Airways\n1 hr 55 min\nNonstop\n$178\n4:45 PM\n–\n5:35 PM\neasyJet\n1 hr 50 min\nNonstop\n$188`;
 const gen=createLocalDraft({fetch:fetcher})([{role:'user',content:'Show the flights.'},{role:'tool',name:'browser_observe',toolCallId:'b1',result:{status:'ok',text}}] as any,new AbortController().signal);
 const first=await gen.next();assert.equal(first.done,false);assert.match(first.value!.delta,/\| Depart \|/);
 const done=await gen.next();assert.equal(done.done,true);assert.equal(called,0);assert.equal((done.value as any).data.provider,'evidence-table');assert.match((done.value as any).text,/easyJet/);
});

test('stuck local draft fails instead of hanging the chat',async()=>{
 const draft=createLocalDraft({timeoutMs:30,fetch:(_url,init)=>new Promise((_,reject)=>{init?.signal?.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'TimeoutError'})));})});
 const start=Date.now();
 await assert.rejects(draft(history,new AbortController().signal).next(),/unavailable or stuck|aborted|Timeout/);
 assert.ok(Date.now()-start<1000);
});
