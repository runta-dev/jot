# R7 / R7.1 — lexical knowledge elicitation

Six questions × noun/verb role × two candidate orderings. No answer text or expected words were supplied to Jev. The vocabulary was fixed from jsRealB and the cached research frequency list before inference.

| Method | At least one illustrative answer survives | Exact illustrative match | Total input tokens |
|---|---:|---:|---:|
| pruned | 15/24 | 13/24 | 349,848 |
| tournament | 24/24 | 17/24 | 892,226 |

| Topic | POS | Repeat | Pruned selection | Tournament selection |
|---|---|---:|---|---|
| ice | N | 1 | density | density |
| ice | N | 2 | density | density |
| ice | V | 1 | expand | expand |
| ice | V | 2 | freeze | expand |
| plant | N | 1 | energy | energy |
| plant | N | 2 | synthesis | energy |
| plant | V | 1 | enable | synthesize |
| plant | V | 2 | process | synthesize |
| procrastination | N | 1 | technique | task |
| procrastination | N | 2 | task | focus |
| procrastination | V | 1 | prioritize | start |
| procrastination | V | 2 | recommend | begin |
| rust | N | 1 | oxygen | oxygen |
| rust | N | 2 | oxygen | oxygen |
| rust | V | 1 | oxidize | oxidize |
| rust | V | 2 | oxidize | oxidize |
| sky | N | 1 | atmosphere | atmosphere |
| sky | N | 2 | air | atmosphere |
| sky | V | 1 | refract | scatter |
| sky | V | 2 | refract | scatter |
| tired | N | 1 | sleep | advice |
| tired | N | 2 | help | advice |
| tired | V | 1 | recommend | nap |
| tired | V | 2 | rest | nap |

## Interpretation

- In the pruned method, scatter is in the vocabulary but disappears before final selection; both sky trials choose refract. Exhaustive group tournaments retain scatter and choose it twice. This isolates a proposal-recall loss, not a demonstrated inability to recognize scattering.
- The tournament retains at least one originally declared illustrative word in all 24 trials. Vocabulary coverage is not final accuracy: fatigue noun trials still choose advice rather than sleep/rest despite those being available.
- Original illustrative sets are unchanged. Nap and synthesize were not in them; they are defensible partial concepts, not automatically scored as exact matches. Focus is relevant but less concrete than task. These distinctions are not hidden by a post-hoc accuracy number.
- A pair such as energy + synthesize is NOT automatically a truthful proposition: plants synthesize sugars, not energy itself. Whole-proposition composition must be checked before any user-facing answer.
- This suggests genuine lexical knowledge can be elicited through a broad candidate vocabulary, but does not establish reliable explanations, multi-turn dialogue, or unrestricted language generation.

## Cost

R7.1 noun trials use about 29k input tokens and 3 calls; verb trials about 45k input tokens and 4 calls. All group questions are evaluated in batches of at most 24. Reported output is large because each Choice returns distributions. This is considerably more expensive than keeping just two groups and must be optimized only after a useful generation path is verified.

## Next test

Retain multiple semantic candidates and compare full generic grammatical propositions conditioned on the original user question, with no source answer and no reference-word injection. Test literal novelty, factuality, usefulness, and cost. In particular retain counterexamples for causal explanation, generic advice, and concept combinations that are individually related but jointly false.

Full vocabulary and local illustrative sets: manifest.json. Exact request/response evidence: traces.jsonl. R7 comparison: ../lexical-2026-09-18T03-22-40-266Z.
