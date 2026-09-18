# R9 — full-proposition role alternatives

Development replay of R8 using the same cached vocabulary and initial frames. No gold answer was added. All costs below are incremental and exclude the already-paid R8 generation cost.

| Task | Before | After | Additional input tokens |
|---|---|---|---:|
| sky | The sky scatters blue light. | The atmosphere scatters blue light. | 79,094 |
| procrastination | You should stop procrastinating. | (abstained) | 72,131 |
| tired | You should nap. | You should nap. | 83,949 |
| plant | Plants convert sunlight to energy. | Plants convert sunlight to energy. | 73,686 |
| rust | Iron oxidizes with oxygen. | Iron oxidizes exposed to moist air with oxygen. | 89,178 |
| ice | Ice floats because molecular density. | (abstained) | 81,488 |
| deadlines | You can track several deadlines with calendar. | You can track several deadlines with a calendar. | 82,861 |
| fall | A ball is pulled by gravity. | A ball is pulled by gravity. | 78,450 |
| reading | You can summarize what I read. | You can summarize what you read. | 77,496 |
| drying | Wet clothing evaporates. | Water evaporates. | 63,271 |

## Outcome

Repairs actor binding for drying (Water evaporates.), perspective for reading, and the missing calendar article. The gravity reply remains correct; the sky reply names the atmosphere rather than the sky. These are actual improvements over the frozen R8 text.

The development promotion gate still fails: procrastination and ice abstain; the plant reply remains scientifically underspecified; rust gains an awkward exposed-to phrase. Do not count abstentions or fluent-but-imprecise claims as successful answers. The originally fresh R8 topics have now been reused for development, not newly held-out.

Costs remain excessive: thousands of realized candidates per response and roughly 63k–89k additional input tokens on top of about 98k already used by R8. Candidate search is not free because it uses cached inputs.

## Implementation audit

A grammar regression test caught misuse of terminal toString (debug text) instead of realize (surface participle) in duplicate-passive checking. The live experimental process was explicitly stopped, corrected and unit-tested. The first six completed cases all used active-voice frames; regenerated candidate sets were checked against their recorded requests before their results were reused. The four unfinished cases ran after correction. Original traces are retained.

No production integration. Next direction is conditional, sense-aware predicate/argument planning rather than increasing every search dimension indiscriminately.
