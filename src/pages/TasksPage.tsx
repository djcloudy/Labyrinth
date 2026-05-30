import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, Search, GripVertical, Calendar as CalendarIcon, ListChecks, X, Tag } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { format, isPast, isToday } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import { taskStore, projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { Task, TaskStatus, TaskPriority, Project, ChecklistItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

function newChecklistItem(text = ''): ChecklistItem {
  return { id: crypto.randomUUID(), text, done: false };
}

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
  const [dueDate, setDueDate] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('task');
  const highlightRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [highlightId, loading]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setTitle(''); setDescription(''); setStatus('TODO'); setPriority('MEDIUM');
    setProjectId(projects.length > 0 ? projects[0].id : '');
    setDueDate(''); setTagsInput(''); setChecklist([]);
    setShowDetails(false);
    setDialogOpen(true);
  }, [projects]);

  const openEdit = (t: Task) => {
    setEditing(t);
    setTitle(t.title); setDescription(t.description);
    setStatus(t.status); setPriority(t.priority); setProjectId(t.projectId);
    setDueDate(t.dueDate ? t.dueDate.slice(0, 10) : '');
    setTagsInput((t.tags || []).join(', '));
    setChecklist(t.checklist || []);
    setShowDetails(true);
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!title.trim() || !projectId) return;
    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
    const cleaned = checklist.filter(c => c.text.trim());
    const payload = {
      title: title.trim(), description, status, priority, projectId,
      ...(dueDate ? { dueDate } : { dueDate: undefined }),
      tags, checklist: cleaned,
    };
    if (editing) await taskStore.update(editing.id, payload);
    else await taskStore.create(payload as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
    setDialogOpen(false);
    refresh();
  }, [title, projectId, tagsInput, checklist, description, status, priority, dueDate, editing, refresh]);

  const handleDelete = async (id: string) => { await taskStore.delete(id); refresh(); };

  const handleStatusCycle = async (task: Task) => {
    const next: Record<TaskStatus, TaskStatus> = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' };
    await taskStore.update(task.id, { status: next[task.status] });
    refresh();
  };

  const handleToggleChecklist = async (task: Task, itemId: string) => {
    const updated = (task.checklist || []).map(c => c.id === itemId ? { ...c, done: !c.done } : c);
    await taskStore.update(task.id, { checklist: updated });
    refresh();
  };

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as TaskStatus;
    const task = tasks.find(t => t.id === draggableId);
    if (!task || task.status === newStatus) return;
    await taskStore.update(task.id, { status: newStatus });
    refresh();
  };

  const allTags = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach(t => (t.tags || []).forEach(tag => s.add(tag)));
    return Array.from(s).sort();
  }, [tasks]);

  const filtered = tasks.filter(t => {
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    if (filterTag !== 'all' && !(t.tags || []).includes(filterTag)) return false;
    const q = search.toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });
  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  filtered.forEach(t => grouped[t.status]?.push(t));

  // Ctrl/Cmd+Enter to save when dialog open
  useEffect(() => {
    if (!dialogOpen) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialogOpen, handleSave]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <div className="flex items-center gap-3">
            <Button onClick={openCreate} className="gap-2" disabled={projects.length === 0}>
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary border-border pl-9" />
          </div>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {allTags.length > 0 && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-40 bg-secondary border-border">
                <Tag className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {projects.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="text-muted-foreground">Create a project first to start adding tasks.</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid gap-6 lg:grid-cols-3">
              {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map(statusKey => {
                const config = STATUS_CONFIG[statusKey];
                const StatusIcon = config.icon;
                return (
                  <div key={statusKey} className="flex flex-col rounded-xl border border-border bg-card/50 p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                    <div className="mb-4 flex shrink-0 items-center gap-2">
                      <StatusIcon className={cn('h-5 w-5', config.className)} />
                      <h2 className="font-semibold text-foreground">{config.label}</h2>
                      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{grouped[statusKey].length}</span>
                    </div>
                    <Droppable droppableId={statusKey}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 rounded-lg transition-colors",
                            snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/20"
                          )}
                        >
                          {grouped[statusKey].map((task, index) => {
                            const project = projects.find(p => p.id === task.projectId);
                            const due = task.dueDate ? new Date(task.dueDate) : null;
                            const overdue = due && task.status !== 'DONE' && isPast(due) && !isToday(due);
                            const dueToday = due && isToday(due);
                            const total = task.checklist?.length || 0;
                            const done = task.checklist?.filter(c => c.done).length || 0;
                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={(el) => {
                                      dragProvided.innerRef(el);
                                      if (highlightId === task.id && el) (highlightRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                                    }}
                                    {...dragProvided.draggableProps}
                                    className={cn(
                                      "group rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors",
                                      highlightId === task.id && "ring-2 ring-primary border-primary",
                                      dragSnapshot.isDragging && "shadow-lg ring-2 ring-primary/40 rotate-1"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div {...dragProvided.dragHandleProps} className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      <button onClick={() => handleStatusCycle(task)} className="mt-0.5 shrink-0" title="Cycle status">
                                        <StatusIcon className={cn('h-4 w-4', config.className)} />
                                      </button>
                                      <div className="min-w-0 flex-1">
                                        <p className={cn("text-sm font-medium text-foreground", task.status === 'DONE' && 'line-through text-muted-foreground')}>{task.title}</p>
                                        {task.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>}

                                        {total > 0 && (
                                          <div className="mt-2 space-y-1">
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                              <ListChecks className="h-3 w-3" />
                                              {done}/{total}
                                              <div className="ml-1 h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                                                <div className="h-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                                              </div>
                                            </div>
                                            {task.checklist!.slice(0, 3).map(c => (
                                              <label key={c.id} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                                                <Checkbox checked={c.done} onCheckedChange={() => handleToggleChecklist(task, c.id)} className="h-3 w-3" />
                                                <span className={cn("flex-1 truncate", c.done && "line-through text-muted-foreground")}>{c.text}</span>
                                              </label>
                                            ))}
                                            {task.checklist!.length > 3 && (
                                              <p className="text-[10px] text-muted-foreground pl-4">+{task.checklist!.length - 3} more</p>
                                            )}
                                          </div>
                                        )}

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                                          {project && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{project.name}</span>}
                                          {due && (
                                            <span className={cn(
                                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
                                              overdue ? "bg-destructive/20 text-destructive" :
                                              dueToday ? "bg-warning/20 text-warning" :
                                              "bg-secondary text-muted-foreground"
                                            )}>
                                              <CalendarIcon className="h-2.5 w-2.5" />
                                              {format(due, 'MMM d')}
                                            </span>
                                          )}
                                          {(task.tags || []).map(t => (
                                            <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(task)} className="rounded p-1 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                                        <button onClick={() => handleDelete(task.id)} className="rounded p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          {grouped[statusKey].length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No tasks</p>}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* Compact task dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{editing ? 'Edit Task' : 'New Task'}</DialogTitle>
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

              {/* Compact inline row: project, priority, due */}
              <div className="grid grid-cols-3 gap-2">
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-9 bg-secondary border-border text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <Button onClick={handleSave} disabled={!title.trim() || !projectId} size="sm">
                  {editing ? 'Save' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
