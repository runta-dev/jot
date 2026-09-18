import {test} from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import type {AddressInfo} from 'node:net';
import {BrowserSession} from './session.ts';
test('owned Chromium observes, fills, selects, clicks, streams frames and rejects stale targets',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:30000},async t=>{
 let mutate=false;let acknowledged!:()=>void;const changed=new Promise<void>(r=>acknowledged=r);
 const server=createServer((req,res)=>{
  if(req.url==='/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({mutate}));return;}
  if(req.url==='/ack'){acknowledged();res.end('ok');return;}
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><title>Jot browser test</title></head><body><form onsubmit="event.preventDefault();document.querySelector('#result').textContent=document.querySelector('#query').value+' '+document.querySelector('#color').value+' #'+(++window.submits)"><label>Query <input id="query"></label><label>Color <select id="color" tabindex="-1"><option value="red">Red</option><option value="blue">Blue</option></select></label><button id="apply">Apply</button></form><p id="result"></p><script>window.submits=0;const timer=setInterval(async()=>{const s=await(await fetch('/state')).json();if(s.mutate){clearInterval(timer);document.querySelector('#apply').textContent='Different action';await fetch('/ack');}},25);</script></body></html>`);
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as AddressInfo).port;
 const browser=new BrowserSession();t.after(async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 let frames=0;let firstFrame!:()=>void;const frameReady=new Promise<void>(r=>firstFrame=r);const unsubscribe=browser.subscribe(e=>{if(e.type==='frame'){frames++;firstFrame();assert.ok(e.frame.data.length>0);}});t.after(unsubscribe);
 let snapshot=await browser.act({type:'navigate',url:`http://127.0.0.1:${port}`},new AbortController().signal);
 assert.equal(snapshot.title,'Jot browser test');const original=snapshot;
 const input=snapshot.elements.find(e=>e.name==='Query')!;assert.ok(input.actions.includes('fill'));
 snapshot=await browser.act({type:'fill',snapshotId:snapshot.id,elementId:input.id,text:'Jot'},new AbortController().signal);
 await assert.rejects(browser.act({type:'click',snapshotId:original.id,elementId:original.elements.find(e=>e.name==='Apply')!.id},new AbortController().signal),/Page changed/);
 assert.equal(browser.current,undefined);assert.equal(browser.currentStatus.error,undefined);snapshot=await browser.observe(new AbortController().signal);
 const select=snapshot.elements.find(e=>e.name==='Color')!;snapshot=await browser.act({type:'select',snapshotId:snapshot.id,elementId:select.id,value:'blue'},new AbortController().signal);
 snapshot=await browser.act({type:'click',snapshotId:snapshot.id,elementId:snapshot.elements.find(e=>e.name==='Apply')!.id},new AbortController().signal);
 assert.match(snapshot.text,/Jot blue/);let frameTimer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([frameReady,new Promise((_,reject)=>{frameTimer=setTimeout(()=>reject(Error('No live browser frame received')),3000);})]);}finally{clearTimeout(frameTimer);}assert.ok(frames>0);
 const field=snapshot.elements.find(e=>e.name==='Query')!;
 const signal=new AbortController().signal;
 await browser.input({type:'click',x:field.rect.x+field.rect.width/2,y:field.rect.y+field.rect.height/2},signal);
 await browser.input({type:'key',key:'ControlOrMeta+A'},signal);
 await browser.input({type:'text',text:'abc'},signal);
 await browser.input({type:'key',key:'ArrowLeft'},signal);
 await browser.input({type:'key',key:'Backspace'},signal);
 await browser.input({type:'text',text:'Z'},signal);
 await browser.input({type:'key',key:'Enter'},signal);
 snapshot=await browser.observe(signal);assert.match(snapshot.text,/aZc blue #2/);
 await browser.input({type:'key',key:'Tab'},signal);
 await browser.input({type:'key',key:'Space'},signal);
 snapshot=await browser.observe(signal);assert.match(snapshot.text,/aZc blue #3/);

 const oldTarget=snapshot.elements.find(e=>e.name==='Apply')!;mutate=true;await changed;
 await assert.rejects(browser.act({type:'click',snapshotId:snapshot.id,elementId:oldTarget.id},new AbortController().signal),/Target changed/);
 const controller=new AbortController();controller.abort();await assert.rejects(browser.observe(controller.signal));
});

test('manual input is delivered before a pending navigation completes',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 let release!:()=>void,requested!:()=>void;
 const resourceRequested=new Promise<void>(r=>requested=r);
 const resourceGate=new Promise<void>(r=>release=r);
 const server=createServer(async(req,res)=>{
  if(req.url==='/pending.js'){requested();await resourceGate;res.end('');return;}
  res.setHeader('Content-Type','text/html');res.end('<input id="value"><script src="/pending.js"></script>');
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const browser=new BrowserSession();const signal=new AbortController().signal;
 t.after(async()=>{release();await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 const navigation=browser.act({type:'navigate',url:`http://127.0.0.1:${(server.address() as AddressInfo).port}`},signal);
 await resourceRequested;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  await Promise.race([browser.input({type:'key',key:'Tab'},signal),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Input waited for navigation')),1000);})]);
  await browser.input({type:'text',text:'responsive'},signal);
 }finally{clearTimeout(timer);release();}
 const snapshot=await navigation;
 assert.equal(snapshot.elements.find(e=>e.id&&e.role==='textbox')?.value,'responsive');
});

test('page-initiated navigation reports loading before commit and clears after load',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 let release!:()=>void;
 const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  if(req.url==='/next'){release=()=>res.end('<title>Next</title>Done');return;}
  res.end('<title>Start</title><a href="/next">Next</a>');
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const browser=new BrowserSession();
 t.after(async()=>{release?.();await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 const signal=new AbortController().signal;
 const snapshot=await browser.act({type:'navigate',url:`http://127.0.0.1:${(server.address() as AddressInfo).port}`},signal);
 const link=snapshot.elements.find(e=>e.name==='Next')!;
 const loading=new Promise<void>(resolve=>{const off=browser.subscribe(e=>{if(e.type==='status'&&e.status.loading){off();resolve();}});});
 await browser.input({type:'click',x:link.rect.x+link.rect.width/2,y:link.rect.y+link.rect.height/2},signal);
 await loading;
 assert.equal(browser.currentStatus.loading,true);
 while(!release)await new Promise(r=>setTimeout(r,10));
 const finished=new Promise<void>(resolve=>{const off=browser.subscribe(e=>{if(e.type==='status'&&!e.status.loading&&e.status.url.endsWith('/next')){off();resolve();}});});
 release();await finished;
 assert.equal(browser.currentStatus.loading,false);
});

test('dedicated persistent profile keeps site state across browser restarts',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:30000},async t=>{
 const {mkdtemp,rm,stat}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const profileDirectory=await mkdtemp(join(tmpdir(),'jot-profile-test-'));
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<p id="state"></p><script>const returning=localStorage.getItem('jot-check')==='saved'&&document.cookie.includes('jot-check=saved');document.querySelector('#state').textContent=returning?'Returning profile':'New profile';localStorage.setItem('jot-check','saved');document.cookie='jot-check=saved; Max-Age=3600; SameSite=Lax';</script>`);});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const sessions:BrowserSession[]=[];
 t.after(async()=>{await Promise.all(sessions.map(s=>s.close()));await new Promise<void>(r=>server.close(()=>r()));await rm(profileDirectory,{recursive:true,force:true});});
 const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}`,signal=new AbortController().signal;
 const first=new BrowserSession({profileDirectory});sessions.push(first);
 assert.match((await first.act({type:'navigate',url},signal)).text,/New profile/);await first.close();
 assert.equal((await stat(profileDirectory)).mode&0o777,0o700);
 const second=new BrowserSession({profileDirectory});sessions.push(second);
 assert.match((await second.act({type:'navigate',url},signal)).text,/Returning profile/);
});

test('aborted navigation releases the action queue and allows a new page',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 let loading!:()=>void;const requested=new Promise<void>(r=>loading=r);
 const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  if(req.url==='/blocked.js'){loading();return;}
  res.end(req.url==='/slow'?'<p>Loading</p><script src="/blocked.js"></script>':'<p>Recovered page</p>');
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const browser=new BrowserSession();
 t.after(async()=>{await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));});
 const controller=new AbortController();const navigation=browser.act({type:'navigate',url:origin+'/slow'},controller.signal);
 await requested;controller.abort();await assert.rejects(navigation);
 const recovered=await browser.act({type:'navigate',url:origin+'/ok'},new AbortController().signal);
 assert.match(recovered.text,/Recovered page/);
});
