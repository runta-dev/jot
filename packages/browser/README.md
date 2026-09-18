# @jot/browser

Owned Chromium session, independent of models, agent loop and UI. Uses Playwright's browser transport and CDP live frames. Does not attach to the user's personal browser profile.

Current API: `BrowserSession.observe`, `act`, `subscribe`, `close`. Observations expose indexed visible controls, names/values, native select options, viewport text and snapshot IDs. Actions use only observed IDs. Stale snapshots, changed targets, covered controls, password/file targets and non-web navigation are rejected. Open shadow roots are included; cross-origin/nested frames are not yet indexed.

`subscribe` publishes status and live JPEG frames from the same actual page used by actions; consumers must acknowledge the distinction from model observations. No model-generated selector, JavaScript or shell command is executed. Credentials are never part of the package configuration.

Run `npm run test:browser --workspace=@jot/browser` for the real owned-Chromium local-fixture test. Standard tests avoid launching a browser. On macOS the installed Google Chrome is used; elsewhere install Playwright Chromium or supply an executable path. A subsequent integration will add per-chat session ownership, HTTP/event transport, manual input and the right-hand UI panel.

Reference: browser-use/jev-ultrafast dynamic indexed actions and freshness guards. Implementation is TypeScript for Jot's workspace; no external text-generation model or Python browser harness is required.
