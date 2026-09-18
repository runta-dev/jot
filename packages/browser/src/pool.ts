import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {BrowserSession} from './session.ts';
type Entry={session:BrowserSession;leases:number;lastUsed:number};
/** Small owner pool; active sessions are never evicted. */
export class BrowserPool{
 private entries=new Map<string,Entry>();private queue:Promise<unknown>=Promise.resolve();private closed=false;private closing?:Promise<void>;private access=0;
 constructor(private maximum=4,private options:{profileRoot?:string;headless?:boolean;sharedProfile?:boolean;cdpUrl?:string;vncUrl?:string}={}){if(!Number.isInteger(maximum)||maximum<1)throw Error('Browser pool capacity must be a positive integer.');}
 private key(id:string){return this.options.sharedProfile?'shared':id;}
 acquire(id:string):Promise<{session:BrowserSession;release:()=>void}>{
  const task=this.queue.then(async()=>{
   if(this.closed)throw Error('Browser pool is closed.');
   const key=this.key(id);
   let entry=this.entries.get(key);
   if(!entry){
    if(this.entries.size>=this.maximum){const idle=[...this.entries].filter(([,e])=>e.leases===0&&e.session.currentStatus.state!=='manual').sort((a,b)=>a[1].lastUsed-b[1].lastUsed)[0];if(!idle)throw Error('All browser sessions are busy. Finish Chrome sign-in or close an unused browser panel.');this.entries.delete(idle[0]);await idle[1].session.close();}
    const profileName=this.options.sharedProfile?'shared':createHash('sha256').update(id).digest('hex');
    entry={session:new BrowserSession({headless:this.options.headless,cdpUrl:this.options.cdpUrl,vncUrl:this.options.vncUrl,profileDirectory:this.options.cdpUrl?undefined:this.options.profileRoot?join(this.options.profileRoot,profileName):undefined}),leases:0,lastUsed:++this.access};this.entries.set(key,entry);
   }
   const owned=entry;owned.leases++;owned.lastUsed=++this.access;let released=false;
   return {session:owned.session,release:()=>{if(!released){released=true;owned.leases--;owned.lastUsed=++this.access;}}};
  });this.queue=task.catch(()=>{});return task;
 }
 warmup(id:string,signal:AbortSignal=AbortSignal.timeout(30000)){return this.acquire(id).then(async lease=>{try{await lease.session.ready(signal);}finally{lease.release();}});}
 close(){if(this.closing)return this.closing;this.closed=true;this.closing=(async()=>{await this.queue;const entries=[...this.entries.values()];this.entries.clear();const results=await Promise.allSettled(entries.map(e=>e.session.close()));const failed=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failed)throw failed.reason;})();return this.closing;}
}
