# R1 — Known-text copying diagnostic

144 valid requests; 18 prefix/source cases, 4 methods, 2 candidate-order repetitions. Actual model: jev-1.13.0. Protocol was written before collecting responses.

| Method | Exact matches | 95% engineering gate |
|---|---:|---|
| raw | 25/36 | Failed |
| opaque | 25/36 | Failed |
| contextual | 31/36 | Failed |
| remaining | 30/36 | Failed |

Even when the complete source is visible, character copying is unreliable. Neutral IDs do not fix the baseline. Whole-prefix candidate descriptions improve this small development set, but still miss the preregistered reliability gate. Supplying the remaining suffix does not fully solve first-character extraction, particularly whitespace.

Examples: source `Hello!`, prefix `Hel`, next character must be `l` but several trials chose `o`; source `I am Jev.`, prefix `I am J`, must choose `e` but raw and opaque methods chose `v` in both repeats. These are exact copying failures, not ambiguous choices about what answer to compose.

Decision: deprioritize character-level decoder tuning. Investigate semantic units with gold-independent candidate construction. This does not prove an internal architecture or tokenizer cause, and it does not prove every character prompting formulation impossible.

Reported input tokens: 337,146; output tokens: 130,780. Overall wall time with three workers: 16.9s.

Raw requests/responses: `responses.jsonl`. Expected values and case list: `manifest.json`. Machine summary: `summary.json`.
