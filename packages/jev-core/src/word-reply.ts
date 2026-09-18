import {readFileSync} from 'node:fs';
import {inflections} from './inflections.ts';
import {makeEvaluator,type Evaluate,type ChoiceAnswer,type ChoiceQuestion} from './typesafe.ts';
import type {Message,CharacterChoice} from './conversation.ts';
const vocabulary=JSON.parse(readFileSync(new URL('./data/conversation-words.json',import.meta.url),'utf8')) as string[];
const GROUP=240;
function groups(words:string[]){const n=Math.ceil(words.length/GROUP);return Array.from({length:n},(_,i)=>words.filter((_,j)=>j%n===i));}
function top(a:ChoiceAnswer,n:number){return Object.entries(a.probabilities).filter(([w])=>w!=='OTHER').sort((a,b)=>b[1]-a[1]).slice(0,n).map(([w])=>w);}
export function conversationLexemes(messages:Message[]){return messages.flatMap(m=>m.content.match(/[A-Za-z0-9]+(?:['_.:-][A-Za-z0-9]+)*/g)??[]);}
function render(prefix:string,word:string){if(/^[.,!?]$/.test(word))return prefix+word;let w=word==='i'?'I':word;if((!prefix||/[.!?]$/.test(prefix))&&!/[0-9_-]/.test(w))w=w[0].toUpperCase()+w.slice(1);return prefix+(prefix?' ':'')+w;}
class BudgetReached extends Error {}
type Options={instructions?:string;toolResults?:unknown;evaluate?:Evaluate;vocabulary?:string[];forms?:(word:string)=>string[];maxSteps?:number;maxInputTokens?:number};
type Metrics={requests:number;inputTokens:number;outputTokens:number};
export type WordEvent=({type:'character';character:string;count:number;step:CharacterChoice}|{type:'done';reason:'complete'|'limit'|'budget'})&Metrics;
/** Pure Jev choices plus disclosed lexical data and deterministic morphology. */
export async function* generateWordReply(key:string,messages:Message[],signal:AbortSignal,options:Options={}):AsyncGenerator<WordEvent>{
 let prefix='';const metrics:Metrics={requests:0,inputTokens:0,outputTokens:0};
 const evaluate=options.evaluate??makeEvaluator(key,()=>metrics.requests++);
 const base=options.vocabulary??vocabulary,forms=options.forms??inflections;
 const maxSteps=options.maxSteps??40,maxInput=options.maxInputTokens??500000;
 async function ask(questions:Record<string,ChoiceQuestion>){
  signal.throwIfAborted();if(metrics.inputTokens>=maxInput)throw new BudgetReached();
  if(options.evaluate)metrics.requests++;
  const response=await evaluate({model:'jev-latest',state:{conversation:messages,assistant:{name:'Jot',decision_model:'Jev',provider:'TypeSafe'},reply_so_far:prefix,...(options.toolResults?{tool_results:options.toolResults}:{})},questions:options.instructions?Object.fromEntries(Object.entries(questions).map(([id,q])=>[id,{...q,instructions:`${options.instructions}\n${q.instructions}`}])):questions},signal);
  signal.throwIfAborted();metrics.inputTokens+=response.usage?.input_tokens??0;metrics.outputTokens+=response.usage?.output_tokens??0;
  return response.answers;
 }
 try{
  const context=conversationLexemes(messages);
  const banks=groups([...new Set([...base,...context,'Jot','Jev','TypeSafe'])]);
  const selected=await ask(Object.fromEntries(banks.map((bank,i)=>[`g${i}`,{type:'choice',instructions:'Which listed word is most useful in a concise, correct answer to the latest user message? Use the conversation for context.',criteria:Object.fromEntries(bank.map(w=>[w,null]))}])));
  const active=[...new Set([...base.slice(0,400),...context,'Jev','TypeSafe',...Object.values(selected).flatMap(a=>top(a,32))])];
  for(let i=0;i<maxSteps;i++){
   const proposed=await ask(Object.fromEntries(groups(active).map((bank,j)=>[`g${j}`,{type:'choice',instructions:'Choose the next word to append to reply_so_far to answer the latest user message coherently in English. Continue unfinished sentences. Choose OTHER if no listed word fits.',criteria:{...Object.fromEntries(bank.map(w=>[w,null])),OTHER:'No listed word fits'}}])));
   const originals=[...new Set(Object.values(proposed).flatMap(a=>top(a,4)))];
   const candidates=[...new Set([...originals,...originals.flatMap(forms)])].slice(0,250);
   if(prefix&&!/[.,!?]$/.test(prefix))candidates.push('.',',','?','!');
   const seen=new Set<string>(),criteria:Record<string,string>={};
   candidates.forEach((w,j)=>{const text=render(prefix,w);if(!seen.has(text)){seen.add(text);criteria[`c${j}`]=text;}});
   criteria.END='Stop without adding text: the current reply already answers the user adequately.';
   const {next}=await ask({next:{type:'choice',instructions:'Each candidate shows the full existing reply with a word or punctuation appended. Choose the most natural, grammatical, factually correct continuation toward answering the latest user message, using conversation context. Choose END only when reply_so_far is already complete. Do not restart the reply. Avoid universal capability claims or promises unsupported by state. Prefer a concrete useful answer; acknowledge uncertainty or limitations when relevant.',criteria}});
   if(next.choice==='END'){yield {type:'done',reason:'complete',...metrics};return;}
   const text=criteria[next.choice];if(!text||!text.startsWith(prefix))throw Error('TypeSafe returned an invalid continuation.');
   const fragment=text.slice(prefix.length);prefix=text;
   const step:CharacterChoice={choice:fragment,confidence:next.confidence,alternatives:Object.entries(next.probabilities).filter(([id])=>id!=='END'&&Object.hasOwn(criteria,id)).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([id,probability])=>({char:criteria[id].slice(text.length-fragment.length),probability}))};
   yield {type:'character',character:fragment,count:prefix.length,step,...metrics};
  }
  yield {type:'done',reason:'limit',...metrics};
 }catch(error){if(error instanceof BudgetReached){yield {type:'done',reason:'budget',...metrics};return;}throw error;}
}
