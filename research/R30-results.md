# R30 source-state injection results

Evidence: ../experiments/results/evidence-injection-2026-09-18T08-34-04.583Z/. Two known development questions, three arms, one sample; researcher-selected verified source excerpts, no automated retrieval. Sources and exact strings are in manifest. No code/runtime change.

|Question|No excerpt|Relevant excerpt|Unrelated excerpt|
|---|---|---|---|
|Shadow|Because the sun moves.|Because the sun moves across the sky|Because the sun moves|
|Wet clothes|Because the water escapes.|Because water eva into air.|Because the water turns gas.|

Relevant NASA evidence does not make the response explain Earth's rotation. Relevant USGS evidence produces malformed “eva” wording. No clear causal-completeness or grammar improvement. Unrelated evidence does not visibly contaminate the topic in these two samples, but that is far too small to establish robustness. No model-only/source-conditioned factual success claim.

Hypothesis that simply adding a relevant passage to state reliably grounds this existing decoder is not supported by this pilot. Not evidence against all retrieval systems: lexical candidate pool was intentionally held fixed, source excerpts were short, and model instruction/candidate bottlenecks remain. Candidate coverage must be examined before broader retrieval implementation. No external-search feature added to chat, no sourced-fact specialist substituted for general dialogue.

Next diagnostic: inspect whether source-relevant lexical items exist in current proposal banks; distinguish evidence uptake from inability to express its terms. If testing evidence-word proposals, disclose source-derived vocabulary and compare against state-only on identical inputs before adoption. Do not supply whole correct sentences as choices and call that generated knowledge.
