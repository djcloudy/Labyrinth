import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Code2, ListTodo, Sparkles, FolderKanban, Image, Bot, Settings, LayoutDashboard } from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { useCapture } from '@/hooks/use-capture';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { openCapture } = useCapture();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const go = (path: string) => { setOpen(false); navigate(path); };
  const capture = () => { setOpen(false); openCapture(); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={capture}><Sparkles className="mr-2 h-4 w-4" /> Capture new item...</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go('/')}><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go('/projects')}><FolderKanban className="mr-2 h-4 w-4" /> Projects</CommandItem>
          <CommandItem onSelect={() => go('/tasks')}><ListTodo className="mr-2 h-4 w-4" /> Tasks</CommandItem>
          <CommandItem onSelect={() => go('/documents')}><FileText className="mr-2 h-4 w-4" /> Documents</CommandItem>
          <CommandItem onSelect={() => go('/snippets')}><Code2 className="mr-2 h-4 w-4" /> Snippets</CommandItem>
          <CommandItem onSelect={() => go('/media')}><Image className="mr-2 h-4 w-4" /> Media</CommandItem>
          <CommandItem onSelect={() => go('/ai-hub')}><Bot className="mr-2 h-4 w-4" /> AI Hub</CommandItem>
          <CommandItem onSelect={() => go('/settings')}><Settings className="mr-2 h-4 w-4" /> Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
