# R34 served repeatability check

12 HTTP replies, four prompt types × three interleaved repeats, independent conversations, exact runtime/data hashes recorded. All12 terminate normally; no retries of bad answers or mid-run changes.

|Category|Observed stability|Assessment|
|---|---|---|
|Code|kivo-482 in3/3|Exact copying passes these repeats.
|Colors|Red blue in3/3|Two-word format passes these repeats.
|Notes|Gather notes / gather your notes / gather and sort|Actionable first step in3/3; wording variation acceptable.
|Shadow|Sun moves across sky in3/3|Stable observational answer, but omits underlying Earth rotation; borderline completeness, not full science pass. No false orbital assertion in this sample.

Median reply latency 3504ms, range 1816–7316ms. Total input 764,295 tokens. Short exact-code answers still cost about43k input tokens due to vocabulary selection overhead.

Nine clearly adequate repeat observations, three borderline, but these are four correlated question families—not12 independent tasks and not a population reliability estimate. R28 false science statement remains historical evidence. Do not claim reproducibility means truth or generalization.

No runtime modification based on this run. Next broaden beyond simple short responses, especially multi-sentence factual explanation and multi-turn instruction changes where earlier failures concentrate. Optimize only measured overhead while maintaining quality; do not trade general scope for a small fixed phrase bank or canned answer cache.
