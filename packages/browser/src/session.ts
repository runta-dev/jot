import {chromium,type Browser,type BrowserContext,type Page,type CDPSession,type ElementHandle} from 'playwright-core';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {READ_SNAPSHOT} from './snapshot.ts';
import {StaleBrowserSnapshot,type BrowserAction,type BrowserEvent,type BrowserSnapshot,type BrowserStatus,type BrowserFrame,type BrowserInput} from './types.ts';
export function navigationURL(input:string){const url=new URL(input);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP or HTTPS URL without embedded credentials.');return url.href;}
/** Owns an isolated browser, never attaches to a user's personal profile. */
export class BrowserSession{
 private browser?:Browser;private context?:BrowserContext;private page?:Page;private cdp?:CDPSession;
 private starting?:Promise<void>;private queue:Promise<unknown>=Promise.resolve();private closed=false;private inputQueue:Promise<unknown>=Promise.resolve();
 private listeners=new Set<(event:BrowserEvent)=>void>();private pageKey='';private snapshot?:BrowserSnapshot;
 private frame?:BrowserFrame;private status:BrowserStatus={state:'idle',url:'about:blank',title:'',loading:false};
 constructor(private options:{width?:number;height?:number;executablePath?:string}={}){}
 get current(){return this.snapshot;}
 get currentStatus(){return {...this.status};}
 subscribe(listener:(event:BrowserEvent)=>void){this.listeners.add(listener);listener({type:'status',status:this.currentStatus});if(this.frame)listener({type:'frame',frame:this.frame});return ()=>{this.listeners.delete(listener);};}
 private emit(event:BrowserEvent){for(const listener of this.listeners){try{listener(event);}catch{/* one disconnected viewer must not stop the browser */}}}
 private update(update:Partial<BrowserStatus>){this.status={...this.status,...update};this.emit({type:'status',status:this.currentStatus});}
 private async start(){
  if(this.closed)throw Error('Browser session is closed.');if(this.page)return;if(this.starting)return this.starting;
  this.starting=(async()=>{this.update({state:'starting',loading:true});
   const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
   this.browser=await chromium.launch({headless:true,...(this.options.executablePath?{executablePath:this.options.executablePath}:existsSync(chrome)?{executablePath:chrome}:{})});
   this.context=await this.browser.newContext({viewport:{width:this.options.width??1120,height:this.options.height??780},deviceScaleFactor:1,acceptDownloads:false});
   const page=await this.context.newPage();await this.attach(page);
   this.context.on('page',page=>{void this.attach(page).catch(e=>this.update({error:String(e)}));});
   this.update({state:'ready',loading:false});
  })().catch(async error=>{await this.browser?.close().catch(()=>{});this.browser=undefined;this.page=undefined;this.update({state:'error',loading:false,error:(error as Error).message});throw error;}).finally(()=>{this.starting=undefined;});
  return this.starting;
 }
 private async attach(page:Page){
  await this.cdp?.detach().catch(()=>{});this.page=page;this.snapshot=undefined;this.frame=undefined;
  page.setDefaultTimeout(3000);page.setDefaultNavigationTimeout(15000);
  page.on('framenavigated',frame=>{if(this.page===page&&frame===page.mainFrame()){this.snapshot=undefined;this.update({url:page.url()});}});
  page.on('domcontentloaded',()=>{if(this.page===page)void page.title().then(title=>this.update({title,url:page.url(),error:undefined})).catch(()=>{});});
  page.on('close',()=>{if(this.page===page){this.page=undefined;this.snapshot=undefined;this.update({state:'closed',loading:false});}});
  this.cdp=await this.context!.newCDPSession(page);const cdp=this.cdp;
  await cdp.send('Page.enable');
  const {frameTree}=await cdp.send('Page.getFrameTree');
  let mainFrameId=frameTree.frame.id;
  cdp.on('Page.frameNavigated',({frame})=>{if(!frame.parentId)mainFrameId=frame.id;});
  cdp.on('Page.frameStartedLoading',({frameId})=>{
   if(this.cdp===cdp&&frameId===mainFrameId)this.update({loading:true,error:undefined});
  });
  cdp.on('Page.frameStoppedLoading',({frameId})=>{
   if(this.cdp===cdp&&frameId===mainFrameId)this.update({loading:false,url:page.url()});
  });
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  cdp.on('Page.screencastFrame',event=>{
   void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
   if(this.cdp!==cdp)return;const size=page.viewportSize()!;
   this.frame={data:event.data,mimeType:'image/jpeg',width:Math.round(event.metadata.deviceWidth)||size.width,height:Math.round(event.metadata.deviceHeight)||size.height,timestamp:event.metadata.timestamp?Math.round(event.metadata.timestamp*1000):Date.now()};this.emit({type:'frame',frame:this.frame});
  });
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:75,everyNthFrame:1,maxWidth:1600,maxHeight:1200});
 }
 private exclusive<T>(signal:AbortSignal,work:()=>Promise<T>):Promise<T>{const run=this.queue.then(async()=>{signal.throwIfAborted();await this.start();signal.throwIfAborted();if(this.closed)throw Error('Browser session is closed.');const abort=()=>{void this.cdp?.send('Page.stopLoading').catch(()=>{});};signal.addEventListener('abort',abort,{once:true});try{const result=await work();signal.throwIfAborted();return result;}catch(error){this.update({loading:false,error:(error as Error).message});throw error;}finally{signal.removeEventListener('abort',abort);}});this.queue=run.catch(()=>{});return run;}
 private async read():Promise<BrowserSnapshot>{
  const raw=await this.page!.evaluate(READ_SNAPSHOT) as Omit<BrowserSnapshot,'id'|'observedAt'>&{pageKey:string};
  this.pageKey=raw.pageKey;const {pageKey:_,...state}=raw;
  this.snapshot={...state,id:randomUUID(),observedAt:Date.now()};this.update({state:'ready',url:state.url,title:state.title,error:undefined});return this.snapshot;
 }
 observe(signal:AbortSignal){return this.exclusive(signal,()=>this.read());}
 private async target(action:Extract<BrowserAction,{elementId:string}>):Promise<ElementHandle<HTMLElement>>{
  const observed=this.snapshot;if(!observed||action.snapshotId!==observed.id)throw new StaleBrowserSnapshot();
  const element=observed.elements.find(e=>e.id===action.elementId);if(!element||!element.actions.includes(action.type))throw new StaleBrowserSnapshot('Target was not observed with this operation.');
  const handle=await this.page!.evaluateHandle(({id,key,guard})=>{
   const c=(window as any).__jotBrowser,e=c?.nodes.get(id) as HTMLElement;
   if(!c||c.pageKey()!==key||c.guard(e)!==guard||!e?.isConnected)return null;
   const input=e as HTMLInputElement;if(input.disabled||input.readOnly||['password','file','hidden'].includes(input.type))return null;
   const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
   if(x<0||y<0||x>=innerWidth||y>=innerHeight)return null;
   const root=e.getRootNode() as Document|ShadowRoot;const hit=root.elementFromPoint(x,y);
   if(!hit||!e.contains(hit))return null;return e;
  },{id:element.id,key:this.pageKey,guard:element.guard});
  const node=handle.asElement();if(!node){await handle.dispose();throw new StaleBrowserSnapshot('Target changed, is hidden, or is covered. Observe again.');}
  return node as ElementHandle<HTMLElement>;
 }
 act(action:BrowserAction,signal:AbortSignal){return this.exclusive(signal,async()=>{
  const page=this.page!;signal.throwIfAborted();
  if(action.type==='navigate'){this.update({loading:true});await page.goto(navigationURL(action.url),{waitUntil:'domcontentloaded'});}
  else if(action.type==='back')await page.goBack({waitUntil:'domcontentloaded'});
  else if(action.type==='forward')await page.goForward({waitUntil:'domcontentloaded'});
  else if(action.type==='resize'){await page.setViewportSize({width:Math.max(320,Math.min(1600,Math.round(action.width))),height:Math.max(240,Math.min(1200,Math.round(action.height)))});this.snapshot=undefined;}
  else if(action.type==='reload')await page.reload({waitUntil:'domcontentloaded'});
  else if(action.type==='scroll')await page.mouse.wheel(0,(action.direction==='down'?1:-1)*(page.viewportSize()!.height*.75));
  else if(action.type==='wait')await new Promise(resolve=>setTimeout(resolve,150));
  else{const node=await this.target(action);try{signal.throwIfAborted();if(action.type==='click')await node.click({timeout:1000});else if(action.type==='fill')await node.fill(action.text,{timeout:1000});else{const el=this.snapshot!.elements.find(e=>e.id===action.elementId)!;if(!el.options?.some(o=>o.value===action.value))throw new StaleBrowserSnapshot('Option was not observed.');await node.selectOption(action.value,{timeout:1000});}}finally{await node.dispose();}}
  signal.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,75));return this.read();
 });}
 // Manual input must remain responsive while a navigation waits for page resources.
 // Preserve ordering between keys/clicks without waiting on the agent action queue.
 input(input:BrowserInput,signal:AbortSignal){const run=this.inputQueue.then(async()=>{
  signal.throwIfAborted();await this.start();signal.throwIfAborted();
  const page=this.page!;signal.throwIfAborted();
  if(input.type==='click')await page.mouse.click(input.x,input.y,{button:input.button??'left',clickCount:input.clickCount??1});
  else if(input.type==='wheel'){await page.mouse.move(input.x,input.y);await page.mouse.wheel(input.deltaX,input.deltaY);}
  else if(input.type==='text')await page.keyboard.insertText(input.text);
  else await page.keyboard.press(input.key);
  this.snapshot=undefined;
 });this.inputQueue=run.catch(()=>{});return run;}
 async close(){this.closed=true;await this.starting?.catch(()=>{});await this.browser?.close();this.browser=undefined;this.page=undefined;this.snapshot=undefined;this.frame=undefined;this.update({state:'closed',loading:false});this.listeners.clear();}
}
