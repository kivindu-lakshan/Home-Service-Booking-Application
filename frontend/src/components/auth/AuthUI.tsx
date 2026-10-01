import { useState, type ReactNode } from "react";
import { Redirect, router, type Href } from "expo-router";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
import { AddressPage, addressStyles } from "@/components/address/AddressUI";
import { LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
export { AddressButton as AuthButton } from "@/components/address/AddressUI";
export function AuthPage({ title, subtitle, back, busy, children }: { title: string; subtitle: string; back: Href; busy?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AddressPage title={title} subtitle={subtitle} onBack={() => {}} busy><LoadingState label="Checking your session..." /></AddressPage>;
  if (user) return <Redirect href="/" />;
  return <AddressPage title={title} subtitle={subtitle} busy={busy} onBack={() => router.canGoBack() ? router.back() : router.replace(back)}>{children}</AddressPage>;
}
export function AuthLink({ title, onPress, disabled = false }: { title: string; onPress?: () => void; disabled?: boolean }) {
  const themed = useAccountStyles();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.link}><Text style={themed(styles.linkText)}>{title}</Text></Pressable>;
}
export function AuthField({ label, error, password = false, ...props }: TextInputProps & { label: string; error?: string; password?: boolean }) {
  const themed = useAccountStyles();
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}>
    <Text style={themed(addressStyles.label)}>{label}</Text>
    <View style={themed([styles.inputRow, !!error && { borderColor: "#C0392B" }])}>
      <TextInput {...props} accessibilityLabel={label} secureTextEntry={password && !visible} autoCapitalize={password ? "none" : props.autoCapitalize} autoCorrect={password ? false : props.autoCorrect}
        placeholderTextColor={themed({ color: "#8890A5" }).color} style={themed(styles.input)} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} accessibilityState={{ disabled: props.editable === false }} disabled={props.editable === false} onPress={() => setVisible(!visible)} style={styles.visibility}><Text style={themed(styles.linkText)}>{visible ? "Hide" : "Show"}</Text></Pressable>}
    </View><ErrorText>{error}</ErrorText>
  </View>;
}
export function AuthFooter({ children }: { children: ReactNode }) { return <View style={addressStyles.footer}>{children}</View>; }
export function HomeIllustration() {
  const themed = useAccountStyles();
  return <View accessible accessibilityLabel="A welcoming home with a purple roof" style={themed(styles.illustration)}>
    <View style={[styles.blob, { left: -16, top: 14, backgroundColor: "#F4C6D4" }]} />
    <View style={[styles.blob, { right: -10, bottom: 8, backgroundColor: "#8DDDE0", width: 115, height: 115 }]} />
    <View style={styles.house}><View style={styles.roof} /><View style={styles.windows}><View style={styles.window} /><View style={styles.window} /></View><View style={styles.door} /></View>
    <View style={themed(styles.badge)}><Text style={themed({ color: "#278B70", fontWeight: "700" })}>{"\u2713"} A little less to-do.</Text></View>
  </View>;
}
const styles = StyleSheet.create({
  link: { minHeight: 44, alignItems: "center", justifyContent: "center", padding: 8 }, linkText: { color: "#633CFF", fontSize: 13, fontWeight: "700", textAlign: "center" },
  field: { marginBottom: 14 }, inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E6EAF3", backgroundColor: "#FFFFFF", borderRadius: 15 },
  input: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, color: "#242E49", fontSize: 16 }, visibility: { paddingHorizontal: 12, minHeight: 48, justifyContent: "center" },
  illustration: { height: 220, backgroundColor: "#EDE7FF", borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  blob: { position: "absolute", width: 95, height: 95, borderRadius: 60 }, house: { width: 126, height: 115, borderRadius: 18, backgroundColor: "#FFFFFF", marginTop: 38, alignItems: "center", transform: [{ rotate: "5deg" }] },
  roof: { position: "absolute", top: -37, width: 105, height: 105, borderTopWidth: 10, borderLeftWidth: 10, borderColor: "#633CFF", borderRadius: 5, transform: [{ rotate: "45deg" }] },
  windows: { flexDirection: "row", gap: 48, marginTop: 24 }, window: { width: 20, height: 20, borderRadius: 5, backgroundColor: "#24CDB6" },
  door: { width: 30, height: 46, backgroundColor: "#633CFF", borderTopLeftRadius: 14, borderTopRightRadius: 14, marginTop: 16 },
  badge: { position: "absolute", left: 14, bottom: 15, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 12 },
});
