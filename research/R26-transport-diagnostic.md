# R26 transport failure isolated

Reconstructed the failed expansion deterministically from saved last successful noun-proposal distribution, tree state and original generator source. Original full-tree-per-option form:126 choices,63,631 request bytes, HTTP400, provider error_type=max_tokens_exceeded. Evidence: ../experiments/results/tree-request-diagnostic-2026-09-18T08-13-40.153Z/.

Same126 choices, same complete state, option descriptions reduced to replacement subtree plus explicit instruction:21,513 request bytes, HTTP200,11,029 input tokens,1,169 output tokens. Evidence: ../experiments/results/tree-request-diagnostic-2026-09-18T08-14-07.423Z/. Request bytes reduced66.2%; bytes are not token counts. Original rejected request has no usage measure, so do not report a measured token reduction percentage.

Applied compact option encoding to future lexicalized-tree.ts trials. Existing source snapshots/results unchanged. This fixes one measured transport boundary, not general reasoning or language quality. Low-confidence selected candidate and remaining unsupported/tautological cases still require evaluation. No live chat change. Full-tree context remains in state; only redundant copies within criteria removed.
