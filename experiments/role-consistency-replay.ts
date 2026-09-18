import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { isUnambiguouslyLocation } from "./lib/role-constraints.ts";
import { researchCall } from "./research-api.ts";
import { userReference } from "./lib/user-reference.ts";
const source = "experiments/results/binding-replay-2026-09-18T06-00-35-955Z",
  plans = "experiments/results/sense-advice-2026-09-18T05-43-39-184Z";
const rows0 = JSON.parse(await readFile(`${source}/summary.json`, "utf8")).rows;
const plans0 = JSON.parse(await readFile(`${plans}/summary.json`, "utf8")).rows;
const traces = (await readFile(`${source}/traces.jsonl`, "utf8"))
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const dir = `experiments/results/role-consistency-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      protocol: "research/R12.2-role-consistency-protocol.md",
      source,
      plans,
      threshold: 0.85,
    },
    null,
    2,
  ),
);
const rows: any[] = [];
for (const old of rows0) {
  const plan = plans0.find((x: any) => x.id === old.id),
    final = traces.find((x: any) => x.id === old.id && x.stage === "final");
  if (!final) {
    rows.push({ ...old, error: "Missing baseline final" });
    continue;
  }
  const questions: any = {},
    pairs: any[] = [];
  for (const mention of plan.provenance.plan.primaries)
    for (const patient of plan.provenance.plan.patients.slice(0, 2)) {
      let reference;
      try {
        reference = userReference(mention, plan.question);
      } catch {
        continue;
      }
      const key = `r${pairs.length}`;
      pairs.push({ key, mention, reference, patient });
      questions[key] = {
        type: "choice",
        instructions: `In the intended action, how does source mention ${JSON.stringify(mention)} relate to the actual patient ${JSON.stringify(patient)}? Interpret the user goal and chosen verb sense. Do not equate a collection with its location/container, or a noun with an action involving it.`,
        criteria: {
          same: "It denotes the patient itself.",
          location:
            "It is where the patient is located, or its container, not the patient itself.",
          owner: "It denotes the owner of the patient.",
          topic: "It is subject matter/content related to the patient.",
          unusable: "It is not a usable entity reference for this role.",
        },
      };
    }
  let requests = 0,
    result = "",
    error: string | undefined;
  const usage = { input_tokens: 0, output_tokens: 0 };
  let judgements: any[] = [],
    excluded: string[] = [];
  async function call(stage: string, request: unknown) {
    const { data } = await researchCall(request);
    requests++;
    usage.input_tokens += data.usage.input_tokens;
    usage.output_tokens += data.usage.output_tokens;
    await appendFile(
      `${dir}/traces.jsonl`,
      JSON.stringify({ id: old.id, stage, request, response: data }) + "\n",
    );
    return data;
  }
  try {
    const roles = await call("roles", {
      model: "jev-latest",
      state: {
        user_request: plan.question,
        action: plan.verb,
        sense: plan.sense,
      },
      questions,
    });
    judgements = pairs.map((p) => ({ ...p, ...roles.answers[p.key] }));
    const criteria = { ...final.request.questions.best.criteria };
    for (const [id, text] of Object.entries(criteria) as [string, string][]) {
      if (id === "NONE") continue;
      if (
        judgements.some(
          (j) =>
            isUnambiguouslyLocation(j.reference, judgements) &&
            plan.provenance.plan.surfaces.some((v: string) =>
              text
                .toLowerCase()
                .startsWith(`You can ${v} ${j.reference}`.toLowerCase()),
            ),
        )
      ) {
        excluded.push(text);
        delete criteria[id];
      }
    }
    const request = {
      ...final.request,
      state: {
        ...final.request.state,
        patient_hypotheses: plan.provenance.plan.patients,
        result_hypotheses: plan.provenance.plan.results,
        reference_relations: judgements.map(
          ({ reference, patient, choice, confidence }) => ({
            reference,
            patient,
            relation: choice,
            confidence,
          }),
        ),
      },
      questions: {
        best: {
          ...final.request.questions.best,
          criteria,
          instructions:
            final.request.questions.best.instructions +
            " Respect the semantic roles: do not replace the things being acted on with their container or location merely to repeat words from the user question.",
        },
      },
    };
    const data = await call("final", request);
    const chosen = data.answers.best.choice;
    result = chosen === "NONE" ? "" : criteria[chosen];
    if (result === undefined) throw new Error("Invalid final choice");
  } catch (e) {
    error = (e as Error).message;
  }
  const row = {
    id: old.id,
    baseline: old.result,
    result,
    error,
    judgements,
    excluded,
    requests,
    usage,
  };
  rows.push(row);
  await appendFile(`${dir}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(
    JSON.stringify({
      id: old.id,
      baseline: old.result,
      result,
      error,
      excluded: excluded.length,
    }),
  );
}
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify({ directory: dir, rows }, null, 2) + "\n",
);
console.log("Saved " + dir);
