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
const dir = `experiments/results/hierarchy-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      model: "jev-latest",
      lexiconHash: hash,
      lexiconSize: 4096,
      protocol: "research/R2.1-hierarchy-protocol.md",
      prompts,
    },
    null,
    2,
  ),
);
const jobs = prompts.flatMap((prompt) =>
  ["word"].map((mode) => ({ prompt, mode })),
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
      const groups: Record<string, string[]> = {};
      for (let i = 0; i < vocabulary.length; i += 112)
        groups[`group_${i / 112}`] = vocabulary.slice(i, i + 112);
      const criteria = Object.fromEntries([
        ...Object.entries(groups).map(([id, items]) => [
          id,
          JSON.stringify(items),
        ]),
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
                      "Which group contains the best NEXT WHOLE WORD or punctuation mark to append to assistant_reply_so_far while directly answering the user? Each group lists its words. Choose the next grammatical word, not merely a word related to the topic. Continue the existing reply without restarting or repeating it. Select <EOS> only if the reply is complete.",
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
          let selected = data.answers?.next?.choice;
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
          if (mode === "word") {
            const chosenGroups = Object.entries(
              data.answers.next.probabilities as Record<string, number>,
            )
              .filter(([id]) => Object.hasOwn(groups, id))
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2)
              .map(([id]) => id);
            const shortlist = chosenGroups.flatMap((id) => groups[id]);
            const wordRequest = {
              ...base,
              questions: {
                next: {
                  type: "choice",
                  instructions:
                    "Choose the next whole word or punctuation mark to continue assistant_reply_so_far as a direct, concise English answer to the user. Normal spaces and sentence capitalization are inserted by the application. Do not restart the answer. Select <EOS> only if the existing reply is complete.",
                  criteria: Object.fromEntries([
                    ...shortlist.map((word) => [word, null]),
                    [END, "The reply is complete; stop."],
                  ]),
                },
              },
            };
            if (Object.keys(wordRequest.questions.next.criteria).length > 255)
              throw new Error("Candidate limit exceeded");
            const second = await researchCall(wordRequest);
            requests++;
            usage.input_tokens += second.data.usage?.input_tokens || 0;
            usage.output_tokens += second.data.usage?.output_tokens || 0;
            selected = second.data.answers?.next?.choice;
            await appendFile(
              `${dir}/traces.jsonl`,
              JSON.stringify({
                promptId: prompt.id,
                mode,
                step,
                stage: "word",
                chosenGroups,
                request: wordRequest,
                response: second.data,
              }) + "\n",
            );
            steps.push({
              prefix,
              stage: "word",
              selected,
              chosenGroups,
              confidence: second.data.answers?.next?.confidence,
            });
            if (
              typeof selected !== "string" ||
              !Object.hasOwn(wordRequest.questions.next.criteria, selected)
            )
              throw new Error("Invalid word choice");
            if (selected === END) {
              reason = "word_eos";
              break;
            }
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
