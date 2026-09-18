import React from 'react';
import {test} from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import {ToolCalls,type ToolEntry} from './ToolCalls';
const call:ToolEntry={id:'call-1',name:'calculate',arguments:{left:'6',operator:'add',right:'7'}};
test('running tool is visible without opening debug details',()=>{const html=renderToStaticMarkup(<ToolCalls calls={[call]} status="writing"/>);assert.match(html,/Calculating/);assert.match(html,/Running/);assert.match(html,/6 \+ 7/);});
test('completed and failed tools retain their actual arguments and results',()=>{
 const completed=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'ok',text:'13'}}]} status="complete"/>);assert.match(completed,/6 \+ 7 = 13/);assert.match(completed,/Completed/);
 const failed=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'error',error:'Connection failed'}}]} status="error"/>);assert.match(failed,/Failed/);assert.match(failed,/Connection failed/);
});
test('interrupted persisted calls cannot appear permanently running',()=>{const html=renderToStaticMarkup(<ToolCalls calls={[call]} status="stopped"/>);assert.match(html,/Stopped/);assert.doesNotMatch(html,/Waiting for the tool result/);});
test('tool output is text, never rendered markup',()=>{const html=renderToStaticMarkup(<ToolCalls calls={[{...call,result:{status:'ok',text:'<script>alert(1)</script>'}}]} status="complete"/>);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);});
