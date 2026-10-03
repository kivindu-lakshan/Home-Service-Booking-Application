import { useAccountStyles } from "@/context/AccountThemeContext";
import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { StyleSheet, Switch, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { useAuth } from "@/context/AuthContext";
import { getNotificationPreferences, saveNotificationPreferences, notificationError, preferenceFields, type NotificationPreferences } from "@/api/notification-preferences";
import { LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { AddressPage as Page, AddressButton as Button, addressStyles } from "@/components/address/AddressUI";
export default function NotificationPreferencesScreen() {
  const themed = useAccountStyles();
  const { user, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const request = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const userId = user?.id;
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setDraft(null); setError(""); setExpired(false);
    try { const values = await getNotificationPreferences(controller.signal); if (!controller.signal.aborted) setDraft(values); }
    catch (failure) { if (!controller.signal.aborted) { const details = notificationError(failure); setError(details.message); setExpired(details.expired); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    if (authLoading || !userId) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [authLoading, userId, load]));
  const save = async () => {
    if (!draft || lock.current || expired || loading) return;
    lock.current = true; setBusy(true); setError("");
    const controller = new AbortController(); request.current = controller;
    try {
      await saveNotificationPreferences(draft, controller.signal);
      if (!controller.signal.aborted) router.dismissTo({ pathname: "/settings", params: { saved: "1" } });
    } catch (failure) {
      if (!controller.signal.aborted) { const details = notificationError(failure); setError(details.message); setExpired(details.expired); }
    } finally { lock.current = false; setBusy(false); }
  };
  if (!authLoading && !user) return <Redirect href="/auth/login" />;
  return <Page title="The updates you want." subtitle="Choose your booking notifications." busy={busy} onBack={() => router.dismissTo("/settings")}>
    {authLoading || loading ? <LoadingState label="Loading your preferences..." /> : <>
      {draft && <><View style={themed(styles.cards)}>{preferenceFields.map(({ key, title, hint }) => <View key={key} style={themed(styles.card)}>
        <View style={themed({ flex: 1 })}><Text style={themed(styles.title)}>{title}</Text><Text style={themed(styles.hint)}>{hint}</Text></View>
        <Switch accessibilityLabel={title} accessibilityHint={hint} value={draft[key]} disabled={busy || expired}
          onValueChange={(value) => { if (typeof value === "boolean") setDraft((current) => current ? { ...current, [key]: value } : current); }}
          trackColor={{ false: "#CDD3E1", true: "#35CC63" }} thumbColor="#FFFFFF" ios_backgroundColor="#CDD3E1" />
      </View>)}</View>
      <Text style={themed(styles.note)}>Tap Done to save your choices. Push delivery also depends on notification permissions on your device.</Text></>}
      <ErrorText>{error}</ErrorText>
      {expired ? <Button secondary title="Sign in" onPress={() => router.replace("/auth/login")} /> : !draft && <Button secondary title="Try again" onPress={() => void load()} />}
      {draft && <View style={themed(addressStyles.footer)}><Button title="Done" busy={busy} disabled={expired} onPress={() => void save()} /></View>}
    </>}
  </Page>;
}
const styles = StyleSheet.create({
  cards: { gap: 14 }, card: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, minHeight: 94, borderRadius: 20, backgroundColor: "#FFFFFF" },
  title: { color: "#303B55", fontSize: 15, fontWeight: "700" }, hint: { color: "#7C879F", fontSize: 12, lineHeight: 18, marginTop: 5 },
  note: { color: "#7C879F", fontSize: 12, lineHeight: 19, marginTop: 20, marginBottom: 16 },
});
