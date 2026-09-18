import {test} from "node:test";
import assert from "node:assert/strict";
import {parseMessages} from "./messages.ts";
test("server rejects invalid and unbounded input", () => {
  for (const input of [
    null,
    [],
    [{ role: "system", content: "x" }],
    [{ role: "user", content: "" }],
    [{ role: "user", content: "x".repeat(4001) }],
    [{ role: "assistant", content: "hello" }],
    Array(41).fill({ role: "user", content: "hi" }),
  ])
    assert.throws(() => parseMessages(input));
  assert.deepEqual(parseMessages([{ role: "user", content: "你好" }]), [
    { role: "user", content: "你好" },
  ]);
});
