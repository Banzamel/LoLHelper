// The result of an async call that depends on `key` (a JSON-serializable query): recomputed
// when the key changes, the last result kept while the next one loads, stale results dropped.
import { useEffect, useRef, useState } from 'react';

export function useAsync<T>(load: () => Promise<T>, key: unknown): { value: T | undefined; error: unknown } {
  const [state, setState] = useState<{ value: T | undefined; error: unknown }>({ value: undefined, error: null });
  const serialized = JSON.stringify(key);
  const latest = useRef(serialized);
  latest.current = serialized;
  useEffect(() => {
    let current = true;
    load().then(
      (value) => { if (current && latest.current === serialized) setState({ value, error: null }); },
      (error) => { if (current) setState((s) => ({ ...s, error })); },
    );
    return () => { current = false; };
    // The serialized key stands for everything `load` reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
  return state;
}
