import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { parse } from "dotenv";
import { cases, type EvaluationCase } from "./editor-cases.ts";

const REPEATS = 3;
const NOUL_THRESHOLD = 0.5; // Fixed before inspecting any responses; not a calibrated production threshold.
const CONCURRENCY = 3;
const MODEL = "jev-latest";
const directory =
  process.argv[2] ||
  `experiments/results/editor-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(directory, { recursive: true });
if (!process.argv[2])
  await writeFile(
    `${directory}/manifest.json`,
    JSON.stringify(
      {
        model: MODEL,
        repeats: REPEATS,
        concurrency: CONCURRENCY,
        noulThreshold: NOUL_THRESHOLD,
        candidateSource:
          "Manually authored. Expected labels are never included in requests.",
        cases,
      },
      null,
      2,
    ),
  );
if (process.argv[2]) {
  const manifest = JSON.parse(
    await readFile(`${directory}/manifest.json`, "utf8"),
  );
  if (
    manifest.model !== MODEL ||
    manifest.repeats !== REPEATS ||
    manifest.noulThreshold !== NOUL_THRESHOLD ||
    JSON.stringify(manifest.cases) !== JSON.stringify(cases)
  )
    throw new Error("Resume configuration does not match the saved manifest.");
}
const env = parse(await readFile(".env", "utf8"));
const key =
  process.env.TYPESAFE_API_KEY ||
  process.env.JEV_API_KEY ||
  env.TYPESAFE_API_KEY ||
  env.JEV_API_KEY;
if (!key) throw new Error("Jev API key is not configured.");

function shuffle(items: number[], seed: number) {
  const result = [...items];
  let value = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function requestFor(c: EvaluationCase, order: number[]) {
  const candidates = Object.fromEntries(
    order.map((index, slot) => [`option_${slot}`, c.candidates[index]]),
  );
  const state = {
    instruction: c.instruction,
    context: c.context,
    ...(c.draft !== undefined ? { draft: c.draft } : {}),
    candidates,
  };
  const target =
    c.group === "repair"
      ? "Select the candidate that best corrects the draft according to instruction and context. Preserve meaning, facts, and protected text. Prefer the smallest necessary edit. Keep an already correct draft verbatim. Candidate labels have no meaning. Select NONE if no candidate is acceptable."
      : "Select the candidate that best answers instruction using context. Require factual accuracy, relevance, all requested information, and explicit output-format compliance. Fluent but irrelevant answers are not acceptable. Candidate labels have no meaning. Select NONE if no candidate is acceptable.";
  const questions: Record<string, unknown> = {
    select: {
      type: "choice",
      instructions: target,
      criteria: {
        ...candidates,
        NONE: "None of the candidates satisfies the request.",
      },
    },
  };
  for (const label of Object.keys(candidates)) {
    const description =
      c.group === "repair"
        ? `Evaluate candidates.${label} as a correction to draft according to instruction and context. Preserve meaning and use the smallest necessary correction. If draft is already correct, it must be kept verbatim.`
        : `Evaluate candidates.${label} as an answer to instruction using context. Check relevance, accuracy, completeness, and explicit format constraints; fluency alone is insufficient.`;
    questions[`score_${label}`] = {
      type: "score",
      instructions: description,
      criteria: [
        "Unacceptable: irrelevant, incorrect, unsupported, or violates a mandatory instruction.",
        "Partly useful, but contains a material omission or error, or makes an unnecessary change.",
        "Mostly suitable, but has a minor defect or avoidable departure from the requested output.",
        "Fully suitable: accurate, complete, relevant, and follows every instruction without unnecessary changes.",
      ],
    };
    if (c.group === "quality")
      questions[`accept_${label}`] = {
        type: "noul",
        instructions: `Does candidates.${label} fully satisfy instruction using context, with no factual errors, unsupported claims, required-information omissions, or explicit format violations?`,
      };
  }
  if (c.group === "repair")
    questions.draft_ready = {
      type: "noul",
      instructions:
        "Does draft already satisfy instruction and context without any edits? Respect intentional spelling, string literals, and exact-output requirements.",
    };
  return { model: MODEL, state, questions };
}
async function call(payload: ReturnType<typeof requestFor>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
      continue;
    }
    if (response.ok)
      return { data: await response.json(), attempts: attempt + 1 };
    await response.body?.cancel();
    if (![429, 500, 502, 503, 529].includes(response.status) || attempt === 2)
      throw new Error(`HTTP ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  throw new Error("Request did not complete.");
}
const prior = process.argv[2]
  ? (await readFile(`${directory}/responses.jsonl`, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  : [];
const completed = prior.filter((row) => !row.error);
const jobs = cases
  .flatMap((c, index) =>
    Array.from({ length: REPEATS }, (_, repeat) => ({
      c,
      repeat,
      order: shuffle(
        c.candidates.map((_, i) => i),
        7907 + index * 101 + repeat * 10007,
      ),
    })),
  )
  .filter(
    (job) =>
      !completed.some(
        (row) => row.caseId === job.c.id && row.repeat === job.repeat,
      ),
  );
const results: any[] = [...completed];
let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < jobs.length) {
      const { c, repeat, order } = jobs[cursor++];
      const request = requestFor(c, order);
      const started = performance.now();
      try {
        const { data, attempts } = await call(request);
        const selected = data.answers?.select?.choice;
        const expected =
          c.expected === "NONE"
            ? "NONE"
            : `option_${order.indexOf(c.expected)}`;
        if (
          data.answers?.select?.type !== "choice" ||
          (selected !== "NONE" &&
            !Object.hasOwn(request.state.candidates, selected))
        )
          throw new Error("Invalid Choice response");
        const scores = order
          .map((_, slot) => {
            const label = `option_${slot}`;
            const score = data.answers?.[`score_${label}`]?.score;
            if (!Number.isFinite(score))
              throw new Error("Invalid Score response");
            return { label, score };
          })
          .sort((a, b) => b.score - a.score);
        const top = scores
          .filter((x) => Math.abs(x.score - scores[0].score) < 1e-9)
          .map((x) => x.label);
        const accepts =
          c.group === "quality"
            ? order.map((index, slot) => {
                const label = `option_${slot}`;
                const probability = data.answers?.[`accept_${label}`]?.noul;
                if (!Number.isFinite(probability))
                  throw new Error("Invalid Noul response");
                return {
                  label,
                  originalIndex: index,
                  probability,
                  expected: index === c.expected,
                  predicted: probability >= NOUL_THRESHOLD,
                };
              })
            : [];
        const ready =
          c.group === "repair" ? data.answers?.draft_ready?.noul : null;
        if (c.group === "repair" && !Number.isFinite(ready))
          throw new Error("Invalid draft readiness response");
        const row = {
          caseId: c.id,
          group: c.group,
          category: c.category,
          repeat,
          order,
          expected,
          selected,
          choiceCorrect: selected === expected,
          scoreTop: top,
          scoreCorrect:
            c.expected === "NONE"
              ? null
              : top.length === 1 && top[0] === expected,
          accepts,
          draftReady: ready,
          draftReadyCorrect:
            c.group === "repair"
              ? ready >= NOUL_THRESHOLD === c.draftAcceptable
              : null,
          elapsedMs: Math.round(performance.now() - started),
          attempts,
          request,
          response: data,
        };
        results.push(row);
        await appendFile(
          `${directory}/responses.jsonl`,
          JSON.stringify(row) + "\n",
        );
        console.log(
          `${c.id} run ${repeat + 1}: choice=${row.choiceCorrect ? "PASS" : "FAIL"} score=${row.scoreCorrect === null ? "n/a" : row.scoreCorrect ? "PASS" : "FAIL"} ${row.elapsedMs}ms`,
        );
      } catch (error) {
        const row = {
          caseId: c.id,
          group: c.group,
          repeat,
          order,
          error: (error as Error).message,
          request,
        };
        results.push(row);
        await appendFile(
          `${directory}/responses.jsonl`,
          JSON.stringify(row) + "\n",
        );
        console.log(`${c.id} run ${repeat + 1}: ERROR ${row.error}`);
      }
    }
  }),
);
function rate(values: boolean[]) {
  return { correct: values.filter(Boolean).length, total: values.length };
}
function groupSummary(group: string) {
  const rows = results.filter((r) => r.group === group && !r.error);
  const candidates = rows.flatMap((r) => r.accepts);
  return {
    requests: rows.length,
    choice: rate(rows.map((r) => r.choiceCorrect)),
    scoreUniqueTop: rate(
      rows.filter((r) => r.scoreCorrect !== null).map((r) => r.scoreCorrect),
    ),
    draftReady: rate(
      rows
        .filter((r) => r.draftReadyCorrect !== null)
        .map((r) => r.draftReadyCorrect),
    ),
    candidateAcceptance: rate(
      candidates.map((a) => a.expected === a.predicted),
    ),
    falseAccepts: candidates.filter((a) => !a.expected && a.predicted).length,
    falseRejects: candidates.filter((a) => a.expected && !a.predicted).length,
  };
}
const successful = results.filter((r) => !r.error);
const latencies = successful.map((r) => r.elapsedMs).sort((a, b) => a - b);
const summary = {
  directory,
  model: MODEL,
  returnedModels: [...new Set(successful.map((r) => r.response.model))],
  requests: results.length,
  errors: results.filter((r) => r.error).length,
  repair: groupSummary("repair"),
  quality: groupSummary("quality"),
  repairOnly: rate(
    successful
      .filter(
        (r) =>
          r.group === "repair" &&
          cases.find((c) => c.id === r.caseId)?.draftAcceptable === false,
      )
      .map((r) => r.choiceCorrect),
  ),
  preserveControls: rate(
    successful
      .filter(
        (r) =>
          r.group === "repair" &&
          cases.find((c) => c.id === r.caseId)?.draftAcceptable === true,
      )
      .map((r) => r.choiceCorrect),
  ),
  latencyMs: {
    median: latencies[Math.floor(latencies.length / 2)],
    max: latencies.at(-1),
  },
  usage: successful.reduce(
    (sum, r) => ({
      input_tokens: sum.input_tokens + (r.response.usage?.input_tokens || 0),
      output_tokens: sum.output_tokens + (r.response.usage?.output_tokens || 0),
    }),
    { input_tokens: 0, output_tokens: 0 },
  ),
  perCase: cases.map((c) => ({
    id: c.id,
    category: c.category,
    choice: rate(
      successful.filter((r) => r.caseId === c.id).map((r) => r.choiceCorrect),
    ),
    score: rate(
      successful
        .filter((r) => r.caseId === c.id && r.scoreCorrect !== null)
        .map((r) => r.scoreCorrect),
    ),
  })),
};
await writeFile(
  `${directory}/summary.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
