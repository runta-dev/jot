import { researchCall } from "../research-api.ts";
const alphabet =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?;:'\"-";
const functionWords =
  "a an the I you we they he she it am is are was were be been being have has had do does did can could will would should to of in on at for from by with and or but not".split(
    " ",
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
export async function repairDraft(
  c: { id: string; draft: string; instruction: string; context: string },
  onTrace: (trace: unknown) => Promise<void> = async () => {},
  call = researchCall,
) {
  const draft = c.draft,
    started = performance.now();
  if (!draft || draft.length > 200)
    throw new Error("Experimental editor requires 1–200 characters.");
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
  const availableActions = Object.fromEntries(
    Object.entries(actions).filter(
      ([key]) => !locations[key] || locations[key].length > 0,
    ),
  );
  const questions: Record<string, unknown> = {
    action: {
      type: "choice",
      instructions:
        "Identify the single minimal editing action needed to make draft satisfy instruction and context. Do not improve style or rewrite already correct text. Choose unchanged when no actual mistake exists.",
      criteria: availableActions,
    },
  };
  for (const [action, items] of Object.entries(locations).filter(
    ([, items]) => items.length > 0,
  ))
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
    const first = await call(request);
    requests++;
    usage.input_tokens += first.data.usage?.input_tokens || 0;
    usage.output_tokens += first.data.usage?.output_tokens || 0;
    await onTrace({
      caseId: c.id,
      stage: "localize",
      request,
      response: first.data,
    });
    action = first.data.answers?.action?.choice;
    if (!Object.hasOwn(availableActions, action))
      throw new Error("Invalid action");
    const retainedActions = Object.entries(
      first.data.answers.action.probabilities as Record<string, number>,
    )
      .filter(([key]) => Object.hasOwn(availableActions, key))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key]) => key);
    proposals.push(draft.replace(/ {2,}/g, " "));
    for (const action of retainedActions) {
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
    }
    proposals = [...new Set(proposals)].filter(Boolean);
    async function select(options: string[]) {
      const request = {
        model: "jev-latest",
        state: { draft, instruction: c.instruction, context: c.context },
        questions: {
          best: {
            type: "choice",
            instructions:
              "Select the minimal valid correction. Preserve meaning, facts, literal strings, and formatting requirements. Leave the original draft unchanged if it is already correct, or if no proposed edit fixes its actual error.",
            criteria: Object.fromEntries(
              options.map((p, i) => [`option_${i}`, p]),
            ),
          },
        },
      };
      const second = await call(request);
      requests++;
      usage.input_tokens += second.data.usage?.input_tokens || 0;
      usage.output_tokens += second.data.usage?.output_tokens || 0;
      await onTrace({
        caseId: c.id,
        stage: "select",
        request,
        response: second.data,
      });
      const winner =
        request.questions.best.criteria[second.data.answers?.best?.choice];
      if (typeof winner !== "string") throw new Error("Invalid final choice");
      return winner;
    }
    if (proposals.length > 255) {
      const winners = [draft];
      const edits = proposals.filter((p) => p !== draft);
      for (let i = 0; i < edits.length; i += 200)
        winners.push(await select([draft, ...edits.slice(i, i + 200)]));
      selected = await select([...new Set(winners)]);
    } else if (proposals.length > 1) selected = await select(proposals);
  } catch (e) {
    error = (e as Error).message;
  }
  return {
    selected,
    action,
    proposals,
    requests,
    usage,
    elapsedMs: Math.round(performance.now() - started),
    error,
  };
}
