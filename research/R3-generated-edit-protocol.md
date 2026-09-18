# R3 — automatic edit-neighborhood selection

Preregistered before execution. Pure Jev; no generative model, supplied corrected sentence, or gold-dependent proposal filtering.

Hypothesis: previously observed four-candidate repair success survives when candidates are generated mechanically without knowing the correction.

Eight fixed drafts: Helo!, I am Jv., How can help you?, The report is is ready., The project is five-spaces ready., and three already-correct controls (negation, Python quoted whitespace, formatted amount). Facts/intent may be supplied in state; expected corrected strings are used only after inference for scoring.

Candidate constructor: original; all single-character insertions/deletions/replacements over ASCII letters, digits, space and ordinary punctuation; adjacent-character transpositions; deletion of each whitespace-delimited word; insertion of a fixed, task-independent function-word list at each word boundary; global repeated-space collapse. The literal-space code control tests whether Jev rejects destructive normalization. No corpus or auxiliary model is needed.

Tournament: deterministic partition into batches of at most 200 edits plus original, each Choice selects the minimal valid correction or original. Each group sees original. Final Choice compares all distinct group winners plus original. Candidate order is shuffled deterministically. Record whether gold is present in original neighborhood, survives to final, and is selected. Do not mistake proposal coverage for judgement correctness.

One run per draft, bounded to 3 concurrent group requests. This is an exploratory development pilot. No iterative editing or generation-from-empty claim. If poor, do not deploy. If promising, require repeated held-out corruptions and full generation+editing end-to-end evaluation.
