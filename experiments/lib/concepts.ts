import js from "jsrealb";
import { readFile } from "node:fs/promises";
import { researchCall } from "../research-api.ts";
js.loadEn();
export async function retrieveConcepts(
  userQuestion: string,
  onTrace: (trace: unknown) => Promise<void>,
) {
  const lex = js.getLexicon("en");
  const frequent = (
    await readFile(".cache/research/google-10000-english.txt", "utf8")
  )
    .trim()
    .split(/\r?\n/);
  const vocabularies = {
    N: frequent.filter((w) => lex[w]?.N),
    V: Object.keys(lex).filter((w) => lex[w].V && /^[a-z]+$/.test(w)),
    A: frequent.filter((w) => lex[w]?.A),
  };
  const roles = {
    N: "A specific entity, material, resource, property or practical focus that belongs in the CONTENT of a useful answer.",
    V: "An action or process that belongs in the CONTENT of a useful answer.",
    A: "A descriptive property that makes the answer accurate or the recommended action practical.",
  };
  const output: Record<
    string,
    { words: string[]; ranked: { word: string; probability: number }[] }
  > = {};
  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  for (const pos of ["N", "V", "A"] as const) {
    const state = { user_question: userQuestion, semantic_role: roles[pos] };
    const words = vocabularies[pos],
      groups: string[][] = [];
    for (let i = 0; i < words.length; i += 112)
      groups.push(words.slice(i, i + 112));
    const winners = new Set<string>();
    async function call(stage: string, questions: Record<string, unknown>) {
      const request = { model: "jev-latest", state, questions };
      const { data } = await researchCall(request);
      requests++;
      usage.input_tokens += data.usage?.input_tokens || 0;
      usage.output_tokens += data.usage?.output_tokens || 0;
      await onTrace({ pos, stage, request, response: data });
      return data;
    }
    for (let start = 0; start < groups.length; start += 24) {
      const chunk = groups.slice(start, start + 24);
      const questions = Object.fromEntries(
        chunk.map((items, i) => [
          `g${i}`,
          {
            type: "choice",
            instructions:
              "Choose the best word in this set for semantic_role when answering user_question. Choose answer content, not a word merely describing the act of answering, advising, explaining, or asking. Use your knowledge; do not just repeat the question.",
            criteria: Object.fromEntries(items.map((w) => [w, null])),
          },
        ]),
      );
      const data = await call(`leaves_${start}`, questions);
      chunk.forEach((items, i) => {
        const scores = Object.entries(
          data.answers[`g${i}`].probabilities as Record<string, number>,
        )
          .filter(([w]) => items.includes(w))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);
        for (const [word] of scores) winners.add(word);
      });
    }
    if (winners.size > 255) throw new Error("Concept finalist limit exceeded");
    const final = await call("final", {
      concept: {
        type: "choice",
        instructions:
          "Choose the best substantive concept for semantic_role in a useful and accurate answer to user_question. Do not choose generic metawords like advice or explanation merely because the user asks for them.",
        criteria: Object.fromEntries([...winners].map((w) => [w, null])),
      },
    });
    output[pos] = {
      words: [...winners],
      ranked: Object.entries(
        final.answers.concept.probabilities as Record<string, number>,
      )
        .filter(([w]) => winners.has(w))
        .sort((a, b) => b[1] - a[1])
        .map(([word, probability]) => ({ word, probability })),
    };
  }
  return { concepts: output, requests, usage };
}
