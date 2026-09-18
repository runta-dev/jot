# R48 user-directed minimal agent architecture and tool UI

User explicitly requested modern tool-call loop, pi-style minimal implementation, visible Errand-inspired tool UI, and independent UI/agent/Jev-core packages. This is an implementation request, not a claim of model-quality improvement.

Read pi packages/agent/src/agent-loop.ts and TypeSafe function-calling cookbook. Implemented the minimal assistant-call → validated executor → tool-result → next-model loop; no pi harness dependency or second model. `packages/agent` has no provider/UI dependencies and can run against a fake/alternate Model. Jev closed-choice adaptation and application tools live in server; `packages/jev-core` owns TypeSafe/word generation; `packages/ui` consumes generic protocol types over HTTP.

The old request-specific arithmetic/source-selection branches are replaced by registered calculate/read_context/compose_reply tools. Tool parameters/results have matching call IDs. Prior traces replay on later turns, including interrupted/error-only turns. Arguments validated before execution; errors reenter model context; cancellation/budget limits shared. No new topic modes.

UI: visible compact tool activity rows, subtle vertical border, small state icons, summary and expandable parameters/results, modeled on Errand Demo.tsx agent-updates/update-list. Running/completed/failed/stopped states and plain-text result rendering tested. Existing jev.chats storage retained; no migration/deletion. User's concurrent Jot branding/README changes preserved.

Verification:
-41 tests pass; root build and independent package typechecks pass.
-Agent and Jev-core independent tests pass; UI builds independently.
-Dependency-boundary check prevents provider/UI imports into agent and Jev/server imports into UI; UI imports agent as types only. Lockfile dependencies match all workspace manifests. Browser bundle contains no TypeSafe endpoint/auth code.
-Real browser after package split: calculate6+7→13, then13×2→26 in two visible calls; next user turn subtract5→21, using prior tool history. Expanded arguments/results inspected. Historical chats still visible.
-Desktop and390px-wide actual saved traces inspected, including expanded error; temporary viewport reset.
-A later compose call timed out and another request failed at transport. UI shows failed tool and supports Stop; records retained. External curl to api.typesafe.ai also failed TLS connection. Do not count those as successful live composition verification. Generic streaming/draft replacement and UI event reducer covered by tests.

Architecture reference: docs/architecture.md. A few server re-exports remain solely for reproducible research import compatibility; they are not alternate engines. Full general-chat quality goal remains unresolved; this work addresses maintainability, visible tool execution and real agent lifecycle.
