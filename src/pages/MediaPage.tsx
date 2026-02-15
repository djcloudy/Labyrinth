import { useState, useCallback, useEffect, useRef } from 'react';
import { Image, Plus, Trash2, Upload, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { mediaStore, projectStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { MediaItem, Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function MediaPage() {
  const { data: media, loading, refresh } = useStore(useCallback(() => mediaStore.getAll(), []));
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { projectStore.getAll().then(setProjects); }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewImage, setViewImage] = useState<MediaItem | null>(null);

  const openUpload = () => {
    setTitle('');
    setProjectId('none');
    setPreview(null);
    setFileData(null);
    setFileType('');
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileType(file.type);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setFileData(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!fileData || !title.trim()) return;
    const pid = projectId === 'none' ? null : projectId;
    await mediaStore.create({ title, url: fileData, type: fileType, projectId: pid });
    setDialogOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await mediaStore.delete(id);
    if (viewImage?.id === id) setViewImage(null);
    refresh();
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Media</h1>
          <Button onClick={openUpload} className="gap-2"><Plus className="h-4 w-4" /> Upload</Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="aspect-video w-full rounded-xl" />)}</div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <Image className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-muted-foreground">No media yet</p>
            <Button onClick={openUpload} variant="outline">Upload your first screenshot</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.map(item => {
              const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;
              return (
                <div key={item.id} className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
                  <button onClick={() => setViewImage(item)} className="block w-full">
                    <div className="aspect-video bg-background flex items-center justify-center overflow-hidden">
                      {item.type.startsWith('image/') ? (
                        <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <Image className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <button onClick={() => handleDelete(item.id)} className="rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {project && <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{project.name}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Upload Media</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {preview ? (
                <div className="relative rounded-lg border border-border overflow-hidden">
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-contain bg-background" />
                  <button onClick={() => { setPreview(null); setFileData(null); }} className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background">
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-10 hover:border-primary/50 transition-colors"
                >
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select an image</p>
                </button>
              )}
              <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-border" />
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} disabled={!fileData || !title.trim()} className="w-full">Upload</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lightbox dialog */}
        <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
          <DialogContent className="bg-card border-border max-w-3xl">
            {viewImage && (
              <>
                <DialogHeader><DialogTitle>{viewImage.title}</DialogTitle></DialogHeader>
                <img src={viewImage.url} alt={viewImage.title} className="w-full rounded-lg" />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
