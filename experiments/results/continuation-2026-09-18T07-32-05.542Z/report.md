# R15.1 continuation pilot assessment

Independent algorithm-level experiment, not exact replication of the external implementation. Four development turns only, each follow-up uses the actual preceding generated reply. No reference answer inserted. All four ended via EOS; 3/4 adequate under preregistered rubric, so the 4/4 advancement gate FAILS. Do not integrate or claim general-chat success.

|Prompt|Exact output|Assessment|Wall ms|Input tokens|Output tokens|
|---|---|---|---:|---:|---:|
|Hello. Who are you?|Hello I am Jev|Pass: direct identity, readable despite missing greeting punctuation.|5689|62369|65086|
|What can you help me with?|I can help with anything|Fail: universal capability claim and no useful concrete scope.|6026|69778|71690|
|Why do wet clothes dry?|Because the water changes state to gas.|Pass: scientifically basic but correct evaporation explanation.|8479|92048|94081|
|Explain that more simply.|Because water becomes gas.|Pass: shorter faithful explanation resolving actual previous answer.|5398|71064|73182|

Compared with the same four-turn ASCII diagnostic (0/4 adequate, all repetition stopped), this supports further investigation of whole-word proposal plus contextual reranking. It does not isolate the effect of reranking from word choice: a matched no-rerank ablation is still needed. One run, no randomization, no stability evidence, no held-out evaluation, and two categories only. The 4096-word corpus restricts expressivity and remains research-only. Provider output counts include choice distributions; they are not generated answer tokens. Do not convert these counts to monetary costs without verified pricing.

Next action: inspect whether the unacceptable claim was absent-alternative pruning or final ranking; then preregister a general conversational grounding instruction ablation versus the unchanged method. Do not hardcode an identity/capability response. The remaining six conversations are still unmeasured with this method, not passed or failed by extrapolation.
