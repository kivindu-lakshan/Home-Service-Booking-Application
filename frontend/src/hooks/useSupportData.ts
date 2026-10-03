import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supportError } from "@/api/support";
export function useSupportData<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setExpired(false); setData(null);
    try { const result = await loader(controller.signal); if (!controller.signal.aborted) setData(result); }
    catch (failure) { if (!controller.signal.aborted) { const details = supportError(failure); setError(details.message); setExpired(details.expired); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [loader]);
  useFocusEffect(useCallback(() => {
    if (authLoading || !user || user.role !== "customer") return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [authLoading, user, load]));
  return { user, authLoading, data, loading: authLoading || loading, error, expired, load };
}
