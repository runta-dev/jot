# R15.7 end-to-end morphology results

Morphology improves the observed Chinese explanation relative to earlier baseline; memory controls pass. Creative sentences and revision remain inadequate. Not a production gate pass. No causal robustness claim from one noncontemporaneous run.

|Prompt|Actual output|ms|Input tokens|
|---|---|---:|---:|
|My bicycle is called Mivora. Remember that for this conversation.|Noted|3621|41903|
|What is my bicycle called?|Mivora|2169|42335|
|请用英文解释为什么晚上看不见太阳。|Because earth turns away. The side that is turned away is night.|11721|136961|
|再简短一点。|Because earth turns away|4752|63983|
|Write a short story about a lost key.|Once there was a key that was lost, it was valuable. It was very important. Then the search began. The search was long. Finally found it.|26731|278942|
|Give it a happier ending.|Once there was a key that was lost, it was valuable. Finally found! Happy!|14253|169295|

Candidate expansion logged at 76 steps; maximum expanded bank 37, total discarded 0.

Assessment: two memory turns pass. Chinese explanation and shortening convey the core orientation idea and fix observed agreement, but lack the explicit “our side turns away from the Sun” relationship and polished articles; classify as improved/borderline, not rigorous scientific-explanation success. Initial story is thin, repetitive, ends with subjectless “Finally found it.” Happier revision degenerates into “Finally found! Happy!”; fails natural prose and substantive revision. EOS remains overpermissive for malformed fragments.

Next evidence needed: whether the final choices contained a grammatical continuation that lost to EOS, versus proposal failure. Inspect the stored prefixes and candidate distributions before adding another control loop. Local morphology success does not justify an added classifier or domain template. Keep the single general decoder and research-only vocabulary; no runtime integration.
