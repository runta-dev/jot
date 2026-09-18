import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
import { realizeFrame, perspectiveVariants } from "./lib/grammar.ts";
const source = "experiments/results/open-composition-2026-09-18T03-37-25-746Z";
const previous = JSON.parse(
  await readFile(`${source}/summary.json`, "utf8"),
).rows;
const traces = (await readFile(`${source}/traces.jsonl`, "utf8"))
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const dir =
  process.argv[2] ||
  `experiments/results/role-binding-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
if (!process.argv[2])
  await writeFile(
    `${dir}/manifest.json`,
    JSON.stringify(
      {
        protocol: "research/R9-role-binding-protocol.md",
        source,
        cases: previous.map((r: any) => ({
          id: r.id,
          question: r.request,
          baseline: r.result,
        })),
      },
      null,
      2,
    ),
  );
const archived = process.argv[2]
  ? (await readFile(`${dir}/results.jsonl`, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  : [];
const archivedTraces = process.argv[2]
  ? (await readFile(`${dir}/traces.jsonl`, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  : [];
const rows: any[] = [];
for (const r of previous) {
  const started = performance.now(),
    core = traces.find((t: any) => t.caseId === r.id && t.stage === "core");
  const phrases = [
    ...new Set(
      Object.values(core.request.questions.subject.criteria).flatMap((p: any) =>
        perspectiveVariants(p),
      ),
    ),
  ];
  const verbs = Object.keys(core.request.questions.verb.criteria);
  const candidates = new Map<string, { slots: any; mods: any[] }>([
    [r.result, { slots: r.slots, mods: r.modifiers }],
  ]);
  let rejected = 0;
  function add(slots: any, mods: any[]) {
    try {
      const text = realizeFrame(slots, mods);
      if (!candidates.has(text)) candidates.set(text, { slots, mods });
    } catch {
      rejected++;
    }
  }
  const modSets = [r.modifiers, []];
  for (const mods of modSets) {
    add(r.slots, mods);
    for (const subject of phrases)
      for (const subjectDet of ["NONE", "a", "the"])
        add({ ...r.slots, subject, subjectDet }, mods);
    for (const verb of verbs) add({ ...r.slots, verb }, mods);
    for (const object of [null, ...phrases])
      for (const objectDet of ["NONE", "a", "the"])
        add({ ...r.slots, object, objectDet }, mods);
  }
  const jointVerbs = [
    ...new Set([
      "be",
      "have",
      ...r.retrieval.top.V.slice(0, 6).map((v: any) => v.word),
    ]),
  ];
  for (const verb of jointVerbs)
    for (const object of [null, ...phrases])
      for (const objectDet of ["NONE", "a", "the"])
        add({ ...r.slots, verb, object, objectDet }, []);
  for (let index = 0; index < r.modifiers.length; index++)
    for (const det of ["a", "the"]) {
      const mods = r.modifiers.map((m: any, i: number) =>
        i === index ? { ...m, text: `${det} ${m.text}` } : m,
      );
      add(r.slots, mods);
    }
  const texts = [...candidates.keys()];
  if (texts.length > 8000) throw new Error("Candidate budget exceeded");
  const old = archived.find((x: any) => x.id === r.id);
  if (old) {
    const oldTexts = new Set<string>(
      archivedTraces
        .filter((t: any) => t.id === r.id && t.stage.startsWith("groups_"))
        .flatMap((t: any) =>
          Object.values(t.request.questions).flatMap((q: any) =>
            Object.values(q.criteria),
          ),
        ) as string[],
    );
    if (oldTexts.size !== texts.length || texts.some((t) => !oldTexts.has(t)))
      throw new Error("Resume candidate mismatch for " + r.id);
    rows.push({ ...old, reusedVerifiedCandidates: true });
    console.log("Reused unchanged candidates: " + r.id);
    continue;
  }

  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  const finalists = new Set<string>([r.result]);
  let selected = "",
    error: string | undefined;
  async function call(stage: string, questions: unknown) {
    const request = {
      model: "jev-latest",
      state: { user_question: r.request, current_reply: r.result },
      questions,
    };
    const { data } = await researchCall(request);
    requests++;
    usage.input_tokens += data.usage?.input_tokens || 0;
    usage.output_tokens += data.usage?.output_tokens || 0;
    await appendFile(
      `${dir}/traces.jsonl`,
      JSON.stringify({ id: r.id, stage, request, response: data }) + "\n",
    );
    return data;
  }
  try {
    const groups: string[][] = [];
    for (let i = 0; i < texts.length; i += 199)
      groups.push([...new Set([r.result, ...texts.slice(i, i + 199)])]);
    for (let i = 0; i < groups.length; i += 8) {
      const chunk = groups.slice(i, i + 8);
      const questions = Object.fromEntries(
        chunk.map((values, j) => [
          `g${j}`,
          {
            type: "choice",
            instructions:
              "Select the most useful, accurate, grammatical answer to user_question from this set. Check the actual actor and action literally; do not repair a wrong statement in your head. For how-to questions require a concrete means, not a restatement of the goal. Preserve user/assistant perspective. Prefer current_reply if no alternative improves it.",
            criteria: Object.fromEntries(
              values.map((text, k) => [`c${k}`, text]),
            ),
          },
        ]),
      );
      const data = await call(`groups_${i}`, questions);
      chunk.forEach((values, j) => {
        const ranked = Object.entries(
          data.answers[`g${j}`].probabilities as Record<string, number>,
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);
        for (const [key] of ranked) {
          const text = values[Number(key.slice(1))];
          if (text) finalists.add(text);
        }
      });
    }
    const final = [...finalists];
    if (final.length > 254) throw new Error("Finalist cap exceeded");
    const data = await call("final", {
      best: {
        type: "choice",
        instructions:
          "Select a genuinely useful, factually correct, grammatical answer to user_question. Do not silently reinterpret the subject or missing words. For how-to questions require an actionable method, not just the requested outcome. Select NONE if all candidates fail these requirements.",
        criteria: {
          ...Object.fromEntries(final.map((text, k) => [`c${k}`, text])),
          NONE: "No candidate is an acceptable answer.",
        },
      },
    });
    const key = data.answers.best.choice;
    selected = key === "NONE" ? "" : final[Number(key.slice(1))];
    if (selected === undefined) throw new Error("Invalid final selection");
  } catch (e) {
    error = (e as Error).message;
  }
  const row = {
    id: r.id,
    question: r.request,
    baseline: r.result,
    result: selected,
    abstained: !selected && !error,
    error,
    candidateCount: texts.length,
    rejectedRealizations: rejected,
    finalists: [...finalists],
    requests,
    usage,
    cachedBaselineUsage: r.usage,
    elapsedMs: Math.round(performance.now() - started),
  };
  rows.push(row);
  await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(
    JSON.stringify({
      id: row.id,
      baseline: row.baseline,
      result: selected,
      error,
      count: texts.length,
      requests,
      usage,
    }),
  );
}
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
