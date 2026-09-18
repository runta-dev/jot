# R15 baseline diagnostic

Four development turns in two real sequential conversations; all 4 fail correctness, fluent English and completeness, all terminate on repetition. Neither follow-up provides usable contextual continuation. No reference assistant replies were injected. This is evidence that the baseline is unsuitable, not an estimate of every possible Jev decoder.

|Prompt|Actual output (JSON escaped)|Requests|Time|Stop|
|---|---|---:|---:|---|
|Hello. Who are you?|`"Hllllooo    "`|12|4138 ms|repetition|
|What can you help me with?|`"Hllllll"`|7|2048 ms|repetition|
|Why do wet clothes dry?|`"A    "`|5|1357 ms|repetition|
|Explain that more simply.|`"A    "`|5|1485 ms|repetition|

Next decision: evaluate word proposals with rendered-continuation reranking on the same development conversations, keeping full actual history and disclosing fixed vocabulary. Do not run further baseline cases to establish an already decisive failure. No production replacement is justified. Raw trace contains all request/response payloads and provider usage.
