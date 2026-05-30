## Knowledge Base

A new top-level section for content that doesn't belong to any project — how-tos, troubleshooting notes, cheat sheets, reusable snippets, reference links, and reference images. Everything is organized by free-form tags and full-text search.

### Why a separate section (not "no project" on existing entities)

Mixing general knowledge into Docs / Snippets / Media bloats project filters and makes "everything not tied to a project" hard to browse. A dedicated section keeps project-scoped lists clean and gives general knowledge its own home, navigation, and capture flow.

### What it includes

One unified Knowledge Base page with four entry kinds, switchable via a top tab bar:

- **Notes** — markdown documents (same editor as Documents: live preview, templates, revisions)
- **Snippets** — code blocks with language + syntax highlighting (same editor as Snippets)
- **Images** — screenshots and diagrams (same uploader/lightbox as Media)
- **Links** — external URL + title + description for quick lookup

All four share: title, free-form tags, optional notes, created/updated timestamps, source tracking, and revision history (notes + snippets only, matching existing behavior).

### Page layout

```text
┌─ Knowledge Base ──────────────────────── [+ New ▾] ┐
│ [Search...]                  [Tag chips: filter ▾] │
│ [ All | Notes | Snippets | Images | Links ]        │
├────────────────────────────────────────────────────┤
│  Card / row list, grouped by kind when "All"       │
│  Each card shows: title · tags · updated · preview │
│  Click → inline expand (notes/snippets) or         │
│          lightbox (images) or open URL (links)     │
└────────────────────────────────────────────────────┘
```

- **Tag chips** above the list show the top tags across the current filter; click to filter, ⌘-click to multi-select.
- **Search** matches title, body/code/description, and tags.
- **New ▾** dropdown lets the user pick the kind to create.

### Sidebar + routing

- Add a `Knowledge` nav item to `AppSidebar` (between **AI Hub** and **Audit**), icon: `BookOpen`.
- New route `/knowledge` → `KnowledgePage`.
- Deep links: `/knowledge?kind=snippets&tag=docker`, `/knowledge?entry=<id>` (opens that entry).

### Capture integration

The existing **⌘K Capture** dialog gets a "Save to Knowledge Base" target alongside the existing project targets, so a captured note/snippet/image can be filed as general knowledge.

### Technical details

**Data model** — one new collection `knowledge` instead of four parallel stores, with a `kind` discriminator. This keeps tag filtering, search, and the unified list trivial.

```ts
// src/lib/types.ts
export type KnowledgeKind = 'note' | 'snippet' | 'image' | 'link';

export interface KnowledgeEntry extends BaseMeta {
  id: string;
  kind: KnowledgeKind;
  title: string;
  tags: string[];                 // free-form, always present (may be [])
  // kind-specific fields (only one set is populated):
  content?: string;               // note: markdown
  code?: string;                  // snippet
  language?: SnippetLanguage;     // snippet
  url?: string;                   // image (data url) or link (external url)
  mediaType?: string;             // image: mime
  description?: string;           // link
  createdAt: string;
  updatedAt: string;
}
```

**Backend (`server.js`)**
- Add `'knowledge'` to `VALID_COLLECTIONS` and to `VERSIONED_COLLECTIONS` (so notes/snippets entries get revisions automatically).
- No other server changes needed — generic collection routes already cover CRUD and audit.

**Store (`src/lib/store.ts`)** — add `knowledgeStore` with the same `getAll / getById / getByTag / create / update / delete` shape as `documentStore`, using key `labyrinth_knowledge`.

**Components / pages**
- `src/pages/KnowledgePage.tsx` — list + tabs + search + tag filter.
- `src/components/KnowledgeEntryEditor.tsx` — single dialog that switches inputs based on `kind`, reusing:
  - `MarkdownCode` + the Documents editor body for notes
  - `CodeEditor` for snippets
  - the Media uploader for images
  - a simple URL + description form for links
- Reuse `RevisionsDialog` (pass `collection="knowledge"`).
- Reuse `markdownComponents` and `copyWithToast` so copy buttons work consistently.

**Navigation + routing**
- `src/App.tsx` — register `/knowledge` route.
- `src/components/AppSidebar.tsx` — add the new nav entry with `BookOpen` icon.
- `src/components/CommandPalette.tsx` — add "Go to Knowledge Base" and "New knowledge entry" commands.

**Capture flow**
- `src/components/CaptureDialog.tsx` — add a `Save to Knowledge Base` toggle/target that writes via `knowledgeStore.create` with the appropriate `kind` inferred from the captured content (markdown → note, code → snippet, image → image, url → link).

**Dashboard**
- Add a small "Recent knowledge" tile next to the existing recents so general knowledge is discoverable from the home screen.

### Out of scope (for this pass)

- Nested folders/categories — tags only, per your choice.
- Cross-linking knowledge entries to projects (can be added later via an optional `projectIds: string[]` field if desired).
- Sharing/export of the knowledge base — uses existing data file persistence.
