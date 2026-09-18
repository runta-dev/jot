# R20 vocabulary ablation results

Vocabulary source alone does not resolve general generation quality. Explanations retain core heat-transfer idea; child analogy is understandable. Initial story introduces a storm/tree causal event but has “because its destroyed” and subjectless “Flew away.” Revision “Suddenly, she found a home!” is happy but merely labeling an event sudden does not supply a surprising resolution. No full quality gate passed.

|Prompt|Exact output|ms|Input tokens|
|---|---|---:|---:|
|Why does ice melt in a warm room?|Because heat transfers from the room to ice. Causing melting.|11289|125081|
|Explain it to a young child.|Okay well imagine ice is like butter and melts because heat warms it.|10811|143309|
|Write a short story about a bird missing its home.|Once there was a bird who missed its home because its destroyed. The storm destroyed the tree. Now the bird was homeless. She felt sad and lonely. Flew away.|27447|297022|
|Give the story a surprising but happy ending.|Suddenly, she found a home!|7403|88817|

Total input 654,229; historical web-vocabulary comparator656,821. Different output length/content prevents quality-normalized efficiency conclusions. Single samples, same development prompts, no robust causal attribution. The subtitle source offers different coverage and documented distribution license, but cannot be promoted as a quality fix.

Next mechanism to examine: generic editing of the model's own generated reply, with mechanically proposed local changes and Jev choosing among explicit complete alternatives. Earlier edit success used short corruptions; actual conversation outputs may have missing content beyond repair. Before another generation trial, distinguish repairable surface errors from semantic omissions. A grammar repair result alone is not success on the user's surprising-ending requirement. Retain no-change options and all failures; do not supply corrected whole replies or another model's drafts.
