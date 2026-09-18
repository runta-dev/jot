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
const dir = `experiments/results/realization-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R5-realization-protocol.md",
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
    modifiers: any[] = [];
  async function run(
    stage: string,
    state: unknown,
    questions: Record<string, unknown>,
  ) {
    const request = { model: "jev-latest", state, questions };
    const { data } = await researchCall(request);
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
    for (let index = 0; index < 2; index++) {
      const modifier = await run(
        `modifier_${index}`,
        { ...state, planned_core: slots, existing_modifiers: modifiers },
        {
          relation: choices(
            "Choose the relation of the next additional piece of information necessary to answer the request. Do not repeat the core or an existing modifier. NONE if no additional information is required.",
            {
              NONE: "Nothing else required",
              from: "origin/provider/source",
              by: "agent or means",
              in: "location or period",
              on: "day/date or surface",
              at: "specific time or place",
              with: "accompaniment/instrument",
              for: "purpose/beneficiary",
              to: "destination/recipient",
              because: "cause/reason",
              time: "A bare time expression such as yesterday or tomorrow",
            },
          ),
          value: choices(
            "Choose the next required extra information not already in planned_core or existing_modifiers. This will be attached as a modifier; preserve the original facts.",
            { ...phraseMap, NONE: "No extra information" },
          ),
        },
      );
      if (modifier.relation === "NONE" || modifier.value === "NONE") break;
      modifiers.push({
        relation: modifier.relation,
        text: get(modifier.value),
      });
    }
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
            : PP(P(m.relation), Q(m.text)),
      );
    result = S(subject, VP(...elements))
      .typ({ neg: slots.negated })
      .toString()
      .trim();
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
