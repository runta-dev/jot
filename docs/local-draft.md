# Local draft answers

Jev continues to choose tools and generate tool arguments. The user-authorized
exception is `draft_answer`, which now calls a local LFM2.5-1.2B-Instruct service
through the server adapter. It receives a compact conversation plus clipped tool evidence (status, text, value, error, url/title), not raw snapshot control lists;
its output is streamed through the existing tool event path. No local model is
imported into the provider-independent agent or browser packages.

On Apple Silicon, install `uv`, then run in two terminals:

```sh
npm run draft:serve
npm run dev
```

The first command creates `.cache/lfm-venv` with Python 3.12 and MLX LM 0.31.3,
downloads `LiquidAI/LFM2.5-1.2B-Instruct-MLX-4bit`, and keeps it loaded on
`127.0.0.1:8081`. Dependencies and weights remain in ignored `.cache` directories.
The application server uses `/v1/chat/completions`; override the complete endpoint
with `JOT_DRAFT_URL` in the environment or `.env` if needed. No API key is required
for this local endpoint. The existing Jev key stays server-side.

Draft generation uses temperature 0.1, top-k 50, repetition penalty 1.05, a
256-token output cap and a 60-second request timeout. Cancellation propagates to
the local request. A missing service or truncated stream is a tool error, not a
silent fallback to another provider. Tool results include the local model name,
first-token time, elapsed time and returned token usage. Agent event counters
continue to track Jev usage; local usage is reported separately in the tool result.

The regular test suite uses a fake local stream and checks actual streamed text,
UTF-8 chunk boundaries, compacted conversation/tool context, dropped snapshot arrays,
incomplete streams, cancellation, and that Jev still selects the tool. Live results are
recorded below after testing.
