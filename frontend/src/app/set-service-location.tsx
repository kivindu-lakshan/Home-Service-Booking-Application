import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
import { AddressPage as Page, AddressButton as Button, addressStyles as styles } from "@/components/address/AddressUI";
import { AuthField } from "@/components/auth/AuthUI";
import { ProfileIcon } from "@/components/profile/ProfileIcon";
import { LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { getServiceLocation, saveServiceLocation, serviceLocationError } from "@/api/service-location";
import { validateServiceLocation, type ServiceLocation } from "@/validation/service-location";
import { currentServiceLocation } from "@/utils/current-service-location";
export default function SetServiceLocationScreen() {
  const { user, loading: authLoading } = useAuth(); const themed = useAccountStyles();
  const [draft, setDraft] = useState<ServiceLocation>({ areaCity: "", source: "manual" });
  const [loading, setLoading] = useState(true); const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"locating" | "saving" | null>(null);
  const [error, setError] = useState(""); const [fieldError, setFieldError] = useState(""); const [note, setNote] = useState("");
  const request = useRef<AbortController | null>(null); const lock = useRef(false); const generation = useRef(0);
  const id = user?.id; const role = user?.role;
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setReady(false); setError("");
    try { const location = await getServiceLocation(controller.signal); if (!controller.signal.aborted) { setDraft(location || { areaCity: "", source: "manual" }); setReady(true); } }
    catch (failure) { if (!controller.signal.aborted) setError(serviceLocationError(failure)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    if (authLoading || !id || role !== "customer") return;
    let active = true; void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); generation.current += 1; };
  }, [id, role, authLoading, load]));
  const locate = async () => {
    if (lock.current || !ready) return;
    lock.current = true; setBusy("locating"); setError(""); setNote("");
    const attempt = generation.current;
    try { const result = await currentServiceLocation(); if (generation.current === attempt) { setDraft(result.location); setNote(result.note); setFieldError(""); } }
    catch (failure) { if (generation.current === attempt) setError(failure instanceof Error ? failure.message : "Location lookup failed. Enter your area manually."); }
    finally { lock.current = false; setBusy(null); }
  };
  const save = async () => {
    if (lock.current || !ready) return;
    const invalid = validateServiceLocation(draft); setFieldError(invalid); if (invalid) return;
    lock.current = true; setBusy("saving"); setError("");
    const controller = new AbortController(); request.current = controller;
    try { await saveServiceLocation(draft, controller.signal); if (!controller.signal.aborted) router.replace("/"); }
    catch (failure) { if (!controller.signal.aborted) setError(serviceLocationError(failure)); }
    finally { lock.current = false; setBusy(null); }
  };
  if (!authLoading && !user) return <Redirect href="/auth/login" />;
  if (!authLoading && user && role !== "customer") return <Redirect href="/" />;
  return <Page title={"Where can\nwe help?"} subtitle="Find services around your home." busy={!!busy} onBack={() => router.replace("/profile")}>
    {loading || authLoading ? <LoadingState label="Loading your service area..." /> : <>
      {ready && <>
        <View accessible accessibilityLabel="Decorative location map" style={themed({ height: 160, borderRadius: 24, backgroundColor: "#EDE7FF", overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 24 })}>
          {[-25, 30, 85].map((top) => <View key={top} style={themed({ position: "absolute", width: "140%", height: 9, backgroundColor: "#FFFFFF", top, transform: [{ rotate: "27deg" }] })} />)}
          <View style={themed({ position: "absolute", width: "140%", height: 9, backgroundColor: "#FFFFFF", transform: [{ rotate: "-33deg" }] })} />
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#633CFF", alignItems: "center", justifyContent: "center" }}><ProfileIcon name="pin" color="#FFFFFF" /></View>
        </View>
        <AuthField label="Area or city" placeholder="e.g. Malabe, Sri Lanka" value={draft.areaCity} error={fieldError} editable={!busy}
          onChangeText={(areaCity) => { setDraft((current) => ({ ...current, areaCity })); setFieldError(""); setNote(""); }} />
        <Button title="Use current location" secondary busy={busy === "locating"} disabled={!!busy} onPress={() => void locate()} />
        <Text style={themed(styles.hint)}>Location access is optional. An address can always be entered manually.</Text>
        {!!note && <Text accessibilityLiveRegion="polite" style={themed(styles.hint)}>{note}</Text>}
      </>}
      <ErrorText>{error}</ErrorText>
      {!ready && <Button title="Try again" onPress={() => void load()} />}
      {ready && <View style={styles.footer}><Button title="Confirm location" busy={busy === "saving"} disabled={!!busy} onPress={() => void save()} /></View>}
    </>}
  </Page>;
}
