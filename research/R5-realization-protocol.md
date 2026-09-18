# R5 — semantic slots plus rule-based realization

Preregistered before inference. Only Jev performs learned decisions. jsRealB is deterministic grammar/morphology code, not another learned generator. Its contribution is explicitly separate from Jev's.

Hypothesis: selecting a semantic/grammatical structure using typed decisions, then realizing it with general constituent grammar, avoids ungrammatical word loops on source-grounded replies.

Scope: eight source-grounded, single-clause planning probes, including identity, incident, past event, negation, plural agreement, future, passive event and causal relation. Candidate phrases are every contiguous 1–4 token span of the supplied facts, metadata values and pronouns. Verb lemmas come from deterministic jsRealB lemmatization of the source plus generic be/have/help/do. No case-specific answer sentences, no expected-word injection, no fallback answer templates. Original facts are legitimate task input, not hidden gold.

Stage 1: independent Choices for subject, verb, object/complement, determiners, number, tense, negation and voice over the same state. Stage 2 and optional stage 3: select up to two additional prepositional/causal modifiers, conditioning on the already selected core and prior modifiers. Realize a generic S(subject, VP(verb, complement, modifiers)). Record all slots and provenance.

Max three requests per probe. Do not promote the schema as unrestricted language generation. It presently cannot express arbitrary recursion, multiple independent clauses, lists or poetry. This is a feasibility component experiment, not a substitute for the original open-ended chat goal.

Judge each result separately for grammaticality, factual correctness, required-information coverage and unsupported additions. In particular, a fluent wrong sentence FAILS. Passing at least 7/8 with no false statements is required to justify further unseen-composition tests. No live UI switch from this pilot alone.
