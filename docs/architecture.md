# Application boundaries

```
packages/ui ──HTTP / agent event types──> server
                                         ├── @jot/agent
                                         └── @jot/jev-core
```

- `packages/ui`: React interface, chat persistence, stream event reducer, Codex-style tool activity rows. Only imports agent protocol **types**. No provider client or tool execution.
- `packages/agent`: small provider-independent Pi-style loop. Model returns a tool call or final answer. Validate arguments, execute tool, append result, call model again. Knows no Jev API, concrete application tools, or UI. Shared message/event types live here.
- `packages/jev-core`: TypeSafe transport, typed choices, word composer, vocabulary and inflections. Does not import agent or UI.
- `server`: HTTP validation, credentials, provider usage budget, Jev model adapter, and application tool registration. `jev-agent.ts` converts typed Choice decisions into the generic Model interface. `agent-tools.ts` implements `calculate`, `read_context`, and `compose_reply`.

The reference is pi's `packages/agent/src/agent-loop.ts`: assistant calls → tool results → another assistant turn. We implement only that small lifecycle, not its complete harness/plugin/session framework. There is no pi runtime dependency. The server wires a local LFM2.5-1.2B-Instruct service only into `draft_answer`; Jev retains decision-making and argument generation.

Tools declare names/descriptions/JSON parameters and an executor. Tool names and arguments are selected by Jev; no request-text branch in the core loop. Numeric tool arguments can use previous calculation results, enabling multi-step calls. Every call has an ID paired with its result. Invalid arguments cannot execute; tool errors return to the loop; cancellation and usage/turn limits stop it explicitly.

Tool traces are stored with existing chat messages and replayed on later turns, including failed/interrupted tool-only turns. The browser storage key remains `jev.chats`. The HTTP layer validates replayed traces as client-supplied history; this local application is not an authenticated multi-user server.

UI rows show running/completed/failed/stopped states, concise summaries, and expandable actual arguments/results. Tool-row styling follows the installed Codex desktop activity/disclosure components; see [tool-call UI](tool-call-ui.md). The surrounding chat layout retains its Errand-inspired neutral styling. Provider stream details remain out of the main message flow.

`npm test` includes dependency-boundary checks and all package tests. `npm run build` typechecks each workspace. Agent and Jev-core tests also run independently. Runtime imports use the workspace package exports directly.

This refactor improves the application structure and tool lifecycle. It does not resolve Jev's remaining open-ended text quality limitations.
