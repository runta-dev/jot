# R47 deterministic arithmetic tool inside general chat

Implemented strict full-request parser for two bounded signed decimal/integer operands and +,-,*,/ (selected English/operator spellings). No eval or execution of user code. BigInt rational arithmetic preserves precision; terminating decimals rendered exactly, repeating results as reduced fractions, zero division explicit. Unsupported expressions/extra instructions fall through, not partially interpreted.

Even a strict parse is context-gated by Jev: CALCULATE versus GENERATE over full conversation and expression, without revealing result in that decision. This respects prior instructions to treat a subsequent expression as a label. Actual arithmetic result belongs to deterministic code, not Jev knowledge; About discloses this. No calculator mode replaces general chat. Source selection/word generation remain available.

31 tests/build pass: signed/large integers, exact decimals/fractions, zero division, rejection of code/partial requests/unsupported extra requirements, context gate and shared budget. Actual served HTTP cases:6+7→13 (1request,411input tokens,1.243s);0.1+0.2→0.3 (1,410,0.312s);1/3→1/3 (1,404,0.287s); prior label-only instruction then6+7→literal6+7 (2requests,2261input,0.638s). Evidence ../experiments/results/arithmetic-runtime/results.json.

Browser tab8 localhost confirms original failing question now displays13 in1.0s, controls recover, existing chat histories visible. Owned server restarted session10583. No public deployment. This fixes a narrow deterministic execution error; creative prose, unsupported mathematics and factual reliability are not solved. Final general-chat goal remains incomplete; tool success must never replace broad evaluation.
