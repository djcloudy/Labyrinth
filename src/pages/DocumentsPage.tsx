import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { documentStore, projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { Document } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DocumentsPage() {
  const { data: docs, refresh } = useStore(documentStore.getAll);
  const projects = projectStore.getAll();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string>('none');

  const openCreate = () => { setEditing(null); setTitle(''); setContent(''); setProjectId('none'); setDialogOpen(true); };
  const openEdit = (d: Document) => { setEditing(d); setTitle(d.title); setContent(d.content); setProjectId(d.projectId || 'none'); setDialogOpen(true); };

  const handleSave = () => {
    if (!title.trim()) return;
    const pid = projectId === 'none' ? null : projectId;
    if (editing) documentStore.update(editing.id, { title, content, projectId: pid });
    else documentStore.create({ title, content, projectId: pid });
    setDialogOpen(false);
    refresh();
  };

  const handleDelete = (id: string) => { documentStore.delete(id); refresh(); };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Document</Button>
        </div>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="mb-4 text-muted-foreground">No documents yet</p>
            <Button onClick={openCreate} variant="outline">Create your first document</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => {
              const project = doc.projectId ? projectStore.getById(doc.projectId) : null;
              return (
                <div key={doc.id} className="group rounded-xl border border-border bg-card p-5 hover:border-info/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{doc.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{doc.content || 'Empty'}</p>
                      {project && <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{project.name}</span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(doc)} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(doc.id)} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editing ? 'Edit Document' : 'New Document'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-border" />
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Content" value={content} onChange={e => setContent(e.target.value)} rows={6} className="bg-secondary border-border font-mono text-sm" />
              <Button onClick={handleSave} className="w-full">{editing ? 'Save' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
