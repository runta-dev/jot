# @jev-chat/jev-core

Node-side TypeSafe client and experimental Jev text decoder. Exports `makeEvaluator`, typed Choice requests/responses, `generateWordReply`, and deterministic inflections. No UI or agent-loop dependency; credentials are supplied by the caller.

The decoder uses the attributed vocabulary in `src/data`, conversation-derived candidates, and word inflections. It remains experimental: structured model output does not guarantee factual or grammatical correctness. The application's Jev-to-agent adapter belongs in `server/jev-agent.ts`, not in this package.

Run `npm test --workspace=@jev-chat/jev-core` or `npm run typecheck --workspace=@jev-chat/jev-core`.
