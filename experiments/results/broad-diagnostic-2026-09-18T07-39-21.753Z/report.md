# R15.5 broad diagnostic results

4/8 clearly adequate, 1 borderline, 3 fail under strict useful-response assessment. All eight EOS-ended. No production gate passed. Creative outputs have rudimentary continuity; that does not erase task echo and weak revision. This exploratory assessment is not a blinded human study.

|Prompt|Exact output|Assessment|ms|Input tokens|
|---|---|---|---:|---:|
|I keep putting off a large project. How can I start?|Well first, split into tasks. Then pick one. Now start.|Adequate: actionable task decomposition.|14818|134813|
|I only have ten minutes today. Adapt your advice.|First, pick one small task. Spend ten minutes doing it.|Adequate: applies ten-minute constraint to previous advice.|11366|130945|
|What is inside my closed drawer?|Unknown|Adequate uncertainty; terse.|2121|41660|
|Can you know without me telling you?|No|Adequate: admits no access.|3562|41761|
|请用英文解释为什么晚上看不见太阳。|Because the earth turn around itself. And blocks us. Behind side. The sun is behind us. So, can not see.|Fail: fragmented grammar and confusing physical explanation.|24628|222260|
|再简短一点。|Because earth blocks sun|Borderline: shorter but underspecified; omits orientation/rotation.|4397|63686|
|Write a short story about a lost key.|Write a short story about a key lost. The story begins with a woman who was looking for her key. She looked around and then began searching. She then found it.|Fail strict writing quality: echoes the task before a thin but coherent story.|26275|295836|
|Give it a happier ending.|Write a happier story. The story begins with a woman who was looking for her key. She looked around and then began searching. Finally she found it! She was happy|Fail strict instruction execution: task echo and near-identical story, superficial added happiness.|24674|291266|

## Coverage diagnosis

The Chinese first answer includes “the earth turn”. Corpus/active-list inspection shows `turns`, `rotates`, and `faces` absent from the 4096-word base and active bank; `away`, `side`, `earth`, `blocks` are present. Thus the correct inflected form of a chosen verb is impossible in this proposal set. This does not prove morphology alone would fix factual explanation or discourse. Do not manually add those target words and call that generalization.

Next hypothesis: generic deterministic inflection of proposed lexical items can improve grammatical composition without a larger exhaustive word bank. Use an existing deterministic morphology library (already installed jsRealB/WordNet), disclose its contribution and test on fresh grammatical contexts as well as these development cases. Also include no-edit/ambiguous controls so incorrect forms are not forced. No LLM-generated forms or case-specific candidate insertion. Separately investigate task echo; do not conflate grammar success with open-ended reasoning.

Advice/uncertainty positive results broaden evidence beyond comparison or identity. Chinese explanation and creative revision remain material failures. Production remains unchanged.
