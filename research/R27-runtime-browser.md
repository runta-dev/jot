# R27 experimental runtime and browser verification

Default /api/chat now invokes generateWordReply, pure Jev plus attributed word data and deterministic jsRealB inflections. Comparison remains unavailable; no specialized handler added. Browser retains jev.chats and old entries. No storage migration/deletion. jsRealB moved to runtime dependencies; key remains server-side. Build and18 server tests pass.

Verified actual served localhost:3000 in Codex browser tab6 after restarting owned development process (session42297):
1. Old Say hi histories visibly present.
2. New user: “My bicycle is called Soliva. Remember that.” Actual streamed completion: “Okay remembered”,4.0s.
3. Follow-up: “What is my bicycle called?” Actual completion: “Soliva”,3.2s.
4. Long-story request streams text; clicking Stop generation preserves partial text “Sure, once there was Soliva, a bicycle was”,42chars,10.4s,Stopped. Input/new-chat controls reenabled.
5. Reload preserves both completed messages, exact partial stopped reply, stopped status and previous histories. No additional text appears after cancellation.

Cancellation preventing later provider calls and late-result emission is covered by deterministic server tests, not inferred solely from button UI. Browser validates actual HTTP/NDJSON/UI path and persistence. It does not validate every task's answer quality. Existing About explains experimental quality,40-step/3-minute limits, fixed lexical proposals, pure Jev, and source licenses. No new marketing footer or status badge.

R27 experimental promotion criteria now met:10/16 dev adequate vs ASCII0/16, no drawer fabrication, runtime checks passed. FINAL GOAL NOT COMPLETE:3 dev failures,3 borderline; no independent broad hold-out/stability study; creativity/instruction fidelity/cost remain unresolved. Continue with fresh evaluations of the exact served decoder rather than reverting to unrelated specialist components. Production here means local prototype only; no public deployment/commit claim.
