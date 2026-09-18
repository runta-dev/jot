import {mkdir,writeFile} from 'node:fs/promises';
const cases=[
 {id:'lead_reverse',text:'Is lead less dense than aluminum?',status:'complete',direction:'higher'},
 {id:'rubber_reverse',text:'Does rubber have higher conductivity than copper?',status:'complete',direction:'lower'},
 {id:'glass_reverse',text:'Compare glass and diamond in hardness.',status:'complete',direction:'lower'},
 {id:'water_viscosity',text:'Compare water and honey in viscosity.',status:'complete',direction:'lower'},
 {id:'ice_density',text:'Compare ice and liquid water in density.',status:'complete',direction:'lower'},
 {id:'unknown',text:'Does material ZX-4827 have higher density than material YP-7319?',status:'unknown',direction:'unknown'},
 {id:'missing',text:'Compare density.',status:'missing_entities'},
 {id:'one_entity',text:'Compare the density of water.',status:'missing_entities'},
 {id:'greeting',text:'hello',status:'missing_entities'},
];
const dir=`experiments/results/comparison-http-${new Date().toISOString().replace(/[:.]/g,'-')}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/manifest.json`,JSON.stringify({protocol:'research/R14-comparison-runtime-protocol.md',cases},null,2));const results:any[]=[];
for(const c of cases){const started=performance.now();const response=await fetch('http://localhost:3000/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'comparison',messages:[{role:'user',content:c.text}]})});const body=await response.text();const events=body.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));const reply=events.find(e=>e.type==='reply'),error=events.find(e=>e.type==='error');const pass=response.ok&&reply?.status===c.status&&(!c.direction||reply.direction===c.direction)&&events.at(-1)?.type==='done';const row={...c,http:response.status,pass,reply,error,events,ms:Math.round(performance.now()-started)};results.push(row);console.log(JSON.stringify({id:c.id,pass,reply,error,ms:row.ms}));}
for(const [id,body,headers,expected]of [
 ['invalid_mode',{mode:'bad',messages:[{role:'user',content:'hi'}]},{},400],
 ['invalid_messages',{mode:'comparison',messages:[]},{},400],
 ['cross_origin',{mode:'comparison',messages:[{role:'user',content:'hi'}]},{origin:'https://example.test'},403],
] as const){const response=await fetch('http://localhost:3000/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});results.push({id,http:response.status,pass:response.status===expected,body:await response.text()});}
await writeFile(`${dir}/results.json`,JSON.stringify({directory:dir,passed:results.filter(r=>r.pass).length,total:results.length,results},null,2)+'\n');console.log('Saved '+dir);
