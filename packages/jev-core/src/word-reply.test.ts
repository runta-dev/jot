import {test} from 'node:test';import assert from 'node:assert/strict';
import {generateWordReply,conversationLexemes} from './word-reply.ts';import type {Evaluate,EvaluationRequest,ChoiceAnswer} from './typesafe.ts';
const messages=[{role:'user' as const,content:'Say hello world.'}];
function mock(captured:EvaluationRequest[]):Evaluate{return async request=>{captured.push(structuredClone(request));const prefix=(request.state as any).reply_so_far;const answers:Record<string,ChoiceAnswer>={};for(const[id,q]of Object.entries(request.questions)){
 const desired=prefix===''?'Hello':prefix==='Hello'?'Hello world':null;
 const choice=id==='next'?(desired?Object.keys(q.criteria).find(k=>q.criteria[k]===desired)!:'END'):Object.keys(q.criteria)[0];
 assert.ok(choice,'Expected test continuation is available');answers[id]={type:'choice',choice,confidence:1,probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,k===choice?1:0]))};
 }return {model:'test',answers,usage:{input_tokens:10,output_tokens:2}};};}
const base={vocabulary:['hello','world'],forms:(w:string)=>[w]};
test('stream commits full chosen fragment before next call and ends on EOS',async()=>{
 const captured:EvaluationRequest[]=[];const events=[];for await(const e of generateWordReply('unused',messages,new AbortController().signal,{...base,evaluate:mock(captured)}))events.push(e);
 assert.equal(events.filter(e=>e.type==='character').map(e=>e.type==='character'?e.character:'').join(''),'Hello world');
 assert.equal(events.at(-1)?.type,'done');assert.equal((events.at(-1) as any).reason,'complete');
 assert.deepEqual(captured.map(r=>(r.state as any).reply_so_far),['','','','Hello','Hello','Hello world','Hello world']);
 assert.ok(captured.every(r=>JSON.stringify((r.state as any).conversation)===JSON.stringify(messages)));
 assert.ok(captured.every(r=>Object.values(r.questions).every(q=>Object.keys(q.criteria).length<=255)));
});
test('abort after a streamed fragment prevents every later evaluation',async()=>{
 const captured:EvaluationRequest[]=[],controller=new AbortController();const stream=generateWordReply('unused',messages,controller.signal,{...base,evaluate:mock(captured)});
 assert.equal((await stream.next()).value?.type,'character');const before=captured.length;controller.abort();await assert.rejects(stream.next());assert.equal(captured.length,before);
});
test('provider result arriving after cancellation is never emitted',async()=>{
 const controller=new AbortController(),captured:EvaluationRequest[]=[];const evaluate:Evaluate=async(r,s)=>{const result=await mock(captured)(r,s);controller.abort();return result;};
 const stream=generateWordReply('unused',messages,controller.signal,{...base,evaluate});await assert.rejects(stream.next());assert.equal(captured.length,1);
});
test('input and output budgets explicitly stop rather than pretending completion',async()=>{
 for(const options of [{maxInputTokens:10},{maxSteps:1}]){
 const captured:EvaluationRequest[]=[],events=[];for await(const e of generateWordReply('unused',messages,new AbortController().signal,{...base,...options,evaluate:mock(captured)}))events.push(e);
 assert.equal((events.at(-1) as any).reason,'maxInputTokens' in options?'budget':'limit');
 assert.equal(captured.length,'maxInputTokens' in options?1:3);
 }
});

test('conversation identifiers retain digits, hyphens and underscores without recasing',async()=>{
 const history=[{role:'user' as const,content:'Remember vexa-731 and task_42.'},{role:'user' as const,content:'Reply with my first code only.'}];
 assert.ok(conversationLexemes(history).includes('vexa-731'));assert.ok(conversationLexemes(history).includes('task_42'));
 const evaluate:Evaluate=async request=>{
  const prefix=(request.state as any).reply_so_far;const answers:Record<string,ChoiceAnswer>={};
  for(const [id,q]of Object.entries(request.questions)){
   const choice=id==='next'?(prefix?'END':Object.keys(q.criteria).find(k=>q.criteria[k]==='vexa-731')!):'vexa-731';assert.ok(Object.hasOwn(q.criteria,choice));
   answers[id]={type:'choice',choice,confidence:1,probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,k===choice?1:0]))};
  }return {model:'test',answers};
 };
 let text='';for await(const e of generateWordReply('unused',history,new AbortController().signal,{...base,evaluate}))if(e.type==='character')text+=e.character;
 assert.equal(text,'vexa-731');
});

test('source tokenization preserves times, decimals and version strings without sentence punctuation',()=>{
 assert.deepEqual(conversationLexemes([{role:'user',content:'At 16:20, use v2.10.3 and 3.14.'}]),['At','16:20','use','v2.10.3','and','3.14']);
});
