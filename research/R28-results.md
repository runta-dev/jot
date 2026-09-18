# R28 actual served decoder: fresh cases

Evidence: ../experiments/results/served-evaluation-2026-09-18T08-28-08.835Z/. Eight actual HTTP turns, no special handlers or reference replies during original run.

- Shadow explanation falsely says Sun moves around Earth; follow-up repeats error. Both fail scientific accuracy. A fluent completion is not trustworthy evidence.
- Packing first action is useful. No-laundry follow-up mentions enough clothes but is fragmented and weakly adapted: borderline, not clean pass.
- Code memory acknowledges, but exact retrieval returns “Vexa seven one”: fails exact identifier.
- Two colors and alphabetized follow-up both satisfy constraint: Red black → Black red.

Original assessment: four clear adequate (packing first, memory acknowledgment, two color turns), one borderline, three failures. Tiny fresh set does not establish overall population rate or independent judging. All HTTP/NDJSON requests complete. Reliability goal remains unfulfilled.

## Identifier coverage fix

Root cause: conversation candidate regex retained letters/apostrophes only, omitting digits/hyphens; model could not choose exact user-provided code. Updated generic extraction to preserve alphanumeric tokens with internal apostrophe/hyphen/underscore, and renderer preserves code-like token case. No example-specific lookup, response template, or another model. Added injected-evaluator end-to-end test for lowercase/hyphen code preservation and underscore coverage;19 server tests/build pass.

Restarted local served process, replayed the original code follow-up with original actual assistant acknowledgment. Actual response now exactly “Vexa-731”,5 calls,43,163 input tokens,3.701s; code-fix.ndjson retained. This is a post-fix development regression check, NOT counted retroactively as original fresh-set success. Broader identifier formats (Unicode, URLs, punctuation-rich IDs) remain unverified. No claim that the code fix solves hallucination or general reliability.
