# R6 — remove manually organized fact fields

Preregistered before inference. Use R5.1's grammar and sentence reranking, but candidates now come from ordinary prose, not agent/action/object metadata. No auxiliary learned model.

Twelve grounded probes include distractor sentences, new names, negation, passive, future, plural and causal information. Two additional no-source questions deliberately test the remaining open-domain boundary; they are not excluded from reporting or counted as grounded successes.

Automatic span constructor: split source on sentence-ending punctuation/semicolons; enumerate all contiguous 1–4 word spans, plus pronouns. Preserve internal colon in times. Enforce <=255 candidates explicitly; no answer-dependent pruning. Source-only verb lemmatization plus be/have/help/do remains unchanged.

Core planning and whole-sentence reranking remain R5.1. For modifiers, ask Jev to rank source spans against the chosen core/request, keep up to eight, then realize all generic modifier relations and compare complete sentences. Up to two modifier iterations, maximum six API calls. Candidate recall is a limitation and is reported.

Controls: (1) first source sentence verbatim, no Jev; (2) directly realized top-probability slots, with no joint reranking; (3) final joint result. All outputs retained. Assess grammar, factuality, requested coverage, and unsupported additions manually against frozen task requirements, not keyword presence alone.

Advancement gate: >=10/12 grounded outputs fully satisfy requests with zero factual contradictions. No-source failures explicitly prevent an open-domain completion claim even if the grounded gate passes. This remains a development feasibility evaluation; production/browser integration requires a later raw-chat held-out gate and reliable abstention for unsupported requests.
