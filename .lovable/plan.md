## Goal

Move AI Hub conversations from browser-only storage to the Express backend when it's running, and add a retention setting (max conversations) with a manual cleanup button.

## Backend (`server.js`)

- Add `conversations` to the list of valid collections so the existing generic `/api/:collection` CRUD routes (GET/POST/PUT/DELETE, revisions, audit) work for it.
- Seed `data/conversations.json` as an empty array on first run, same pattern as the other collections.

Conversation shape stored on disk:
```
{ id, title, messages: [{role, content}], provider, model, createdAt, updatedAt }
```

## Storage layer (`src/lib/store.ts`)

- Add a `conversationStore` mirroring the existing stores (`getAll`, `getById`, `create`, `update`, `delete`), using the API when available and `localStorage` (`labyrinth_conversations`) as fallback. Same `useApi()` switch as the other entities.

## AI Hub (`src/pages/AIHubPage.tsx`)

- Replace the current localStorage-only conversations state with `conversationStore`:
  - Load conversations on mount.
  - Persist create / rename / delete / message updates through the store.
  - Debounce streaming-message writes (e.g. flush on stream end + rename + delete) so we don't hammer the server with every token; keep in-memory state live during streaming.
- Keep `labyrinth_ai_active_conversation` in localStorage (UI preference, not data).

## Retention setting

- Add a new setting `maxConversations` (default: 50) stored in localStorage under a new key `labyrinth_ai_retention`.
- Surface in `src/pages/SettingsPage.tsx` under a new "AI Conversations" card:
  - Number input for "Maximum conversations to keep".
  - Button "Delete old conversations now" — sorts by `updatedAt` desc, keeps the top N, deletes the rest via `conversationStore.delete`. Shows a confirm dialog with the count to be removed.
  - Read-only line showing where conversations are stored (server data dir vs browser).
- No automatic deletion; pruning only runs when the user clicks the button.

## Technical notes

- The existing `/api/:collection` route already handles revisions and audit logging, so conversations get history/audit for free.
- `apiCreate` / `apiUpdate` are async; in the AI Hub, optimistic local state updates first, then sync; on streaming completion we send one PUT with the final message array.
- No migration of existing localStorage conversations is required for this iteration; users on a server install will start fresh on disk (mention this in the Settings card copy).

## Files to change

- `server.js` — add `conversations` to valid collections + seed file.
- `src/lib/store.ts` — add `conversationStore`.
- `src/pages/AIHubPage.tsx` — switch from localStorage to `conversationStore`, keep active-id in localStorage.
- `src/pages/SettingsPage.tsx` — add AI Conversations card with max-count input and manual cleanup button.
