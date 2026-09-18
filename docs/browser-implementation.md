# Browser use implementation

Goal: general browser work through the existing agent loop, in independent `@jot/browser`, with an interactive right-side viewport displaying the same owned page. No English-generation experiments.

Reference reviewed: browser-use/jev-ultrafast agent/browser/snapshot sources. Adopt indexed DOM controls, operation-compatible targets and current-state guards. Its separate text-generation model is not adopted: Jot remains Jev-only.

## Implemented foundation

- Workspace package with no UI/Jev/agent dependency.
- Isolated owned Chromium, lazy startup, lifecycle close and sequential operations.
- Navigation, observation, click, fill, select, scroll, wait and history/reload primitives.
- Actual visible-node identities, document/form fingerprints, target semantics and occlusion checks; no model selectors/scripts.
- CDP live-frame events with acknowledgements, shared with the active page.
- Real browser fixture verifies input, dropdown, click, visible result, frame delivery, stale snapshot, changed target and cancellation.

## Next integration

1. Per-chat session manager and loopback-only HTTP/event transport.
2. Register browser tools with the existing model adapter; refreshed observations provide their dynamic argument choices. Preserve failed/stale action results in agent context.
3. Right-side resizable/collapsible viewer with address/history/loading controls and live frames; pointer/keyboard input sent to that same session, with takeover/cancellation.
4. Real local multi-step workflow and external web navigation through Jot UI; verify lifecycle and responsive layout.

Right-side panel shell and resize/toggle controls are implemented. Open uses the requested PanelRight split-view icon; collapse uses Errand DetailPanel.tsx ChevronsRight (18px). The panel currently reports no browser connection; live content and agent tool registration are still pending. Initial DOM reader includes open shadow roots, but frame indexing, downloads/uploads and complex keyboard widgets need later validation. Passing one local fixture is implementation verification, not a claim of general browser reliability.

## Local streaming responsiveness

Manual keyboard, text and pointer input now use a separate ordered queue from
navigation/agent actions. A page waiting for DOMContentLoaded no longer holds
manual input behind its resources. Adjacent pending wheel events are combined;
clicks and keys preserve their order. The viewer's wheel listener is non-passive
so scrolling the remote page does not also scroll Jot.

SSE respects socket backpressure and retains only the latest pending frame and
status. The viewer decodes at most one frame at a time, replacing pending frames
with the newest, then draws directly to canvas without a React update per frame.
CDP capture timestamps are retained. JPEG quality remains 75.

Local Chromium check (2026-09-18): with a script delayed by two seconds, a manual
input request sent 200 ms into navigation took 1,894 ms before the queue split
and 2 ms afterward. Once focused and loaded, 12 input-to-CDP-frame samples after
the change were 28, 24, 6, 6, 6, 6, 7, 11, 6, 6, 8, 6 ms. These measure the browser
backend, not full input-to-display latency. The Jot UI was separately checked with
actual text entry, Enter submission and scrolling to the bottom of a local page.
A gated-resource Chromium regression test asserts input arrives before navigation
completes; a decoder test verifies intermediate frames are dropped and late decode
callbacks are ignored after unmount.

## Persistent desktop Chrome (2026-09-18)

The browser driver is now pinned to Patchright 1.63.0. Server-owned sessions use
headed Chrome and per-chat persistent profiles in `.cache/browser-profiles`, with
owner-only directory permissions. Native Chrome and the Jot viewer operate the
same page. Cookie and local-storage persistence across close/reopen was verified
with a local site; indexed actions, stale guards, loading states and live frames
also passed real-browser tests. The running Jot UI successfully entered text and
submitted the local form through the streamed panel after the driver switch.

This establishes persistence and functional compatibility, not a measured
reduction in Google challenges. No CAPTCHA was solved and no claim of undetectable
automation is made. The explicit resizable viewport remains for the embedded UI.

## Agent tool composition

`server/browser-tools.ts` adapts the browser package into the existing generic
`ToolFactory` interface. Jev selects an operation and then its typed arguments;
execution uses only currently observed IDs and exact user-supplied text/URLs.
The seven tools are observe, navigate, click, fill, select, scroll and wait.
Browser execution stays in `@jot/browser`; the generic loop and provider core have
no browser dependency. HTTP chat IDs bind agent tool leases to the same session
used by the UI stream. Browser calls automatically reveal the panel.

A real Jev HTTP run opened the local fixture, filled `Jot works`, clicked its
submit button and returned page evidence `Received: Jot works` in 5.5 seconds,
seven provider requests. Initial UI testing revealed a viewport/error-banner
feedback loop: stale errors changed panel height and triggered another resize.
Stale-target errors now invalidate the observation and return only through the
tool result; they do not mutate browser chrome error status. A fresh observation
is required before offering target tools again.

Current limits: text entry selects bounded exact spans from the latest user
message; arbitrary generated strings are not yet supported. Browser page text
may be returned verbatim rather than summarized. These are explicit capability
boundaries, not proof of general multi-step task reliability.

After fixing the feedback loop, the real Jot UI completed navigation → fill →
submit in approximately 5 seconds and displayed `Received: UI browser check`.
A second user turn, without repeating the URL, replaced the field and submitted
again in approximately 2 seconds. Both the live page and chat showed
`Received: Second turn works`. This verifies one local two-turn form workflow;
it does not establish broad reliability across external sites or nested frames.

Headless is now the default to prevent native-window focus stealing during input.
Existing per-chat profile paths are unchanged. Sandbox remains enabled. Headless
browser integration tests cover input, streaming, loading and profile persistence.

## Lifecycle and multi-step checks

Pool regressions cover concurrent leases, idempotent release, preserving active
sessions, deterministic idle eviction and rejecting queued/new acquisitions during
shutdown. Pool shutdown is idempotent and attempts all session closes even if one
fails. Recency uses a monotonic access counter rather than wall-clock ties.

A blocked-resource navigation test initially timed out after cancellation:
`Page.stopLoading` alone did not settle the navigation promise. Navigation now
races its wait with cancellation and releases the queue after stopping loading.
The real-browser test subsequently opened a new page successfully (entire test
about 0.8 seconds, including browser startup).

A real Jev run against `scripts/browser-task-fixture.ts` completed navigate → fill
Name with Ada → select Green → scroll → click Continue. The resulting page read
`Completed / Name: Ada / Color: Green`; no preselected action sequence was passed
to the model. It took 20.1 seconds, 11 provider requests, 94,823 input tokens and
2,377 output tokens. This records a successful local multi-step run, not a broad
success-rate claim. Provider token cost remains an optimization opportunity.

## Public navigation and direct page reading

A real Jev task visited `https://example.com`, clicked Learn more and requested
the destination title/headings. The first run exposed two failures: a completed
click was reported as failed while waiting on navigation under a one-second
click timeout; later, composing metadata as generated words exhausted the budget.

Clicks now use the bounded, abortable navigation wait (15 seconds). A regression
serves a destination after 1.3 seconds and verifies one request, a successful
click result, and correct destination title/headings. `browser_read` exposes exact
URL, title, headings or visible text as deterministic tool results. The snapshot
reader collects visible headings; no model-generated metadata is substituted.

The same public task subsequently completed using navigate → click → read:
`Title: Example Domains`, headings `Example Domains` and `Further Reading`.
It took 14.3 seconds, seven Jev requests, 30,703 input tokens and 498 output tokens.
This proves one public navigation workflow, not general challenge bypass or a
broad external-site success rate. All 47 normal tests and six owned-browser
integration tests passed after this change, along with the production build.

## Navigation without a supplied URL

Removed the tool-availability gate requiring an explicit HTTP(S) URL. Navigation
now accepts bare domains and omnibox-style text, using the same address resolver
as the UI (a pure exported browser-package helper). `browser_search(query)` opens
a real Google query in the same browser session. Operation selection instructions
require actual tool evidence before claiming browsing/search completion.

Tests verify both bare-domain normalization and search availability without any
URL. A real Jev request containing only a quoted search topic invoked
`browser_search` and reached Google. Google returned its unusual-traffic
verification page, so this is evidence of actual navigation, not successful search
retrieval. The test was stopped without interacting with the CAPTCHA. Challenge
handling still needs a dedicated stop/handoff behavior to avoid redundant retries.

Exact quoted/multiline input is now retained beyond the previous six-word span
limit. A real textarea task preserved the complete two-line text, including the
second line's indentation, in the actual `browser_fill` arguments and submitted
it. The test completed in 12.5 seconds with seven provider requests.

## Generated search arguments

`browser_search.query` is now a free string parameter, not an enumeration of
source spans. The Jev adapter reuses `generateWordReply` with argument-specific
instructions, original conversation and tool observations. Other enumerated
parameters (observed targets, direction, select options) retain validation.
No extra model, keyword rewriting rules or search-specific decoder was added.

A real request `search latest news about runta` produced the actual tool argument
`Runta news latest` after 5.7 seconds / ten provider requests. This is generated
word ordering, not a contiguous source span. Google returned a verification page;
the test was stopped without interacting with its CAPTCHA. This verifies argument
generation, not successful retrieval. Regression coverage also verifies generated
arguments reach the actual tool call and continue to share cancellation/budget
handling with the existing generator.

## Verification-page handoff

Browser observations identify an interruption only when both a visible challenge
iframe and explicit blocking-verification text are present. This is a conservative
heuristic, not universal CAPTCHA detection. A normal contact form containing a
CAPTCHA alone does not trigger it. The adapter returns a `needs_input` tool result;
the generic loop preserves the trace, displays the tool's explanation and pauses
without another model call. History parsing accepts the new reason for later turns.

A real Jev request against the local verification fixture navigated once and
stopped with `needs_input` in 2.5 seconds / two provider calls. It did not retry
search, compose a misleading answer or interact with verification controls.
The text is a deterministic tool explanation, not attributed to Jev reasoning.
55 normal tests, seven real-browser tests and the build passed. Actual external
verification controls were not solved during this check.
