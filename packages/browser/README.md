# @jot/browser

Owned Chrome sessions, independent of models, agent loop and UI. Uses Patchright
1.63.0 and CDP live frames. Never attaches to the user's personal browser profile.

`BrowserSession` exposes `observe`, `act`, `input`, `subscribe` and `close`.
Observations expose indexed visible controls, names/values, native select options,
viewport text and snapshot IDs. Actions use observed IDs. Stale snapshots, changed
or covered targets, password/file targets and non-web navigation are rejected.
Open shadow roots are included; nested frames are not yet indexed.

The server's `BrowserPool` owns up to four active sessions. Each chat receives a
separate persistent profile under `.cache/browser-profiles/<sha256(chatId)>`.
Profiles survive server restarts and idle eviction; each profile directory has
owner-only permissions and is excluded from Git. They contain sensitive site
state, including cookies and local storage. Chat deletion currently does not erase
its profile. Do not upload or commit profiles. A login in one chat is not shared
with another chat.

Chrome runs headless by default so remote input cannot activate a native browser
window. The right-hand panel streams and controls that same page, using the same
persistent profile. `JOT_BROWSER_HEADLESS=0 npm run dev` explicitly opts into a
visible native window. The `BrowserSession` constructor
also accepts `headless`, `profileDirectory`, `executablePath`, `width` and `height`.
Without `profileDirectory`, the context is temporary (useful for isolated tests).
On macOS the installed Google Chrome is used; elsewhere provide an executable or
install the matching browser with `npx patchright install chromium`.

We retain an explicit viewport to match Jot's resizable viewer. No custom user
agent, headers or fingerprint scripts are injected. Patchright is not a guarantee
against verification challenges. Network reputation and site policy still apply;
automatic CAPTCHA solving is not implemented.

`subscribe` publishes status and live JPEG frames from the same page used by
operations. Manual input is ordered separately from navigation so a pending load
does not block keys. SSE and the canvas renderer drop intermediate pending frames
under backpressure. No model-generated selector, JavaScript or shell executes.

Run `npm run test:browser --workspace=@jot/browser` for real Chrome tests covering
observations, actions, stale guards, input during loading and persistent site
state across restarts. Standard tests avoid launching a browser.

Reference: browser-use/jev-ultrafast dynamic indexed actions and freshness guards.
Implementation stays in TypeScript; no external text-generation model or Python
browser harness is required.
