# R36 verbatim requirements results

Evidence: ../experiments/results/user-requirements-2026-09-18T08-48-20.081Z/. Eight replies, two full dialogues independently generated per arm. One run, subjective tone judgment, no held-out reliability claim.

|Task|Baseline|Requirements arm|
|---|---|---|
|Polite invoice rewrite|Please send the invoice by Monday|Please send the invoice by Monday.|
|Shorten while preserving deadline/context|Send Monday|Send Monday|
|Warm one-sentence lunch invitation|Would you like to have lunch? Together.|Would you like to have lunch?|
|Formal replacement, one sentence|Would you like to have lunch? Please.|Would you be pleased to join me for lunch?|

Requirements salience helps the invitation pair in this run (single sentence and plausible formal tone), but both arms shorten invoice message by dropping politeness and object and changing “by Monday” to “Monday.” Merely retaining the string Monday is NOT semantic deadline preservation: send on Monday differs from by Monday. This revises any simplistic exact-word deadline metric; assess the relation, not just entity presence.

Decision: do not adopt based on one beneficial dialogue while the core retention failure persists. The original history was already present; duplicating user requests plus generic policy is not a reliable active-constraint mechanism. No production changes. A future mechanism must represent/recheck relationships such as deadline versus event date, and preserve source meaning during edits without predefined answers. It must also permit explicitly changed requirements. Avoid overfitting a hard-coded “by” rule to this example.
