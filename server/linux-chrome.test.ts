import {test} from 'node:test';import assert from 'node:assert/strict';
import {ensureLinuxChrome,waitForLinuxCdp} from './linux-chrome.ts';
test('ensureLinuxChrome is a no-op when CDP is disabled',async()=>{
 process.env.JOT_BROWSER_CDP='0';
 try{
  const ready=await ensureLinuxChrome({compose:async()=>{throw Error('should not compose');}});
  assert.deepEqual(ready,{cdpUrl:undefined,vncUrl:undefined});
 }finally{delete process.env.JOT_BROWSER_CDP;}
});
test('ensureLinuxChrome starts compose when CDP is down then waits for /json/version',async()=>{
 delete process.env.JOT_BROWSER_CDP;
 let calls=0,up=0;
 const fetchFn:typeof fetch=async()=>{
  calls++;
  if(calls<3)throw Error('down');
  return new Response(JSON.stringify({webSocketDebuggerUrl:'ws://127.0.0.1:9222/devtools/browser/x'}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const ready=await ensureLinuxChrome({fetch:fetchFn,compose:async args=>{up++;assert.deepEqual(args,['up','-d','--build']);}});
 assert.equal(up,1);assert.equal(ready.cdpUrl,'http://127.0.0.1:9222');assert.match(ready.vncUrl??'',/vnc\.html/);
});
test('waitForLinuxCdp fails when the endpoint never becomes ready',async()=>{
 await assert.rejects(waitForLinuxCdp('http://127.0.0.1:9',{fetch:async()=>{throw Error('down');},timeoutMs:50}),/not reachable/);
});
