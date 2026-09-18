<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="packages/ui/public/brand/jot-wordmark-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="packages/ui/public/brand/jot-wordmark.svg">
  <img src="packages/ui/public/brand/jot-wordmark.svg" alt="Jot" width="220" height="80">
</picture>

### An agent built from choices.

Jev picks the next move. Jot runs the loop.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Powered by Jev](https://img.shields.io/badge/powered_by-Jev-c66a2b?style=flat-square)](https://typesafe.ai/)
[![Experimental](https://img.shields.io/badge/status-experimental-777777?style=flat-square)](#the-honest-part)

[Quick start](#quick-start) · [The loop](#the-loop) · [Packages](#packages) · [Research](#research)

</div>

---

## Introducing Jot, the first system one agent

Jot is a small chat agent built around [TypeSafe’s Jev](https://typesafe.ai/). Jev selects tools and their arguments, reads the results, and decides what to do next. A minimal interface shows the conversation and the actual tool calls.

Only Jev makes model calls. Calculations run in code; text is assembled through Jev choices with a fixed vocabulary and deterministic word inflections. No second generative model writes the answers.

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

Requires Node.js with npm and a TypeSafe API key.

```sh
npm install
cp .env.example .env
```

Put your key in `.env`:

```dotenv
TYPESAFE_API_KEY=your_key_here
PORT=3000
```

Then:

```sh
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
research/        Hypotheses, protocols, assessments, and rejected approaches
experiments/     Reproducible experiments and recorded results
```

The UI consumes agent events. The agent loop knows neither React nor Jev’s API. The server wires the loop, provider, and tools together.

## The honest part

**Jot is an experiment, not a reliable general-purpose assistant yet.**

Jev is a decision model, not a conventional text generator. We have observed incorrect facts, awkward sentences, and missed instructions. Successful tool execution does not prove that the final answer is good. A clean UI does not change that.

The text composer uses a bounded word vocabulary plus conversation-derived candidates and inflections. It can miss words and end with an incomplete answer. Exact source selection and deterministic arithmetic improve particular tasks; they do not establish open-ended reasoning quality.

The current prototype bounds agent turns, generation steps, time, and input-token usage. See [the implementation](server/chat-reply.ts) and [generation limits](packages/jev-core/src/word-reply.ts). There is no public-hosting or multi-user security claim.

## Research

The workflow is simple:

**Hypothesis → preregistered test → real API calls → keep the evidence.**

We retain failures, distinguish candidate coverage from selection accuracy, and test complete conversations rather than counting attractive examples. [The research log](research/README.md) includes the approaches that did not work, too.

Contributing a generation idea? Include a falsifiable hypothesis, a baseline, fresh evaluation cases, and the quality/latency/token trade-off. Keep provider credentials out of code and traces. Read [AGENTS.md](AGENTS.md) and the installed [TypeSafe skill](.agents/skills/typesafe-ai/SKILL.md) before changing the integration.

## Credits

- [TypeSafe / Jev](https://typesafe.ai/) — the decision model.
- [pi](https://github.com/earendil-works/pi) — the reference for a minimal agent loop.
- [Errand](https://runerrand.dev/) — visual reference.
- [FrequencyWords](https://github.com/hermitdave/FrequencyWords) — vocabulary data, CC BY-SA 4.0; see the [data attribution](packages/jev-core/src/data/conversation-words.LICENSE.md).
- [jsRealB](https://github.com/rali-udem/jsRealB) — deterministic inflection, ISC.

Jot is an independent project, not affiliated with or endorsed by TypeSafe. Jev remains the name of the underlying model.
