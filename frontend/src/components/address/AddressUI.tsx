import { useAccountStyles } from "@/context/AccountThemeContext";
import type { ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { SafeAreaView } from "react-native-safe-area-context";

export function AddressPage({ title, subtitle, onBack, busy, children }: {
  title: string; subtitle: string; onBack: () => void; busy?: boolean; children: ReactNode;
}) {
  const themed = useAccountStyles();
  return (
    <SafeAreaView style={themed(addressStyles.safeArea)}>
      <KeyboardAvoidingView style={themed(addressStyles.page)} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={addressStyles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy}
            accessibilityState={{ disabled: busy }} onPress={onBack}
            style={themed(({ pressed }) => [addressStyles.back, (pressed || busy) && addressStyles.disabled])}>
            <Text style={themed(addressStyles.backArrow)}>‹</Text>
          </Pressable>
          <Text accessibilityRole="header" style={themed(addressStyles.title)}>{title}</Text>
          <Text style={themed(addressStyles.subtitle)}>{subtitle}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function AddressButton({ title, onPress, disabled = false, busy = false, secondary = false, danger = false }: {
  title: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean; danger?: boolean;
}) {
  const themed = useAccountStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
      style={themed(({ pressed }) => [addressStyles.button, secondary && addressStyles.secondary, danger && addressStyles.danger,
        (pressed || disabled || busy) && addressStyles.disabled])}>
      {busy && <ActivityIndicator color={themed({ color: secondary ? "#633CFF" : "#FFFFFF" }).color} />}
      <Text style={themed([addressStyles.buttonText, secondary && addressStyles.secondaryText])}>{title}</Text>
    </Pressable>
  );
}
export function AddressNotice({ children }: { children: ReactNode }) {
  const themed = useAccountStyles();
  return <View style={themed(addressStyles.notice)}><Text accessibilityRole="alert" style={themed(addressStyles.noticeText)}>{children}</Text></View>;
}
export const addressStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7FD" },
  page: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { flexGrow: 1, padding: 22, paddingTop: 12, paddingBottom: 28 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  backArrow: { color: "#8157FF", fontSize: 32, lineHeight: 36, marginTop: -3 },
  title: { color: "#242E49", fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: "#7C879F", fontSize: 14, lineHeight: 22, marginTop: 10, marginBottom: 34 },
  button: { minHeight: 52, borderRadius: 28, backgroundColor: "#633CFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, padding: 14 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondary: { backgroundColor: "#EDE7FF" },
  secondaryText: { color: "#633CFF" },
  danger: { backgroundColor: "#B73248" },
  disabled: { opacity: 0.55 },
  footer: { marginTop: "auto", paddingTop: 30, gap: 12 },
  label: { color: "#303B55", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  input: { backgroundColor: "#FFFFFF", borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#242E49", borderWidth: 1, borderColor: "#E6EAF3", marginBottom: 8 },
  invalid: { borderColor: "#C0392B" },
  field: { marginBottom: 18 },
  hint: { color: "#7C879F", fontSize: 12, lineHeight: 19, marginTop: 12 },
  notice: { backgroundColor: "#E6F5EE", padding: 14, borderRadius: 14, marginBottom: 18 },
  noticeText: { color: "#278B70", fontSize: 14, lineHeight: 21 },
});
