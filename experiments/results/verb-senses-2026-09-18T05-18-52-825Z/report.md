# R11 — explicit verb senses with unchanged candidates

Twelve prompts, two candidate orders, bare versus definitions. Eight prompts reuse exact R10 finalist sets; four new prompts freeze sets from the same generic tournament. No reference answer or desired verb is added. WordNet 3.1 supplies generic lexical meanings; its contribution is separate from Jev selection.

| Prompt | Order | Bare lemma | With definitions |
|---|---:|---|---|
| deadlines | 1 | list | list |
| deadlines | 2 | list | list |
| desk | 1 | sort | sort |
| desk | 2 | sort | sort |
| distractions | 1 | block | block |
| distractions | 2 | block | remove |
| draft | 1 | outline | outline |
| draft | 2 | outline | outline |
| files | 1 | categorize | categorize |
| files | 2 | organize | organize |
| homework | 1 | decompose | analyze |
| homework | 2 | decompose | analyze |
| meeting | 1 | identify | plan |
| meeting | 2 | gather | schedule |
| procrastination | 1 | start | start |
| procrastination | 2 | start | begin |
| project | 1 | decompose | decompose |
| project | 2 | list | decompose |
| reading | 1 | annotate | jot |
| reading | 2 | summarize | summarize |
| scrolling | 1 | install | limit |
| scrolling | 2 | block | limit |
| vocabulary | 1 | card | list |
| vocabulary | 2 | card | list |

## Findings

- Vocabulary-learning trials choose card twice without definitions and list twice with definitions. Both card follow-up checks find no fitting supplied verb sense. This supports the lexical-sense hypothesis for that specific failure; it is not a universal claim about every contemporary use of card.
- Most other choices remain stable or move to plausible alternatives (annotate/jot/summarize; plan/schedule; categorize/organize; limit; analyze). A plausible verb is not yet a useful complete recommendation.
- Shortened glosses can themselves mislead: project/decompose selects the break down sense associated with rot/molder, not the separate-into-components sense. Synonyms/examples were stored in the source data but absent from this condition. R11.1 tests that representation gap.
- WordNet first-three-sense coverage is incomplete. NONE means no supplied sense fits, not proof that the lemma has no valid contextual use.

Gate for sense-conditioned follow-up: the documented card mismatch disappears, and ordinary action senses are plausible on the new file, scrolling and homework prompts; meeting plan/schedule still requires argument-level validation. This licenses further tests only, not deployment.

The database license is retained as WORDNET-LICENSE.txt. Source: https://wordnet.princeton.edu/ ; package wordnet-db 3.1.14. Full raw evidence: manifest.json, traces.jsonl, results.jsonl, summary.json; preparatory candidate retrieval is separate in candidate-preparation.jsonl.
