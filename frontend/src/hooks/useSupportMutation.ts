import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { supportError } from "@/api/support";
import type { SupportErrors } from "@/validation/support";
export function useSupportMutation() {
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<SupportErrors>({});
  const [expired, setExpired] = useState(false);
  useFocusEffect(useCallback(() => () => { request.current?.abort(); }, []));
  const run = async (operation: (signal: AbortSignal) => Promise<unknown>, result: string) => {
    if (lock.current || expired) return;
    lock.current = true; setBusy(true); setError(""); setFields({});
    const controller = new AbortController(); request.current = controller;
    try {
      await operation(controller.signal);
      if (!controller.signal.aborted) router.dismissTo({ pathname: "/support", params: { result } });
    } catch (failure) {
      if (!controller.signal.aborted) { const details = supportError(failure); setError(details.message); setFields(details.fields); setExpired(details.expired); }
    } finally { lock.current = false; setBusy(false); }
  };
  return { busy, error, fields, setFields, expired, run };
}
