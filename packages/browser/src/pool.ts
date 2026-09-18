import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {BrowserSession} from './session.ts';
type Entry={session:BrowserSession;leases:number;lastUsed:number};
/** Per-chat tabs on one shared Chrome profile. */
export class BrowserPool{
 private entries=new Map<string,Entry>();private queue:Promise<unknown>=Promise.resolve();private closed=false;private closing?:Promise<void>;private access=0;
 private host?:BrowserSession;
 constructor(private maximum=4,private options:{profileRoot?:string;headless?:boolean;sharedProfile?:boolean;cdpUrl?:string;vncUrl?:string;homeUrl?:string}={}){if(!Number.isInteger(maximum)||maximum<1)throw Error('Browser pool capacity must be a positive integer.');}
 private profileDirectory(id:string){
  if(!this.options.profileRoot||this.options.cdpUrl)return;
  const name=this.options.sharedProfile?'shared':createHash('sha256').update(id).digest('hex');
  return join(this.options.profileRoot,name);
 }
 private async runtime(){
  if(this.host?.runtime)return this.host.runtime;
  this.host=new BrowserSession({headless:this.options.headless,cdpUrl:this.options.cdpUrl,vncUrl:this.options.vncUrl,homeUrl:this.options.homeUrl,profileDirectory:this.profileDirectory('shared')});
  await this.host.ready(AbortSignal.timeout(30000));
  const runtime=this.host.runtime;if(!runtime)throw Error('Shared browser failed to start.');
  return runtime;
 }
 acquire(id:string):Promise<{session:BrowserSession;release:()=>void}>{
  const task=this.queue.then(async()=>{
   if(this.closed)throw Error('Browser pool is closed.');
   let entry=this.entries.get(id);
   if(!entry){
    if(this.entries.size>=this.maximum){const idle=[...this.entries].filter(([,e])=>e.leases===0&&e.session.currentStatus.state!=='manual').sort((a,b)=>a[1].lastUsed-b[1].lastUsed)[0];if(!idle)throw Error('All browser sessions are busy. Finish Chrome sign-in or close an unused browser panel.');this.entries.delete(idle[0]);await idle[1].session.close();}
    const shared=this.options.sharedProfile||!!this.options.cdpUrl;
    const session=shared?new BrowserSession({headless:this.options.headless,vncUrl:this.options.vncUrl,homeUrl:this.options.homeUrl,connect:()=>this.runtime()}):new BrowserSession({headless:this.options.headless,cdpUrl:this.options.cdpUrl,vncUrl:this.options.vncUrl,homeUrl:this.options.homeUrl,profileDirectory:this.profileDirectory(id)});
    entry={session,leases:0,lastUsed:++this.access};this.entries.set(id,entry);
   }
   const owned=entry;owned.leases++;owned.lastUsed=++this.access;let released=false;
   return {session:owned.session,release:()=>{if(!released){released=true;owned.leases--;owned.lastUsed=++this.access;}}};
  });this.queue=task.catch(()=>{});return task;
 }
 warmup(id:string,signal:AbortSignal=AbortSignal.timeout(30000)){return this.acquire(id).then(async lease=>{try{await lease.session.ready(signal);}finally{lease.release();}});}
 close(){if(this.closing)return this.closing;this.closed=true;this.closing=(async()=>{await this.queue;const entries=[...this.entries.values()];this.entries.clear();const host=this.host;this.host=undefined;const results=await Promise.allSettled([...entries.map(e=>e.session.close()),host?host.close():Promise.resolve()]);const failed=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failed)throw failed.reason;})();return this.closing;}
}
