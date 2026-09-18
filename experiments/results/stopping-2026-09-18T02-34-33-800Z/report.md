# R2.2 — independent completion control

Removing EOS from lexical selection prevents one observed empty reply but does not solve generation. Six of twelve trials produce the three correct single-answer outputs; the two greetings, two identity replies, and two summaries fail grammaticality/completeness or repetition checks. This is not an improvement sufficient for integration.

| Task | Run | Reply | End | Requests | Input tokens |
|---|---:|---|---|---:|---:|
| greeting | 1 | `How can help you to help?.. How? How how how how` | repetition | 30 | 196,339 |
| identity | 1 | `Jev......` | repetition | 14 | 91,825 |
| greeting | 2 | `How can help you to help?..? How how how how` | repetition | 28 | 183,238 |
| capital | 1 | `Paris` | complete_noul | 3 | 25,090 |
| identity | 2 | `Jev TypeSafe......` | repetition | 16 | 105,218 |
| capital | 2 | `Paris` | complete_noul | 3 | 25,090 |
| arithmetic | 1 | `4` | complete_noul | 3 | 24,809 |
| arithmetic | 2 | `4` | complete_noul | 3 | 24,809 |
| opposite | 1 | `Cold` | complete_noul | 3 | 25,058 |
| opposite | 2 | `Cold` | complete_noul | 3 | 25,058 |
| summary | 1 | `On Monday at 09 00 503.. The endpoint endpoint. The. The.` | limit | 32 | 214,068 |
| summary | 2 | `On Monday at 09: 00 HTTP 503 endpoint is is was is was was was` | limit | 32 | 214,649 |

Conclusion: H5 stopping competition explains some early exits but is not the primary obstacle to fluent composition. Reject this as a standalone fix.

Full evidence: manifest.json, traces.jsonl and summary.json. Synthetic test inputs only; credentials are not recorded.
