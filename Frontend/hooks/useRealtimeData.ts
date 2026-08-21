import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

// Global In-Memory Cache Store for instant 0ms retrieval across component mounts
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * Invalidate a specific cache key or broadcast an event to refresh data across all views
 */
export function invalidateCache(cacheKeyOrEvent?: string) {
  if (cacheKeyOrEvent) {
    memoryCache.delete(cacheKeyOrEvent);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(cacheKeyOrEvent));
    }
  }
}

/**
 * Mutate a specific cache key with new data optimistically and broadcast
 */
export function mutateCache<T>(cacheKey: string, newData: T) {
  memoryCache.set(cacheKey, {
    data: newData,
    timestamp: Date.now()
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(cacheKey));
  }
}

/**
 * Clear all cached data (used upon Logout or Login of a different user)
 */
export function clearAllLmsCaches() {
  memoryCache.clear();
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('lms_cache_'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

/**
 * SWR (Stale-While-Revalidate) Realtime Data Hook
 * - Instant 0-second render from memory cache if available
 * - Background auto-sync with MySQL database
 * - Event-driven auto-invalidation on create/edit/delete
 */
export function useRealtimeData<T>(
  fetchData: () => Promise<T>,
  refreshInterval = 4000,
  deps: readonly unknown[] = [],
  eventName?: string,
  customCacheKey?: string
) {
  const depsKey = useMemo(() => JSON.stringify(deps), [deps]);
  const cacheKey = customCacheKey || eventName || (deps.length > 0 ? `lms_${depsKey}` : null);

  // Initialize from cache if available for instant 0ms rendering
  const cachedEntry = cacheKey ? memoryCache.get(cacheKey) : undefined;

  const [data, setData] = useState<T | null>(cachedEntry ? (cachedEntry.data as T) : null);
  const [loading, setLoading] = useState<boolean>(!cachedEntry);
  const [error, setError] = useState<Error | null>(null);
  const fetchDataRef = useRef(fetchData);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  const load = useCallback(async (showLoading = false) => {
    // Only show loading spinner if we don't have any cached data to display
    if (showLoading && !data && !cachedEntry) {
      setLoading(true);
    }

    try {
      const result = await fetchDataRef.current();
      setData(result);
      setError(null);

      // Update cache
      if (cacheKey && result !== null && result !== undefined) {
        memoryCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [cacheKey, data, cachedEntry]);

  // Initial fetch on mount or deps change
  useEffect(() => {
    // If we have cached data, revalidate in background without blocking UI
    const hasCache = cacheKey && memoryCache.has(cacheKey);
    void load(!hasCache);
  }, [load, depsKey, cacheKey]);

  // Periodic background refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        void load(false);
      }
    }, refreshInterval);

    return () => window.clearInterval(intervalId);
  }, [load, refreshInterval, depsKey]);

  // Listen to mutation event for instant sync
  useEffect(() => {
    if (!eventName || typeof window === 'undefined') return;
    const handler = () => void load(false);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { data, loading, error, refresh };
}
