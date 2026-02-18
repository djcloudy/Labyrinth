import { useState, useCallback, useMemo } from 'react';
import { FileText, Code, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/hooks/use-store';
import { documentStore, snippetStore, projectStore } from '@/lib/store';
import type { Document, Snippet, Project } from '@/lib/types';

export interface Attachment {
  type: 'document' | 'snippet';
  id: string;
  title: string;
}

interface AttachContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Attachment[];
  onSelectionChange: (attachments: Attachment[]) => void;
}

export default function AttachContextDialog({ open, onOpenChange, selected, onSelectionChange }: AttachContextDialogProps) {
  const { data: documents } = useStore<Document>(useCallback(() => documentStore.getAll(), []));
  const { data: snippets } = useStore<Snippet>(useCallback(() => snippetStore.getAll(), []));
  const { data: projects } = useStore<Project>(useCallback(() => projectStore.getAll(), []));

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  const filterItems = <T extends { title: string; projectId: string | null }>(items: T[]) => {
    return items.filter(item => {
      const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
      const matchesProject = projectFilter === 'all'
        || (projectFilter === 'none' && !item.projectId)
        || item.projectId === projectFilter;
      return matchesSearch && matchesProject;
    });
  };

  const filteredDocs = useMemo(() => filterItems(documents), [documents, search, projectFilter]);
  const filteredSnippets = useMemo(() => filterItems(snippets), [snippets, search, projectFilter]);

  const isSelected = (type: Attachment['type'], id: string) =>
    selected.some(a => a.type === type && a.id === id);

  const toggle = (type: Attachment['type'], id: string, title: string) => {
    if (isSelected(type, id)) {
      onSelectionChange(selected.filter(a => !(a.type === type && a.id === id)));
    } else {
      onSelectionChange([...selected, { type, id, title }]);
    }
  };

  const projectBadge = (projectId: string | null) => {
    if (!projectId) return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Unlinked</Badge>;
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{projectMap[projectId] || 'Unknown'}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Attach Context</DialogTitle>
          <DialogDescription>Select documents and snippets to include as context in your message.</DialogDescription>
        </DialogHeader>

        {/* Search and project filter */}
        <div className="flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-secondary border-border"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40 h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-[60]">
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="none">Unlinked</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="documents" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="documents" className="flex-1 gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Documents ({filteredDocs.length})
            </TabsTrigger>
            <TabsTrigger value="snippets" className="flex-1 gap-1.5">
              <Code className="h-3.5 w-3.5" /> Snippets ({filteredSnippets.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="documents" className="flex-1 min-h-0">
            <ScrollArea className="h-52">
              {filteredDocs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {documents.length === 0 ? 'No documents yet.' : 'No matching documents.'}
                </p>
              ) : (
                <div className="space-y-1 pr-3">
                  {filteredDocs.map(doc => (
                    <label
                      key={doc.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={isSelected('document', doc.id)}
                        onCheckedChange={() => toggle('document', doc.id, doc.title)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                          {projectBadge(doc.projectId)}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {doc.content?.slice(0, 80)}…
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="snippets" className="flex-1 min-h-0">
            <ScrollArea className="h-52">
              {filteredSnippets.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {snippets.length === 0 ? 'No snippets yet.' : 'No matching snippets.'}
                </p>
              ) : (
                <div className="space-y-1 pr-3">
                  {filteredSnippets.map(snip => (
                    <label
                      key={snip.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={isSelected('snippet', snip.id)}
                        onCheckedChange={() => toggle('snippet', snip.id, snip.title)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{snip.title}</p>
                          {projectBadge(snip.projectId)}
                        </div>
                        <p className="text-xs text-muted-foreground">{snip.language}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <div className="flex justify-between items-center pt-2 shrink-0">
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
