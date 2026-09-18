# Tool activity UI

Visual reference: installed Codex desktop inside `/Applications/ChatGPT.app`, version `26.908.70816`. Frontend assets were extracted from `Contents/Resources/app.asar` into a temporary directory for inspection. No installed application files were modified; no extracted application source is shipped with Jot.

Relevant bundle components: `tool-activity-disclosure`, shared activity header/chevron primitives in `app-initial`, and command activity labels in `active-tool-activity-label` / `conversation-blocks`.

Jot implements the same visible treatment with its own React component and existing Lucide icons:

- Neutral, single-line `Running` / `Ran` / `Failed` / `Stopped` summaries.
- Thin 16px tool icons, regular chat-size text, 6px icon/text spacing, 14px disclosure chevrons.
- Truncated summaries; full arguments and output remain available on expansion.
- Chevrons appear on hover, keyboard focus, or open details; touch layouts retain a discoverable chevron.
- Active text uses a subtle shimmer; reduced-motion preference disables animation.
- Active calls appear before completed history while the turn is running.
- A live work-duration label and 0.5px separator sit above the activity list. Completed/failed/interrupted state uses recorded elapsed time.
- Green completion checks, the old vertical activity rail, bold tool labels, and collapsed per-row duration columns are removed. Per-call duration remains in expanded details.

Codex uses configurable chat typography. Jot maps this to its current 13px tool text with a 22px line height, and 13px monospaced output. Component state and output continue to come from actual agent events; styling does not synthesize successful tool results.

Verification: actual Jot history rendered with the new rows; live standalone component checked for ticking work time, running/failed/stopped state, keyboard expansion, long-text truncation, and a 342px-wide content area without horizontal overflow. Temporary fixture/server is not part of the app.

Conversation chrome uses a 46px header and user bubbles with 10px vertical / 16px horizontal padding and 22px corners. Composer focus does not change its border or shadow. Per-reply branding and redundant elapsed/copy footers are omitted.

The conversation header overlays scrolling content with a translucent background, 16px backdrop blur without a shadow; it displays the current chat title. Browser-panel controls use hover-only fills. Panel width/opacity transitions take 220ms and respect reduced motion.

Tool activity is expanded while running and collapses as a group on completion; its elapsed-time header toggles the preserved call history with a short transition.
