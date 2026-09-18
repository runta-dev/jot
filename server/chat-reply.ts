import {runAgentLoop,BudgetReached,type ChatMessage,type ToolFactory,type AgentEvent} from '@jot/agent';
import {makeEvaluator,type Evaluate} from '@jot/jev-core';
import {createJevModel} from './jev-agent.ts';
import {createAgentTools} from './agent-tools.ts';
export {sourceSpans} from './source-spans.ts';
/** HTTP application composition: provider, tools, shared budget, and generic loop. */
export async function* generateChatReply(key:string,messages:ChatMessage[],signal:AbortSignal,options:{evaluate?:Evaluate;tools?:ToolFactory[];extraTools?:ToolFactory[];maxTurns?:number;maxInputTokens?:number}={}):AsyncGenerator<AgentEvent>{
 const usage={requests:0,inputTokens:0,outputTokens:0},maxInput=options.maxInputTokens??500000;
 const provider=options.evaluate??makeEvaluator(key,()=>usage.requests++);
 const evaluate:Evaluate=async(request,abortSignal)=>{
  abortSignal.throwIfAborted();if(usage.inputTokens>=maxInput)throw new BudgetReached();
  if(options.evaluate)usage.requests++;
  const response=await provider(request,abortSignal);abortSignal.throwIfAborted();
  usage.inputTokens+=response.usage?.input_tokens??0;usage.outputTokens+=response.usage?.output_tokens??0;return response;
 };
 const tools=options.tools??[...createAgentTools({key,evaluate,remainingInput:()=>maxInput-usage.inputTokens}),...(options.extraTools??[])];
 yield* runAgentLoop(messages,{model:createJevModel(evaluate),tools,signal,usage:()=>({...usage}),maxTurns:options.maxTurns});
}
