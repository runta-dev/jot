import { test } from "node:test";
import assert from "node:assert/strict";
import { repairDraft } from "./editor.ts";
test("one-character replies never send an empty position Choice", async () => {
  let calls = 0;
  const result = await repairDraft(
    {
      id: "one",
      draft: "4",
      instruction: "Return one number.",
      context: "The answer is four.",
    },
    async () => {},
    async (request: unknown) => {
      calls++;
      const questions = (request as any).questions;
      for (const value of Object.values(questions) as any[])
        assert.ok(
          Object.keys(value.criteria).length >= 1 &&
            Object.keys(value.criteria).length <= 255,
        );
      assert.equal(questions.transpose, undefined);
      assert.equal(questions.action.criteria.transpose, undefined);
      return {
        data: {
          answers: {
            action: { choice: "unchanged", probabilities: { unchanged: 1 } },
          },
          usage: { input_tokens: 0, output_tokens: 0 },
        },
        attempts: 1,
      };
    },
  );
  assert.equal(result.selected, "4");
  assert.equal(result.error, undefined);
  assert.equal(calls, 1);
});
test("invalid empty drafts fail before any API request", async () => {
  let called = false;
  await assert.rejects(
    repairDraft(
      { id: "empty", draft: "", instruction: "Reply.", context: "" },
      async () => {},
      async () => {
        called = true;
        throw new Error("Unexpected call");
      },
    ),
  );
  assert.equal(called, false);
});
