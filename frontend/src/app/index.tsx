import { ServiceLocationGate } from "@/components/location/ServiceLocationGate";
import { ProfileNavigation } from "@/components/profile/ProfileNavigation";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { SafeAreaView } from "react-native-safe-area-context";

const actions: { title: string; subtitle: string; icon: ProfileIconName; route: string }[] = [
  { title: "View available services", subtitle: "Find trusted help for your home", icon: "grid", route: "/services" },
  { title: "My profile", subtitle: "Personal information and preferences", icon: "person", route: "/profile" },
  { title: "Change password", subtitle: "Keep your account secure", icon: "grid", route: "/auth/change-password" },
  { title: "My bookings", subtitle: "Track your upcoming and past services", icon: "calendar", route: "/bookings" },
  { title: "My reviews", subtitle: "Manage the feedback you have shared", icon: "heart", route: "/reviews/mine" },
  { title: "Support tickets", subtitle: "Get help from the HomeHalo team", icon: "heart", route: "/support" },
];

export default function HomeScreen() {
  const { user, loading, logout } = useAuth();
  const themed = useAccountStyles();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/onboarding/landing");
    else if (user.role === "admin") router.replace("/admin/dashboard");
    else if (user.role === "provider") router.replace("/provider/dashboard");
  }, [loading, user]);

  if (loading || !user) {
    return <View style={styles.loading}><ActivityIndicator color="#633CFF" /></View>;
  }

  return (
    <ServiceLocationGate>
      <SafeAreaView style={themed(styles.safeArea)}>
        <View style={themed(styles.shell)}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={themed(styles.brandRow)}>
              <View style={themed(styles.logo)}><ProfileIcon name="home" /></View>
              <View><Text style={themed(styles.brand)}>HomeHalo</Text><Text style={themed(styles.brandCaption)}>HOME SERVICE</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Open my profile" onPress={() => router.push("/profile")} style={themed(styles.avatar)}>
                <Text style={themed(styles.avatarText)}>{user.fullName.trim().slice(0, 1).toUpperCase()}</Text>
              </Pressable>
            </View>
            <Text style={themed(styles.greeting)}>Welcome back, {user.fullName.trim().split(/\s+/)[0]}</Text>
            <Text accessibilityRole="header" style={themed(styles.title)}>What can we help with?</Text>
            <Text style={themed(styles.subtitle)}>Everything for a happier home, in one place.</Text>
            <View style={themed(styles.actionList)}>
              {actions.map((action) => <Pressable key={action.title} accessibilityRole="button" accessibilityLabel={action.title} onPress={() => router.push(action.route as never)} style={themed(({ pressed }) => [styles.action, pressed && styles.pressed])}>
                <View style={themed(styles.iconTile)}><ProfileIcon name={action.icon} /></View>
                <View style={themed(styles.actionCopy)}><Text style={themed(styles.actionTitle)}>{action.title}</Text><Text style={themed(styles.actionSubtitle)}>{action.subtitle}</Text></View>
                <Text style={themed(styles.chevron)}>›</Text>
              </Pressable>)}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={() => void logout()} style={themed(styles.logout)}><Text style={themed(styles.logoutText)}>Log out</Text></Pressable>
          </ScrollView>
          <ProfileNavigation active="home" />
        </View>
      </SafeAreaView>
    </ServiceLocationGate>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7FD" },
  safeArea: { flex: 1, backgroundColor: "#F7F7FD" },
  shell: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EDE7FF", alignItems: "center", justifyContent: "center" },
  brand: { color: "#633CFF", fontSize: 22, fontWeight: "800" },
  brandCaption: { color: "#7C879F", fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginTop: 2 },
  avatar: { marginLeft: "auto", width: 42, height: 42, borderRadius: 21, backgroundColor: "#633CFF", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  greeting: { color: "#7C879F", fontSize: 14, fontWeight: "600" },
  title: { color: "#242E49", fontSize: 29, lineHeight: 36, fontWeight: "800", marginTop: 8 },
  subtitle: { color: "#7C879F", fontSize: 15, lineHeight: 23, marginTop: 8, marginBottom: 24 },
  notice: { backgroundColor: "#FFF0CD", borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  noticeText: { flex: 1, color: "#986119", fontSize: 13, lineHeight: 19 },
  noticeLink: { color: "#633CFF", fontSize: 13, fontWeight: "800" },
  actionList: { gap: 12 },
  action: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6EAF3", borderRadius: 22, padding: 13 },
  pressed: { opacity: 0.65 },
  iconTile: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEE8FF", alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1, gap: 4 },
  actionTitle: { color: "#303B55", fontSize: 16, fontWeight: "700" },
  actionSubtitle: { color: "#7D89A1", fontSize: 12, lineHeight: 18 },
  chevron: { color: "#8B97AE", fontSize: 27, lineHeight: 27 },
  logout: { alignItems: "center", paddingVertical: 18 },
  logoutText: { color: "#7C879F", fontSize: 13, fontWeight: "700" },
});
