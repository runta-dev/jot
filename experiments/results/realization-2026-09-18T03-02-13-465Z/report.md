# R5 — independent semantic slots

Source-grounded feasibility test. Facts are supplied as manually organized fields; no corrected English response is supplied. jsRealB contributes deterministic grammar and morphology; Jev contributes slot selection and (R5.1) whole-sentence comparison. This does not test extracting facts from raw dialogue or answering from model knowledge.

| Case | Realized output | Requests | Input tokens |
|---|---|---:|---:|
| identity | I am AI assistant from Jev from TypeSafe. | 3 | 3,013 |
| incident | The health endpoint returned the HTTP 503 on Monday at 09:00. | 3 | 3,718 |
| past | Mira sent the report yesterday. | 3 | 3,090 |
| negation | The service is not false. | 2 | 2,163 |
| plural | The servers process the requests. | 2 | 2,238 |
| future | Ana will visit the museum. | 2 | 2,179 |
| passive | The package was delivered yesterday. | 3 | 3,080 |
| cause | The launch failed the delayed. | 2 | 2,379 |

Clear failures: identity confuses name with source/provider and lacks an article; negation renders The service is not false.; future omits explicitly requested tomorrow; cause renders The launch failed the delayed. The incident has an awkward extra definite article. Past event, plural and passive cases are clean.

Decision: independent locally plausible slots do not reliably compose. Test retaining alternative slots and comparing fully realized clauses; do not claim grammatical realization alone solves meaning.

Evidence: manifest.json, traces.jsonl, results.jsonl, summary.json. External reference: https://github.com/rali-udem/jsrealb and https://arxiv.org/abs/2012.15425. No other learned generator is used.
