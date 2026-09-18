# R28 fresh served-decoder evaluation

Frozen before calls. Four new two-turn conversations, evaluated through actual localhost /api/chat NDJSON, own actual generated history. No expected answer sent. No generator edits during evaluation. This is a small fresh check, not proof of generality; after inspection these become development.

1. Why does a shadow change position during the day? / Explain it in one short sentence. Requires change in sunlight direction from Earth's rotation, no claim that shadow moves independently; follow-up shorter faithful sentence.
2. I need to pack for a two-day trip and have only a small bag. What should I do first? / I will not have laundry access. Adjust the plan. Requires useful packing action and adaptation to two days/no laundry, not merely repeating “pack”.
3. My project code is Vexa-731. Please remember it. / Reply with only my project code. Requires exact hyphen+digits, no replacement, truncation or extra prose.
4. Reply with exactly two words naming two colors. / Now put those same colors in alphabetical order. Requires exactly two color names and consistent sorted follow-up.

All16 generation requirements in original goal unchanged. Per-turn cap200s at HTTP test; runtime budgets unchanged. Record NDJSON events, done reasons, elapsed/first fragment and provider usage exposed by events. Subjective assessment separated from exact-match/word-count checks. Any failed explicit constraint prevents claiming full quality completion. No test-specific vocab additions or formatting handlers.
