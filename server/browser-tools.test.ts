import {test} from 'node:test';import assert from 'node:assert/strict';
import {createBrowserTools} from './browser-tools.ts';
import {validateArguments} from '@jot/agent';
import type {BrowserSession,BrowserSnapshot,BrowserAction} from '@jot/browser';
test('browser tools use observed targets and exact user text; results omit internal guards',async()=>{
 const snapshot:BrowserSnapshot={id:'fresh',url:'https://example.com/',title:'Form',text:'Visible result',elements:[{id:'field',name:'Message',role:'textbox',actions:['fill','click'],guard:'internal',rect:{x:0,y:0,width:20,height:20}}],scroll:{x:0,y:0,height:400,viewportHeight:400},viewport:{width:500,height:400},observedAt:0};
 const actions:BrowserAction[]=[];
 const browser={current:snapshot,act:async(action:BrowserAction)=>{actions.push(action);return snapshot;},observe:async()=>snapshot} as unknown as BrowserSession;
 const context={messages:[{role:'user' as const,content:'Open https://example.com/ and enter "Jot works" in Message.'}],signal:new AbortController().signal};
 const tools=createBrowserTools(browser).map(f=>f(context)).filter(t=>t!==null);
 const fill=tools.find(t=>t.name==='browser_fill')!;
 validateArguments(fill.parameters,{elementId:'field',text:'Jot works'});
 const result=await fill.execute({elementId:'field',text:'Jot works'}).next();
 assert.deepEqual(actions,[{type:'fill',snapshotId:'fresh',elementId:'field',text:'Jot works'}]);
 assert.ok(result.done);assert.equal(result.value.text,'Visible result');assert.ok(!JSON.stringify(result.value.data).includes('internal'));
 assert.throws(()=>validateArguments(fill.parameters,{elementId:'unobserved',text:'Jot works'}));
 assert.throws(()=>validateArguments(fill.parameters,{elementId:'field',text:'invented text'}));
});
test('an unobserved browser offers observation and user URLs but no guessed targets',()=>{
 const browser={current:undefined} as unknown as BrowserSession;
 const tools=createBrowserTools(browser).map(f=>f({messages:[{role:'user',content:'Open https://example.com'}],signal:new AbortController().signal})).filter(t=>t!==null);
 assert.ok(tools.some(t=>t.name==='browser_observe'));assert.ok(tools.some(t=>t.name==='browser_navigate'));assert.ok(!tools.some(t=>t.name==='browser_click'));
});
