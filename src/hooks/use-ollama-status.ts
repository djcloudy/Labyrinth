import { useState, useEffect, useCallback } from 'react';

type Status = 'checking' | 'online' | 'offline';

export function useOllamaStatus(provider: string, ollamaUrl?: string, intervalMs = 30000) {
  const [status, setStatus] = useState<Status>('checking');

  const check = useCallback(async () => {
    if (provider !== 'ollama') return;
    setStatus('checking');
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '';
      const params = new URLSearchParams();
      if (ollamaUrl) params.set('url', ollamaUrl);
      const res = await fetch(`${API_BASE}/api/ai/models/ollama?${params}`, {
        signal: AbortSignal.timeout(5000),
      });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  }, [provider, ollamaUrl]);

  useEffect(() => {
    if (provider !== 'ollama') return;
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, provider, intervalMs]);

  return { status, recheck: check };
}
