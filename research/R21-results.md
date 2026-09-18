# R21 real-output mechanical editing

Evidence: ../experiments/results/actual-reply-edit-2026-09-18T07-59-49.527Z/. Four real generated replies, max3 mechanical edits, full original conversational context. No authored corrected replies.

- Ice explanation: three edits produce a more grammatical causal sentence, but intermediate edits worsen grammar (`is melting` fragment). Used40,883 input tokens/6 calls/3.86s. Monotonic improvement is not established.
- Child explanation: deletes filler `well`, then stops. Original was already understandable. Used23,808 tokens/4 calls/1.36s; little user value.
- Story: repairs `its destroyed` to `it was destroyed` and inserts a missing subject, but leaves `she Flew away` capitalization error after3-edit budget. Used147,763 tokens/6 calls/4.16s. Partial surface improvement, not polished result.
- Requested surprising ending: unchanged `Suddenly, she found a home!`,6,528 tokens/2 calls/0.60s. Missing surprise cannot be supplied by this function-word/character neighborhood. Unchanged does not mean adequate.

Decision: reject this editor as an automatic finalizer. It cannot guarantee improvement per step, spends substantial tokens on long drafts, and cannot supply missing semantics. Small typo-test success from earlier studies did not transfer into reliable general-answer repair. Do not just raise iteration cap: it could increase corruption and cost without creating needed content.

Next research must target sentence-level composition and semantic coverage rather than accumulating local corrections. Consolidate the evidence into one explicit feasible-generation hypothesis before further calls; maintain pure Jev and general multi-turn scope. The existing model API exposes judgments, not a proven general text distribution. None of these results establishes impossibility, but no current method meets delivery quality.
