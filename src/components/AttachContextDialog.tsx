import { useState, useCallback } from 'react';
import { FileText, Code, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from '@/hooks/use-store';
import { documentStore, snippetStore } from '@/lib/store';
import type { Document, Snippet } from '@/lib/types';

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

  const isSelected = (type: Attachment['type'], id: string) =>
    selected.some(a => a.type === type && a.id === id);

  const toggle = (type: Attachment['type'], id: string, title: string) => {
    if (isSelected(type, id)) {
      onSelectionChange(selected.filter(a => !(a.type === type && a.id === id)));
    } else {
      onSelectionChange([...selected, { type, id, title }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Context</DialogTitle>
          <DialogDescription>Select documents and snippets to include as context in your message.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="documents" className="flex-1 gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Documents
            </TabsTrigger>
            <TabsTrigger value="snippets" className="flex-1 gap-1.5">
              <Code className="h-3.5 w-3.5" /> Snippets
            </TabsTrigger>
          </TabsList>
          <TabsContent value="documents">
            <ScrollArea className="h-60">
              {documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No documents yet.</p>
              ) : (
                <div className="space-y-1 pr-3">
                  {documents.map(doc => (
                    <label
                      key={doc.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={isSelected('document', doc.id)}
                        onCheckedChange={() => toggle('document', doc.id, doc.title)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
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
          <TabsContent value="snippets">
            <ScrollArea className="h-60">
              {snippets.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No snippets yet.</p>
              ) : (
                <div className="space-y-1 pr-3">
                  {snippets.map(snip => (
                    <label
                      key={snip.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={isSelected('snippet', snip.id)}
                        onCheckedChange={() => toggle('snippet', snip.id, snip.title)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{snip.title}</p>
                        <p className="text-xs text-muted-foreground">{snip.language}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
