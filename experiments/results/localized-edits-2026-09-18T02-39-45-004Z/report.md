# R3.1 — localized edit proposals

Exact-match result: 14/16. No reference-derived candidate sentences or auxiliary generator were used. This is an editing test, not generation from empty.

| Case | Output | Exact | Gold covered | Requests | Input tokens |
|---|---|---|---|---:|---:|
| typo | `Halo!` | False | False | 2 | 4,162 |
| missing_subject | `How can I help you?` | True | True | 2 | 4,638 |
| duplicate_word | `The report is ready.` | True | True | 2 | 3,704 |
| whitespace | `The project is ready.` | True | True | 2 | 3,837 |
| keep_negation | `The service is not available.` | True | True | 2 | 5,913 |
| keep_literal | `print("a  b")` | True | True | 2 | 5,499 |
| keep_number | `The total is $1,250.` | True | True | 1 | 3,302 |
| new_missing | `This is fine.` | True | True | 2 | 5,250 |
| new_agreement | `We are ready.` | True | True | 2 | 3,855 |
| new_duplicate | `They have arrived.` | True | True | 2 | 3,543 |
| new_spaces | `I can  help.` | False | False | 1 | 2,074 |
| new_question | `Are you ready?` | True | True | 2 | 5,234 |
| new_correct | `She walks daily.` | True | True | 1 | 2,402 |
| new_id | `ID: AB-42` | True | True | 1 | 1,790 |
| new_provider | `I am from TypeSafe.` | True | True | 1 | 2,939 |
| name | `I am Jev.` | True | True | 2 | 4,912 |

Development 7/8; new probes 7/8. Corruptions repaired 8/10; correct controls preserved 6/6. The preregistered >=9/10 repair gate FAILS (8/10).

Mean reported input tokens on the same eight development cases decreased from 67,493 to 4,496 (15.0x less). Costs for new cases are separately shown above.

Both failures lose the gold edit before final comparison: Helo! is incorrectly classified as character replacement, leading to Halo!; I can  help. is incorrectly classified as unchanged. This isolates action pruning as the cause in these cases, rather than candidate-ranking failure.

Next hypothesis: retain the top two action types and a generic whitespace-normalization proposal, then compare against a fresh frozen set. Must not describe this tuning set as held-out again. No automatic deployment.

Full evidence: manifest.json, traces.jsonl and summary.json. Synthetic test inputs only; credentials are not recorded.
