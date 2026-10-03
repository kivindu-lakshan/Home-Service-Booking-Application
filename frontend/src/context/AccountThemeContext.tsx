import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { usePathname } from "expo-router";
import { isAxiosError } from "axios";
import { useAuth } from "./AuthContext";
import { getAppearance, saveAppearance, type ThemeMode } from "@/api/appearance";
import { accountRoute, darkStyle } from "@/theme/account-palette";
type State = { owner: string; mode: ThemeMode; loading: boolean; error: string; saving: boolean };
const Context = createContext({ mode: "light" as ThemeMode, loading: true, saving: false, error: "", preview: (_mode: ThemeMode) => {}, save: async () => false, reload: () => {} });
export function AccountThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const id = user?.id;
  const path = usePathname();
  const [state, setState] = useState<State>({ owner: "", mode: "light", loading: true, error: "", saving: false });
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    if (!id || authLoading) return () => controller.abort();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setState({ owner: id, mode: "light", loading: true, error: "", saving: false });
      try { const mode = await getAppearance(controller.signal); if (!controller.signal.aborted) setState({ owner: id, mode, loading: false, error: "", saving: false }); }
      catch { if (!controller.signal.aborted) setState({ owner: id, mode: "light", loading: false, error: "Unable to load appearance. Check your connection and retry.", saving: false }); }
    });
    return () => controller.abort();
  }, [id, authLoading, revision]);
  const preview = (mode: ThemeMode) => { if (!lock.current && id && state.owner === id && !state.loading) setState((current) => ({ ...current, mode })); };
  const save = async () => {
    if (!id || state.owner !== id || state.loading || lock.current) return false;
    lock.current = true;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const mode = await saveAppearance(state.mode, controller.signal);
      if (controller.signal.aborted) return false;
      setState({ owner: id, mode, loading: false, error: "", saving: false }); return true;
    } catch (failure) {
      if (!controller.signal.aborted) setState((current) => ({ ...current, saving: false, error: isAxiosError(failure) && failure.response?.status === 401 ? "Your session has expired. Please sign in again." : "Appearance was not saved. Check your connection and retry." }));
      return false;
    } finally { lock.current = false; }
  };
  // Logout/account switching must never expose the previous account's preference.
  useEffect(() => () => { request.current?.abort(); }, [id]);
  const owned = !!id && state.owner === id;
  return <Context.Provider value={{ mode: owned ? state.mode : "light", loading: authLoading || (!!id && (!owned || state.loading)), saving: owned && state.saving, error: owned ? state.error : "", preview, save, reload: () => setRevision((value) => value + 1) }}>{accountRoute(path) && <StatusBar style={owned && state.mode === "dark" ? "light" : "dark"} />}{children}</Context.Provider>;
}
export const useAccountTheme = () => useContext(Context);
export function useAccountStyles() {
  const { mode } = useAccountTheme();
  const path = usePathname();
  return useCallback(<T,>(value: T): T => mode === "dark" && accountRoute(path) ? darkStyle(value) : value, [mode, path]);
}
