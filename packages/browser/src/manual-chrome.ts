import {spawn} from 'node:child_process';
/** A normal Chrome process for user sign-in; no debugging/automation connection. */
export async function openManualChrome(executable:string,profileDirectory:string,url:string){
 const process=spawn(executable,[`--user-data-dir=${profileDirectory}`,'--no-first-run','--no-default-browser-check','--new-window',url],{stdio:'ignore'});
 const exited=new Promise<void>((resolve,reject)=>{process.once('exit',()=>resolve());process.once('error',reject);});
 void exited.catch(()=>{});
 await new Promise<void>((resolve,reject)=>{process.once('spawn',resolve);process.once('error',reject);});
 return {exited,async close(){
  if(process.exitCode!==null||process.signalCode!==null)return;
  process.kill('SIGTERM');let timer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([exited,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Close the sign-in Chrome window, then continue in Jot.')),10000);})]);}finally{clearTimeout(timer);}
 }};
}
