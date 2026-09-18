# R12 — sense-conditioned advice

No other learned generator was used. Dictionary senses and grammar are explicit external/deterministic contributions. No reference answer sentence was added.

| Case | Reply |
|---|---|
| procrastination | You can get down to work. |
| reading | You can jot down a brief note. |
| deadlines | You can list the deadlines. |
| project | You can break down a large project into small parts. |
| vocabulary | You can list the vocabulary. |
| desk | You can sort my cluttered desk into categories. |
| distractions | (abstained) |
| draft | You can outline the draft. |
| meeting | You can plan a meeting. |
| files | You can categorize your files into folders. |
| scrolling | You can limit time scrolling online to a numerical time. |
| homework | You can analyze a difficult homework problem into small problems. |
| notes | You can tag a note. |
| habit | You can compose a short work. |
| trip | You can list important things. |
| complex | You can break down a task into small parts. |

The original development gate does not pass. Clean useful basic suggestions include note-taking, listing deadlines, breaking a project into parts, outlining, and file categorization. get down to work lacks a concrete method; desk ownership/role binding is wrong; scrolling uses an unfilled numerical descriptor; analyze into small problems is awkward. Vocabulary listing and meeting planning are weak/partial.

The four fresh prompts produce plausible first steps, but this cannot override failure on the development set. Writing compose a short work is unnecessarily formal. No production promotion.

Trace inspection localizes two code-side issues: task existed in the noun pool but fell below the top-two patient cutoff; resultative templates forced the source desk mention into the patient slot even though Jev selected item/stuff as patients and category/class as results.

Sources, actual selected senses, API payloads and responses are preserved in manifest.json, traces.jsonl, results.jsonl and summary.json. WordNet license is retained in WORDNET-LICENSE.txt.
