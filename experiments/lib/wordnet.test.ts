import { test } from "node:test";
import assert from "node:assert/strict";
import { verbSenses } from "./wordnet.ts";
test("shared synsets retain lemma-specific frame applicability", async () => {
  const m = await verbSenses();
  assert.deepEqual(
    m.get("stretch")?.find((s) => s.offset === "00027261")?.frames,
    [8, 2],
  );
  assert.deepEqual(
    m.get("extend")?.find((s) => s.offset === "00027261")?.frames,
    [8],
  );
});
test("examples distinguish the decay sense from an underspecified gloss", async () => {
  const m = await verbSenses();
  const decay = m.get("decompose")?.find((s) => s.lemmas.includes("rot"));
  assert.equal(decay?.definition, "break down");
  assert.ok(decay?.examples.some((x) => x.includes("bodies")));
});
test("card lookup uses verb senses rather than the flashcard noun", async () => {
  const m = await verbSenses();
  assert.equal(m.get("card")?.length, 2);
  assert.ok(m.get("card")?.some((s) => s.definition.includes("fibers")));
  assert.ok(
    m.get("card")?.some((s) => s.definition.includes("identification")),
  );
});
