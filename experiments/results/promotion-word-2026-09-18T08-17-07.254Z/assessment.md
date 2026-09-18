# R27 prototype comparison

ASCII:0/16 adequate. Word+subtitle+morphology: 10/16 clearly adequate,3 borderline,3 failures. All16 word replies end via EOS; neither drawer answer fabricated. Preliminary quality portion of experimental-prototype gate passes, FINAL DELIVERY GATE DOES NOT. Runtime implementation, cancellation, streaming, history and browser verification are still pending and required before any switch.

Single development run, sequential arms, different40-word/280-character budgets; no held-out reliability claim. Frozen labels are researcher assessments, not independent blinded judges. Provider costs below are usage counts, not dollar estimates.

|Question|Actual word output|Assessment|Reason|
|---|---|---|---|
|Hello. Who are you?|I am Jev|pass|Direct identity.|
|What can you help me with?|I can help with questions about coding|borderline|Concrete capability claim but coding quality untested.|
|Why do wet clothes dry?|Because the water changes state from a to gas.|fail|Missing phase name: from a to gas.|
|Explain that more simply.|Basically because the water changes to gas.|pass|Readable simpler physical explanation.|
|I keep putting off a large project. How can I start?|First, break down tasks into steps. Then start small.|pass|Concrete decomposition and small start.|
|I only have ten minutes today. Adapt your advice.|Pick one task. Do it now.|fail|Does not actually adapt scope to ten minutes.|
|My bicycle is called Mivora. Remember that for this conversation.|Okay remembered|pass|Acknowledges supplied memory without contradiction.|
|What is my bicycle called?|Mivora|pass|Exact supplied name recall.|
|I have a red cup and a blue bowl. Which one is blue?|Bowl|pass|Identifies blue object.|
|Correction: the bowl is green. What color is it now?|Green|pass|Uses corrected color.|
|What is inside my closed drawer?|Cannot tell|pass|Does not invent drawer contents.|
|Can you know without me telling you?|No|pass|Acknowledges lack of access.|
|请用英文解释为什么晚上看不见太阳。|Because the earth spins, causing the side that is turned away from the sun cannot see it.|borderline|Correct core Earth-orientation explanation but malformed causal sentence.|
|再简短一点。|Because the earth spins|borderline|Shorter, retains rotation but omits explicit relation to observer/Sun.|
|Write a short story about a lost key.|Once there was a key that was lost. The owner was a man named thomas. He searched for it. Finally he found it.|pass|Simple coherent story; lowercase proper name is minor style.|
|Give it a happier ending.|Happily he lived.|fail|Awkward fragment, weak relation and no substantive happier revision.|

Median reply 6816ms; median first fragment 1980ms; total input 1,396,527 tokens. Longest reply 32587ms.

Decision: prepare a reversible runtime implementation of this exact general word mechanism as an experimental improvement, not a completed reliable assistant. No auxiliary generator, canned answers, specialist comparator, or automatic quality certificate. Keep API key server-side, preserve all chat storage, credit CC BY-SA lexical data and deterministic morphology. Add cancellation/budget tests, then real browser conversation before enabling default. Keep raw ASCII evidence and code baseline available for research, not a distracting UI mode. Explain known partial quality in existing About surface without marketing filler.
