import { Bot, Sparkles } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function AIHubPage() {
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="mb-8 text-3xl font-bold text-foreground">AI Hub</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-12 w-12 text-primary" />
            <Sparkles className="h-8 w-8 text-warning" />
          </div>
          <p className="mb-2 text-foreground font-semibold text-lg">AI Hub</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Connect your AI tools and assistants here. Query your documentation, generate snippets, and get intelligent insights about your home lab infrastructure.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
