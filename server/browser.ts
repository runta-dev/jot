import {resolve} from 'node:path';
import {Router} from 'express';
import {BrowserPool,type BrowserAction,type BrowserInput,type BrowserEvent} from '@jot/browser';
export const browserPool=new BrowserPool(4,{profileRoot:resolve('.cache/browser-profiles'),headless:process.env.JOT_BROWSER_HEADLESS!=='0'});
export function browserChatId(value:unknown):string{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(value))throw Error('Invalid browser session.');return value;}
export const browserRouter=Router();
browserRouter.use((req,res,next)=>{if(!['localhost','127.0.0.1','[::1]'].includes(req.hostname)){res.status(403).json({error:'Local host required.'});return;}const origin=req.get('origin');if(req.get('sec-fetch-site')==='cross-site'||origin&&origin!==`http://${req.get('host')}`&&origin!==`https://${req.get('host')}`){res.status(403).json({error:'Origin not allowed.'});return;}next();});
browserRouter.get('/:chatId/events',async(req,res)=>{
 let lease;try{lease=await browserPool.acquire(browserChatId(req.params.chatId));}catch(e){res.status(400).json({error:(e as Error).message});return;}
 res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.flushHeaders();
 // Once the socket fills, retain only the newest frame and status.
 let blocked=false;let pendingFrame:BrowserEvent|undefined,pendingStatus:BrowserEvent|undefined;
 const send=(event:BrowserEvent)=>{if(res.destroyed)return;if(blocked){if(event.type==='frame')pendingFrame=event;else pendingStatus=event;return;}blocked=!res.write(`data: ${JSON.stringify(event)}\n\n`);};
 const drain=()=>{blocked=false;const status=pendingStatus,frame=pendingFrame;pendingStatus=undefined;pendingFrame=undefined;if(status)send(status);if(frame)send(frame);};
 res.on('drain',drain);
 const unsubscribe=lease.session.subscribe(send);
 const heartbeat=setInterval(()=>{if(!res.destroyed&&!blocked)res.write(': ping\n\n');},15000);
 res.on('close',()=>{clearInterval(heartbeat);res.removeListener('drain',drain);unsubscribe();lease.release();});
});
function command(body:any):BrowserAction{
 if(!body||typeof body.type!=='string')throw Error('Invalid browser command.');
 if(body.type==='resize'&&Number.isFinite(body.width)&&Number.isFinite(body.height))return {type:'resize',width:body.width,height:body.height};
 if(body.type==='navigate'&&typeof body.url==='string'&&body.url.length<=4000)return {type:'navigate',url:body.url};
 if(['back','forward','reload','wait'].includes(body.type))return {type:body.type} as BrowserAction;
 throw Error('Unsupported browser command.');
}
function input(body:any):BrowserInput{
 if(!body||typeof body.type!=='string')throw Error('Invalid browser input.');
 if(body.type==='text'&&typeof body.text==='string'&&body.text.length<=10000)return {type:'text',text:body.text};
 if(body.type==='key'&&typeof body.key==='string'&&body.key.length<=80)return {type:'key',key:body.key};
 if(!Number.isFinite(body.x)||!Number.isFinite(body.y)||body.x<0||body.y<0||body.x>4000||body.y>4000)throw Error('Invalid browser coordinates.');
 if(body.type==='click')return {type:'click',x:body.x,y:body.y,button:body.button==='right'?'right':'left',clickCount:body.clickCount===2?2:1};
 if(body.type==='wheel'&&Number.isFinite(body.deltaX)&&Number.isFinite(body.deltaY))return {type:'wheel',x:body.x,y:body.y,deltaX:Math.max(-3000,Math.min(3000,body.deltaX)),deltaY:Math.max(-3000,Math.min(3000,body.deltaY))};
 throw Error('Unsupported browser input.');
}
for(const path of ['command','input'] as const)browserRouter.post(`/:chatId/${path}`,async(req,res)=>{
 let lease;const controller=new AbortController();const close=()=>{if(!res.writableEnded)controller.abort();};res.on('close',close);
 try{const action=path==='command'?command(req.body):input(req.body);lease=await browserPool.acquire(browserChatId(req.params.chatId));
  if(path==='command')await lease.session.act(action as BrowserAction,controller.signal);else await lease.session.input(action as BrowserInput,controller.signal);
  if(!res.destroyed)res.json({ok:true,status:lease.session.currentStatus});
 }catch(e){if(!res.destroyed)res.status(400).json({error:(e as Error).message});}finally{res.removeListener('close',close);lease?.release();}
});

// Manual authentication owns the same profile, never the user's personal profile.
browserRouter.post('/:chatId/login',async(req,res)=>{
 let lease;const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
 try{
  if(!['open','resume'].includes(req.body?.action))throw Error('Invalid sign-in action.');
  lease=await browserPool.acquire(browserChatId(req.params.chatId));
  if(req.body.action==='open'){
   if(typeof req.body.url!=='string'||req.body.url.length>4000)throw Error('Invalid sign-in URL.');
   await lease.session.beginManualLogin(req.body.url,controller.signal);
  }else await lease.session.finishManualLogin(controller.signal);
  if(!res.destroyed)res.json({ok:true,status:lease.session.currentStatus});
 }catch(e){if(!res.destroyed)res.status(400).json({error:(e as Error).message});}finally{lease?.release();}
});
