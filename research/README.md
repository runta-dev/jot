# Jev Chat research programme

Goal created 2026-09-18: build a useful, minimal Jev Chat through falsifiable hypotheses, external research, reproducible experiments, and evidence-gated implementation. Status: active; current chat quality is not acceptable.

**User-confirmed hard constraint (2026-09-18): pure Jev only. No auxiliary generative model, whether remote or local, may supply drafts, continuations, or answers.** Tokenizers and deterministic code are allowed; any corpus or lexicon used for proposals must be disclosed and its coverage measured. Research papers requiring a generator are background, not an eligible implementation.

## Scope correction: general chat, not a comparator

The user rejected the comparison preview on 2026-09-18 as goal drift. R13/R14 demonstrate only a narrow component; they do not demonstrate progress in open-ended response generation. The preview is withdrawn from the chat UI and API. Its experimental evidence and separate browser history are retained. The original character decoder remains an inadequate baseline, not a completed solution.

The next integration gate must evaluate whole conversations across greetings, factual questions, explanations, advice, follow-ups, corrections, unknowns, and Chinese input with English output. No domain-specific acceptance set can substitute for this. Establish a broadly applicable generation hypothesis and preregister an end-to-end comparison before further integration. Do not expand the comparator into a menu of specialized handlers.

## What counts as progress

Measure separately: task correctness, instruction compliance, grammaticality, completion/repetition failures, exact whitespace preservation, median/p95 wall time, first usable output, input/output tokens, requests per reply, and candidate coverage. Success on hand-authored candidate selection is not success at candidate generation. A confidence value is not an accuracy guarantee.

No hidden generative model, hard-coded answer, or reference answer in a generation request. Disclose candidate provenance. Keep user data and credentials out of artifacts. Synthetic evaluation cases are saved with exact API payloads and responses. Primary model alias and returned version are recorded.

Production integration gates will be preregistered after feasibility studies. Research probes use bounded requests and can fail without changing the live decoder. Keep the working UI minimal and Errand-aligned. Do not trade away open-endedness without explicitly reporting the restriction.

## Established evidence

- ASCII next-character loops: live replies often repeat spaces or misspell words despite full history and prefix. Simple `Say hi` succeeds; this is insufficient.
- Parallel positions: 16 Choice questions are fast but independent positions produce inconsistent text. Rejected as default decoder.
- Contextual character vs word candidates: meaningful supplied fragments are easier to choose; does not establish a method for obtaining those fragments.
- Per-character Score: can reduce repeated-space preference, but does not consistently select an appropriate next character. Around 18k input tokens per step in the recorded probe.
- HF tokenizer comparison: SmolLM2 49,152 vocabulary, 91 tokens on 10 English sentences; useful codec, not a next-token model. Whole-vocabulary criteria are too large for a single question under documented context limits.
- Repair/quality evaluation: 24 authored cases × 3 repetitions. Choice repair 24/24, preserve-correct-text 9/12, quality selection 30/30, reject-all 6/6. Score did not improve ranking. Candidate generation was supplied, not learned. See ../experiments/results/editor-2026-09-18T02-10-54-852Z/report.md.

## Hypothesis register

| ID  | Hypothesis                                                                                                                 | Falsification / next decision                                                                                                 | Status                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| H1  | Character representation and position extraction, not just semantic planning, explain much of failure                      | Controlled known-text copying; if even an exposed remaining suffix is unreliable, stop treating Choice as a character decoder | R1 complete: 25/36 raw, 25/36 opaque, 31/36 contextual, 30/36 remaining; all fail gate |
| H2  | Whole-text scoring provides a useful local edit objective                                                                  | Test generated, gold-independent edit neighborhoods and monotonicity; no-op controls and no-correct-candidate cases required  | R3 automatic neighborhood 8/8; R3.1 localization 14/16 with proposal-pruning failures  |
| H3  | An edit search initialized from empty/user text can reach a valid reply without supplied answer candidates                 | Need open-ended end-to-end evaluation; track candidate coverage separately from selector accuracy                             | Untested                                                                               |
| H4  | Deterministic, gold-independent candidate construction plus Jev discrimination can outperform exhaustive character scoring | Measure proposal coverage and selector accuracy separately; no auxiliary generative model                                     | Hypothesis only; generator-based variants excluded by user                             |
| H5  | Completion must be judged independently of candidate quality                                                               | Evaluate held-out complete vs incomplete prefixes; measure premature termination and overrun                                  | Small positive Noul examples only                                                      |

## Literature and applicability

Read primary papers and official docs; record assumptions, not just headline results. See literature.md. Do not assert access to Jev's internal tokenizer/logits or infer its architecture without documentation.

Current official warning is particularly relevant: Jev 1.13 documentation explicitly discourages chained-choice generation and reports unreliable counting. This is evidence against an easy prompt-only fix, not a proof about every possible composed system.

## Experiment discipline

1. Save a protocol, cases, methods, selection rules, and stop criteria **before** collecting results.
2. Separate development probes from untouched held-out tasks. Repeat with reordered candidates; do not count repetitions as different tasks.
3. Compare identical cases and budgets; preserve unsuccessful results and transport errors. Retry transport failures, not wrong model answers.
4. Report all cases, not only attractive examples. Identify ties, missing responses, and uncalibrated thresholds.
5. Integrate only a justified improvement and test live browser behavior; code/CI success alone is not user-visible completion.
6. Keep the goal active until a concrete outcome is achieved; do not label a research checkpoint as finished Jev Chat.

## API constraint discovered experimentally

R2 full-vocabulary Choice returned HTTP 400: `Too many choices. Must have at most 255 choices.` This is a candidate-count cap in addition to the documented token budget. R2.1 preregisters two-stage selection with at most 225 final choices. Do not reinterpret transport rejection as model-generation failure.

## Current checkpoint

- R1: complete. Exact-copying methods all fail the 95% development gate. See `../experiments/results/copy-2026-09-18T02-19-57-383Z/report.md`.
- R2: direct 4,096-word method rejected by the API's observed 255-choice cap; no inference quality conclusion.
- R2.1: hierarchical word method gets the three single-answer questions right; greeting is ungrammatical, identity ends empty, summary degenerates. Not eligible for integration. See `../experiments/results/hierarchy-2026-09-18T02-25-45-343Z/report.md`.
- Next: R2.2 isolate completion control from group selection; R3 test code-generated edit neighborhoods on malformed and correct drafts, with no reference-answer-derived candidates. Freeze each protocol before running. Keep production decoder unchanged until a meaningful improvement passes independent evaluation.

## Second checkpoint

- R2.2 isolated completion: 6/12 exact single-answer trials pass; greeting, identity and summary still fail. Removing lexical EOS is insufficient.
- R3 generated edit neighborhoods: 8/8 pilot drafts corrected/preserved using mechanically generated proposals. Cost 6–24 requests per short draft; this supports edit selection, not open-ended generation.
- R3.1 localized edits: 14/16 overall, including 7/8 new probes; all six controls preserved, but only 8/10 corruptions fixed, below the >=9/10 preregistered gate. Both failures prune the correct edit at the action stage. Mean input cost on the original eight cases falls about 15x (see report for exact figure). Not promoted.
- Next safe action: preregister top-two-action retention with an always-available whitespace proposal and a fresh test set. Separately investigate semantic/syntactic vocabulary grouping instead of arbitrary frequency blocks; do not assume a word picker has become a trained language model.

## Third checkpoint

- R3.2 retains two action hypotheses and a generic whitespace proposal: 24/24, including all eight fresh probes, pass. The component gate passes; average input cost on R3's original cases is approximately 11x lower than exhaustive editing (exact result in report). This does not complete the chat goal.
- Extracted the experimental editor into `experiments/lib/editor.ts`; fixed empty position questions on single-character drafts, with two regression tests.
- R4 on actual prior generations: word greeting repaired; existing three correct single answers preserved; identity and summary still fail. Character output remains largely unusable. Local repair cannot replace meaningful content generation. Live decoder remains unchanged.
- Next research branch: separate semantic planning from deterministic grammatical realization. Read jsRealB/SimpleNLG primary sources. This uses grammar code, not another generative model; still must prove Jev can choose a useful semantic structure without supplied answers or intent-specific canned sentences. Prototype scope and grammar coverage must be disclosed, not redefined as the final open-ended goal.

## Fourth checkpoint

- R5 independent semantic slots plus jsRealB grammatical realization fails several meaning/composition cases despite well-formed constituents.
- R5.1 probability-ranked slot alternatives + whole-sentence comparison produces correct grammatical answers on 12/12 structured-fact probes, including four new combinations. Roughly 3–4 requests and 3.4k–6.7k input tokens per reply. It passes only the gate for further evaluation.
- Attribution boundary: facts were manually organized into agent/action/object/property fields; this is not demonstrated open-ended generation or raw chat understanding. jsRealB provides deterministic surface realization. It is not an auxiliary learned generator, and its contribution must stay visible in research reporting.
- Next: R6 raw-text input with distractors and new role combinations, automatic gold-independent span candidates, and candidate-only/rule-only controls. Do not substitute a structured-fact renderer for the full chat goal. Keep the live decoder unchanged until meaningful conversational coverage is verified.

## Fifth checkpoint

- R6 removes manual fact fields: 11/12 grounded ordinary-text cases pass. Distractor sentences are handled; direct-slot and extractive-first-sentence controls are retained. One passive predicate is repeated. Roughly 4–6 requests per reply.
- Both no-source questions fail (It is.; I help you.). Source-only candidate construction cannot support the full open-ended chat goal. Do not promote this as a general assistant.
- Next: preregister lexical knowledge elicitation from a generic POS-indexed vocabulary, with no reference words inserted and no source answers. Measure candidate coverage and Jev's semantic selections before adding grammar. This remains pure Jev; lexicons/grammar are deterministic resources, not auxiliary learned generators.
- Also test passive-predicate normalization independently, preserving legitimate passive complements. Do not rewrite past outputs or inflate R6's score.

## Sixth checkpoint

- R7 broad noun/verb retrieval with early group pruning: 13/24 exact illustrative matches; suitable terms are often pruned despite existing in the full vocabulary.
- R7.1 all groups independently select top two candidates before a global final Choice: 24/24 trials preserve at least one original illustrative answer; 17/24 exact illustrative matches. Non-matching nap/synthesize can be valid components, while advice for the tiredness noun role is too generic. Literal outcomes and unchanged scoring sets are retained.
- Sky process selection changes from refract to scatter in both orderings when premature pruning is removed. This is evidence for knowledge elicitation, not complete answer generation.
- Cost is high: about 29k noun / 45k verb input tokens per concept selection. Next: construct and evaluate full propositions from multiple retrieved semantic candidates, without reference facts or hidden generators. Do not blindly concatenate independently relevant concepts (e.g. synthesize + energy would be wrong).

R7 attribution caveat: semantic-role prompts were authored per topic. They supplied no gold words, but did help decompose the question. The next generation test must automate this planning or use the same generic role instructions for every case, then separately test fresh topics. Reusing cached topic-specific retrieval results alone cannot prove a deployable open-ended pipeline.

## Seventh checkpoint

- R8 removes per-topic human role prompts and composes from uniformly retrieved concepts: fails the open-answer gate. Three clearly useful basic replies, two borderline explanations, five failures; only 1/4 fresh topics cleanly passes. Examples include a goal restatement and Wet clothing evaporates. Mean cost is near 98k input tokens/reply, not justified by quality.
- R8.1 independent quality checks with a fixed >=0.85 conjunction reject everything, including all positive controls. Rejected as a production validator; zero false accepts is not success when nothing is accepted.
- Main remaining errors are semantic roles, conversational perspective, and method-vs-goal confusion, not simply spelling. Next: inspect/rerank full role-binding alternatives with explicit relation planning; exclude invalid grammar candidates; test error-presence validation on fresh positives/negatives rather than adjusting thresholds post hoc.
- Do not deploy the current open generator or validator. The pure-Jev goal remains unachieved, with useful grounded and editing components but insufficient open-dialogue quality.

## Eighth checkpoint

- R9 full-proposition role alternatives repair several actual outputs (water as evaporation subject, reading perspective, calendar article) but do not pass the open-answer gate. Two cases abstain and other outputs remain imprecise/awkward. Incremental cost is another 63k–89k input tokens per reply, in addition to cached R8 cost. Not deployable.
- Added a reusable experimental grammar realizer and four regression tests. Invalid mass plurals/error markers and duplicate passive complements are rejected; quoted/code literals survive perspective expansion. A terminal debug-string bug was caught and fixed before resuming unfinished cases.
- R10 conditional verb → valency → noun → property planning yields three clearly useful suggestions out of eight, with partials and failures. Gate fails. Remaining issues include missing concrete arguments and ambiguous word senses (card used for vocabulary; desk used as sort's object).
- Next: inspect explicit lexical senses and semantic frame roles from primary resources, then test whether sense definitions reduce these errors on a fresh set. Do not inject topic-specific strategies or definitions and misattribute them to Jev. The full pure-Jev chat objective remains active and unmet.

## Ninth checkpoint

- R11 keeps candidate lemmas fixed and adds WordNet verb definitions. The vocabulary-learning case changes from card to list in both orders; card's supplied ordinary verb senses do not fit. New-topic action choices remain only component-level evidence, not complete useful replies.
- R11.1 adds synonyms/examples/applicable frames without changing candidate sense IDs. Both project/decompose choices move away from the rot/molder sense toward separation into components. Short glosses alone can collapse meanings.
- Added a WordNet parser with index-order senses, retained examples and lemma-specific frame applicability; three tests pass. Licenses and source attribution are preserved. No extra learned model is used.
- Next: selected-sense-conditioned participant planning, preserving multiple supported valency alternatives rather than dropping objects prematurely. Test end-to-end advice on fresh prompts. Dictionary meanings constrain ordinary use but are neither complete grammar nor prewritten question-specific answers; keep provenance explicit.

## Tenth checkpoint

- R12 full-sense participant planning produces some useful advice but fails its development gate. Four fresh prompts yield plausible first steps; this does not erase failures on older cases.
- R12.1 replays exact cached model decisions while repairing composition: retaining task produces start a tiny task; source-perspective conversion fixes my/your; allowing patient NPs as resultative primaries makes sort items into categories available. Final comparison still picked the container until R12.2.
- R12.2 carries role decisions into final selection and excludes confident container-as-patient uses, producing sort items into categories. A conservative all-hypotheses constraint check and tests avoid mixing mutually exclusive role hypotheses. Current recorded exclusions are unchanged by that audit.
- Remaining defects include on a notebook, a numerical limit instead of a value or value-selection step, and vague homework advice. Overall gate remains unmet. Replayed cases are not fresh; cache savings are not end-to-end performance claims.
- Next: stop treating semantic types (e.g. numerical duration) as literal adjective strings. Test typed comparison/quantity nodes and argument-conditioned preposition choice, with new cases and strict provenance. Maintain the full open-chat goal; do not substitute advice-only coverage.

## Eleventh checkpoint

- R13 typed comparisons: 7/8 unambiguously correct factual outputs; conductance/conductivity imprecision; both no-data controls abstain. Cost about 200k input tokens/reply.
- R13.1 uses QUDT quantity kinds plus WordNet's generic-property subtree and an explicit-property fast path. Eleven factual comparisons and all three unknown controls pass, including four new prompts. The no-data test without an explicit disclaimer also abstains.
- On the original ten cases mean input drops about 72% (see exact report); explicit-property requests cost roughly 2k–3.5k, full scans about 91k. This is a qualified comparison component, not broad chat completion. Its English construction is deterministic code; do not attribute template fluency to Jev.
- Next actionable engineering: package the operator with a fixed catalog snapshot, missing-entity handling and cancellation, then test new reversals/context updates at HTTP/browser boundaries for an opt-in preview. Keep unsupported/general generation separate and the full goal active.


## R15 general-chat baseline

Scope-correct evaluation is now fixed in `evaluations/general-chat-v1.json` (eight two-turn development conversations). First diagnostic: identity and explanation, four real sequential turns, 0/4 usable, all repetition stopped. See `../experiments/results/general-chat-baseline-2026-09-18T07-30-07.542Z/report.md`. Full history did not fix ASCII decoding. Next investigate externally demonstrated word-proposal plus rendered-continuation reranking, not more specialized handlers. No implementation is accepted yet.

## R15.1 continuation pilot

Whole-word proposals plus full-continuation reranking: 3/4 adequate on the same initial two conversations, compared with ASCII 0/4. All EOS terminated; capability answer overclaims “anything”. Preregistered 4/4 advancement gate failed. 5.4–8.5 seconds and 62k–92k input tokens/reply, one run only. No production change. See `../experiments/results/continuation-2026-09-18T07-32-05.542Z/report.md`. Need failure localization and matched rerank ablation before attributing the improvement.

## R15.2 fixed-candidate ablation

Completed paired full/fragment × grounded/base judgments with normal/reversed option order at every R15.1 prefix. At the capability failure state, full/base flips anything→programming when reordered; full/grounded selects programming both times. This isolates order sensitivity and a local grounding effect, not end-to-end quality. See `../experiments/results/rerank-ablation-2026-09-18T07-33-55.440Z/report.md`. Next needs matched end-to-end full/fragment trials; no production integration justified.

## R15.3 full versus fragment end-to-end

Both fail the four-turn gate. Full is more grammatical in this run, but its simplification repeats the previous answer and adds a sentence; capability truth remains unverified. Fragment produces ungrammatical capability text and weak paraphrases. See `R15.3-results.md`. Next investigate generic conversation-operation conditioning while preserving one general generation path, not domain handlers.

## R15.4 generic operation conditioning

No demonstrated improvement; do not adopt. Both arms remember arbitrary user-provided name and apply factual correction. Correct simplify classification still yields verbatim repetition; baseline happens to simplify a longer prior reply. See `R15.4-results.md`. Next map failures on remaining frozen general-chat categories with the simpler baseline; this is diagnosis, not gate advancement or production acceptance.

## R15.5 remaining general-chat categories

Eight more real turns: advice and unknown-information handling adequate; Chinese explanation breaks grammar/clarity; creative writing echoes task and revises weakly. 4 clear adequate, 1 borderline, 3 strict failures. All terminate, 2.1–26.3 seconds, 42k–296k input tokens. Corpus lacks common inflected forms needed by actual chosen prefixes. See `../experiments/results/broad-diagnostic-2026-09-18T07-39-21.753Z/report.md`. Next test generic morphology expansion without hand-adding target words. No production integration.

## R15.6 morphology diagnostic

Deterministic jsRealB forms + Jev selection pass 24/24 judgments across 12 short supplied-prefix contexts and two option orders (name control is trivial single-option preservation). Gate permits an experimental end-to-end trial only. No production change. See `../experiments/results/morphology-2026-09-18T07-42-44.729Z/report.md`.

## R15.7 morphology in full conversations

Memory preserved; Chinese explanation grammar improves but relational precision remains borderline. Creative text still has subjectless fragments and weak happier revision. No production gate passed. See `../experiments/results/morphology-conversation-2026-09-18T07-43-54.849Z/report.md`. Inspect EOS and competing continuations before proposing more control stages.

## R15.9 bounded lookahead

Three conditional states: longer-branch comparison selects better grammatical paths than greedy first choice, including automatically generated `Finally it was found!`. Two option orders agree. Costs 20 calls and 66k–75k input tokens per decision, so this is not suitable at every word. Story semantics remain weak; no complete-chat acceptance. See `R15.9-results.md`. Next investigate fixed-budget sentence-boundary branching on fresh whole conversations.

## R16 bounded branching on fresh conversations

Explanation grammar improves, but story surprise still fails. Branching pushes first usable output to 7–9s and adds overall calls/tokens. No full quality gate passed; unconditional sentence-start branching not accepted. See `R16-results.md`. Focus next on requirement discrimination over actual generated candidates, keeping no-adequate-candidate cases visible.

## R17 real-output verification

Broad adequacy Noul falsely accepts all four preregistered negatives at0.5; explicit-constraints check rejects only one of two surprise failures. Good/bad adequacy scores overlap, so increasing the threshold is not a validated fix. Do not add automatic approval based on these scores. See `../experiments/results/real-output-verification-2026-09-18T07-52-31.090Z/report.md`. Goal remains general generation, not a judged-template system.

## R18 local candidate window

Rejected: child explanation breaks grammar, story echoes prompt, revision reaches step limit incomplete. Trace checks confirm full prefixes remain intact in state. No cost/quality improvement demonstrated. See `../experiments/results/local-window-2026-09-18T07-53-42.258Z/report.md`. Keep full display; avoid further unprincipled tweaks on the same few prompts.

## R19 external source audit

Pinned reference benchmarks also contain significant failures and cover only four repeatedly tuned prompts. Important omitted variable: subtitle-based versus web-based word frequencies; only2345/4096 words overlap. Reference includes missing common forms. Source/provenance and algorithm differences documented in `R19-external-audit.md`. Next isolate vocabulary source; do not bundle all external heuristics or claim exact replication.

## R20 subtitle vocabulary ablation

Different lexical coverage gives coherent basic content but leaves story grammar and surprising-ending compliance failures. Four replies, no production gate passed. See `../experiments/results/subtitle-vocabulary-2026-09-18T07-57-33.319Z/report.md`. Do not treat word-source change as sufficient. Future editing probes must use actual Jev outputs and mechanical proposals, with semantic omissions reported separately.

## R21 actual-reply mechanical editing

Partial grammar repairs, nonmonotonic intermediate edits, high long-draft cost, and unchanged semantic omission. Not suitable as automatic finalizer. See `R21-results.md`. Do not raise iteration cap to paper over missing semantic proposals. Need a sentence-level generation hypothesis grounded in cumulative evidence before more local tweaks.

## R22 grammatical chunk candidates

Generic two-word options are selected but fail to eliminate grammar errors and missing surprise. No production acceptance. See `../experiments/results/grammar-chunks-2026-09-18T08-01-23.043Z/report.md`. Audit earlier semantic-frame evidence before a materially different generation hypothesis; avoid repeating local heuristic tweaks.

## R23 cumulative audit

Re-read early semantic-frame failures to avoid repeating the comparator drift. `R23-generation-evidence-audit.md` distinguishes grammatical realization, semantic role binding, candidate coverage and actual general-dialogue success. A potential untested route is incremental joint grammar-tree construction; it must not be R8 independent slots or R12 advice templates renamed. No production changes or completion claim.

## R24 syntax-state implementation

Research-only immutable typed-hole expansion substrate and four offline invariants implemented. No API generation or renderer yet; cannot count this as grammar quality, facts, or chat success. Coverage gaps explicit in `R24-syntax-substrate.md`. Next rendering/valency checks before bounded Jev trials; do not specialize the product to supported constructs.

## R25 first real tree-generation pilot

Three domains, same sequential grammar. Causal explanation aborts unsupported; event prediction is grammatical but overcertain; advice restates goal. Zero clean full-task passes. Tree conditioning alone does not solve semantic planning. 6–11 calls/2.8–4.2s. See `R25-results.md`; no product change or completion claim.

## R26 concrete NP expansion

Six cases: one unlocalized HTTP400 (instrumentation now records future outgoing/error payloads), goal restatement persists, abstract clause rejection persists, warm-spoon sense/complement gap. Concrete referents improve one output but no clean full-task pass. See `R26-results.md`. Pause structural feature accretion; do not rebuild specialized response handlers.

### R26 HTTP400 resolved

Targeted reconstruction confirms max_tokens_exceeded, not choice-count limit. Replacing repeated full trees in126 criteria with subtrees yields HTTP200 while retaining full state (63,631→21,513 bytes). Future research runner updated; old evidence preserved. See `R26-transport-diagnostic.md`. No answer-quality success inferred.

## R26.1 compact generator replay

Transport fixed across all six cases; content failures persist: three no-answer/unsupported, two goal/input restatements, one overcertain plausible event. Park tree-first architecture rather than expand per-task grammar. See `R26.1-results.md`. Utilities retained, no live changes, no completion claim.

## R27 full general-chat prototype comparison

ASCII0/16 adequate vs word10/16,3 borderline,3 failures. Predeclared experimental-improvement quality gate passes; final reliability gate does not. Runtime streaming/cancellation/history/browser verification still required before switch. See `../experiments/results/promotion-word-2026-09-18T08-17-07.254Z/assessment.md`. This is a staged general-chat prototype, not a change to the final objective.

## R27 runtime extraction checkpoint

Added server/word-reply.ts with exact selected research mechanism, server-only vocabulary + attribution, deterministic inflections, abort-aware provider evaluator, explicit 40-step/500k-input budget endings, incremental fragments and full prior history/prefix on every request. Four new meaningful lifecycle tests;18 total server tests and build pass. Actual API smoke returns “I am Jev”,9 requests/57,060 input tokens/5.7s, recorded under `../experiments/results/runtime-word-smoke-2026-09-18T08-23-45.486Z/`. This smoke checks integration only, not broad quality. Default /api/chat remains ASCII pending HTTP/browser checks and final dependency/UI wiring. Experimental-promotion gate not yet fully satisfied; final goal still incomplete.

## R27 experimental word runtime enabled

Actual browser confirms streamed replies, fresh arbitrary-name recall, stop, reload persistence and retained histories. `R27-runtime-browser.md` records evidence. Default localhost chat now uses pure Jev word generation. This is an explicitly experimental improvement over ASCII, not final goal completion; held-out quality and stability remain outstanding.

## R28 fresh served-decoder evaluation

Eight HTTP turns expose shadow factual error, weak adaptation and exact identifier loss; colors/order pass. Generic digit/hyphen/underscore preservation fixed and served follow-up verified exact Vexa-731.19 tests/build pass. Original failures retained separately from post-fix regression. See `R28-results.md`. No final completion.

## R29 shadow trace

Replay produced observational “sun moves across the sky,” not original false orbit claim. Earth was available in current candidates; original exact error path remains unknown. Evidence and limitations in `R29-shadow-trace.md`. Do not overinterpret a differing replay as a fix. Next consider transparently sourced factual context under pure-Jev constraint, without replacing general chat by a fact-only tool.

## R30 controlled evidence-state injection

Two questions × none/relevant/unrelated sources: no clear improvement; sourced evaporation output malformed. Candidate pool held fixed. No retrieval integration justified. See `R30-results.md`; next distinguish source-word coverage from evidence uptake without claiming curated passages test retrieval.

## R31 source lexical coverage

Source-word addition repairs evaporation expression relative to state-only, at24.7s/249k input tokens; shadow still lacks rotation. Curated-source realization only, no retrieval/general-chat proof. See `R31-results.md`. No runtime search enabled.

## R32 evidence controls and time preservation

Synthetic source conflicts/missing details/corrections recognized, but grammar and numeric punctuation failed. Generic internal colon/period preservation added; actual served reply16:20 verified.20 tests/build pass. See `R32-results.md`. No automatic retrieval or final-quality claim.

## R33 corpus contraction normalization

12 base-only invalid auxiliary stems normalized after controlled test; user text untouched. Correct hasn't now available, but conflict prose remains weak and no overall cost gain established.4,096-word size retained, attribution updated,20 tests pass, local server restarted. See `R33-results.md`.

## R34 served repeatability

Four question families × three repeats: code/format/basic action stable and adequate; shadow stable but incomplete. All12 EOS-ended. Exact implementation hashes retained. See `../experiments/results/served-stability-2026-09-18T08-43-27.002Z/report.md`. No broad reliability or final-completion claim.

## R35 practical multi-turn tasks

Correct metal-spoon explanation and contextual denial, useful first polite rewrite; planning weak and shorter revision drops prior polite style. No final reliability claim. See `R35-results.md`. Next investigate active user constraints without repeating failed coarse operation classification.

## R36 explicit user-request salience

Invitation format/tone improves in one paired dialogue, but both arms shorten invoice deadline to “Send Monday,” dropping object/politeness and changing by→on meaning. Not adopted. Exact deadline-token presence alone is inadequate evaluation. See `R36-results.md`.

## R37 unfiltered conversation spans

Fewer calls on invoice rewrite, but copied user instructions become preamble in invitations and break sentence constraint. Polite shortening still fails. Reject unfiltered spans; source-role/content boundaries require separate evidence. See `R37-results.md`. Runtime unchanged.

## R38 scoped copy

Copy from latest assistant/explicit quotes preserves tested updated dates with fewer calls; no observed prompt echo. Tone remains weak and histories differ; initial invitation has no eligible spans so its answer difference is not an intervention effect. See `../experiments/results/scoped-copy-2026-09-18T08-53-07.960Z/report.md`. Need matched-history repetitions before adoption.

## R39 matched copy controls

Repeated date edits faster with copy, but same-history formalization produces malformed phrase joins in both copy rounds. No-regression prerequisite fails; no runtime adoption or specialist fast path. See `../experiments/results/matched-copy-2026-09-18T08-56-11.978Z/report.md`.

## R40 request batching topology

Splitting independent question maps into2-question/concurrency4 requests shows no median latency benefit and increases input tokens/physical calls. Not adopted. See `../experiments/results/batch-topology-2026-09-18T08-58-52.236Z/report.md`. Existing independent-question batching retained.

## R41 local cost check

Inflection memoization saves only about1ms per observed reply sequence despite a large relative microbenchmark ratio. Not adopted; provider requests dominate. Exact output digests unchanged. See `R41-local-cost.md`. No misleading end-to-end speed claim.

## R42 source-span gate

Raw selections12/12 correct in-context and10/10 GENERATE for absent answers, but predeclared0.9 confidence gate emits only1/12 positives. Optimization gate fails; no runtime route. See `R42-results.md`. Do not post-hoc lower threshold; independently test sufficiency on fresh controls if pursuing.

## R43 independent span sufficiency

Raw selection16/16 positive and12/12 GENERATE;0.9 Noul gate emits only8/16, fails predeclared coverage. No added accuracy demonstrated; no integration. Mixed assistant/user contradiction controls are missing. See `../experiments/results/span-sufficiency-2026-09-18T09-04-24.042Z/report.md`.

## R44 mixed-role span gate

16/16 local observations correct (8 exact source,8 GENERATE), including erroneous assistant and user corrections. Prerequisite passes for a bounded runtime experiment retaining universal generation fallback; not overall reliability. See `R44-results.md`. Cancellation/budget/accounting and live verification still required before enablement.

## R45 exact-source optimization enabled locally

Bounded exhaustive source selection with universal word fallback, shared accounting/cancellation;25 tests/build and actual browser exact/corrected codes/reload pass. Source literal spacing/punctuation verified. `R45-source-runtime.md` records differences/limits. General generation quality still unresolved; goal remains active.

## R46 served shortcut/fallback controls

Exact quoted whitespace/punctuation works in1call; combined facts and unknowns use general fallback appropriately. Arithmetic wrong and creative grammar fail in fallback. See `R46-results.md`. Source acceleration is not a reliability fix; consider strictly parsed deterministic arithmetic per skill while retaining general chat.

## R47 exact arithmetic tool

Strict two-operand parser + Jev contextual tool selection + exact rational code.31 tests/build, four actual HTTP cases and browser6+7→13 pass; prior label instruction respected. About attributes computation to code. See `R47-arithmetic-tool.md`. General decoder and unresolved quality gaps retained; no completion claim.

## R48 user-directed agent loop, packages and visible tool UI

Implemented minimal pi-style generic loop, Jev model adapter, registered tools, cross-turn call/result replay, independent ui/agent/jev-core workspaces, Errand-style inline tool activity.41 tests/build and package boundaries pass; real multi-step and cross-turn calculations verified in browser. Later TypeSafe TLS/timeout failures retained, not counted as generation success. See `R48-agent-packages-ui.md` and `../docs/architecture.md`. General answer quality still not complete.
