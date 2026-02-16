import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Settings2, Trash2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAIModels } from '@/hooks/use-ai-models';

type Provider = 'openai' | 'gemini' | 'ollama';
type Message = { role: 'user' | 'assistant' | 'system'; content: string };

const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro-preview-06-05'],
  ollama: ['llama3', 'mistral', 'codellama'],
};

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  ollama: 'Ollama (Local)',
};

const PROVIDER_URLS: Record<Provider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  ollama: '', // set dynamically
};

interface AISettings {
  openaiApiKey?: string;
  geminiApiKey?: string;
  ollamaUrl?: string;
}

const SETTINGS_KEY = 'labyrinth_ai_settings';

function loadSettings(): AISettings {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

function persistSettings(s: AISettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export default function AIHubPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState(PROVIDER_MODELS.openai[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AISettings>(loadSettings);
  const { models: availableModels, loading: modelsLoading, refetch: refetchModels } = useAIModels(provider, settings);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { setModel(availableModels[0] || PROVIDER_MODELS[provider][0]); }, [provider, availableModels]);

  const updateSettings = (patch: Partial<AISettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    persistSettings(next);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    const userMsg: Message = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';

    try {
      let url: string;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (provider === 'ollama') {
        const base = settings.ollamaUrl || 'http://localhost:11434';
        url = `${base}/v1/chat/completions`;
      } else if (provider === 'gemini') {
        const key = settings.geminiApiKey;
        if (!key) throw new Error('No Gemini API key configured. Click "API Keys" to set one.');
        url = `${PROVIDER_URLS.gemini}`;
        headers['Authorization'] = `Bearer ${key}`;
      } else {
        const key = settings.openaiApiKey;
        if (!key) throw new Error('No OpenAI API key configured. Click "API Keys" to set one.');
        url = PROVIDER_URLS.openai;
        headers['Authorization'] = `Bearer ${key}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages: allMessages, stream: true }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg: string;
        try { errMsg = JSON.parse(errText)?.error?.message || errText; } catch { errMsg = errText; }
        throw new Error(`${res.status}: ${errMsg}`);
      }

      if (!res.body) throw new Error('No response body');

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              const content = assistantContent;
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m));
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (err: any) {
      setError(err.message);
      if (!assistantContent) {
        setMessages(prev =>
          prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1].content
            ? prev.slice(0, -1) : prev
        );
      }
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, messages, provider, model, settings, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => { setMessages([]); setError(null); };
  const hasApiKey = provider === 'ollama' || settings[`${provider}ApiKey` as keyof AISettings];

  return (
    <AppLayout>
      <div className="animate-fade-in flex h-[calc(100vh-2rem)] flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">AI Hub</h1>
            <div className="flex items-center gap-2">
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                <SelectTrigger className="w-40 bg-secondary border-border h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {(Object.keys(PROVIDER_LABELS) as Provider[]).map(p => (
                    <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-48 bg-secondary border-border h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {availableModels.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetchModels}
                disabled={modelsLoading}
                className="h-8 w-8 p-0"
                title="Refresh available models"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", modelsLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearChat} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> API Keys
            </Button>
          </div>
        </div>

        {!hasApiKey && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
            <AlertCircle className="h-4 w-4 shrink-0" />
            No API key configured for {PROVIDER_LABELS[provider]}. Click "API Keys" to configure.
          </div>
        )}

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/50 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot className="mb-4 h-16 w-16 text-primary/40" />
              <p className="text-lg font-semibold text-foreground/60">Start a conversation</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ask questions about your infrastructure, generate configs, debug issues, or get intelligent insights.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'justify-end')}>
                  {msg.role === 'assistant' && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[75%] rounded-xl px-4 py-3 text-sm',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-pre:bg-background prose-pre:border prose-pre:border-border prose-code:text-success">
                        <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                  <div className="rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">Thinking...</div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="line-clamp-2">{error}</span>
          </div>
        )}

        {/* Input */}
        <div className="mt-3 flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for newline)"
            rows={1}
            className="min-h-[44px] max-h-32 resize-none bg-secondary border-border"
            disabled={isStreaming}
          />
          <Button onClick={sendMessage} disabled={isStreaming || !input.trim()} className="shrink-0 h-[44px] w-[44px] p-0">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="bg-card border-border" aria-describedby="ai-settings-desc">
            <DialogHeader>
              <DialogTitle>AI Provider Settings</DialogTitle>
              <DialogDescription id="ai-settings-desc">Configure API keys for your AI providers. Keys are stored locally in your browser.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">OpenAI API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={settings.openaiApiKey || ''}
                  onChange={e => updateSettings({ openaiApiKey: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Gemini API Key</label>
                <Input
                  type="password"
                  placeholder="AIza..."
                  value={settings.geminiApiKey || ''}
                  onChange={e => updateSettings({ geminiApiKey: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Ollama URL</label>
                <Input
                  placeholder="http://localhost:11434"
                  value={settings.ollamaUrl || ''}
                  onChange={e => updateSettings({ ollamaUrl: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">Default: http://localhost:11434</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
