import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Search } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const PROJECT_COLORS = ['#7c5cfc', '#22d3ee', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, loading, refresh } = useStore(useCallback(() => projectStore.getAll(), []));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [search, setSearch] = useState('');

  const openCreate = () => { setEditing(null); setName(''); setDescription(''); setColor(PROJECT_COLORS[0]); setDialogOpen(true); };
  const openEdit = (p: Project, e: React.MouseEvent) => { e.stopPropagation(); setEditing(p); setName(p.name); setDescription(p.description); setColor(p.color); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editing) {
      await projectStore.update(editing.id, { name, description, color });
    } else {
      await projectStore.create({ name, description, color });
    }
    setDialogOpen(false);
    refresh();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await projectStore.delete(id);
    refresh();
  };

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary border-border pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="mb-4 text-muted-foreground">{search ? 'No matching projects' : 'No projects yet'}</p>
            {!search && <Button onClick={openCreate} variant="outline">Create your first project</Button>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEdit(project, e)} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => handleDelete(project.id, e)} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{project.description || 'No description'}</p>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Project' : 'New Project'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Project name" value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border" />
              <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="bg-secondary border-border" rows={3} />
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Color</label>
                <div className="flex gap-2">
                  {PROJECT_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-foreground' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? 'Save Changes' : 'Create Project'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
