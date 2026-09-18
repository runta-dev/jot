# R13 — typed comparison

Jev selects entity spans, a property and a relation. Code writes a fixed comparison construction. Grammar fluency here belongs to that construction; factual selection is evaluated separately. No entity-specific truth table or reference answer was supplied.

| Case | Output | Input tokens |
|---|---|---:|
| ice | The density of ice is lower than that of liquid water. | 199,343 |
| oil | The density of vegetable oil is lower than that of water. | 199,369 |
| copper | The conductance of copper is higher than that of rubber. | 199,676 |
| diamond | The hardness of diamond is higher than that of glass. | 198,893 |
| light | The wavelength of blue light is lower than that of red light. | 200,226 |
| honey | The dynamic viscosity of honey is higher than that of water. | 199,989 |
| aluminum | The density of aluminum is lower than that of lead. | 199,754 |
| graphite | The hardness of diamond is higher than that of graphite. | 199,009 |
| unknown_samples | Insufficient information for this comparison. | 200,547 |
| fictional | Insufficient information for this comparison. | 200,254 |

Seven of eight factual cases are unambiguously correct under ordinary conditions. Copper/rubber uses conductance rather than intrinsic conductivity; without specimen geometry this is imprecise and is not counted as a clean pass. Both unknown-material cases abstain.

Mean input cost is about 200k tokens per response, with ten requests. This is a feasibility result, not an efficient chat implementation. WordNet definitions are lexical descriptions, not a precise scientific quantity ontology.

## Sources and attribution

- QUDT.org quantity kinds, pinned commit 75e5ef6a3bde9a01760007d148c6d52409f6a067: https://github.com/qudt/qudt-public-repo ; CC BY 4.0, QUDT-LICENSE.md where applicable.
- QUDT Electric Conductivity: https://qudt.org/vocab/quantitykind/ElectricConductivity.html
- WordNet 3.1 through wordnet-db 3.1.14; WORDNET-LICENSE.txt retained.

Full inputs, candidate catalogs, responses and costs: manifest.json, traces.jsonl, results.jsonl, summary.json. Unknown status text is a code-rendered status, not model-generated explanatory prose.
