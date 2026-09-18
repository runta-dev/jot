import js from "jsrealb";
import { retrieveConcepts } from "./lib/concepts.ts";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { researchCall } from "./research-api.ts";
const { loadEn, buildLemmataMap, S, NP, VP, PP, Pro, V, N, D, P, Q } = js;
loadEn();
const lemmata = buildLemmataMap("en", (_word: string, entry: any) =>
  Boolean(entry.V),
);
const cases = [
  {
    id: "sky",
    request: "Why is the sky blue?",
    facts: "",
    split: "development",
  },
  {
    id: "procrastination",
    request: "How can I stop procrastinating?",
    facts: "",
    split: "development",
  },
  {
    id: "tired",
    request: "I feel tired after sleeping only four hours. What should I do?",
    facts: "",
    split: "development",
  },
  {
    id: "plant",
    request: "Why do plants need sunlight?",
    facts: "",
    split: "development",
  },
  {
    id: "rust",
    request: "Why does iron rust when exposed to moist air?",
    facts: "",
    split: "development",
  },
  {
    id: "ice",
    request: "Why does ice float on liquid water?",
    facts: "",
    split: "development",
  },
  {
    id: "deadlines",
    request: "How can I keep track of several deadlines?",
    facts: "",
    split: "fresh",
  },
  {
    id: "fall",
    request: "Why does a ball fall when dropped?",
    facts: "",
    split: "fresh",
  },
  {
    id: "reading",
    request: "How can I remember what I read?",
    facts: "",
    split: "fresh",
  },
  {
    id: "drying",
    request: "Why does wet clothing dry?",
    facts: "",
    split: "fresh",
  },
];
const dir = `experiments/results/open-composition-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R8-open-composition-protocol.md",
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
  const started = performance.now();
  const retrieval = await retrieveConcepts(c.request, async (trace) => {
    await appendFile(
      `${dir}/traces.jsonl`,
      JSON.stringify({ caseId: c.id, stage: "concepts", trace }) + "\n",
    );
  });
  const lex = js.getLexicon("en");
  const queryWords = c.request.replace(/[?!.,]/g, "").split(/\s+/);
  const rawPhrases = new Set<string>([
    "I",
    "you",
    "we",
    "they",
    "he",
    "she",
    "it",
    ...retrieval.concepts.N.words,
    ...retrieval.concepts.A.ranked.slice(0, 8).map((x) => x.word),
  ]);
  for (let n = 1; n <= 4; n++)
    for (let i = 0; i + n <= queryWords.length; i++)
      rawPhrases.add(queryWords.slice(i, i + n).join(" "));
  for (const a of retrieval.concepts.A.ranked.slice(0, 3))
    for (const noun of retrieval.concepts.N.ranked.slice(0, 6))
      rawPhrases.add(a.word + " " + noun.word);
  const phrases = [...rawPhrases];
  if (phrases.length > 254) throw new Error("Phrase budget exceeded");
  const phraseMap = Object.fromEntries(phrases.map((p, i) => [`p${i}`, p]));
  const verbs = new Set<string>([
    "be",
    "have",
    "help",
    "do",
    ...retrieval.concepts.V.words,
  ]);
  for (const word of queryWords)
    for (const lemma of lemmata.get(word.toLowerCase()) || [])
      verbs.add(lemma.lemma);
  const get = (label: string) => (label === "NONE" ? null : phraseMap[label]);
  let requests = retrieval.requests;
  const usage = { ...retrieval.usage };
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
      assistant_identity: { name: "Jev", provider: "TypeSafe" },
      source:
        "No source answer is provided. Use your knowledge. Candidate words are possibilities, not asserted facts.",
      task: "Plan one concise, useful and accurate English sentence directly answering the user. It must contain actual answer content, not a vague offer to help or a repetition of the question.",
    };
    const picked = await run("core", state, {
      subject: choices(
        "Select the grammatical subject of the answer sentence. For assistant self-introduction prefer the first-person subject.",
        phraseMap,
      ),
      verb: choices(
        "Select the main verb lemma for the answer sentence, based on the actual action or explanatory process useful for this request. This is not an instruction to the assistant.",
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
        "Which tense should express the fact? Use present for general facts or recommendations unless another tense is needed.",
        { p: "present", ps: "past", f: "future" },
      ),
      negation: choices(
        "Should the main clause be negated to make an accurate answer?",
        { yes: "Negate the clause", no: "Affirmative clause" },
      ),
      modal: choices(
        "Should this answer recommend an action, describe a possibility, or simply state a fact?",
        {
          NONE: "No modality: a factual statement",
          can: "Can: a possible action",
          should: "Should: a recommended action",
        },
      ),
      object_number: choices(
        "Should a bare noun object be singular or plural in this answer?",
        { s: "Singular or mass noun", p: "Plural count noun" },
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
      modal: picked.modal,
      objectNumber: picked.object_number,
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
      const np = (text: string, det: string, number = "s") =>
        NP(
          ...(det !== "NONE" && !/^(a|an|the)\s/i.test(text) ? [D(det)] : []),
          /^[a-z]+$/.test(text) && lex[text]?.N ? N(text).n(number) : Q(text),
        );
      const subject = pronouns[slots.subject]
        ? pronouns[slots.subject]()
        : np(slots.subject, slots.subjectDet).n(slots.number);
      const elements: any[] =
        slots.voice === "passive"
          ? [V("be").t(slots.tense), V(slots.verb).t("pp")]
          : [V(slots.verb).t(slots.tense)];
      if (slots.object)
        elements.push(np(slots.object, slots.objectDet, slots.objectNumber));
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
      const sentence = S(subject, VP(...elements)).typ({
        neg: slots.negated,
        ...(slots.modal === "NONE"
          ? {}
          : { mod: slots.modal === "should" ? "nece" : "poss" }),
      });
      if (slots.modal === "should") sentence.t("ps");
      return sentence.toString().trim();
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
        modal: p.modal,
        objectNumber: p.object_number,
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
      ...new Set([
        ...retrieval.concepts.N.ranked.slice(0, 6).map((x) => x.word),
        ...retrieval.concepts.A.ranked
          .slice(0, 2)
          .flatMap((a) =>
            retrieval.concepts.N.ranked
              .slice(0, 3)
              .map((n) => a.word + " " + n.word),
          ),
      ]),
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
    split: c.split,
    retrieval: {
      requests: retrieval.requests,
      usage: retrieval.usage,
      top: Object.fromEntries(
        Object.entries(retrieval.concepts).map(([pos, value]) => [
          pos,
          value.ranked.slice(0, 8),
        ]),
      ),
    },
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
