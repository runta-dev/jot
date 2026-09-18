# R39 matched-history copying

Same actual source histories in both arms, two rounds,12 replies. Date replacement and omission succeed in both rounds/arms. Copying consistently uses fewer calls on these specific transformations. Formal-tone control regresses in copy arm: malformed “Dear Would you like to join to dinner?” and “Would you like to join to dinner? Please.” Baseline is also imperfect in second round (unsupported sir and missing dinner), but that does not excuse copied grammatical errors.

|Round|Task|Arm|Reply|Calls|ms|
|---|---|---|---|---:|---:|
|0|replace|baseline|Please send the report by Thursday.|17|6717|
|0|replace|copy|Please send the report by Thursday|11|3816|
|0|remove|baseline|Please send the report|11|4091|
|0|remove|copy|Please send the report|5|1849|
|0|formal|baseline|Would you like to attend dinner?|17|6903|
|0|formal|copy|Dear Would you like to join to dinner?|13|4501|
|1|replace|baseline|Please send the report by Thursday|15|5229|
|1|replace|copy|Please send the report by Thursday|11|4545|
|1|remove|baseline|Please send the report|11|3890|
|1|remove|copy|Please send the report|5|1935|
|1|formal|baseline|Dear sir, would you like to join?|21|8927|
|1|formal|copy|Would you like to join to dinner? Please.|15|7405|

Reject default scoped-copy integration: the no-quality-regression prerequisite fails. Benefits on date edits cannot justify narrowing the general decoder to edits that happen to pass, nor introducing a task-specific fast path solely to get benchmark gains. Preserve mechanism as research evidence; runtime remains unchanged.

Interpretation: copying selected text spans accelerates expression but does not ensure compatibility with the current partial sentence. Existing likelihood-style continuation judgment may select a locally familiar phrase despite broken boundary grammar. Further work would need general composition constraints or evidence that selection can reject incompatible spans—not a hard-coded ban on “Dear” or an invitation template. Copy eligibility and quality are separate problems. No final goal claim.
