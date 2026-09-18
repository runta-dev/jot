import {test} from 'node:test';import assert from 'node:assert/strict';import {applyAgentEvent,type Message} from './chat-state';
const usage={requests:1,inputTokens:10,outputTokens:2};
test('streamed tool reply and final replacement preserve visible text and trace',()=>{
 const initial:Message={id:'message',role:'assistant',content:'',status:'writing'};
 const call={id:'call',name:'compose_reply',arguments:{}};
 let m=applyAgentEvent(initial,{type:'tool_call',call,...usage},100);
 m=applyAgentEvent(m,{type:'text_delta',delta:'Hello',...usage},200);
 m=applyAgentEvent(m,{type:'text_delta',delta:' world',...usage},300);assert.equal(m.content,'Hello world');
 m=applyAgentEvent(m,{type:'tool_result',message:{role:'tool',toolCallId:'call',name:call.name,result:{status:'ok',text:'Hello world'}},...usage},400);
 m=applyAgentEvent(m,{type:'replace',content:'Final answer',...usage},500);
 m=applyAgentEvent(m,{type:'done',reason:'complete',...usage},600);
 assert.equal(m.content,'Final answer');assert.equal(m.toolCalls?.[0].result?.text,'Hello world');assert.equal(m.toolCalls?.[0].startedAt,100);assert.equal(m.toolCalls?.[0].finishedAt,400);assert.equal(m.status,'complete');assert.equal(initial.content,'');
});
test('individual results update only their matching tool calls',()=>{
 let m:Message={id:'message',role:'assistant',content:'',status:'writing'};
 for(const id of ['a','b'])m=applyAgentEvent(m,{type:'tool_call',call:{id,name:'calculate',arguments:{}},...usage},0);
 m=applyAgentEvent(m,{type:'tool_result',message:{role:'tool',toolCallId:'b',name:'calculate',result:{status:'error',error:'failed'}},...usage},10);
 assert.equal(m.toolCalls?.[0].result,undefined);assert.equal(m.toolCalls?.[1].result?.status,'error');
});
