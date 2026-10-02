import { useAccountStyles } from "@/context/AccountThemeContext";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { ProfileIcon } from "@/components/profile/ProfileIcon";

export type ProfileNavTab = "home" | "bookings" | "profile";

export function ProfileBackButton({ onPress, busy = false, label = "Go back" }: {
  onPress: () => void;
  busy?: boolean;
  label?: string;
}) {
  const themed = useAccountStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      disabled={busy}
      accessibilityState={{ disabled: busy }}
      onPress={onPress}
      style={themed(({ pressed }) => [styles.back, (pressed || busy) && styles.pressed])}
    >
      <Text style={themed(styles.backArrow)}>‹</Text>
    </Pressable>
  );
}

export function ProfileNavigation({ active }: { active: ProfileNavTab }) {
  const themed = useAccountStyles();
  const iconColor = themed({ color: "#7E8AA4" }).color;
  return (
    <View style={themed(styles.bottomBar)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Home" style={themed([styles.navItem, active === "home" && styles.activeNav])} onPress={() => router.replace("/")}>
        <ProfileIcon name="home" color={iconColor} /><Text style={themed([styles.navLabel, active === "home" && styles.activeLabel])}>Home</Text>
      </Pressable>
      <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Services. Coming soon." style={themed(styles.navItem)}>
        <ProfileIcon name="grid" color={iconColor} /><Text style={themed(styles.navLabel)}>Services</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Bookings" style={themed([styles.navItem, active === "bookings" && styles.activeNav])} onPress={() => router.push("/bookings")}>
        <ProfileIcon name="calendar" color={iconColor} /><Text style={themed([styles.navLabel, active === "bookings" && styles.activeLabel])}>Bookings</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" style={themed([styles.navItem, active === "profile" && styles.activeNav])} onPress={() => router.push("/profile")}>
        <ProfileIcon name="person" /><Text style={themed([styles.navLabel, active === "profile" && styles.activeLabel])}>Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  backArrow: { color: "#8157FF", fontSize: 32, lineHeight: 36, marginTop: -3 },
  pressed: { opacity: 0.65 },
  bottomBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 32, padding: 6, marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: "#F0EEF8" },
  navItem: { flex: 1, minHeight: 54, paddingVertical: 6, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 3 },
  navLabel: { color: "#7E8AA4", fontSize: 10, fontWeight: "500" },
  activeNav: { backgroundColor: "#EEE8FF" },
  activeLabel: { color: "#8157FF", fontWeight: "700" },
});