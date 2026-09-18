import type {BrowserFrame} from '@jot/browser/types';

/** One decode in flight, one newest pending frame; never replay an old-frame backlog. */
export function browserFrames(canvas:HTMLCanvasElement,onPaint:(frame:BrowserFrame)=>void){
 let pending:BrowserFrame|undefined,busy=false,closed=false;
 const image=new Image();
 function next(){
  if(closed||busy||!pending)return;
  const frame=pending;pending=undefined;busy=true;
  image.onload=()=>{
   if(closed)return;
   const context=canvas.getContext('2d');
   if(context){
    if(canvas.width!==image.naturalWidth)canvas.width=image.naturalWidth;
    if(canvas.height!==image.naturalHeight)canvas.height=image.naturalHeight;
    context.drawImage(image,0,0);onPaint(frame);
   }
   busy=false;next();
  };
  image.onerror=()=>{busy=false;next();};
  image.src=`data:${frame.mimeType};base64,${frame.data}`;
 }
 return {push(frame:BrowserFrame){pending=frame;next();},close(){closed=true;pending=undefined;image.onload=null;image.onerror=null;image.src='';}};
}
