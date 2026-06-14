import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed] = useSidebarCollapsed();
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className={cn('flex-1 p-8 transition-[margin] duration-200', collapsed ? 'ml-16' : 'ml-60')}>
        {children}
      </main>
    </div>
  );
}
