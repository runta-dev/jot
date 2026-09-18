import React from 'react';
import {test} from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import {ToolCalls,type ToolEntry} from './ToolCalls';
const call:ToolEntry={id:'call-1',name:'calculate',arguments:{left:'6',operator:'add',right:'7'}};
test('running tool is visible without opening debug details',()=>{const html=renderToStaticMarkup(<ToolCalls calls={[call]} status="writing"/>);assert.match(html,/Running/);assert.match(html,/Running/);assert.match(html,/6 \+ 7/);});
test('completed and failed tools retain their actual arguments and results',()=>{
 const completed=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'ok',text:'13'}}]} status="complete"/>);assert.match(completed,/Ran calculate\(6 \+ 7\)/);assert.match(completed,/>13<\/pre>/);assert.match(completed,/Completed/);
 const failed=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'error',error:'Connection failed'}}]} status="error"/>);assert.match(failed,/Failed/);assert.match(failed,/Connection failed/);
});
test('interrupted persisted calls cannot appear permanently running',()=>{const html=renderToStaticMarkup(<ToolCalls calls={[call]} status="stopped"/>);assert.match(html,/Stopped/);assert.doesNotMatch(html,/Waiting for the tool result/);});
test('tool output is text, never rendered markup',()=>{const html=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'ok',text:'<script>alert(1)</script>'}}]} status="complete"/>);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);});

test('group exposes elapsed work time and rows use tool icons rather than success badges',()=>{
 const html=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'ok',text:'13'}}]} status="complete" elapsedMs={36500}/>);
 assert.match(html,/Worked for 36s/);assert.match(html,/tool-icon/);assert.doesNotMatch(html,/tool-state|tool-duration|lucide-check/);
});
test('running group shows Working label and native disclosures remain keyboard accessible',()=>{
 const html=renderToStaticMarkup(<ToolCalls calls={[call]} status="writing" elapsedMs={36000}/>);
 assert.match(html,/Working for 36s/);assert.match(html,/<details/);assert.match(html,/<summary/);assert.match(html,/class="tool-row running"/);
});
test('active tool stays above completed activity while work is in progress',()=>{
 const html=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'ok',text:'13'}},{id:'reading',name:'read_context',arguments:{spanId:'s2'}}]} status="writing" elapsedMs={1200}/>);
 assert.ok(html.indexOf('Running read_context')<html.indexOf('Ran calculate'));
});

test('completed groups start collapsed while running groups start expanded',()=>{
 const completed=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'ok',text:'13'}}]} status="complete"/>);
 assert.match(completed,/class="tool-work-status" aria-expanded="false"/);assert.match(completed,/aria-hidden="true" inert=""/);
 const running=renderToStaticMarkup(<ToolCalls calls={[call]} status="writing"/>);
 assert.match(running,/class="tool-work-status" aria-expanded="true"/);assert.match(running,/tool-disclosure is-expanded/);
});
