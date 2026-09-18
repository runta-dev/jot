import js from "jsrealb";
import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
import { userReference } from "./lib/user-reference.ts";
const { S, Pro, VP, V, NP, N, A, D, P, PP, Q } = js;
js.loadEn();
js.setExceptionOnWarning(true);
const lex = js.getLexicon("en");
const source = "experiments/results/sense-advice-2026-09-18T05-43-39-184Z";
const cases = JSON.parse(await readFile(`${source}/summary.json`, "utf8")).rows;
const traces = (await readFile(`${source}/traces.jsonl`, "utf8"))
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const dir = `experiments/results/binding-replay-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R12.1-binding-replay-protocol.md",
      source,
      caseIds: cases.map((r: any) => r.id),
    },
    null,
    2,
  ),
);
const rows: any[] = [];
for (const c of cases) {
  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  const started = performance.now();
  let result = "",
    error: string | undefined;
  let candidateCount = 0;
  try {
    const binding = traces.find(
      (t: any) => t.id === c.id && t.trace.stage === "participants",
    ).trace.response.answers;
    const top = (a: any, n: number) =>
      Object.entries(a.probabilities as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k]) => k);
    const patients = top(binding.patient, 4),
      results = top(binding.result, 2),
      links = c.provenance.plan.links,
      adjectives = c.provenance.plan.adjectives,
      surfaces = c.provenance.plan.surfaces;
    const primaries = new Set<string>();
    for (const text of c.provenance.plan.primaries) {
      try {
        const ref = userReference(text, c.question);
        primaries.add(ref);
        if (lex[ref]?.N?.cnt === "yes") primaries.add("a " + ref);
      } catch {}
    }
    function np(noun: string, det: string, number: string, adj: string | null) {
      if (lex[noun]?.N?.cnt === "no" && number === "p")
        throw new Error("Mass plural");
      return NP(
        ...(det === "NONE" ? [] : [D(det)]),
        ...(adj ? [A(adj)] : []),
        N(noun).n(number),
      );
    }
    for (const noun of patients) {
      for (const [det, number] of [
        ["a", "s"],
        ["NONE", "p"],
        ["NONE", "s"],
      ]) {
        try {
          primaries.add(np(noun, det, number, null).realize());
        } catch {}
      }
    }
    const intoAllowed =
      /\b(into|parts?|components?|separat\w*|divid\w*|categor\w*|classif\w*|arrang\w*|group\w*|transform\w*|convert\w*|split\w*)\b/i.test(
        c.sense.definition,
      );
    const variants = new Set<string>();
    function emit(surface: string, rest: any[]) {
      try {
        const [verb, particle] = surface.split(" ");
        const text = S(
          Pro("I").pe(2),
          VP(V(verb), ...(particle ? [Q(particle)] : []), ...rest),
        )
          .typ({ mod: "poss" })
          .realize()
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
                  if (link === "into" && !intoAllowed) continue;
                  try {
                    emit(surface, [
                      Q(primary),
                      PP(P(link), np(noun, det, number, adj)),
                    ]);
                  } catch {}
                }
    }
    const texts = [...variants];
    candidateCount = texts.length;
    if (!texts.length || texts.length > 4000)
      throw new Error("Candidate budget exceeded");
    async function ask(stage: string, questions: unknown) {
      const request = {
        model: "jev-latest",
        state: { user_request: c.question, action: c.verb, sense: c.sense },
        questions,
      };
      const { data } = await researchCall(request);
      requests++;
      usage.input_tokens += data.usage.input_tokens;
      usage.output_tokens += data.usage.output_tokens;
      await appendFile(
        `${dir}/traces.jsonl`,
        JSON.stringify({ id: c.id, stage, request, response: data }) + "\n",
      );
      return data.answers;
    }
    const groups: string[][] = [];
    for (let i = 0; i < texts.length; i += 200)
      groups.push(texts.slice(i, i + 200));
    const finalists = new Set<string>();
    for (let start = 0; start < groups.length; start += 8) {
      const chunk = groups.slice(start, start + 8);
      const answers = await ask(
        `groups_${start}`,
        Object.fromEntries(
          chunk.map((batch, i) => [
            `g${i}`,
            {
              type: "choice",
              instructions:
                "Choose the most grammatical, concrete, plausible first-step suggestion for this request. Do not merely restate the desired outcome or give an incomplete action. Do not invent specific user circumstances. Prefer ordinary clear wording.",
              criteria: Object.fromEntries(batch.map((s, j) => [`c${j}`, s])),
            },
          ]),
        ),
      );
      chunk.forEach((batch, i) => {
        for (const k of top(answers[`g${i}`], 2))
          finalists.add(batch[Number(k.slice(1))]);
      });
    }
    const final = [...finalists];
    const answer = await ask("final", {
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
      answer.best.choice === "NONE"
        ? ""
        : final[Number(answer.best.choice.slice(1))];
  } catch (e) {
    error = (e as Error).message;
  }
  const row = {
    id: c.id,
    split: c.split,
    question: c.question,
    baseline: c.result,
    result,
    error,
    candidateCount,
    requests,
    usage,
    cachedUsage: c.usage,
    elapsedMs: Math.round(performance.now() - started),
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
