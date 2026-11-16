import { useCallback, useEffect, useRef, useState } from 'react';
import { parseApiError } from '../api/client.js';

/**
 * Runs `fetcher()` on mount and whenever `deps` change. Returns { data, loading, error, reload }.
 * - Old data stays visible while reloading (no flicker).
 * - Results of outdated requests are ignored.
 */
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let ignore = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef.current()
      .then((data) => { if (!ignore) setState({ data, loading: false, error: null }); })
      .catch((err) => { if (!ignore) setState((s) => ({ data: s.data, loading: false, error: parseApiError(err) })); });
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
