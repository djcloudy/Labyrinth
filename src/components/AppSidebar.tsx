import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, FileText, Code2, Image, Bot, Settings, ChevronRight, ChevronLeft, ListTodo, Sparkles, Activity, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCapture } from '@/hooks/use-capture';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center gap-3 py-6', collapsed ? 'justify-center px-2' : 'px-5')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
          L
        </div>
        {!collapsed && <span className="text-lg font-bold tracking-wide text-foreground">LABYRINTH</span>}
      </div>

      <div className={cn('pb-3', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => openCapture()}
                className="flex w-full items-center justify-center rounded-lg border border-primary/30 bg-primary/10 py-2 text-primary transition-all hover:bg-primary/20"
                aria-label="Capture"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Capture (⌘K)</TooltipContent>
          </Tooltip>
        ) : (
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
        )}
      </div>

      <nav className={cn('flex-1 space-y-1 py-2', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          const linkEl = (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-all',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground'
              )}
              aria-label={label}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && label}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={to}>
              <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ) : linkEl;
        })}
      </nav>

      <div className={cn('border-t border-border', collapsed ? 'p-2' : 'p-3')}>
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className="flex w-full items-center justify-center rounded-lg border border-border bg-secondary py-2.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
