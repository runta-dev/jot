# @jot/agent

Minimal provider-independent loop inspired by pi: call the model, execute its tool call, append the tool result, repeat until an answer. No Jev, React, HTTP, or filesystem dependency.

Public contracts are in `src/types.ts`: `Model`, `Tool`, `ToolFactory`, `AgentMessage`, and `AgentEvent`. The application supplies a model adapter and tools. Tools declare string parameters using JSON Schema `oneOf` values and stream optional text updates before returning a result. Arguments are checked before execution. Errors become tool results; cancellation exits immediately. Tool history can be replayed across user turns.

`runAgentLoop(messages, { model, tools, signal, maxTurns, usage })` emits tool calls, results, streamed draft text, final replacement, and termination. The application owns provider usage limits; `BudgetReached` ends the loop with an explicit budget reason.

Run `npm test --workspace=@jot/agent` independently. No API key required.
