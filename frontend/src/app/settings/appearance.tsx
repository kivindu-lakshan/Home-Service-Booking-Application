import { useAccountStyles, useAccountTheme } from "@/context/AccountThemeContext";
import ErrorText from "@/components/ErrorText";
import { Redirect, router } from "expo-router";
import { Pressable, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { useAuth } from "@/context/AuthContext";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsIcon } from "@/components/settings/SettingsIcon";
import { LoadingState } from "@/components/DataState";
import { AddressPage as Page, AddressButton as Button, addressStyles as styles } from "@/components/address/AddressUI";
export default function AppearanceScreen() {
  const themed = useAccountStyles();
  const { user, loading } = useAuth();
  const appearance = useAccountTheme();
  const selection = appearance.mode === "dark" ? "Dark" : "Light";
  if (!loading && !user) return <Redirect href="/auth/login" />;
  return <Page title="Comfort comes first." subtitle="Choose a look that feels right." onBack={() => router.dismissTo("/settings")}>
    {loading || appearance.loading ? <LoadingState /> : <>
      <Text style={themed([styles.hint, { marginBottom: 12, fontWeight: "700" }])}>APPEARANCE</Text>
      <View style={themed({ flexDirection: "row", gap: 12 })}>{(["Light", "Dark"] as const).map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`${option} appearance selection`} accessibilityState={{ checked: selection === option }} disabled={appearance.saving} onPress={() => appearance.preview(option === "Dark" ? "dark" : "light")}
        style={themed({ flex: 1, minHeight: 100, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: selection === option ? "#8157FF" : "transparent" })}><SettingsIcon name="sparkle" /><Text style={themed(styles.label)}>{option}</Text></Pressable>)}</View>
      <Text accessibilityLiveRegion="polite" style={themed([styles.hint, { marginBottom: 14 }])}>{selection} applies immediately to your profile, addresses, support and settings. Tap Done to save it to your account.</Text>
      <View style={themed({ gap: 12 })}>
        <SettingsCard title="Easy on the eyes" subtitle="Forms use clear, solid surfaces so every detail stays readable." icon="eye" />
        <SettingsCard title="Gentle by design" subtitle="Short fades keep movement calm and predictable." icon="sparkle" />
      </View>
      <Text style={themed(styles.hint)}>For additional text-size and motion preferences, use your device Settings.</Text>
      <ErrorText>{appearance.error}</ErrorText>
      {!!appearance.error && <Button secondary title="Reload saved appearance" disabled={appearance.saving} onPress={appearance.reload} />}
      <View style={themed(styles.footer)}><Button title="Done" busy={appearance.saving} onPress={() => { void appearance.save().then((saved) => { if (saved) router.dismissTo("/settings"); }); }} /></View>
    </>}
  </Page>;
}
