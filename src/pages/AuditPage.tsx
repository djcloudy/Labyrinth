import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, Search, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGetAudit } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AuditRow {
  id: string;
  timestamp: string;
  action: string;
  collection: string;
  source: string;
  title?: string;
  type?: string;
}

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-success/15 text-success',
  capture: 'bg-primary/15 text-primary',
  update: 'bg-info/15 text-info',
  delete: 'bg-destructive/15 text-destructive',
};

const COLLECTION_LINK: Record<string, (id: string) => string> = {
  documents: id => `/documents?doc=${id}`,
  snippets: id => `/snippets?snippet=${id}`,
  tasks: id => `/tasks?task=${id}`,
  projects: id => `/projects/${id}`,
  media: id => `/media?item=${id}`,
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterCollection, setFilterCollection] = useState<string>('all');

  const load = () => {
    setLoading(true);
    apiGetAudit()
      .then(r => setRows([...r].sort((a, b) => b.timestamp.localeCompare(a.timestamp))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const sources = useMemo(() => Array.from(new Set(rows.map(r => r.source))).sort(), [rows]);

  const filtered = rows.filter(r => {
    if (filterAction !== 'all' && r.action !== filterAction) return false;
    if (filterSource !== 'all' && r.source !== filterSource) return false;
    if (filterCollection !== 'all' && r.collection !== filterCollection) return false;
    const q = search.toLowerCase();
    return !q || (r.title || '').toLowerCase().includes(q) || r.id.includes(q);
  });

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Audit trail
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every assistant- or API-initiated change to your lab data.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by title or id..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary border-border pl-9" />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="capture">capture</SelectItem>
              <SelectItem value="create">create</SelectItem>
              <SelectItem value="update">update</SelectItem>
              <SelectItem value="delete">delete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCollection} onValueChange={setFilterCollection}>
            <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All collections</SelectItem>
              <SelectItem value="documents">documents</SelectItem>
              <SelectItem value="snippets">snippets</SelectItem>
              <SelectItem value="tasks">tasks</SelectItem>
              <SelectItem value="projects">projects</SelectItem>
              <SelectItem value="media">media</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All sources</SelectItem>
              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="text-muted-foreground">
              {rows.length === 0 ? 'No assistant or API activity yet.' : 'No entries match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">When</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Collection</th>
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const linkFn = COLLECTION_LINK[r.collection];
                  return (
                    <tr key={`${r.id}-${r.timestamp}`} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" title={new Date(r.timestamp).toLocaleString()}>
                        {formatDistanceToNow(new Date(r.timestamp), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', ACTION_STYLES[r.action] || 'bg-secondary text-muted-foreground')}>
                          {r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.collection}{r.type ? ` · ${r.type}` : ''}</td>
                      <td className="px-4 py-3 text-foreground truncate max-w-[320px]">{r.title || <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.source}</td>
                      <td className="px-4 py-3 text-right">
                        {linkFn && r.action !== 'delete' && (
                          <Link to={linkFn(r.id)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            Open <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
