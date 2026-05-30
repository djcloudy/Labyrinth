import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type CaptureCtx = {
  open: boolean;
  initialText: string;
  openCapture: (text?: string) => void;
  closeCapture: () => void;
};

const Ctx = createContext<CaptureCtx>({
  open: false,
  initialText: '',
  openCapture: () => {},
  closeCapture: () => {},
});

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialText, setInitialText] = useState('');
  const openCapture = useCallback((text = '') => { setInitialText(text); setOpen(true); }, []);
  const closeCapture = useCallback(() => setOpen(false), []);
  return <Ctx.Provider value={{ open, initialText, openCapture, closeCapture }}>{children}</Ctx.Provider>;
}

export function useCapture() {
  return useContext(Ctx);
}
