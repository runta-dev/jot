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
