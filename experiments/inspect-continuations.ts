import {readFile,writeFile} from 'node:fs/promises';
const root=process.argv[2];if(!root)throw Error('Provide a result directory');
const events=(await readFile(`${root}/trace.jsonl`,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
const rows=events.filter(e=>e.stage==='rerank').map(e=>{
 const prefix=e.request.state.reply_so_far;
 const criteria=e.request.questions.next.criteria;
 const answer=e.response.data.answers.next;
 const display=(key:string)=>key==='END'?'[END]':criteria[key]?.slice(prefix.length);
 return {id:e.id,user:e.user,prefix,selected:display(answer.choice),confidence:answer.confidence,candidates:Object.entries(answer.probabilities).sort((a:any,b:any)=>b[1]-a[1]).map(([key,p])=>({text:display(key),p}))};
});
await writeFile(`${root}/decisions.json`,JSON.stringify(rows,null,2));
console.log(`Wrote ${rows.length} decision states`);
