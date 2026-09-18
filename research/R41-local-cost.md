# R41 local inflection cost measurement

Used actual proposal sequence from shadow-trace-2026-09-18T08-31-30.697Z:144 inflection invocations,56 unique words per response. Benchmark30 repeated sequences/arm,7 alternating-order rounds. Exact candidate-array digest identical in all runs. Full evidence in ../experiments/results/inflection-benchmark/results.json; executable experiments/inflection-benchmark.ts. No API calls.

Uncached median32.678ms per30 reply sequences (about1.09ms/reply). Local memoized median0.651ms per30 (about0.022ms/reply). Large relative microbenchmark speedup, negligible absolute saving compared with seconds of API time. This workload is illustrative, not all conversations; JIT/cache effects recorded by all raw rounds.

Decision: no runtime caching change. Extra cache state/eviction is not justified by roughly1ms measured saving; it would not resolve observed latency or token cost. Keep simple deterministic inflections. Do not report a misleading end-to-end speedup. Future optimization must target provider work rather than local morphology.

Possible next hypothesis, requiring preregistration: generic exact-span answering when the complete answer already occurs in conversation, with unrestricted decoder fallback for all other requests. Candidate spans must be mechanically derived from source, never authored correct values, and no-in-context-answer controls must prevent prompt echoes. This would be a measured optimization within general chat, not a replacement by specialized query handlers. No such routing is implemented or validated here.
