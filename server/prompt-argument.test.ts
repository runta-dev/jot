import {test} from 'node:test';import assert from 'node:assert/strict';
import {fillPromptArgument,promptExcerpts} from './prompt-argument.ts';
import type {Evaluate} from '@jot/jev-core';
test('prompt excerpts keep quoted and source spans from the user',()=>{
 assert.ok(promptExcerpts([{role:'user',content:'find info from "TypeSafe official website"'}]).includes('TypeSafe official website'));
});
test('when the user already has every needed word, a Choice picks them without word generation',async()=>{
 let generated=false;
 const evaluate:Evaluate=async request=>{
  if(request.questions.has_words){
   const phrase=request.questions.phrase;
   const entries=phrase?.type==='choice'?Object.entries(phrase.criteria??{}):[];
   const choice=entries.find(([,text])=>text==='TypeSafe official website')?.[0]??'p0';
   return {model:'test',answers:{has_words:{type:'noul',noul:0.9},phrase:{type:'choice',choice,confidence:1,probabilities:{[choice]:1}}}};
  }
  generated=true;throw Error('should not generate');
 };
 const text=await fillPromptArgument({evaluate,messages:[{role:'user',content:'find info from "TypeSafe official website"'}],signal:new AbortController().signal,tool:'browser_search',parameter:'query',description:'Search query'});
 assert.equal(text,'TypeSafe official website');
 assert.equal(generated,false);
});
test('when needed words are missing, per-word generation uses the conversation lexicon',async()=>{
 const seen:string[]=[];
 const evaluate:Evaluate=async request=>{
  if(request.questions.has_words)return {model:'test',answers:{has_words:{type:'noul',noul:0.1}}};
  const question=Object.values(request.questions)[0];
  if(question.type==='choice'){
   seen.push(...Object.keys(question.criteria??{}));
   if(request.questions.next)return {model:'test',answers:{next:{type:'choice',choice:'END',confidence:1,probabilities:{END:1}}}};
   const words=Object.keys(question.criteria??{}).filter(k=>k!=='OTHER'&&k!=='END');
   const choice=words[0];
   return {model:'test',answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,{type:'choice',choice,confidence:1,probabilities:{[choice]:1}}]))};
  }
  throw Error('unexpected');
 };
 await assert.rejects(fillPromptArgument({evaluate,messages:[{role:'user',content:'TypeSafe official website'}],signal:new AbortController().signal,tool:'browser_search',parameter:'query',description:'Search query'}),/Empty generated argument/);
 assert.ok(seen.includes('the')||seen.includes('you')||seen.length>20);
});
