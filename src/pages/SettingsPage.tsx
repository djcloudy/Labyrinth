import { Settings, HardDrive, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { checkApiHealth, getHealthData, isApiAvailable } from '@/lib/api';

export default function SettingsPage() {
  const [storageMode, setStorageMode] = useState<'checking' | 'disk' | 'local'>('checking');
  const [dataDir, setDataDir] = useState<string>('');

  useEffect(() => {
    checkApiHealth().then(({ available, health }) => {
      setStorageMode(available ? 'disk' : 'local');
      if (health) setDataDir(health.dataDir);
    });
  }, []);

  const handleExport = async () => {
    let data: Record<string, unknown>;
    if (isApiAvailable()) {
      const [projects, documents, snippets, media] = await Promise.all([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/documents').then(r => r.json()),
        fetch('/api/snippets').then(r => r.json()),
        fetch('/api/media').then(r => r.json()),
      ]);
      data = { projects, documents, snippets, media, exportedAt: new Date().toISOString() };
    } else {
      data = {
        projects: JSON.parse(localStorage.getItem('labyrinth_projects') || '[]'),
        documents: JSON.parse(localStorage.getItem('labyrinth_documents') || '[]'),
        snippets: JSON.parse(localStorage.getItem('labyrinth_snippets') || '[]'),
        media: JSON.parse(localStorage.getItem('labyrinth_media') || '[]'),
        exportedAt: new Date().toISOString(),
      };
    }
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
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (isApiAvailable()) {
            // For API mode, we'd need a bulk import endpoint - for now write to localStorage and reload
            if (data.projects) localStorage.setItem('labyrinth_projects', JSON.stringify(data.projects));
            if (data.documents) localStorage.setItem('labyrinth_documents', JSON.stringify(data.documents));
            if (data.snippets) localStorage.setItem('labyrinth_snippets', JSON.stringify(data.snippets));
            if (data.media) localStorage.setItem('labyrinth_media', JSON.stringify(data.media));
          } else {
            if (data.projects) localStorage.setItem('labyrinth_projects', JSON.stringify(data.projects));
            if (data.documents) localStorage.setItem('labyrinth_documents', JSON.stringify(data.documents));
            if (data.snippets) localStorage.setItem('labyrinth_snippets', JSON.stringify(data.snippets));
            if (data.media) localStorage.setItem('labyrinth_media', JSON.stringify(data.media));
          }
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
          {/* Storage Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 text-lg font-semibold text-foreground flex items-center gap-2">
              {storageMode === 'disk' ? <HardDrive className="h-5 w-5 text-success" /> : <Database className="h-5 w-5 text-info" />}
              Storage
            </h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mode</span>
                <span className={`font-semibold ${storageMode === 'disk' ? 'text-success' : storageMode === 'local' ? 'text-info' : 'text-muted-foreground'}`}>
                  {storageMode === 'checking' ? 'Checking...' : storageMode === 'disk' ? 'Persistent Disk Storage' : 'Browser localStorage'}
                </span>
              </div>
              {storageMode === 'disk' && dataDir && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Data Directory</span>
                  <code className="rounded bg-secondary px-2 py-0.5 text-xs text-foreground">{dataDir}</code>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API Server</span>
                <span className={`font-semibold ${storageMode === 'disk' ? 'text-success' : 'text-muted-foreground'}`}>
                  {storageMode === 'disk' ? 'Connected' : 'Not detected'}
                </span>
              </div>
            </div>
            {storageMode === 'local' && (
              <p className="mt-3 text-xs text-muted-foreground">
                To enable persistent disk storage, run the Express server with: <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">LABYRINTH_DATA_DIR=/path/to/data node server.js</code>
              </p>
            )}
          </div>

          {/* Data Management */}
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
