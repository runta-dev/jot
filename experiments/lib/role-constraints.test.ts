import { test } from "node:test";
import assert from "node:assert/strict";
import { isUnambiguouslyLocation } from "./role-constraints.ts";
test("a location under one alternative is not a global constraint", () => {
  assert.equal(
    isUnambiguouslyLocation("project", [
      { reference: "project", choice: "same", confidence: 0.95 },
      { reference: "project", choice: "location", confidence: 0.99 },
    ]),
    false,
  );
});
test("only a common high-confidence location relation can exclude a source", () => {
  assert.equal(
    isUnambiguouslyLocation("desk", [
      { reference: "desk", choice: "location", confidence: 0.95 },
      { reference: "desk", choice: "location", confidence: 0.98 },
    ]),
    true,
  );
  assert.equal(isUnambiguouslyLocation("desk", []), false);
});
