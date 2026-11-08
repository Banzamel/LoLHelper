// Component state that survives navigating away and back (kept in the ViewMemory service).
import { useState } from 'react';
import { ViewMemory } from '../lib/Navigator.ts';
import { useService } from './services.tsx';

export function useViewState<T>(key: string, initial: T): [T, (value: T) => void] {
  const memory = useService(ViewMemory);
  const [value, setValue] = useState<T>(() => memory.get(key, initial));
  const update = (next: T) => {
    memory.set(key, next);
    setValue(next);
  };
  return [value, update];
}
