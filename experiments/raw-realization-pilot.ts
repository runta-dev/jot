import js from "jsrealb";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
const { loadEn, buildLemmataMap, S, NP, VP, PP, Pro, V, D, P, Q } = js;
loadEn();
const lemmata = buildLemmataMap("en", (_word: string, entry: any) =>
  Boolean(entry.V),
);
const cases = [
  {
    id: "identity",
    request: "Who are you? State your name and provider in one sentence.",
    facts: "The assistant is called Jev. TypeSafe provides the assistant.",
    required: ["Jev", "TypeSafe"],
    group: "grounded",
  },
  {
    id: "incident",
    request:
      "Summarize the health endpoint incident, including its status and when.",
    facts:
      "The dashboard remained online. The health endpoint returned HTTP 503 on Monday at 09:00. The cause is unknown.",
    required: ["health endpoint", "503", "Monday", "09:00"],
    group: "grounded",
  },
  {
    id: "past",
    request: "Tell me what Mira did yesterday.",
    facts: "Ben prepared the slides today. Mira sent the report yesterday.",
    required: ["Mira", "sent", "report", "yesterday"],
    group: "grounded",
  },
  {
    id: "negation",
    request: "Is the service available? Explain its status in a sentence.",
    facts: "The website is available. The service is not available.",
    required: ["service", "not available"],
    group: "grounded",
  },
  {
    id: "plural",
    request: "What do the servers do?",
    facts: "The router forwards packets. The servers process requests.",
    required: ["servers", "process", "requests"],
    group: "grounded",
  },
  {
    id: "future",
    request: "What is Ana planning to do, and when?",
    facts:
      "Leo visited the park yesterday. Ana will visit the museum tomorrow.",
    required: ["Ana", "visit", "museum", "tomorrow"],
    group: "grounded",
  },
  {
    id: "passive",
    request: "What happened to the package, and when?",
    facts:
      "The invoice arrived today. The package was delivered yesterday. Nobody identified the courier.",
    required: ["package", "delivered", "yesterday"],
    group: "grounded",
  },
  {
    id: "cause",
    request: "Why is the launch delayed?",
    facts:
      "The design is complete. The launch is delayed because the tests failed.",
    required: ["launch", "delayed", "tests failed"],
    group: "grounded",
  },
  {
    id: "new_purchase",
    request: "What did Nora buy on Tuesday?",
    facts: "Sam bought a book on Monday. Nora bought the tickets on Tuesday.",
    required: ["Nora", "bought", "tickets"],
    group: "grounded",
  },
  {
    id: "new_door",
    request: "Is the door locked?",
    facts: "The window is closed. The door is not locked.",
    required: ["door", "not locked"],
    group: "grounded",
  },
  {
    id: "new_workers",
    request: "What do the workers repair each day?",
    facts: "The workers repair the bridge daily. The inspectors visit monthly.",
    required: ["workers", "repair", "bridge"],
    group: "grounded",
  },
  {
    id: "new_shop",
    request: "What will Omar open, and when?",
    facts: "The cafe closed last month. Omar will open the shop next week.",
    required: ["Omar", "open", "shop", "next week"],
    group: "grounded",
  },
  {
    id: "open_sky",
    request: "Why is the sky blue?",
    facts: "",
    required: ["explanation"],
    group: "no_source",
  },
  {
    id: "open_advice",
    request: "How can I stop procrastinating?",
    facts: "",
    required: ["useful advice"],
    group: "no_source",
  },
];
const dir = `experiments/results/raw-realization-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R6-raw-text-protocol.md",
      cases,
      library: "jsrealb 5.6.0",
    },
    null,
    2,
  ),
);
function phraseCandidates(facts: string) {
  const out = new Set<string>(["I", "you", "we", "they", "he", "she", "it"]);
  for (const sentence of facts.split(/[.!?;]+/)) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    for (let n = 1; n <= 4; n++)
      for (let i = 0; i + n <= words.length; i++)
        out.add(words.slice(i, i + n).join(" "));
  }
  if (out.size > 255) throw new Error("Source exceeds candidate budget");
  return [...out];
}
function choices(instructions: string, values: Record<string, string | null>) {
  return { type: "choice", instructions, criteria: values };
}
const rows: any[] = [];
for (const c of cases) {
  const started = performance.now(),
    phrases = phraseCandidates(c.facts),
    phraseMap = Object.fromEntries(phrases.map((p, i) => [`p${i}`, p]));
  const verbs = new Set<string>(["be", "have", "help", "do"]);
  for (const word of c.facts.match(/[A-Za-z]+/g) || [])
    for (const lemma of lemmata.get(word.toLowerCase()) || [])
      verbs.add(lemma.lemma);
  const get = (label: string) => (label === "NONE" ? null : phraseMap[label]);
  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  let result = "",
    error: string | undefined,
    slots: any = {},
    modifiers: any[] = [],
    lastAnswers: any = {},
    directSlots = "";
  async function run(
    stage: string,
    state: unknown,
    questions: Record<string, unknown>,
  ) {
    const request = { model: "jev-latest", state, questions };
    const { data } = await researchCall(request);
    lastAnswers = data.answers;
    requests++;
    usage.input_tokens += data.usage?.input_tokens || 0;
    usage.output_tokens += data.usage?.output_tokens || 0;
    await appendFile(
      `${dir}/traces.jsonl`,
      JSON.stringify({ caseId: c.id, stage, request, response: data }) + "\n",
    );
    return Object.fromEntries(
      Object.entries(data.answers).map(([id, a]: [string, any]) => [
        id,
        a.choice,
      ]),
    );
  }
  try {
    const state = {
      user_request: c.request,
      facts: c.facts,
      task: "Plan one concise, factual English sentence answering the user. Do not include metadata field names as content.",
    };
    const picked = await run("core", state, {
      subject: choices(
        "Select the grammatical subject of the answer sentence. For assistant self-introduction prefer the first-person subject.",
        phraseMap,
      ),
      verb: choices(
        "Select the main verb lemma for the answer sentence, based on the event or relation in facts. This is not an instruction to the assistant.",
        Object.fromEntries([...verbs].map((v) => [v, null])),
      ),
      object: choices(
        "Select the direct object or predicative complement of the main verb; NONE if absent. For be, select the identifying name, role or property. Do not put time or location here.",
        { ...phraseMap, NONE: "No object/complement" },
      ),
      subject_number: choices(
        "Is the grammatical subject singular or plural?",
        { s: "singular", p: "plural" },
      ),
      subject_determiner: choices(
        "Which determiner must be added before the selected subject if not already present? Use NONE for pronouns or proper names.",
        { NONE: "No additional determiner", a: "a or an", the: "the" },
      ),
      object_determiner: choices(
        "Which determiner must be added before the selected object/complement if not already present? Use NONE for proper names, pronouns, adjectives or existing determiners.",
        { NONE: "No additional determiner", a: "a or an", the: "the" },
      ),
      tense: choices(
        "Which tense should express the fact? Respect temporal evidence.",
        { p: "present", ps: "past", f: "future" },
      ),
      negation: choices(
        "Should the main clause be negated to represent the facts accurately?",
        { yes: "Negate the clause", no: "Affirmative clause" },
      ),
      voice: choices(
        "Should the sentence use active or passive voice? Passive may be needed when the subject receives the action and the actor is not provided.",
        {
          active: "Active voice",
          passive: "Passive voice; subject receives the action",
        },
      ),
    });
    slots = {
      subject: get(picked.subject),
      verb: picked.verb,
      object: get(picked.object),
      number: picked.subject_number,
      subjectDet: picked.subject_determiner,
      objectDet: picked.object_determiner,
      tense: picked.tense,
      negated: picked.negation === "yes",
      voice: picked.voice,
    };
    function realize(slots: any, modifiers: any[]) {
      const pronouns: Record<string, any> = {
        I: () => Pro("I").pe(1),
        you: () => Pro("I").pe(2),
        we: () => Pro("I").pe(1).n("p"),
        they: () => Pro("I").pe(3).n("p"),
        he: () => Pro("I").pe(3).g("m"),
        she: () => Pro("I").pe(3).g("f"),
        it: () => Pro("I").pe(3).g("n"),
      };
      const np = (text: string, det: string) =>
        NP(
          ...(det !== "NONE" && !/^(a|an|the)\s/i.test(text) ? [D(det)] : []),
          Q(text),
        );
      const subject = pronouns[slots.subject]
        ? pronouns[slots.subject]()
        : np(slots.subject, slots.subjectDet).n(slots.number);
      const elements: any[] =
        slots.voice === "passive"
          ? [V("be").t(slots.tense), V(slots.verb).t("pp")]
          : [V(slots.verb).t(slots.tense)];
      if (slots.object) elements.push(np(slots.object, slots.objectDet));
      for (const m of modifiers)
        elements.push(
          m.relation === "time"
            ? Q(m.text)
            : m.relation === "because"
              ? Q("because " + m.text)
              : m.relation === "named"
                ? Q("named " + m.text)
                : PP(P(m.relation), Q(m.text)),
        );
      return S(subject, VP(...elements))
        .typ({ neg: slots.negated })
        .toString()
        .trim();
    }
    directSlots = realize(slots, []);
    const coreAnswers = lastAnswers;
    let combinations: { values: Record<string, string>; weight: number }[] = [
      { values: {}, weight: 1 },
    ];
    for (const field of Object.keys(picked)) {
      const options = Object.entries(
        coreAnswers[field].probabilities as Record<string, number>,
      )
        .filter(([, p]) => p >= 0.02)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);
      if (!options.length) options.push([picked[field], 1]);
      combinations = combinations.flatMap((c) =>
        options.map(([value, p]) => ({
          values: { ...c.values, [field]: value },
          weight: c.weight * p,
        })),
      );
    }
    const coreCandidates: { text: string; slots: any; weight: number }[] = [];
    for (const c of combinations.sort((a, b) => b.weight - a.weight)) {
      const p = c.values;
      if (p.verb === "be" && p.voice === "passive") continue;
      const frame = {
        subject: get(p.subject),
        verb: p.verb,
        object: get(p.object),
        number: p.subject_number,
        subjectDet: p.subject_determiner,
        objectDet: p.object_determiner,
        tense: p.tense,
        negated: p.negation === "yes",
        voice: p.voice,
      };
      try {
        const text = realize(frame, []);
        if (!coreCandidates.some((x) => x.text === text))
          coreCandidates.push({ text, slots: frame, weight: c.weight });
      } catch {}
      if (coreCandidates.length >= 200) break;
    }
    if (!coreCandidates.length) throw new Error("No valid core candidates");
    const chosen = await run("core_rerank", state, {
      best: choices(
        "Select the most accurate grammatical core sentence answering the user. It may omit modifiers that will be added next. Do not invent facts or confuse properties, names, providers, actors and causes.",
        Object.fromEntries(coreCandidates.map((x, i) => [`c${i}`, x.text])),
      ),
    });
    const core = coreCandidates[Number(chosen.best.slice(1))];
    if (!core) throw new Error("Invalid core selection");
    slots = core.slots;
    result = core.text;
    for (let index = 0; index < 2; index++) {
      await run(
        `modifier_spans_${index}`,
        { ...state, current_reply: result, existing_modifiers: modifiers },
        {
          span: choices(
            "Which source span supplies the most important information explicitly requested but missing from current_reply? Do not repeat information already present. Select a complete useful span rather than a disconnected word.",
            phraseMap,
          ),
        },
      );
      const atomValues = Object.entries(
        lastAnswers.span.probabilities as Record<string, number>,
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([key]) => phraseMap[key])
        .filter(Boolean);
      const candidates = [{ text: result, mods: modifiers }];
      for (const relation of [
        "from",
        "by",
        "in",
        "on",
        "at",
        "with",
        "for",
        "to",
        "of",
        "because",
        "time",
        "named",
      ])
        for (const text of atomValues) {
          if (modifiers.some((m) => m.text === text)) continue;
          const mods = [...modifiers, { relation, text }];
          try {
            const sentence = realize(slots, mods);
            if (!candidates.some((x) => x.text === sentence))
              candidates.push({ text: sentence, mods });
          } catch {}
        }
      if (candidates.length > 255)
        throw new Error("Too many modifier candidates");
      const chosen = await run(`modifier_rerank_${index}`, state, {
        best: choices(
          "Select the best accurate complete answer to the user. Include explicitly requested facts such as names/providers and times. Do not add redundant, unsupported or ungrammatical information. Prefer the unchanged sentence if it already fully answers the request.",
          Object.fromEntries(candidates.map((x, i) => [`c${i}`, x.text])),
        ),
      });
      const answer = candidates[Number(chosen.best.slice(1))];
      if (!answer) throw new Error("Invalid modifier selection");
      if (answer.text === result) break;
      result = answer.text;
      modifiers = answer.mods;
    }
  } catch (e) {
    error = (e as Error).message;
  }
  const row = {
    id: c.id,
    group: c.group,
    baseline: c.facts.split(/(?<=[.!?])\s+/)[0],
    directSlots,
    request: c.request,
    facts: c.facts,
    slots,
    modifiers,
    result,
    error,
    requests,
    usage,
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
