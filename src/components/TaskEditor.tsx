import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, ListChecks, X, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import RevisionsDialog from '@/components/RevisionsDialog';
import { Task, TaskStatus, TaskPriority, Project, ChecklistItem } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Task | null;
  projects: Project[];
  /** If set, project picker is hidden and this id is used for new tasks. */
  forcedProjectId?: string | null;
  onSave: (data: Partial<Task>) => Promise<void> | void;
  onRefresh?: () => void;
}

function newChecklistItem(text = ''): ChecklistItem {
  return { id: crypto.randomUUID(), text, done: false };
}

export default function TaskEditor({ open, onOpenChange, editing, projects, forcedProjectId, onSave, onRefresh }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [projectId, setProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title || '');
    setDescription(editing?.description || '');
    setStatus(editing?.status || 'TODO');
    setPriority(editing?.priority || 'MEDIUM');
    setProjectId(editing?.projectId || forcedProjectId || (projects[0]?.id ?? ''));
    setDueDate(editing?.dueDate ? editing.dueDate.slice(0, 10) : '');
    setTagsInput((editing?.tags || []).join(', '));
    setChecklist(editing?.checklist || []);
    setShowDetails(!!editing);
  }, [open, editing, projects, forcedProjectId]);

  const effectiveProjectId = forcedProjectId ?? projectId;

  const handleSave = async () => {
    if (!title.trim() || !effectiveProjectId) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
      const cleaned = checklist.filter(c => c.text.trim());
      await onSave({
        title: title.trim(),
        description,
        status, priority,
        projectId: effectiveProjectId,
        ...(dueDate ? { dueDate } : { dueDate: undefined }),
        tags,
        checklist: cleaned,
      });
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base">{editing ? 'Edit Task' : 'New Task'}</DialogTitle>
            {editing && (
              <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} className="gap-1.5 text-xs h-7">
                <History className="h-3.5 w-3.5" /> History
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">Task form</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="What needs to happen?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-secondary border-border text-sm"
            autoFocus
          />

          <div className={forcedProjectId ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-3 gap-2'}>
            {!forcedProjectId && (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 bg-secondary border-border text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
              <SelectTrigger className="h-9 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <CalendarIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="h-9 bg-secondary border-border pl-7 text-xs"
              />
            </div>
          </div>

          {!showDetails ? (
            <button
              onClick={() => setShowDetails(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              + add description, tags, subtasks
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
              <Textarea
                placeholder="Description / context (why does this task exist?)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="bg-secondary border-border text-sm"
              />
              <Input
                placeholder="Tags (comma separated)"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="bg-secondary border-border text-xs"
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ListChecks className="h-3 w-3" /> Subtasks
                  </label>
                  <button
                    type="button"
                    onClick={() => setChecklist(c => [...c, newChecklistItem()])}
                    className="text-xs text-primary hover:underline"
                  >+ add</button>
                </div>
                <div className="space-y-1">
                  {checklist.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={(v) => setChecklist(c => c.map(x => x.id === item.id ? { ...x, done: !!v } : x))}
                        className="h-3.5 w-3.5"
                      />
                      <Input
                        value={item.text}
                        onChange={e => setChecklist(c => c.map(x => x.id === item.id ? { ...x, text: e.target.value } : x))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setChecklist(c => {
                              const next = [...c];
                              next.splice(i + 1, 0, newChecklistItem());
                              return next;
                            });
                            setTimeout(() => {
                              const inputs = document.querySelectorAll<HTMLInputElement>('input[data-subtask]');
                              inputs[i + 1]?.focus();
                            }, 0);
                          }
                        }}
                        placeholder="Subtask..."
                        data-subtask="true"
                        className="h-7 bg-secondary border-border text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setChecklist(c => c.filter(x => x.id !== item.id))}
                        className="text-muted-foreground hover:text-destructive"
                      ><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger className="h-8 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {tagsInput && (
            <div className="flex flex-wrap gap-1">
              {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter to save</span>
            <Button onClick={handleSave} disabled={saving || !title.trim() || !effectiveProjectId} size="sm">
              {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
      <RevisionsDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        collection="tasks"
        id={editing?.id ?? null}
        onRestored={() => { onRefresh?.(); onOpenChange(false); }}
      />
    </Dialog>
  );
}
