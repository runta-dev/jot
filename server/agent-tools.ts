import type {DraftAnswer} from './local-draft.ts';
import {calculateOperands,type ArithmeticOperator} from './arithmetic.ts';
import {sourceSpans} from './source-spans.ts';
import {generateWordReply,type Evaluate} from '@jot/jev-core';
import {conversation,toolResults,type Parameters,type Parameter,type ToolFactory} from '@jot/agent';
function field(description:string,options:Record<string,string|null>):Parameter{return {type:'string',description,oneOf:Object.entries(options).map(([value,label])=>({const:value,...(label?{description:label}:{})}))};}
function parameters(properties:Record<string,Parameter>):Parameters{return {type:'object',properties,required:Object.keys(properties),additionalProperties:false};}
/** Application tools; the agent package has no knowledge of these implementations. */
export function createAgentTools(runtime:{key:string;evaluate:Evaluate;remainingInput:()=>number;draft?:DraftAnswer}):ToolFactory[]{
 const calculate:ToolFactory=({messages})=>{
  const fromMessages=conversation(messages).flatMap(m=>m.content.match(/[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+)?/g)??[]);
  const values=[...new Set([...fromMessages,...toolResults(messages).flatMap(o=>o.result.value?[o.result.value]:[])])].filter(v=>v.length<=90);
  if(!values.length||values.length>64)return null;
  const numeric=Object.fromEntries(values.map(v=>[v,null]));
  return {name:'calculate',description:'Perform one exact arithmetic operation using conversation numbers or prior tool results. For multi-step calculations, call again with the previous result; do not guess arithmetic.',parameters:parameters({
   left:field('Select the left operand for the next required calculation, using completed tool results and operation order.',numeric),
   operator:field('Select the next required arithmetic operation.',{add:'Addition',subtract:'Subtract right operand from left',multiply:'Multiplication',divide:'Divide left operand by right'}),
   right:field('Select the right operand for the next required calculation, using previous tool results where appropriate.',numeric)
  }),async *execute(args){const text=calculateOperands(args.left,args.operator as ArithmeticOperator,args.right);return {status:'ok',text,...(/^[-+]?\d/.test(text)?{value:text}:{})};}};
 };
 const readContext:ToolFactory=({messages})=>{
  const spans=sourceSpans(conversation(messages));if(!spans?.length)return null;
  return {name:'read_context',description:'Retrieve an exact answer already in the conversation, preserving corrections, role attribution, whitespace and punctuation. Does not invent, calculate, combine separated facts, or explain.',parameters:parameters({spanId:field('Can the latest user request be fully and correctly answered by returning exactly one provided source span? Select that exact complete answer, respecting corrections and context. Choose NONE if explanation, new content, calculation, missing information, or any wording not present in a span is needed. Do not select a span merely because it repeats the question or is related to it.',{...Object.fromEntries(spans.map((s,i)=>[`s${i}`,s])),NONE:'No source span alone fully answers; use another tool.'})}),async *execute(args){if(args.spanId==='NONE')return {status:'error',error:'No complete answer found in conversation.'};const text=spans[Number(args.spanId.slice(1))];if(!text)throw Error('Invalid span identifier.');return {status:'ok',text,data:{source:'conversation',spanId:args.spanId}};}};
 };
 const compose:ToolFactory=({messages,signal})=>({name:'draft_message',description:'Draft a concise answer from the conversation and actual tool results. Use for explanations, writing, advice, combinations, or requests not fully answered by other tools.',parameters:runtime.draft?{type:'object',additionalProperties:false,required:[],properties:{hints:{type:'string',description:'Short factual hints for the local writer. For identity, hint: assistant is Jot; Jev is the model that chooses tools. Include names, numbers, and constraints. Do not write I am Jev or a full reply.',maxLength:280}}}:{type:'object',additionalProperties:false,required:[],properties:{}},async *execute(args){
  const focus=args.hints?.trim();
  if(runtime.draft)return yield* runtime.draft(messages,signal,focus);
  let text='',reason:'complete'|'limit'|'budget'='complete';
  for await(const event of generateWordReply(runtime.key,conversation(messages),signal,{evaluate:runtime.evaluate,maxInputTokens:runtime.remainingInput(),toolResults:toolResults(messages),instructions:focus?`Must keep these hints in the answer: ${focus}`:undefined})){
   if(event.type==='character'){text+=event.character;yield {type:'text_delta',delta:event.character,selection:event.step};}else reason=event.reason;
  }return {status:'ok',text,reason};
 }});
 return [calculate,readContext,compose];
}
