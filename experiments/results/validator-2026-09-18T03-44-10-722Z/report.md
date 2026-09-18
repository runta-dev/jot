# R8.1 — independent validator diagnostic

Thirty-six requests: eighteen cases in two orders. Thirty-two scored observations exclude two explicitly ambiguous outputs repeated twice. Labels and reference controls were never sent as model instructions. Positive controls are validation-only and must not become generation candidates.

At the fixed all-dimensions >=0.85 rule: **all 36 outputs are rejected**. The resulting 12/32 binary accuracy consists entirely of correct rejections; all 20 scored positive observations are false rejections. There are zero false acceptances, but that is not a usable validator.

The perspective question is especially defective: it returns low/moderate values even for correct impersonal explanations and properly addressed advice. An error-presence formulation with explicit non-applicability handling should be tested on new examples rather than lowering the old threshold until it passes.

Individual dimensions still distinguish some clear failures: tautological procrastination advice has usefulness about 0.02; the refraction control has factual score 0.17–0.18; the malformed ice explanation has low grammar scores; clothing evaporation is not accepted as a strong factual claim. These signals do not establish a calibrated production acceptance rule.

Decision: reject this composite rule. Do not deploy an always-rejecting system as a safer substitute for a functional Jev Chat. Preserve the original threshold/results and preregister any redesigned validator.

Raw evidence: manifest.json, traces.jsonl, summary.json. No generation run used the hand-authored validation controls.
