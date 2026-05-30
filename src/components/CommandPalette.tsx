import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Code2, ListTodo, Sparkles, FolderKanban, Image, Bot, Settings, LayoutDashboard, Activity, BookOpen, Link2, Image as ImageIcon } from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { useCapture } from '@/hooks/use-capture';
import { apiGetAll } from '@/lib/api';
import type { Document, Snippet, Task, Project, KnowledgeEntry } from '@/lib/types';

interface SearchIndex {
  documents: Document[];
  snippets: Snippet[];
  tasks: Task[];
  projects: Project[];
  knowledge: KnowledgeEntry[];
}

const EMPTY: SearchIndex = { documents: [], snippets: [], tasks: [], projects: [], knowledge: [] };

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchIndex>(EMPTY);
  const navigate = useNavigate();
  const { openCapture } = useCapture();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Refresh search index whenever palette opens
  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiGetAll<Document>('documents').catch(() => []),
      apiGetAll<Snippet>('snippets').catch(() => []),
      apiGetAll<Task>('tasks').catch(() => []),
      apiGetAll<Project>('projects').catch(() => []),
      apiGetAll<KnowledgeEntry>('knowledge').catch(() => []),
    ]).then(([documents, snippets, tasks, projects, knowledge]) => {
      setIndex({ documents, snippets, tasks, projects, knowledge });
    });
  }, [open]);

  const go = (path: string) => { setOpen(false); setQuery(''); navigate(path); };
  const capture = () => { setOpen(false); setQuery(''); openCapture(); };

  const q = query.trim().toLowerCase();
  const hasQuery = q.length >= 2;

  const results = useMemo(() => {
    if (!hasQuery) return null;
    const match = (...fields: Array<string | undefined>) =>
      fields.some(f => f && f.toLowerCase().includes(q));
    return {
      projects: index.projects.filter(p => match(p.name, p.description)).slice(0, 5),
      documents: index.documents.filter(d => match(d.title, d.content)).slice(0, 8),
      snippets: index.snippets.filter(s => match(s.title, s.code, s.language)).slice(0, 8),
      tasks: index.tasks.filter(t => match(t.title, t.description, ...(t.tags || []))).slice(0, 8),
      knowledge: index.knowledge.filter(k => match(k.title, k.content, k.code, k.description, k.url, ...(k.tags || []))).slice(0, 8),
    };
  }, [hasQuery, q, index]);

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}>
      <CommandInput
        placeholder="Search docs, snippets, tasks, or type a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {!hasQuery && (
          <>
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={capture}><Sparkles className="mr-2 h-4 w-4" /> Capture new item...</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go('/')}><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</CommandItem>
              <CommandItem onSelect={() => go('/projects')}><FolderKanban className="mr-2 h-4 w-4" /> Projects</CommandItem>
              <CommandItem onSelect={() => go('/tasks')}><ListTodo className="mr-2 h-4 w-4" /> Tasks</CommandItem>
              <CommandItem onSelect={() => go('/documents')}><FileText className="mr-2 h-4 w-4" /> Documents</CommandItem>
              <CommandItem onSelect={() => go('/snippets')}><Code2 className="mr-2 h-4 w-4" /> Snippets</CommandItem>
              <CommandItem onSelect={() => go('/media')}><Image className="mr-2 h-4 w-4" /> Media</CommandItem>
              <CommandItem onSelect={() => go('/ai-hub')}><Bot className="mr-2 h-4 w-4" /> AI Hub</CommandItem>
              <CommandItem onSelect={() => go('/audit')}><Activity className="mr-2 h-4 w-4" /> Audit trail</CommandItem>
              <CommandItem onSelect={() => go('/settings')}><Settings className="mr-2 h-4 w-4" /> Settings</CommandItem>
            </CommandGroup>
          </>
        )}

        {hasQuery && results && (
          <>
            {results.projects.length > 0 && (
              <CommandGroup heading="Projects">
                {results.projects.map(p => (
                  <CommandItem key={p.id} value={`project-${p.id}-${p.name}`} onSelect={() => go(`/projects/${p.id}`)}>
                    <FolderKanban className="mr-2 h-4 w-4 text-primary" />
                    <span className="truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.documents.length > 0 && (
              <CommandGroup heading="Documents">
                {results.documents.map(d => (
                  <CommandItem key={d.id} value={`doc-${d.id}-${d.title}`} onSelect={() => go(`/documents?doc=${d.id}`)}>
                    <FileText className="mr-2 h-4 w-4 text-info" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{d.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{d.content?.slice(0, 80)}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.snippets.length > 0 && (
              <CommandGroup heading="Snippets">
                {results.snippets.map(s => (
                  <CommandItem key={s.id} value={`snip-${s.id}-${s.title}`} onSelect={() => go(`/snippets?snippet=${s.id}`)}>
                    <Code2 className="mr-2 h-4 w-4 text-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{s.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{s.language} · {s.code?.slice(0, 60)}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.tasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {results.tasks.map(t => (
                  <CommandItem key={t.id} value={`task-${t.id}-${t.title}`} onSelect={() => go(`/tasks?task=${t.id}`)}>
                    <ListTodo className="mr-2 h-4 w-4 text-success" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{t.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{t.status} · {t.priority}{t.dueDate ? ` · due ${t.dueDate.slice(0,10)}` : ''}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
