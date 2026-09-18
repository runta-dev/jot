# R5.1 — joint sentence comparison

Source-grounded feasibility test. Facts are supplied as manually organized fields; no corrected English response is supplied. jsRealB contributes deterministic grammar and morphology; Jev contributes slot selection and (R5.1) whole-sentence comparison. This does not test extracting facts from raw dialogue or answering from model knowledge.

| Case | Realized output | Requests | Input tokens |
|---|---|---:|---:|
| identity | I am Jev from TypeSafe. | 4 | 3,954 |
| incident | The health endpoint returned HTTP 503 at 09:00 on Monday. | 4 | 6,661 |
| past | Mira sent the report yesterday. | 4 | 4,383 |
| negation | The service is not available. | 3 | 3,370 |
| plural | The servers process requests. | 3 | 3,407 |
| future | Ana will visit the museum tomorrow. | 4 | 4,441 |
| passive | The package was delivered yesterday. | 4 | 4,326 |
| cause | The launch is delayed because the tests failed. | 4 | 6,002 |
| fresh_purchase | Nora bought the tickets on Tuesday. | 4 | 4,370 |
| fresh_door | The door is not locked. | 3 | 3,674 |
| fresh_workers | The workers repair the bridge daily. | 4 | 5,554 |
| fresh_shop | Omar will open the shop next week. | 4 | 4,607 |

Manual assessment: all 12 satisfy the requested facts and produce grammatical sentences, including the 4 new combinations. Gate for further testing passes. No live integration from this pilot.

Mean input tokens: 4562. Median measured response latency: 1334 ms. Each output uses 3–4 API requests. These figures are for short, structured facts, not arbitrary chats.

Correct examples include I am Jev from TypeSafe.; The service is not available.; The launch is delayed because the tests failed. Candidates were realized from probability-ranked slot combinations and source values, not hand-authored answer sentences.

Critical attribution boundary: manually supplied agent/action/object metadata substantially simplifies semantic planning. A deterministic mapper could solve some of these cases without Jev. Therefore 12/12 is a mechanism feasibility result, not a measure of Jev-only open-ended generation. R6 must remove those manually organized fields, include distractors and unfamiliar role combinations, and compare candidate-only/rule-only baselines.

Evidence: manifest.json, traces.jsonl, results.jsonl, summary.json. External reference: https://github.com/rali-udem/jsrealb and https://arxiv.org/abs/2012.15425. No other learned generator is used.
