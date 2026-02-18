

# Attach Context to AI Hub Messages

## Overview
Add the ability to attach Documents and Snippets to AI Hub messages, and provide a "knowledge base" mode where the AI automatically receives your project data as context. Since this app runs locally with an Express backend, we can inject content directly into the chat messages sent to any provider (OpenAI, Gemini, or Ollama).

## How It Works

When you attach a document or snippet (or enable knowledge base search), the content is injected into the conversation as a system message before your question. The AI model then uses that context to answer. This works with all providers including local Ollama.

## Changes

### 1. Context Attachment Bar (AI Hub UI)
- Add an "Attach" button (paperclip icon) next to the input area
- Clicking it opens a popover/dialog with two tabs: **Documents** and **Snippets**
- Each tab lists available items with checkboxes for multi-select
- Selected items appear as dismissible chips/badges above the input
- Attached content is prepended to the user message as a structured context block

### 2. Knowledge Base Toggle
- Add a toggle button ("Include Project Context") in the AI Hub header
- When enabled, the system message automatically includes a summary of:
  - All project names and descriptions
  - Titles of all documents, snippets, and media
- The AI can then reference this data when answering questions
- For deeper queries, users can still manually attach specific documents/snippets for full content inclusion

### 3. Context Injection Logic
- When attachments are present, build a context prefix like:
  ```
  [Attached Context]
  --- Document: "Deploy Guide" ---
  <full document content>
  --- Snippet: "nginx.conf" (YAML) ---
  <full snippet code>
  [End Context]

  User question: <actual message>
  ```
- When knowledge base mode is on, add a system message with project metadata
- This approach works with every provider since it's just text in the messages array

### 4. Server-Side Context Endpoint (Optional Enhancement)
- Add `GET /api/ai/context` endpoint to server.js that returns a combined dump of all project data
- This allows the AI chat proxy to automatically enrich requests when a `includeContext: true` flag is passed

## Technical Details

### Files to Create
- `src/components/AttachContextDialog.tsx` - Dialog for browsing and selecting documents/snippets to attach

### Files to Modify
- `src/pages/AIHubPage.tsx` - Add attach button, chips display, knowledge base toggle, and context injection into `sendMessage`
- `server.js` - Add `/api/ai/context` endpoint that aggregates data from all collections

### Data Flow
1. User clicks Attach -> selects documents/snippets -> chips appear above input
2. User types message and sends
3. `sendMessage` fetches full content of selected items from the store
4. Content is formatted and prepended to the messages array
5. Request goes to AI provider (any provider) with the enriched context
6. Response streams back as normal

### UI Layout for Input Area
```text
+------------------------------------------+
| [Doc: Deploy Guide x] [Snip: nginx x]   |  <- attachment chips
+------------------------------------------+
| [Attach] [Type a message...        ] [>] |  <- input row
+------------------------------------------+
| [x] Include project knowledge base       |  <- toggle below input
+------------------------------------------+
```

