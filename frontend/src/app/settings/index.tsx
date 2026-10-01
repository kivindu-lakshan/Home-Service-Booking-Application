import { useRef, useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { AddressPage as Page, AddressNotice as Notice } from "@/components/address/AddressUI";
const options = [
  { title: "Account & security", icon: "lock", route: "/settings/account-security" },
  { title: "Notifications", icon: "bell", route: "/settings/notifications" },
  { title: "Appearance & accessibility", icon: "sparkle", route: "/settings/appearance" },
  { title: "Privacy & permissions", icon: "person", route: "/settings/privacy" },
  { title: "Help & support", icon: "heart", route: "/support" },
] as const;
export default function SettingsScreen() {
  const { user, loading, logout } = useAuth();
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  if (!loading && !user) return <Redirect href="/auth/login" />;
  const signOut = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await logout(); router.replace("/auth/login"); }
    catch { setError("Unable to sign out. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Page title="Make it yours." subtitle="A comfortable space, just the way you like it." busy={busy} onBack={() => router.dismissTo("/profile")}>
    {loading ? <LoadingState /> : <>
      {saved === "1" && <Notice>Your notification preferences have been saved.</Notice>}
      <View style={styles.cards}>{options.map((option) => <SettingsCard key={option.title} title={option.title} icon={option.icon} disabled={busy}
        onPress={() => { router.setParams({ saved: undefined }); router.push(option.route); }} />)}</View>
      <ErrorText>{error}</ErrorText>
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => void signOut()} style={styles.signOut}><Text style={styles.signOutText}>{busy ? "Signing out..." : "Sign out"}</Text></Pressable>
    </>}
  </Page>;
}
const styles = StyleSheet.create({
  cards: { gap: 12 },
  signOut: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 12 }, signOutText: { color: "#633CFF", fontWeight: "700" },
});
