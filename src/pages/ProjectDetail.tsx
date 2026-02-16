import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, FileText, Code2, ListTodo, Plus, Circle, Clock, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { projectStore, documentStore, snippetStore, taskStore } from '@/lib/store';
import { Project, Document, Snippet, SnippetLanguage, Task, TaskStatus, TaskPriority } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/hooks/use-store';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const LANG_COLORS: Record<SnippetLanguage, string> = { BASH: 'bg-warning/20 text-warning', YAML: 'bg-info/20 text-info', PYTHON: 'bg-success/20 text-success' };
const STATUS_ICONS: Record<TaskStatus, { icon: React.ElementType; className: string }> = {
  TODO: { icon: Circle, className: 'text-muted-foreground' },
  IN_PROGRESS: { icon: Clock, className: 'text-warning' },
  DONE: { icon: CheckCircle2, className: 'text-success' },
};
const PRIORITY_COLORS: Record<TaskPriority, string> = { LOW: 'bg-muted text-muted-foreground', MEDIUM: 'bg-warning/20 text-warning', HIGH: 'bg-destructive/20 text-destructive' };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    projectStore.getById(id!).then(p => setProject(p ?? null));
  }, [id]);

  const { data: docs, loading: loadingDocs, refresh: refreshDocs } = useStore(useCallback(() => documentStore.getByProject(id!), [id]));
  const { data: snippets, loading: loadingSnippets, refresh: refreshSnippets } = useStore(useCallback(() => snippetStore.getByProject(id!), [id]));
  const { data: tasks, loading: loadingTasks, refresh: refreshTasks } = useStore(useCallback(() => taskStore.getByProject(id!), [id]));

  const [docDialog, setDocDialog] = useState(false);
  const [snippetDialog, setSnippetDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [snipTitle, setSnipTitle] = useState('');
  const [snipCode, setSnipCode] = useState('');
  const [snipLang, setSnipLang] = useState<SnippetLanguage>('BASH');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('TODO');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');

  if (project === undefined) return <AppLayout><Skeleton className="h-8 w-48" /></AppLayout>;
  if (project === null) return <AppLayout><p className="text-muted-foreground">Project not found.</p></AppLayout>;

  const openDocCreate = () => { setEditingDoc(null); setDocTitle(''); setDocContent(''); setDocDialog(true); };
  const openDocEdit = (d: Document) => { setEditingDoc(d); setDocTitle(d.title); setDocContent(d.content); setDocDialog(true); };
  const saveDoc = async () => { if (!docTitle.trim()) return; if (editingDoc) await documentStore.update(editingDoc.id, { title: docTitle, content: docContent }); else await documentStore.create({ title: docTitle, content: docContent, projectId: id! }); setDocDialog(false); refreshDocs(); };
  const deleteDoc = async (docId: string) => { await documentStore.delete(docId); refreshDocs(); };

  const openSnipCreate = () => { setEditingSnippet(null); setSnipTitle(''); setSnipCode(''); setSnipLang('BASH'); setSnippetDialog(true); };
  const openSnipEdit = (s: Snippet) => { setEditingSnippet(s); setSnipTitle(s.title); setSnipCode(s.code); setSnipLang(s.language); setSnippetDialog(true); };
  const saveSnippet = async () => { if (!snipTitle.trim()) return; if (editingSnippet) await snippetStore.update(editingSnippet.id, { title: snipTitle, code: snipCode, language: snipLang }); else await snippetStore.create({ title: snipTitle, code: snipCode, language: snipLang, projectId: id! }); setSnippetDialog(false); refreshSnippets(); };
  const deleteSnippet = async (snipId: string) => { await snippetStore.delete(snipId); refreshSnippets(); };

  const openTaskCreate = () => { setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setTaskStatus('TODO'); setTaskPriority('MEDIUM'); setTaskDialog(true); };
  const openTaskEdit = (t: Task) => { setEditingTask(t); setTaskTitle(t.title); setTaskDesc(t.description); setTaskStatus(t.status); setTaskPriority(t.priority); setTaskDialog(true); };
  const saveTask = async () => { if (!taskTitle.trim()) return; if (editingTask) await taskStore.update(editingTask.id, { title: taskTitle, description: taskDesc, status: taskStatus, priority: taskPriority }); else await taskStore.create({ title: taskTitle, description: taskDesc, status: taskStatus, priority: taskPriority, projectId: id! }); setTaskDialog(false); refreshTasks(); };
  const deleteTask = async (taskId: string) => { await taskStore.delete(taskId); refreshTasks(); };
  const cycleTaskStatus = async (task: Task) => { const next: Record<TaskStatus, TaskStatus> = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' }; await taskStore.update(task.id, { status: next[task.status] }); refreshTasks(); };

  const handleDeleteProject = async () => { await projectStore.delete(id!); navigate('/projects'); };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <button onClick={() => navigate('/projects')} className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> PROJECTS
        </button>
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/projects`)} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="h-4 w-4" /></button>
            <button onClick={handleDeleteProject} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>

        <hr className="my-6 border-border" />

        {/* Documents section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-info" /> Documents</h2>
            <button onClick={openDocCreate} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">+ ADD DOC</button>
          </div>
          {loadingDocs ? <Skeleton className="h-16 w-full" /> : docs.length === 0 ? <p className="text-sm text-muted-foreground">No documents yet.</p> : (
            <div className="space-y-3">
              {docs.map(doc => (
                <div key={doc.id} className="group rounded-xl border border-border bg-card p-4 hover:border-info/30 transition-colors cursor-pointer" onClick={() => navigate(`/documents?doc=${doc.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{doc.title}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{doc.content || 'Empty document'}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openDocEdit(doc)} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteDoc(doc.id)} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ListTodo className="h-5 w-5 text-warning" /> Tasks</h2>
            <button onClick={openTaskCreate} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">+ ADD TASK</button>
          </div>
          {loadingTasks ? <Skeleton className="h-16 w-full" /> : tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : (
            <div className="space-y-2">
              {tasks.map(task => {
                const StatusIcon = STATUS_ICONS[task.status].icon;
                return (
                  <div key={task.id} className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-warning/30 transition-colors">
                    <button onClick={() => cycleTaskStatus(task)} title="Cycle status">
                      <StatusIcon className={cn('h-4 w-4', STATUS_ICONS[task.status].className)} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium text-foreground", task.status === 'DONE' && 'line-through text-muted-foreground')}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>}
                    </div>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openTaskEdit(task)} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteTask(task.id)} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Snippets section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Code2 className="h-5 w-5 text-success" /> Snippets</h2>
            <button onClick={openSnipCreate} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">+ ADD SNIPPET</button>
          </div>
          {loadingSnippets ? <Skeleton className="h-16 w-full" /> : snippets.length === 0 ? <p className="text-sm text-muted-foreground">No snippets yet.</p> : (
            <div className="space-y-3">
              {snippets.map(snip => (
                <div key={snip.id} className="group rounded-xl border border-border bg-card p-4 hover:border-success/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{snip.title}</h3>
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${LANG_COLORS[snip.language]}`}>{snip.language}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openSnipEdit(snip)} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteSnippet(snip.id)} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 text-sm font-mono text-success"><code>{snip.code}</code></pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doc Dialog */}
        <Dialog open={docDialog} onOpenChange={setDocDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editingDoc ? 'Edit Document' : 'New Document'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Document title" value={docTitle} onChange={e => setDocTitle(e.target.value)} className="bg-secondary border-border" />
              <Textarea placeholder="Content (markdown, links, notes...)" value={docContent} onChange={e => setDocContent(e.target.value)} rows={6} className="bg-secondary border-border font-mono text-sm" />
              <Button onClick={saveDoc} className="w-full">{editingDoc ? 'Save' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Snippet Dialog */}
        <Dialog open={snippetDialog} onOpenChange={setSnippetDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editingSnippet ? 'Edit Snippet' : 'New Snippet'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Snippet title" value={snipTitle} onChange={e => setSnipTitle(e.target.value)} className="bg-secondary border-border" />
              <Select value={snipLang} onValueChange={(v) => setSnipLang(v as SnippetLanguage)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="BASH">BASH</SelectItem>
                  <SelectItem value="YAML">YAML</SelectItem>
                  <SelectItem value="PYTHON">PYTHON</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Paste your code here..." value={snipCode} onChange={e => setSnipCode(e.target.value)} rows={8} className="bg-secondary border-border font-mono text-sm" />
              <Button onClick={saveSnippet} className="w-full">{editingSnippet ? 'Save' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Task Dialog */}
        <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="bg-secondary border-border" />
              <Textarea placeholder="Description (optional)" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={3} className="bg-secondary border-border text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <Select value={taskStatus} onValueChange={v => setTaskStatus(v as TaskStatus)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskPriority} onValueChange={v => setTaskPriority(v as TaskPriority)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveTask} className="w-full">{editingTask ? 'Save' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
