import js from "jsrealb";
import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
js.loadEn();
const lex = js.getLexicon("en");
const frequent = (
  await readFile(".cache/research/google-10000-english.txt", "utf8")
)
  .trim()
  .split(/\r?\n/);
const vocabulary = {
  N: [...new Set(frequent.filter((w) => lex[w]?.N))],
  V: Object.keys(lex).filter((w) => lex[w].V && /^[a-z]+$/.test(w)),
};
const cases = [
  {
    id: "sky",
    question: "Why is the sky blue?",
    nounRole:
      "Select a substance, entity or process essential to explaining this phenomenon.",
    verbRole:
      "Select the physical action/process essential to explaining the phenomenon.",
    N: ["light", "sunlight", "air", "atmosphere", "molecule", "scattering"],
    V: ["scatter"],
  },
  {
    id: "procrastination",
    question: "How can I stop procrastinating?",
    nounRole:
      "Select a concrete focus for practical advice addressing the problem.",
    verbRole: "Select a useful action to recommend as a first step.",
    N: ["task", "step", "goal", "work", "plan", "time"],
    V: ["start", "begin", "plan", "focus", "schedule", "divide", "break"],
  },
  {
    id: "tired",
    question: "I feel tired after sleeping only four hours. What should I do?",
    nounRole: "Select the central need to address.",
    verbRole: "Select the most directly useful action to recommend.",
    N: ["sleep", "rest"],
    V: ["sleep", "rest"],
  },
  {
    id: "plant",
    question: "Why do plants need sunlight?",
    nounRole: "Select a resource or process central to the explanation.",
    verbRole:
      "Select a process enabled by sunlight that helps explain the need.",
    N: ["energy", "food", "photosynthesis"],
    V: ["photosynthesize", "grow", "produce"],
  },
  {
    id: "rust",
    question: "Why does iron rust when exposed to moist air?",
    nounRole: "Select a substance or process central to the explanation.",
    verbRole: "Select the chemical process involved.",
    N: ["oxygen", "oxidation", "water", "corrosion"],
    V: ["oxidize", "corrode", "rust"],
  },
  {
    id: "ice",
    question: "Why does ice float on liquid water?",
    nounRole: "Select the physical property that explains the difference.",
    verbRole:
      "Select what happens to water as it freezes that helps explain floating.",
    N: ["density", "buoyancy"],
    V: ["expand"],
  },
];
const dir = `experiments/results/lexical-tournament-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R7.1-lexical-tournament-protocol.md",
      cases,
      vocabulary,
    },
    null,
    2,
  ),
);
const jobs = cases.flatMap((c) =>
  (["N", "V"] as const).flatMap((pos) =>
    [0, 1].map((repeat) => ({ c, pos, repeat })),
  ),
);
let cursor = 0;
const rows: any[] = [];
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < jobs.length) {
      const { c, pos, repeat } = jobs[cursor++];
      const started = performance.now();
      const words =
        repeat === 0 ? vocabulary[pos] : [...vocabulary[pos]].reverse();
      const groups: Record<string, string[]> = {};
      for (let i = 0; i < words.length; i += 112)
        groups[`g${i / 112}`] = words.slice(i, i + 112);
      const state = {
        user_question: c.question,
        semantic_role: pos === "N" ? c.nounRole : c.verbRole,
      };
      const usage = { input_tokens: 0, output_tokens: 0 };
      let selected = "",
        shortlist: string[] = [],
        error: string | undefined,
        requests = 0;
      async function run(stage: string, questions: unknown) {
        const request = { model: "jev-latest", state, questions };
        const { data } = await researchCall(request);
        requests++;
        usage.input_tokens += data.usage?.input_tokens || 0;
        usage.output_tokens += data.usage?.output_tokens || 0;
        await appendFile(
          `${dir}/traces.jsonl`,
          JSON.stringify({
            id: c.id,
            pos,
            repeat,
            stage,
            request,
            response: data,
          }) + "\n",
        );
        return data;
      }
      try {
        const groupList = Object.entries(groups);
        const winners = new Set<string>();
        for (let start = 0; start < groupList.length; start += 24) {
          const chunk = groupList.slice(start, start + 24);
          const questions = Object.fromEntries(
            chunk.map(([id, list]) => [
              id,
              {
                type: "choice",
                instructions:
                  "Select the best word in this candidate set for semantic_role in an accurate and useful answer to user_question. Use the meaning and your knowledge, not merely lexical overlap with the question.",
                criteria: Object.fromEntries(list.map((w) => [w, null])),
              },
            ]),
          );
          const data = await run(`leaves_${start}`, questions);
          for (const [id, list] of chunk) {
            const ranked = Object.entries(
              data.answers[id].probabilities as Record<string, number>,
            )
              .filter(([word]) => list.includes(word))
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2);
            for (const [word] of ranked) winners.add(word);
          }
        }
        shortlist = [...winners];
        if (shortlist.length > 255) throw new Error("Too many finalists");
        const second = await run("word", {
          word: {
            type: "choice",
            instructions:
              "Select the single best word for semantic_role in an accurate, useful answer to user_question. Use your knowledge of the topic. Do not merely repeat a word from the question.",
            criteria: Object.fromEntries(shortlist.map((word) => [word, null])),
          },
        });
        selected = second.answers.word.choice;
        if (!shortlist.includes(selected))
          throw new Error("Invalid selected word");
      } catch (e) {
        error = (e as Error).message;
      }
      const acceptable = c[pos];
      const row = {
        id: c.id,
        pos,
        repeat,
        selected,
        error,
        exactIllustrativeMatch: acceptable.includes(selected),
        fullVocabularyCovered: acceptable.filter((w) => words.includes(w)),
        shortlistCovered: acceptable.filter((w) => shortlist.includes(w)),
        requests,
        usage,
        elapsedMs: Math.round(performance.now() - started),
      };
      rows.push(row);
      await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
      console.log(JSON.stringify(row));
    }
  }),
);
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
