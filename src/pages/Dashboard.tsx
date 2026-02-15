import { useNavigate } from 'react-router-dom';
import { FolderKanban, FileText, Code2, Image, Bot } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { projectStore, documentStore, snippetStore, mediaStore } from '@/lib/store';
import { useStore } from '@/hooks/use-store';
import { useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: projects, loading: loadingProjects } = useStore(useCallback(() => projectStore.getAll(), []));
  const { data: documents, loading: loadingDocs } = useStore(useCallback(() => documentStore.getAll(), []));
  const { data: snippets, loading: loadingSnippets } = useStore(useCallback(() => snippetStore.getAll(), []));
  const { data: media, loading: loadingMedia } = useStore(useCallback(() => mediaStore.getAll(), []));

  const loading = loadingProjects || loadingDocs || loadingSnippets || loadingMedia;

  const stats = [
    { label: 'PROJECTS', count: projects.length, icon: FolderKanban, colorVar: 'text-primary' },
    { label: 'DOCUMENTS', count: documents.length, icon: FileText, colorVar: 'text-info' },
    { label: 'SNIPPETS', count: snippets.length, icon: Code2, colorVar: 'text-success' },
    { label: 'MEDIA', count: media.length, icon: Image, colorVar: 'text-destructive' },
  ];

  const recentProjects = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Overview</h1>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, count, icon: Icon, colorVar }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest text-muted-foreground">{label}</span>
                <Icon className={`h-5 w-5 ${colorVar}`} />
              </div>
              {loading ? <Skeleton className="h-10 w-16" /> : <p className="text-4xl font-bold text-foreground">{count}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="col-span-2 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <FolderKanban className="h-5 w-5 text-primary" />
              Recent Projects
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet. Create your first project!</p>
            ) : (
              <div className="space-y-2">
                {recentProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="text-sm font-medium text-foreground">{project.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {documents.filter(d => d.projectId === project.id).length} DOCUMENTS
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-5">
            <Bot className="mb-4 h-10 w-10 text-primary" />
            <button
              onClick={() => navigate('/ai-hub')}
              className="rounded-lg bg-primary px-8 py-3 text-sm font-bold tracking-wide text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              LAUNCH AI HUB
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
