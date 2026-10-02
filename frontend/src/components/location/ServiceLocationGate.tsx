import { useCallback, useRef, useState, type ReactNode } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getServiceLocation, serviceLocationError } from "@/api/service-location";
import { requiresServiceLocation } from "@/validation/service-location";
import { LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { AddressPage as Page, AddressButton as Button } from "@/components/address/AddressUI";
export function ServiceLocationGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ owner: string; status: "loading" | "ready" | "missing" | "error"; error?: string }>({ owner: "", status: "loading" });
  const request = useRef<AbortController | null>(null);
  const id = user?.id; const role = user?.role;
  const load = useCallback(async () => {
    if (!id || role !== "customer") return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setState({ owner: id, status: "loading" });
    try { const location = await getServiceLocation(controller.signal); if (!controller.signal.aborted) setState({ owner: id, status: requiresServiceLocation(role, location) ? "missing" : "ready" }); }
    catch (error) { if (!controller.signal.aborted) setState({ owner: id, status: "error", error: serviceLocationError(error) }); }
  }, [id, role]);
  useFocusEffect(useCallback(() => {
    let active = true; void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [load]));
  if (role !== "customer") return children;
  if (state.owner !== id || state.status === "loading") return <LoadingState label="Checking your service location..." />;
  if (state.status === "missing") return <Redirect href="/set-service-location" />;
  if (state.status === "error") return <Page title="Your service area" subtitle="We couldn't check your saved location." onBack={() => router.push("/profile")}><ErrorText>{state.error}</ErrorText><Button title="Try again" onPress={() => void load()} /></Page>;
  return children;
}
