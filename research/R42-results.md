# R42 exact-span selection gate

Evidence: ../experiments/results/exact-span-gate-2026-09-18T09-02-36.162Z/. Eleven fixtures × two candidate orders. Criteria derived mechanically from user-provided facts/text; reference labels not passed separately.

Raw Choice selection:12/12 positive observations choose the exact target span;10/10 absent-answer observations choose GENERATE. This is promising in-context extraction evidence, not generated knowledge. Candidate selection stable across two orders on these cases.

Predeclared0.9 confidence emission gate: only1/12 positive observations emitted;11 would fall back to general generation. No negative false emissions. Therefore optimization gate (>=10/12 useful positive emissions) FAILS. Low confidence is not evidence of wrong span here; overlapping near-equivalent spans distribute probability. Do not retune threshold on these examples and call that a validated success. The report's raw `correct` field compares emitted value to expected and thus measures shortcut success for positives, not final fallback answer correctness.

Costs approximately540–1206 input tokens per single request, mostly0.2–0.4s after first call. This could reduce costly vocabulary search for eligible responses, but eligibility assurance remains unvalidated. No runtime route added; all chat still uses current general decoder.

Next research can separate relative span selection from absolute sufficiency (independent Noul about whether selected span alone answers latest request), using fresh missing/stale/conflicting/presupposition controls and exact-source positives. Broad quality scoring failed R17; this much narrower gate must be independently falsified, not assumed reliable. Keep generic fallback for all unsupported requests, without topic-specific handlers.
