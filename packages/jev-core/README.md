# @jot/jev-core

Node-side TypeSafe client and Jev text decoder. Exports `makeEvaluator`, typed Choice requests/responses, `generateWordReply`, and deterministic inflections. No UI or agent-loop dependency; credentials are supplied by the caller.

The decoder uses the attributed vocabulary in `src/data`, conversation-derived candidates, and word inflections. Structured model output does not guarantee factual or grammatical correctness. The application's Jev-to-agent adapter belongs in `server/jev-agent.ts`, not in this package.

Run `npm test --workspace=@jot/jev-core` or `npm run typecheck --workspace=@jot/jev-core`.
