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
    facts: "name: Jev; provider: TypeSafe; kind: AI assistant",
    required: ["Jev", "TypeSafe"],
  },
  {
    id: "incident",
    request:
      "Summarize the incident in one sentence, including the status and when it happened.",
    facts:
      "entity: the health endpoint; event: returned HTTP 503; day: Monday; time: 09:00; cause: unknown",
    required: ["health endpoint", "503", "Monday", "09:00"],
  },
  {
    id: "past",
    request: "Tell me what Mira did and when, in one sentence.",
    facts: "agent: Mira; action: sent; object: the report; time: yesterday",
    required: ["Mira", "sent", "report", "yesterday"],
  },
  {
    id: "negation",
    request: "Explain the service status in one sentence.",
    facts:
      "entity: the service; property: available; available: false; time: now",
    required: ["service", "not available"],
  },
  {
    id: "plural",
    request: "Describe what the servers do in one sentence.",
    facts:
      "agents: the servers; number: plural; action: process; object: requests; tense: present",
    required: ["servers", "process", "requests"],
  },
  {
    id: "future",
    request: "Describe Ana's plan in one sentence, including when.",
    facts: "agent: Ana; action: visit; object: the museum; time: tomorrow",
    required: ["Ana", "visit", "museum", "tomorrow"],
  },
  {
    id: "passive",
    request: "Summarize what happened to the package in one sentence.",
    facts:
      "entity: the package; action: delivered; time: yesterday; agent: unknown",
    required: ["package", "delivered", "yesterday"],
  },
  {
    id: "cause",
    request: "Explain why the launch is delayed in one sentence.",
    facts:
      "entity: the launch; status: delayed; reason: the tests failed; time: now",
    required: ["launch", "delayed", "tests failed"],
  },
];
cases.push(
  {
    id: "fresh_purchase",
    request: "Say what Nora did and when in one sentence.",
    facts: "agent: Nora; action: bought; object: the tickets; day: Tuesday",
    required: ["Nora", "bought", "tickets", "Tuesday"],
  },
  {
    id: "fresh_door",
    request: "Explain whether the door is locked in one sentence.",
    facts: "entity: the door; property: locked; locked: false; time: now",
    required: ["door", "not locked"],
  },
  {
    id: "fresh_workers",
    request: "Describe the workers' routine, including how often.",
    facts:
      "agents: the workers; number: plural; action: repair; object: the bridge; frequency: daily; tense: present",
    required: ["workers", "repair", "bridge", "daily"],
  },
  {
    id: "fresh_shop",
    request: "Describe Omar's plan and when it will happen.",
    facts: "agent: Omar; action: open; object: the shop; time: next week",
    required: ["Omar", "open", "shop", "next week"],
  },
);
const dir = `experiments/results/joint-realization-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R5.1-joint-realization-protocol.md",
      cases,
      library: "jsrealb 5.6.0",
    },
    null,
    2,
  ),
);
function phraseCandidates(facts: string) {
  const out = new Set<string>(["I", "you", "we", "they", "he", "she", "it"]);
  for (const field of facts.split(";")) {
    const value = field.slice(field.indexOf(":") + 1).trim();
    const words = value.split(/\s+/);
    for (let n = 1; n <= 4; n++)
      for (let i = 0; i + n <= words.length; i++)
        out.add(words.slice(i, i + n).join(" "));
  }
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
    lastAnswers: any = {};
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
    const atomValues = [
      ...new Set(
        c.facts.split(";").map((f) => f.slice(f.indexOf(":") + 1).trim()),
      ),
    ];
    for (let index = 0; index < 2; index++) {
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
