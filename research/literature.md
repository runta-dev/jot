# Primary-source reading notes — 2026-09-18

## TypeSafe official guidance

- https://docs.typesafe.ai/model-jaggedness/jev-1.13 — documents unreliable counting, including characters, and explicitly reports poor/slow generation through chained choices. Implication: measure low-level copying separately; do not assume an arbitrary Choice distribution is a language-model continuation distribution.
- https://docs.typesafe.ai/introduction/machine-learning-primer — describes reinforcement learning for calibrated decisions (RLCD), contrasting it with conversational response training. It does not expose a next-token head or prove a specific architecture/tokenizer.
- https://docs.typesafe.ai/models — currently 64k tokens per request, 32k for state plus longest question. This constrains vocabulary-as-criteria approaches; external tokenizer counts are only estimates.
- https://docs.typesafe.ai/cookbooks/rerank_typesafe — retrieval narrows the candidate set before semantic scoring. Relevant pattern, but retrieval coverage limits what the judge can select.

## Wang & Cho (2019): BERT has a Mouth, and It Must Speak

Primary: https://aclanthology.org/W19-2304/ ; paper https://aclanthology.org/W19-2304.pdf

Uses masked-token conditional distributions and iterative sampling to obtain sentences from BERT. It motivates testing revision rather than irrevocable append-only decoding. Its required masked-token distribution is NOT the same interface as Jev Choice. We cannot claim the paper establishes Jev generation. Initialisation and mixing/local modes also matter; changing a score into a sampler is not sufficient evidence of a useful distribution.

## Yang & Klein (2021): FUDGE

Primary: https://aclanthology.org/2021.naacl-main.276/ ; https://arxiv.org/abs/2104.05218

Combines an existing generator's probabilities with a predictor of a desired future attribute. Important distinction: a fluent language prior and a discriminator do different work. This suggests an explicit proposal-only baseline for any Jev-assisted hybrid. It does NOT remove the generator requirement, and its future-attribute predictor is trained for the task rather than assumed from a generic judge.

## Gu, Wang & Zhao (2019): Levenshtein Transformer

Primary: https://arxiv.org/abs/1905.11006

Generates/refines sequences via insertion and deletion with dedicated training. Useful design inspiration for reversible edits and dynamic length. It is not evidence that an untrained generic insertion/deletion controller can generate from empty. Our repaired-candidate selection test is much weaker than the paper's trained editor.

## Synthesis / next experiment

All three papers distinguish the proposal/conditional distribution from evaluation. Our current system has neither a demonstrated character continuation distribution nor a gold-independent high-coverage proposal mechanism. First test the simplest channel: selecting the next character of a known supplied string. Failure there redirects effort from prompt tweaking toward larger semantic units or explicitly disclosed proposals.

## WordNet lexicographer categories (official documentation)

Primary: https://wordnet.princeton.edu/documentation/lexnames5wn

WordNet organizes synsets by syntactic category and logical groupings, with 45 lexicographer files (for example noun.location, noun.communication, verb.stative). This is a possible deterministic vocabulary index, not a generator or a next-word probability model. It motivates a future comparison of semantic/syntactic groups against our arbitrary frequency blocks. Multi-sense words may belong to multiple categories; category routing can still discard the correct word and must be evaluated for coverage. No WordNet implementation or generation-quality claim is made yet.

## Rule-based surface realization: jsRealB and SimpleNLG

Primary sources: https://github.com/rali-udem/jsrealb ; https://arxiv.org/abs/2012.15425 ; https://github.com/simplenlg/simplenlg/wiki/Section-XV-%E2%80%93-Appendix-A-%E2%80%93-NLG-and-SimpleNLG

These libraries realize a supplied syntactic/semantic specification using grammar and morphology rules. They are not auxiliary learned text generators and do not choose the content of an answer. This separates Jev's candidate decisions from word agreement, punctuation, and constituent ordering. It is a different hypothesis from both next-character prediction and editing an already broken sentence.

Risks: the supplied structure may be factually wrong; a narrow schema or hand-written intent-to-sentence mapping can merely hide canned answers. A valid experiment must expose generic constituent choices and lexical provenance, compare meaning as well as grammar, include new compositions, and not claim unrestricted language coverage from a few sentence frames. Library code and lexical-data licenses are separate and must be preserved if adopted.

## TypeSafe hierarchical classification cookbook revisited

Primary: https://docs.typesafe.ai/cookbooks/hierarchical_classification.md

The official example preserves multiple paths and uses parallel questions over taxonomic branches rather than committing to a single early label. Our lexical tournament is a different structure, but R7 directly verifies the same practical concern: premature branch pruning can remove a valid candidate before the final judge sees it. We do not adopt the cookbook's reported results as our own or assume path probabilities are next-token probabilities.

## Frame semantics and lexical senses

Primary: https://icsi.berkeley.edu/stories/teaching-computers-meaning/ ; https://icsi.berkeley.edu/projects/framenet-project/ ; https://aclanthology.org/P98-1013.pdf

FrameNet represents lexical units as word senses in conceptual frames with participant roles. This motivates conditioning argument selection on a specific predicate sense, rather than a word spelling and a universal object label. It does not supply an off-the-shelf Jev generator. Our observed card/vocabulary and sort/desk failures are consistent with inadequate sense/role representation, but this explanation remains a hypothesis until controlled tests using definitions are run.

## WordNet senses, examples and generic verb frames

Primary: https://wordnet.princeton.edu/ ; https://www.nltk.org/howto/wordnet.html ; format reference https://raw.githubusercontent.com/nltk/nltk/develop/nltk/corpus/reader/wordnet.py

WordNet groups particular senses, not just spellings, into synsets and provides glosses/examples. Its verb-frame metadata is indexed per synset and sometimes per lemma; respecting word-specific frame applicability matters. The parser preserves this distinction. The data are not a complete account of modern or metaphorical usage and must not be treated as an infallible hard grammar. R11 tests show why a short gloss without its synonyms/examples can be misleading.

## QUDT quantities versus general lexical definitions

Primary: https://github.com/qudt/qudt-public-repo ; https://qudt.org/vocab/quantitykind/ElectricConductivity.html

QUDT distinguishes quantity kinds such as electric conductivity and conductance, with scientific descriptions and unit/dimension metadata. This is better suited to typed quantitative statements than assuming every WordNet lexical gloss is a precise physical-property definition. The project uses a pinned source snapshot and attributes QUDT.org under CC BY 4.0. No entity-specific comparison values were inserted.

A coverage audit also found that WordNet's physical_property subtree omits density/hardness due to its lexical hierarchy organization. The broader generic-property subtree was used as a complementary bank, rather than treating the taxonomy as a complete physical ontology.


## R15 external pure-Jev chat reference

Source: https://github.com/Code-Forge-AU/jev-llm ; inspected master commit 7ddd11876c2a84199baf84af43ee4a0274fbe764. Source downloaded for inspection only, no source copied into runtime. Root inventory contains no LICENSE file; do not assume a license grant.

Author reports grouped word choices plus continuation reranking and speculative fan-out. Source confirms fixed vocabulary and input word additions, top-four retention per group, no repeated trigrams, optional function-word phrases, and EOS after terminal punctuation. Global sorting of per-group probabilities does not establish calibrated cross-group ranking. Active vocabulary can discard required words. Speculation accelerates dependent generation only on a matching accepted prefix; it is not independent prediction of future positions. These mechanisms warrant end-to-end reproduction, not a claim of solved chat.

Official counterevidence rechecked: https://docs.typesafe.ai/model-jaggedness/jev-1.13 still cautions against chained-choice generation. We must test rather than infer feasibility or impossibility from either source.
