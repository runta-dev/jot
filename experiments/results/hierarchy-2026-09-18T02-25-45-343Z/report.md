# R2 / R2.1 — Whole-word pilot

Pure Jev, six frozen development prompts. No supplied correct answer sentences, no other generative model. This pilot is not a held-out quality benchmark.

## Interface finding

Direct 4,096-word Choice requests were rejected with HTTP 400. A separate minimal probe returned: `{"detail":"Too many choices. Must have at most 255 choices."}`. This is a transport/contract limit, not a model-quality failure.

## Hierarchical follow-up

Up to 112 words per group; first Choice sees all group member lists; second Choice sees the union of top two groups (at most 224 words) plus EOS. Both stages use the full chat and prefix. Noul >= 0.9 also terminates. A deterministic renderer inserts spaces and sentence-start capitalization.

| Task | Character baseline | Hierarchical words | Requests (word) | Word input tokens |
|---|---|---|---:|---:|
| identity | `I    ` | `(empty)` | 1 | 11,637 |
| capital | `CaaaCCCCCC` | `Paris` | 3 | 25,190 |
| arithmetic | `4` | `4` | 3 | 24,909 |
| greeting | `Hllooo    ` | `How can help you?` | 12 | 78,906 |
| opposite | `Ceo` | `Cold` | 3 | 25,158 |
| summary | `SA    ` | `On Monday at 09: 00 HTTP 503 is was been is endpoint endpoint the of` | 32 | 216,235 |

## Interpretation

- Word mode passes the three exact single-answer probes (capital, arithmetic, opposite). Character mode passes only arithmetic.
- Word greeting `How can help you?` is relevant but ungrammatical. Identity gives an empty reply after first-stage EOS. Summary is malformed and hits the 16-word cap. These are not accepted successes.
- The single-answer outputs demonstrate some semantic selection from a general corpus. They do not establish open-ended composition.
- Direct group EOS competes with non-semantic group lists and may terminate too early. Next hypothesis: remove EOS from the group-selection stage and let the independently asked completion judgement decide termination. Test as a new method, not a post-hoc reinterpretation of this result.
- Full-list grouping costs are paid at every word; candidate recall can be lost before final selection. This method is neither free nor lossless.
- The public research corpus has licensing restrictions noted in its repository. It remains in the local research cache, not a production asset. Source: https://github.com/first20hours/google-10000-english ; full-list SHA256 `9c965d384526facc59260e94f8ccff1582633fa385004abe1455ed457062acbc`.

## Next decisions

Do not deploy this decoder. Preregister separate stopping-policy and gold-independent-edit experiments. Continue to honor pure-Jev-only constraint.

Data: `replies.jsonl`, `traces.jsonl`, `manifest.json`, `summary.json`; all candidates and requests are inspectable.
