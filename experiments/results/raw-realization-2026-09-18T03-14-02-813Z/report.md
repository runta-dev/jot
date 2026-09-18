# R6 — ordinary source text instead of fact fields

Fourteen probes: twelve source-grounded prompts with distractors and two no-source questions. No manually organized agent/action/object fields were supplied. Candidates are automatically enumerated source spans; no other learned generator supplies text.

| Case | First-sentence control | Direct slots | Joint output |
|---|---|---|---|
| identity | The assistant is called Jev. | I am Jev. | I am called Jev from TypeSafe. |
| incident | The dashboard remained online. | The health endpoint was returned the HTTP 503. | The health endpoint returned HTTP 503 on Monday at 09:00. |
| past | Ben prepared the slides today. | Mira sent the report. | Mira sent the report yesterday. |
| negation | The website is available. | The service is not the not available. | The service is not available. |
| plural | The router forwards packets. | The servers process requests. | The servers process requests. |
| future | Leo visited the park yesterday. | Ana will visit the museum. | Ana will visit the museum tomorrow. |
| passive | The invoice arrived today. | The package was delivered the courier. | The package was delivered yesterday. |
| cause | The design is complete. | The launch delays the delayed. | The launch is delayed delayed because the tests failed. |
| new_purchase | Sam bought a book on Monday. | Nora bought the tickets. | Nora bought the tickets on Tuesday. |
| new_door | The window is closed. | The door is not not locked. | The door is not locked. |
| new_workers | The workers repair the bridge daily. | The workers repair the bridge. | The workers repair the bridge daily. |
| new_shop | The cafe closed last month. | Omar will open the shop. | Omar will open the shop next week. |
| open_sky | (empty) | It is. | It is. |
| open_advice | (empty) | You help. | I help you. |

## Assessment

- Grounded outputs: 11/12 satisfy requested content and grammaticality. The cause case repeats delayed: The launch is delayed delayed because the tests failed. This is a grammatical failure, not accepted as success.
- The first-source-sentence baseline misses the target information for most distractor cases; it is plainly not equivalent to the final result. The workers case is a straightforward extractive control.
- Direct independent slots produce wrong or incomplete combinations (e.g. The service is not the not available.); joint sentence selection materially improves composition.
- No-source outputs: 0/2 useful answers. It is. does not explain sky color, and I help you. supplies no actionable procrastination advice. Do not count grammaticality as task success.

Mean grounded input: 9,381 tokens; median wall time 1760 ms; 4–6 requests per reply.

## Decision and limitations

The grounded advancement gate passes narrowly (>=10/12 and no false factual assertion), but this does not meet the original open-ended goal. There are only 12 hand-designed source cases, not a representative conversational benchmark. No model tuning occurred during this run.

Main unresolved bottleneck: candidate provenance. Source-only phrases cannot express new factual content or advice absent from input. A broader, gold-independent semantic lexicon is needed to test knowledge elicitation; adding complete desired answers would invalidate that test.

The repeated passive predicate is a representation/realization defect to test independently, not a reason to silently correct archived outputs. Future grammar normalization must retain valid passive complements (e.g. was given a book).

Full traces are in traces.jsonl; controls and literal outputs in results.jsonl. The current live chat decoder has not been replaced.
