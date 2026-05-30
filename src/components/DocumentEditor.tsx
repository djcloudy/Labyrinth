import { useEffect, useState, useMemo } from 'react';
import { Eye, EyeOff, FileText, Save, X, Sparkles, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import RevisionsDialog from '@/components/RevisionsDialog';
import { documentStore } from '@/lib/store';
import { Document, Project } from '@/lib/types';
import { DOC_TEMPLATES } from '@/lib/templates';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Document | null;
  projects: Project[];
  onSave: (data: { title: string; content: string; projectId: string | null }) => Promise<void> | void;
}

export default function DocumentEditor({ open, onOpenChange, editing, projects, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title || '');
      setContent(editing?.content || '');
      setProjectId(editing?.projectId || 'none');
      setShowPreview(true);
    }
  }, [open, editing]);

  const applyTemplate = (id: string) => {
    const tpl = DOC_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    if (!title.trim()) setTitle(tpl.title);
    setContent(prev => (prev.trim() ? `${prev}\n\n${tpl.content}` : tpl.content));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title, content, projectId: projectId === 'none' ? null : projectId });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') { e.preventDefault(); handleSave(); }
      if (mod && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); setShowPreview(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="border-b border-border px-5 py-3 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <DialogTitle className="sr-only">{editing ? 'Edit Document' : 'New Document'}</DialogTitle>
              <DialogDescription className="sr-only">Markdown editor with live preview</DialogDescription>
              <Input
                placeholder="Document title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="h-9 border-0 bg-transparent text-base font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                autoFocus={!editing}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(p => !p)} title="Toggle preview (⌘P)">
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-8 w-48 bg-secondary border-border text-xs">
                <SelectValue placeholder="Link to project" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="none">No project</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value="" onValueChange={applyTemplate}>
              <SelectTrigger className="h-8 w-44 bg-secondary border-border text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Insert template..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DOC_TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex flex-col">
                      <span className="text-sm">{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {wordCount} words · ⌘S save · ⌘P preview
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={showPreview ? 50 : 100} minSize={30}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Start writing in markdown... (try the template menu above)"
                className="h-full w-full resize-none bg-background p-5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                spellCheck={false}
              />
            </ResizablePanel>
            {showPreview && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50} minSize={25}>
                  <div className={cn(
                    "h-full overflow-y-auto p-5 bg-card",
                    "prose prose-sm prose-invert max-w-none text-foreground",
                    "prose-headings:text-foreground prose-headings:font-semibold",
                    "prose-p:text-muted-foreground prose-p:leading-relaxed",
                    "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
                    "prose-strong:text-foreground",
                    "prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none",
                    "prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-background",
                    "prose-ul:text-muted-foreground prose-ol:text-muted-foreground",
                    "prose-li:marker:text-muted-foreground",
                    "prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground",
                    "prose-hr:border-border",
                    "prose-table:text-foreground prose-th:text-foreground prose-th:border-border prose-td:border-border",
                  )}>
                    {content.trim()
                      ? <ReactMarkdown remarkPlugins={[remarkBreaks]}>{content}</ReactMarkdown>
                      : <p className="italic text-muted-foreground">Preview will appear here.</p>}
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="gap-2">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
