import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { repairDraft } from "./lib/editor.ts";
const word = JSON.parse(
  await readFile(
    "experiments/results/hierarchy-2026-09-18T02-25-45-343Z/summary.json",
    "utf8",
  ),
).rows;
const chars = JSON.parse(
  await readFile(
    "experiments/results/words-2026-09-18T02-23-46-459Z/summary.json",
    "utf8",
  ),
).rows.filter((x: any) => x.mode === "char");
const allCases = [...word, ...chars].map((x: any) => ({
  id: `${x.mode}_${x.id}`,
  taskId: x.id,
  mode: x.mode,
  prompt: x.prompt,
  draft: x.reply,
}));
const selectedIds = process.argv.slice(2);
const cases = selectedIds.length
  ? allCases.filter((c: any) => selectedIds.includes(c.id))
  : allCases;
const dir = `experiments/results/reply-repair-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R4-generated-reply-repair-protocol.md",
      cases,
      maxIterations: 3,
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
      const c = cases[cursor++],
        start = performance.now();
      let draft = c.draft,
        reason = draft ? "iteration_limit" : "empty_draft";
      const revisions = [draft],
        usage = { input_tokens: 0, output_tokens: 0 };
      let requests = 0;
      if (draft)
        for (let iteration = 0; iteration < 3; iteration++) {
          const result = await repairDraft(
            {
              id: c.id,
              draft,
              instruction:
                "Make the smallest edit that improves this assistant reply so it correctly and grammatically answers the user request. Preserve correct facts. Do not invent information. If it is already a correct, sufficient reply, leave it unchanged.",
              context: `User request: ${c.prompt}\nAssistant identity: Jev, an AI assistant by TypeSafe.`,
            },
            async (trace) => {
              await appendFile(
                `${dir}/traces.jsonl`,
                JSON.stringify({ caseId: c.id, iteration, trace }) + "\n",
              );
            },
          );
          requests += result.requests;
          usage.input_tokens += result.usage.input_tokens;
          usage.output_tokens += result.usage.output_tokens;
          if (result.error) {
            reason = `error: ${result.error}`;
            break;
          }
          if (result.selected === draft) {
            reason = "unchanged";
            break;
          }
          if (revisions.includes(result.selected)) {
            reason = "cycle";
            break;
          }
          draft = result.selected;
          revisions.push(draft);
        }
      const row = {
        ...c,
        result: draft,
        reason,
        revisions,
        requests,
        usage,
        elapsedMs: Math.round(performance.now() - start),
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
