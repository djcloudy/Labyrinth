import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.resolve(process.env.LABYRINTH_DATA_DIR || './data');
const VALID_COLLECTIONS = ['projects', 'documents', 'snippets', 'media', 'tasks'];
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; }
}
function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Ensure data directory exists and is writable
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.accessSync(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
  console.log(`✓ Data directory: ${DATA_DIR}`);
} catch (err) {
  console.error(`✗ Cannot access data directory: ${DATA_DIR}`);
  console.error(`  Fix: sudo mkdir -p ${DATA_DIR} && sudo chown $(whoami) ${DATA_DIR}`);
  process.exit(1);
}

// Initialize empty JSON files if they don't exist
VALID_COLLECTIONS.forEach(col => {
  const filePath = path.join(DATA_DIR, `${col}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Helpers ---
function readCollection(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeCollection(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function validateCollection(req, res, next) {
  if (!VALID_COLLECTIONS.includes(req.params.collection)) {
    return res.status(400).json({ error: `Invalid collection. Valid: ${VALID_COLLECTIONS.join(', ')}` });
  }
  next();
}

// --- API Routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dataDir: DATA_DIR, collections: VALID_COLLECTIONS });
});

// GET all items in a collection
app.get('/api/:collection', validateCollection, (req, res) => {
  res.json(readCollection(req.params.collection));
});

// POST create item
app.post('/api/:collection', validateCollection, (req, res) => {
  const items = readCollection(req.params.collection);
  const now = new Date().toISOString();
  const item = {
    ...req.body,
    id: crypto.randomUUID(),
    createdAt: now,
    ...(req.params.collection !== 'media' ? { updatedAt: now } : {}),
  };
  items.push(item);
  writeCollection(req.params.collection, items);
  res.status(201).json(item);
});

// PUT update item
app.put('/api/:collection/:id', validateCollection, (req, res) => {
  const items = readCollection(req.params.collection);
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  writeCollection(req.params.collection, items);
  res.json(items[idx]);
});

// DELETE item
app.delete('/api/:collection/:id', validateCollection, (req, res) => {
  const collection = req.params.collection;
  let items = readCollection(collection);
  const before = items.length;
  items = items.filter(i => i.id !== req.params.id);
  if (items.length === before) return res.status(404).json({ error: 'Not found' });
  writeCollection(collection, items);

  // If deleting a project, unlink related items and delete tasks
  if (collection === 'projects') {
    ['documents', 'snippets', 'media'].forEach(col => {
      const related = readCollection(col);
      const updated = related.map(item =>
        item.projectId === req.params.id ? { ...item, projectId: null } : item
      );
      writeCollection(col, updated);
    });
    const tasks = readCollection('tasks').filter(t => t.projectId !== req.params.id);
    writeCollection('tasks', tasks);
  }

  res.json({ success: true });
});

// --- Settings API (for API keys) ---
app.get('/api/settings', (req, res) => {
  res.json(readSettings());
});

app.put('/api/settings', (req, res) => {
  const current = readSettings();
  const updated = { ...current, ...req.body };
  writeSettings(updated);
  res.json(updated);
});

// --- AI Chat Proxy ---
const AI_PROVIDERS = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', envKey: 'OPENAI_API_KEY' },
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', envKey: 'GEMINI_API_KEY' },
  ollama: { url: null, envKey: null },
};

app.post('/api/ai/chat', async (req, res) => {
  const { messages, provider = 'openai', model, apiKey: clientKey, ollamaUrl } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });

  const settings = readSettings();
  let url, authKey;

  if (provider === 'ollama') {
    const base = ollamaUrl || settings.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    url = `${base}/v1/chat/completions`;
    authKey = null;
  } else {
    const cfg = AI_PROVIDERS[provider];
    if (!cfg) return res.status(400).json({ error: `Unknown provider: ${provider}` });
    url = cfg.url;
    authKey = clientKey || settings[`${provider}ApiKey`] || process.env[cfg.envKey];
    if (!authKey) return res.status(400).json({ error: `No API key configured for ${provider}. Set it in Settings or via ${cfg.envKey} env var.` });
  }

  try {
    const body = { model: model || (provider === 'openai' ? 'gpt-4o-mini' : provider === 'gemini' ? 'gemini-2.0-flash' : 'llama3'), messages, stream: true };
    const headers = { 'Content-Type': 'application/json' };
    if (authKey) headers['Authorization'] = `Bearer ${authKey}`;

    const aiRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return res.status(aiRes.status).json({ error: `AI provider error (${aiRes.status}): ${errText}` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(decoder.decode(value, { stream: true }));
      }
    };
    pump().catch(() => res.end());
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to reach AI provider' });
  }
});

// Serve static files from dist/ (production build)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✓ Labyrinth server running on http://localhost:${PORT}`);
  console.log(`  Data directory: ${DATA_DIR}`);
});
