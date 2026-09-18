import {BudgetReached,validateArguments,type ChatMessage,type AgentMessage,type AgentEvent,type Model,type ToolFactory,type Tool,type ToolMessage,type ToolResult,type Usage} from './types.ts';
/** Minimal Pi-style loop. No provider, HTTP, UI, or application-tool dependencies. */
export async function* runAgentLoop(conversation:ChatMessage[],options:{model:Model;tools:ToolFactory[];signal:AbortSignal;usage?:()=>Usage;maxTurns?:number}):AsyncGenerator<AgentEvent>{
 const {model,tools:factories,signal}=options;
 const usage=options.usage??(()=>({requests:0,inputTokens:0,outputTokens:0}));
 const messages:AgentMessage[]=conversation.flatMap(message=>{
  const history:AgentMessage[]=[];
  for(const {result,...call} of message.toolCalls??[])history.push({role:'assistant',toolCall:structuredClone(call)},{role:'tool',toolCallId:call.id,name:call.name,result:structuredClone(result??{status:'error',error:'Previous tool call was interrupted.'})});
  if(message.content || !message.toolCalls?.length) history.push({role:message.role,content:message.content});return history;
 });
 let displayed='';
 try{
  for(let turn=0;options.maxTurns===undefined||turn<options.maxTurns;turn++){
   signal.throwIfAborted();
   const tools=factories.map(factory=>factory({messages,signal})).filter((t):t is Tool=>t!==null);
   const decision=await model(messages,tools,signal);signal.throwIfAborted();
   if(decision.type==='answer'){
    messages.push({role:'assistant',content:decision.text});
    if(displayed!==decision.text)yield {type:'replace',content:decision.text,...usage()};
    yield {type:'done',reason:decision.reason??'complete',...usage()};return;
   }
   const tool=tools.find(t=>t.name===decision.name);if(!tool)throw Error('Unknown tool.');
   const call={id:crypto.randomUUID(),name:tool.name,arguments:decision.arguments};
   messages.push({role:'assistant',toolCall:call});yield {type:'tool_call',call,...usage()};
   let result:ToolResult;
   try{
    validateArguments(tool.parameters,call.arguments);signal.throwIfAborted();
    const execution=tool.execute(call.arguments);let streaming=false;
    while(true){const item=await execution.next();signal.throwIfAborted();
     if(item.done){result=item.value;break;}
     if(!streaming){streaming=true;if(displayed){displayed='';yield {type:'replace',content:'',...usage()};}}
     displayed+=item.value.delta;yield {...item.value,...usage()};
    }
   }catch(error){signal.throwIfAborted();if(error instanceof BudgetReached)throw error;result={status:'error',error:(error as Error).message};}
   const message:ToolMessage={role:'tool',toolCallId:call.id,name:tool.name,result};messages.push(message);yield {type:'tool_result',message,...usage()};
   if(result.reason==='needs_input'){if(result.text)yield {type:'replace',content:result.text,...usage()};yield {type:'done',reason:'needs_input',...usage()};return;}
   if(result.reason==='budget'){yield {type:'done',reason:'budget',...usage()};return;}
  }
  yield {type:'done',reason:'limit',...usage()};
 }catch(error){if(error instanceof BudgetReached){yield {type:'done',reason:'budget',...usage()};return;}throw error;}
}
