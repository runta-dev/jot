import { test } from "node:test";
import assert from "node:assert/strict";
import {
  criteria,
  parseMessages,
  question,
  isRepetition,
  parseChoice,
  generateReply,
  END,
  type Message,
} from "./jev.ts";
test("choice alphabet covers printable ASCII, newline and an explicit end", () => {
  assert.equal(Object.keys(criteria).length, 97);
  for (let i = 32; i <= 126; i++)
    assert.ok(Object.hasOwn(criteria, String.fromCharCode(i)));
  assert.ok(Object.hasOwn(criteria, "\n"));
  assert.ok(Object.hasOwn(criteria, "<EOS>"));
});
test("request state preserves prior assistant messages and the exact current prefix", () => {
  const messages = [
    { role: "user" as const, content: "Hello" },
    { role: "assistant" as const, content: "Hi" },
    { role: "user" as const, content: "Who are you?" },
  ];
  const request = question(messages, "I am ");
  assert.deepEqual(request.state.conversation, messages);
  assert.equal(request.state.assistant_reply_so_far, "I am ");
  assert.deepEqual(Object.keys(request.questions), ["next"]);
});
test("actual loop carries every chosen character into the next request and stops on EOS", async () => {
  const seen: string[] = [];
  const history = [{ role: "user" as const, content: "Say hi." }];
  const events = [];
  const predict = async (_key: string, messages: Message[], prefix: string) => {
    assert.deepEqual(messages, history);
    seen.push(prefix);
    return {
      choice: ["H", "i", END][seen.length - 1],
      confidence: 1,
      alternatives: [],
    };
  };
  for await (const event of generateReply(
    "test",
    history,
    new AbortController().signal,
    predict,
  ))
    events.push(event);
  assert.deepEqual(seen, ["", "H", "Hi"]);
  assert.deepEqual(
    events.map((e) => e.type),
    ["character", "character", "done"],
  );
  assert.equal(
    events.at(-1)?.type === "done" &&
      (events.at(-1) as { reason: string }).reason,
    "complete",
  );
});
test("stop cancels the loop before it can request another character", async () => {
  const controller = new AbortController();
  let calls = 0;
  const iterator = generateReply(
    "test",
    [{ role: "user", content: "hi" }],
    controller.signal,
    async () => {
      calls++;
      return { choice: "H", confidence: 1, alternatives: [] };
    },
  );
  await iterator.next();
  controller.abort();
  await assert.rejects(iterator.next());
  assert.equal(calls, 1);
});
test("invalid upstream selections are rejected", () => {
  assert.throws(() => parseChoice({ answers: {} }));
  assert.throws(() =>
    parseChoice({ answers: { next: { type: "choice", choice: "hello" } } }),
  );
  assert.equal(
    parseChoice({ answers: { next: { type: "choice", choice: END } } }).choice,
    END,
  );
});
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

test("repetition guard stops degenerate output without clipping normal words", () => {
  for (const text of ["Hello", "bookkeeper", "Hiii", "Paris", "a b c"])
    assert.equal(isRepetition(text), false);
  for (const text of ["Hloooooo", "Hi    ", "abcabcabcabc", "Hello\n\n\n"])
    assert.equal(isRepetition(text), true);
});
