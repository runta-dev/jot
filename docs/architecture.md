# Application boundaries

```
packages/ui ──HTTP / agent event types──> server
                                         ├── @jev-chat/agent
                                         └── @jev-chat/jev-core
```

- `packages/ui`: React interface, chat persistence, stream event reducer, Errand-inspired tool activity rows. Only imports agent protocol **types**. No provider client or tool execution.
- `packages/agent`: small provider-independent Pi-style loop. Model returns a tool call or final answer. Validate arguments, execute tool, append result, call model again. Knows no Jev API, concrete application tools, or UI. Shared message/event types live here.
- `packages/jev-core`: TypeSafe transport, typed choices, word composer, vocabulary and inflections. Does not import agent or UI.
- `server`: HTTP validation, credentials, provider usage budget, Jev model adapter, and application tool registration. `jev-agent.ts` converts typed Choice decisions into the generic Model interface. `agent-tools.ts` implements `calculate`, `read_context`, and `compose_reply`.

The reference is pi's `packages/agent/src/agent-loop.ts`: assistant calls → tool results → another assistant turn. We implement only that small lifecycle, not its complete harness/plugin/session framework. No pi runtime dependency or second model was added.

Tools declare names/descriptions/JSON parameters and an executor. Tool names and arguments are selected by Jev; no request-text branch in the core loop. Numeric tool arguments can use previous calculation results, enabling multi-step calls. Every call has an ID paired with its result. Invalid arguments cannot execute; tool errors return to the loop; cancellation and usage/turn limits stop it explicitly.

Tool traces are stored with existing chat messages and replayed on later turns, including failed/interrupted tool-only turns. The browser storage key remains `jev.chats`. The HTTP layer validates replayed traces as client-supplied history; this local prototype is not an authenticated multi-user server.

UI rows show running/completed/failed/stopped states, concise summaries, and expandable actual arguments/results. Styling references `errand-website/components/Demo.tsx` (`agent-updates`, `update-list`) and its neutral border/typography system. Provider stream details remain out of the main message flow.

`npm test` includes dependency-boundary checks and all package tests. `npm run build` typechecks each workspace. Agent and Jev-core tests also run independently. A few `server/*.ts` re-export files preserve recorded research import paths; they contain no alternate runtime implementation.

This refactor improves the application structure and tool lifecycle. It does not resolve Jev's remaining open-ended text quality limitations.
