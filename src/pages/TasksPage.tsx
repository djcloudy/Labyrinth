import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, Search, GripVertical, Calendar as CalendarIcon, ListChecks, Tag } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { format, isPast, isToday } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import TaskEditor from '@/components/TaskEditor';
import { taskStore, projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { Task, TaskStatus, TaskPriority, Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function TasksPage() {
  const { data: tasks, loading, refresh } = useStore(useCallback(() => taskStore.getAll(), []));
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { projectStore.getAll().then(setProjects); }, []);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('task');
  const highlightRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [highlightId, loading]);

  const openCreate = useCallback(() => { setEditing(null); setEditorOpen(true); }, []);
  const openEdit = (t: Task) => { setEditing(t); setEditorOpen(true); };

  const handleSave = async (data: Partial<Task>) => {
    if (editing) await taskStore.update(editing.id, data);
    else await taskStore.create(data as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
    refresh();
  };

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

        <TaskEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          editing={editing}
          projects={projects}
          onSave={handleSave}
          onRefresh={refresh}
        />
      </div>
    </AppLayout>
  );
}
