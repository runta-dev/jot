export type ToolArguments=Record<string,string>;
export type ToolResult={status:'ok'|'error';text?:string;value?:string;reason?:'complete'|'limit'|'budget'|'needs_input'|'final';error?:string;data?:unknown};
export type ToolCall={id:string;name:string;arguments:ToolArguments};
export type ChatMessage={role:'user'|'assistant';content:string;toolCalls?:(ToolCall&{result?:ToolResult})[]};
export type ToolMessage={role:'tool';toolCallId:string;name:string;result:ToolResult};
export type AgentMessage=ChatMessage|{role:'assistant';toolCall:ToolCall}|ToolMessage;
export type Usage={requests:number;inputTokens:number;outputTokens:number};
export type Selection={choice:string;confidence:number;alternatives:{char:string;probability:number}[]};
export type TextUpdate={type:'text_delta';delta:string;selection?:Selection};
export type AgentEvent=(TextUpdate|{type:'done';reason:'complete'|'limit'|'budget'|'needs_input'}|{type:'tool_call';call:ToolCall}|{type:'tool_result';message:ToolMessage}|{type:'replace';content:string})&Usage;
export type Parameter={type:'string';description:string;oneOf?:{const:string;description?:string}[];maxLength?:number;dependsOn?:string[]};
export type Parameters={type:'object';properties:Record<string,Parameter>;required:string[];additionalProperties:false};
export type Tool={name:string;description:string;parameters:Parameters;execute:(args:ToolArguments)=>AsyncGenerator<TextUpdate,ToolResult>};
export type ToolFactory=(context:{messages:AgentMessage[];signal:AbortSignal})=>Tool|null;
export type Decision={type:'tool_call';name:string;arguments:ToolArguments}|{type:'answer';text:string;reason?:'complete'|'limit'|'budget'|'needs_input'|'final'};
export type Model=(messages:AgentMessage[],tools:Tool[],signal:AbortSignal)=>Promise<Decision>;
export const emptySchema:Parameters={type:'object',properties:{},required:[],additionalProperties:false};
export class BudgetReached extends Error {}
export function conversation(messages:AgentMessage[]):ChatMessage[]{return messages.filter((m):m is ChatMessage=>'content' in m);}
export function toolResults(messages:AgentMessage[]):ToolMessage[]{return messages.filter((m):m is ToolMessage=>m.role==='tool');}
export function validateArguments(schema:Parameters,args:ToolArguments){
 if(Object.keys(args).some(k=>!Object.hasOwn(schema.properties,k)))throw Error('Unknown tool argument.');
 for(const name of schema.required){
  const parameter=schema.properties[name],value=args[name];
  if(typeof value!=='string'||parameter.oneOf&&!parameter.oneOf.some(o=>o.const===value)||parameter.maxLength!==undefined&&value.length>parameter.maxLength)throw Error(`Invalid tool argument: ${name}`);
 }
}
