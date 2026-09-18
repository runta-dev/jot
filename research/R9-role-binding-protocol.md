# R9 — full-proposition role binding

Preregistered before inference. Reuse frozen R8 inventories and frames only to isolate a revision mechanism; cached retrieval is not counted as new generation or free end-to-end work. All ten R8 prompts are now development cases, not held-out.

Generate gold-independent neighbors by replacing subject, verb or object with any R8-proposed value. Include joint verb-object replacements using the top six retrieved verbs plus generic be/have and every original noun/phrase candidate. Vary determiners; keep original available. Include removal of existing modifiers and grammatical determiner variants for them. Add both original user-perspective spans and mechanical second-person variants, preserving double-quoted/code literals. Do not supply a corrected answer or expected physics term.

Reject invalid morphology before ranking, including mass noun plurals and duplicated passive participle/complement. R8's modifiers were nominal, so the causal modifier is rendered because of + noun phrase, not because + bare noun phrase. This is a disclosed grammar change.

Compare groups of <=200 realized sentences with original always present; final Choice compares the two best from each group plus original and NONE. NONE means no acceptable candidate, not a successful answer. At most 8,000 candidates, batches of eight group questions; no answer-dependent filtering.

Report literal outputs, abstentions, full candidate counts, incremental cost and cached R8 cost separately. Passing >=8/10 development prompts without factual contradictions permits new-topic evaluation only. No production promotion; neither cached generation nor mere grammaticality proves open dialogue.
