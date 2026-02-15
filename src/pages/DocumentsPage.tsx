import { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AppLayout from '@/components/AppLayout';
import { documentStore, projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { Document, Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const { data: docs, loading, refresh } = useStore(useCallback(() => documentStore.getAll(), []));
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { projectStore.getAll().then(setProjects); }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setTitle(''); setContent(''); setProjectId('none'); setDialogOpen(true); };
  const openEdit = (e: React.MouseEvent, d: Document) => { e.stopPropagation(); setEditing(d); setTitle(d.title); setContent(d.content); setProjectId(d.projectId || 'none'); setDialogOpen(true); };

  const handleSave = async () => {
    if (!title.trim()) return;
    const pid = projectId === 'none' ? null : projectId;
    if (editing) await documentStore.update(editing.id, { title, content, projectId: pid });
    else await documentStore.create({ title, content, projectId: pid });
    setDialogOpen(false);
    refresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => { e.stopPropagation(); await documentStore.delete(id); refresh(); };

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Document</Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="mb-4 text-muted-foreground">No documents yet</p>
            <Button onClick={openCreate} variant="outline">Create your first document</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => {
              const project = doc.projectId ? projects.find(p => p.id === doc.projectId) : null;
              const isExpanded = expandedId === doc.id;
              return (
                <div key={doc.id} className="group rounded-xl border border-border bg-card transition-colors hover:border-info/30">
                  <button
                    onClick={() => toggleExpand(doc.id)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{doc.title}</h3>
                      {!isExpanded && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{doc.content || 'Empty'}</p>
                      )}
                      {project && <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{project.name}</span>}
                    </div>
                    <div className="ml-4 flex items-center gap-1">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span onClick={(e) => openEdit(e, doc)} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="h-3.5 w-3.5" /></span>
                        <span onClick={(e) => handleDelete(e, doc.id)} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></span>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4">
                      <div className="prose prose-sm prose-invert max-w-none text-foreground
                        prose-headings:text-foreground prose-headings:font-semibold
                        prose-p:text-muted-foreground prose-p:leading-relaxed
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-foreground
                        prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none
                        prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-background
                        prose-ul:text-muted-foreground prose-ol:text-muted-foreground
                        prose-li:marker:text-muted-foreground
                        prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground
                        prose-hr:border-border
                      ">
                        {doc.content ? (
                          <ReactMarkdown>{doc.content}</ReactMarkdown>
                        ) : (
                          <p className="italic text-muted-foreground">Empty document</p>
                        )}
                      </div>
                    </div>
                  )}
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
              <Textarea placeholder="Content (supports markdown)" value={content} onChange={e => setContent(e.target.value)} rows={10} className="bg-secondary border-border font-mono text-sm" />
              <Button onClick={handleSave} className="w-full">{editing ? 'Save' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
