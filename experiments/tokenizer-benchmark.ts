import { mkdir, writeFile } from "node:fs/promises";
import {
  loadTokenizer,
  tokenizerModels,
  encodeText,
  decodeTokens,
  type TokenizerName,
} from "../server/tokenizer.ts";

const samples = [
  "Hello!",
  "I'm Jev, an AI assistant by TypeSafe.",
  "The capital of France is Paris.",
  "What would you like to work on today?",
  "Water evaporates, cools into clouds, and falls as rain.",
  "Could you clarify what you mean?",
  "A tokenizer splits text into reusable pieces called tokens.",
  "The answer is 42.",
  "Keep the full conversation and the reply so far in state.",
  "I am not sure. Let me explain what I do know.",
];
const edgeCases = [
  " Hello  world!\n\nNext line.\tEnd.",
  "const x = 1;\n  return x + 2;",
  "你好，世界！",
  "🙂 café",
];
const rows = [];
for (const name of Object.keys(tokenizerModels) as TokenizerName[]) {
  const tokenizer = await loadTokenizer(name);
  const results = samples.map((text) => {
    const ids = encodeText(tokenizer, text);
    return {
      text,
      tokenCount: ids.length,
      roundTrip: decodeTokens(tokenizer, ids) === text,
    };
  });
  const vocabulary = tokenizer.get_vocab();
  const row = {
    name,
    ...tokenizerModels[name],
    vocabulary: vocabulary.size,
    englishCharacters: samples.join("").length,
    englishTokens: results.reduce((sum, item) => sum + item.tokenCount, 0),
    englishRoundTrips: results.filter((item) => item.roundTrip).length,
    example: {
      text: samples[1],
      ids: encodeText(tokenizer, samples[1]),
      tokens: tokenizer.tokenize(samples[1], { add_special_tokens: false }),
    },
    edgeCases: edgeCases.map((text) => {
      const decoded = decodeTokens(tokenizer, encodeText(tokenizer, text));
      return { text, decoded, exact: text === decoded };
    }),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
await mkdir("experiments/results", { recursive: true });
await writeFile(
  "experiments/results/tokenizers.json",
  JSON.stringify(
    { measuredAt: new Date().toISOString(), samples, results: rows },
    null,
    2,
  ) + "\n",
);
