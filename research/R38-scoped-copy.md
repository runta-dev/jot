# R38 content-scoped copy proposals

Preregistered before calls. Same optional2–4word spans mechanism as R37, but sources limited to immediately preceding actual assistant reply plus explicitly double-quoted text from latest user message. Other user instructions are not span sources. Word vocabulary still sees full history as baseline. No source model or hand-written answer candidates. Baseline vs scoped-copy, own actual histories.

New three two-turn dialogues: (1) Rewrite politely: "Send the report by Tuesday." / Change the deadline to Thursday and keep it polite. (2) Write a friendly one-sentence invitation to dinner. / Make it formal, still one sentence. (3) Shorten this without changing its meaning: "Please return the library book before Friday." / Now change Friday to Monday, preserving the rest. Source text is explicit task data, not hidden reference.

Assess no procedural prompt echo, deadline relation/date changes, politeness/format, preservation of actual meaning. Same40selection steps,500k-input/180s; track word count because spans change output-per-step. One sample12 outputs. Do not treat reduced calls as success if obsolete content is copied. No runtime adoption without benefit/no regression across these controls; not a final quality gate.
