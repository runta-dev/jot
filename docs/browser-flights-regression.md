# Google Flights regression

The case in `tests/browser-regressions/google-flights.json` preserves the user's
original prompt. Run `npm run test:flights` for a cold browser, or `npm run test:flights:warm`
for a BrowserPool-prewarmed blank browser. Warm-up only starts Chrome; it does
not open Google Flights or reuse a login profile. Both runs use real Jev, the
normal loop and browser tools. The acceptance oracle only inspects the resulting page; it never
supplies actions or a prebuilt search URL to the agent.

## Evidence from September 18, 2026

| Run | Result | Elapsed | Requests | Input tokens |
| --- | --- | ---: | ---: | ---: |
| Initial baseline, 13:01:53 UTC | Failed; stuck on city fields, budget exhausted | 26.26 s | 23 | 519,258 |
| 13:09:50 UTC | Visually reviewed matching options; later oracle confirms | 24.62 s | 40 | 264,885 |
| 13:16:52 UTC | All automatic acceptance checks passed | 25.26 s | 40 | See saved report |
| 13:26:14 UTC | All automatic acceptance checks passed | 18.14 s | 26 | 208,688 |
| 14:34:30 UTC, BrowserPool warm blank Chrome | All automatic acceptance checks passed | 19.93 s agent (warmup 0.41 s excluded) | 23 | See saved report |

The latest run first observed matching options at 17.68 s. Its final page showed
flight options with the specified one-way route, September 20, 2026, one adult and
economy. Run folders, request timings, tool events, page observations and JPEGs
are in `.cache/browser-regressions/`. The user-reported jev-ultrafast 7.1 s is not
a measurement under this runner's network/profile conditions.

These successful runs are interspersed with failures; reliability is NOT yet
established. Failed runs include missing the trip mode, stale popovers, and Google
returning `Oops, something went wrong / No results returned`. One run encountered
`ERR_NETWORK_IO_SUSPENDED`. Do not report only the fastest successful run as a
success-rate or controlled speed comparison.

## Changes exercised

- Action decisions no longer include every tool's parameter bank. Argument
  decisions receive only the chosen operation and already-selected argument
  meanings. Reply choices point to existing results using short previews; full
  results and the persisted transcript remain intact.
- The latest browser observation supplies actionable indexes. Older observations
  retain history/text but omit obsolete control indexes in model input.
- Independent action and target choices run in one Jev request. Target-dependent
  text/select values run afterward with the selected target in state.
- Snapshot discovery omits covered controls. Same-document URL changes do not
  invalidate unchanged controls; document identity and target guards still apply.
- Bounded observation settling checks control geometry as well as values, so
  popup animations are less likely to produce immediately stale observations.
- Fill uses a real click/focus and keyboard insertion, supporting controls that
  open a replacement input in a popup.
- Read-only form state remains observable after scrolling; it does not make
  offscreen controls actionable. Full-page text is retained for acceptance
  evidence, not added to the main agent's normal tool-result context.

The active goal remains open: improve repeatability and close the remaining
latency gap. No external generation model or flight-specific action script was
introduced. Current checks include negative cases for wrong year, wrong route,
missing trip mode/cabin/adult count and missing flight options.
