import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {BrowserSession} from './session.ts';
type Entry={session:BrowserSession;leases:number;lastUsed:number};
/** Small per-chat owner pool; active sessions are never evicted. */
export class BrowserPool{
 private entries=new Map<string,Entry>();private queue:Promise<unknown>=Promise.resolve();private closed=false;private closing?:Promise<void>;private access=0;
 constructor(private maximum=4,private options:{profileRoot?:string;headless?:boolean}={}){if(!Number.isInteger(maximum)||maximum<1)throw Error('Browser pool capacity must be a positive integer.');}
 acquire(id:string):Promise<{session:BrowserSession;release:()=>void}>{
  const task=this.queue.then(async()=>{
   if(this.closed)throw Error('Browser pool is closed.');
   let entry=this.entries.get(id);
   if(!entry){
    if(this.entries.size>=this.maximum){const idle=[...this.entries].filter(([,e])=>e.leases===0).sort((a,b)=>a[1].lastUsed-b[1].lastUsed)[0];if(!idle)throw Error('All browser sessions are busy. Close another browser panel first.');this.entries.delete(idle[0]);await idle[1].session.close();}
    entry={session:new BrowserSession({headless:this.options.headless,profileDirectory:this.options.profileRoot?join(this.options.profileRoot,createHash('sha256').update(id).digest('hex')):undefined}),leases:0,lastUsed:++this.access};this.entries.set(id,entry);
   }
   const owned=entry;owned.leases++;owned.lastUsed=++this.access;let released=false;
   return {session:owned.session,release:()=>{if(!released){released=true;owned.leases--;owned.lastUsed=++this.access;}}};
  });this.queue=task.catch(()=>{});return task;
 }
 close(){if(this.closing)return this.closing;this.closed=true;this.closing=(async()=>{await this.queue;const entries=[...this.entries.values()];this.entries.clear();const results=await Promise.allSettled(entries.map(e=>e.session.close()));const failed=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failed)throw failed.reason;})();return this.closing;}
}
