# Labyrinth — Home Lab Project Manager

A dark-themed project management app for your home lab. Manage projects, documentation, code snippets, media, and AI tools — all in one place.

## Features

- **Project Overview** — Color-coded projects with linked documents, snippets, and media
- **Documentation & Notes** — Rich text notes linked to projects
- **Code Snippets** — YAML, BASH, and PYTHON with syntax highlighting
- **Media Management** — Screenshots, diagrams, and files
- **AI Hub** — Connect AI tools and assistants
- **Dual Storage** — Browser localStorage (default) + persistent disk storage via Express server

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
# Specify your data directory
LABYRINTH_DATA_DIR=/home/user/labyrinth-data node server.js

# Or use the default ./data directory
node server.js

# Custom port
PORT=8080 LABYRINTH_DATA_DIR=/opt/labyrinth/data node server.js
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
