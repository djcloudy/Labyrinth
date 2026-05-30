import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, FileText, Code2, Image, Bot, Settings, ChevronRight, ListTodo, Sparkles, Activity, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCapture } from '@/hooks/use-capture';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/snippets', label: 'Snippets', icon: Code2 },
  { to: '/media', label: 'Media', icon: Image },
  { to: '/ai-hub', label: 'AI Hub', icon: Bot },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/audit', label: 'Audit', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();
  const { openCapture } = useCapture();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
          L
        </div>
        <span className="text-lg font-bold tracking-wide text-foreground">LABYRINTH</span>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={() => openCapture()}
          className="group flex w-full items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Capture
          </span>
          <kbd className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground group-hover:text-foreground">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button className="flex w-full items-center justify-center rounded-lg border border-border bg-secondary py-2.5 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
