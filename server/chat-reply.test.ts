import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateChatReply,sourceSpans} from './chat-reply.ts';
import {emptySchema,type ToolFactory} from '@jot/agent';
import type {Evaluate,EvaluationRequest} from '@jot/jev-core';
function response(request:EvaluationRequest,choices:Record<string,string>){return {model:'test',answers:Object.fromEntries(Object.entries(request.questions).map(([id,q])=>[id,{type:'choice' as const,choice:choices[id],confidence:1,probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,k===choices[id]?1:0]))}])),usage:{input_tokens:10,output_tokens:2}};}
const user=[{role:'user' as const,content:'Calculate 6 plus 7, then multiply the result by 2.'}];
test('loop appends assistant calls and tool results; next calculation consumes prior result',async()=>{
 const snapshots:EvaluationRequest[]=[];
 const evaluate:Evaluate=async r=>{snapshots.push(structuredClone(r));const results=(r.state as any).messages.filter((m:any)=>m.role==='tool');
  if(r.questions.action)return response(r,{action:results.length<2?'calculate':'respond_1'});
  assert.ok(r.questions.left);if(results.length)assert.equal(results[0].result.value,'13');
  return response(r,results.length?{left:'13',right:'2',operator:'multiply'}:{left:'6',right:'7',operator:'add'});
 };
 const events=[];for await(const e of generateChatReply('unused',user,new AbortController().signal,{evaluate}))events.push(e);
 assert.equal(events.filter(e=>e.type==='tool_call').length,2);assert.equal(events.filter(e=>e.type==='tool_result').length,2);
 assert.equal((events.find(e=>e.type==='replace') as any).content,'26');assert.equal(events.at(-1)?.requests,5);
 const transcript=(snapshots.at(-1)!.state as any).messages;
 assert.deepEqual(transcript.map((m:any)=>m.role),['user','assistant','tool','assistant','tool']);
 assert.equal(transcript[1].toolCall.id,transcript[2].toolCallId);
 assert.equal(user.length,1);
});
test('original whitespace/punctuation survive source tool and explicit final response turn',async()=>{
 const messages=[{role:'user' as const,content:'Repeat "blue  river!" exactly.'}];assert.ok(sourceSpans(messages)?.includes('blue  river!'));
 const evaluate:Evaluate=async r=>{if(r.questions.action)return response(r,{action:(r.state as any).messages.some((m:any)=>m.role==='tool')?'respond_0':'read_context'});const key=Object.keys(r.questions.spanId.criteria).find(k=>r.questions.spanId.criteria[k]==='blue  river!')!;return response(r,{spanId:key});};
 const events=[];for await(const e of generateChatReply('unused',messages,new AbortController().signal,{evaluate}))events.push(e);
 assert.equal((events.find(e=>e.type==='replace') as any).content,'blue  river!');assert.equal(events.at(-1)?.requests,3);
});
test('tool errors become observations and permit the next tool, rather than hidden fallback',async()=>{
 const tools:ToolFactory[]=[()=>({name:'fail',description:'fails',parameters:emptySchema,async *execute(){throw Error('Fixture failure');}}),()=>({name:'recover',description:'recovers',parameters:emptySchema,async *execute(){return {status:'ok',text:'Recovered'};}})];
 const evaluate:Evaluate=async r=>{const results=(r.state as any).messages.filter((m:any)=>m.role==='tool');if(results.length===1)assert.equal(results[0].result.error,'Fixture failure');return response(r,{action:results.length===0?'fail':results.length===1?'recover':'respond_0'});};
 const events=[];for await(const e of generateChatReply('unused',user,new AbortController().signal,{evaluate,tools}))events.push(e);
 assert.equal((events.find(e=>e.type==='replace') as any).content,'Recovered');
});
test('invalid typed arguments are never executed and are returned as a tool error',async()=>{
 let executions=0;const tools:ToolFactory[]=[()=>({name:'limited',description:'limited',parameters:{type:'object',properties:{value:{type:'string',description:'choose',oneOf:[{const:'allowed'}]}},required:['value'],additionalProperties:false},async *execute(){executions++;return {status:'ok',text:'unsafe'};}})];
 const evaluate:Evaluate=async r=>response(r,r.questions.action?{action:'limited'}:{value:'invalid'});
 const events=[];for await(const e of generateChatReply('unused',user,new AbortController().signal,{evaluate,tools,maxTurns:1}))events.push(e);
 assert.equal(executions,0);assert.equal((events.find(e=>e.type==='tool_result') as any).message.result.status,'error');
});
test('abort after tool call prevents execution and no late result is emitted',async()=>{
 const controller=new AbortController();let executed=false;const tools:ToolFactory[]=[()=>({name:'test',description:'test',parameters:emptySchema,async *execute(){executed=true;return {status:'ok',text:'late'};}})];
 const evaluate:Evaluate=async r=>response(r,{action:'test'});const stream=generateChatReply('unused',user,controller.signal,{evaluate,tools});assert.equal((await stream.next()).value?.type,'tool_call');controller.abort();await assert.rejects(stream.next());assert.equal(executed,false);
});
test('shared input budget and turn budget stop explicitly',async()=>{
 const evaluate:Evaluate=async r=>response(r,{action:'draft_answer'});const events=[];
 for await(const e of generateChatReply('unused',user,new AbortController().signal,{evaluate,maxInputTokens:10}))events.push(e);
 assert.equal((events.at(-1) as any).reason,'budget');assert.equal(events.at(-1)?.requests,1);
 const empty=[];for await(const e of generateChatReply('unused',user,new AbortController().signal,{evaluate,maxTurns:0}))empty.push(e);assert.equal((empty.at(-1) as any).reason,'limit');
});
test('source candidate overflow skips tool availability instead of silently pruning',()=>{assert.equal(sourceSpans([{role:'user',content:Array.from({length:100},(_,i)=>`word${i}`).join(' ')}]),null);});
test('stored tool transcript is replayed on the next user turn with matching call IDs',async()=>{
 const prior={role:'assistant' as const,content:'13',toolCalls:[{id:'previous-call',name:'calculate',arguments:{left:'6',operator:'add',right:'7'},result:{status:'ok' as const,text:'13',value:'13'}}]};
 const evaluate:Evaluate=async r=>{const messages=(r.state as any).messages;assert.equal(messages[1].toolCall.id,'previous-call');assert.equal(messages[2].toolCallId,'previous-call');assert.equal(messages[2].result.value,'13');return response(r,{action:'respond_0'});};
 const events=[];for await(const e of generateChatReply('unused',[{role:'user',content:'6 plus 7'},prior,{role:'user',content:'Repeat the result.'}],new AbortController().signal,{evaluate}))events.push(e);
 assert.equal((events.find(e=>e.type==='replace') as any).content,'13');
});
test('a failed tool-only turn survives HTTP parsing and reaches the next model turn',async()=>{
 const {parseMessages}=await import('./messages.ts');
 const input=parseMessages([{role:'user',content:'Try it.'},{role:'assistant',content:'',toolCalls:[{id:'failed-call',name:'compose_reply',arguments:{},result:{status:'error',error:'Provider timeout'}}]},{role:'user',content:'What happened?'}]);
 const evaluate:Evaluate=async r=>{const transcript=(r.state as any).messages;assert.ok(transcript.some((m:any)=>m.role==='tool'&&m.result.error==='Provider timeout'));assert.ok(!transcript.some((m:any)=>m.role==='assistant'&&m.content===''));throw Error('Observed retained history');};
 await assert.rejects(generateChatReply('unused',input,new AbortController().signal,{evaluate}).next(),/Observed retained history/);
});
test('free string arguments reuse Jev word generation instead of source-span selection',async()=>{
 const history=[{role:'user' as const,content:'search latest news about runta'}];
 let received='';const tools:ToolFactory[]=[()=>({name:'browser_search',description:'Search',parameters:{type:'object',required:['query'],additionalProperties:false,properties:{query:{type:'string',description:'Write search keywords.'}}},async *execute(args){received=args.query;return {status:'ok',text:'Executed'};}})];
 const evaluate:Evaluate=async r=>{
  if(r.questions.action)return response(r,{action:(r.state as any).messages.some((m:any)=>m.role==='tool')?'respond_0':'browser_search'});
  const prefix=(r.state as any).reply_so_far;
  const desired=prefix===''?'Runta':prefix==='Runta'?'Runta news':undefined;
  assert.ok(Object.values(r.questions).every(q=>String(q.instructions).includes('browser_search.query')));
  const choices=Object.fromEntries(Object.entries(r.questions).map(([id,q])=>[id,id==='next'?(desired?Object.keys(q.criteria).find(k=>q.criteria[k]===desired)!:'END'):(Object.hasOwn(q.criteria,'runta')?'runta':Object.hasOwn(q.criteria,'news')?'news':Object.keys(q.criteria)[0])]));
  return response(r,choices);
 };
 const events=[];for await(const e of generateChatReply('',history,new AbortController().signal,{evaluate,tools}))events.push(e);
 assert.equal(received,'Runta news');assert.ok(!history[0].content.includes(received));
 assert.equal(events.find(e=>e.type==='tool_call')?.call.arguments.query,'Runta news');
});
test('tool requiring human input stops the loop without inventing a reply or retrying',async()=>{
 let calls=0;
 const tools:ToolFactory[]=[()=>({name:'browser_observe',description:'Observe',parameters:emptySchema,async *execute(){return {status:'error',reason:'needs_input',text:'Complete verification in the browser.',error:'Verification required.'};}})];
 const evaluate:Evaluate=async r=>{calls++;return response(r,{action:'browser_observe'});};
 const events=[];for await(const e of generateChatReply('',[{role:'user',content:'Continue searching'}],new AbortController().signal,{tools,evaluate}))events.push(e);
 assert.equal(calls,1);assert.equal(events.at(-1)?.type,'done');assert.equal((events.at(-1) as any).reason,'needs_input');
 assert.equal(events.find(e=>e.type==='replace')?.content,'Complete verification in the browser.');
});
