# R1 — controlled character-copying diagnostic

Preregistered 2026-09-18 before collecting this experiment's responses.

Question: can Jev choose a character when the entire correct source text is already visible, and does representation or code-side position extraction change accuracy?

18 synthetic prefix/source cases × 4 methods × 2 candidate-order repetitions = 144 independent API requests. Each request contains one Choice question. No generation-quality inference from copying success. Source strings include ordinary words, repeated whitespace, newline, digits/punctuation, arbitrary symbols, and end-of-sequence. Ground truth is computed locally from source and prefix.

Methods:

- raw: raw character keys, descriptions naming the character; source and prefix supplied.
- opaque: neutral option IDs, explicit JSON-quoted character descriptions; same source/prefix.
- contextual: neutral IDs, candidate description is the entire prefix plus one character; same source/prefix.
- remaining: code supplies the exact remaining source suffix and asks only for its first character; neutral IDs as above. This is an intentionally assisted control, not a production proposal.

Candidates are 95 printable ASCII characters, newline, EOS in every method. Only candidate ordering changes between repetitions. All requests preserve original source whitespace. No cross-method answers are exposed in state.

Primary metric: exact selected-character match over every valid response. Report per-method, character type, and case. Show probability assigned to the correct answer and selected confidence. Record transport errors separately; no rerun of incorrect answers.

Decision: no method is promoted to a chat decoder based on this test. Below 95% exact copying deprioritizes that representation as a reliable low-level primitive. At or above 95% only qualifies for a later held-out continuation test. The threshold is an engineering gate, not a claim of statistical significance.

Scope: this short list is a diagnostic development set. It is not a random corpus, and two repetitions are not independent tasks. Ranking methods does not establish Jev's architecture or tokenizer.
