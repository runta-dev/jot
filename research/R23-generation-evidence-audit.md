# R23 cumulative generation audit and next-hypothesis boundary

Re-read actual R8 open-composition report, R12 sense-conditioned advice report, lexical-selector.ts, and R15–R22 outcomes. This audit changes the next experiment; it does not claim delivery.

|Mechanism|Observed advantage|Unresolved failure|Do not repeat|
|ASCII|Unbounded printable alphabet|Even character copying/word spelling unreliable|Prompt-only next-character tuning|
|Lexical proposals + continuation choice|Some coherent answers; arbitrary supplied-name recall; factual correction|Greedy malformed prefixes, limited vocab, partial user compliance|Adding small heuristics without new controls|
|Morphology|Correct inflections offered and selected|Sentence roles/content remain wrong|Treat grammar forms as semantic understanding|
|Finite lookahead|Avoids some bad greedy branches|7–9s initial delay, increased cost, poor creative instruction compliance|Unconditional wider/deeper search|
|Mechanical editing|Repairs some surface errors|Nonmonotonic edits; cannot supply missing content|Raising edit cap without proposal-coverage evidence|
|Broad self-verification|Occasional constraint recognition|False acceptance; positive/negative overlap|Confidence as quality certificate|
|R8 sentence realization|Grammatical complete candidates from lexical slots|Wrong semantic roles: clothing evaporates; advice restates goals|Independent actor/action/object choices followed by best-sentence selection|
|R12 sense-conditioned advice|Dictionary frames yield richer relations|Source/task binding, numerical placeholders, narrow advice domain|Repackaging this as a general chat engine|

## Gap that has NOT been demonstrated

No experiment has demonstrated joint, incrementally constrained sentence construction from a general grammar while allowing Jev to choose meaning, then carrying explicit discourse entities into the next sentence. R8 enumerated shallow preselected slots and fixed frames; R12 specializes advice. A new attempt must not merely rename either.

Candidate hypothesis: a general grammar tree can enforce agreement/subject completeness before committing text, while Jev chooses expansions conditioned on the entire partial tree, conversation and existing discourse entities. Deterministic rendering produces only well-formed text; semantic correctness remains a separate empirical requirement. This uses no other learned generator. It must support arbitrary lexical candidates, subclauses, questions, short answers and revision—not a list of topic-specific sentence templates.

Risks: correct structure can still encode false content; lexical coverage and pruning remain; step costs can explode; fixed grammar may exclude natural responses. If the grammar's coverage is insufficient, report exclusion rather than force every message into a subject-verb-object answer. Do not integrate based on grammaticality alone.

Before API trial: implement a minimal inspectable grammar-action space and offline invariants; preregister paired arbitrary-domain conversations with no gold words. Require proposal/action provenance, exact state transitions and explicit unsupported construction accounting. A sketch or protocol alone does not satisfy the goal. This is a new research hypothesis, not a promise that pure Jev general chat is feasible.
