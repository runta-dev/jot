import {test} from 'node:test';import assert from 'node:assert/strict';
import {createJevModel} from './jev-agent.ts';import type {Evaluate,EvaluationRequest} from '@jot/jev-core';import type {AgentMessage,Tool} from '@jot/agent';
test('action selection omits parameter banks; argument selection gets only the chosen schema and latest controls',async()=>{
 const seen:EvaluationRequest[]=[];
 const evaluate:Evaluate=async request=>{seen.push(request);return {model:'test',answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,{type:'choice',choice:id==='action'?'browser_click':id==='browser_target'?'NONE':'current',confidence:1,probabilities:{[id==='action'?'browser_click':'current']:1}}]))};};
 const messages:AgentMessage[]=[{role:'user',content:'Continue'},{role:'tool',toolCallId:'a',name:'browser_observe',result:{status:'ok',text:'Old content',data:{elements:[{id:'old'}],url:'https://example.com'}}},{role:'tool',toolCallId:'b',name:'browser_observe',result:{status:'ok',text:'Current content',data:{elements:[{id:'current'}]}}}];
 const tool:Tool={name:'browser_click',description:'Click',parameters:{type:'object',required:['elementId'],additionalProperties:false,properties:{elementId:{type:'string',description:'Target',oneOf:[{const:'current'}]}}},async *execute(){return {status:'ok'};}};
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
 const tool:Tool={name:'browser_fill',description:'Fill',parameters:{type:'object',required:['elementId','text'],additionalProperties:false,properties:{elementId:{type:'string',description:'Target',oneOf:[{const:'origin',description:'Origin city'},{const:'destination',description:'Destination city'}]},text:{type:'string',description:'Content for chosen target',dependsOn:['elementId'],oneOf:[{const:'Zurich'},{const:'London'}]}}},async *execute(){return {status:'ok'};}};
 const decision=await createJevModel(evaluate)([{role:'user',content:'Zurich to London'}],[tool],new AbortController().signal);
 assert.deepEqual(questions,[['action','browser_target','argument_0','argument_1']]);assert.deepEqual(decision,{type:'tool_call',name:'browser_fill',arguments:{elementId:'destination',text:'London'}});
});
test('identical browser text is referenced once without changing stored history',async()=>{
 const messages:AgentMessage[]=[{role:'user',content:'Report the page'},{role:'tool',toolCallId:'old',name:'browser_observe',result:{status:'ok',text:'Same page text',data:{url:'https://example.com'}}},{role:'tool',toolCallId:'new',name:'browser_observe',result:{status:'ok',text:'Same page text',data:{url:'https://example.com'}}}];
 const evaluate:Evaluate=async request=>{
  const state=request.state as any;assert.equal(state.messages[1].result.text,undefined);assert.equal(state.messages[1].result.text_ref,'new');assert.equal(state.messages[2].result.text,'Same page text');
  assert.deepEqual(Object.keys(request.questions.action.criteria),['respond_0']);
  return {model:'test',answers:{action:{type:'choice',choice:'respond_0',confidence:1,probabilities:{respond_0:1}}}};
 };
 assert.deepEqual(await createJevModel(evaluate)(messages,[],new AbortController().signal),{type:'answer',text:'Same page text',reason:undefined});
 assert.equal((messages[1] as any).result.text,'Same page text');
});
