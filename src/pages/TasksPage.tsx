import { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { taskStore, projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { Task, TaskStatus, TaskPriority, Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ElementType; className: string }> = {
  TODO: { label: 'To Do', icon: Circle, className: 'text-muted-foreground' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, className: 'text-warning' },
  DONE: { label: 'Done', icon: CheckCircle2, className: 'text-success' },
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-warning/20 text-warning',
  HIGH: 'bg-destructive/20 text-destructive',
};

export default function TasksPage() {
  const { data: tasks, loading, refresh } = useStore(useCallback(() => taskStore.getAll(), []));
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { projectStore.getAll().then(setProjects); }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [projectId, setProjectId] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('all');

  const openCreate = () => {
    setEditing(null); setTitle(''); setDescription(''); setStatus('TODO'); setPriority('MEDIUM');
    setProjectId(projects.length > 0 ? projects[0].id : '');
    setDialogOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t); setTitle(t.title); setDescription(t.description);
    setStatus(t.status); setPriority(t.priority); setProjectId(t.projectId);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !projectId) return;
    if (editing) await taskStore.update(editing.id, { title, description, status, priority, projectId });
    else await taskStore.create({ title, description, status, priority, projectId });
    setDialogOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => { await taskStore.delete(id); refresh(); };

  const handleStatusCycle = async (task: Task) => {
    const next: Record<TaskStatus, TaskStatus> = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' };
    await taskStore.update(task.id, { status: next[task.status] });
    refresh();
  };

  const filtered = filterProject === 'all' ? tasks : tasks.filter(t => t.projectId === filterProject);
  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  filtered.forEach(t => grouped[t.status]?.push(t));

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <div className="flex items-center gap-3">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="gap-2" disabled={projects.length === 0}>
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>

        {projects.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="text-muted-foreground">Create a project first to start adding tasks.</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map(statusKey => {
              const config = STATUS_CONFIG[statusKey];
              const StatusIcon = config.icon;
              return (
                <div key={statusKey} className="rounded-xl border border-border bg-card/50 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <StatusIcon className={cn('h-5 w-5', config.className)} />
                    <h2 className="font-semibold text-foreground">{config.label}</h2>
                    <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{grouped[statusKey].length}</span>
                  </div>
                  <div className="space-y-2">
                    {grouped[statusKey].map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <div key={task.id} className="group rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <button onClick={() => handleStatusCycle(task)} className="mt-0.5 shrink-0" title="Cycle status">
                              <StatusIcon className={cn('h-4 w-4', config.className)} />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-sm font-medium text-foreground", task.status === 'DONE' && 'line-through text-muted-foreground')}>{task.title}</p>
                              {task.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                              <div className="mt-2 flex items-center gap-2">
                                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                                {project && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{project.name}</span>}
                              </div>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(task)} className="rounded p-1 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                              <button onClick={() => handleDelete(task.id)} className="rounded p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {grouped[statusKey].length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No tasks</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editing ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-border" />
              <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="bg-secondary border-border text-sm" />
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? 'Save' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
