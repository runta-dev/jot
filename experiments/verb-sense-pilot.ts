import {
  readFile,
  mkdir,
  writeFile,
  appendFile,
  copyFile,
} from "node:fs/promises";
import { verbSenses } from "./lib/wordnet.ts";
import { selectLexeme } from "./lib/lexical-selector.ts";
import { researchCall } from "./research-api.ts";
const wn = await verbSenses();
const old = "experiments/results/conditioned-action-2026-09-18T05-09-37-630Z";
const oldRows = JSON.parse(await readFile(`${old}/summary.json`, "utf8")).rows;
const oldTraces = (await readFile(`${old}/traces.jsonl`, "utf8"))
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const cases = oldRows.map((r: any) => {
  const t = oldTraces.find(
    (x: any) =>
      x.id === r.id && x.trace.pos === "V" && x.trace.stage === "final",
  ).trace;
  return {
    id: r.id,
    question: r.question,
    split: "development",
    candidates: Object.keys(t.request.questions.word.criteria),
    instructions: t.request.questions.word.instructions,
  };
});
const fresh = [
  { id: "meeting", question: "How can I prepare for a meeting?" },
  { id: "files", question: "How do I keep my files easy to find?" },
  { id: "scrolling", question: "How can I spend less time scrolling online?" },
  {
    id: "homework",
    question: "How can I make progress on a difficult homework problem?",
  },
];
const dir = `experiments/results/verb-senses-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await copyFile("node_modules/wordnet-db/LICENSE", `${dir}/WORDNET-LICENSE.txt`);
const instructions = cases[0].instructions;
for (const c of fresh) {
  const r = await selectLexeme(
    "V",
    { user_request: c.question },
    instructions,
    async (trace) => {
      await appendFile(
        `${dir}/candidate-preparation.jsonl`,
        JSON.stringify({ id: c.id, trace }) + "\n",
      );
    },
  );
  cases.push({
    ...c,
    split: "fresh",
    candidates: r.ranked.map(([word]) => word),
    instructions,
  });
}
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R11-verb-senses-protocol.md",
      wordnet: "3.1 via wordnet-db 3.1.14",
      maxSenses: 3,
      cases,
    },
    null,
    2,
  ),
);
const jobs = cases.flatMap((c: any) =>
  [0, 1].flatMap((repeat) =>
    ["bare", "definitions"].map((mode) => ({ c, repeat, mode })),
  ),
);
let cursor = 0;
const rows: any[] = [];
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < jobs.length) {
      const { c, repeat, mode } = jobs[cursor++];
      const order = repeat === 0 ? c.candidates : [...c.candidates].reverse();
      const criteria = Object.fromEntries(
        order.map((word: string) => [
          word,
          mode === "bare"
            ? null
            : wn
                .get(word)
                ?.slice(0, 3)
                .map((s, i) => `${i + 1}. ${s.definition}`)
                .join(" | ") || "No definition available; use the verb lemma.",
        ]),
      );
      const request = {
        model: "jev-latest",
        state: { user_request: c.question },
        questions: {
          word: { type: "choice", instructions: c.instructions, criteria },
        },
      };
      let error: string | undefined,
        selected = "",
        sense: any = null,
        usage = { input_tokens: 0, output_tokens: 0 };
      const start = performance.now();
      try {
        const first = await researchCall(request);
        usage.input_tokens += first.data.usage.input_tokens;
        usage.output_tokens += first.data.usage.output_tokens;
        selected = first.data.answers.word.choice;
        if (!c.candidates.includes(selected)) throw new Error("Invalid lemma");
        await appendFile(
          `${dir}/traces.jsonl`,
          JSON.stringify({
            id: c.id,
            repeat,
            mode,
            stage: "lemma",
            request,
            response: first.data,
          }) + "\n",
        );
        const senses = wn.get(selected)?.slice(0, 3) || [];
        if (senses.length) {
          const follow = {
            model: "jev-latest",
            state: { user_request: c.question, chosen_action: selected },
            questions: {
              sense: {
                type: "choice",
                instructions:
                  "Which listed ordinary verb sense fits an implementable first step for this request? Select NONE if none fits; do not reinterpret a noun as a verb or silently invent a different verb sense.",
                criteria: {
                  ...Object.fromEntries(
                    senses.map((s, i) => [`s${i}`, s.definition]),
                  ),
                  NONE: "No supplied sense fits this use.",
                },
              },
            },
          };
          const second = await researchCall(follow);
          usage.input_tokens += second.data.usage.input_tokens;
          usage.output_tokens += second.data.usage.output_tokens;
          const key = second.data.answers.sense.choice;
          sense = key === "NONE" ? null : senses[Number(key.slice(1))];
          if (key !== "NONE" && !sense) throw new Error("Invalid sense");
          await appendFile(
            `${dir}/traces.jsonl`,
            JSON.stringify({
              id: c.id,
              repeat,
              mode,
              stage: "sense",
              request: follow,
              response: second.data,
            }) + "\n",
          );
        }
      } catch (e) {
        error = (e as Error).message;
      }
      const row = {
        id: c.id,
        split: c.split,
        question: c.question,
        repeat,
        mode,
        selected,
        sense,
        definitions: wn.get(selected)?.slice(0, 3) || [],
        error,
        usage,
        elapsedMs: Math.round(performance.now() - start),
      };
      rows.push(row);
      await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
      console.log(
        JSON.stringify({
          id: c.id,
          repeat,
          mode,
          selected,
          sense: sense?.definition ?? null,
          error,
        }),
      );
    }
  }),
);
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
