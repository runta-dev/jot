import {conversation,BudgetReached,type AgentMessage} from '@jot/agent';
import {conversationLexemes,generateWordReply,type Evaluate} from '@jot/jev-core';
import {sourceSpans} from './source-spans.ts';
import {browserTextCandidates} from './browser-text.ts';
export function promptExcerpts(messages:AgentMessage[]){
 const users=conversation(messages).filter(m=>m.role==='user');
 const latest=users.at(-1)?.content??'';
 return [...new Set([latest,...browserTextCandidates(latest),...(sourceSpans(users)??[])])].map(v=>v.trim()).filter(v=>v.length>0&&v.length<=280).slice(0,12);
}
function promptPhrases(messages:AgentMessage[]){
 const users=conversation(messages).filter(m=>m.role==='user');
 const words=conversationLexemes(users);
 return [...new Set([...promptExcerpts(messages),...words])].filter(v=>v.length>0&&v.length<=280).slice(0,40);
}
/** Fill a free-string tool argument: Noul if the user already has every needed word, Choice to pick those words, otherwise per-word generation. */
export async function fillPromptArgument(options:{evaluate:Evaluate;messages:AgentMessage[];signal:AbortSignal;tool:string;parameter:string;description:string;state?:unknown}):Promise<string>{
 const phrases=promptPhrases(options.messages);
 const picked=await options.evaluate({model:'jev-latest',state:options.state??{messages:options.messages},questions:{
  has_words:{type:'noul',instructions:`Does the latest user request already contain every word needed for ${options.tool}.${options.parameter}?`,criteria:{true:'All needed words appear in the user text; choose them next.',false:'Needed words are missing; generate the argument word by word.'}},
  ...(phrases.length?{phrase:{type:'choice',instructions:`If the user already supplied every needed word, pick the concise ${options.tool}.${options.parameter} value from those words. Prefer a short task-relevant phrase over the whole instruction sentence.`,criteria:Object.fromEntries(phrases.map((text,i)=>[`p${i}`,text]))}}:{}),
 }},options.signal);
 const hasWords=picked.answers.has_words;
 const phrase=picked.answers.phrase;
 if(hasWords?.type==='noul'&&hasWords.noul>=0.5&&phrase?.type==='choice'){
  const text=phrases[Number(phrase.choice.slice(1))];
  if(text)return text;
 }
 let text='';
 const instructions=`Produce only the value of ${options.tool}.${options.parameter}: ${options.description} This is a tool argument, not a conversational answer. Do not add explanations, greetings or quotes. END as soon as the argument is ready.`;
 for await(const event of generateWordReply('',conversation(options.messages),options.signal,{evaluate:options.evaluate,instructions,maxSteps:12})){
  if(event.type==='character')text+=event.character;
  else if(event.reason==='budget')throw new BudgetReached();
  else if(event.reason!=='complete')throw Error(`Could not finish ${options.tool}.${options.parameter}.`);
 }
 if(!text.trim())throw Error(`Empty generated argument: ${options.parameter}`);
 return text.trim();
}
