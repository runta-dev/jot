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

test('link navigation taking over a second is a successful click, not a retryable failure',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 let visits=0;
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');if(req.url==='/next'){visits++;setTimeout(()=>res.end('<title>Destination</title><h1>Arrived</h1>'),1300);}else res.end('<a href="/next">Continue</a>');});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=new BrowserSession();const signal=new AbortController().signal;
 t.after(async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 const start=await browser.act({type:'navigate',url:`http://127.0.0.1:${(server.address() as AddressInfo).port}`},signal);
 const end=await browser.act({type:'click',snapshotId:start.id,elementId:start.elements[0].id},signal);
 assert.equal(visits,1);assert.equal(end.title,'Destination');assert.deepEqual(end.headings,['Arrived']);
});

test('verification interruption requires both a visible challenge and blocking-page text',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<h1>${req.url==='/blocked'?'Verify you are human':'Contact form'}</h1><iframe title="captcha" srcdoc="Verification widget"></iframe>`);});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=new BrowserSession(),signal=new AbortController().signal;const origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 t.after(async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 assert.equal((await browser.act({type:'navigate',url:origin+'/blocked'},signal)).interruption,'verification');
 assert.equal((await browser.act({type:'navigate',url:origin+'/form'},signal)).interruption,undefined);
});

test('observations exclude controls covered by a modal and expose them after it closes',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html');res.end('<button>Background action</button><div id="modal" style="position:fixed;inset:0;background:white;z-index:1"><button onclick="document.querySelector(\'#modal\').remove()">Close modal</button></div>');});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=new BrowserSession(),signal=new AbortController().signal;
 t.after(async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 const before=await browser.act({type:'navigate',url:`http://127.0.0.1:${(server.address() as AddressInfo).port}`},signal);
 assert.ok(!before.elements.some(e=>e.name==='Background action'));assert.ok(!before.text.includes('Background action'));
 const after=await browser.act({type:'click',snapshotId:before.id,elementId:before.elements.find(e=>e.name==='Close modal')!.id},signal);
 assert.ok(after.elements.some(e=>e.name==='Background action'));
});

test('same-document URL updates keep unchanged controls usable while document/target guards remain active',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 let tick!:()=>void;const ticked=new Promise<void>(r=>tick=r);
 const server=createServer((req,res)=>{if(req.url==='/tick'){tick();res.end('ok');return;}res.setHeader('Content-Type','text/html');res.end('<button onclick="document.querySelector(\'#result\').textContent=\'Clicked\'">Continue</button><p id="result"></p><script>setTimeout(()=>{history.replaceState({},\"\",\"?state=updated\");fetch(\"/tick\")},400)</script>');});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=new BrowserSession(),signal=new AbortController().signal;
 t.after(async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 const before=await browser.act({type:'navigate',url:`http://127.0.0.1:${(server.address() as AddressInfo).port}`},signal);
 await ticked;
 const after=await browser.act({type:'click',snapshotId:before.id,elementId:before.elements.find(e=>e.name==='Continue')!.id},signal);
 assert.match(after.text,/Clicked/);assert.match(after.url,/state=updated/);
});

test('fill clicks a combobox and types into its newly focused popup input',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html');res.end(`<input aria-label="Destination" onclick="setTimeout(()=>{document.querySelector('#popup').hidden=false;document.querySelector('#entry').focus()},80)"><div hidden id="popup" style="position:fixed;inset:0;background:white"><input id="entry" aria-label="Search destination"></div>`);});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=new BrowserSession(),signal=new AbortController().signal;
 t.after(async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 const before=await browser.act({type:'navigate',url:`http://127.0.0.1:${(server.address() as AddressInfo).port}`},signal);
 const after=await browser.act({type:'fill',snapshotId:before.id,elementId:before.elements.find(e=>e.name==='Destination')!.id,text:'London'},signal);
 assert.equal(after.elements.find(e=>e.name==='Search destination')?.value,'London');
});

test('manual sign-in uses normal Chrome and preserves the same profile on resume',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:30000},async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const profileDirectory=await mkdtemp(join(tmpdir(),'jot-manual-login-'));
 let report!:()=>void;const reported=new Promise<void>(r=>report=r);let webdriver:string|null=null,manualHadCookie=false,resumedHadCookie=false,visits=0;
 const server=createServer((req,res)=>{
  const url=new URL(req.url??'/','http://localhost');
  if(url.pathname==='/report'){webdriver=url.searchParams.get('webdriver');report();res.end('ok');return;}
  res.setHeader('Content-Type','text/html');
  if(url.pathname==='/before'){res.setHeader('Set-Cookie','jot_before=saved; Path=/; Max-Age=3600');res.end('<p>Before sign-in</p>');return;}
  if(url.pathname!=='/manual'){res.writeHead(204);res.end();return;}
  visits++;const cookies=req.headers.cookie??'';
  if(visits===1)manualHadCookie=cookies.includes('jot_before=saved');else resumedHadCookie=cookies.includes('jot_login=manual');
  if(visits===1)res.setHeader('Set-Cookie','jot_login=manual; Path=/; Max-Age=3600; HttpOnly');
  res.end(`<p id="result"></p><script>${visits===1?"localStorage.setItem('manual-state','retained');":''}document.querySelector('#result').textContent=localStorage.getItem('manual-state')||'missing';fetch('/report?webdriver='+navigator.webdriver)</script>`);
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const browser=new BrowserSession({profileDirectory,headless:true}),signal=new AbortController().signal;
 t.after(async()=>{await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(profileDirectory,{recursive:true,force:true});});
 await browser.act({type:'navigate',url:origin+'/before'},signal);
 await browser.beginManualLogin(origin+'/manual',signal);await reported;
 assert.equal(browser.currentStatus.state,'manual');assert.equal(webdriver,'false');assert.equal(manualHadCookie,true);
 await assert.rejects(browser.observe(signal),/Finish sign-in/);
 await browser.finishManualLogin(signal);
 assert.equal(browser.currentStatus.state,'ready');assert.equal(resumedHadCookie,true);assert.match(browser.current!.text,/retained/);
});

test('fill observes asynchronously arriving autocomplete options before returning',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:15000},async t=>{
 const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html');res.end(`<input aria-label="City" role="combobox" aria-controls="options" oninput="setTimeout(()=>{document.querySelector('#options').innerHTML='<div role=option>London, United Kingdom</div>'},250)"><div id="options" role="listbox"></div>`);});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const browser=new BrowserSession(),signal=new AbortController().signal;
 t.after(async()=>{await browser.close();await new Promise<void>(r=>server.close(()=>r()));});
 const page=await browser.act({type:'navigate',url:`http://127.0.0.1:${(server.address() as AddressInfo).port}`},signal);
 const filled=await browser.act({type:'fill',snapshotId:page.id,elementId:page.elements.find(e=>e.name==='City')!.id,text:'London'},signal);
 assert.ok(filled.elements.some(e=>e.role==='option'&&e.name==='London, United Kingdom'));
});

test('warmup starts a blank browser through the pool without filling the page',{skip:process.env.JOT_BROWSER_TEST!=='1',timeout:30000},async()=>{
 const {BrowserPool}=await import('./pool.ts');
 const pool=new BrowserPool(1,{headless:true});
 try{
  await pool.warmup('warm');
  const lease=await pool.acquire('warm');
  try{
   assert.equal(lease.session.currentStatus.state,'ready');
   assert.equal(lease.session.currentStatus.url,'about:blank');
   assert.equal(lease.session.current,undefined);
  }finally{lease.release();}
 }finally{await pool.close();}
});
