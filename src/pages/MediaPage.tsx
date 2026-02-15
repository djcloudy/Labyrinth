import { Image } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function MediaPage() {
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Media</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Image className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-muted-foreground">Media management coming soon</p>
          <p className="text-sm text-muted-foreground">Upload screenshots, diagrams, and other files linked to your projects.</p>
        </div>
      </div>
    </AppLayout>
  );
}
