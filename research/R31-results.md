# R31 source words plus source state

Evidence: ../experiments/results/source-vocabulary-2026-09-18T08-36-08.072Z/. All four calls are complete decoder runs, not single prewritten-answer choices. Only generic source-token addition changed from R30. Curated primary excerpts, not automatic retrieval; source contribution explicit.

|Question|Relevant source+words|Unrelated source+words|
|---|---|---|
|Shadow|Because the sun's position changes|Because the sun moves across the sky|
|Dry clothes|Evaporation is the process by which water is changed from a liquid into vapor. This happens when the heat is gained from the environment.|Because water turns into gas.|

Relevant evaporation output is grammatical and physically meaningful, unlike state-only “eva into air.” It closely expresses the supplied USGS definition; this is evidence-conditioned realization, NOT recovered internal knowledge. Relevance/source-verification/automatic retrieval remain untested. Uses55 requests,248,604 input tokens,24.655s—quality improvement comes with substantially longer output and cost, so no cost-normalized advantage claimed.

Shadow still omits Earth's rotation and explains only changing apparent position. Thus source vocabulary addresses one real coverage bottleneck but is insufficient for fuller causal explanation. Unrelated sources did not visibly contaminate these two responses, too small for safety/robustness conclusions.

Decision: retain as a promising research mechanism, not default runtime search. Next evaluate source-grounded generation on fresh passages/questions with unsupported-answer and conflicting-source controls, keeping provenance. Do not introduce hard-coded factual responses or replace general chat with source selection. The final general-chat quality goal is still unmet.
