import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { question, characters, END } from '../server/jev.ts';
const env = parse(readFileSync('.env'));
for (const sample of [
  { user: 'hello', prefix: 'H', words: ['ello!', 'i!', 'ey!', 'ow are you?', 'ooo', ' ', END] },
  { user: 'who are you', prefix: 'I ', words: ['am', 'can', 'think', 'was', 'hello', ' ', END] },
]) {
  const request = question([{role:'user',content:sample.user}], sample.prefix);
  const questions = {
    isolated_character: request.questions.next,
    contextual_character: {type:'choice', instructions:'Which candidate text is the most natural continuation of the assistant reply to the user? Each candidate adds one character to the existing prefix. Select END only if the prefix is already a complete answer.', criteria: Object.fromEntries([...characters.map((c,i)=>[`c${i}`, JSON.stringify(sample.prefix+c)]),['END', `Finish: ${JSON.stringify(sample.prefix)}`]])},
    contextual_fragment: {type:'choice', instructions:'Which candidate text is the most natural beginning of a helpful English assistant reply to the user? Select END only if the current prefix is already a complete reply.', criteria: Object.fromEntries(sample.words.map((w,i)=>[`w${i}`,w===END?`Finish: ${JSON.stringify(sample.prefix)}`:JSON.stringify(sample.prefix+w)]))},
  };
  const r = await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${env.JEV_API_KEY || env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({...request,questions})});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  const result = await r.json();
  console.log(JSON.stringify({sample,answers:Object.fromEntries(Object.entries(result.answers).map(([name, value]:[string,any])=>[name,{choice:value.choice,label:(questions as any)[name].criteria[value.choice],confidence:value.confidence}]))}));
}
