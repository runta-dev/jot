# Browser task regressions

`npm run test:flights` runs the exact user-supplied Google Flights task through
Jev, the normal agent loop and browser tools. It makes real provider requests and
opens an isolated browser, without using the user's profile. It does not buy or
reserve a flight. It is opt-in, outside the ordinary unit test suite.

Runs write their case, streamed tool events, per-provider-call timings/usage,
final observation, final frame and report beneath `.cache/browser-regressions`.
Credentials are loaded server-side and are never included in these artifacts.
Default settings match the application: 24 turns, 500k input-token budget, 180s
wall-clock timeout, headless Chrome. Set JOT_BROWSER_HEADLESS=0 for headed Chrome.
Browser startup and navigation are included in reported elapsed time.

The runner exits 0 only when the final page passes every check in
`flights-oracle.ts`: visible route controls, trip type, adult count, economy,
visible departure date plus full ISO date in the URL's travel state, and actual
flight-option text. It writes a final frame for visual review. `firstMatchingMs`
records when matching options first appeared in tool observations. The oracle
only reads evidence; it never supplies a URL, action, selector or answer to Jev.
It is specific to this regression and Google's current English UI. DOM changes
can cause a conservative failure and require review.

The 7.1s jev-ultrafast reference is user-reported, not a controlled measurement
in this environment. Network, browser/profile and provider conditions matter.
