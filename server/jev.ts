import type {ChatMessage} from '@jev-chat/agent';
export type Message = ChatMessage;
export const END = "<EOS>";
export const characters = [
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)),
  "\n",
];
export const criteria = Object.fromEntries([
  ...characters.map((char) => [
    char,
    char === " "
      ? "A single space"
      : char === "\n"
        ? "A line break"
        : `The character ${JSON.stringify(char)}`,
  ]),
  [
    END,
    "End of sequence. The assistant has finished answering. Stop immediately without appending text.",
  ],
]);
export type CharacterChoice = {
  choice: string;
  confidence: number;
  alternatives: { char: string; probability: number }[];
};
export function question(messages: Message[], prefix: string) {
  return {
    model: "jev-latest",
    state: {
      conversation: messages,
      assistant_reply_so_far: prefix,
      assistant: { name: "Jev", provider: "TypeSafe" },
    },
    questions: {
      next: {
        type: "choice",
        instructions: {
          task: "Select the next single ASCII character to append to `assistant_reply_so_far` as the assistant answers the last user message in `conversation`. Use previous messages for context. Continue the exact existing reply, including any unfinished word; do not restart it or repeat its prefix.",
          style:
            "Answer directly in concise English. You are Jev, an AI assistant by TypeSafe.",
          completion:
            "Select <EOS> when the existing reply is complete. Do not append filler or spaces after completion.",
          examples: [
            "Reply so far: Hel -> next character: l",
            "Reply so far: Hell -> next character: o",
            "User: Say hi. Reply so far: Hi -> <EOS>",
          ],
        },
        criteria,
      },
    },
  };
}
export function parseChoice(data: unknown): CharacterChoice {
  const answer = (
    data as {
      answers?: {
        next?: {
          type?: unknown;
          choice?: unknown;
          confidence?: unknown;
          probabilities?: Record<string, number>;
        };
      };
    }
  )?.answers?.next;
  if (
    answer?.type !== "choice" ||
    typeof answer.choice !== "string" ||
    !Object.hasOwn(criteria, answer.choice)
  )
    throw new Error("TypeSafe returned an invalid character choice.");
  return {
    choice: answer.choice,
    confidence: typeof answer.confidence === "number" ? answer.confidence : 0,
    alternatives: Object.entries(answer.probabilities ?? {})
      .filter(([char]) => Object.hasOwn(criteria, char))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 4)
      .map(([char, probability]) => ({
        char,
        probability: Number(probability),
      })),
  };
}
export async function* generateReply(
  key: string,
  messages: Message[],
  signal: AbortSignal,
  predict = nextCharacter,
): AsyncGenerator<
  | {
      type: "character";
      character: string;
      count: number;
      step: CharacterChoice;
    }
  | {
      type: "done";
      reason: "complete" | "repetition" | "limit";
      step?: CharacterChoice;
    }
> {
  let prefix = "";
  while (prefix.length < 280) {
    signal.throwIfAborted();
    const step = await predict(key, messages, prefix, signal);
    signal.throwIfAborted();
    if (step.choice === END) {
      yield { type: "done", reason: "complete", step };
      return;
    }
    prefix += step.choice;
    yield {
      type: "character",
      character: step.choice,
      count: prefix.length,
      step,
    };
    if (isRepetition(prefix)) {
      yield { type: "done", reason: "repetition" };
      return;
    }
  }
  yield { type: "done", reason: "limit" };
}
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
export async function nextCharacter(
  key: string,
  messages: Message[],
  prefix: string,
  signal: AbortSignal,
) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(question(messages, prefix)),
    });
    if ([429, 529].includes(response.status) && attempt < 2) {
      await response.body?.cancel();
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(new Error("Cancelled"));
        };
        const timer = setTimeout(
          () => {
            signal.removeEventListener("abort", abort);
            resolve();
          },
          1000 * 2 ** attempt,
        );
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      });
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        response.status === 401
          ? "The TypeSafe API key was rejected."
          : `TypeSafe returned ${response.status}. Please try again.`,
      );
    }
    const data = await response.json();
    return parseChoice(data);
  }
}

/** Guard a stalled decoder without treating natural repeated letters as completion. */
export function isRepetition(text: string): boolean {
  return (
    /([^\s])\1{5}$/.test(text) ||
    /[ \t]{4}$/.test(text) ||
    /\n{3}$/.test(text) ||
    /(.{2,12})\1{3}$/.test(text)
  );
}
