# R17 actual-output verification

12 real outputs; 11 labeled for adequacy and one predefined borderline excluded. At preregistered 0.5 adequate threshold: 4/4 negative outputs falsely accepted; 0/7 positive outputs falsely rejected. This diagnostic gate fails. Labels are a single evaluator's preregistered development judgments, not objective universal truth or a blinded study.

Explicit-constraint question rejects the plain family-reunion ending (0.30) but accepts the malformed house ending (0.56). Therefore the zero-false-accept requirement on the two known surprise failures fails. General adequacy accepts both (0.62 and0.51). Grammar rates the tense-inconsistent story0.87 and imperative-fragment explanation0.84. Typed scores are not a reliable acceptance certificate for these samples.

Do not tune a stricter threshold on these cases and report success: acceptable answers themselves score0.52/0.57, while inadequate outputs reach0.68. No single threshold perfectly separates these observed positives and negatives. A stricter cutoff would discard useful answers alongside errors. Continuous scores preserved in results.json and exact state/payloads in trace.jsonl.

Decision: do not add an automatic approval loop based on these broad judgments. No production change. The current generation mechanism still needs direct quality gains, not a self-evaluation layer that masks failures. Future verifier hypotheses must use narrower explicit criteria and new controls; they remain optional diagnostics, not replacements for independent answer evaluation.
