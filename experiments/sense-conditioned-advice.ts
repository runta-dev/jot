import js from "jsrealb";
import {
  readFile,
  mkdir,
  writeFile,
  appendFile,
  copyFile,
} from "node:fs/promises";
import { selectLexeme } from "./lib/lexical-selector.ts";
import { verbSenses } from "./lib/wordnet.ts";
import { researchCall } from "./research-api.ts";
import { perspectiveVariants } from "./lib/grammar.ts";
const { S, Pro, VP, V, NP, N, A, D, P, PP, Q } = js;
js.loadEn();
js.setExceptionOnWarning(true);
const lex = js.getLexicon("en"),
  nounForms = js.buildLemmataMap("en", (_w: string, e: any) => Boolean(e.N)),
  wn = await verbSenses();
const old = "experiments/results/rich-senses-2026-09-18T05-31-05-643Z";
const prior = JSON.parse(await readFile(`${old}/summary.json`, "utf8")).rows;
const cases: any[] = prior
  .filter((r: any) => r.mode === "definitions" && r.repeat === 0)
  .map((r: any) => ({
    id: r.id,
    question: r.request.state.user_request,
    verb: r.lemma,
    sense: r.selected,
    split: "development",
    preparation: "cached R11.1",
  }));
cases.push(
  ...[
    { id: "notes", question: "How can I make my notes easier to find later?" },
    { id: "habit", question: "How can I begin a regular writing habit?" },
    {
      id: "trip",
      question:
        "How can I prepare for a trip without forgetting important things?",
    },
    {
      id: "complex",
      question: "How can I approach a task that feels too complicated?",
    },
  ].map((c) => ({ ...c, split: "fresh", preparation: "new in this run" })),
);
const dir = `experiments/results/sense-advice-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await copyFile("node_modules/wordnet-db/LICENSE", `${dir}/WORDNET-LICENSE.txt`);
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R12-sense-conditioned-advice-protocol.md",
      cachedSource: old,
      cases,
    },
    null,
    2,
  ),
);
const rows: any[] = [];
for (const c of cases) {
  const started = performance.now();
  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  let result = "",
    error: string | undefined;
  const provenance: any = {};
  const log = async (t: unknown) => {
    await appendFile(
      `${dir}/traces.jsonl`,
      JSON.stringify({ id: c.id, trace: t }) + "\n",
    );
  };
  function account(r: any) {
    requests += r.requests;
    usage.input_tokens += r.usage.input_tokens;
    usage.output_tokens += r.usage.output_tokens;
  }
  async function ask(stage: string, state: unknown, questions: unknown) {
    const request = { model: "jev-latest", state, questions };
    const { data } = await researchCall(request);
    account({ requests: 1, usage: data.usage });
    await log({ stage, request, response: data });
    return data.answers;
  }
  try {
    if (!c.sense) {
      const action = await selectLexeme(
        "V",
        { user_request: c.question },
        "Choose an implementable first action that is a means toward the user goal, not merely a name for the desired outcome or the act of advising.",
        log,
      );
      account(action);
      const criteria = Object.fromEntries(
        action.ranked.map(([word]) => [
          word,
          wn
            .get(word)
            ?.slice(0, 3)
            .map((s) => s.definition)
            .join(" | ") || "Verb lemma; no definition available.",
        ]),
      );
      const selected = await ask(
        "action",
        { user_request: c.question },
        {
          word: {
            type: "choice",
            instructions:
              "Choose a concrete useful first action in an ordinary supplied verb sense.",
            criteria,
          },
        },
      );
      c.verb = selected.word.choice;
      const senses = wn.get(c.verb)?.slice(0, 3) || [];
      if (!senses.length) throw new Error("No lexical sense available");
      const selectedSense = await ask(
        "sense",
        { user_request: c.question, action: c.verb },
        {
          sense: {
            type: "choice",
            instructions:
              "Choose the ordinary verb sense applicable to this first-step recommendation. Do not invent another sense.",
            criteria: Object.fromEntries(
              senses.map((s, i) => [
                `s${i}`,
                JSON.stringify({
                  meaning: s.definition,
                  synonyms: s.lemmas,
                  examples: s.examples.slice(0, 1),
                }),
              ]),
            ),
          },
        },
      );
      c.sense = senses[Number(selectedSense.sense.choice.slice(1))];
    }
    const state = { user_request: c.question, action: c.verb, sense: c.sense };
    const nouns = await selectLexeme(
      "N",
      state,
      "Choose a concrete thing, activity, participant or result involved in this specific action sense that would make a useful first step for the user. Do not merely name advice or the overall goal.",
      log,
    );
    account(nouns);
    const pool = new Set<string>(nouns.ranked.map(([w]) => w));
    const sourceNouns: string[] = [];
    for (const word of `${c.question} ${c.sense.definition}`.match(
      /[A-Za-z]+/g,
    ) || [])
      for (const n of nounForms.get(word.toLowerCase()) || []) {
        if (n.constType === "N") {
          pool.add(n.lemma);
          sourceNouns.push(n.lemma);
        }
      }
    provenance.participants = {
      retrieved: nouns.ranked.map(([w]) => w),
      sourceNouns: [...new Set(sourceNouns)],
    };
    const words = [...pool];
    if (words.length > 250) throw new Error("Noun budget exceeded");
    const options = Object.fromEntries(words.map((w) => [w, null]));
    const tokens = c.question.replace(/[?.!,]/g, "").split(/\s+/);
    const source = new Set<string>(["it"]);
    for (let n = 1; n <= 4; n++)
      for (let i = 0; i + n <= tokens.length; i++)
        for (const variant of perspectiveVariants(
          tokens.slice(i, i + n).join(" "),
        ))
          source.add(variant);
    const sourceValues = [...source];
    const binding = await ask("participants", state, {
      patient: {
        type: "choice",
        instructions:
          "Choose the actual thing or activity this action acts on. Respect the verb sense. Do not substitute a related place/container or a goal label for the actual participant.",
        criteria: options,
      },
      result: {
        type: "choice",
        instructions:
          "If expressing an additional result, destination or means would make the action concrete, choose its noun. For division/decomposition, choose what it is divided into, not the original whole.",
        criteria: options,
      },
      primary: {
        type: "choice",
        instructions:
          "Choose the initial thing from the user request that could be acted on in a resultative construction. Use it if the referent is clear. Do not copy the whole question.",
        criteria: Object.fromEntries(sourceValues.map((s, i) => [`p${i}`, s])),
      },
      link: {
        type: "choice",
        instructions:
          "Which linker would best express a useful additional participant or result for the selected action?",
        criteria: Object.fromEntries(
          ["into", "on", "with", "for", "to", "from", "in", "about"].map(
            (p) => [p, null],
          ),
        ),
      },
    });
    const top = (answer: any, n: number) =>
      Object.entries(answer.probabilities as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([key]) => key);
    const patients = top(binding.patient, 2),
      results = top(binding.result, 2),
      primaries = top(binding.primary, 2).map(
        (k) => sourceValues[Number(k.slice(1))],
      ),
      links = top(binding.link, 2);
    const attr = await selectLexeme(
      "A",
      { ...state, possible_patients: patients, possible_results: results },
      "Choose an optional concrete property of the participant or result that makes a bounded FIRST STEP manageable. Describe the thing, not the writing style or generic effectiveness of advice. Choose NONE if unnecessary.",
      log,
      true,
    );
    account(attr);
    const adjectives = [
      null,
      ...attr.ranked
        .filter(([w]) => w !== "NONE")
        .slice(0, 2)
        .map(([w]) => w),
    ];
    const surfaces = [...new Set([c.verb, ...c.sense.lemmas])]
      .map((s: string) => s.replaceAll("_", " "))
      .filter(
        (s: string) => lex[s.split(" ")[0]]?.V && s.split(" ").length <= 2,
      )
      .slice(0, 3);
    const variants = new Set<string>();
    function np(noun: string, det: string, number: string, adj: string | null) {
      if (lex[noun]?.N?.cnt === "no" && number === "p")
        throw new Error("Mass plural");
      return NP(
        ...(det === "NONE" ? [] : [D(det)]),
        ...(adj ? [A(adj)] : []),
        N(noun).n(number),
      );
    }
    function emit(surface: string, rest: any[]) {
      try {
        const [verb, particle] = surface.split(" ");
        const text = S(
          Pro("I").pe(2),
          VP(V(verb), ...(particle ? [Q(particle)] : []), ...rest),
        )
          .typ({ mod: "poss" })
          .toString()
          .trim();
        if (!text.includes("[[")) variants.add(text);
      } catch {}
    }
    for (const surface of surfaces) {
      emit(surface, []);
      for (const noun of patients)
        for (const det of ["NONE", "a", "the"])
          for (const number of ["s", "p"])
            for (const adj of adjectives) {
              try {
                emit(surface, [np(noun, det, number, adj)]);
                for (const link of links)
                  emit(surface, [PP(P(link), np(noun, det, number, adj))]);
              } catch {}
            }
      for (const primary of primaries)
        for (const noun of results)
          for (const det of ["NONE", "a", "the"])
            for (const number of ["s", "p"])
              for (const adj of adjectives)
                for (const link of links) {
                  try {
                    emit(surface, [
                      Q(primary),
                      PP(P(link), np(noun, det, number, adj)),
                    ]);
                  } catch {}
                }
    }
    const texts = [...variants];
    provenance.plan = {
      patients,
      results,
      primaries,
      links,
      adjectives,
      surfaces,
      candidateCount: texts.length,
    };
    if (!texts.length || texts.length > 2000)
      throw new Error("Invalid candidate count");
    const finalists = new Set<string>();
    for (let i = 0; i < texts.length; i += 200) {
      const batch = texts.slice(i, i + 200);
      const chosen = await ask(`variants_${i}`, state, {
        best: {
          type: "choice",
          instructions:
            "Choose the most grammatical, concrete, plausible first-step suggestion for this request. Do not merely restate the desired outcome or give an incomplete action. Do not invent specific user circumstances. Prefer ordinary clear wording.",
          criteria: Object.fromEntries(batch.map((s, j) => [`c${j}`, s])),
        },
      });
      for (const key of top(chosen.best, 2))
        finalists.add(batch[Number(key.slice(1))]);
    }
    const final = [...finalists];
    const chosen = await ask("final", state, {
      best: {
        type: "choice",
        instructions:
          "Select the most useful, grammatical and concrete first-step suggestion for the request. It must be a means of making progress, not a restatement or an unfinished verb. Select NONE if no candidate qualifies.",
        criteria: {
          ...Object.fromEntries(final.map((s, i) => [`c${i}`, s])),
          NONE: "No candidate is a useful and valid first-step suggestion.",
        },
      },
    });
    result =
      chosen.best.choice === "NONE"
        ? ""
        : final[Number(chosen.best.choice.slice(1))];
  } catch (e) {
    error = (e as Error).message;
  }
  const row = {
    ...c,
    result,
    abstained: !result && !error,
    error,
    provenance,
    requests,
    usage,
    elapsedMs: Math.round(performance.now() - started),
  };
  rows.push(row);
  await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(JSON.stringify({ id: c.id, result, error, requests, usage }));
}
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
