import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
const prior = JSON.parse(
  await readFile(
    "experiments/results/generated-edits-2026-09-18T02-36-21-289Z/manifest.json",
    "utf8",
  ),
);
const cases = [
  ...prior.cases.map((c: any) => ({ ...c, split: "development" })),
  {
    id: "new_missing",
    draft: "Ths is fine.",
    instruction: "Correct spelling only; preserve the meaning.",
    context: "An ordinary statement that this is fine.",
    expected: "This is fine.",
    split: "new",
  },
  {
    id: "new_agreement",
    draft: "We is ready.",
    instruction:
      "Correct grammar; retain first-person plural and present tense.",
    context: "The speakers are ready now.",
    expected: "We are ready.",
    split: "new",
  },
  {
    id: "new_duplicate",
    draft: "They have have arrived.",
    instruction: "Remove accidental duplicate words; preserve meaning.",
    context: "They have arrived.",
    expected: "They have arrived.",
    split: "new",
  },
  {
    id: "new_spaces",
    draft: "I can  help.",
    instruction:
      "Remove accidental repeated spaces; preserve other characters.",
    context: "Ordinary prose.",
    expected: "I can help.",
    split: "new",
  },
  {
    id: "new_question",
    draft: "Are you ready.",
    instruction: "Fix terminal punctuation for a direct question.",
    context: "The speaker asks whether the listener is ready.",
    expected: "Are you ready?",
    split: "new",
  },
  {
    id: "new_correct",
    draft: "She walks daily.",
    instruction: "Fix mistakes only; leave correct text unchanged.",
    context: "A present-tense statement of a daily habit.",
    expected: "She walks daily.",
    split: "new",
  },
  {
    id: "new_id",
    draft: "ID: AB-42",
    instruction: "Return the identifier line exactly. Do not rewrite it.",
    context: "The required literal line is ID: AB-42.",
    expected: "ID: AB-42",
    split: "new",
  },
  {
    id: "new_provider",
    draft: "I am from TypeSafe.",
    instruction:
      "Fix grammar or spelling mistakes only. Keep a correct draft verbatim.",
    context: "The speaker is from TypeSafe.",
    expected: "I am from TypeSafe.",
    split: "new",
  },
];
const alphabet = prior.alphabet as string;
const functionWords =
  "a an the I you we they he she it am is are was were be been being have has had do does did can could will would should to of in on at for from by with and or but not".split(
    " ",
  );
const dir = `experiments/results/localized-edits-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R3.1-localized-edit-protocol.md",
      cases,
      alphabet,
      functionWords,
    },
    null,
    2,
  ),
);
const actions = {
  unchanged: "The draft is already correct. Leave it unchanged.",
  insert_character: "Insert one missing character.",
  replace_character: "Replace one incorrect character.",
  delete_character: "Delete one extra character.",
  transpose: "Swap two adjacent characters.",
  insert_word: "Insert one missing function word.",
  replace_word: "Replace one incorrect function word.",
  delete_word: "Delete one redundant word.",
  normalize_spaces: "Collapse accidental repeated spaces in ordinary prose.",
};
const rows: any[] = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (cursor < cases.length) {
      const c = cases[cursor++],
        draft = c.draft as string,
        started = performance.now();
      let requests = 0;
      const usage = { input_tokens: 0, output_tokens: 0 };
      const spans = [...draft.matchAll(/\S+/g)].map((m) => ({
        start: m.index!,
        end: m.index! + m[0].length,
        text: m[0],
      }));
      const insertWord = (position: number, word: string) =>
        draft.slice(0, position) +
        (position > 0 && !/\s/.test(draft[position - 1]) ? " " : "") +
        word +
        (position < draft.length ? " " : "") +
        draft.slice(position);
      const wordPositions = [...spans.map((x) => x.start), draft.length];
      const locations: Record<
        string,
        { key: string; index: number; label: string }[]
      > = {};
      for (const action of [
        "insert_character",
        "replace_character",
        "delete_character",
        "transpose",
      ])
        locations[action] = Array.from(
          {
            length:
              action === "insert_character"
                ? draft.length + 1
                : action === "transpose"
                  ? draft.length - 1
                  : draft.length,
          },
          (_, i) => ({
            key: `at_${i}`,
            index: i,
            label:
              action === "insert_character"
                ? draft.slice(0, i) + "[INSERT]" + draft.slice(i)
                : draft.slice(0, i) +
                  "[" +
                  draft.slice(i, i + (action === "transpose" ? 2 : 1)) +
                  "]" +
                  draft.slice(i + (action === "transpose" ? 2 : 1)),
          }),
        );
      locations.insert_word = wordPositions.map((position, i) => ({
        key: `word_${i}`,
        index: position,
        label: insertWord(position, "[INSERT WORD]"),
      }));
      for (const action of ["replace_word", "delete_word"])
        locations[action] = spans.map((span, i) => ({
          key: `word_${i}`,
          index: i,
          label:
            draft.slice(0, span.start) +
            "[" +
            span.text +
            "]" +
            draft.slice(span.end),
        }));
      const questions: Record<string, unknown> = {
        action: {
          type: "choice",
          instructions:
            "Identify the single minimal editing action needed to make draft satisfy instruction and context. Do not improve style or rewrite already correct text. Choose unchanged when no actual mistake exists.",
          criteria: actions,
        },
      };
      for (const [action, items] of Object.entries(locations))
        questions[action] = {
          type: "choice",
          instructions: `Assuming ${action.replaceAll("_", " ")} is needed, which bracket-marked location should be edited to minimally correct draft under instruction and context? Select the location, not its numerical identifier.`,
          criteria: Object.fromEntries(items.map((x) => [x.key, x.label])),
        };
      let selected = draft,
        action = "",
        error: string | undefined,
        proposals = [draft];
      try {
        const request = {
          model: "jev-latest",
          state: { draft, instruction: c.instruction, context: c.context },
          questions,
        };
        const first = await researchCall(request);
        requests++;
        usage.input_tokens += first.data.usage?.input_tokens || 0;
        usage.output_tokens += first.data.usage?.output_tokens || 0;
        await appendFile(
          `${dir}/traces.jsonl`,
          JSON.stringify({
            caseId: c.id,
            stage: "localize",
            request,
            response: first.data,
          }) + "\n",
        );
        action = first.data.answers?.action?.choice;
        if (!Object.hasOwn(actions, action)) throw new Error("Invalid action");
        if (action === "normalize_spaces")
          proposals.push(draft.replace(/ {2,}/g, " "));
        else if (action !== "unchanged") {
          const ordered = Object.entries(
            first.data.answers[action].probabilities as Record<string, number>,
          )
            .filter(([id]) => locations[action].some((x) => x.key === id))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);
          for (const [id] of ordered) {
            const position = locations[action].find((x) => x.key === id)!.index;
            if (action === "insert_character")
              for (const char of alphabet)
                proposals.push(
                  draft.slice(0, position) + char + draft.slice(position),
                );
            if (action === "replace_character")
              for (const char of alphabet)
                proposals.push(
                  draft.slice(0, position) + char + draft.slice(position + 1),
                );
            if (action === "delete_character")
              proposals.push(
                draft.slice(0, position) + draft.slice(position + 1),
              );
            if (action === "transpose")
              proposals.push(
                draft.slice(0, position) +
                  draft[position + 1] +
                  draft[position] +
                  draft.slice(position + 2),
              );
            if (action === "insert_word")
              for (const word of functionWords)
                proposals.push(insertWord(position, word));
            if (action === "replace_word") {
              const span = spans[position];
              for (const word of functionWords)
                proposals.push(
                  draft.slice(0, span.start) + word + draft.slice(span.end),
                );
            }
            if (action === "delete_word") {
              const span = spans[position];
              proposals.push(
                draft.slice(0, span.start) +
                  draft.slice(span.end + (draft[span.end] === " " ? 1 : 0)),
              );
            }
          }
        }
        proposals = [...new Set(proposals)].filter(Boolean);
        if (proposals.length > 255) throw new Error("Too many proposals");
        if (proposals.length > 1) {
          const request = {
            model: "jev-latest",
            state: { draft, instruction: c.instruction, context: c.context },
            questions: {
              best: {
                type: "choice",
                instructions:
                  "Select the minimal valid correction. Preserve meaning, facts, literal strings, and formatting requirements. Leave the original draft unchanged if it is already correct, or if no proposed edit fixes its actual error.",
                criteria: Object.fromEntries(
                  proposals.map((p, i) => [`option_${i}`, p]),
                ),
              },
            },
          };
          const second = await researchCall(request);
          requests++;
          usage.input_tokens += second.data.usage?.input_tokens || 0;
          usage.output_tokens += second.data.usage?.output_tokens || 0;
          await appendFile(
            `${dir}/traces.jsonl`,
            JSON.stringify({
              caseId: c.id,
              stage: "select",
              request,
              response: second.data,
            }) + "\n",
          );
          selected =
            request.questions.best.criteria[second.data.answers?.best?.choice];
          if (typeof selected !== "string")
            throw new Error("Invalid final choice");
        }
      } catch (e) {
        error = (e as Error).message;
      }
      const row = {
        id: c.id,
        split: c.split,
        draft,
        expected: c.expected,
        selected,
        action,
        correct: !error && selected === c.expected,
        goldCovered: proposals.includes(c.expected),
        proposalCount: proposals.length,
        requests,
        usage,
        elapsedMs: Math.round(performance.now() - started),
        error,
      };
      rows.push(row);
      await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
      console.log(JSON.stringify(row));
    }
  }),
);
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify(
    {
      directory: dir,
      correct: rows.filter((r) => r.correct).length,
      total: rows.length,
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.log("Saved " + dir);
