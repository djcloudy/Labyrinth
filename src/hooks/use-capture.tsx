import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type CaptureCtx = {
  open: boolean;
  initialText: string;
  openCapture: (text?: string) => void;
  closeCapture: () => void;
};

const Ctx = createContext<CaptureCtx | null>(null);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialText, setInitialText] = useState('');
  const openCapture = useCallback((text = '') => { setInitialText(text); setOpen(true); }, []);
  const closeCapture = useCallback(() => setOpen(false), []);
  return <Ctx.Provider value={{ open, initialText, openCapture, closeCapture }}>{children}</Ctx.Provider>;
}

export function useCapture() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCapture must be used inside CaptureProvider');
  return c;
}
