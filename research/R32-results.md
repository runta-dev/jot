# R32 supplied-evidence controls

Source: ../experiments/results/source-controls-2026-09-18T08-38-09.502Z/. Four synthetic answer-bearing fixtures, no search or internal-knowledge claim.

Stated time: “At 16 20”; missing room: “Sorry unfortunately hasn been announced yet.”; conflicting times: “Depends which notice you mean. Which one?”; explicit correction: “At 17 40”. Semantic evidence handling is promising for these controlled cases (does not invent room, recognizes conflict, adopts correction), but grammar and exact time format fail. Not a full quality pass. The corpus token `hasn` illustrates remaining lexical noise.

Generic candidate tokenization fix: preserve internal periods/colons in alphanumeric spans, in addition to prior apostrophe/hyphen/underscore support. Covers times, decimal literals and version IDs while excluding terminal punctuation.20 tests/build pass. Actual served HTTP check with user-provided meeting time returns exactly “16:20”,2.781s/5calls/42,696 input tokens, recorded time-fix.ndjson. This is post-fix regression, not retroactive control-set success. Full arbitrary identifier/Unicode/URL support is not claimed.

No retrieval/evidence feature enabled in runtime. Only generic conversation-token coverage improved. Source-state experiments remain research wrappers, pure Jev with disclosed externally supplied facts. Final open-ended reliability objective still unfulfilled.
