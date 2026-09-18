import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
export function chromeApp(executable?:string){
 if(executable?.endsWith('.app/Contents/MacOS/Google Chrome'))return executable.replace(/\/Contents\/MacOS\/Google Chrome$/,'');
 if(existsSync('/Applications/Google Chrome.app'))return '/Applications/Google Chrome.app';
 return executable;
}
export function cdpUrlFromPortFile(contents:string){
 const port=contents.trim().split(/\r?\n/,1)[0];
 if(!/^\d+$/.test(port))throw Error('Chrome DevTools port file was invalid.');
 return `http://127.0.0.1:${port}`;
}
async function ready(url:string){
 try{
  const response=await fetch(new URL('/json/version',url),{signal:AbortSignal.timeout(800)});
  return response.ok;
 }catch{return false;}
}
/** Headed Chrome that does not steal focus: `open -g` then CDP. */
export async function openBackgroundChrome(profileDirectory:string,options:{app?:string;timeoutMs?:number}={}){
 const app=chromeApp(options.app);
 if(!app)throw Error('Google Chrome.app is required for background headed Chrome.');
 const portFile=join(profileDirectory,'DevToolsActivePort');
 if(existsSync(portFile)){
  const existing=cdpUrlFromPortFile(await readFile(portFile,'utf8'));
  if(await ready(existing))return {cdpUrl:existing,close:async()=>{}};
  await unlink(portFile).catch(()=>{});
 }
 spawn('open',['-g','-n','-a',app,'--args',
  `--user-data-dir=${profileDirectory}`,
  '--remote-debugging-port=0',
  '--no-first-run','--no-default-browser-check',
  '--disable-backgrounding-occluded-windows',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  'about:blank',
 ],{stdio:'ignore'}).unref();
 const timeoutMs=options.timeoutMs??15000,started=Date.now();
 while(Date.now()-started<timeoutMs){
  if(existsSync(portFile)){
   const url=cdpUrlFromPortFile(await readFile(portFile,'utf8'));
   if(await ready(url))return {cdpUrl:url,close:async()=>{}};
  }
  await new Promise(r=>setTimeout(r,150));
 }
 throw Error('Background Chrome did not publish a DevTools port.');
}
