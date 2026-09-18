# R12.2 — role-consistent final selection

No other learned generator was used. Dictionary senses and grammar are explicit external/deterministic contributions. No reference answer sentence was added.

| Case | Reply |
|---|---|
| procrastination | You can start a tiny task. |
| reading | You can jot down what you read on a notebook. |
| deadlines | You can list the deadlines. |
| project | You can break down a large project into small parts. |
| vocabulary | (abstained) |
| desk | You can sort items into categories. |
| distractions | You can block websites. |
| draft | You can outline the draft. |
| meeting | You can plan a meeting with an agenda. |
| files | You can categorize your files into folders. |
| scrolling | You can restrict time scrolling online to a numerical limit. |
| homework | You can analyze the problem. |
| notes | You can tag the notes. |
| habit | You can write a short text. |
| trip | You can list important things. |
| complex | You can break down a task into small parts. |

The model classifies desk as a location/container of item/stuff at confidence 0.95–0.99. Removing only direct-object uses of that source and carrying the role decisions forward changes the final output to sort items into categories. Other good outputs mostly persist; vocabulary listing changes to abstention without exclusions.

After a code audit, exclusions require agreement across every retained patient hypothesis for a source, not an ANY condition over mutually exclusive alternatives. A deterministic replay of all recorded judgements proves the exclusion sets are unchanged in these 16 cases; no model answer was rerun. Two unit tests protect this scope rule.

This does not clear the overall gate. The notebook preposition, numerical placeholder and weak homework recommendation remain. Cases are development replays, not fresh evaluations.

Sources, actual selected senses, API payloads and responses are preserved in manifest.json, traces.jsonl, results.jsonl and summary.json. WordNet license is retained in WORDNET-LICENSE.txt.
