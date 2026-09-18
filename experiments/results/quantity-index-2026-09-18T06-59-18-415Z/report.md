# R13.1 — quantity-aware indexed comparison

Jev selects entity spans, a property and a relation. Code writes a fixed comparison construction. Grammar fluency here belongs to that construction; factual selection is evaluated separately. No entity-specific truth table or reference answer was supplied.

| Case | Output | Input tokens |
|---|---|---:|
| ice | The Density of ice is lower than that of liquid water. | 90,654 |
| oil | The Density of vegetable oil is lower than that of water. | 90,770 |
| copper | The Conductivity of copper is higher than that of rubber. | 91,133 |
| diamond | The hardness of diamond is higher than that of glass. | 90,140 |
| light | The Wavelength of blue light is lower than that of red light. | 91,703 |
| honey | The Viscosity of honey is higher than that of water. | 91,220 |
| aluminum | The Density of aluminum is lower than that of lead. | 2,896 |
| graphite | The hardness of diamond is higher than that of graphite. | 2,270 |
| unknown_samples | Insufficient information for this comparison. | 3,446 |
| fictional | Insufficient information for this comparison. | 3,281 |
| cork | The Density of cork is lower than that of water. | 90,609 |
| helium | The Density of helium is lower than that of air. | 90,573 |
| ethanol | The boiling point of ethanol is lower than that of water. | 2,802 |
| unknown_alloys | Insufficient information for this comparison. | 3,336 |

## Gate result

All eleven factual comparisons are correct at the tested ordinary-condition level, including the three new pairs. All three unknown controls abstain; the new identifier case has no explicit no-data disclaimer. Copper/rubber now selects conductivity. This clears the component development gate only.

On the original ten prompts, mean input drops from 199,706 to 55,751 tokens (72.1% reduction). Explicit-property paths average 3,005 tokens; catalog scans average 90,850. Source bank size: 2094.

QUDT quantity-kind definitions distinguish material conductivity from geometry-dependent conductance more precisely. The WordNet generic-property subtree retains non-SI properties such as hardness. Its narrower physical_property subtree was rejected by a coverage inspection before inference; no target answer was manually appended.

Capitalized ontology labels in the output still need presentation cleanup. These tests do not cover arbitrary conversational intent, multi-turn entity updates, malformed requests or live cancellation. A comparison component is not the full open-ended Jev Chat goal.

Next: package the qualified operator with explicit missing-entity handling and a fixed corpus snapshot; run fresh direction-reversal, unsupported-query and context-update tests through the actual HTTP/browser boundary before an opt-in research preview.

## Sources and attribution

- QUDT.org quantity kinds, pinned commit 75e5ef6a3bde9a01760007d148c6d52409f6a067: https://github.com/qudt/qudt-public-repo ; CC BY 4.0, QUDT-LICENSE.md where applicable.
- QUDT Electric Conductivity: https://qudt.org/vocab/quantitykind/ElectricConductivity.html
- WordNet 3.1 through wordnet-db 3.1.14; WORDNET-LICENSE.txt retained.

Full inputs, candidate catalogs, responses and costs: manifest.json, traces.jsonl, results.jsonl, summary.json. Unknown status text is a code-rendered status, not model-generated explanatory prose.
