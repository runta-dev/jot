import type {AgentEvent} from '@jot/agent';
import type {ToolEntry} from './ToolCalls';
export type Message={id:string;role:'user'|'assistant';content:string;count?:number;elapsed?:number;status?:string;toolCalls?:ToolEntry[]};
/** UI consumes the public agent protocol, not provider-specific response shapes. */
export function applyAgentEvent(message:Message,event:AgentEvent,elapsed:number):Message{
 switch(event.type){
  case 'tool_call':return {...message,toolCalls:[...(message.toolCalls??[]),{...event.call,startedAt:elapsed}]};
  case 'tool_result':return {...message,toolCalls:(message.toolCalls??[]).map(call=>call.id===event.message.toolCallId?{...call,result:event.message.result,finishedAt:elapsed}:call)};
  case 'text_delta':return {...message,content:message.content+event.delta,count:message.content.length+event.delta.length,elapsed};
  case 'replace':return {...message,content:event.content,count:event.content.length,elapsed};
  case 'done':return {...message,content:message.content.trim()?message.content:'Done.',status:event.reason,elapsed};
 }
}
