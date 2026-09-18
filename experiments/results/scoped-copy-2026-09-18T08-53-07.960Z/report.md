# R38 source-scoped copying

Twelve observed replies, independent actual histories. Date updates preserve Thursday and before Monday in both arms. Scoped copying did not echo user instructions in this sample, unlike R37, but formal-tone compliance remains weak. No runtime integration yet.

|Arm|Turn|Actual reply|Calls|ms|
|---|---|---|---:|---:|
|baseline|Rewrite politely: "Send the report by Tuesday."|Please send the report by Tuesday|15|6529|
|baseline|Change the deadline to Thursday and keep it polite.|Please send the report by Thursday|15|5396|
|baseline|Write a friendly one-sentence invitation to dinner.|Write friendly invitation to dinner. Would you like to join?|27|9907|
|baseline|Make it formal, still one sentence.|Dear sir, would you like to attend dinner?|23|8314|
|baseline|Shorten this without changing its meaning: "Please return the library book before Friday."|Return the book before Friday|13|4603|
|baseline|Now change Friday to Monday, preserving the rest.|Return the book before Monday|13|5806|
|copy|Rewrite politely: "Send the report by Tuesday."|Please send the report by Tuesday|9|4748|
|copy|Change the deadline to Thursday and keep it polite.|Please send the report by Thursday|9|4679|
|copy|Write a friendly one-sentence invitation to dinner.|Would you like to come over for dinner?|21|10681|
|copy|Make it formal, still one sentence.|Would you like to join for dinner?|13|6646|
|copy|Shorten this without changing its meaning: "Please return the library book before Friday."|Return book before Friday|7|4375|
|copy|Now change Friday to Monday, preserving the rest.|Return book before Monday|7|3750|

Paired invoice/date rows have identical final wording with15→9 calls each. Return-book rows shorten similarly with13→7 calls; library modifier/politeness removed in both arms, so meaning/style preservation is not perfect. Copied spans do not force obsolete dates in these controls. This is modest evidence for efficiency on source transformations, not general answer quality.

Important confound: invitation first turn has neither prior assistant text nor quoted user content, so both arms have identical eligible spans (none). Different first answers therefore reflect inference/context sampling variability rather than a copying effect. Subsequent actual histories differ; formal-tone comparison is consequently confounded. Do not claim copy fixes invitation writing. Scoped-copy final “Would you like to join for dinner?” is not clearly more formal, while baseline “Dear sir” makes an unsupported audience assumption.

Next: repeat matched-history follow-ups with source text taken from actual earlier outputs, keep the latest date/style change identical, and evaluate actual-copy usage versus available-but-unused spans. Include stale-content rejection and prompt-echo controls. Only then consider a runtime optimization. Do not turn source editing into the sole chat capability. Current universal word decoder remains unchanged.
