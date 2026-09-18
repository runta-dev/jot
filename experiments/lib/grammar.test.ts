import { test } from "node:test";
import assert from "node:assert/strict";
import { realizeFrame, perspectiveVariants } from "./grammar.ts";
const base = {
  subject: "you",
  verb: "use",
  object: "task",
  number: "s",
  subjectDet: "NONE",
  objectDet: "a",
  tense: "p",
  negated: false,
  voice: "active",
  modal: "can",
  objectNumber: "s",
};
test("mass plurals are rejected rather than emitted as error markers", () => {
  assert.throws(() =>
    realizeFrame({ ...base, object: "sunlight", objectNumber: "p" }),
  );
});
test("valid count plurals and first-person agreement remain supported", () => {
  assert.equal(
    realizeFrame({
      ...base,
      subject: "I",
      verb: "have",
      modal: "NONE",
      objectDet: "NONE",
      objectNumber: "p",
    }),
    "I have tasks.",
  );
});
test("passive duplicate complement is rejected without removing a valid passive object", () => {
  assert.throws(() =>
    realizeFrame({
      ...base,
      subject: "the launch",
      verb: "delay",
      object: "delayed",
      voice: "passive",
      modal: "NONE",
    }),
  );
  assert.equal(
    realizeFrame({
      ...base,
      subject: "the child",
      verb: "give",
      object: "book",
      voice: "passive",
      modal: "NONE",
      tense: "ps",
    }),
    "The child was given a book.",
  );
});
test("perspective candidates preserve quoted and code literals", () => {
  assert.deepEqual(perspectiveVariants("what I read"), [
    "what I read",
    "what you read",
  ]);
  assert.deepEqual(perspectiveVariants('"I am" and `my`'), ['"I am" and `my`']);
});
