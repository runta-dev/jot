import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
const original = JSON.parse(
  await readFile(
    "experiments/results/open-composition-2026-09-18T03-37-25-746Z/summary.json",
    "utf8",
  ),
).rows;
const expected: Record<string, boolean | null> = {
  sky: null,
  procrastination: false,
  tired: true,
  plant: null,
  rust: true,
  ice: false,
  deadlines: false,
  fall: true,
  reading: false,
  drying: false,
};
const cases = original.map((r: any) => ({
  id: r.id,
  question: r.request,
  answer: r.result,
  expected: expected[r.id],
  origin: "R8 output",
}));
const controls: Record<string, string> = {
  procrastination: "Start with one small task and work on it for five minutes.",
  deadlines: "Use a calendar to record each deadline and set reminders.",
  reading: "Summarize what you read in your own words.",
  drying: "Water in wet clothing evaporates into the air.",
  ice: "Ice is less dense than liquid water, so it floats.",
  sky: "Air molecules scatter blue light more strongly than red light.",
  plant: "Plants use sunlight to convert carbon dioxide and water into sugars.",
};
for (const [id, answer] of Object.entries(controls))
  cases.push({
    id: `control_${id}`,
    question: original.find((r: any) => r.id === id).request,
    answer,
    expected: true,
    origin: "manually authored validator-only control",
  });
cases.push({
  id: "control_refraction",
  question: "Why is the sky blue?",
  answer: "The atmosphere refracts blue light, making the sky blue.",
  expected: false,
  origin: "manually authored validator-only negative",
});
const threshold = 0.85,
  dir = `experiments/results/validator-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R8.1-validator-protocol.md",
      cases,
      threshold,
      repeats: 2,
    },
    null,
    2,
  ),
);
const jobs = [
  ...cases.map((c: any) => ({ c, repeat: 0 })),
  ...[...cases].reverse().map((c: any) => ({ c, repeat: 1 })),
];
let cursor = 0;
const rows: any[] = [];
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < jobs.length) {
      const { c, repeat } = jobs[cursor++];
      const request = {
        model: "jev-latest",
        state: { user_question: c.question, assistant_answer: c.answer },
        questions: {
          factual: {
            type: "noul",
            instructions:
              "Is assistant_answer free of material factual errors? Read its actual subject, action and qualifications literally; do not silently substitute a more plausible claim. Recommendations without factual assertions pass this dimension unless they assert something false.",
          },
          useful: {
            type: "noul",
            instructions:
              "Does assistant_answer provide a concrete, directly useful answer to user_question, rather than merely restating the desired outcome, echoing the question, or offering generic help? For a why question require an explanatory mechanism; for how require an actionable method.",
          },
          grammatical: {
            type: "noul",
            instructions:
              "Is assistant_answer a grammatical, complete English utterance, with required articles, clause structure and agreement? Ignore factual truth in this question.",
          },
          perspective: {
            type: "noul",
            instructions:
              "Does assistant_answer preserve who the user and assistant refer to? First person in the user question refers to the user, while first person in the assistant answer refers to the assistant. Do not silently treat these as the same person.",
          },
        },
      };
      try {
        const { data } = await researchCall(request);
        const scores = Object.fromEntries(
          Object.entries(data.answers).map(([id, a]: [string, any]) => [
            id,
            a.noul,
          ]),
        );
        if (Object.values(scores).some((v) => typeof v !== "number"))
          throw new Error("Invalid validator response");
        const accepted = Object.values(scores).every(
          (p: any) => p >= threshold,
        );
        const row = {
          id: c.id,
          repeat,
          expected: c.expected,
          accepted,
          scores,
          correct: c.expected === null ? null : accepted === c.expected,
          request,
          response: data,
        };
        rows.push(row);
        await appendFile(`${dir}/traces.jsonl`, JSON.stringify(row) + "\n");
        console.log(
          JSON.stringify({
            id: c.id,
            repeat,
            expected: c.expected,
            accepted,
            scores,
          }),
        );
      } catch (e) {
        rows.push({ id: c.id, repeat, error: (e as Error).message });
      }
    }
  }),
);
const scored = rows.filter((r) => r.correct !== null && !r.error);
const summary = {
  directory: dir,
  total: rows.length,
  scored: scored.length,
  correct: scored.filter((r) => r.correct).length,
  falseAccepts: scored
    .filter((r) => r.expected === false && r.accepted)
    .map((r) => ({ id: r.id, repeat: r.repeat })),
  falseRejects: scored
    .filter((r) => r.expected === true && !r.accepted)
    .map((r) => ({ id: r.id, repeat: r.repeat })),
  rows,
};
await writeFile(`${dir}/summary.json`, JSON.stringify(summary, null, 2) + "\n");
console.log(
  JSON.stringify({
    directory: dir,
    scored: summary.scored,
    correct: summary.correct,
    falseAccepts: summary.falseAccepts,
    falseRejects: summary.falseRejects,
  }),
);
