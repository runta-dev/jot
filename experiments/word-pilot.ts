import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { question, END, isRepetition } from "../server/jev.ts";
import { researchCall } from "./research-api.ts";
const list = await readFile(".cache/research/google-10000-english.txt", "utf8");
const hash = createHash("sha256").update(list).digest("hex");
if (hash !== "9c965d384526facc59260e94f8ccff1582633fa385004abe1455ed457062acbc")
  throw new Error("Unexpected lexicon checksum");
const words = list.trim().split(/\r?\n/).slice(0, 4096);
const prompts = [
  { id: "greeting", text: "hello" },
  { id: "identity", text: "Who are you? State your name and provider." },
  {
    id: "capital",
    text: "What is the capital of France? Reply with just the city name.",
  },
  { id: "arithmetic", text: "What is 2 + 2? Reply with one number." },
  { id: "opposite", text: "What is the opposite of hot? Reply with one word." },
  {
    id: "summary",
    text: "Summarize in one short sentence: On Monday at 09:00, the health endpoint returned HTTP 503. The cause is unknown.",
  },
];
const dir = `experiments/results/words-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      model: "jev-latest",
      lexiconHash: hash,
      lexiconSize: 4096,
      protocol: "research/R2-word-protocol.md",
      prompts,
    },
    null,
    2,
  ),
);
const jobs = prompts.flatMap((prompt) =>
  ["char", "word"].map((mode) => ({ prompt, mode })),
);
let cursor = 0;
const rows: any[] = [];
function render(prefix: string, word: string) {
  if (word === "\n") return prefix + "\n";
  if (/^[.,!?;:)]$/.test(word)) return prefix + word;
  let fragment = word;
  if (word === "i") fragment = "I";
  if (!prefix || /[.!?]\s*$/.test(prefix))
    fragment = fragment.charAt(0).toUpperCase() + fragment.slice(1);
  return prefix + (prefix && !/[\s(]$/.test(prefix) ? " " : "") + fragment;
}
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < jobs.length) {
      const { prompt, mode } = jobs[cursor++];
      const started = performance.now();
      let prefix = "",
        reason = "limit",
        requests = 0;
      const usage = { input_tokens: 0, output_tokens: 0 };
      const steps: any[] = [];
      const vocabulary = [
        ...new Set([
          ...words,
          ...(prompt.text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+/g) || []),
          ...Array.from({ length: 100 }, (_, i) => String(i)),
          "Jev",
          "TypeSafe",
          "AI",
          ".",
          ",",
          "?",
          "!",
          ":",
          ";",
          "(",
          ")",
          "\n",
        ]),
      ];
      const criteria = Object.fromEntries([
        ...vocabulary.map((word) => [word, null]),
        [END, "The assistant reply is already complete."],
      ]);
      for (let step = 0; step < (mode === "word" ? 16 : 64); step++) {
        if (performance.now() - started > 120000) {
          reason = "time_limit";
          break;
        }
        const base = question([{ role: "user", content: prompt.text }], prefix);
        const request = {
          ...base,
          questions: {
            next:
              mode === "char"
                ? base.questions.next
                : {
                    type: "choice",
                    instructions:
                      "Continue assistant_reply_so_far to answer the user directly in concise English. Choose the NEXT WHOLE WORD or punctuation mark, not a letter and not a sentence. Continue the existing reply without restarting it. The application inserts normal spaces and capitalizes sentence beginnings. Select <EOS> only if the reply is complete.",
                    criteria,
                  },
            complete: {
              type: "noul",
              instructions:
                "Does assistant_reply_so_far already completely and correctly answer the most recent user message, including its format constraints? An empty reply, unfinished clause, unrelated statement, or just repeating the question is not complete.",
            },
          },
        };
        try {
          const { data, attempts } = await researchCall(request);
          requests++;
          usage.input_tokens += data.usage?.input_tokens || 0;
          usage.output_tokens += data.usage?.output_tokens || 0;
          const selected = data.answers?.next?.choice;
          const complete = data.answers?.complete?.noul;
          const record = {
            promptId: prompt.id,
            mode,
            step,
            attempts,
            request,
            response: data,
          };
          await appendFile(
            `${dir}/traces.jsonl`,
            JSON.stringify(record) + "\n",
          );
          steps.push({
            prefix,
            selected,
            complete,
            confidence: data.answers?.next?.confidence,
          });
          if (
            typeof complete !== "number" ||
            typeof selected !== "string" ||
            !Object.hasOwn(request.questions.next.criteria, selected)
          )
            throw new Error("Invalid answer");
          if (complete >= 0.9) {
            reason = "complete_noul";
            break;
          }
          if (selected === END) {
            reason = "eos";
            break;
          }
          prefix =
            mode === "char" ? prefix + selected : render(prefix, selected);
          if (isRepetition(prefix) || /(\b\w+)(?:\s+\1){3}$/i.test(prefix)) {
            reason = "repetition";
            break;
          }
        } catch (error) {
          reason = `error: ${(error as Error).message}`;
          break;
        }
      }
      const row = {
        id: prompt.id,
        prompt: prompt.text,
        mode,
        reply: prefix,
        reason,
        requests,
        elapsedMs: Math.round(performance.now() - started),
        usage,
        steps,
      };
      rows.push(row);
      await appendFile(`${dir}/replies.jsonl`, JSON.stringify(row) + "\n");
      console.log(
        JSON.stringify({
          id: row.id,
          mode,
          reply: prefix,
          reason,
          requests,
          ms: row.elapsedMs,
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
