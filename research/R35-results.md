# R35 practical dialogue revision results

Evidence: ../experiments/results/dialogue-revision-2026-09-18T08-45-38.217Z/. Six new actual HTTP turns, all normal EOS, real prior replies retained. No intervening changes or retries.

|Turn|Actual output|Assessment|
|---|---|---|
|Metal/wood explanation|Metal transfers heat away from skin faster than wood. This makes it feel colder|Correct basic explanation and two sentence-like units; missing final punctuation minor. Clear adequate.|
|Lower initial temperature?|No, both are at room temperature.|Correct denial using context. Clear adequate.|
|45min/20pages plan|Sure first step is to read the first half and then read the second.|Two nominal actions but little useful planning and no handling time constraint. Weak/borderline, not strong planning success.|
|15min/pages1–5 correction|Sure first step is to read the pages 1 to 5. Second step is to stop.|Updates scope but padded second step and no time allocation. Fails useful adaptation.|
|Friendlier message|Sure! Here is the friendlier version. Please send the draft by Friday.|Actual polite rewrite preserves deadline, but unnecessary preamble. Adequate content, style overhead.|
|Shorter rewrite|Send the draft by Friday|Shorter and deadline retained, but loses politeness requested in preceding turn. Latest literal constraint passes; cumulative style retention regresses. Borderline full-dialogue success.|

Three clearly adequate, two borderline, one clear practical failure under these judgments. Distinguish objective preserved deadline/scope from subjective usefulness; do not present one evaluator's labels as a statistically reliable benchmark. No model/API/transport errors. Latency6.4–15.0s, around73k–177k input tokens/reply. No final-goal completion justified.

Next targeted mechanism to test: represent active user requirements across turns separately from generated answer history, especially edits that should preserve earlier tone/content constraints. R15.4 coarse operation labels did not help; do not repeat them. A constraint representation must preserve actual user-authored text and distinguish explicit superseding constraints without model-written summaries or canned replies. First validate constraint retention on fresh rewriting/planning cases, then end-to-end quality and cost; source history already remains intact, so adding more context alone is not presumed a fix.
