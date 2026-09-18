import {chromium,type Browser,type BrowserContext,type Page,type CDPSession,type ElementHandle} from 'patchright';
import {existsSync} from 'node:fs';
import {mkdir,chmod} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {openManualChrome} from './manual-chrome.ts';
import {openBackgroundChrome} from './background-chrome.ts';
import {READ_SNAPSHOT} from './snapshot.ts';
import {StaleBrowserSnapshot,type BrowserAction,type BrowserEvent,type BrowserSnapshot,type BrowserStatus,type BrowserFrame,type BrowserInput} from './types.ts';
export function navigationURL(input:string){const url=new URL(input);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP or HTTPS URL without embedded credentials.');return url.href;}
/** Owns an isolated browser, never attaches to a user's personal profile. */
export class BrowserSession{
 private browser?:Browser;private context?:BrowserContext;private page?:Page;private cdp?:CDPSession;
 private manual=false;private manualChrome?:Awaited<ReturnType<typeof openManualChrome>>;private backgroundChrome?:Awaited<ReturnType<typeof openBackgroundChrome>>;private ownsChrome=false;private manualURL='';
 private starting?:Promise<void>;private queue:Promise<unknown>=Promise.resolve();private closed=false;private inputQueue:Promise<unknown>=Promise.resolve();
 private listeners=new Set<(event:BrowserEvent)=>void>();private pageKey='';private snapshot?:BrowserSnapshot;
 private frame?:BrowserFrame;private status:BrowserStatus={state:'idle',url:'about:blank',title:'',loading:false};
 constructor(private options:{width?:number;height?:number;executablePath?:string;profileDirectory?:string;headless?:boolean;cdpUrl?:string;vncUrl?:string;homeUrl?:string;connect?:()=>Promise<{browser:Browser;context:BrowserContext}>}={}){}
 get current(){return this.snapshot;}
 get runtime(){return this.browser&&this.context?{browser:this.browser,context:this.context}:undefined;}
 get currentStatus(){return {...this.status};}
 subscribe(listener:(event:BrowserEvent)=>void){this.listeners.add(listener);listener({type:'status',status:this.currentStatus});if(this.frame)listener({type:'frame',frame:this.frame});return ()=>{this.listeners.delete(listener);};}
 private emit(event:BrowserEvent){for(const listener of this.listeners){try{listener(event);}catch{/* one disconnected viewer must not stop the browser */}}}
 private update(update:Partial<BrowserStatus>){this.status={...this.status,...update};this.emit({type:'status',status:this.currentStatus});}
 private async dispose(kill=false){await this.cdp?.detach().catch(()=>{});this.cdp=undefined;const page=this.page,browser=this.browser,context=this.context;this.page=undefined;this.snapshot=undefined;this.frame=undefined;if(this.options.connect){if(kill)await page?.close().catch(()=>{});this.context=undefined;this.browser=undefined;return;}this.context=undefined;this.browser=undefined;if(this.options.cdpUrl&&!this.ownsChrome)return;if(!kill&&this.ownsChrome)return;try{await context?.close();}finally{await browser?.close().catch(()=>{});}}
 private async start(){
  if(this.closed)throw Error('Browser session is closed.');if(this.manual)throw Error('Finish sign-in in Chrome, then select Continue in Jot.');if(this.starting)return this.starting;if(this.page&&!this.page.isClosed())return;
  this.starting=(async()=>{await this.dispose(false);this.update({state:'starting',loading:true});
   if(this.options.connect){
    const runtime=await this.options.connect();this.browser=runtime.browser;this.context=runtime.context;this.ownsChrome=false;
    const page=await this.newBackgroundPage();await this.attach(page);
    await this.openHome();
    this.update({state:'ready',loading:false,url:this.page?.url()??'about:blank'});
    return;
   }
   if(!this.options.cdpUrl&&!(this.options.headless??true)&&this.options.profileDirectory&&process.platform==='darwin'){
    this.backgroundChrome=await openBackgroundChrome(this.options.profileDirectory,{app:this.options.executablePath});
    this.ownsChrome=true;
    this.browser=await chromium.connectOverCDP(this.backgroundChrome.cdpUrl);
    this.context=this.browser.contexts()[0]??await this.browser.newContext({viewport:{width:this.options.width??1120,height:this.options.height??780}});
    const page=this.context.pages()[0]??await this.context.newPage();await this.attach(page);
    this.context.on('page',page=>{if(this.page&&!this.page.isClosed())return;void this.attach(page).catch(e=>this.update({error:String(e)}));});
    await this.openHome();
    this.update({state:'ready',loading:false,url:this.page?.url()??this.status.url});
    return;
   }
   if(this.options.cdpUrl){
    this.browser=await chromium.connectOverCDP(this.options.cdpUrl);
    this.context=this.browser.contexts()[0]??await this.browser.newContext({viewport:{width:this.options.width??1120,height:this.options.height??780}});
    const page=this.context.pages()[0]??await this.context.newPage();await this.attach(page);
    await this.openHome();
    this.update({state:'ready',loading:false,url:this.page?.url()??this.status.url});
    return;
   }
   const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
   const headless=this.options.headless??true;
   // Position headed windows before their first paint; retain rendering while offscreen.
   // macOS may still activate the application: window position is not a focus policy.
   const launch={headless,chromiumSandbox:true,ignoreDefaultArgs:['--use-mock-keychain','--password-store=basic'],args:headless?[]:[
    '--window-position=-32000,-32000',
    '--no-first-run','--no-default-browser-check',
    '--disable-backgrounding-occluded-windows',
    '--disable-background-timer-throttling','--disable-renderer-backgrounding',
   ],...(this.options.executablePath?{executablePath:this.options.executablePath}:existsSync(chrome)?{executablePath:chrome}:{})};
   const contextOptions={viewport:{width:this.options.width??1120,height:this.options.height??780},deviceScaleFactor:1,acceptDownloads:false};
   if(this.options.profileDirectory){
    await mkdir(this.options.profileDirectory,{recursive:true,mode:0o700});await chmod(this.options.profileDirectory,0o700);
    this.context=await chromium.launchPersistentContext(this.options.profileDirectory,{...launch,...contextOptions});
    this.browser=this.context.browser()??undefined;
   }else{
    this.browser=await chromium.launch(launch);this.context=await this.browser.newContext(contextOptions);
   }
   const page=this.context.pages()[0]??await this.context.newPage();await this.attach(page);
   const context=this.context;context.on('close',()=>{if(this.context===context){this.context=undefined;this.browser=undefined;this.page=undefined;this.snapshot=undefined;this.frame=undefined;this.update({state:'closed',loading:false});}});
   this.context.on('page',page=>{if(this.page&&!this.page.isClosed())return;void this.attach(page).catch(e=>this.update({error:String(e)}));});
   await this.openHome();
   this.update({state:'ready',loading:false,url:this.page?.url()??this.status.url});
  })().catch(async error=>{await this.dispose().catch(()=>{});this.context=undefined;this.browser=undefined;this.page=undefined;this.update({state:'error',loading:false,error:(error as Error).message});throw error;}).finally(()=>{this.starting=undefined;});
  return this.starting;
 }
 private async attach(page:Page){
  await this.cdp?.detach().catch(()=>{});this.page=page;this.snapshot=undefined;this.frame=undefined;
  page.setDefaultTimeout(3000);page.setDefaultNavigationTimeout(15000);
  page.on('framenavigated',frame=>{if(this.page===page&&frame===page.mainFrame()){this.update({url:page.url()});}});
  page.on('domcontentloaded',()=>{if(this.page===page)void page.title().then(title=>this.update({title,url:page.url(),error:undefined})).catch(()=>{});});
  page.on('close',()=>{if(this.page===page){this.page=undefined;this.snapshot=undefined;this.update({state:'closed',loading:false});}});
  this.cdp=await this.context!.newCDPSession(page);const cdp=this.cdp;
  await cdp.send('Page.enable');
  const {frameTree}=await cdp.send('Page.getFrameTree');
  let mainFrameId=frameTree.frame.id;
  cdp.on('Page.frameNavigated',({frame})=>{if(!frame.parentId){mainFrameId=frame.id;this.snapshot=undefined;}});
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
 private transition<T>(work:()=>Promise<T>){const run=this.queue.then(work);this.queue=run.catch(()=>{});return run;}
 beginManualLogin(url:string,signal:AbortSignal){return this.transition(async()=>{
  signal.throwIfAborted();if(this.closed)throw Error('Browser session is closed.');if(this.manual)return;
  if(!this.options.cdpUrl&&!this.options.profileDirectory)throw Error('Sign-in requires a persistent Jot browser profile.');
  const destination=navigationURL(url);
  if(this.options.cdpUrl){
   this.manual=true;this.manualURL=destination;
   this.update({state:'manual',url:this.options.vncUrl??'http://127.0.0.1:6080/vnc.html',title:'Sign in in Linux Chrome',loading:false,error:undefined,target:undefined});return;
  }
  await this.start();await this.inputQueue;signal.throwIfAborted();
  this.manual=true;this.manualURL=destination;
  try{
   await this.dispose(true);this.frame=undefined;this.snapshot=undefined;this.cdp=undefined;
   const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
   const profile=this.options.profileDirectory;if(!profile)throw Error('Sign-in requires a persistent Jot browser profile.');
   this.manualChrome=await openManualChrome(this.options.executablePath??(existsSync(chrome)?chrome:chromium.executablePath()),profile,destination);
   this.update({state:'manual',url:destination,title:'Sign in in Chrome',loading:false,error:undefined,target:undefined});
  }catch(error){this.manual=false;this.update({state:'error',loading:false,error:(error as Error).message});throw error;}
 });}
 finishManualLogin(signal:AbortSignal){return this.transition(async()=>{
  signal.throwIfAborted();if(!this.manual)return;
  await this.manualChrome?.close();this.manualChrome=undefined;this.manual=false;
  signal.throwIfAborted();await this.start();
  await this.navigation(this.page!.goto(this.manualURL,{waitUntil:'domcontentloaded'}),signal);
  await this.settledRead(signal);
 });}
 private exclusive<T>(signal:AbortSignal,work:()=>Promise<T>):Promise<T>{const run=this.queue.then(async()=>{signal.throwIfAborted();await this.start();signal.throwIfAborted();if(this.closed)throw Error('Browser session is closed.');const abort=()=>{void this.cdp?.send('Page.stopLoading').catch(()=>{});};signal.addEventListener('abort',abort,{once:true});try{const result=await work();signal.throwIfAborted();return result;}catch(error){if(error instanceof StaleBrowserSnapshot)this.snapshot=undefined;else this.update({loading:false,error:(error as Error).message});throw error;}finally{signal.removeEventListener('abort',abort);}});this.queue=run.catch(()=>{});return run;}
 private async read():Promise<BrowserSnapshot>{
  const raw=await this.page!.evaluate(READ_SNAPSHOT) as Omit<BrowserSnapshot,'id'|'observedAt'>&{pageKey:string};
  this.pageKey=raw.pageKey;const {pageKey:_,...state}=raw;
  this.snapshot={...state,id:randomUUID(),observedAt:Date.now()};this.update({state:'ready',url:state.url,title:state.title,error:undefined});return this.snapshot;
 }
 private async settledRead(signal:AbortSignal):Promise<BrowserSnapshot>{
  const started=Date.now();let previous='',last:BrowserSnapshot|undefined;
  do{
   signal.throwIfAborted();
   try{last=await this.read();}catch(error){if(!/Execution context was destroyed|Cannot find context/.test(String(error)))throw error;await new Promise(r=>setTimeout(r,100));continue;}
   const signature=JSON.stringify([last.url,last.elements.map(({id,name,value,checked,selected,expanded,actions,rect})=>({id,name,value,checked,selected,expanded,actions,rect}))]);
   if(signature===previous)return last;previous=signature;
   await new Promise(r=>setTimeout(r,150));
  }while(Date.now()-started<1200);
  signal.throwIfAborted();return this.read();
 }
 private async newBackgroundPage(){
  const browser=this.browser,context=this.context;if(!browser||!context)throw Error('Browser is not running.');
  const url=this.options.homeUrl?navigationURL(this.options.homeUrl):'about:blank';
  try{
   const session=await browser.newBrowserCDPSession();
   try{
    const pending=context.waitForEvent('page');
    await session.send('Target.createTarget',{url,background:true});
    return await pending;
   }finally{await session.detach().catch(()=>{});}
  }catch{return context.newPage();}
 }
 private async openHome(){
  const home=this.options.homeUrl;if(!home||!this.page||this.page.isClosed())return;
  const current=this.page.url();if(current&&current!=='about:blank')return;
  this.update({loading:true});
  await this.page.goto(navigationURL(home),{waitUntil:'domcontentloaded'});
 }
 ready(signal:AbortSignal){return this.exclusive(signal,async()=>{});}
 observe(signal:AbortSignal){return this.exclusive(signal,()=>this.settledRead(signal));}
 private async target(action:Extract<BrowserAction,{elementId:string}>):Promise<ElementHandle<HTMLElement>>{
  const observed=this.snapshot;if(!observed||action.snapshotId!==observed.id)throw new StaleBrowserSnapshot();
  const element=observed.elements.find(e=>e.id===action.elementId);if(!element||!element.actions.includes(action.type))throw new StaleBrowserSnapshot('Target was not observed with this operation.');
  const locate=async()=>{
   const handle=await this.page!.evaluateHandle(({id,key,guard})=>{
    const c=(window as any).__jotBrowser,e=c?.nodes.get(id) as HTMLElement;
    if(!c||c.pageKey()!==key||c.guard(e)!==guard||!e?.isConnected)return null;
    const input=e as HTMLInputElement;if(input.disabled||input.readOnly||['password','file','hidden'].includes(input.type))return null;
    e.scrollIntoView({block:'center',inline:'nearest'});
    const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(x<0||y<0||x>=innerWidth||y>=innerHeight)return null;
    const root=e.getRootNode() as Document|ShadowRoot;const hit=root.elementFromPoint(x,y);
    if(!hit||!e.contains(hit))return null;return e;
   },{id:element.id,key:this.pageKey,guard:element.guard});
   const node=handle.asElement();if(!node){await handle.dispose();return undefined;}
   return node as ElementHandle<HTMLElement>;
  };
  for(let attempt=0;attempt<5;attempt++){
   const node=await locate();if(node)return node;
   await new Promise(r=>setTimeout(r,80));
  }
  throw new StaleBrowserSnapshot('Target changed, is hidden, or is covered. Observe again.');
 }
 private async navigation<T>(pending:Promise<T>,signal:AbortSignal):Promise<T>{
  let abort!:()=>void;
  const cancelled=new Promise<never>((_,reject)=>{abort=()=>{void this.cdp?.send('Page.stopLoading').catch(()=>{}).finally(()=>reject(signal.reason??new Error('Navigation cancelled.')));};signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
  try{return await Promise.race([pending,cancelled]);}finally{signal.removeEventListener('abort',abort);}
 }
 act(action:BrowserAction,signal:AbortSignal){return this.exclusive(signal,async()=>{
  const page=this.page!;signal.throwIfAborted();
  if(action.type==='navigate'){this.update({loading:true});await this.navigation(page.goto(navigationURL(action.url),{waitUntil:'domcontentloaded'}),signal);}
  else if(action.type==='back')await this.navigation(page.goBack({waitUntil:'domcontentloaded'}),signal);
  else if(action.type==='forward')await this.navigation(page.goForward({waitUntil:'domcontentloaded'}),signal);
  else if(action.type==='resize'){await page.setViewportSize({width:Math.max(320,Math.min(1600,Math.round(action.width))),height:Math.max(240,Math.min(1200,Math.round(action.height)))});this.snapshot=undefined;}
  else if(action.type==='reload')await this.navigation(page.reload({waitUntil:'domcontentloaded'}),signal);
  else if(action.type==='scroll')await page.mouse.wheel(0,(action.direction==='down'?1:-1)*(page.viewportSize()!.height*.75));
  else if(action.type==='wait')await new Promise(resolve=>setTimeout(resolve,150));
  else{const node=await this.target(action);try{signal.throwIfAborted();const rect=await node.boundingBox();if(rect)this.update({target:{rect,viewport:page.viewportSize()!,action:action.type,name:this.snapshot?.elements.find(e=>e.id===action.elementId)?.name??''}});if(action.type==='click')await this.navigation(node.click({timeout:15000}),signal);else if(action.type==='fill'){
   await node.click({timeout:1000,noWaitAfter:true});await this.settledRead(signal);signal.throwIfAborted();
   const editable=await page.evaluate(()=>{let e=document.activeElement as HTMLElement|null;while(e?.shadowRoot?.activeElement)e=e.shadowRoot.activeElement as HTMLElement;return !!e&&(e.isContentEditable||e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement&&!['password','file','hidden','button','submit','checkbox','radio'].includes(e.type))&&!(e as HTMLInputElement).readOnly&&!(e as HTMLInputElement).disabled;});
   if(!editable)throw new StaleBrowserSnapshot('The focused field changed. Observe again before entering text.');
   await page.keyboard.press('ControlOrMeta+A');signal.throwIfAborted();await page.keyboard.insertText(action.text);
   // Autocomplete suggestions may arrive after the input event. Wait for an
   // observed option, not for arbitrary network idleness or a fixed long sleep.
   await page.evaluate(String.raw`new Promise(resolve=>{
    let field=document.activeElement;while(field?.shadowRoot?.activeElement)field=field.shadowRoot.activeElement;
    if(!field||field.getAttribute('role')!=='combobox'&&!field.hasAttribute('aria-autocomplete')){resolve();return;}
    const root=field.getRootNode();
    let timer;let done=false;
    const observer=new MutationObserver(check);
    function finish(){if(done)return;done=true;clearTimeout(timer);observer.disconnect();resolve();}
    function check(){
     const ids=(field.getAttribute('aria-controls')||field.getAttribute('aria-owns')||'').split(/\s+/).filter(Boolean);
     const areas=ids.length?ids.map(id=>root.getElementById(id)).filter(e=>!!e):[root];
     if(areas.some(area=>[...area.querySelectorAll('[role="option"]')].some(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(e).visibility!=='hidden';})))finish();
    }
    observer.observe(root,{subtree:true,childList:true,attributes:true});timer=setTimeout(finish,800);check();
   })`);signal.throwIfAborted();
  }else{const el=this.snapshot!.elements.find(e=>e.id===action.elementId)!;if(!el.options?.some(o=>o.value===action.value))throw new StaleBrowserSnapshot('Option was not observed.');await node.selectOption(action.value,{timeout:1000});}}finally{this.update({target:undefined});await node.dispose();}}
  signal.throwIfAborted();return this.settledRead(signal);
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
 async close(){this.closed=true;await this.queue.catch(()=>{});await this.inputQueue.catch(()=>{});await this.starting?.catch(()=>{});await this.manualChrome?.close();this.manualChrome=undefined;await this.dispose(true);this.ownsChrome=false;this.backgroundChrome=undefined;this.context=undefined;this.browser=undefined;this.page=undefined;this.snapshot=undefined;this.frame=undefined;this.update({state:'closed',loading:false});this.listeners.clear();}
}
