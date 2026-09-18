# R2 — gold-independent whole-word decoder pilot

Preregistered 2026-09-18 before executing the pilot. Pure Jev; no auxiliary generator.

Hypothesis: selecting meaningful whole words from a general, external vocabulary may succeed where character extraction fails. This tests candidate selection AND an append loop; unlike the earlier four-candidate tests, no expected response is supplied as a candidate sentence.

Source: the first 4,096 entries of first20hours/google-10000-english, SHA256 `9c965d384526facc59260e94f8ccff1582633fa385004abe1455ed457062acbc` for the downloaded full list. Educational/research use only under that repository's license statement; it is not a licensed production dependency. Keep it in the local cache and attribute it. Add only generic punctuation, numerals 0–99, words literally present in the user/context, and declared assistant identity words Jev, TypeSafe, AI. No expected-answer-dependent insertion or reordering.

Six frozen development prompts: greeting, assistant identity, capital of France, 2+2, opposite of hot, and a summary of a supplied incident. They are exploratory probes, not held-out evidence. All facts required by the incident task appear in the user prompt; no output sentence is supplied.

Methods: existing character Choice with full prefix vs direct whole-word Choice (null descriptions). Both ask an independent Noul about whether the current prefix already fully satisfies the user. Stop if Noul >= 0.9, otherwise append the Choice selection; EOS stops but its Noul value is reported. No selection-time oracle. Formatting adds spaces between word units, attaches punctuation, capitalizes sentence starts and standalone I, and preserves explicitly provided identity spellings. This is a disclosed deterministic renderer, not model generation.

Budgets: at most 64 character selections vs 16 word selections per response, 120 seconds per response; repetition stops at 4 repeated final words or current character repetition guard. At most two concurrent responses. These are practical caps, not equal-compute limits. Report all costs so quality/compute can be compared honestly.

Report literal replies, finish reasons, requests, end-to-end time, reported input/output usage. Human-readable task checks: greeting appropriate; identity includes Jev and TypeSafe without false identity; capital exactly Paris ignoring case; arithmetic exactly 4; opposite exactly cold ignoring case; incident summary retains day/time/status and does not invent cause. No Jev self-judge is substituted for these checks.

Promotion: this pilot alone cannot justify production replacement. If word mode fails most simple prompts or is prohibitively costly, reject this direct-vocabulary approach and retain traces. If promising, preregister a genuinely unseen evaluation set and compare representation/candidate size at fixed budgets.
