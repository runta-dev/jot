# R19 external implementation evidence audit

Inspected pinned Code-Forge-AU/jev-llm revision 7ddd11876c2a84199baf84af43ee4a0274fbe764:
- https://github.com/Code-Forge-AU/jev-llm/blob/7ddd11876c2a84199baf84af43ee4a0274fbe764/README.md
- https://github.com/Code-Forge-AU/jev-llm/blob/7ddd11876c2a84199baf84af43ee4a0274fbe764/results.md
- https://github.com/Code-Forge-AU/jev-llm/blob/7ddd11876c2a84199baf84af43ee4a0274fbe764/words.txt

Author's benchmark is four repeated prompts (dogs, egg boiling, identity, French capital), with variable settings and visible defective outputs. It does not establish multi-turn quality, corrections, unknowns, creativity or held-out performance. Several settings repeat fragments, overclaim universal help, or produce bad word order. These are author-reported results, not our independent API measurements. Do not cite the attractive README output as proof of reliable chat.

Material differences from our algorithm-level recreation:
1. Their words come from hermitdave/FrequencyWords (OpenSubtitles-derived frequency lists), while ours used google-10000-english. With our 4096 alphabetic-word extraction limit, overlap is2345. Reference contains turns/faces/dad absent from our base; rotates absent from both. This is a coverage explanation, not demonstrated global quality improvement.
2. They inject punctuation into every proposal group and generic function-word bigrams into final options. We add punctuation only at reranking, no bigrams.
3. They use trigram repetition suppression, vocabulary widening and terminal-punctuation-gated EOS. Our tested variants differ. These differences prevent claims of exact replication.
4. They compare probabilities across groups for topic selection; we deliberately retain fixed top counts per group. Neither has established cross-group calibration.
5. Their beam experiment reports no visible quality improvement. Their speculative batching targets latency, not different prediction quality on the same accepted prefix.

Reference word-file SHA256:5351ff405b1126ef555791dd4d9798a48e3e9a501a9fc481a9da957752cfb458. Research snapshot at .cache/research/frequencywords/reference-en.txt. Upstream https://github.com/hermitdave/FrequencyWords README declares CC BY-SA4.0 for content, MIT for code, and OpenSubtitles source. Preserve attribution and share-alike obligations if distributing a derived list; not integrated in product. No license grant inferred for the external application's source code.

Next isolated hypothesis: conversation-oriented lexical coverage improves broad expression at the same candidate count. Compare word-bank change alone with the current full-continuation morphological generator on the fixed development set, preserve actual history, no phrase/rule changes, and measure quality/cost. Pre-register before inference. Do not add discovered evaluation-specific words by hand. This tests representation coverage, not an alternative generative model; all choices remain Jev. No narrowing of the general-chat objective.
