import { useEffect, useMemo, useState } from 'react';
import { FileText, Code2, ListTodo, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCapture } from '@/hooks/use-capture';
import { projectStore, documentStore, snippetStore, taskStore } from '@/lib/store';
import { Project, SnippetLanguage } from '@/lib/types';

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

  useEffect(() => { if (open) projectStore.getAll().then(setProjects); }, [open]);

  useEffect(() => {
    if (open) {
      setType('auto'); setTitle(''); setBody(initialText || '');
      setLanguage('BASH'); setProjectId('none'); setTags(''); setNotes('');
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

  const handleSave = async () => {
    if (!body.trim() && !title.trim()) {
      toast.error('Add a title or some content first.');
      return;
    }
    setSaving(true);
    try {
      const pid = projectId === 'none' ? null : projectId;
      const meta = {
        tags: tagList,
        source: 'manual' as const,
        createdBy: 'manual',
        updatedBy: 'manual',
        ...(notes ? { notes } : {}),
      };
      if (resolvedType === 'document') {
        await documentStore.create({
          title: title || (body.split('\n')[0] || 'Untitled').slice(0, 80),
          content: body, projectId: pid, ...meta,
        });
        toast.success('Document captured');
      } else if (resolvedType === 'snippet') {
        await snippetStore.create({
          title: title || 'Untitled snippet',
          language, code: stripFences(body), projectId: pid, ...meta,
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
          title: title || (body.split('\n')[0] || 'Untitled task').slice(0, 120),
          description: title ? body : body.split('\n').slice(1).join('\n'),
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
    { value: 'auto', label: 'Auto-detect', icon: Sparkles },
    { value: 'document', label: 'Document', icon: FileText },
    { value: 'snippet', label: 'Snippet', icon: Code2 },
    { value: 'task', label: 'Task', icon: ListTodo },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeCapture()}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Capture
          </DialogTitle>
          <DialogDescription>
            Paste any content — Labyrinth will infer the best type, or pick one manually.
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
            placeholder={
              resolvedType === 'snippet'
                ? 'Paste code (with or without ``` fences)...'
                : resolvedType === 'task'
                ? 'Task description, why it matters, links...'
                : 'Markdown content...'
            }
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            className="bg-secondary border-border font-mono text-sm"
          />

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

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter to save</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeCapture}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : `Capture as ${resolvedType}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
