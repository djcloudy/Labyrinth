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
      if (provider === 'ollama') {
        const base = settings.ollamaUrl || 'http://localhost:11434';
        const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error('Failed to reach Ollama');
        const data = await res.json();
        const names: string[] = (data.models || []).map((m: any) => m.name);
        setModels(names.length ? names : FALLBACK_MODELS.ollama);
      } else if (provider === 'openai') {
        const key = settings.openaiApiKey;
        if (!key) { setModels(FALLBACK_MODELS.openai); return; }
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error('Failed to fetch OpenAI models');
        const data = await res.json();
        const chatModels: string[] = (data.data || [])
          .map((m: any) => m.id as string)
          .filter((id: string) => /^gpt-/.test(id))
          .sort();
        setModels(chatModels.length ? chatModels : FALLBACK_MODELS.openai);
      } else if (provider === 'gemini') {
        const key = settings.geminiApiKey;
        if (!key) { setModels(FALLBACK_MODELS.gemini); return; }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error('Failed to fetch Gemini models');
        const data = await res.json();
        const names: string[] = (data.models || [])
          .map((m: any) => (m.name as string).replace('models/', ''))
          .filter((id: string) => id.startsWith('gemini-'))
          .sort();
        setModels(names.length ? names : FALLBACK_MODELS.gemini);
      }
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
