# R10 — predicate-conditioned action planning

Same role instructions for every prompt. Jev chooses a verb, then an argument structure, then its noun argument and optional property. No hand-written response sentence is supplied. Generic grammar realizes the selected plan.

| Task | Selected plan | Literal reply | Assessment |
|---|---|---|---|
| procrastination | start /  /  | You can start. | FAIL: no concrete action object or method |
| reading | annotate / text / physical | You can annotate the text. | Useful first-step method |
| deadlines | list / deadline / multiple | You can list multiple deadlines. | Useful basic recording/listing step |
| project | decompose / project / large | You can decompose the large project. | Partial: abstract decomposition, missing concrete subtask/result |
| vocabulary | card / vocabulary / new | You can card some new vocabulary. | FAIL: unnatural/ambiguous verb sense |
| desk | sort / desk / excess | You can sort the desk. | Partial: desk versus its sortable contents is underspecified |
| distractions | block / website / online | You can block a website. | Partial: website as distraction is not established by the user |
| draft | outline / draft / first | You can outline the first draft. | Useful initial outlining step |

## Decision

FAIL the >=6/8 and >=4/5-fresh gate. Three clearly useful basic outputs; three partial/underspecified, two clear failures. Do not claim improvements based only on grammaticality or topic overlap.

This reduces some independent-slot mismatch but does not establish a good action schema. start is treated as intransitive, dropping the concrete first step; card is selected for vocabulary learning despite its ordinary verb senses; sort uses desk where sortable contents are needed. These motivate explicit lexical senses and role definitions.

The FrameNet literature treats lexical units as word senses and roles as frame-specific, not universal labels. Our generic direct/prepositional/resultative frames are too weak to ensure that the object fits the selected sense. Reference: https://icsi.berkeley.edu/stories/teaching-computers-meaning/ .

No new learned model is allowed. A lexical database may supply definitions/constraints, but its contribution must be disclosed; selecting a prewritten definition must not be called original Jev text generation.

Every request/response and selected plan is retained in traces.jsonl, results.jsonl and summary.json. Research lexicon licensing still applies; no live chat switch.
