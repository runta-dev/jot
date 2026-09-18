# R24 incremental syntax substrate

Implemented experiments/lib/syntax-tree.ts and four offline tests. Typed holes, immutable path-specific expansion, lexical leaves, clause/NP/VP/PP structures, coordination/causal links, full-tree frontier and node budget. No topic-specific handler or answer text. Existing filled roles remain visible to future decisions, rather than selecting roles independently and combining after the fact.

Verified offline: a clause retains its subject through verb/object expansion; missing objects block completion; wrong-sort insertions and overwriting committed nodes reject; compound clauses retain both unresolved branches; node budget rejects expansion; duplicate/invalid lexical strings filtered. Four tests pass via npx tsx --test experiments/lib/syntax-tree.test.ts.

This is an inspectable research state machine, NOT a working general grammar or chatbot. No Jev calls, renderer, agreement realization, discourse ledger, questions, passives, negation, tense richness, or revision semantics yet. Some structurally complete trees can still be linguistically invalid (verb valency, mass-noun determiner), and all can be semantically false. assertComplete checks only missing holes, not truth or all grammar. Future lexical choices need valency/number constraints and deterministic rendering. Unsupported construction must remain explicit; never map every request into the small supported subset and call that general chat.

Next implement rendering and inspect generic lexical valency restrictions, then preregister a bounded Jev expansion trial. Whole state must accompany every sequential choice. Completion requires both filled structure and valid rendering; no text emitted from incomplete trees. No production integration or change to active chat.

## Renderer checkpoint

Added syntax-render.ts using installed jsRealB deterministic realization, plus four renderer tests (eight total pass). Verified subject number agreement, past tense, object pronoun case, proper-name preservation, PP realization, incomplete/unknown/mass-only rejection. Initial tests exposed two wrong assumptions: jsRealB did not assign desired object case from our Pro('I') construction, fixed by explicit English object-pronoun mapping; its lexicon marks water count=both, so blanket plural rejection would be incorrect. Test uses lexically mass-only information instead. Countability must be sense-aware eventually; passing these tests does not prove all NP constraints.

Valency still unimplemented: a filled transitive VP might be ill-formed for its chosen verb, and intransitive use can omit required objects. Compounds/adjective attachment need explicit agreement and punctuation tests. No Jev generation, open-domain success, or production change claimed. Next lexical-sense/valency filtering and bounded general sentence-tree experiment, with unsupported constructions reported honestly.

## Sense-specific valency evidence

Added valency.ts using parsed WordNet verb frames. Bare clause evidence frames1/2/23; direct-object evidence8/9/10/11. Frames requiring additional complements do not certify a plain direct-object VP. Tests ensure compatibility is tied to the particular sense and does not leak from another sense of the same lemma. Lack of matching frame is `unverified`, not `ungrammatical`—WordNet is not exhaustive.

Eleven combined offline tests pass. Reproducible inventory `npx tsx experiments/valency-coverage.ts`:5679 alphabetic verb lemmas shared by WordNet and jsRealB,16633 senses;15131 have at least bare/direct-object evidence,1502 do not;5520 lemmas have at least one supported sense. This is dictionary overlap, NOT conversational coverage or semantic accuracy. Files in experiments/results/valency-coverage. Evidence module not yet wired into Jev decisions or renderer; do not claim the model is now constrained by it.

Next inference must select a specific lexical sense jointly with currently bound tree state and retain its frame evidence, with an explicit unsupported branch. The remaining1502 senses cannot simply vanish without recording coverage loss. Later complement constructions can broaden grammar; they must not become topic-specific response templates.
