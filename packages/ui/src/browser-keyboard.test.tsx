import {test} from 'node:test';import assert from 'node:assert/strict';import {remoteKey} from './browser-keyboard';
const key=(name:string,options:Record<string,boolean|number>={})=>remoteKey({key:name,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,...options});
test('forwards editing and activation keys as actual key presses',()=>{
 for(const name of ['Enter','Tab','Backspace','Delete','ArrowLeft','ArrowDown','Escape','Home','End'])assert.equal(key(name),name);
 assert.equal(key(' '),'Space');assert.equal(key('a'),'a');assert.equal(key('Tab',{shiftKey:true}),'Shift+Tab');assert.equal(key('k',{metaKey:true}),'Meta+K');assert.equal(key('a',{ctrlKey:true}),'Control+A');
});
test('IME, paste and dead-key text remain on the text input path',()=>{
 assert.equal(key('Enter',{isComposing:true}),null);assert.equal(key('Enter',{keyCode:229}),null);assert.equal(key('v',{metaKey:true}),null);assert.equal(key('Dead'),null);assert.equal(key('你'),null);assert.equal(key('+'),null);
});
