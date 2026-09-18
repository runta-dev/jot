import js from "jsrealb";
import { readFile } from "node:fs/promises";
import { researchCall } from "../research-api.ts";
js.loadEn();
let cached: any;
export async function selectLexeme(
  pos: "N" | "V" | "A",
  state: unknown,
  instructions: string,
  trace: (t: unknown) => Promise<void>,
  allowNone = false,
) {
  if (!cached) {
    const lex = js.getLexicon("en");
    const frequent = (
      await readFile(".cache/research/google-10000-english.txt", "utf8")
    )
      .trim()
      .split(/\r?\n/);
    cached = {
      N: frequent.filter((w) => lex[w]?.N),
      A: frequent.filter((w) => lex[w]?.A),
      V: Object.keys(lex).filter((w) => lex[w].V && /^[a-z]+$/.test(w)),
    };
  }
  const words: string[] = cached[pos],
    groups: string[][] = [];
  for (let i = 0; i < words.length; i += 112)
    groups.push(words.slice(i, i + 112));
  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  const finalists = new Set<string>();
  async function call(stage: string, questions: unknown) {
    const request = { model: "jev-latest", state, questions };
    const { data } = await researchCall(request);
    requests++;
    usage.input_tokens += data.usage?.input_tokens || 0;
    usage.output_tokens += data.usage?.output_tokens || 0;
    await trace({ stage, pos, request, response: data });
    return data;
  }
  for (let start = 0; start < groups.length; start += 24) {
    const chunk = groups.slice(start, start + 24);
    const questions = Object.fromEntries(
      chunk.map((items, i) => [
        `g${i}`,
        {
          type: "choice",
          instructions,
          criteria: Object.fromEntries(items.map((w) => [w, null])),
        },
      ]),
    );
    const data = await call(`groups_${start}`, questions);
    chunk.forEach((items, i) => {
      for (const [w] of Object.entries(
        data.answers[`g${i}`].probabilities as Record<string, number>,
      )
        .filter(([w]) => items.includes(w))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2))
        finalists.add(w);
    });
  }
  const data = await call("final", {
    word: {
      type: "choice",
      instructions,
      criteria: {
        ...Object.fromEntries([...finalists].map((w) => [w, null])),
        ...(allowNone ? { NONE: "No word is needed for this slot." } : {}),
      },
    },
  });
  const selected = data.answers.word.choice;
  if (selected !== "NONE" && !finalists.has(selected))
    throw new Error("Invalid lexical choice");
  return {
    selected,
    requests,
    usage,
    ranked: Object.entries(
      data.answers.word.probabilities as Record<string, number>,
    ).sort((a, b) => b[1] - a[1]),
  };
}
