import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsIcon } from "@/components/settings/SettingsIcon";
import { LoadingState } from "@/components/DataState";
import { AddressPage as Page, AddressButton as Button, addressStyles as styles } from "@/components/address/AddressUI";
export default function AppearanceScreen() {
  const { user, loading } = useAuth();
  const [selection, setSelection] = useState<"Light" | "Dark">("Light");
  if (!loading && !user) return <Redirect href="/auth/login" />;
  return <Page title="Comfort comes first." subtitle="Choose a look that feels right." onBack={() => router.dismissTo("/settings")}>
    {loading ? <LoadingState /> : <>
      <Text style={[styles.hint, { marginBottom: 12, fontWeight: "700" }]}>APPEARANCE</Text>
      <View style={{ flexDirection: "row", gap: 12 }}>{(["Light", "Dark"] as const).map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`${option} appearance selection`} accessibilityState={{ checked: selection === option }} onPress={() => setSelection(option)}
        style={{ flex: 1, minHeight: 100, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: selection === option ? "#8157FF" : "transparent" }}><SettingsIcon name="sparkle" /><Text style={styles.label}>{option}</Text></Pressable>)}</View>
      <Text accessibilityLiveRegion="polite" style={[styles.hint, { marginBottom: 14 }]}>{selection} selected for this screen only. This choice is not saved or applied across the app.</Text>
      <View style={{ gap: 12 }}>
        <SettingsCard title="Easy on the eyes" subtitle="Forms use clear, solid surfaces so every detail stays readable." icon="eye" />
        <SettingsCard title="Gentle by design" subtitle="Short fades keep movement calm and predictable." icon="sparkle" />
      </View>
      <Text style={styles.hint}>For additional text-size and motion preferences, use your device Settings.</Text>
      <View style={styles.footer}><Button title="Done" onPress={() => router.dismissTo("/settings")} /></View>
    </>}
  </Page>;
}
