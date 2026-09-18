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
