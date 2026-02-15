// API client for persistent disk storage with localStorage fallback

const API_BASE = import.meta.env.VITE_API_URL || '';

interface HealthResponse {
  status: string;
  dataDir: string;
  collections: string[];
}

let _apiAvailable: boolean | null = null;
let _healthData: HealthResponse | null = null;

export async function checkApiHealth(): Promise<{ available: boolean; health: HealthResponse | null }> {
  if (_apiAvailable !== null) return { available: _apiAvailable, health: _healthData };
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      _healthData = await res.json();
      _apiAvailable = true;
    } else {
      _apiAvailable = false;
    }
  } catch {
    _apiAvailable = false;
  }
  return { available: _apiAvailable, health: _healthData };
}

export function resetApiCheck() {
  _apiAvailable = null;
  _healthData = null;
}

export function isApiAvailable(): boolean | null {
  return _apiAvailable;
}

export function getHealthData(): HealthResponse | null {
  return _healthData;
}

// Generic API operations
export async function apiGetAll<T>(collection: string): Promise<T[]> {
  const res = await fetch(`${API_BASE}/api/${collection}`);
  if (!res.ok) throw new Error(`Failed to fetch ${collection}`);
  return res.json();
}

export async function apiCreate<T>(collection: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${API_BASE}/api/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create in ${collection}`);
  return res.json();
}

export async function apiUpdate<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${API_BASE}/api/${collection}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update in ${collection}`);
  return res.json();
}

export async function apiDelete(collection: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/${collection}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete from ${collection}`);
}
