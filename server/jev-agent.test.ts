import {test} from 'node:test';import assert from 'node:assert/strict';
import {createJevModel} from './jev-agent.ts';import type {Evaluate,EvaluationRequest} from '@jot/jev-core';import type {AgentMessage,Tool} from '@jot/agent';
test('action selection omits parameter banks; argument selection gets only the chosen schema and latest controls',async()=>{
 const seen:EvaluationRequest[]=[];
 const evaluate:Evaluate=async request=>{seen.push(request);return {model:'test',answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,{type:'choice',choice:id==='action'?'browser_click':id==='browser_target'?'NONE':'current',confidence:1,probabilities:{[id==='action'?'browser_click':'current']:1}}]))};};
 const messages:AgentMessage[]=[{role:'user',content:'Continue'},{role:'tool',toolCallId:'a',name:'browser_observe',result:{status:'ok',text:'Old content',data:{elements:[{id:'old'}],url:'https://example.com'}}},{role:'tool',toolCallId:'b',name:'browser_observe',result:{status:'ok',text:'Current content',data:{elements:[{id:'current'}]}}}];
 const tool:Tool={name:'browser_click',description:'Click',parameters:{type:'object',required:['elementId'],additionalProperties:false,properties:{elementId:{type:'string' as const,description:'Target',oneOf:[{const:'current'}]}}},async *execute(){return {status:'ok'};}};
 const decision=await createJevModel(evaluate)(messages,[tool],new AbortController().signal);
 assert.deepEqual(decision,{type:'tool_call',name:'browser_click',arguments:{elementId:'current'}});
 const action=seen[0].state as any,args=seen[1].state as any;
 assert.equal(action.tools[0].parameters,undefined);assert.equal(action.messages[1].result.text,'Old content');assert.equal(action.messages[1].result.data.elements,undefined);
 assert.equal(action.messages[2].result.data.elements,undefined);assert.ok(Object.hasOwn(seen[0].questions.browser_target.criteria,'current'));assert.equal(args.selected_tool.parameters,undefined);assert.equal(args.tools,undefined);
 assert.ok(JSON.stringify(messages).includes('"old"'),'the stored transcript remains intact');
});
test('conditional field values are batched with the action and target',async()=>{
 const questions:string[][]=[];
 const evaluate:Evaluate=async request=>{
  const ids=Object.keys(request.questions);questions.push(ids);
  if(ids.includes('text'))assert.deepEqual((request.state as any).selected_arguments,{elementId:'destination'});
  return {model:'test',answers:Object.fromEntries(ids.map(id=>{const choice=id==='action'?'browser_fill':id==='elementId'||id==='browser_target'?'destination':id==='argument_0'?'Zurich':'London';return [id,{type:'choice',choice,confidence:1,probabilities:{[choice]:1}}];}))};
 };
 const tool:Tool={name:'browser_fill',description:'Fill',parameters:{type:'object',required:['elementId','text'],additionalProperties:false,properties:{elementId:{type:'string' as const,description:'Target',oneOf:[{const:'origin',description:'Origin city'},{const:'destination',description:'Destination city'}]},text:{type:'string' as const,description:'Content for chosen target',dependsOn:['elementId'],oneOf:[{const:'Zurich'},{const:'London'}]}}},async *execute(){return {status:'ok'};}};
 const decision=await createJevModel(evaluate)([{role:'user',content:'Zurich to London'}],[tool],new AbortController().signal);
 assert.deepEqual(questions,[['action','browser_target','argument_0','argument_1']]);assert.deepEqual(decision,{type:'tool_call',name:'browser_fill',arguments:{elementId:'destination',text:'London'}});
});
test('identical browser text is referenced once without changing stored history',async()=>{
 const messages:AgentMessage[]=[{role:'user',content:'Report the page'},{role:'tool',toolCallId:'old',name:'browser_observe',result:{status:'ok',text:'Same page text',data:{url:'https://example.com'}}},{role:'tool',toolCallId:'new',name:'browser_observe',result:{status:'ok',text:'Same page text',data:{url:'https://example.com'}}}];
 const evaluate:Evaluate=async request=>{
  const answers:any={};if(request.questions.notes)answers.notes={type:'choice',choice:'NONE',confidence:1,probabilities:{NONE:1}};
  const state=request.state as any;assert.equal(state.messages[1].result.text,undefined);assert.equal(state.messages[1].result.text_ref,'new');assert.equal(state.messages[2].result.text,'Same page text');
  assert.equal(request.questions.action.criteria.respond_0,undefined);
  assert.ok(request.questions.action.criteria.draft_answer);
  answers.action={type:'choice',choice:'draft_answer',confidence:1,probabilities:{draft_answer:1}};return {model:'test',answers};
 };
 const draft={name:'draft_answer',description:'Draft a concise answer',parameters:{type:'object' as const,properties:{notes:{type:'string' as const,description:'optional phrase',oneOf:[{const:'NONE'},{const:'INCLUDE'}]},phrase:{type:'string' as const,description:'facts',dependsOn:['notes']}},required:['notes'],additionalProperties:false as const},async *execute(){return {status:'ok' as const,text:'drafted'};}};
 assert.deepEqual(await createJevModel(evaluate)(messages,[draft],new AbortController().signal),{type:'tool_call',name:'draft_answer',arguments:{notes:'NONE'}});
 assert.equal((messages[1] as any).result.text,'Same page text');
});

test('browser observations cannot be sent back as the final reply',async()=>{
 const messages:AgentMessage[]=[{role:'user',content:'Find flights'},{role:'tool',toolCallId:'obs',name:'browser_observe',result:{status:'ok',text:'Sign in\nFlight search\nFilters\n7:40 AM – 8:35 AM British Airways'}}];
 const evaluate:Evaluate=async request=>{
  const answers:any={};if(request.questions.notes)answers.notes={type:'choice',choice:'NONE',confidence:1,probabilities:{NONE:1}};
  assert.equal(Object.keys(request.questions.action.criteria).filter(k=>k.startsWith('respond_')).length,0);
  assert.ok(request.questions.action.criteria.draft_answer);
  answers.action={type:'choice',choice:'draft_answer',confidence:1,probabilities:{draft_answer:1}};return {model:'test',answers};
 };
 const draft={name:'draft_answer',description:'Draft a concise answer',parameters:{type:'object' as const,properties:{notes:{type:'string' as const,description:'optional phrase',oneOf:[{const:'NONE'},{const:'INCLUDE'}]},phrase:{type:'string' as const,description:'facts',dependsOn:['notes']}},required:['notes'],additionalProperties:false as const},async *execute(){return {status:'ok' as const,text:'table'};}};
 assert.deepEqual(await createJevModel(evaluate)(messages,[draft],new AbortController().signal),{type:'tool_call',name:'draft_answer',arguments:{notes:'NONE'}});
});

test('draft_answer can skip or generate a must-keep phrase',async()=>{
 const draft={name:'draft_answer',description:'Draft',parameters:{type:'object' as const,required:['notes'],additionalProperties:false as const,properties:{notes:{type:'string' as const,description:'pass phrase?',oneOf:[{const:'NONE'},{const:'INCLUDE'}]},phrase:{type:'string' as const,description:'Must-keep facts.',dependsOn:['notes']}}},async *execute(){return {status:'ok' as const,text:'ok'};}};
 let noneCalls=0;
 const none:Evaluate=async request=>{
  noneCalls++;
  assert.ok(request.questions.action);assert.ok(request.questions.notes);
  return {model:'test',answers:{action:{type:'choice',choice:'draft_answer',confidence:1,probabilities:{draft_answer:1}},notes:{type:'choice',choice:'NONE',confidence:1,probabilities:{NONE:1}}}};
 };
 assert.deepEqual(await createJevModel(none)([{role:'user',content:'Who are you?'}],[draft],new AbortController().signal),{type:'tool_call',name:'draft_answer',arguments:{notes:'NONE'}});
 assert.equal(noneCalls,1);
 let nexts=0;
 const include:Evaluate=async request=>{
  if(request.questions.action)return {model:'test',answers:{action:{type:'choice',choice:'draft_answer',confidence:1,probabilities:{draft_answer:1}},notes:{type:'choice',choice:'INCLUDE',confidence:1,probabilities:{INCLUDE:1}}}};
  const answers:Record<string,any>={};
  for(const [id,q] of Object.entries(request.questions)){
   const keys=Object.keys(q.criteria);
   let choice=keys[0];
   if(id==='next'){nexts++;choice=nexts===1?(keys.find(k=>k!=='END')??'END'):'END';}
   else if(keys.includes('OTHER'))choice=keys.find(k=>k!=='OTHER')??'OTHER';
   if(!keys.includes(choice))choice=keys[0];
   answers[id]={type:'choice',choice,confidence:1,probabilities:{[choice]:1}};
  }
  return {model:'test',answers};
 };
 const decision=await createJevModel(include)([{role:'user',content:'Who are you? I am using Jot.'}],[draft],new AbortController().signal);
 assert.equal(decision.type,'tool_call');
 if(decision.type==='tool_call'){assert.equal(decision.arguments.notes,'INCLUDE');assert.ok(decision.arguments.phrase?.length);}
});
