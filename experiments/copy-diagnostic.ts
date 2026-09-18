import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { parse } from "dotenv";
import { characters, END, criteria as rawCriteria } from "../server/jev.ts";
const cases = [
  ["Hi", ""],
  ["Hi", "H"],
  ["Hi", "Hi"],
  ["Hello!", "H"],
  ["Hello!", "Hel"],
  ["Hello!", "Hello"],
  ["I am Jev.", "I"],
  ["I am Jev.", "I "],
  ["I am Jev.", "I am J"],
  ["a  b", "a"],
  ["a  b", "a "],
  ["a  b", "a  "],
  ["A\nB", "A"],
  ["A\nB", "A\n"],
  ["Q7-z", "Q"],
  ["Q7-z", "Q7"],
  ["Q7-z", "Q7-"],
  ["Q7-z", "Q7-z"],
].map(([source, prefix], i) => ({
  id: `copy_${i + 1}`,
  source,
  prefix,
  expected: source[prefix.length] ?? END,
}));
const methods = ["raw", "opaque", "contextual", "remaining"] as const;
const repeats = 2;
const dir = `experiments/results/copy-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      model: "jev-latest",
      repeats,
      methods,
      cases,
      protocol: "research/R1-copy-protocol.md",
    },
    null,
    2,
  ),
);
const env = parse(await readFile(".env", "utf8"));
const key =
  process.env.JEV_API_KEY ||
  process.env.TYPESAFE_API_KEY ||
  env.JEV_API_KEY ||
  env.TYPESAFE_API_KEY;
if (!key) throw new Error("Missing Jev API key");
const jobs = cases.flatMap((c) =>
  methods.flatMap((method) =>
    Array.from({ length: repeats }, (_, repeat) => ({ c, method, repeat })),
  ),
);
let cursor = 0;
const rows: any[] = [];
const startedAll = performance.now();
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (cursor < jobs.length) {
      const { c, method, repeat } = jobs[cursor++];
      const options = [...characters, END];
      // A reproducible permutation independent of the correct answer.
      let seed =
        1789 + c.id.length * 31 + Number(c.id.slice(5)) * 101 + repeat * 523;
      for (let i = options.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const j = seed % (i + 1);
        [options[i], options[j]] = [options[j], options[i]];
      }
      const mapping = Object.fromEntries(
        options.map((char, index) => [
          method === "raw" ? char : `option_${index}`,
          char,
        ]),
      );
      const criteria = Object.fromEntries(
        Object.entries(mapping).map(([id, char]) => [
          id,
          method === "raw"
            ? rawCriteria[char]
            : method === "contextual"
              ? char === END
                ? `Finish copying here: ${JSON.stringify(c.prefix)}`
                : `The copied text becomes ${JSON.stringify(c.prefix + char)}`
              : char === END
                ? "End of source text; no character remains."
                : `Append exactly this single character: ${JSON.stringify(char)}`,
        ]),
      );
      const state =
        method === "remaining"
          ? { remaining_source: c.source.slice(c.prefix.length) }
          : { source_text: c.source, assistant_reply_so_far: c.prefix };
      const instructions =
        method === "remaining"
          ? "Select exactly the first character of remaining_source, preserving all spaces and line breaks. Select the end-of-source option only when remaining_source is empty. Do not answer a question or rewrite the text."
          : "Copy source_text exactly. assistant_reply_so_far is an exact prefix already copied. Select the next single character to append, preserving all spaces, case, punctuation and line breaks. Select the end-of-source option only if the full source has already been copied. Do not rewrite or improve the source.";
      const request = {
        model: "jev-latest",
        state,
        questions: { next: { type: "choice", instructions, criteria } },
      };
      const started = performance.now();
      let data: any,
        error: string | undefined,
        attempts = 0;
      for (let attempt = 0; attempt < 3; attempt++) {
        attempts++;
        try {
          const response = await fetch("https://api.typesafe.ai/v1/systemone", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`HTTP ${response.status}`);
          }
          data = await response.json();
          error = undefined;
          break;
        } catch (e) {
          error = (e as Error).message;
          if (attempt < 2)
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
      const selected = data?.answers?.next?.choice;
      if (data && !Object.hasOwn(mapping, selected))
        error = "Invalid Choice answer";
      const goldId = Object.keys(mapping).find(
        (id) => mapping[id] === c.expected,
      )!;
      const row = {
        caseId: c.id,
        method,
        repeat,
        source: c.source,
        prefix: c.prefix,
        expected: c.expected,
        selected: error ? null : mapping[selected],
        correct: error ? null : mapping[selected] === c.expected,
        confidence: data?.answers?.next?.confidence,
        goldProbability: data?.answers?.next?.probabilities?.[goldId],
        elapsedMs: Math.round(performance.now() - started),
        attempts,
        error,
        request,
        response: data,
      };
      rows.push(row);
      await appendFile(`${dir}/responses.jsonl`, JSON.stringify(row) + "\n");
      if (rows.length % 24 === 0)
        console.log(`Completed ${rows.length}/${jobs.length}`);
    }
  }),
);
const summary = {
  directory: dir,
  modelVersions: [
    ...new Set(rows.map((r) => r.response?.model).filter(Boolean)),
  ],
  wallMs: Math.round(performance.now() - startedAll),
  methods: Object.fromEntries(
    methods.map((method) => {
      const group = rows.filter((r) => r.method === method),
        valid = group.filter((r) => !r.error);
      return [
        method,
        {
          correct: valid.filter((r) => r.correct).length,
          total: valid.length,
          errors: group.length - valid.length,
          passed95PercentGate:
            valid.length === group.length &&
            valid.filter((r) => r.correct).length / valid.length >= 0.95,
          failures: valid
            .filter((r) => !r.correct)
            .map(({ caseId, prefix, expected, selected }) => ({
              caseId,
              prefix,
              expected,
              selected,
            })),
        },
      ];
    }),
  ),
  usage: rows.reduce(
    (sum, r) => ({
      input_tokens: sum.input_tokens + (r.response?.usage?.input_tokens || 0),
      output_tokens:
        sum.output_tokens + (r.response?.usage?.output_tokens || 0),
    }),
    { input_tokens: 0, output_tokens: 0 },
  ),
};
await writeFile(`${dir}/summary.json`, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
