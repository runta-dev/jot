# Jot

Use the installed TypeSafe skill at `.agents/skills/typesafe-ai/SKILL.md` for this project, and read the relevant live API docs before changing the integration.

- Keep API credentials server-side; never print or embed `.env` values.
- Architecture: `packages/ui` consumes agent event types over HTTP; `packages/agent` is a provider-independent Pi-style loop; `packages/jev-core` owns TypeSafe calls and Jev text generation. `server/` wires model adapter and tools. Do not add provider/UI imports to the loop or provider imports to UI. Run `npm run check:boundaries`.
- Tool handling uses assistant tool-call messages → validated execution → tool-result messages → next model turn. Preserve tool history and cancellation. New capabilities belong in tool definitions, not request-specific reply branches. No independent prediction of future text positions.
- Visual reference: https://runerrand.dev/ and `/Users/shiqimei/repos/runta-dev/errand-website`. Use native system fonts, white/neutral gray surfaces, subtle borders, rounded controls, and restrained orange accents.
- Verify with `npm run build`, `npm test`, and a real browser conversation. Distinguish successful transport from actual response quality.

- Use Jev as the only model. Do not introduce another generative model to produce drafts, candidates, or answers. Deterministic tool results must not be attributed to model reasoning.
- Keep Jot a general, open-ended, multi-turn agent. Do not replace the chat with a comparator, canned-answer collection, or topic-specific interface.
- Preserve conversation and tool history, exact source text, cancellation, and explicit budget limits. Verify answer quality separately from transport and test results.
