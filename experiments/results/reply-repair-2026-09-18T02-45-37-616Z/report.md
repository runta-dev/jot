# R4 — editing actual Jev outputs

Frozen R3.2 editor applied to six actual word-decoder outputs and six actual character outputs. Up to three editing passes; no gold answer was provided in a request.

## Implementation defect and correction

One-character drafts caused an empty transpose-location Choice, rejected with HTTP 400. The editor now omits impossible actions/location questions. A mock API regression test verifies nonempty <=255-option questions and no API request for empty drafts. Only the three affected cases were rerun; the original errors remain recorded. Corrected traces are in ../reply-repair-2026-09-18T02-47-55-117Z.

| Draft source/task | Before | After | Stop |
|---|---|---|---|
| word_identity | `(empty)` | `(empty)` | empty_draft |
| word_arithmetic | `4` | `4` | unchanged |
| word_greeting | `How can help you?` | `How can I help you?` | unchanged |
| word_opposite | `Cold` | `Cold` | unchanged |
| word_summary | `On Monday at 09: 00 HTTP 503 is was been is endpoint endpoint the of` | `On Monday at 09: 00 HTTP 503 is was been is endpoint endpoint the of` | unchanged |
| char_identity | `I    ` | `I am a` | iteration_limit |
| char_greeting | `Hllooo    ` | `Hello    ` | iteration_limit |
| char_arithmetic | `4` | `4` | unchanged |
| char_opposite | `Ceo` | `ceo` | unchanged |
| char_capital | `CaaaCCCCCC` | `a` | unchanged |
| char_summary | `SA    ` | `SA    ` | unchanged |
| word_capital | `Paris` | `Paris` | unchanged |

## Interpretation

- Word greeting becomes grammatical; Paris, 4, and Cold remain correct. Thus four of the six word-mode replies satisfy the simple task criteria after editing, versus three before.
- Empty identity remains empty. The corrupted summary remains broken. Both fail; they are not replaced by canned fallbacks.
- Character greeting becomes Hello with trailing whitespace after three passes, while arithmetic stays 4. Identity remains incomplete (I am a), capital becomes a (wrong), opposite becomes ceo (wrong), and the summary remains SA (wrong). Grammar repair is not factual reconstruction.
- An unchanged result is not a claim that the reply is correct; it can mean no local proposal repairs the actual error. The UI must never conflate this with a validated complete answer.
- Decision: do not switch the live chat to this pipeline. The editor is a useful candidate-selection component, but the generation bottleneck persists.

Reusable experimental implementation: ../../lib/editor.ts. No other generative model is used.
