import type {ChatMessage as Message} from '@jot/agent';
export function parseMessages(value: unknown): Message[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40)
    throw new Error("Send between 1 and 40 messages.");
  let size = 0;
  const messages = value.map((m: unknown) => {
    if (
      typeof m !== "object" ||
      m === null ||
      !("role" in m) ||
      !("content" in m) ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      (!m.content.trim() && !(m.role === "assistant" && "toolCalls" in m && Array.isArray(m.toolCalls) && m.toolCalls.length > 0)) ||
      m.content.length > 4000
    )
      throw new Error(
        "Each message must have a valid role and 1–4,000 characters.",
      );
    size += m.content.length;
    let toolCalls:Message['toolCalls'];
    if (m.role === 'assistant' && 'toolCalls' in m && m.toolCalls !== undefined) {
      if (!Array.isArray(m.toolCalls) || m.toolCalls.length > 8) throw new Error('Invalid tool history.');
      toolCalls = m.toolCalls.map((call: any) => {
        if (!call || typeof call.id !== 'string' || call.id.length > 100 || typeof call.name !== 'string' || !/^[a-z_]+$/.test(call.name) || !call.arguments || typeof call.arguments !== 'object' || Array.isArray(call.arguments) || !Object.values(call.arguments).every(v => typeof v === 'string')) throw new Error('Invalid tool history.');
        const r=call.result;
        if(r!==undefined && (!r || !['ok','error'].includes(r.status) || ['text','value','error'].some(k=>r[k]!==undefined&&typeof r[k]!=='string') || r.reason!==undefined&&!['complete','limit','budget'].includes(r.reason))) throw new Error('Invalid tool result history.');
        return {id:call.id,name:call.name,arguments:call.arguments,...(r?{result:r}:{})};
      });
      size += JSON.stringify(toolCalls).length;
    }
    return { role: m.role, content: m.content, ...(toolCalls ? {toolCalls} : {}) } as Message;
  });
  if (size > 16000)
    throw new Error("This conversation is too long. Start a new chat.");
  if (messages.at(-1)?.role !== "user")
    throw new Error("The last message must be from you.");
  return messages;
}
