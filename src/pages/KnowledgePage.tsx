import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, ChevronDown, BookOpen, FileText, Code2,
  Image as ImageIcon, Link2, ExternalLink, X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import AppLayout from '@/components/AppLayout';
import KnowledgeEntryEditor from '@/components/KnowledgeEntryEditor';
import { markdownComponents } from '@/components/MarkdownCode';
import { copyWithToast } from '@/lib/clipboard';
import { knowledgeStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { KnowledgeEntry, KnowledgeKind } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type KindFilter = 'all' | KnowledgeKind;

const KIND_META: Record<KnowledgeKind, { label: string; icon: typeof BookOpen; color: string }> = {
  note: { label: 'Notes', icon: FileText, color: 'text-info' },
  snippet: { label: 'Snippets', icon: Code2, color: 'text-warning' },
  image: { label: 'Images', icon: ImageIcon, color: 'text-destructive' },
  link: { label: 'Links', icon: Link2, color: 'text-success' },
};

export default function KnowledgePage() {
  const { data: entries, loading, refresh } = useStore(useCallback(() => knowledgeStore.getAll(), []));
  const [searchParams, setSearchParams] = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [newKind, setNewKind] = useState<KnowledgeKind>('note');

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>((searchParams.get('kind') as KindFilter) || 'all');
  const [activeTags, setActiveTags] = useState<string[]>(searchParams.get('tag') ? [searchParams.get('tag')!] : []);
  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get('entry'));
  const [viewImage, setViewImage] = useState<KnowledgeEntry | null>(null);

  // Sync URL → state for deep links
  useEffect(() => {
    const entryId = searchParams.get('entry');
    if (entryId) setExpandedId(entryId);
  }, [searchParams]);

  const openCreate = (kind: KnowledgeKind) => {
    setEditing(null);
    setNewKind(kind);
    setDialogOpen(true);
  };

  const openEdit = (e: React.MouseEvent, entry: KnowledgeEntry) => {
    e.stopPropagation();
    setEditing(entry);
    setDialogOpen(true);
  };

  const handleSave = async (data: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) await knowledgeStore.update(editing.id, data);
    else await knowledgeStore.create(data);
    refresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await knowledgeStore.delete(id);
    refresh();
  };

  const toggleTag = (tag: string, multi: boolean) => {
    setActiveTags(prev =>
      multi
        ? (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
        : (prev.length === 1 && prev[0] === tag ? [] : [tag])
    );
  };

  const clearFilters = () => { setActiveTags([]); setKindFilter('all'); setSearch(''); };

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    entries
      .filter(e => kindFilter === 'all' || e.kind === kindFilter)
      .forEach(e => (e.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [entries, kindFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter(e => kindFilter === 'all' || e.kind === kindFilter)
      .filter(e => activeTags.length === 0 || activeTags.every(t => (e.tags || []).includes(t)))
      .filter(e => {
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          (e.content || '').toLowerCase().includes(q) ||
          (e.code || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q) ||
          (e.url || '').toLowerCase().includes(q) ||
          (e.tags || []).some(t => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [entries, kindFilter, activeTags, search]);

  const setKind = (k: KindFilter) => {
    setKindFilter(k);
    const next = new URLSearchParams(searchParams);
    if (k === 'all') next.delete('kind'); else next.set('kind', k);
    setSearchParams(next, { replace: true });
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {(Object.keys(KIND_META) as KnowledgeKind[]).map(k => {
                const Icon = KIND_META[k].icon;
                return (
                  <DropdownMenuItem key={k} onClick={() => openCreate(k)} className="gap-2">
                    <Icon className={cn('h-4 w-4', KIND_META[k].color)} />
                    {KIND_META[k].label.replace(/s$/, '')}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          General how-tos, troubleshooting notes, cheat sheets, snippets, and reference links — not tied to any specific project.
        </p>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, content, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-secondary border-border pl-9"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(['all', 'note', 'snippet', 'image', 'link'] as KindFilter[]).map(k => {
            const active = kindFilter === k;
            const label = k === 'all' ? 'All' : KIND_META[k as KnowledgeKind].label;
            const Icon = k === 'all' ? BookOpen : KIND_META[k as KnowledgeKind].icon;
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
        </div>

        {tagCounts.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Tags:</span>
            {tagCounts.map(([tag, count]) => {
              const active = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={(e) => toggleTag(tag, e.metaKey || e.ctrlKey)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                    active
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                  title={active ? 'Click to remove · ⌘-click to multi-select' : 'Click to filter · ⌘-click to add'}
                >
                  {tag} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
            {(activeTags.length > 0 || search || kindFilter !== 'all') && (
              <button onClick={clearFilters} className="ml-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <BookOpen className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              {entries.length === 0 ? 'No knowledge entries yet' : 'No matching entries'}
            </p>
            {entries.length === 0 && (
              <Button onClick={() => openCreate('note')} variant="outline">Create your first entry</Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(entry => (
              <KnowledgeRow
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
                onEdit={(e) => openEdit(e, entry)}
                onDelete={(e) => handleDelete(e, entry.id)}
                onOpenImage={() => setViewImage(entry)}
                onTagClick={(tag, multi) => toggleTag(tag, multi)}
              />
            ))}
          </div>
        )}

        <KnowledgeEntryEditor
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          initialKind={newKind}
          onSave={handleSave}
          onRefresh={refresh}
        />

        <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
          <DialogContent className="bg-card border-border max-w-4xl">
            {viewImage && (
              <>
                <DialogHeader><DialogTitle>{viewImage.title}</DialogTitle></DialogHeader>
                <img src={viewImage.url} alt={viewImage.title} className="w-full rounded-lg" />
                {viewImage.description && (
                  <p className="text-sm text-muted-foreground">{viewImage.description}</p>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

interface RowProps {
  entry: KnowledgeEntry;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onOpenImage: () => void;
  onTagClick: (tag: string, multi: boolean) => void;
}

function KnowledgeRow({ entry, expanded, onToggle, onEdit, onDelete, onOpenImage, onTagClick }: RowProps) {
  const meta = KIND_META[entry.kind];
  const KindIcon = meta.icon;

  const handleHeaderClick = () => {
    if (entry.kind === 'image') { onOpenImage(); return; }
    if (entry.kind === 'link' && entry.url) { window.open(entry.url, '_blank', 'noopener,noreferrer'); return; }
    onToggle();
  };

  return (
    <div className="group rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
      <button onClick={handleHeaderClick} className="flex w-full items-start gap-4 p-5 text-left">
        <KindIcon className={cn('mt-0.5 h-5 w-5 shrink-0', meta.color)} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            {entry.title}
            {entry.kind === 'link' && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
          </h3>
          {!expanded && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {entry.kind === 'note' && (entry.content || 'Empty')}
              {entry.kind === 'snippet' && (entry.code || 'Empty').split('\n').slice(0, 2).join(' ')}
              {entry.kind === 'image' && (entry.description || entry.mediaType || 'Image')}
              {entry.kind === 'link' && (entry.description || entry.url)}
            </p>
          )}
          {(entry.tags || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.tags.map(t => (
                <span
                  key={t}
                  onClick={(e) => { e.stopPropagation(); onTagClick(t, e.metaKey || e.ctrlKey); }}
                  className="cursor-pointer rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="ml-2 flex items-center gap-1">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span onClick={onEdit} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer">
              <Pencil className="h-3.5 w-3.5" />
            </span>
            <span onClick={onDelete} className="rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" />
            </span>
          </div>
          {(entry.kind === 'note' || entry.kind === 'snippet') && (
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')} />
          )}
        </div>
      </button>

      {expanded && entry.kind === 'note' && (
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
            prose-hr:border-border">
            {entry.content
              ? <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>{entry.content}</ReactMarkdown>
              : <p className="italic text-muted-foreground">Empty note</p>}
          </div>
        </div>
      )}

      {expanded && entry.kind === 'snippet' && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-2 text-[11px] text-muted-foreground">
            <span>{entry.language || 'BASH'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); copyWithToast(entry.code || '', 'Code copied'); }}
              className="rounded px-2 py-0.5 hover:bg-secondary hover:text-foreground"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto bg-background px-5 py-4 font-mono text-xs text-foreground whitespace-pre">
            <code>{entry.code || ''}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
