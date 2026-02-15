

# Plan: Add Persistent Disk Storage via a Local Express API Server

## Overview

Since the app is a frontend-only React app, it cannot write to disk directly from the browser. To achieve persistent local disk storage, we need to add a lightweight **Express.js backend server** that:

1. Serves the built React app
2. Provides REST API endpoints that read/write JSON data files to a configurable directory on disk
3. Allows the user to specify the storage path via an **environment variable** (`LABYRINTH_DATA_DIR`)

The frontend will be updated to detect whether the API server is available and use it for storage (falling back to localStorage if not).

## How It Works

The user runs the app locally with:

```text
LABYRINTH_DATA_DIR=/home/user/labyrinth-data node server.js
```

The server stores data as JSON files in that directory (e.g., `projects.json`, `documents.json`, etc.). If the directory doesn't exist, the server creates it on startup.

## Implementation Details

### 1. Create `server.js` (Express backend)

A single-file Node.js server that:
- Reads `LABYRINTH_DATA_DIR` from environment (defaults to `./data`)
- Creates the directory if it doesn't exist (with `fs.mkdirSync({ recursive: true })`)
- Validates the directory is writable on startup
- Serves the built React app from `dist/`
- Exposes REST API endpoints:
  - `GET /api/health` -- returns status and configured data path
  - `GET /api/:collection` -- read all items (projects, documents, snippets, media)
  - `POST /api/:collection` -- create item
  - `PUT /api/:collection/:id` -- update item
  - `DELETE /api/:collection/:id` -- delete item
- Each collection is stored as a separate JSON file on disk (e.g., `projects.json`)
- Uses file locking (simple read-modify-write) for safe concurrent access

### 2. Create `src/lib/api.ts` (API client)

A small module that:
- Checks if the backend API is available (via `/api/health`)
- Provides the same interface as the current store (`getAll`, `create`, `update`, `delete`)
- Falls back to localStorage if the API is unreachable (e.g., running in Lovable preview)

### 3. Update `src/lib/store.ts`

Modify each store (projectStore, documentStore, etc.) to:
- Use the API client when a backend is detected
- Keep localStorage as fallback for browser-only usage
- Make all operations async-aware

### 4. Update `src/hooks/use-store.ts`

Make the hook async-compatible since disk storage operations go through HTTP.

### 5. Update all pages that use the store

Adapt pages (Dashboard, ProjectsPage, ProjectDetail, DocumentsPage, SnippetsPage, MediaPage, SettingsPage) to handle async data loading (loading states, etc.).

### 6. Add Settings UI for storage info

Add a section on the Settings page showing:
- Current storage mode (disk vs localStorage)
- Configured data directory path (from the API)
- Connection status

### 7. Update `package.json`

- Add `express` and `cors` as dependencies
- Add a `start` script: `node server.js`

### 8. Update `README.md`

Clear instructions for running locally with disk storage:

```text
# Build the app
npm run build

# Run with persistent disk storage
LABYRINTH_DATA_DIR=/path/to/your/data npm start

# Or use the default ./data directory
npm start
```

Include notes on directory permissions (`chmod 755`) and running as a systemd service.

## File Changes Summary

| File | Action |
|------|--------|
| `server.js` | Create -- Express server with file-based REST API |
| `src/lib/api.ts` | Create -- API client with localStorage fallback |
| `src/lib/store.ts` | Modify -- Use API client, make async-aware |
| `src/hooks/use-store.ts` | Modify -- Support async operations |
| `src/pages/Dashboard.tsx` | Modify -- Async data loading |
| `src/pages/ProjectsPage.tsx` | Modify -- Async data loading |
| `src/pages/ProjectDetail.tsx` | Modify -- Async data loading |
| `src/pages/DocumentsPage.tsx` | Modify -- Async data loading |
| `src/pages/SnippetsPage.tsx` | Modify -- Async data loading |
| `src/pages/MediaPage.tsx` | Modify -- Async data loading |
| `src/pages/SettingsPage.tsx` | Modify -- Add storage info section, async data |
| `package.json` | Modify -- Add express, cors, start script |
| `README.md` | Modify -- Add disk storage instructions |

## Permissions and Security

- The server validates the data directory exists and is writable on startup
- If permissions are insufficient, it prints a clear error message with the fix command
- The API only accepts JSON and validates collection names (whitelist: projects, documents, snippets, media)
- Designed for local/home network use only (not exposed to the internet)

