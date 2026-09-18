# R12.1 — candidate binding replay

No other learned generator was used. Dictionary senses and grammar are explicit external/deterministic contributions. No reference answer sentence was added.

| Case | Reply |
|---|---|
| procrastination | You can start a tiny task. |
| reading | You can jot down what you read on a notebook. |
| deadlines | You can list the deadlines. |
| project | You can break down a large project into small parts. |
| vocabulary | You can list the vocabulary. |
| desk | You can sort your cluttered desk into categories. |
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

All cases reuse R12 lexical and semantic decisions. The inherited split field records their original R12 provenance, not new held-out status.

Expanding patient candidates recovers start a tiny task. The renderer correctly changes user-owned my to your and fixes bare count-noun articles. Patient NPs become valid primaries, enabling sort items into categories, but final selection still prefers the container desk. Meeting gains an agenda; short writing becomes plainer.

The gate still fails: reading uses on a notebook; desk remains an incorrect classified entity; scrolling still has a numerical placeholder; homework becomes too generic. Candidate availability alone does not guarantee the final comparison respects roles.

Incremental API cost is separate from cachedUsage. No claim that the replay represents cheap end-to-end generation.

Sources, actual selected senses, API payloads and responses are preserved in manifest.json, traces.jsonl, results.jsonl and summary.json. WordNet license is retained in WORDNET-LICENSE.txt.
