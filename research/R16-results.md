# R16 bounded sentence-start branching

Fresh development questions, one sample/arm. Neither arm meets complete instruction quality. Branching improves explanation grammar but does not make creative revision satisfy the requested surprise. No production acceptance.

|Arm|Prompt|Actual answer|ms|First usable ms|Input tokens|
|---|---|---|---:|---:|---:|
|greedy|Why does ice melt in a warm room?|Because the heat causes melting. Transfer energy to ice.|10886|2828|117383|
|greedy|Explain it to a young child.|Imagine ice is like snow and heat makes it melt. Water is liquid. It becomes water.|14758|1305|181281|
|greedy|Write a short story about a bird missing its home.|A bird misses its home. It feels lost. It flies searching for home. But then it found its home.|18434|1414|210574|
|greedy|Give the story a surprising but happy ending.|But then it finds its home was actually house. And it became happy.|11474|1740|147583|
|branch|Why does ice melt in a warm room?|Because heat transfer from air to ice causes melting|12436|8404|145774|
|branch|Explain it to a young child.|Imagine that ice is cold and it gets warm and melts. It becomes water.|20625|7181|251708|
|branch|Write a short story about a bird missing its home.|There was a bird that was lost and searching for its home. Then it flew away. But it returned home.|28145|8855|298083|
|branch|Give the story a surprising but happy ending.|It found its family.|10073|8303|116994|

## Cost

greedy: 656,821 total input tokens, 148 requests, median first usable output 1577 ms, median reply 13116 ms.

branch: 812,559 total input tokens, 196 requests, median first usable output 8354 ms, median reply 16530 ms.

## Assessment and decision

Greedy explanation contains imperative fragment “Transfer energy to ice.” Branch explanation states heat transfer coherently. Both child explanations convey melting, branch is more natural. Greedy story shifts tense and does not convincingly resolve finding home; branch is grammatical but narratively thin. Greedy “surprise” is a house with no setup; branch family reunion is happy but not surprising. Do not redefine the user request as merely adding positive sentiment.

The intervention delays first usable output from about 1–3s to 7–9s. It adds calls/cost overall; the short final branch answer costs less but fails a requested property. Quality-normalized efficiency is therefore not established. Reject unconditional sentence-start lookahead as the next production implementation. Retain research support for selective lookahead only when a measurable benefit exists; do not expand branch width/depth on intuition.

The remaining failure is semantic planning/instruction satisfaction, not just morphology or EOS. Next evaluate whether Jev can discriminate actual failed replies against automatically produced alternatives before spending more generation calls. Reuse existing diverse continuations, retain no-adequate-candidate cases, and test calibration on explicit user requirements. Prior candidate-selection successes with authored correct answers must not be counted as proof here. Any selector must be assessed separately from proposal coverage.
