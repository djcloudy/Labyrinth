import { useState, useEffect, useCallback } from 'react';

type Provider = 'openai' | 'gemini' | 'ollama';

interface AISettings {
  openaiApiKey?: string;
  geminiApiKey?: string;
  ollamaUrl?: string;
}

const FALLBACK_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro-preview-06-05'],
  ollama: ['llama3', 'mistral', 'codellama'],
};

export function useAIModels(provider: Provider, settings: AISettings) {
  const [models, setModels] = useState<string[]>(FALLBACK_MODELS[provider]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (provider === 'ollama' && settings.ollamaUrl) params.set('url', settings.ollamaUrl);
      if (provider === 'openai' && settings.openaiApiKey) params.set('key', settings.openaiApiKey);
      if (provider === 'gemini' && settings.geminiApiKey) params.set('key', settings.geminiApiKey);

      const API_BASE = import.meta.env.VITE_API_BASE || '';
      const res = await fetch(`${API_BASE}/api/ai/models/${provider}?${params}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Failed to fetch models`);
      }
      const data = await res.json();
      const names: string[] = data.models || [];
      setModels(names.length ? names : FALLBACK_MODELS[provider]);
    } catch (err: any) {
      setError(err.message);
      setModels(FALLBACK_MODELS[provider]);
    } finally {
      setLoading(false);
    }
  }, [provider, settings.openaiApiKey, settings.geminiApiKey, settings.ollamaUrl]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, error, refetch: fetchModels };
}
