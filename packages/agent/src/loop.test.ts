import {test} from 'node:test';import assert from 'node:assert/strict';
import {runAgentLoop,emptySchema,type ToolFactory,type Model} from './index.ts';
test('provider-free loop feeds tool results into the next model turn',async()=>{
 let turns=0;const tool:ToolFactory=()=>({name:'example',description:'Example',parameters:emptySchema,async *execute(){return {status:'ok',text:'result'};}});
 const model:Model=async messages=>{turns++;if(turns===1)return {type:'tool_call',name:'example',arguments:{}};assert.equal(messages.at(-1)?.role,'tool');assert.equal((messages.at(-1) as any).result.text,'result');return {type:'answer',text:'Done'};};
 const events=[];for await(const event of runAgentLoop([{role:'user',content:'Test'}],{model,tools:[tool],signal:new AbortController().signal}))events.push(event);
 assert.deepEqual(events.map(e=>e.type),['tool_call','tool_result','replace','done']);assert.equal(turns,2);
});
test('provider-free streaming supports draft replacement',async()=>{
 const controller=new AbortController();const tool:ToolFactory=()=>({name:'draft',description:'Draft',parameters:emptySchema,async *execute(){yield {type:'text_delta',delta:'Draft'};return {status:'ok',text:'Draft'};}});
 const model:Model=async messages=>messages.some(m=>m.role==='tool')?{type:'answer',text:'Final'}:{type:'tool_call',name:'draft',arguments:{}};
 const events=[];for await(const event of runAgentLoop([{role:'user',content:'Test'}],{model,tools:[tool],signal:controller.signal}))events.push(event);
 assert.equal((events.find(e=>e.type==='text_delta') as any).delta,'Draft');assert.equal((events.find(e=>e.type==='replace') as any).content,'Final');
});
