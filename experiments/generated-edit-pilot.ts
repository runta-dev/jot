import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
const cases = [
  {
    id: "typo",
    draft: "Helo!",
    instruction: "Correct spelling of this greeting; otherwise preserve it.",
    context: "A friendly greeting.",
    expected: "Hello!",
  },
  {
    id: "name",
    draft: "I am Jv.",
    instruction: "Correct the assistant name; make no other changes.",
    context: "The assistant is named Jev.",
    expected: "I am Jev.",
  },
  {
    id: "missing_subject",
    draft: "How can help you?",
    instruction:
      "Repair grammar with the smallest change while preserving intent.",
    context: "The speaker asks how they themselves can help the listener.",
    expected: "How can I help you?",
  },
  {
    id: "duplicate_word",
    draft: "The report is is ready.",
    instruction: "Remove accidental duplication; make no other changes.",
    context: "The report is ready.",
    expected: "The report is ready.",
  },
  {
    id: "whitespace",
    draft: "The project is     ready.",
    instruction:
      "Normalize accidental repeated spaces in this prose sentence; preserve all other characters.",
    context: "Ordinary prose.",
    expected: "The project is ready.",
  },
  {
    id: "keep_negation",
    draft: "The service is not available.",
    instruction: "Correct errors only; keep an already correct draft verbatim.",
    context: "The service is unavailable.",
    expected: "The service is not available.",
  },
  {
    id: "keep_literal",
    draft: 'print("a  b")',
    instruction:
      "Do not modify valid Python or the contents of string literals. Leave correct code verbatim.",
    context: "The code must print a, two spaces, and b.",
    expected: 'print("a  b")',
  },
  {
    id: "keep_number",
    draft: "The total is $1,250.",
    instruction:
      "Correct errors only; preserve correct wording and number formatting.",
    context: "The total is exactly one thousand two hundred fifty dollars.",
    expected: "The total is $1,250.",
  },
];
const alphabet =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?;:'\"-";
const functionWords =
  "a an the I you we they he she it am is are was were be been being have has had do does did can could will would should to of in on at for from with and or but not".split(
    " ",
  );
function proposals(draft: string) {
  const out = new Set<string>([draft, draft.replace(/ {2,}/g, " ")]);
  for (let i = 0; i <= draft.length; i++) {
    for (const char of alphabet) {
      out.add(draft.slice(0, i) + char + draft.slice(i));
      if (i < draft.length)
        out.add(draft.slice(0, i) + char + draft.slice(i + 1));
    }
    if (i < draft.length) out.add(draft.slice(0, i) + draft.slice(i + 1));
    if (i + 1 < draft.length)
      out.add(draft.slice(0, i) + draft[i + 1] + draft[i] + draft.slice(i + 2));
  }
  const words = draft.split(" ");
  for (let i = 0; i <= words.length; i++)
    for (const word of functionWords)
      out.add([...words.slice(0, i), word, ...words.slice(i)].join(" "));
  for (let i = 0; i < words.length; i++)
    out.add([...words.slice(0, i), ...words.slice(i + 1)].join(" "));
  return [...out].filter(Boolean);
}
function permute(items: string[], seed: number) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const dir = `experiments/results/generated-edits-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R3-generated-edit-protocol.md",
      cases,
      alphabet,
      functionWords,
    },
    null,
    2,
  ),
);
const summaries: any[] = [];
for (const c of cases) {
  const started = performance.now();
  const candidates = proposals(c.draft),
    edits = candidates.filter((x) => x !== c.draft);
  const groups: string[][] = [];
  for (let i = 0; i < edits.length; i += 200)
    groups.push(permute([c.draft, ...edits.slice(i, i + 200)], 3917 + i));
  const winners: string[] = [];
  const usage = { input_tokens: 0, output_tokens: 0 };
  let requests = 0,
    cursor = 0;
  async function select(options: string[], stage: string) {
    const request = {
      model: "jev-latest",
      state: { draft: c.draft, instruction: c.instruction, context: c.context },
      questions: {
        best: {
          type: "choice",
          instructions:
            "Select the best corrected version of draft according to instruction and context. Fix real errors using the smallest necessary edit. Preserve meaning, negation, facts and protected literals. If the original draft is already correct, select it unchanged. Do not prefer an unnecessary rewrite. Candidate IDs have no meaning.",
          criteria: Object.fromEntries(
            options.map((text, i) => [`option_${i}`, text]),
          ),
        },
      },
    };
    const { data, attempts } = await researchCall(request);
    requests++;
    usage.input_tokens += data.usage?.input_tokens || 0;
    usage.output_tokens += data.usage?.output_tokens || 0;
    const key = data.answers?.best?.choice;
    const value = request.questions.best.criteria[key];
    if (typeof value !== "string") throw new Error("Invalid selection");
    await appendFile(
      `${dir}/traces.jsonl`,
      JSON.stringify({
        caseId: c.id,
        stage,
        request,
        response: data,
        attempts,
      }) + "\n",
    );
    return value;
  }
  let error: string | undefined;
  try {
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (cursor < groups.length) {
          const i = cursor++;
          winners.push(await select(groups[i], `group_${i}`));
        }
      }),
    );
  } catch (e) {
    error = (e as Error).message;
  }
  const finalists = permute([...new Set([c.draft, ...winners])], 52819);
  let selected = c.draft;
  if (!error) {
    try {
      selected = await select(finalists, "final");
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const row = {
    id: c.id,
    draft: c.draft,
    expected: c.expected,
    selected,
    correct: !error && selected === c.expected,
    proposals: candidates.length,
    goldInProposals: candidates.includes(c.expected),
    goldInFinalists: finalists.includes(c.expected),
    finalists,
    requests,
    usage,
    elapsedMs: Math.round(performance.now() - started),
    error,
  };
  summaries.push(row);
  await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
}
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify(
    {
      directory: dir,
      correct: summaries.filter((r) => r.correct).length,
      total: cases.length,
      rows: summaries,
    },
    null,
    2,
  ) + "\n",
);
console.log("Saved " + dir);
