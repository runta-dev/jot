import js from "jsrealb";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { selectLexeme } from "./lib/lexical-selector.ts";
import { researchCall } from "./research-api.ts";
const { loadEn, S, Pro, VP, V, NP, N, A, D, P, PP, Q } = js;
loadEn();
js.setExceptionOnWarning(true);
const lex = js.getLexicon("en");
const cases = [
  {
    id: "procrastination",
    question: "How can I stop procrastinating?",
    split: "development",
  },
  {
    id: "reading",
    question: "How can I remember what I read?",
    split: "development",
  },
  {
    id: "deadlines",
    question: "How can I keep track of several deadlines?",
    split: "development",
  },
  {
    id: "project",
    question:
      "I feel overwhelmed by a large project. What is a useful first step?",
    split: "fresh",
  },
  {
    id: "vocabulary",
    question: "How can I remember new vocabulary?",
    split: "fresh",
  },
  {
    id: "desk",
    question: "How can I make my cluttered desk easier to work at?",
    split: "fresh",
  },
  {
    id: "distractions",
    question: "I keep getting distracted while working. What can I try?",
    split: "fresh",
  },
  {
    id: "draft",
    question:
      "I am struggling to begin a first draft. What is a useful first step?",
    split: "fresh",
  },
];
const dir = `experiments/results/conditioned-action-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    { protocol: "research/R10-conditioned-action-protocol.md", cases },
    null,
    2,
  ),
);
const rows: any[] = [];
for (const c of cases) {
  const start = performance.now();
  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  let verb = "",
    noun = "",
    adjective = "",
    frame: any = {},
    result = "",
    error: string | undefined;
  const log = async (t: unknown) => {
    await appendFile(
      `${dir}/traces.jsonl`,
      JSON.stringify({ id: c.id, trace: t }) + "\n",
    );
  };
  const account = (r: any) => {
    requests += r.requests;
    usage.input_tokens += r.usage.input_tokens;
    usage.output_tokens += r.usage.output_tokens;
  };
  async function ask(stage: string, state: unknown, questions: unknown) {
    const request = { model: "jev-latest", state, questions };
    const { data } = await researchCall(request);
    account({ requests: 1, usage: data.usage });
    await log({ stage, request, response: data });
    return Object.fromEntries(
      Object.entries(data.answers).map(([id, v]: [string, any]) => [
        id,
        v.choice,
      ]),
    );
  }
  try {
    const action = await selectLexeme(
      "V",
      { user_request: c.question },
      "Select one concrete action the user can perform as a FIRST STEP toward the desired outcome. It must be a MEANS of making progress, not just a verb naming the requested outcome, the problem, or the act of giving advice. Choose an implementable action rather than telling the user to simply achieve their goal.",
      log,
    );
    account(action);
    verb = action.selected;
    const sourceWords = c.question.replace(/[?!.,]/g, "").split(/\s+/);
    const primary = new Set<string>(["it"]);
    for (let n = 1; n <= 4; n++)
      for (let i = 0; i + n <= sourceWords.length; i++)
        primary.add(sourceWords.slice(i, i + n).join(" "));
    const syntax = await ask(
      "valency",
      { user_request: c.question, selected_action: verb },
      {
        frame: {
          type: "choice",
          instructions:
            "Which grammatical argument structure should express this recommended action? Select based on the meaning of the selected verb in this context.",
          criteria: {
            intransitive: "Verb with no object.",
            direct: "Verb with one direct object.",
            prepositional: "Verb followed by a prepositional complement.",
            resultative:
              "Verb with a direct object plus a prepositional result, destination or instrument.",
          },
        },
        link: {
          type: "choice",
          instructions:
            "If a prepositional complement is needed, which linker fits the selected action and goal?",
          criteria: Object.fromEntries(
            [
              "on",
              "with",
              "into",
              "to",
              "for",
              "in",
              "about",
              "at",
              "from",
            ].map((x) => [x, null]),
          ),
        },
        primary: {
          type: "choice",
          instructions:
            "Assuming a direct object plus an additional prepositional complement is needed, select the initial object acted on from the user request. Select it if the referent is clear. Do not copy the whole question.",
          criteria: Object.fromEntries(
            [...primary].map((p, i) => [`p${i}`, p]),
          ),
        },
      },
    );
    frame = {
      kind: syntax.frame,
      link: syntax.link,
      primary: [...primary][Number(syntax.primary.slice(1))],
    };
    if (frame.kind !== "intransitive") {
      const arg = await selectLexeme(
        "N",
        {
          user_request: c.question,
          selected_action: verb,
          argument_structure: frame,
        },
        "Select the concrete noun filling the action argument. For a direct-object frame, it is the thing to act on. For a prepositional frame, it follows the linker. For a resultative frame, it is the result/destination/instrument after the linker, not the initial object. Choose what actually participates in the selected action, not metawords about advice, strategies or answers.",
        log,
      );
      account(arg);
      noun = arg.selected;
      const attr = await selectLexeme(
        "A",
        {
          user_request: c.question,
          selected_action: verb,
          argument_structure: frame,
          argument: noun,
        },
        "Select a concrete property of the argument that would make this action easier or appropriate for the user. Describe the THING, not the writing style or the desirability of advice. Avoid merely calling it practical, effective or instructional. Choose NONE if no qualifier is useful.",
        log,
        true,
      );
      account(attr);
      adjective = attr.selected;
    }
    const variants = new Set<string>();
    for (const number of ["s", "p"])
      for (const det of ["NONE", "a", "the", "some"])
        for (const include of [false, true]) {
          try {
            const elems: any[] = [V(verb)];
            if (frame.kind !== "intransitive") {
              if (lex[noun]?.N?.cnt === "no" && number === "p") continue;
              const object = NP(
                ...(det === "NONE" ? [] : [D(det)]),
                ...(include && adjective !== "NONE" ? [A(adjective)] : []),
                N(noun).n(number),
              );
              if (frame.kind === "direct") elems.push(object);
              else if (frame.kind === "prepositional")
                elems.push(PP(P(frame.link), object));
              else {
                elems.push(Q(frame.primary), PP(P(frame.link), object));
              }
            }
            variants.add(
              S(Pro("I").pe(2), VP(...elems))
                .typ({ mod: "poss" })
                .toString()
                .trim(),
            );
          } catch {}
        }
    const texts = [...variants];
    if (!texts.length) throw new Error("No valid realizations");
    const picked = await ask(
      "final",
      { user_request: c.question },
      {
        best: {
          type: "choice",
          instructions:
            "Select the most grammatical, concrete and useful first-step suggestion. It must offer a means of progress, not merely repeat the requested outcome. Prefer natural specificity over generic claims of effectiveness.",
          criteria: Object.fromEntries(texts.map((x, i) => [`c${i}`, x])),
        },
      },
    );
    result = texts[Number(picked.best.slice(1))];
    if (!result) throw new Error("Invalid final choice");
  } catch (e) {
    error = (e as Error).message;
  }
  const row = {
    ...c,
    verb,
    noun,
    adjective,
    frame,
    result,
    error,
    requests,
    usage,
    elapsedMs: Math.round(performance.now() - start),
  };
  rows.push(row);
  await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
}
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
