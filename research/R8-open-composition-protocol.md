# R8 — uniform open-question concept planning + realization

Preregistered before execution. Pure Jev only. Ten questions: R7's six development topics plus four new topics (deadlines, falling ball, remembering reading, drying clothes). No answer source, expected terms, or topic-specific semantic-role prompt is sent to the model.

Same generic noun/verb/adjective role instructions for every question; exhaustive group tournaments retrieve candidates from fixed vocabulary. Use all noun/verb group finalists, query spans, top-ranked adjective+noun combinations and generic pronouns as planning options. Assistant identity constants are allowed but no other source facts are supplied. Lexicons and jsRealB provide words/grammar, not learned text generation.

Retain up to two alternatives per semantic/grammar slot, realize up to 200 probability-ranked core clauses, and use Jev to select the best. Add can/should modality (deterministic grammar) and noun-number options. Compare up to two generic modifiers from retrieved concept phrases; no prewritten complete answers. Record provenance and costs for retrieval separately from realization.

Budget: <=9 concept-retrieval requests plus <=4 realization requests per case; max two modifiers, one sentence. This single-clause limit is a prototype boundary, not the final chat scope.

Assess grammar, responsiveness, factual correctness and practical usefulness separately. A relevant noun or vague instruction is not a passing answer. Physics explanations must identify the relevant mechanism; advice must offer an action rather than merely say help/advice. Plant output must not assert plants synthesize energy. Pass for further testing requires >=8/10 useful accurate answers and >=3/4 new topics, with no materially false factual statement. Even a pass is not production/open-dialogue completion: multi-turn, creative tasks and abstention remain untested.
