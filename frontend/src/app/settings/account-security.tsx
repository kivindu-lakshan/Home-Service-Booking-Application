import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { isAxiosError } from "axios";
import { Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getMyProfile, type MyProfile } from "@/api/profile";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { AddressPage as Page, AddressButton as Button, addressStyles as styles } from "@/components/address/AddressUI";
export default function AccountSecurityScreen() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setProfile(null); setExpired(false);
    try { const data = await getMyProfile(controller.signal); if (!controller.signal.aborted) setProfile(data); }
    catch (failure) { if (!controller.signal.aborted) { const unauthorized = isAxiosError(failure) && failure.response?.status === 401; setExpired(unauthorized); setError(unauthorized ? "Your session has expired. Please sign in again." : "Unable to load your account. Please try again."); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    if (authLoading || !user) return;
    let active = true; void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [authLoading, user, load]));
  if (!authLoading && !user) return <Redirect href="/auth/login" />;
  return <Page title="Safe and sound." subtitle="Manage access to your HomeHalo account." onBack={() => router.dismissTo("/settings")}>
    {authLoading || loading ? <LoadingState label="Loading your account..." /> : error ? <><ErrorText>{error}</ErrorText><Button title={expired ? "Sign in" : "Try again"} onPress={() => expired ? router.replace("/auth/login") : void load()} /></> : profile && <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: "#E6EAF3", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: profile.emailVerified ? "#24CDB6" : "#FFF0CD", alignItems: "center", justifyContent: "center" }}><Text accessible={false} style={{ color: "#633CFF", fontSize: 22 }}>{profile.emailVerified ? "\u2713" : "!"}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.label}>{profile.emailVerified ? "Email verified" : "Email not verified"}</Text><Text selectable style={{ color: "#7C879F", fontSize: 12 }}>{profile.email}</Text></View>
      </View>
      <SettingsCard title="Change password" subtitle="Choose a new, strong password." icon="lock" onPress={() => router.push("/auth/change-password")} />
      <SettingsCard title="Personal information" subtitle="View your email and update contact details." icon="person" onPress={() => router.push("/personal-information")} />
      <SettingsCard title="Delete account" subtitle="Review what happens before continuing." icon="person" placeholder />
    </View>}
    <Text style={styles.hint}>Never share your password or verification codes with anyone.</Text>
  </Page>;
}
