# R7 — lexical knowledge without supplied answers

Preregistered before inference. No source answer, draft or generative model. Jev selects concepts from generic vocabulary.

Vocabulary: all single-word English verbs in jsRealB; common noun lemmas from the existing 10k research word list intersected with jsRealB. Fix vocabulary before selecting outputs. No expected term is appended. Two deterministic candidate-order repetitions, six questions, noun and verb roles: 24 trials. Partition into <=112-word groups, retain two top groups, choose one word from <=224 candidates. Record full-vocabulary and shortlist coverage separately.

Queries: sky color, procrastination, tiredness, plant sunlight, metal rusting, ice floating. Role prompts ask for the explanatory substance/property/process or useful action, not a requested answer word. Expected illustrative sets stay local. Because several useful concepts may be valid, exact set match is a conservative diagnostic; all literal outputs must also be reported and interpreted, not automatically called wrong if a defensible alternative appears.

This tests retrieving meaningful concepts, not composing a complete explanation. Selecting light/scatter does not prove a factual answer about wavelength-dependent scattering. Advancement requires useful concepts on at least 5/6 topics across both role types; otherwise inspect retrieval losses before testing sentence composition. No deployment.
