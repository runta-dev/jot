import {
  readFile,
  mkdir,
  writeFile,
  appendFile,
  copyFile,
} from "node:fs/promises";
import { verbSenses } from "./lib/wordnet.ts";
import { researchCall } from "./research-api.ts";
const source = "experiments/results/verb-senses-2026-09-18T05-18-52-825Z";
const original = JSON.parse(
  await readFile(`${source}/summary.json`, "utf8"),
).rows;
const cases = original.filter(
  (r: any) =>
    r.mode === "definitions" || (r.id === "vocabulary" && r.mode === "bare"),
);
const traces = (await readFile(`${source}/traces.jsonl`, "utf8"))
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const templates = JSON.parse(
  await readFile("research/resources/verb-frames.json", "utf8"),
).frames;
const wn = await verbSenses();
const dir = `experiments/results/rich-senses-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await copyFile("node_modules/wordnet-db/LICENSE", `${dir}/WORDNET-LICENSE.txt`);
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R11.1-rich-sense-protocol.md",
      source,
      cases: cases.map((r: any) => ({
        id: r.id,
        repeat: r.repeat,
        mode: r.mode,
        lemma: r.selected,
      })),
    },
    null,
    2,
  ),
);
const rows: any[] = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < cases.length) {
      const c = cases[cursor++];
      const baseline = traces.find(
        (t: any) =>
          t.id === c.id &&
          t.repeat === c.repeat &&
          t.mode === c.mode &&
          t.stage === "sense",
      );
      if (!baseline) continue;
      const senses = wn.get(c.selected)?.slice(0, 3) || [];
      const request = {
        ...baseline.request,
        questions: {
          sense: {
            ...baseline.request.questions.sense,
            criteria: {
              ...Object.fromEntries(
                senses.map((s, i) => [
                  `s${i}`,
                  JSON.stringify({
                    meaning: s.definition,
                    synonyms: s.lemmas,
                    example: s.examples[0] || null,
                    patterns: s.frames
                      .map((f) => templates[f]?.replace("%s", c.selected))
                      .filter(Boolean),
                  }),
                ]),
              ),
              NONE: "No supplied sense fits this use.",
            },
          },
        },
      };
      try {
        const { data } = await researchCall(request);
        const chosen = data.answers.sense.choice;
        const sense =
          chosen === "NONE" ? null : senses[Number(chosen.slice(1))];
        if (chosen !== "NONE" && !sense) throw new Error("Invalid sense");
        const row = {
          id: c.id,
          repeat: c.repeat,
          mode: c.mode,
          lemma: c.selected,
          baseline: c.sense,
          selected: sense,
          changed: (c.sense?.offset ?? null) !== (sense?.offset ?? null),
          request,
          response: data,
        };
        rows.push(row);
        await appendFile(`${dir}/traces.jsonl`, JSON.stringify(row) + "\n");
        console.log(
          JSON.stringify({
            id: c.id,
            repeat: c.repeat,
            lemma: c.selected,
            baseline: c.sense?.lemmas ?? null,
            selected: sense?.lemmas ?? null,
          }),
        );
      } catch (e) {
        rows.push({ id: c.id, repeat: c.repeat, error: (e as Error).message });
      }
    }
  }),
);
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
