import {mkdir,writeFile,appendFile} from 'node:fs/promises';import {researchCall} from './research-api.ts';
const cases=[
{id:'name',messages:['My dog is named Belori.','Return my dog name only.'],expected:'Belori'},
{id:'version',messages:['The release version is v7.4.2.','What is the release version?'],expected:'v7.4.2'},
{id:'time',messages:['Dinner is at 19:45.','Return only the dinner time.'],expected:'19:45'},
{id:'changed',messages:['The room is 305.','Correction: the room is 407.','What is the current room number?'],expected:'407'},
{id:'phrase',messages:['Repeat exactly "quiet blue lake"'],expected:'quiet blue lake'},
{id:'selection',messages:['The scarf is yellow and the hat is purple.','Which color is the hat?'],expected:'purple'},
{id:'owner',messages:['Mira owns the red bike. Tovin owns the green bike.','Who owns the green bike?'],expected:'Tovin'},
{id:'unicode',messages:['My nickname is Névora.','Repeat only my nickname.'],expected:'Névora'},
{id:'conflict',messages:['Notice A gives room 305. Notice B gives room 407. Neither notice supersedes the other.','Which room should I use?'],expected:null},
{id:'stale',messages:['The current room is 407.','What was the previous room number?'],expected:null},
{id:'presupposition',messages:['The parcel arrived.','Why did the courier damage it?'],expected:null},
{id:'transform',messages:['The code is ZX-5831.','Return only the last four characters of the code.'],expected:null},
{id:'knowledge',messages:['Why do leaves change color in autumn?'],expected:null},
{id:'newcontent',messages:['Write an original birthday greeting for a friend.'],expected:null}
];
const dir=`experiments/results/span-sufficiency-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/manifest.json`,JSON.stringify({protocol:'research/R43-span-sufficiency.md',cases},null,2));const rows=[];
for(const c of cases){const values=new Set<string>();for(const text of c.messages){const words=text.split(/\s+/);for(let i=0;i<words.length;i++)for(let n=1;n<=6&&i+n<=words.length;n++){const span=words.slice(i,i+n).join(' ').replace(/^["“]+|["”.,!?]+$/g,'');if(span)values.add(span);}}
 if(values.size>254)throw Error('Coverage exceeds budget');const spans=[...values];
 for(const reversed of [false,true]){const entries=spans.map((s,i)=>[`s${i}`,s]);if(reversed)entries.reverse();const request={model:'jev-latest',state:{conversation:c.messages.map(content=>({role:'user',content}))},questions:{answer:{type:'choice',instructions:'Can the latest user request be fully and correctly answered by returning exactly one provided source span? Select that exact complete answer, respecting corrections and context. Choose GENERATE if explanation, new content, calculation, missing information, or any wording not present in a span is needed. Do not select a span merely because it repeats the question or is related to it.',criteria:{...Object.fromEntries(entries),GENERATE:'No source span alone fully answers; use normal general generation.'}}}};const start=Date.now();const response=await researchCall(request);await appendFile(`${dir}/trace.jsonl`,JSON.stringify({id:c.id,reversed,request,response})+'\n');const a=response.data.answers.answer;const selected=a.choice==='GENERATE'?null:spans[Number(a.choice.slice(1))];let sufficient:number|null=null;
 if(selected!==null){
 const check={model:'jev-latest',state:{conversation:request.state.conversation,selected_span:selected},questions:{sufficient:{type:'noul',instructions:'Would returning selected_span alone fully and correctly satisfy the latest user request? Reject if it relies on missing information, an unsupported presupposition, a superseded fact, conflicting unresolved sources, or an unperformed requested transformation. Related words or copied instructions are not a complete answer.'}}};
 const verified=await researchCall(check);sufficient=verified.data.answers.sufficient.noul;await appendFile(`${dir}/trace.jsonl`,JSON.stringify({id:c.id,reversed,stage:'sufficiency',request:check,response:verified})+'\n');
 }
 const emitted=sufficient!==null&&sufficient>=.9?selected:null;const row={id:c.id,reversed,expected:c.expected,selected,confidence:a.confidence,sufficient,emitted,correct:c.expected===emitted,ms:Date.now()-start,usage:response.data.usage};rows.push(row);console.log(JSON.stringify(row));await writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));}
}console.log(dir);
