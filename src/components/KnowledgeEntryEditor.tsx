import { useEffect, useRef, useState } from 'react';
import { BookOpen, Code2, FileText, Image as ImageIcon, Link2, Save, History, Upload, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import CodeEditor from '@/components/CodeEditor';
import RevisionsDialog from '@/components/RevisionsDialog';
import { markdownComponents } from '@/components/MarkdownCode';
import { KnowledgeEntry, KnowledgeKind, SnippetLanguage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: KnowledgeEntry | null;
  initialKind?: KnowledgeKind;
  onSave: (data: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  onRefresh?: () => void;
}

const KIND_META: Record<KnowledgeKind, { label: string; icon: typeof BookOpen }> = {
  note: { label: 'Note', icon: FileText },
  snippet: { label: 'Snippet', icon: Code2 },
  image: { label: 'Image', icon: ImageIcon },
  link: { label: 'Link', icon: Link2 },
};

export default function KnowledgeEntryEditor({ open, onOpenChange, editing, initialKind = 'note', onSave, onRefresh }: Props) {
  const [kind, setKind] = useState<KnowledgeKind>(initialKind);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<SnippetLanguage>('BASH');
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKind(editing?.kind ?? initialKind);
    setTitle(editing?.title ?? '');
    setContent(editing?.content ?? '');
    setCode(editing?.code ?? '');
    setLanguage(editing?.language ?? 'BASH');
    setUrl(editing?.url ?? '');
    setMediaType(editing?.mediaType ?? '');
    setDescription(editing?.description ?? '');
    setTagsInput((editing?.tags ?? []).join(', '));
  }, [open, editing, initialKind]);

  const tagList = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalTitle =
        title.trim() ||
        (kind === 'note' ? content.trim().split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 80) : '') ||
        (kind === 'link' ? url.slice(0, 80) : '') ||
        'Untitled';
      const base = {
        kind,
        title: finalTitle,
        tags: tagList,
        source: 'manual' as const,
      };
      const data: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'> =
        kind === 'note' ? { ...base, content }
        : kind === 'snippet' ? { ...base, code, language }
        : kind === 'image' ? { ...base, url, mediaType }
        : { ...base, url, description };
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const KindIcon = KIND_META[kind].icon;
  const isEditingKind = !!editing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('bg-card border-border flex flex-col p-0 gap-0', kind === 'note' ? 'max-w-5xl h-[85vh]' : 'max-w-2xl')}>
        <DialogHeader className="border-b border-border px-5 py-3 pr-12 shrink-0">
          <div className="flex items-center gap-3">
            <KindIcon className="h-4 w-4 text-primary shrink-0" />
            <DialogTitle className="sr-only">{editing ? 'Edit Knowledge Entry' : 'New Knowledge Entry'}</DialogTitle>
            <DialogDescription className="sr-only">General knowledge entry: note, snippet, image, or link.</DialogDescription>
            <Input
              placeholder={kind === 'link' ? 'Title (auto from URL if blank)' : 'Title'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-9 border-0 bg-transparent text-base font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              autoFocus={!editing}
            />
            {editing && (kind === 'note' || kind === 'snippet') && (
              <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} title="Revision history">
                <History className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!isEditingKind && (
              <div className="flex gap-1">
                {(Object.keys(KIND_META) as KnowledgeKind[]).map(k => {
                  const Icon = KIND_META[k].icon;
                  const active = kind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={cn(
                        'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                        active
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {KIND_META[k].label}
                    </button>
                  );
                })}
              </div>
            )}
            {kind === 'snippet' && (
              <Select value={language} onValueChange={v => setLanguage(v as SnippetLanguage)}>
                <SelectTrigger className="h-8 w-28 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="BASH">BASH</SelectItem>
                  <SelectItem value="YAML">YAML</SelectItem>
                  <SelectItem value="PYTHON">PYTHON</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              placeholder="Tags (comma separated)"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="h-8 flex-1 min-w-[160px] bg-secondary border-border text-xs"
            />
          </div>
          {tagList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tagList.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {kind === 'note' && (
            <div className="grid h-full grid-cols-1 gap-3 md:grid-cols-2 md:h-[calc(85vh-220px)]">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write markdown..."
                className="h-full min-h-[300px] w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                spellCheck={false}
              />
              <div className={cn(
                'h-full min-h-[300px] overflow-y-auto rounded-md border border-border bg-card p-3',
                'prose prose-sm prose-invert max-w-none text-foreground',
                'prose-headings:text-foreground prose-headings:font-semibold',
                'prose-p:text-muted-foreground prose-p:leading-relaxed',
                'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                'prose-strong:text-foreground',
                'prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none',
                'prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-background',
                'prose-ul:text-muted-foreground prose-ol:text-muted-foreground',
                'prose-li:marker:text-muted-foreground',
                'prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground',
                'prose-hr:border-border',
              )}>
                {content.trim()
                  ? <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>{content}</ReactMarkdown>
                  : <p className="italic text-muted-foreground">Preview will appear here.</p>}
              </div>
            </div>
          )}

          {kind === 'snippet' && (
            <CodeEditor value={code} onChange={setCode} language={language} height="380px" placeholder="Paste your code..." />
          )}

          {kind === 'image' && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              {url ? (
                <div className="relative rounded-lg border border-border overflow-hidden">
                  <img src={url} alt={title || 'preview'} className="w-full max-h-[420px] object-contain bg-background" />
                  <button
                    onClick={() => { setUrl(''); setMediaType(''); }}
                    className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background"
                    title="Remove image"
                  >
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 hover:border-primary/50 transition-colors"
                >
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select an image</p>
                </button>
              )}
              <Textarea
                placeholder="Description / context (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="bg-secondary border-border text-sm"
              />
            </div>
          )}

          {kind === 'link' && (
            <div className="space-y-3">
              <Input
                placeholder="https://..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="bg-secondary border-border"
              />
              <Textarea
                placeholder="What is this for? Why is it worth saving?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="bg-secondary border-border text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (kind === 'image' && !url) || (kind === 'link' && !url.trim())} className="gap-2">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
          </Button>
        </div>
      </DialogContent>
      <RevisionsDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        collection="knowledge"
        id={editing?.id ?? null}
        onRestored={() => { onRefresh?.(); onOpenChange(false); }}
      />
    </Dialog>
  );
}
