# R37 conversation-copy spans

Evidence: ../experiments/results/conversation-spans-2026-09-18T08-51-07.607Z/. Same two dialogues, current baseline vs optional source-derived2–4word spans; no authored corrected answers.

Invoice first rewrite identical content, copy reduces15→9 calls and6.8→3.1s in these samples. Shortened copy reply “Invoice by Monday” retains object/deadline relation but drops polite request form; baseline “Send invoice by Monday” also drops politeness. Thus the main retention requirement still not fully met.

Copy arm's invitation starts “Let me write a warm one-sentence invitation to lunch.” before actual invitation; revised reply repeats that preamble with formal. Both violate one-sentence requirement. Baseline has clean single-sentence invitations. This is a clear regression, not justified by a faster copied phrase elsewhere.

Reject unfiltered user+assistant span proposals for runtime. They make procedural user text available as answer content and amplify prompt echo. Current data does not distinguish all role sources, so any future copy mechanism must explicitly separate material to transform from instructions about transformation. Do not hardcode invoice/deadline templates. Preserve original source spans and exact payloads for audit.

A next controlled restriction could permit only prior assistant output or explicitly quoted user source spans; it cannot claim arbitrary user text is content to copy. Such restriction needs new instruction-echo and explicit-override controls before adoption. Copy speed gains alone cannot override answer-quality regressions. No default changes.
