<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="packages/ui/public/brand/jot-wordmark-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="packages/ui/public/brand/jot-wordmark.svg">
  <img src="packages/ui/public/brand/jot-wordmark.svg" alt="Jot" width="220" height="80">
</picture>

### The first general-purpose System One agent

Jev picks the next move. Jot runs the loop.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Powered by Jev](https://img.shields.io/badge/powered_by-Jev-c66a2b?style=flat-square)](https://typesafe.ai/)

[Quick start](#quick-start) · [The loop](#the-loop) · [Packages](#packages)

</div>

<img src="docs/assets/divider.svg" alt="" width="100%" height="1">

## Introducing Jot

Jot is a small chat agent built around [TypeSafe’s Jev](https://typesafe.ai/). Jev selects tools and their arguments, reads the results, and decides what to do next. A minimal interface shows the conversation and the actual tool calls.

Jev controls decisions and tool arguments. Calculations run in code; `draft_message` uses a local LFM2.5-1.2B-Instruct model to write the answer from conversation and tool evidence. Other text parameters still use the existing Jev generator. See [local draft setup](docs/local-draft.md).

## The loop

```text
User message
    ↓
Jev chooses a tool + arguments
    ↓
Execute → append tool result → ask Jev again
    ↓
Reply when ready
```

For example, a two-step calculation can produce this trace:

```text
You: Add 6 and 7, then multiply the result by 2.

calculate({ left: "6", operator: "add", right: "7" })
  → 13
calculate({ left: "13", operator: "multiply", right: "2" })
  → 26

Jot: 26
```

The arithmetic comes from the calculator. Jev chooses the calls and uses their results.

- **Visible tool calls.** Inspect arguments, results, and execution state in the chat.
- **A small, real loop.** Tool results go back into context before the next decision. Inspired by [pi](https://github.com/earendil-works/pi).
- **Streaming and cancellation.** Watch a reply arrive; stop an ongoing turn.
- **Local conversation history.** Chats stay in this browser. API credentials stay on the server.

## Quick start

Requires Node.js with npm, a TypeSafe API key, and Apple Silicon with `uv` for local draft generation.

```sh
npm install
cp .env.example .env
```

Put your key in `.env`:

```dotenv
TYPESAFE_API_KEY=your_key_here
PORT=3000
```

Start the local draft service, then start Jot in another terminal:

```sh
npm run draft:serve
# another terminal
npm run dev
```

Open **[localhost:3000](http://localhost:3000)**. The server binds to loopback only.

`JEV_API_KEY` is also supported. Restart the server after changing credentials. The server sends conversation context to TypeSafe for inference; local chat storage does not mean offline inference.

```sh
npm test          # Unit and lifecycle tests
npm run build     # Typecheck every package and build the UI
npm start         # Serve the built app locally
```

## Packages

```text
packages/
├── ui/          React chat UI and tool-call presentation
├── agent/       Provider-independent agent loop, messages, and tool contracts
└── jev-core/    TypeSafe client, Jev word generation, and inflections
server/          HTTP server, Jev model adapter, and application tools
```

The UI consumes agent events. The agent loop knows neither React nor Jev’s API. The server wires the loop, provider, and tools together.

## Development

Keep UI, agent loop, and provider code in their respective packages. New capabilities belong in tools, not request-specific response branches.

Read [AGENTS.md](AGENTS.md) and the [TypeSafe skill](.agents/skills/typesafe-ai/SKILL.md) before changing the integration. Keep credentials out of code and logs, and run `npm test` and `npm run build` before submitting changes.

## Credits

- [TypeSafe / Jev](https://typesafe.ai/) — the decision model.
- [pi](https://github.com/earendil-works/pi) — the reference for a minimal agent loop.
- [Errand](https://runerrand.dev/) — visual reference.
- [FrequencyWords](https://github.com/hermitdave/FrequencyWords) — vocabulary data, CC BY-SA 4.0; see the [data attribution](packages/jev-core/src/data/conversation-words.LICENSE.md).
- [jsRealB](https://github.com/rali-udem/jsRealB) — deterministic inflection, ISC.

Jot is an independent project, not affiliated with or endorsed by TypeSafe. Jev remains the name of the underlying model.
