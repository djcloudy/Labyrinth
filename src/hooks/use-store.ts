import { useState, useEffect, useCallback } from 'react';

export function useStore<T>(getAllFn: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllFn();
      setData(result);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [getAllFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
