# R40 batching topology results

Same questions/state, three paired timing repeats per payload. Whole versus chunks-of2 with concurrency4. No decoder/runtime change.

|Payload|Whole median ms|Split median ms|Whole input|Split input|Choice agreement|
|---|---:|---:|---:|---:|---|
|0|1183|1210|28065|30665|52/54|
|1|341|439|6471|6796|12/12|

Vocabulary payload uses1→9 physical calls; next-word payload1→2. Vocabulary split is faster in first two repeats but slower in third; its median is slightly worse. Small proposal payload is slower when split in all3 repeats. Input usage rises due to repeated request overhead. This fixed concurrency/batch size shows no credible end-to-end benefit. Reject adoption; do not escalate concurrency merely to search for an attractive latency number. Observed choice agreement alone is not proof of decoder quality or full distribution equivalence.

No key appears in saved payloads; only state/questions/responses and attempts. Tiny sample does not establish universal provider scheduling behavior. Keep existing API multi-question batching; its independent judgments already run inside one logical evaluation. Future performance work should target measured redundant work without increasing cost or narrowing answer space.
