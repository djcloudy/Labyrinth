import { useEffect, useState } from 'react';

const KEY = 'labyrinth_sidebar_collapsed';
const EVENT = 'labyrinth:sidebar-collapsed-change';

export function useSidebarCollapsed(): [boolean, (v: boolean | ((p: boolean) => boolean)) => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(KEY) === '1';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsedState(detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const setCollapsed = (v: boolean | ((p: boolean) => boolean)) => {
    setCollapsedState(prev => {
      const next = typeof v === 'function' ? (v as (p: boolean) => boolean)(prev) : v;
      localStorage.setItem(KEY, next ? '1' : '0');
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
      return next;
    });
  };

  return [collapsed, setCollapsed];
}
