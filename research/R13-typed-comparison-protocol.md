# R13 — typed comparisons instead of adjective placeholders

Preregistered before inference. Jev selects two entity spans, an ordered property from a fixed WordNet bank, and a categorical relation (lower/equal/higher/unknown). Code realizes the comparison. No reference property or direction is sent to the model.

Property bank: every noun synset in WordNet lexicographer categories attribute (7), phenomenon (19), quantity (23). Each option includes synonyms and its generic definition. Exhaustive group tournaments (64 candidates per group, top two retained, batches of 12 questions) avoid early group pruning. The final question selects a property and the relation jointly with explicit unknown support. Lexical resources provide property names/meanings, not entity-specific truth values.

Eight factual probes cover floating, conductivity, hardness, color-related physical quantities, viscosity, and explicit-property controls; two information-insufficient probes use unspecified/fictional materials. Entity spans are generated mechanically from user text. Expected outcomes stay local. Valid alternative properties (e.g. frequency vs wavelength) are assessed by meaning, not a single keyword.

Gate for further development: >=7/8 factually correct, grammatical comparisons, and both unknown cases must abstain. This tests one relation family, not broad chat or multi-turn ability. Report the fixed grammatical construction as code's contribution and all real request/token costs. No live promotion from this pilot.
