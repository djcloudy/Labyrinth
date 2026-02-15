import { useState, useCallback } from 'react';

export function useStore<T>(getAllFn: () => T[]) {
  const [data, setData] = useState<T[]>(getAllFn);
  const refresh = useCallback(() => setData(getAllFn()), [getAllFn]);
  return { data, refresh };
}
