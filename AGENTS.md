# Jot

Use the installed TypeSafe skill at `.agents/skills/typesafe-ai/SKILL.md` for this project, and read the relevant live API docs before changing the integration.

- Keep API credentials server-side; never print or embed `.env` values.
- Architecture: `packages/ui` consumes agent event types over HTTP; `packages/agent` is a provider-independent Pi-style loop; `packages/jev-core` owns TypeSafe calls and Jev text generation. `server/` wires model adapter and tools. Do not add provider/UI imports to the loop or provider imports to UI. Run `npm run check:boundaries`.
- Tool handling uses assistant tool-call messages → validated execution → tool-result messages → next model turn. Preserve tool history and cancellation. New capabilities belong in tool definitions, not request-specific reply branches. No independent prediction of future text positions.
- Visual reference: https://runerrand.dev/ and `/Users/shiqimei/repos/runta-dev/errand-website`. Use native system fonts, white/neutral gray surfaces, subtle borders, rounded controls, and restrained orange accents.
- Verify with `npm run build`, `npm test`, and a real browser conversation. Distinguish successful transport from actual response quality.

- Research goal constraint confirmed by the user: pure Jev only. Do not introduce another generative model to produce drafts, candidates, or answers. Follow `research/README.md`; preregister hypotheses and comparisons before experiments, consult primary internet sources, and retain full reproducible evidence.

## Scope correction — 2026-09-18

The product goal is general, open-ended, multi-turn chat using pure Jev. A comparator, intent router, canned-answer collection, or domain-specific template engine does not satisfy it. Do not expose narrow research components as chat modes. The comparison preview has been withdrawn; retain its evidence and separately stored history.

The character loop is retained as a failed research baseline, not the current runtime. R27 permits a limited experimental word-based prototype after head-to-head evaluation and browser checks; this does not satisfy the final general-chat quality gate. Before replacing it, preregister and pass an end-to-end general-chat evaluation covering greetings, factual questions, explanations, advice, follow-ups, corrections, unknowns, and Chinese input with English output. Measure coherence, quality, latency, cost, and source/candidate coverage. Component accuracy is not product acceptance. If pure-Jev general generation remains unsolved, report that directly instead of narrowing the goal.
