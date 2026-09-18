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
 assert.equal(text,'结果是 13.');assert.equal(result.text,text);assert.equal(result.reason,'complete');assert.deepEqual(request.messages,draftMessages(history));assert.equal(request.max_tokens,256);
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
test('truncated or aborted local streams never report completion',async()=>{
 const draft=createLocalDraft({fetch:async()=>new Response('data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n')});
 const stream=draft(history,new AbortController().signal);await stream.next();await assert.rejects(stream.next(),/before completion/);
 const controller=new AbortController();controller.abort();await assert.rejects(draft(history,controller.signal).next());
});
test('draft_answer delegates only its text generation while Jev still selects actions',async()=>{
 let localCalls=0,decisions=0;
 const evaluate:Evaluate=async()=>{const choice=decisions++?'respond_0':'draft_answer';return {model:'fixture',answers:{action:{type:'choice',choice,confidence:1,probabilities:{[choice]:1}}}};};
 const events=[];for await(const e of generateChatReply('',[{role:'user',content:'Explain rain.'}],new AbortController().signal,{evaluate,draft:async function*(messages){localCalls++;assert.equal((messages[0] as any).content,'Explain rain.');yield {type:'text_delta',delta:'Local answer.'};return {status:'ok',text:'Local answer.'};}}))events.push(e);
 assert.equal(localCalls,1);assert.equal(decisions,2);assert.ok(events.some(e=>e.type==='tool_call'&&e.call.name==='draft_answer'));assert.equal(events.at(-1)?.type,'done');
});
