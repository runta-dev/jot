import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { question, characters } from '../server/jev.ts';
const env = parse(readFileSync('.env'));
for (const sample of [{user:'hello',prefix:'H'},{user:'who are you',prefix:'I '},{user:'Say hi.',prefix:'Hi'}]) {
  const base = question([{role:'user',content:sample.user}],sample.prefix);
  const questions: Record<string,unknown> = {
    choice: { type:'choice', instructions:'Which candidate is the best next continuation of the assistant reply to the user? Select END only if the current reply is complete.', criteria:Object.fromEntries([...characters.map((c,i)=>[`c${i}`,JSON.stringify(sample.prefix+c)]),['END',`Finish: ${JSON.stringify(sample.prefix)}`]]) },
    complete: {type:'noul',instructions:'Does assistant_reply_so_far already form a complete, relevant reply to the last user message? An unfinished word or clause is not complete.'},
  };
  characters.forEach((c,i)=> { questions[`score_${i}`] = {
    type:'score',
    instructions: `Evaluate this candidate continuation of the assistant reply: ${JSON.stringify(sample.prefix+c)}. It appends exactly one character to assistant_reply_so_far. How suitable is it as the beginning of a direct, grammatical English answer to the last user message? An unfinished word is allowed if it can naturally continue. Judge the candidate as written, including spaces.`,
    criteria:[
      'Malformed prefix, inappropriate character, or redundant whitespace; not a plausible continuation.',
      'Possible continuation but awkward, weakly relevant, or less natural than ordinary English.',
      'Natural grammatical prefix of a relevant answer, with no needless repetition or whitespace.',
      'Strong, direct continuation of the intended answer; spelling and spacing are appropriate.'
    ],
  }; });
  const started=Date.now();
  const response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${env.JEV_API_KEY||env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({...base,questions})});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  const ranking=characters.map((c,i)=>({candidate:sample.prefix+c,score:data.answers[`score_${i}`].score})).sort((a,b)=>b.score-a.score);
  console.log(JSON.stringify({sample,ms:Date.now()-started,choice:data.answers.choice.choice,choiceText:(questions.choice as any).criteria[data.answers.choice.choice],complete:data.answers.complete.noul,top:ranking.slice(0,6),space:ranking.find(r=>r.candidate===sample.prefix+' '),usage:data.usage}));
}
