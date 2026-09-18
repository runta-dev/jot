import {
  readFile,
  mkdir,
  writeFile,
  appendFile,
  copyFile,
} from "node:fs/promises";
import { researchCall } from "./research-api.ts";
const cases = [
  {
    id: "ice",
    question: "Why does ice float on liquid water?",
    group: "factual",
  },
  {
    id: "oil",
    question: "Why does vegetable oil float on water?",
    group: "factual",
  },
  {
    id: "copper",
    question: "Why is copper more useful than rubber for electrical wiring?",
    group: "factual",
  },
  {
    id: "diamond",
    question: "Why can diamond scratch glass?",
    group: "factual",
  },
  {
    id: "light",
    question:
      "Compare blue light with red light on the physical quantity that distinguishes their colors.",
    group: "factual",
  },
  {
    id: "honey",
    question: "Why does honey flow more slowly than water at room temperature?",
    group: "factual",
  },
  {
    id: "aluminum",
    question: "Does aluminum have a higher or lower density than lead?",
    group: "factual",
  },
  {
    id: "graphite",
    question: "Compare diamond and graphite in hardness.",
    group: "factual",
  },
  {
    id: "unknown_samples",
    question:
      "Does sample A have a higher density than sample B? No composition or measurements are available.",
    group: "unknown",
  },
  {
    id: "fictional",
    question:
      "Compare flarn and zorbium in density. These are fictional materials with no specified properties.",
    group: "unknown",
  },
];
const bank: any[] = [];
for (const line of (
  await readFile("node_modules/wordnet-db/dict/data.noun", "utf8")
).split("\n")) {
  if (!/^\d{8} /.test(line)) continue;
  const at = line.indexOf("|"),
    f = line.slice(0, at).trim().split(/\s+/);
  if (![7, 19, 23].includes(Number(f[1]))) continue;
  const count = parseInt(f[3], 16);
  bank.push({
    id: "s" + f[0],
    aliases: Array.from({ length: count }, (_, i) =>
      f[4 + 2 * i].replaceAll("_", " "),
    ),
    definition: line
      .slice(at + 1)
      .trim()
      .split('; "')[0],
  });
}
const dir = `experiments/results/typed-comparison-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await copyFile("node_modules/wordnet-db/LICENSE", `${dir}/WORDNET-LICENSE.txt`);
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R13-typed-comparison-protocol.md",
      cases,
      propertyBank: bank,
    },
    null,
    2,
  ),
);
const rows: any[] = [];
for (const c of cases) {
  const start = performance.now();
  let requests = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };
  let entities: any = {},
    property: any = null,
    direction = "",
    result = "",
    error: string | undefined;
  async function call(stage: string, state: unknown, questions: unknown) {
    const request = { model: "jev-latest", state, questions };
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
  try {
    const spans = new Set<string>();
    for (const sentence of c.question.split(/[?!.;]/)) {
      const w = sentence.trim().split(/\s+/).filter(Boolean);
      for (let n = 1; n <= 4; n++)
        for (let i = 0; i + n <= w.length; i++)
          spans.add(w.slice(i, i + n).join(" "));
    }
    const list = [...spans];
    if (list.length > 255) throw new Error("Entity candidate budget exceeded");
    const ent = await call(
      "entities",
      { user_question: c.question },
      {
        target: {
          type: "choice",
          instructions:
            "Select the first whole entity whose property should be compared. Keep necessary modifiers; do not select a constituent material instead of the whole object being asked about.",
          criteria: Object.fromEntries(list.map((s, i) => ["e" + i, s])),
        },
        reference: {
          type: "choice",
          instructions:
            "Select the second/reference entity against which the target is compared.",
          criteria: Object.fromEntries(list.map((s, i) => ["e" + i, s])),
        },
      },
    );
    entities = {
      target: list[Number(ent.target.choice.slice(1))],
      reference: list[Number(ent.reference.choice.slice(1))],
    };
    if (!entities.target || !entities.reference)
      throw new Error("Invalid entity");
    const state = {
      user_question: c.question,
      entities,
      task: "Identify a scalar/ordered property whose comparison answers or explains this question. Candidate definitions describe properties, not facts about these particular entities.",
    };
    const finalists = new Map<string, any>();
    const groups: any[][] = [];
    for (let i = 0; i < bank.length; i += 64)
      groups.push(bank.slice(i, i + 64));
    for (let i = 0; i < groups.length; i += 12) {
      const chunk = groups.slice(i, i + 12);
      const a = await call(
        `properties_${i}`,
        state,
        Object.fromEntries(
          chunk.map((items, j) => [
            "g" + j,
            {
              type: "choice",
              instructions:
                "Select the most relevant ordered property in this set for comparing these entities in the user question. Prefer an actual property rather than the observed outcome itself.",
              criteria: Object.fromEntries(
                items.map((p) => [
                  p.id,
                  p.aliases.join(" / ") + ": " + p.definition,
                ]),
              ),
            },
          ]),
        ),
      );
      chunk.forEach((items, j) => {
        for (const [id] of Object.entries(
          a["g" + j].probabilities as Record<string, number>,
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)) {
          const p = items.find((x) => x.id === id);
          if (p) finalists.set(id, p);
        }
      });
    }
    if (finalists.size > 254) throw new Error("Property finalist limit");
    const a = await call("property", state, {
      property: {
        type: "choice",
        instructions:
          "Which available scalar property best answers the comparison question? Choose NONE if no meaningful ordered comparison can be made.",
        criteria: {
          ...Object.fromEntries(
            [...finalists].map(([id, p]) => [
              id,
              p.aliases.join(" / ") + ": " + p.definition,
            ]),
          ),
          NONE: "No appropriate scalar comparison property.",
        },
      },
    });
    property = finalists.get(a.property.choice);
    if (!property) {
      direction = "unknown";
      result = "Insufficient information for this comparison.";
    } else {
      const answer = await call(
        "relation",
        { user_question: c.question, entities, property },
        {
          direction: {
            type: "choice",
            instructions:
              "Under ordinary conditions, how does the target compare with the reference on this property? Use reliable knowledge or supplied measurements. Do not infer a direction for unspecified or fictional materials, and do not merely agree with a suggested premise.",
            criteria: {
              lower: "Target has a lower value than reference.",
              equal: "Values are equal for the comparison.",
              higher: "Target has a higher value than reference.",
              unknown: "Insufficient knowledge or data; no reliable direction.",
            },
          },
          term: {
            type: "choice",
            instructions:
              "Choose the most natural property name for an English quantitative comparison.",
            criteria: Object.fromEntries(
              property.aliases.map((w, i) => ["t" + i, w]),
            ),
          },
        },
      );
      direction = answer.direction.choice;
      const term = property.aliases[Number(answer.term.choice.slice(1))];
      if (!term || !["lower", "equal", "higher", "unknown"].includes(direction))
        throw new Error("Invalid relation");
      result =
        direction === "unknown"
          ? "Insufficient information for this comparison."
          : `The ${term} of ${entities.target} is ${direction === "equal" ? "equal to" : direction + " than"} that of ${entities.reference}.`;
    }
  } catch (e) {
    error = (e as Error).message;
  }
  const row = {
    ...c,
    entities,
    property,
    direction,
    result,
    error,
    requests,
    usage,
    elapsedMs: Math.round(performance.now() - start),
  };
  rows.push(row);
  await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(
    JSON.stringify({
      id: c.id,
      entities,
      property: property?.aliases,
      direction,
      result,
      error,
      requests,
      usage,
    }),
  );
}
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
