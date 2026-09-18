# R15.6 morphology diagnostic

24/24 selections satisfy the predefined accepted forms; 12/12 contexts have candidate coverage. Both candidate orders select the same grammatical form. The Mivora control has only one candidate, so its two successes test preservation, not model discrimination. Ten verb/count-noun contexts and the water ambiguity control have multiple choices. Threshold for a broader experimental trial met, not a production gate.

Mechanism: deterministic jsRealB supplies word forms; Jev selects among rendered prefix continuations. The fix does not ask Jev to spell and does not add answer-specific lemmas. Examples: earth turn→turns, yesterday she go→went, two mouse→mice. Noun/verb ambiguity remains represented: mouse and water also yield verb forms; Jev chose the context-appropriate forms here.

Limitations: short provided prefixes, provided lemma, one model run per ordering, small development set. Does not test selection of the right lemma, sentence planning, truth, arbitrary morphology, or broad conversation. Vocabulary remains bounded. No runtime integration.

Next preregister end-to-end morphology expansion after the existing proposal stage, retaining original candidates and identical budgets. Compare on Chinese explanation and creative modification plus controls before expanding evaluation. Respect API option cap; record any truncation instead of silently discarding candidates. Do not label this standalone grammar result as chat success.
