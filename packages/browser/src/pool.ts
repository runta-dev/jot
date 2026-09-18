import {BrowserSession} from './session.ts';
type Entry={session:BrowserSession;leases:number;lastUsed:number};
/** Small per-chat owner pool; active sessions are never evicted. */
export class BrowserPool{
 private entries=new Map<string,Entry>();private queue:Promise<unknown>=Promise.resolve();
 constructor(private maximum=4){}
 acquire(id:string):Promise<{session:BrowserSession;release:()=>void}>{
  const task=this.queue.then(async()=>{
   let entry=this.entries.get(id);
   if(!entry){
    if(this.entries.size>=this.maximum){const idle=[...this.entries].filter(([,e])=>e.leases===0).sort((a,b)=>a[1].lastUsed-b[1].lastUsed)[0];if(!idle)throw Error('All browser sessions are busy. Close another browser panel first.');this.entries.delete(idle[0]);await idle[1].session.close();}
    entry={session:new BrowserSession(),leases:0,lastUsed:Date.now()};this.entries.set(id,entry);
   }
   const owned=entry;owned.leases++;owned.lastUsed=Date.now();let released=false;
   return {session:owned.session,release:()=>{if(!released){released=true;owned.leases--;owned.lastUsed=Date.now();}}};
  });this.queue=task.catch(()=>{});return task;
 }
 async close(){await this.queue;await Promise.all([...this.entries.values()].map(e=>e.session.close()));this.entries.clear();}
}
