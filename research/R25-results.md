# R25 incremental tree generation results

Evidence: ../experiments/results/tree-generation-2026-09-18T08-10-07.402Z/. No independently generated reference answers provided; deterministic grammar + WordNet definitions/examples are disclosed external contributions.

|Prompt|Actual result|Interpretation|
|---|---|---|
|Why do wet clothes dry?|unsupported; no emitted text|Built “the clothes dry” then rejected all NP structures for causal clause before choosing its subject. Coverage/structure-selection failure, not evidence that English grammar cannot express evaporation.|
|Child drops glass; what might happen?|It breaks.|Grammatical plausible event, but certainty is stronger than “might”; grammar currently lacks modal possibility. Partial semantic success, not fully compliant.|
|How to begin difficult task?|You begin a task.|Grammatical goal restatement, no actionable method; repeats earlier R8 failure despite sequential full-tree state.|

Costs: 6–11 calls, 11,307–37,201 input tokens, 2.76–4.23s. Cheap completion cannot compensate for inadequate answers. None is a clean full-task pass under strict rubric; no chat gate passed. Subject completeness and agreement worked for emitted outputs; they do not create content.

The experiment falsifies the broad expectation that sequential tree conditioning alone will fix semantic planning. It does not rule out richer grammar or content planning. The uncertain-event case reveals a specific expressivity gap (modality), but adding a modal only repairs that class; it cannot fix tautological advice. The evaporation abort occurs at a structural hole with no direct word choice yet, highlighting the indirection burden of selecting abstract grammar before concrete meaning.

Decision: no product switch. Do not add task-specific actions or factual templates. Before expanding grammar indefinitely, test whether selecting concrete lexicalized subtrees rather than abstract structural labels reduces premature unsupported decisions. Separate grammar coverage from semantic novelty and retain the advice restatement as a failure. Avoid claiming this is a new general-chat solution just because the rendered sentences are grammatical.
