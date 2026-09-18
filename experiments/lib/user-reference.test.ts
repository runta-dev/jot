import { test } from "node:test";
import assert from "node:assert/strict";
import { userReference } from "./user-reference.ts";
test("user-owned possession changes with speaker", () => {
  assert.equal(
    userReference("my cluttered desk", "How can I tidy my cluttered desk?"),
    "your cluttered desk",
  );
});
test("quoted first person is not assumed to belong to the user", () => {
  assert.throws(() => userReference("my keys", 'Alice said "I lost my keys".'));
  assert.throws(() => userReference("I", "Return `I` exactly."));
});
test("mixed quoted and unquoted occurrence is not guessed", () => {
  assert.throws(() =>
    userReference("my keys", 'I wrote "my keys" about my keys.'),
  );
});

test("normalized first-person spans need exact provenance", () => {
  assert.throws(() => userReference("my desk", 'Alice said \"my, desk\".'));
});
