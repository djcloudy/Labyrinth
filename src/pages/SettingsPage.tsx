import { Settings } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { projectStore, documentStore, snippetStore, mediaStore } from '@/lib/store';

export default function SettingsPage() {
  const handleExport = () => {
    const data = {
      projects: projectStore.getAll(),
      documents: documentStore.getAll(),
      snippets: snippetStore.getAll(),
      media: mediaStore.getAll(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labyrinth-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.projects) localStorage.setItem('labyrinth_projects', JSON.stringify(data.projects));
          if (data.documents) localStorage.setItem('labyrinth_documents', JSON.stringify(data.documents));
          if (data.snippets) localStorage.setItem('labyrinth_snippets', JSON.stringify(data.snippets));
          if (data.media) localStorage.setItem('labyrinth_media', JSON.stringify(data.media));
          window.location.reload();
        } catch { alert('Invalid backup file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      localStorage.removeItem('labyrinth_projects');
      localStorage.removeItem('labyrinth_documents');
      localStorage.removeItem('labyrinth_snippets');
      localStorage.removeItem('labyrinth_media');
      window.location.reload();
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Settings</h1>

        <div className="max-w-xl space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 text-lg font-semibold text-foreground">Data Management</h2>
            <p className="mb-4 text-sm text-muted-foreground">Export or import your data as JSON backup files.</p>
            <div className="flex gap-3">
              <Button onClick={handleExport} variant="outline">Export Data</Button>
              <Button onClick={handleImport} variant="outline">Import Data</Button>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-card p-6">
            <h2 className="mb-1 text-lg font-semibold text-destructive">Danger Zone</h2>
            <p className="mb-4 text-sm text-muted-foreground">Permanently delete all data from local storage.</p>
            <Button onClick={handleClear} variant="destructive">Clear All Data</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
