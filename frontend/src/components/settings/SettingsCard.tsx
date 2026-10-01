import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";
import { SettingsIcon } from "./SettingsIcon";
export function SettingsCard({ title, subtitle, icon, onPress, disabled = false, placeholder = false }: {
  title: string; subtitle?: string; icon: ProfileIconName | "lock" | "bell" | "sparkle" | "eye";
  onPress?: () => void; disabled?: boolean; placeholder?: boolean;
}) {
  const content = <><View style={styles.icon}>{icon === "lock" || icon === "bell" || icon === "sparkle" || icon === "eye" ? <SettingsIcon name={icon} /> : <ProfileIcon name={icon} />}</View>
    <View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}{placeholder && <Text style={styles.subtitle}>Coming soon</Text>}</View>
    {(onPress || placeholder) && <Text accessible={false} style={styles.chevron}>{"\u203a"}</Text>}</>;
  return onPress || placeholder ? <Pressable accessibilityRole="button" accessibilityLabel={`${title}${placeholder ? ". Coming soon" : ""}`} accessibilityState={{ disabled: disabled || placeholder }} disabled={disabled || placeholder} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.65 }]}>{content}</Pressable> : <View style={styles.card}>{content}</View>;
}
const styles = StyleSheet.create({
  card: { minHeight: 70, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E6EAF3", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EEE8FF", alignItems: "center", justifyContent: "center" },
  title: { color: "#303B55", fontSize: 15, fontWeight: "700" }, subtitle: { color: "#7C879F", fontSize: 12, lineHeight: 18, marginTop: 3 }, chevron: { color: "#8B97AE", fontSize: 25 },
});
