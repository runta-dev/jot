import {createServer} from 'node:http';
/** Local-only task fixture: no external writes, deterministic page behavior. */
createServer((req,res)=>{
 const url=new URL(req.url??'/','http://127.0.0.1:8766');
 const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end(`<!doctype html><title>Jot multi-step fixture</title><style>body{font:18px system-ui;margin:32px}label{display:block;margin:24px 0}input,select,button{font:inherit;padding:8px}</style>${url.pathname==='/done'?`<h1>Completed</h1><p>Name: ${escape(url.searchParams.get('name')??'')}</p><p>Color: ${escape(url.searchParams.get('color')??'')}</p><a href="/">Start again</a>`:`<h1>Local multi-step form</h1><form action="/done"><label>Name <input name="name"></label><label>Color <select name="color"><option>Red</option><option>Green</option><option>Blue</option></select></label><p>Continue is below the fold.</p><div style="height:900px"></div><button>Continue</button></form>`}`);
}).listen(8766,'127.0.0.1',()=>console.log('Task fixture: http://127.0.0.1:8766'));
