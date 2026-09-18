# R18 local-window results

Reject the current eight-word display variant. Four development replies; first gives the heat-flow idea but omits explicit melting; child explanation becomes ungrammatical; story echoes request; revised story hits40-step limit mid-clause. No evidence of improved quality or useful efficiency.

Total input tokens: 1,013,240, compared with656,821 in the historical full-display R16 greedy run. This is not a matched fixed-length token comparison: longer degraded outputs dominate total cost. Do not conclude each shortened option is intrinsically more expensive. Single samples and prompt changes prevent a robust causal claim.

Trace integrity check passed for 118 rerank prefixes: full committed text is monotonically preserved in state, not replaced by a displayed suffix; final outputs preserve it. Thus the observed truncation is the declared output step limit, not loss of state by the display transformation.

|Prompt|Exact output|Finish|Input tokens|
|---|---|---|---:|
|Why does ice melt in a warm room?|Because heat flows from warm to cold.|complete|94213|
|Explain it to a young child.|Imagine ice is like a little baby that is cold and needs to warm up melts. Becomes water. It becomes liquid. Because heat flows from warm to cold.|complete|287130|
|Write a short story about a bird missing its home.|Write a short story about a bird missing its home. Bird was lost. The little bird was looking for its home. But it found its home. And it felt safe.|complete|297729|
|Give the story a surprising but happy ending.|Write a short story about a bird missing its home The bird was lost but then it found its home and felt happy But something happened The it met a friend and became friends. Turned out its mother was|limit|334168|

Decision: retain full continuation display as the research baseline. No production change. Repeated task echo, bad local choices, and partial instruction compliance persist across representation variants. Further prompt-only tweaking on the same two conversations has diminishing evidentiary value. Next revisit external implementations and inspect their measured failure cases and vocabulary provenance before adopting another mechanism. Preserve the user's open-ended scope; do not substitute special-purpose handlers.
