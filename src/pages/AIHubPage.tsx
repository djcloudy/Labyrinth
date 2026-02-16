import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Settings2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const API_BASE = import.meta.env.VITE_API_URL || '';

type Provider = 'openai' | 'gemini' | 'ollama';
type Message = { role: 'user' | 'assistant' | 'system'; content: string };

const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro-preview-06-05'],
  ollama: ['llama3', 'mistral', 'codellama', 'phi3', 'gemma2'],
};

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  ollama: 'Ollama (Local)',
};

interface AISettings {
  openaiApiKey?: string;
  geminiApiKey?: string;
  ollamaUrl?: string;
}

export default function AIHubPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState(PROVIDER_MODELS.openai[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AISettings>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load settings
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`).then(r => r.json()).then(s => {
      setSettings(s);
      setSettingsLoaded(true);
    }).catch(() => setSettingsLoaded(true));
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Update model when provider changes
  useEffect(() => {
    setModel(PROVIDER_MODELS[provider][0]);
  }, [provider]);

  const saveSettings = async (newSettings: AISettings) => {
    setSettings(newSettings);
    await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          provider,
          model,
          apiKey: provider === 'openai' ? settings.openaiApiKey : provider === 'gemini' ? settings.geminiApiKey : undefined,
          ollamaUrl: settings.ollamaUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
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
          } catch { /* partial JSON, wait for more */ }
        }
      }
    } catch (err: any) {
      setError(err.message);
      if (!assistantContent) {
        // Remove empty assistant message if nothing streamed
        setMessages(prev => prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1].content
          ? prev.slice(0, -1)
          : prev
        );
      }
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, messages, provider, model, settings, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
                <SelectContent className="bg-card border-border">
                  {PROVIDER_MODELS[provider].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* Warning if no API key */}
        {!hasApiKey && settingsLoaded && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
            <AlertCircle className="h-4 w-4 shrink-0" />
            No API key configured for {PROVIDER_LABELS[provider]}. Click "API Keys" to configure, or set <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">{provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'}</code> as an env variable.
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
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
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

        {/* Error */}
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
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>AI Provider Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">OpenAI API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={settings.openaiApiKey || ''}
                  onChange={e => saveSettings({ ...settings, openaiApiKey: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">Or set <code className="rounded bg-secondary px-1 py-0.5">OPENAI_API_KEY</code> env var</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Gemini API Key</label>
                <Input
                  type="password"
                  placeholder="AIza..."
                  value={settings.geminiApiKey || ''}
                  onChange={e => saveSettings({ ...settings, geminiApiKey: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">Or set <code className="rounded bg-secondary px-1 py-0.5">GEMINI_API_KEY</code> env var</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Ollama URL</label>
                <Input
                  placeholder="http://localhost:11434"
                  value={settings.ollamaUrl || ''}
                  onChange={e => saveSettings({ ...settings, ollamaUrl: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">Or set <code className="rounded bg-secondary px-1 py-0.5">OLLAMA_URL</code> env var. Default: http://localhost:11434</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
