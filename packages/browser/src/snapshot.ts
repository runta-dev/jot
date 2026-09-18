/** Static page-owned code; model output never becomes a selector or script. */
export const READ_SNAPSHOT=String.raw`(() => {
 const cache=window.__jotBrowser||(window.__jotBrowser={ids:new WeakMap(),nodes:new Map(),next:1});
 const identify=e=>{if(!cache.ids.has(e))cache.ids.set(e,String(cache.next++));const id=cache.ids.get(e);cache.nodes.set(id,e);return id;};
 for(const [id,e] of cache.nodes)if(!e.isConnected)cache.nodes.delete(id);
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return !e.closest('[aria-hidden="true"],[inert]')&&s.visibility!=='hidden'&&s.display!=='none'&&Number(s.opacity)!==0&&r.width>0&&r.height>0;};
 const roots=[document];for(let i=0;i<roots.length;i++)for(const e of roots[i].querySelectorAll('*'))if(e.shadowRoot)roots.push(e.shadowRoot);
 const labelText=e=>{const copy=e.cloneNode(true);copy.querySelectorAll('input,textarea,select,button,[aria-hidden="true"]').forEach(n=>n.remove());return copy.textContent||'';};
 const name=e=>{
  const root=e.getRootNode();const ids=(e.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);
  return (ids.map(id=>(root.getElementById?.(id)||document.getElementById(id))?.textContent||'').join(' ')||e.getAttribute('aria-label')||[...(e.labels||[])].map(labelText).join(' ')||e.getAttribute('alt')||e.getAttribute('placeholder')||e.innerText||e.getAttribute('title')||'').replace(/\s+/g,' ').trim().slice(0,220);
 };
 const role=e=>e.getAttribute('role')||({A:'link',BUTTON:'button',TEXTAREA:'textbox',SELECT:'combobox',SUMMARY:'button'}[e.tagName])||(e.tagName==='INPUT'?(['checkbox','radio'].includes(e.type)?e.type:['submit','button','reset'].includes(e.type)?'button':e.type==='search'?'searchbox':'textbox'):e.isContentEditable?'textbox':'control');
 cache.pageKey=()=>JSON.stringify([performance.timeOrigin]);
 cache.guard=e=>{if(!e?.isConnected||!visible(e))return null;return JSON.stringify([role(e),name(e),e.value??'',e.checked??null,e.getAttribute('href'),e.getAttribute('aria-expanded'),e.disabled??false,e.readOnly??false,(e.closest('li,tr')||e.parentElement)?.innerText?.slice(0,1200)||'']);};
 const elements=[],fields=[];
 for(const root of roots)for(const e of root.querySelectorAll('a[href],button,input,textarea,select,summary,[contenteditable="true"],[role="button"],[role="link"],[role="option"],[role="tab"],[role="checkbox"],[role="radio"],[role="combobox"],[role="textbox"],[role="searchbox"],[role="menuitem"]')){
  if(['hidden','password','file'].includes(e.type)||!visible(e)||e.matches(':disabled')||e.closest('[aria-disabled="true"]'))continue;
  const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  const inViewport=x>=0&&y>=0&&x<innerWidth&&y<innerHeight,hit=inViewport?root.elementFromPoint(x,y):null,covered=inViewport&&(!hit||!e.contains(hit));
  if(fields.length<200&&(['combobox','textbox','searchbox'].includes(role(e))||role(e)==='button'&&/^\d+\s/.test(name(e))))fields.push({role:role(e),name:name(e),value:typeof e.value==='string'?e.value.slice(0,500):undefined,active:root.activeElement===e,covered});
  if(!inViewport||covered)continue;
  const editable=!e.readOnly&&(e.isContentEditable||e.tagName==='TEXTAREA'||e.tagName==='INPUT'&&!['button','submit','reset','checkbox','radio','image'].includes(e.type));
  const actions=e.tagName==='SELECT'?['select','click']:editable?['fill','click']:['click'];
  const checked=e.getAttribute('aria-checked'),selected=e.getAttribute('aria-selected')??e.getAttribute('aria-pressed'),expanded=e.getAttribute('aria-expanded');
  elements.push({checked:checked==='mixed'?'mixed':checked!==null?checked==='true':['checkbox','radio'].includes(e.type)?e.checked:undefined,selected:selected===null?undefined:selected==='true',expanded:expanded===null?undefined:expanded==='true',id:identify(e),role:role(e),name:name(e)||role(e),value:typeof e.value==='string'?e.value.slice(0,500):undefined,actions,options:e.tagName==='SELECT'?[...e.options].filter(o=>!o.disabled&&!o.closest('optgroup[disabled]')).map(o=>({value:o.value,label:o.label})):undefined,rect:{x:r.x,y:r.y,width:r.width,height:r.height},guard:cache.guard(e)});
  if(elements.length>=200)break;
 }
 const texts=[];let length=0;for(const root of roots){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())&&length<8000){const e=node.parentElement,value=node.textContent.trim();if(!e||!value||e.closest('script,style,noscript,template')||!visible(e))continue;const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)continue;const hit=root.elementFromPoint((Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2);if(!hit||!e.contains(hit)&&!hit.contains(e))continue;texts.push(value);length+=value.length;}}
 const verificationFrame=roots.some(root=>[...root.querySelectorAll('iframe')].some(e=>visible(e)&&/captcha|challenge/i.test((e.getAttribute('src')||'')+' '+(e.getAttribute('title')||''))));
 const verificationText=/unusual traffic|verify (?:that )?you (?:are|’re|'re) (?:a )?human|checking your browser/i.test(texts.join(' '));
 return {interruption:verificationFrame&&verificationText?'verification':undefined,pageKey:cache.pageKey(),url:location.href,title:document.title,pageText:(document.body?.innerText||'').slice(0,16000),fields,headings:roots.flatMap(root=>[...root.querySelectorAll('h1,h2,h3,[role=heading]')]).filter(visible).map(e=>e.innerText.trim()).filter(Boolean).slice(0,80),text:texts.join('\n').slice(0,8000),elements:elements.slice(0,200),scroll:{x:scrollX,y:scrollY,height:document.documentElement.scrollHeight,viewportHeight:innerHeight},viewport:{width:innerWidth,height:innerHeight}};
})()`;
