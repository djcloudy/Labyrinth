import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const DATA_DIR = path.resolve(process.env.LABYRINTH_DATA_DIR || './data');
const VALID_COLLECTIONS = ['projects', 'documents', 'snippets', 'media', 'tasks'];
const VERSIONED_COLLECTIONS = new Set(['documents', 'snippets', 'tasks']);
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');
const REVISIONS_DIR = path.join(DATA_DIR, 'revisions');
const API_KEY = process.env.LABYRINTH_API_KEY || '';

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; }
}
function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeOllamaBaseUrl(url) {
  const raw = Array.isArray(url) ? url[0] : url;
  const fallback = 'http://localhost:11434';
  const value = typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
  const withProtocol = /^[a-z]+:\/\//i.test(value) ? value : `http://${value.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(withProtocol);
    parsed.pathname = parsed.pathname
      .replace(/\/+$/, '')
      .replace(/\/api\/tags$/i, '')
      .replace(/\/v1\/chat\/completions$/i, '')
      .replace(/\/api$/i, '')
      .replace(/\/v1$/i, '');
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch { return fallback; }
}
const getOllamaTagsUrl = (u) => `${normalizeOllamaBaseUrl(u)}/api/tags`;
const getOllamaChatUrl = (u) => `${normalizeOllamaBaseUrl(u)}/v1/chat/completions`;

// Ensure data directories exist
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(REVISIONS_DIR, { recursive: true });
  fs.accessSync(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
  console.log(`✓ Data directory: ${DATA_DIR}`);
} catch (err) {
  console.error(`✗ Cannot access data directory: ${DATA_DIR}`);
  console.error(`  Fix: sudo mkdir -p ${DATA_DIR} && sudo chown $(whoami) ${DATA_DIR}`);
  process.exit(1);
}

VALID_COLLECTIONS.forEach(col => {
  const fp = path.join(DATA_DIR, `${col}.json`);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, '[]', 'utf8');
});
if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, '[]', 'utf8');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Helpers ---
function readCollection(name) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8')); }
  catch { return []; }
}
function writeCollection(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}
function readRevisions(col, id) {
  try { return JSON.parse(fs.readFileSync(path.join(REVISIONS_DIR, `${col}_${id}.json`), 'utf8')); }
  catch { return []; }
}
function appendRevision(col, id, snapshot) {
  const list = readRevisions(col, id);
  list.push(snapshot);
  fs.writeFileSync(path.join(REVISIONS_DIR, `${col}_${id}.json`), JSON.stringify(list, null, 2), 'utf8');
}
function appendAudit(entry) {
  try {
    const log = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    log.push({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry });
    if (log.length > 5000) log.splice(0, log.length - 5000);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) { console.error('audit write failed', e); }
}

function validateCollection(req, res, next) {
  if (!VALID_COLLECTIONS.includes(req.params.collection)) {
    return res.status(400).json({ error: `Invalid collection. Valid: ${VALID_COLLECTIONS.join(', ')}` });
  }
  next();
}

// Auth: required only when LABYRINTH_API_KEY is set. Used for /api/capture and any
// request that declares assistant/api source. Browser CRUD remains unauthenticated.
function extractKey(req) {
  const h = req.headers['authorization'] || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  return req.headers['x-api-key'] || '';
}
function requireApiKey(req, res, next) {
  if (!API_KEY) return next(); // local mode
  if (extractKey(req) === API_KEY) { req.authed = true; return next(); }
  return res.status(401).json({ error: 'Unauthorized. Provide Authorization: Bearer <LABYRINTH_API_KEY>' });
}

// --- Health ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dataDir: DATA_DIR,
    collections: VALID_COLLECTIONS,
    apiKeyRequired: !!API_KEY,
    features: ['capture', 'revisions', 'audit', 'metadata'],
  });
});

// --- CRUD ---
app.get('/api/:collection', validateCollection, (req, res) => {
  res.json(readCollection(req.params.collection));
});

app.post('/api/:collection', validateCollection, (req, res) => {
  const col = req.params.collection;
  const items = readCollection(col);
  const now = new Date().toISOString();
  const source = req.body.source || 'manual';
  const item = {
    ...req.body,
    id: crypto.randomUUID(),
    createdAt: now,
    source,
    ...(col !== 'media' ? { updatedAt: now } : {}),
  };
  items.push(item);
  writeCollection(col, items);
  if (source !== 'manual') appendAudit({ action: 'create', collection: col, id: item.id, source, title: item.title });
  res.status(201).json(item);
});

app.put('/api/:collection/:id', validateCollection, (req, res) => {
  const col = req.params.collection;
  const items = readCollection(col);
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const prev = items[idx];

  // Snapshot prior version for versioned collections if content-bearing fields change
  if (VERSIONED_COLLECTIONS.has(col)) {
    const tracked = ['title', 'content', 'code', 'description', 'language', 'status', 'priority', 'tags', 'dueDate', 'checklist'];
    const changed = tracked.some(k => k in req.body && JSON.stringify(req.body[k]) !== JSON.stringify(prev[k]));
    if (changed) {
      appendRevision(col, prev.id, {
        revisionId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        updatedBy: req.body.updatedBy || prev.updatedBy || null,
        source: req.body.source || prev.source || 'manual',
        snapshot: prev,
      });
    }
  }

  items[idx] = { ...prev, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  writeCollection(col, items);
  if (req.body.source && req.body.source !== 'manual') {
    appendAudit({ action: 'update', collection: col, id: req.params.id, source: req.body.source, title: items[idx].title });
  }
  res.json(items[idx]);
});

app.delete('/api/:collection/:id', validateCollection, (req, res) => {
  const collection = req.params.collection;
  let items = readCollection(collection);
  const before = items.length;
  const removed = items.find(i => i.id === req.params.id);
  items = items.filter(i => i.id !== req.params.id);
  if (items.length === before) return res.status(404).json({ error: 'Not found' });
  writeCollection(collection, items);

  if (collection === 'projects') {
    ['documents', 'snippets', 'media'].forEach(col => {
      const related = readCollection(col).map(item =>
        item.projectId === req.params.id ? { ...item, projectId: null } : item
      );
      writeCollection(col, related);
    });
    writeCollection('tasks', readCollection('tasks').filter(t => t.projectId !== req.params.id));
  }
  if (removed?.source && removed.source !== 'manual') {
    appendAudit({ action: 'delete', collection, id: req.params.id, source: removed.source, title: removed.title });
  }
  res.json({ success: true });
});

// --- Revisions ---
app.get('/api/:collection/:id/revisions', validateCollection, (req, res) => {
  if (!VERSIONED_COLLECTIONS.has(req.params.collection)) return res.json([]);
  res.json(readRevisions(req.params.collection, req.params.id));
});

app.post('/api/:collection/:id/restore/:revisionId', validateCollection, (req, res) => {
  const { collection, id, revisionId } = req.params;
  if (!VERSIONED_COLLECTIONS.has(collection)) return res.status(400).json({ error: 'Not versioned' });
  const revs = readRevisions(collection, id);
  const rev = revs.find(r => r.revisionId === revisionId);
  if (!rev) return res.status(404).json({ error: 'Revision not found' });
  const items = readCollection(collection);
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  appendRevision(collection, id, {
    revisionId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    updatedBy: 'restore',
    source: 'manual',
    snapshot: items[idx],
  });
  items[idx] = { ...rev.snapshot, id, updatedAt: new Date().toISOString() };
  writeCollection(collection, items);
  res.json(items[idx]);
});

// --- Audit log ---
app.get('/api/audit', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'))); }
  catch { res.json([]); }
});

// --- Capture (assistant-facing unified write endpoint) ---
function detectCaptureType(text) {
  if (!text) return 'document';
  const trimmed = text.trim();
  // explicit code fence
  const fence = trimmed.match(/^```(\w+)?/);
  if (fence) return 'snippet';
  // task heuristics
  if (/^(\s*[-*]\s*\[ \]|\bTODO\b|\bFIXME\b)/im.test(trimmed) && trimmed.length < 500) return 'task';
  // code-ish: many lines starting with shell/yaml/py patterns
  const codeSignals = /^(#!\/|sudo |apt |systemctl |docker |kubectl |def |import |from |class |\w+:\s*$)/m;
  if (codeSignals.test(trimmed) && trimmed.split('\n').length > 2) return 'snippet';
  return 'document';
}
function detectLanguage(text) {
  const t = text.trim();
  const fence = t.match(/^```(\w+)/);
  if (fence) {
    const lang = fence[1].toLowerCase();
    if (['bash', 'sh', 'shell', 'zsh'].includes(lang)) return 'BASH';
    if (['yaml', 'yml'].includes(lang)) return 'YAML';
    if (['python', 'py'].includes(lang)) return 'PYTHON';
  }
  if (/^#!\/(bin\/(ba)?sh|usr\/bin\/env\s+bash)/m.test(t)) return 'BASH';
  if (/^(sudo |apt |systemctl |docker |kubectl |curl |echo |export )/m.test(t)) return 'BASH';
  if (/^(def |import |from .+ import|class \w+)/m.test(t)) return 'PYTHON';
  if (/^[\w-]+:\s*(\n\s+[\w-]+:|$)/m.test(t)) return 'YAML';
  return 'BASH';
}
function stripFences(text) {
  const m = text.trim().match(/^```\w*\n([\s\S]*?)\n```$/);
  return m ? m[1] : text;
}

app.post('/api/capture', requireApiKey, (req, res) => {
  const {
    type: requestedType,
    title,
    content,
    projectId = null,
    tags = [],
    source = 'assistant',
    externalRef,
    notes,
    createdBy,
    // snippet
    language,
    code,
    // task
    description,
    status = 'TODO',
    priority = 'MEDIUM',
    dueDate,
    checklist,
  } = req.body || {};

  if (!content && !code && !description && !title) {
    return res.status(400).json({ error: 'Provide at least title or content/code/description' });
  }

  const body = code || content || description || '';
  let type = requestedType;
  if (!type || type === 'auto') type = detectCaptureType(body);
  if (!['document', 'snippet', 'task'].includes(type)) {
    return res.status(400).json({ error: `Invalid type "${type}". Use document|snippet|task|auto.` });
  }

  const now = new Date().toISOString();
  const baseMeta = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    source,
    createdBy: createdBy || source,
    updatedBy: createdBy || source,
    tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean),
    ...(externalRef ? { externalRef } : {}),
    ...(notes ? { notes } : {}),
  };

  let collection, item;
  if (type === 'document') {
    collection = 'documents';
    item = { ...baseMeta, title: title || 'Untitled', content: content || body, projectId };
  } else if (type === 'snippet') {
    const lang = (language || detectLanguage(body)).toUpperCase();
    collection = 'snippets';
    item = { ...baseMeta, title: title || 'Untitled snippet', language: lang, code: stripFences(code || content || body), projectId };
  } else {
    if (!projectId) {
      // tasks require a project — attempt to default to first project
      const projects = readCollection('projects');
      if (projects.length === 0) return res.status(400).json({ error: 'Tasks require a projectId; no projects exist yet.' });
    }
    collection = 'tasks';
    item = {
      ...baseMeta,
      title: title || (body.split('\n')[0] || 'Untitled task').slice(0, 120),
      description: description || (title ? body : body.split('\n').slice(1).join('\n')),
      status, priority,
      projectId: projectId || readCollection('projects')[0]?.id,
      ...(dueDate ? { dueDate } : {}),
      ...(checklist ? { checklist } : {}),
    };
  }

  const items = readCollection(collection);
  items.push(item);
  writeCollection(collection, items);
  appendAudit({ action: 'capture', collection, id: item.id, source, title: item.title, type });

  res.status(201).json({ type, collection, item });
});

// --- Settings ---
app.get('/api/settings', (req, res) => res.json(readSettings()));
app.put('/api/settings', (req, res) => {
  const updated = { ...readSettings(), ...req.body };
  writeSettings(updated);
  res.json(updated);
});

// --- AI Context ---
app.get('/api/ai/context', (req, res) => {
  const projects = readCollection('projects');
  const documents = readCollection('documents');
  const snippets = readCollection('snippets');
  const media = readCollection('media');
  res.json({
    projects: projects.map(p => ({ id: p.id, name: p.name, description: p.description })),
    documents: documents.map(d => ({ id: d.id, title: d.title, content: d.content, projectId: d.projectId })),
    snippets: snippets.map(s => ({ id: s.id, title: s.title, language: s.language, code: s.code, projectId: s.projectId })),
    media: media.map(m => ({ id: m.id, title: m.title, type: m.type, projectId: m.projectId })),
  });
});

// --- AI Models Proxy ---
app.get('/api/ai/models/:provider', async (req, res) => {
  const { provider } = req.params;
  const settings = readSettings();
  try {
    if (provider === 'ollama') {
      const base = req.query.url || settings.ollamaUrl || process.env.OLLAMA_URL;
      const apiRes = await fetch(getOllamaTagsUrl(base), { signal: AbortSignal.timeout(5000) });
      if (!apiRes.ok) throw new Error(`Ollama returned ${apiRes.status}`);
      const data = await apiRes.json();
      const names = [...new Set((Array.isArray(data.models) ? data.models : [])
        .map(m => m?.name || m?.model).filter(Boolean))].sort();
      return res.json({ models: names });
    }
    if (provider === 'openai') {
      const key = req.query.key || settings.openaiApiKey || process.env.OPENAI_API_KEY;
      if (!key) return res.json({ models: [] });
      const apiRes = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000),
      });
      if (!apiRes.ok) throw new Error(`OpenAI returned ${apiRes.status}`);
      const data = await apiRes.json();
      return res.json({ models: (data.data || []).map(m => m.id).filter(id => /^gpt-/.test(id)).sort() });
    }
    if (provider === 'gemini') {
      const key = req.query.key || settings.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!key) return res.json({ models: [] });
      const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!apiRes.ok) throw new Error(`Gemini returned ${apiRes.status}`);
      const data = await apiRes.json();
      return res.json({ models: (data.models || []).map(m => m.name.replace('models/', '')).filter(id => id.startsWith('gemini-')).sort() });
    }
    res.status(400).json({ error: `Unknown provider: ${provider}` });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch models' });
  }
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
    const base = ollamaUrl || settings.ollamaUrl || process.env.OLLAMA_URL;
    url = getOllamaChatUrl(base);
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

// Serve static files
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
  console.log(`  Assistant API key: ${API_KEY ? 'enabled (LABYRINTH_API_KEY set)' : 'DISABLED (set LABYRINTH_API_KEY to require auth on /api/capture)'}`);
});
