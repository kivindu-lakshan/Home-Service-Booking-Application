import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { catalogueError } from '@/api/catalogue';
export function useCatalogueData<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async (refresh = false) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setRefreshing(refresh); setLoading(!refresh); setError('');
    if (!refresh) setData(null);
    try { const result = await loader(controller.signal); if (!controller.signal.aborted) setData(result); }
    catch (e) { if (!controller.signal.aborted) setError(catalogueError(e)); }
    finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [loader]);
  useFocusEffect(useCallback(() => {
    if (authLoading || user?.role !== 'customer') return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [authLoading, user, load]));
  return { user, authLoading, data, loading: authLoading || loading, refreshing, error, load };
}
