# Labyrinth — Home Lab Project Manager

A dark-themed project management app for your home lab. Manage projects, documentation, code snippets, media, and AI tools — all in one place.

## Features

- **Project Overview** — Color-coded projects with linked documents, snippets, and media
- **Documentation & Notes** — Rich text notes linked to projects
- **Code Snippets** — YAML, BASH, and PYTHON with syntax highlighting
- **Media Management** — Screenshots, diagrams, and files
- **AI Hub** — Connect AI tools and assistants
- **Dual Storage** — Browser localStorage (default) + persistent disk storage via Express server

## Environment Variables

The AI Hub supports OpenAI, Gemini, and local Ollama. You can configure API keys either via the UI (Settings dialog in AI Hub) or as environment variables before starting the app:

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `OLLAMA_URL` | Ollama server URL (default: `http://localhost:11434`) | `http://192.168.1.50:11434` |

Keys set via the UI are stored in browser localStorage. Keys set as environment variables are read by the Express server and used for server-side proxying.

## Quick Start (Development)

```bash
npm install
npm run dev
```

Opens at `http://localhost:8080`. Data is stored in browser localStorage.

## Persistent Disk Storage (Production)

For running on your Linux server with data persisted to disk:

### 1. Install dependencies

```bash
npm install
npm install express cors
```

### 2. Build the frontend

```bash
npm run build
```

### 3. Run with disk storage

```bash
# Specify your data directory and AI API keys
OPENAI_API_KEY=sk-... GEMINI_API_KEY=AIza... LABYRINTH_DATA_DIR=/home/user/labyrinth-data node server.js

# Or use the default ./data directory
node server.js

# Custom port + Ollama on a remote host
PORT=8080 OLLAMA_URL=http://192.168.1.50:11434 LABYRINTH_DATA_DIR=/opt/labyrinth/data node server.js
```

The server will:
- Create the data directory if it doesn't exist
- Validate write permissions on startup
- Store data as JSON files (`projects.json`, `documents.json`, `snippets.json`, `media.json`)
- Serve the built React app from `dist/`
- Expose REST API at `/api/*`

### 4. Directory permissions

```bash
# Create and set ownership
sudo mkdir -p /opt/labyrinth/data
sudo chown $(whoami) /opt/labyrinth/data
chmod 755 /opt/labyrinth/data
```

### 5. Run as a systemd service

Create `/etc/systemd/system/labyrinth.service`:

```ini
[Unit]
Description=Labyrinth Home Lab Manager
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/labyrinth
Environment=LABYRINTH_DATA_DIR=/opt/labyrinth/data
Environment=OPENAI_API_KEY=sk-your-key-here
Environment=GEMINI_API_KEY=AIza-your-key-here
Environment=PORT=3001
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable labyrinth
sudo systemctl start labyrinth
```

### 6. Nginx reverse proxy (optional)

```nginx
server {
    listen 80;
    server_name labyrinth.local;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status and config |
| GET | `/api/:collection` | List all items |
| POST | `/api/:collection` | Create item |
| PUT | `/api/:collection/:id` | Update item |
| DELETE | `/api/:collection/:id` | Delete item |

Collections: `projects`, `documents`, `snippets`, `media`

## How Storage Works

The app automatically detects whether the Express API server is running:
- **Server detected** → All data reads/writes go through the REST API to disk
- **No server** → Falls back to browser localStorage (great for development/preview)

Check the **Settings** page to see the current storage mode and data directory path.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Express.js (backend server)
- JSON file storage (no database required)

## Assistant API (Capture)

Labyrinth exposes a unified write endpoint so external agents can save lab knowledge with one call.

### Endpoint

```
POST /api/capture
```

Headers (only when `LABYRINTH_API_KEY` is set on the server):
```
Authorization: Bearer <LABYRINTH_API_KEY>
Content-Type: application/json
```

### Body

| Field | Type | Notes |
|-------|------|-------|
| `type` | `"document" \| "snippet" \| "task" \| "auto"` | `auto` (default) detects from content |
| `title` | string | Optional — first line is used if blank |
| `content` | string | Document/snippet body (markdown or raw) |
| `code` | string | Alias for snippet body |
| `description` | string | Task body |
| `language` | `"BASH" \| "YAML" \| "PYTHON"` | Snippets only; auto-detected if omitted |
| `projectId` | string | Optional; required for tasks (defaults to first project) |
| `tags` | string[] or csv | Free-form labels |
| `source` | string | Defaults to `"assistant"`; appears in audit log |
| `createdBy` | string | Identifies the agent/user |
| `externalRef` | string | Link back to the originating system (ticket id, URL, ...) |
| `notes` | string | Free-form context |
| `status` / `priority` / `dueDate` / `checklist` | — | Task-only fields |

### Example

```bash
curl -X POST http://localhost:3002/api/capture \
  -H "Authorization: Bearer $LABYRINTH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "auto",
    "title": "Restart caddy",
    "content": "```bash\nsudo systemctl restart caddy\n```",
    "tags": ["ops","caddy"],
    "source": "assistant",
    "createdBy": "ops-bot",
    "externalRef": "incident-1421"
  }'
```

Returns `{ type, collection, item }`.

### Revisions & Audit

- `GET  /api/:collection/:id/revisions` — full prior snapshots (documents, snippets, tasks)
- `POST /api/:collection/:id/restore/:revisionId` — restore a snapshot (saves current as new revision first)
- `GET  /api/audit` — assistant/api/import writes are logged here

### Auth

The `/api/capture` endpoint requires a Bearer token when `LABYRINTH_API_KEY` is set on the server. If the variable is unset, the endpoint is open (local mode). Browser CRUD endpoints (`/api/projects`, `/api/documents`, etc.) are unauthenticated by design — protect them with a reverse proxy if exposing publicly.

---

## Labyrinth API Key (for agents & scripts)

External agents, cron jobs, CI runners, and custom scripts authenticate to Labyrinth's write endpoints using a single static Bearer token: `LABYRINTH_API_KEY`. This section explains how to generate one and use it.

### 1. Generate a key

Any high-entropy string works. Pick one:

```bash
# 32-byte URL-safe random (recommended)
openssl rand -base64 32

# Or with /dev/urandom
head -c 32 /dev/urandom | base64

# Or with uuidgen (lower entropy, still fine for personal labs)
uuidgen
```

Treat the result like a password — store it in a password manager and never commit it to git.

### 2. Configure the server

Set `LABYRINTH_API_KEY` in the server environment. Examples:

**Shell / one-shot:**
```bash
LABYRINTH_API_KEY="paste-your-generated-key-here" node server.js
```

**systemd unit** (`/etc/systemd/system/labyrinth.service`):
```ini
[Service]
Environment=LABYRINTH_API_KEY=paste-your-generated-key-here
# ...other Environment= lines
```
Reload after editing:
```bash
sudo systemctl daemon-reload && sudo systemctl restart labyrinth
```

**docker / docker-compose:**
```yaml
services:
  labyrinth:
    environment:
      LABYRINTH_API_KEY: paste-your-generated-key-here
```

On startup, the server logs whether auth is enabled:
```
Assistant API key: enabled (LABYRINTH_API_KEY set)
```

### 3. Use the key in agents & scripts

All authenticated endpoints accept the key in either header form:

```
Authorization: Bearer <LABYRINTH_API_KEY>
# or
x-api-key: <LABYRINTH_API_KEY>
```

**Endpoints that honor the key** (auth required only when `LABYRINTH_API_KEY` is set):
- `POST /api/capture` — unified write for documents / snippets / tasks
- `GET /api/audit` — audit trail of assistant & API writes
- `GET /api/:collection/:id/revisions`, `POST .../restore/:revisionId` — revision history

#### curl
```bash
export LABYRINTH_API_KEY="paste-your-key"
export LABYRINTH_URL="http://your-host:3002"

curl -X POST "$LABYRINTH_URL/api/capture" \
  -H "Authorization: Bearer $LABYRINTH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "auto",
    "title": "Backup ran cleanly",
    "content": "Borg backup finished in 4m12s on 2026-05-30.",
    "tags": ["ops","backup"],
    "source": "assistant",
    "createdBy": "backup-cron"
  }'
```

#### Python
```python
import os, requests

requests.post(
    f"{os.environ['LABYRINTH_URL']}/api/capture",
    headers={"Authorization": f"Bearer {os.environ['LABYRINTH_API_KEY']}"},
    json={
        "type": "snippet",
        "title": "Restart caddy",
        "code": "sudo systemctl restart caddy",
        "language": "BASH",
        "tags": ["ops", "caddy"],
        "source": "assistant",
        "createdBy": "ops-bot",
    },
    timeout=10,
).raise_for_status()
```

#### Node / fetch
```js
await fetch(`${process.env.LABYRINTH_URL}/api/capture`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.LABYRINTH_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'task',
    title: 'Rotate TLS certs',
    description: 'LE renewal failed twice this week — investigate.',
    priority: 'HIGH',
    projectId: 'proj_homelab',
    source: 'assistant',
    createdBy: 'monitoring-bot',
    externalRef: 'alert-7782',
  }),
});
```

### 4. Verifying it works

```bash
# Should succeed
curl -i -H "Authorization: Bearer $LABYRINTH_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"type":"document","title":"hello","content":"works"}' \
     "$LABYRINTH_URL/api/capture"

# Should 401
curl -i -H "Content-Type: application/json" \
     -d '{"type":"document","title":"nope"}' \
     "$LABYRINTH_URL/api/capture"
```

Every authenticated write is recorded in the **Audit** page (and `GET /api/audit`) with its `source` and `createdBy` for provenance.

### 5. Rotating the key

1. Generate a new key (`openssl rand -base64 32`).
2. Update `LABYRINTH_API_KEY` in your systemd unit / compose file / shell env.
3. Restart the server (`sudo systemctl restart labyrinth`).
4. Update the key in every agent / script / secret manager that uses it.

The key is read at server start, so a restart is required after any change.

### Security notes

- The key is a shared secret — anyone with it can write to your lab. Scope distribution accordingly.
- Always terminate TLS in front of Labyrinth (Nginx, Caddy, Traefik) before exposing it beyond `localhost`.
- Browser CRUD endpoints are intentionally unauthenticated for the local UI; do not expose port 3002 directly to the internet without a reverse proxy enforcing access control.
- Set distinct keys per environment (dev vs. prod) and never reuse them across deployments.

