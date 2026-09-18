import {mkdir,writeFile,appendFile} from 'node:fs/promises';
import {inflections} from './lib/inflections.ts';
import {researchCall} from './research-api.ts';
const cases=[['earth','The earth','turn',['turns']],['dog','The dog','run',['runs']],['dogs','The dogs','run',['run']],['past','Yesterday she','go',['went']],['children','The children','be',['are','were']],['child','The child','be',['is','was']],['plural','There are two','mouse',['mice']],['singular','There is one','mouse',['mouse']],['modal','They can','swim',['swim']],['gerund','She enjoys','swim',['swimming']],['name','The bicycle is named','Mivora',['Mivora']],['mass','They drink','water',['water']]] as const;
const dir=`experiments/results/morphology-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(dir,{recursive:true});
await writeFile(`${dir}/manifest.json`,JSON.stringify({protocol:'research/R15.6-morphology-protocol.md',cases},null,2));
const rows=[];
for(const [id,prefix,lemma,expected] of cases){
 const forms=inflections(lemma);
 for(const reverse of [false,true]){
  const options=reverse?[...forms].reverse():forms;
  const request={model:'jev-latest',state:{prefix},questions:{next:{type:'choice',instructions:'Choose the grammatically correct continuation of prefix. Each option is the complete prefix with one candidate word appended. Preserve the intended word meaning.',criteria:Object.fromEntries(options.map((f,i)=>[`c${i}`,`${prefix} ${f}`]))}}};
  const response=await researchCall(request);await appendFile(`${dir}/trace.jsonl`,JSON.stringify({id,reverse,request,response})+'\n');
  const value=options[Number(response.data.answers.next.choice.slice(1))];const row={id,reverse,forms,value,pass:(expected as readonly string[]).includes(value),coverage:expected.some(w=>forms.includes(w))};rows.push(row);console.log(JSON.stringify(row));
 }
}
await writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));console.log(dir);
