import { useEffect, useState } from 'react';
import { Sparkles, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CodeEditor from '@/components/CodeEditor';
import RevisionsDialog from '@/components/RevisionsDialog';
import { Snippet, SnippetLanguage, Project } from '@/lib/types';
import { SNIPPET_TEMPLATES } from '@/lib/templates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Snippet | null;
  projects: Project[];
  /** If set, project picker is hidden and this id is used for new snippets. */
  forcedProjectId?: string | null;
  onSave: (data: { title: string; code: string; language: SnippetLanguage; projectId: string | null }) => Promise<void> | void;
  onRefresh?: () => void;
}

export default function SnippetEditor({ open, onOpenChange, editing, projects, forcedProjectId, onSave, onRefresh }: Props) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<SnippetLanguage>('BASH');
  const [projectId, setProjectId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title || '');
    setCode(editing?.code || '');
    setLanguage(editing?.language || 'BASH');
    setProjectId(
      editing?.projectId
        ?? (forcedProjectId ?? 'none')
    );
  }, [open, editing, forcedProjectId]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const pid = forcedProjectId !== undefined && forcedProjectId !== null
        ? forcedProjectId
        : projectId === 'none' ? null : projectId;
      await onSave({ title, code, language, projectId: pid });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{editing ? 'Edit Snippet' : 'New Snippet'}</DialogTitle>
            {editing && (
              <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} className="gap-1.5 text-xs h-7">
                <History className="h-3.5 w-3.5" /> History
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">Snippet editor with syntax highlighting</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-border" autoFocus={!editing} />
          <div className={forcedProjectId !== undefined ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3'}>
            <Select value={language} onValueChange={v => setLanguage(v as SnippetLanguage)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="BASH">BASH</SelectItem>
                <SelectItem value="YAML">YAML</SelectItem>
                <SelectItem value="PYTHON">PYTHON</SelectItem>
              </SelectContent>
            </Select>
            {forcedProjectId === undefined && (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value="" onValueChange={(id) => {
              const tpl = SNIPPET_TEMPLATES.find(t => t.id === id);
              if (!tpl) return;
              if (!title.trim()) setTitle(tpl.title);
              setLanguage(tpl.language);
              setCode(tpl.code);
            }}>
              <SelectTrigger className="bg-secondary border-border">
                <Sparkles className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Template..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {SNIPPET_TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <span>{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">{t.language}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CodeEditor value={code} onChange={setCode} language={language} height="340px" placeholder="Paste your code..." />
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">{saving ? 'Saving...' : editing ? 'Save' : 'Create'}</Button>
        </div>
      </DialogContent>
      <RevisionsDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        collection="snippets"
        id={editing?.id ?? null}
        onRestored={() => { onRefresh?.(); onOpenChange(false); }}
      />
    </Dialog>
  );
}
