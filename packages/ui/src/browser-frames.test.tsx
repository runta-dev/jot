import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browserFrames} from './browser-frames';
import type {BrowserFrame} from '@jot/browser/types';
test('slow image decoding drops intermediate frames and cleanup ignores late decodes',()=>{
 const Original=globalThis.Image;
 class ImageStub{src='';naturalWidth=640;naturalHeight=480;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;static instance:ImageStub;constructor(){ImageStub.instance=this;}}
 globalThis.Image=ImageStub as unknown as typeof Image;
 try{
  const drawn:number[]=[];let draws=0;
  const canvas={width:0,height:0,getContext:()=>({drawImage:()=>draws++})} as unknown as HTMLCanvasElement;
  const renderer=browserFrames(canvas,frame=>drawn.push(frame.timestamp));
  const frame=(n:number):BrowserFrame=>({data:String(n),mimeType:'image/jpeg',width:640,height:480,timestamp:n});
  renderer.push(frame(1));renderer.push(frame(2));renderer.push(frame(3));
  const image=ImageStub.instance;assert.equal(image.src,'data:image/jpeg;base64,1');
  image.onload!();assert.equal(image.src,'data:image/jpeg;base64,3');image.onload!();
  assert.deepEqual(drawn,[1,3]);assert.equal(draws,2);
  renderer.push(frame(4));const late=image.onload!;renderer.close();late();assert.equal(draws,2);
 }finally{globalThis.Image=Original;}
});
