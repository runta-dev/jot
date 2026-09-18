# R3 — generated edit neighborhoods

Exact-match result: 8/8. No reference-derived candidate sentences or auxiliary generator were used. This is an editing test, not generation from empty.

| Case | Output | Exact | Gold covered | Requests | Input tokens |
|---|---|---|---|---:|---:|
| typo | `Hello!` | True | True | 6 | 17,867 |
| name | `I am Jev.` | True | True | 8 | 30,802 |
| missing_subject | `How can I help you?` | True | True | 15 | 62,000 |
| duplicate_word | `The report is ready.` | True | True | 20 | 86,512 |
| whitespace | `The project is ready.` | True | True | 22 | 96,933 |
| keep_negation | `The service is not available.` | True | True | 24 | 109,247 |
| keep_literal | `print("a  b")` | True | True | 12 | 49,679 |
| keep_number | `The total is $1,250.` | True | True | 17 | 86,906 |

All five corruptions and three unchanged controls pass this single run. Original is included in every group and in final selection. Corrected text was present because generic edit enumeration covered it, not because gold was injected.

Cost is high: 6–24 requests and roughly 18k–109k input tokens for these short drafts. This provides evidence for H2 only, not an efficient end-to-end chat mechanism. Localization should be tested before integration.

Full evidence: manifest.json, traces.jsonl and summary.json. Synthetic test inputs only; credentials are not recorded.
