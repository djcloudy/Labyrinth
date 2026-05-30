import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Code2, ListTodo, Sparkles, X, Image as ImageIcon, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCapture } from '@/hooks/use-capture';
import { projectStore, documentStore, snippetStore, taskStore, mediaStore, knowledgeStore } from '@/lib/store';
import { Project, SnippetLanguage, KnowledgeKind } from '@/lib/types';

const LAST_PROJECT_KEY = 'labyrinth:lastProjectId';

type CaptureType = 'auto' | 'document' | 'snippet' | 'task';

function detectType(text: string): Exclude<CaptureType, 'auto'> {
  const t = text.trim();
  if (!t) return 'document';
  if (/^```/.test(t)) return 'snippet';
  if (/^(\s*[-*]\s*\[ \]|\bTODO\b|\bFIXME\b)/im.test(t) && t.length < 500) return 'task';
  if (/^(#!\/|sudo |apt |systemctl |docker |kubectl |def |import |from |class )/m.test(t) && t.split('\n').length > 2) return 'snippet';
  return 'document';
}
function detectLang(text: string): SnippetLanguage {
  const t = text.trim();
  const fence = t.match(/^```(\w+)/);
  if (fence) {
    const l = fence[1].toLowerCase();
    if (['bash', 'sh', 'shell', 'zsh'].includes(l)) return 'BASH';
    if (['yaml', 'yml'].includes(l)) return 'YAML';
    if (['python', 'py'].includes(l)) return 'PYTHON';
  }
  if (/^#!\/(bin\/(ba)?sh|usr\/bin\/env\s+bash)/m.test(t)) return 'BASH';
  if (/^(def |import |from .+ import|class \w+)/m.test(t)) return 'PYTHON';
  if (/^[\w-]+:\s*(\n\s+[\w-]+:|$)/m.test(t)) return 'YAML';
  return 'BASH';
}
function stripFences(text: string) {
  const m = text.trim().match(/^```\w*\n([\s\S]*?)\n```$/);
  return m ? m[1] : text;
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function CaptureDialog() {
  const { open, initialText, closeCapture } = useCapture();
  const [type, setType] = useState<CaptureType>('auto');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState<SnippetLanguage>('BASH');
  const [projectId, setProjectId] = useState<string>('none');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [pastedImage, setPastedImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [saveToKnowledge, setSaveToKnowledge] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) projectStore.getAll().then(setProjects); }, [open]);

  useEffect(() => {
    if (open) {
      const remembered = (() => { try { return localStorage.getItem(LAST_PROJECT_KEY) || 'none'; } catch { return 'none'; } })();
      setType('auto'); setTitle(''); setBody(initialText || '');
      setLanguage('BASH'); setProjectId(remembered); setTags(''); setNotes('');
      setPastedImage(null); setSaveToKnowledge(false);
    }
  }, [open, initialText]);

  const resolvedType = useMemo<Exclude<CaptureType, 'auto'>>(
    () => (type === 'auto' ? detectType(body) : type),
    [type, body]
  );

  useEffect(() => {
    if (resolvedType === 'snippet') setLanguage(detectLang(body));
  }, [resolvedType, body]);

  const tagList = useMemo(
    () => tags.split(',').map(t => t.trim()).filter(Boolean),
    [tags]
  );

  const rememberProject = (pid: string | null) => {
    try { localStorage.setItem(LAST_PROJECT_KEY, pid || 'none'); } catch { /* ignore */ }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(it => it.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    try {
      const dataUrl = await fileToDataUrl(file);
      setPastedImage({ dataUrl, name: file.name || `pasted-${Date.now()}.png` });
      toast.success('Image attached — will be saved to Media on capture');
    } catch {
      toast.error('Could not read pasted image');
    }
  };

  const handleSave = async () => {
    if (!body.trim() && !title.trim() && !pastedImage) {
      toast.error('Add a title, content, or image first.');
      return;
    }
    setSaving(true);
    try {
      const pid = projectId === 'none' ? null : projectId;
      rememberProject(pid);
      const meta = {
        tags: tagList,
        source: 'manual' as const,
        createdBy: 'manual',
        updatedBy: 'manual',
        ...(notes ? { notes } : {}),
      };

      // If only an image was pasted (no text), save directly to media
      if (pastedImage && !body.trim() && !title.trim()) {
        await mediaStore.create({
          title: pastedImage.name,
          url: pastedImage.dataUrl,
          type: 'image',
          projectId: pid,
        });
        toast.success('Image saved to Media');
        closeCapture();
        return;
      }

      // If image + text, save image as media and add a markdown reference to body
      let finalBody = body;
      if (pastedImage) {
        const m = await mediaStore.create({
          title: pastedImage.name,
          url: pastedImage.dataUrl,
          type: 'image',
          projectId: pid,
        });
        finalBody = `${body}\n\n![${m.title}](${m.url})`.trim();
      }

      if (resolvedType === 'document') {
        await documentStore.create({
          title: title || (finalBody.split('\n')[0] || 'Untitled').slice(0, 80),
          content: finalBody, projectId: pid, ...meta,
        });
        toast.success('Document captured');
      } else if (resolvedType === 'snippet') {
        await snippetStore.create({
          title: title || 'Untitled snippet',
          language, code: stripFences(finalBody), projectId: pid, ...meta,
        });
        toast.success('Snippet captured');
      } else {
        const targetProject = pid || projects[0]?.id;
        if (!targetProject) {
          toast.error('Create a project first — tasks need to belong to one.');
          setSaving(false);
          return;
        }
        await taskStore.create({
          title: title || (finalBody.split('\n')[0] || 'Untitled task').slice(0, 120),
          description: title ? finalBody : finalBody.split('\n').slice(1).join('\n'),
          status: 'TODO', priority: 'MEDIUM', projectId: targetProject, ...meta,
        });
        toast.success('Task captured');
      }
      closeCapture();
    } catch (e) {
      console.error(e);
      toast.error('Failed to capture');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const typeOptions: { value: CaptureType; label: string; icon: typeof Sparkles }[] = [
    { value: 'auto', label: 'Auto', icon: Sparkles },
    { value: 'document', label: 'Document', icon: FileText },
    { value: 'snippet', label: 'Snippet', icon: Code2 },
    { value: 'task', label: 'Task', icon: ListTodo },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeCapture()}>
      <DialogContent className="bg-card border-border max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Capture
          </DialogTitle>
          <DialogDescription>
            Paste content (or an image) — Labyrinth will infer the best type, or pick one manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {typeOptions.map(({ value, label, icon: Icon }) => {
              const active = type === value;
              const isResolved = type === 'auto' && value === resolvedType;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {isResolved && <Badge variant="outline" className="ml-1 border-primary/40 text-primary text-[10px]">detected</Badge>}
                </button>
              );
            })}
          </div>

          <Input
            placeholder="Title (optional — first line used if blank)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-secondary border-border"
          />

          <Textarea
            ref={bodyRef}
            placeholder={
              resolvedType === 'snippet'
                ? 'Paste code (with or without ``` fences)...'
                : resolvedType === 'task'
                ? 'Task description, why it matters, links...'
                : 'Markdown content — or paste an image directly'
            }
            value={body}
            onChange={e => setBody(e.target.value)}
            onPaste={handlePaste}
            rows={10}
            className="bg-secondary border-border font-mono text-sm"
          />

          {pastedImage && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 p-2">
              <img src={pastedImage.dataUrl} alt="pasted" className="h-12 w-12 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <ImageIcon className="h-3 w-3" /> Image attached
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{pastedImage.name} — saves to Media on capture</p>
              </div>
              <button onClick={() => setPastedImage(null)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Link to project" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="none">No project</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {resolvedType === 'snippet' ? (
              <Select value={language} onValueChange={(v: SnippetLanguage) => setLanguage(v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="BASH">Bash</SelectItem>
                  <SelectItem value="YAML">YAML</SelectItem>
                  <SelectItem value="PYTHON">Python</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="bg-secondary border-border"
              />
            )}
          </div>

          {resolvedType === 'snippet' && (
            <Input
              placeholder="Tags (comma separated)"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="bg-secondary border-border"
            />
          )}

          <Textarea
            placeholder="Context / notes (optional — why are you saving this?)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="bg-secondary border-border text-sm"
          />

          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagList.map(t => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse items-stretch justify-between gap-2 pt-2 sm:flex-row sm:items-center">
            <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter to save</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeCapture} className="flex-1 sm:flex-none"><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
                {saving ? 'Saving...' : pastedImage && !body.trim() && !title.trim() ? 'Save image to Media' : `Capture as ${resolvedType}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
