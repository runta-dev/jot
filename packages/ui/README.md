# @jot/ui

React chat interface. Talks to `/api/chat` over streamed HTTP and imports only protocol types from `@jot/agent`; never imports the Jev client or server tools.

`ToolCalls.tsx` presents running/completed/failed/stopped tools using the compact activity rows from the Errand website as visual reference. Arguments and results expand in place. Conversation/tool history is stored under the existing `jev.chats` browser key.

Run `npm run build --workspace=@jot/ui`, `npm test --workspace=@jot/ui`, or the root `npm run dev` for the full app.
