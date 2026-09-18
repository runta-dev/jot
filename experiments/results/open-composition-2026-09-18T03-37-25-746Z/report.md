# R8 — open composition with uniform prompts

No supporting answer text or per-topic semantic role was supplied. Generic noun/verb/adjective tournaments were followed by grammar-based clause enumeration and Jev whole-sentence selection.

| Task | Literal answer | Assessment |
|---|---|---|
| sky | The sky scatters blue light. | Borderline: imprecise actor and incomplete preferential-scattering explanation |
| procrastination | You should stop procrastinating. | FAIL: repeats the desired outcome; no method |
| tired | You should nap. | Useful basic action; not personalized health guidance |
| plant | Plants convert sunlight to energy. | Borderline: sunlight is already energy; chemical-energy qualifier missing |
| rust | Iron oxidizes with oxygen. | Useful basic oxidation explanation |
| ice | Ice floats because molecular density. | FAIL: malformed cause phrase and missing comparison with water |
| deadlines | You can track several deadlines with calendar. | FAIL: missing article, although calendar is a relevant tool |
| fall | A ball is pulled by gravity. | Useful basic causal explanation |
| reading | You can summarize what I read. | FAIL: shifts the user's reading to assistant first person |
| drying | Wet clothing evaporates. | FAIL: water evaporates, not the clothing itself |

## Gate result

FAIL. Only three outputs are clearly useful and acceptable in this small pilot (basic rest, oxidation, gravity); two are imprecise/borderline and five fail. Only gravity is a clean pass among four fresh topics. This is far below the preregistered >=8/10 and >=3/4 fresh gate, regardless of how borderline cases are counted.

The result is not rescued by recognizing individual concepts. For example, choosing evaporate correctly still produces a false proposition when wet clothing is selected as its subject. Advice that merely repeats the requested outcome is not helpful.

Mean reported input tokens per reply: 97,950. Retrieval alone is about 85k. Each reply takes 12–13 calls and 4.6–7.9s in this pilot. Cost is not yet acceptable for the observed quality.

jsRealB emitted warnings for pluralizing mass nouns such as sunlight and gravity while enumerating candidates. No returned final answer contained its [[error]] marker, but invalid realizations should be excluded before candidate ranking in a future implementation. Do not silently rewrite this experiment.

## Reference audit

- Evaporation changes liquid water into water vapor: https://www.usgs.gov/water-science-school/science/evaporation-and-water-cycle
- Atmospheric scattering, not ordinary refraction, explains the blue sky: https://science.nasa.gov/ems/03_behaviors/
- Photosynthesis converts radiant energy into chemical energy: https://www.energy.gov/sites/default/files/2014/06/f16/Student%20Edition_2.pdf

These references were used after generation for researcher assessment only; they were not supplied to Jev as hidden answer context.

Full evidence: manifest.json, traces.jsonl, results.jsonl, summary.json. No live decoder switch.
