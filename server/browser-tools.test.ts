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
test('browser_read returns exact title and headings as tool evidence',async()=>{
 const browser={observe:async()=>({title:'Exact title',headings:['First heading','Second heading'],url:'https://example.com/'})} as unknown as BrowserSession;
 const read=createBrowserTools(browser).map(f=>f({messages:[],signal:new AbortController().signal})).find(t=>t?.name==='browser_read')!;
 const output=await read.execute({field:'title_and_headings'}).next();assert.ok(output.done);
 assert.equal(output.value.text,'Title: Exact title\nHeadings:\nFirst heading\nSecond heading');
 assert.deepEqual(output.value.data,{source:'browser',url:'https://example.com/',field:'title_and_headings'});
});
test('navigation is available without a full URL and normalizes a bare domain',async()=>{
 const actions:BrowserAction[]=[];
 const browser={act:async(a:BrowserAction)=>{actions.push(a);return {url:'https://example.com/',title:'Example',text:'Example',elements:[]};}} as unknown as BrowserSession;
 const context={messages:[{role:'user' as const,content:'Open example.com'}],signal:new AbortController().signal};
 const navigate=createBrowserTools(browser).map(f=>f(context)).find(t=>t?.name==='browser_navigate')!;
 validateArguments(navigate.parameters,{url:'example.com'});await navigate.execute({url:'example.com'}).next();
 assert.deepEqual(actions,[{type:'navigate',url:'https://example.com/'}]);
});
test('search without any URL navigates the same browser session using the selected query',async()=>{
 const actions:BrowserAction[]=[];
 const browser={act:async(a:BrowserAction)=>{actions.push(a);return {url:'https://www.google.com/search',title:'Search',text:'Actual page text',elements:[]};}} as unknown as BrowserSession;
 const context={messages:[{role:'user' as const,content:'Search for "browser automation"'}],signal:new AbortController().signal};
 const tools=createBrowserTools(browser).map(f=>f(context));
 assert.ok(tools.some(t=>t?.name==='browser_navigate'));
 const search=tools.find(t=>t?.name==='browser_search')!;validateArguments(search.parameters,{query:'browser automation'});
 const output=await search.execute({query:'browser automation'}).next();assert.ok(output.done);
 assert.deepEqual(actions,[{type:'navigate',url:'https://www.google.com/search?q=browser%20automation'}]);assert.equal(output.value.text,'Actual page text');
});

test('does not re-offer observe after a successful observation',()=>{
 const browser={current:{id:'s',url:'https://example.com',title:'T',text:'Hello',elements:[],scroll:{x:0,y:0,height:1,viewportHeight:1},viewport:{width:1,height:1},observedAt:1},observe:async()=>({id:'s',url:'https://example.com',title:'T',text:'Hello',elements:[],scroll:{x:0,y:0,height:1,viewportHeight:1},viewport:{width:1,height:1},observedAt:1})} as any;
 const messages=[{role:'user' as const,content:'Look'},{role:'tool' as const,toolCallId:'o',name:'browser_observe',result:{status:'ok' as const,text:'Hello'}}];
 const tools=createBrowserTools(browser).map(f=>f({messages,signal:new AbortController().signal})).filter((t):t is NonNullable<typeof t>=>!!t);
 assert.ok(!tools.some(t=>t.name==='browser_observe'));
});

test('sign-in chrome is not a click target unless the user asked to sign in',()=>{
 const snapshot:BrowserSnapshot={id:'s',url:'https://www.google.com/travel/flights',title:'Flights',text:'Flights',elements:[{id:'1',name:'Sign in',role:'button',actions:['click'],rect:{x:0,y:0,width:10,height:10}},{id:'2',name:'Search',role:'button',actions:['click'],rect:{x:0,y:0,width:10,height:10}}],scroll:{x:0,y:0,height:1,viewportHeight:1},viewport:{width:1,height:1},observedAt:1};
 const browser={current:snapshot} as unknown as BrowserSession;
 const tools=createBrowserTools(browser).map(f=>f({messages:[{role:'user',content:'Find flights to London'}],signal:new AbortController().signal})).filter((t):t is NonNullable<typeof t>=>!!t);
 const click=tools.find(t=>t.name==='browser_click')!;
 assert.ok(click.parameters.properties.elementId.oneOf?.some(o=>o.const==='2'));
 assert.ok(!click.parameters.properties.elementId.oneOf?.some(o=>o.const==='1'));
});

test('google account pages stop the agent instead of filling the login form',async()=>{
 const snapshot={id:'s',url:'https://accounts.google.com/v3/signin/identifier',title:'Sign in',text:'Email or phone',elements:[],scroll:{x:0,y:0,height:1,viewportHeight:1},viewport:{width:1,height:1},observedAt:1};
 const browser={observe:async()=>snapshot,act:async()=>snapshot} as unknown as BrowserSession;
 const wait=createBrowserTools(browser).map(f=>f({messages:[{role:'user',content:'Find flights'}],signal:new AbortController().signal})).find(t=>t?.name==='browser_wait')!;
 const output=await wait.execute({}).next();assert.ok(output.done);
 assert.equal(output.value.reason,'needs_input');
});
