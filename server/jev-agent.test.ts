import {test} from 'node:test';import assert from 'node:assert/strict';
import {createJevModel} from './jev-agent.ts';import type {Evaluate,EvaluationRequest,Question} from '@jot/jev-core';import type {AgentMessage,Tool} from '@jot/agent';
function choiceCriteria(q:Question){if(q.type!=='choice'||!q.criteria)throw Error('expected choice');return q.criteria;}
function answersFor(request:EvaluationRequest,choice:(id:string)=>string){return {model:'test',answers:Object.fromEntries(Object.entries(request.questions).map(([id,q])=>q.type==='noul'?[id,{type:'noul' as const,noul:choice(id)==='true'?1:0}]:[id,{type:'choice' as const,choice:choice(id),confidence:1,probabilities:{[choice(id)]:1}}]))};}
test('action selection omits parameter banks; argument selection gets only the chosen schema and latest controls',async()=>{
 const seen:EvaluationRequest[]=[];
 const evaluate:Evaluate=async request=>{seen.push(request);return {model:'test',answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,{type:'choice',choice:id==='action'?'browser_click':id==='browser_target'?'NONE':'current',confidence:1,probabilities:{[id==='action'?'browser_click':'current']:1}}]))};};
 const messages:AgentMessage[]=[{role:'user',content:'Continue'},{role:'tool',toolCallId:'a',name:'browser_observe',result:{status:'ok',text:'Old content',data:{elements:[{id:'old'}],url:'https://example.com'}}},{role:'tool',toolCallId:'b',name:'browser_observe',result:{status:'ok',text:'Current content',data:{elements:[{id:'current'}]}}}];
 const tool:Tool={name:'browser_click',description:'Click',parameters:{type:'object',required:['elementId'],additionalProperties:false,properties:{elementId:{type:'string' as const,description:'Target',oneOf:[{const:'current'}]}}},async *execute(){return {status:'ok'};}};
 const decision=await createJevModel(evaluate)(messages,[tool],new AbortController().signal);
 assert.deepEqual(decision,{type:'tool_call',name:'browser_click',arguments:{elementId:'current'}});
 const action=seen[0].state as any,args=seen[1].state as any;
 assert.equal(action.tools[0].parameters,undefined);assert.equal(action.messages[1].result.text,'Old content');assert.equal(action.messages[1].result.data.elements,undefined);
 assert.equal(action.messages[2].result.data.elements,undefined);assert.ok(Object.hasOwn(choiceCriteria(seen[0].questions.browser_target),'current'));assert.equal(args.selected_tool.parameters,undefined);assert.equal(args.tools,undefined);
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
 assert.deepEqual(questions,[['action','needs_long_draft','browser_target','argument_0','argument_1']]);assert.deepEqual(decision,{type:'tool_call',name:'browser_fill',arguments:{elementId:'destination',text:'London'}});
});

test('identical browser text is referenced once without changing stored history',async()=>{
 const messages:AgentMessage[]=[{role:'user',content:'Report the page'},{role:'tool',toolCallId:'old',name:'browser_observe',result:{status:'ok',text:'Same page text',data:{url:'https://example.com'}}},{role:'tool',toolCallId:'new',name:'browser_observe',result:{status:'ok',text:'Same page text',data:{url:'https://example.com'}}}];
 const evaluate:Evaluate=async request=>{
  const state=request.state as any;assert.equal(state.messages[1].result.text,undefined);assert.equal(state.messages[1].result.text_ref,'new');assert.equal(state.messages[2].result.text,'Same page text');
  assert.equal(choiceCriteria(request.questions.action).respond_0,undefined);
  assert.ok(choiceCriteria(request.questions.action).draft_message);
  return {model:'test',answers:{action:{type:'choice',choice:'draft_message',confidence:1,probabilities:{draft_message:1}}}};
 };
 const draft={name:'draft_message',description:'Draft a concise answer',parameters:{type:'object' as const,properties:{},required:[],additionalProperties:false as const},async *execute(){return {status:'ok' as const,text:'drafted'};}};
 assert.deepEqual(await createJevModel(evaluate)(messages,[draft],new AbortController().signal),{type:'tool_call',name:'draft_message',arguments:{}});
 assert.equal((messages[1] as any).result.text,'Same page text');
});

test('browser observations cannot be sent back as the final reply',async()=>{
 const messages:AgentMessage[]=[{role:'user',content:'Find flights'},{role:'tool',toolCallId:'obs',name:'browser_observe',result:{status:'ok',text:'Sign in\nFlight search\nFilters\n7:40 AM – 8:35 AM British Airways'}}];
 const evaluate:Evaluate=async request=>{
  assert.equal(Object.keys(choiceCriteria(request.questions.action)).filter(k=>k.startsWith('respond_')).length,0);
  assert.ok(choiceCriteria(request.questions.action).draft_message);
  return {model:'test',answers:{action:{type:'choice',choice:'draft_message',confidence:1,probabilities:{draft_message:1}}}};
 };
 const draft={name:'draft_message',description:'Draft a concise answer',parameters:{type:'object' as const,properties:{},required:[],additionalProperties:false as const},async *execute(){return {status:'ok' as const,text:'table'};}};
 assert.deepEqual(await createJevModel(evaluate)(messages,[draft],new AbortController().signal),{type:'tool_call',name:'draft_message',arguments:{}});
});

test('draft_message passes Jev wording as the hints argument',async()=>{
 const draft={name:'draft_message',description:'Draft',parameters:{type:'object' as const,required:['hints'],additionalProperties:false as const,properties:{hints:{type:'string' as const,description:'Jev short answer.'}}},async *execute(){return {status:'ok' as const,text:'ok'};}};
 let nexts=0;
 const evaluate:Evaluate=async request=>{
  if(request.questions.action)return {model:'test',answers:{action:{type:'choice',choice:'draft_message',confidence:1,probabilities:{draft_message:1}},needs_long_draft:{type:'noul',noul:1}}};
  if(request.questions.has_words)return {model:'test',answers:{has_words:{type:'noul',noul:0.1}}};
  const answers:Record<string,any>={};
  for(const [id,q] of Object.entries(request.questions)){
   const keys=Object.keys(q.type==='choice'?q.criteria??{}:{});
   let choice=keys[0];
   if(id==='next'){nexts++;choice=nexts===1?(keys.find(k=>k!=='END')??'END'):'END';}
   else if(keys.includes('OTHER'))choice=keys.find(k=>k!=='OTHER')??'OTHER';
   if(!keys.includes(choice))choice=keys[0];
   answers[id]={type:'choice',choice,confidence:1,probabilities:{[choice]:1}};
  }
  return {model:'test',answers};
 };
 const decision=await createJevModel(evaluate)([{role:'user',content:'Who are you? I am using Jot.'}],[draft],new AbortController().signal);
 assert.equal(decision.type,'tool_call');
 if(decision.type==='tool_call')assert.ok(decision.arguments.hints?.length);
});

test('does not keep browsing after a successful draft_message',async()=>{
 const evaluate:Evaluate=async()=>{throw Error('Jev should not choose another tool after draft_message');};
 const messages:AgentMessage[]=[{role:'user',content:'Find the last HN story'},{role:'tool',toolCallId:'d',name:'draft_message',result:{status:'ok',text:'The last story is X.'}}];
 const click={name:'browser_scroll',description:'Scroll',parameters:{type:'object' as const,properties:{},required:[],additionalProperties:false as const},async *execute(){return {status:'ok' as const,text:'scrolled'};}};
 assert.deepEqual(await createJevModel(evaluate)(messages,[click],new AbortController().signal),{type:'answer',text:'The last story is X.',reason:undefined});
});
