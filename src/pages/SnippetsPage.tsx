import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Copy, Check, Search } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AppLayout from '@/components/AppLayout';
import { snippetStore, projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { Snippet, SnippetLanguage, Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const LANG_COLORS: Record<SnippetLanguage, string> = { BASH: 'bg-warning/20 text-warning', YAML: 'bg-info/20 text-info', PYTHON: 'bg-success/20 text-success' };

export default function SnippetsPage() {
  const { data: snippets, loading, refresh } = useStore(useCallback(() => snippetStore.getAll(), []));
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { projectStore.getAll().then(setProjects); }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [viewSnippet, setViewSnippet] = useState<Snippet | null>(null);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<SnippetLanguage>('BASH');
  const [projectId, setProjectId] = useState<string>('none');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('snippet');
  const highlightRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [highlightId, loading]);

  const openCreate = () => { setEditing(null); setTitle(''); setCode(''); setLanguage('BASH'); setProjectId('none'); setDialogOpen(true); };
  const openEdit = (s: Snippet) => { setEditing(s); setTitle(s.title); setCode(s.code); setLanguage(s.language); setProjectId(s.projectId || 'none'); setDialogOpen(true); };

  const handleSave = async () => {
    if (!title.trim()) return;
    const pid = projectId === 'none' ? null : projectId;
    if (editing) await snippetStore.update(editing.id, { title, code, language, projectId: pid });
    else await snippetStore.create({ title, code, language, projectId: pid });
    setDialogOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => { await snippetStore.delete(id); refresh(); };

  const handleCopy = async (id: string, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = snippets.filter(s => {
    if (filterProject !== 'all' && s.projectId !== filterProject) return false;
    if (filterLang !== 'all' && s.language !== filterLang) return false;
    const q = search.toLowerCase();
    return !q || s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Snippets</h1>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Snippet</Button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search snippets..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary border-border pl-9" />
          </div>
          <Select value={filterLang} onValueChange={setFilterLang}>
            <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="BASH">BASH</SelectItem>
              <SelectItem value="YAML">YAML</SelectItem>
              <SelectItem value="PYTHON">PYTHON</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="mb-4 text-muted-foreground">{search || filterProject !== 'all' || filterLang !== 'all' ? 'No matching snippets' : 'No snippets yet'}</p>
            {!search && filterProject === 'all' && filterLang === 'all' && <Button onClick={openCreate} variant="outline">Create your first snippet</Button>}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(snip => {
              const project = snip.projectId ? projects.find(p => p.id === snip.projectId) : null;
              return (
                <div ref={highlightId === snip.id ? highlightRef : undefined} key={snip.id} className={cn("group rounded-xl border border-border bg-card p-5 hover:border-warning/30 transition-colors cursor-pointer", highlightId === snip.id && "ring-2 ring-primary border-primary")} onClick={() => setViewSnippet(snip)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{snip.title}</h3>
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${LANG_COLORS[snip.language]}`}>{snip.language}</span>
                      {project && <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{project.name}</span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(snip.id, snip.code); }} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground" title="Copy to clipboard">
                        {copiedId === snip.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(snip); }} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(snip.id); }} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <pre className="mt-2 rounded-md bg-black/80 px-3 py-2 text-xs font-mono text-green-400 max-h-10 overflow-hidden whitespace-pre-wrap break-all">{snip.code}</pre>
                </div>
              );
            })}
          </div>
        )}

        {/* View Snippet Dialog */}
        <Dialog open={!!viewSnippet} onOpenChange={(open) => !open && setViewSnippet(null)}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{viewSnippet?.title}</DialogTitle>
                {viewSnippet && <span className={`rounded px-2 py-0.5 text-xs font-bold ${LANG_COLORS[viewSnippet.language]}`}>{viewSnippet.language}</span>}
              </div>
            </DialogHeader>
            {viewSnippet && (
              <SyntaxHighlighter
                language={viewSnippet.language.toLowerCase()}
                style={oneDark}
                customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem', margin: 0 }}
                wrapLongLines
              >
                {viewSnippet.code}
              </SyntaxHighlighter>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => viewSnippet && handleCopy(viewSnippet.id, viewSnippet.code)}>
                {copiedId === viewSnippet?.id ? <Check className="h-3.5 w-3.5 mr-1.5 text-success" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copiedId === viewSnippet?.id ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { if (viewSnippet) { openEdit(viewSnippet); setViewSnippet(null); } }}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { if (viewSnippet) { handleDelete(viewSnippet.id); setViewSnippet(null); } }}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editing ? 'Edit Snippet' : 'New Snippet'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-border" />
              <div className="grid grid-cols-2 gap-3">
                <Select value={language} onValueChange={v => setLanguage(v as SnippetLanguage)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="BASH">BASH</SelectItem>
                    <SelectItem value="YAML">YAML</SelectItem>
                    <SelectItem value="PYTHON">PYTHON</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Link to project" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Paste your code..." value={code} onChange={e => setCode(e.target.value)} rows={8} className="bg-secondary border-border font-mono text-sm" />
              <Button onClick={handleSave} className="w-full">{editing ? 'Save' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
