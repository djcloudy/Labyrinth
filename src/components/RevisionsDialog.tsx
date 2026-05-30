import { useEffect, useState } from 'react';
import { History, RotateCcw, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGetRevisions, apiRestoreRevision } from '@/lib/api';
import { cn } from '@/lib/utils';

type CollectionName = 'documents' | 'snippets' | 'tasks' | 'knowledge';

interface Revision {
  revisionId: string;
  timestamp: string;
  updatedBy?: string | null;
  source?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot: any;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: CollectionName;
  id: string | null;
  onRestored?: () => void;
}

function snapshotPreview(collection: CollectionName, snap: Record<string, unknown>): string {
  if (collection === 'snippets') return String(snap.code ?? '');
  if (collection === 'tasks') {
    const parts: string[] = [];
    if (snap.status) parts.push(`Status: ${snap.status}`);
    if (snap.priority) parts.push(`Priority: ${snap.priority}`);
    if (snap.dueDate) parts.push(`Due: ${String(snap.dueDate).slice(0, 10)}`);
    if (Array.isArray(snap.checklist)) parts.push(`Checklist: ${snap.checklist.length} items`);
    if (snap.description) parts.push(`\n${snap.description}`);
    return parts.join(' · ');
  }
  if (collection === 'knowledge') {
    return String(snap.content ?? snap.code ?? snap.description ?? snap.url ?? '');
  }
  return String(snap.content ?? '');
}

export default function RevisionsDialog({ open, onOpenChange, collection, id, onRestored }: Props) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    setLoading(true);
    setSelected(null);
    apiGetRevisions(collection, id)
      .then(r => {
        const sorted = [...r].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setRevisions(sorted);
        setSelected(sorted[0] ?? null);
      })
      .catch(() => setRevisions([]))
      .finally(() => setLoading(false));
  }, [open, collection, id]);

  const handleRestore = async () => {
    if (!id || !selected) return;
    setRestoring(true);
    try {
      await apiRestoreRevision(collection, id, selected.revisionId);
      onRestored?.();
      onOpenChange(false);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <DialogTitle>Revision history</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Previous saved versions. Restoring will snapshot the current state first.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <div className="w-72 shrink-0 border-r border-border">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
                </div>
              ) : revisions.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No prior versions yet. Edits will appear here.</p>
              ) : (
                <ul className="p-2 space-y-1">
                  {revisions.map(rev => (
                    <li key={rev.revisionId}>
                      <button
                        onClick={() => setSelected(rev)}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-left transition-colors",
                          selected?.revisionId === rev.revisionId
                            ? "bg-primary/15 text-foreground"
                            : "hover:bg-secondary text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(rev.timestamp), { addSuffix: true })}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <User className="h-2.5 w-2.5" />
                          {rev.updatedBy || rev.source || 'manual'}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            {selected ? (
              <>
                <div className="border-b border-border px-5 py-3 flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selected.snapshot?.title || 'Untitled'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(selected.timestamp).toLocaleString()} · source: {selected.source || 'manual'}
                    </p>
                  </div>
                  <Button size="sm" onClick={handleRestore} disabled={restoring} className="gap-2">
                    <RotateCcw className="h-3.5 w-3.5" />
                    {restoring ? 'Restoring...' : 'Restore this version'}
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <pre className="p-5 text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                    {snapshotPreview(collection, selected.snapshot)}
                  </pre>
                </ScrollArea>
              </>
            ) : !loading && (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a revision to preview.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
