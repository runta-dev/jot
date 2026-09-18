# R3.2 — preserve candidate recall

Exact corrections/preservation: 24/24; previous cases 16/16, fresh probes 8/8. All fresh correct controls preserved. Preregistered component gate passes, permitting only a generated-output editing experiment.

On R3's original eight drafts, mean input tokens are 6,044 versus 67,493 for exhaustive neighborhoods (11.2x reduction). Most edits use two calls; action combinations exceeding 255 candidates use a four-call tournament.

No pretrained generator, manually corrected candidate, or gold-dependent filter supplies proposals. Original always remains available. Keeping two action hypotheses recovers Helo! -> Hello!; always offering (but not blindly applying) whitespace normalization recovers I can  help. -> I can help.

This is a small structured-error test. It does not establish semantic recovery from gibberish or generation from empty. See R4 for actual generated drafts.
