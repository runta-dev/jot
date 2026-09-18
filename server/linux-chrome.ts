import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
export const LINUX_CDP='http://127.0.0.1:9222';
export const LINUX_VNC='http://127.0.0.1:6080/vnc.html';
const composeFile=resolve('vm/linux-chrome/compose.yaml');
async function cdpReady(url:string,request:typeof fetch,signal:AbortSignal){
 try{
  const response=await request(new URL('/json/version',url).href,{signal});
  if(!response.ok)return false;
  const body=await response.json() as {webSocketDebuggerUrl?:string};
  return typeof body.webSocketDebuggerUrl==='string';
 }catch{return false;}
}
function compose(args:string[]){
 return new Promise<void>((resolvePromise,reject)=>{
  const child=spawn('docker',['compose','-f',composeFile,...args],{stdio:'inherit'});
  child.once('error',reject);
  child.once('exit',code=>code===0?resolvePromise():reject(Error(`docker compose ${args.join(' ')} exited ${code}`)));
 });
}
export async function waitForLinuxCdp(url=LINUX_CDP,options:{fetch?:typeof fetch;timeoutMs?:number}={}){
 const request=options.fetch??fetch,timeoutMs=options.timeoutMs??120000,started=Date.now();
 while(Date.now()-started<timeoutMs){
  const signal=AbortSignal.timeout(1500);
  if(await cdpReady(url,request,signal))return url;
  await new Promise(r=>setTimeout(r,400));
 }
 throw Error(`Linux headed Chromium CDP was not reachable at ${url}.`);
}
/** Opt-in Linux headed Chromium. Default is local headed Chrome. Set JOT_BROWSER_CDP=1 or a URL to use the VM. */
export async function ensureLinuxChrome(options:{fetch?:typeof fetch;compose?:(args:string[])=>Promise<void>}={}){
 const raw=process.env.JOT_BROWSER_CDP;
 if(!raw||raw==='0')return {cdpUrl:undefined,vncUrl:undefined};
 const cdpUrl=raw==='1'?LINUX_CDP:raw;
 const run=options.compose??compose;
 const request=options.fetch??fetch;
 if(!await cdpReady(cdpUrl,request,AbortSignal.timeout(1500))){
  await run(['up','-d','--build']);
  await waitForLinuxCdp(cdpUrl,{fetch:request});
 }
 process.env.JOT_BROWSER_CDP=cdpUrl;
 process.env.JOT_BROWSER_VNC=process.env.JOT_BROWSER_VNC||LINUX_VNC;
 return {cdpUrl,vncUrl:process.env.JOT_BROWSER_VNC};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const cmd=process.argv[2]??'up';
 if(cmd==='down')await compose(['down']);
 else if(cmd==='logs')await compose(['logs','-f']);
 else{
  const ready=await ensureLinuxChrome();
  console.log(`VNC ${ready.vncUrl}\nCDP ${ready.cdpUrl}`);
 }
}
