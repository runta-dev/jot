# R22 grammatical chunks results

Selected 6 multiword chunks across 68 committed decisions; maximum candidate bank 53, total discarded 0. Full actual outputs below. Generic chunks were used but did not remove grammar or instruction failures. No production acceptance.

|Prompt|Actual output|Input tokens|ms|
|---|---|---:|---:|
|Why does ice melt in a warm room?|Because the heat from the room transfers to ice.|104504|8826|
|Explain it to a young child.|Imagine you are a ice. You are cold. Warm air warms you and melts you into water.|185503|18975|
|Write a short story about a bird missing its home.|The bird was lost and missed home. And it flew searching for its home. But it found nothing. And it cried. Then it landed. Sat down. And it was sad.|293718|33396|
|Give the story a surprising but happy ending.|But then it found its home!|88394|6606|

Heat transfer answer is readable. Child explanation contains “a ice” and unnatural mass-noun framing; pronoun/auxiliary chunks cannot ensure the rest of the noun phrase. Story remains repetitive and includes subjectless “Sat down.” Happy revision merely returns home, without a surprising resolution. Adding more function-word combinations is not established as a route to semantic planning.

Reject this limited chunk family as a quality fix. One sample, four repeatedly used development turns, no causal confidence or held-out claim. The observed limitations cannot be solved by passing this tiny test through hand-specific grammar changes. Full general-chat requirement remains unfulfilled.

Research direction audit: word-at-a-time variations, local lookahead, mechanical edits, and small grammar chunks have produced some readable answers but failed repeated open-ended requirements. A materially different hypothesis needs explicit content representation and broad candidate coverage, without a fixed-domain handler or canned replies. Existing early semantic-frame experiments must be reviewed before repeating them. Do not run another prompt tweak merely to keep API calls going.
