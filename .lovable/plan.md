

# Context Sharing Security Settings

## Overview
Add a new "AI Context Sharing" section to the Settings page that lets you control which AI providers are allowed to receive your documents, snippets, and project data. Ollama (Local) is enabled by default since data stays on your machine; OpenAI and Gemini are disabled by default since they send data to external servers.

When a provider is disabled, the Attach button and Knowledge Base toggle in the AI Hub will be hidden/blocked for that provider, preventing accidental data leaks.

## Changes

### 1. Settings Page - New "AI Context Sharing" Section
Add a card between "Storage" and "Data Management" with:
- A Shield icon and "AI Context Sharing" heading
- An explanatory note about data privacy
- A row for each provider (OpenAI, Gemini, Ollama) with a Switch toggle
- Ollama defaults to ON; OpenAI and Gemini default to OFF
- Settings are persisted in localStorage under a dedicated key (`labyrinth_context_sharing`)

### 2. AI Hub - Enforce the Setting
When the active provider is not allowed to receive context:
- Hide the Attach (paperclip) button
- Hide the Knowledge Base toggle
- If attachments were already selected, they are not sent
- Show a small info note: "Context sharing is disabled for this provider. Enable it in Settings."

## Technical Details

### Files to Modify

**`src/pages/SettingsPage.tsx`**
- Import `Switch` and `Shield` icon
- Add state for context sharing preferences, loaded from `labyrinth_context_sharing` in localStorage
- Render a new card with three Switch rows (one per provider)
- Persist changes to localStorage on toggle

**`src/pages/AIHubPage.tsx`**
- Read the context sharing settings from localStorage
- Derive a boolean `contextAllowed` based on the current provider
- Conditionally render the Attach button, attachment chips, and Knowledge Base toggle only when `contextAllowed` is true
- Skip context injection in `buildContextMessages` when not allowed
- Show an inline info message when context is blocked

### Data Shape (localStorage)
```json
{
  "openai": false,
  "gemini": false,
  "ollama": true
}
```

### UI Layout in Settings
```text
+--------------------------------------------------+
| [Shield] AI Context Sharing                      |
| Control which providers can access your           |
| documents, snippets, and project data.            |
|                                                   |
|  OpenAI           [OFF]  Sends data externally    |
|  Gemini           [OFF]  Sends data externally    |
|  Ollama (Local)   [ON]   Data stays on your machine|
+--------------------------------------------------+
```

