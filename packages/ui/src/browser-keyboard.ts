type KeyInput={key:string;ctrlKey:boolean;metaKey:boolean;altKey:boolean;shiftKey:boolean;isComposing?:boolean;keyCode?:number};
const special=new Set(['Enter','Tab','Backspace','Delete','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Insert']);
/** null leaves IME/paste/dead-key text to the local textarea's input event. */
export function remoteKey(event:KeyInput):string|null{
 if(event.isComposing||event.keyCode===229)return null;
 if(['Meta','Control','Shift','Alt','Dead','Process','Unidentified'].includes(event.key))return null;
 if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='v')return null;
 let key=event.key===' '?'Space':event.key;
 if(!special.has(key)&&key!=='Space'&&!/^F(?:[1-9]|1[0-2])$/.test(key)&&!(key.length===1&&/^[\x21-\x7e]$/.test(key)))return null;
 // '+' is the separator in the remote keyboard API; insert it as text instead.
 if(key==='+')return null;
 if(key.length===1&&(event.ctrlKey||event.metaKey))key=key.toUpperCase();
 return [...[event.metaKey?'Meta':'',event.ctrlKey?'Control':'',event.altKey?'Alt':'',event.shiftKey?'Shift':''].filter(Boolean),key].join('+');
}
