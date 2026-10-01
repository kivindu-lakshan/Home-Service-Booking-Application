import { useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMyProfile, type MyProfile } from "@/api/profile";
import { useAuth } from "@/context/AuthContext";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

const cards: { title: string; subtitle: string; icon: ProfileIconName }[] = [
  { title: "Personal information", subtitle: "Name, photo and contact details", icon: "person" },
  { title: "Saved addresses", subtitle: "Home and other service locations", icon: "pin" },
  { title: "Settings", subtitle: "Security, appearance and privacy", icon: "grid" },
  { title: "Help & support", subtitle: "A helping hand when you need it", icon: "heart" },
];

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: MyProfile }
  | { status: "error"; sessionExpired: boolean };

export default function MyProfileScreen() {
  const { updated } = useLocalSearchParams<{ updated?: string }>();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const activeRequest = useRef<AbortController | null>(null);

  const loadProfile = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ status: "loading" });
    try {
      const profile = await getMyProfile(controller.signal);
      if (!controller.signal.aborted) setState({ status: "ready", profile });
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: "error", sessionExpired: isAxiosError(error) && error.response?.status === 401 });
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (authLoading || !user) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void loadProfile();
    });
    return () => {
      active = false;
      activeRequest.current?.abort();
    };
  }, [authLoading, user, loadProfile]));

  if (!authLoading && !user) return <Redirect href="/auth/login" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={6}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">Your little corner.</Text>
          <Text style={styles.subtitle}>Everything for your account, in one place.</Text>
          {updated === "1" && (
            <Text accessibilityRole="alert" style={styles.success}>Your profile changes have been saved.</Text>
          )}

          {authLoading || state.status === "loading" ? (
            <View style={[styles.profileCard, styles.stateCard]} accessibilityLiveRegion="polite">
              <ActivityIndicator color="#633CFF" />
              <Text style={styles.stateText}>Loading your profile...</Text>
            </View>
          ) : state.status === "error" ? (
            <View style={[styles.profileCard, styles.errorCard]}>
              <Text style={styles.errorText} accessibilityRole="alert">
                {state.sessionExpired ? "Your session has expired. Please sign in again." : "Unable to load your profile. Please try again."}
              </Text>
              <Pressable accessibilityRole="button"
                onPress={() => state.sessionExpired ? router.replace("/auth/login") : void loadProfile()}
                style={styles.retry}>
                <Text style={styles.retryText}>{state.sessionExpired ? "Sign in" : "Try again"}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.profileCard}>
              <ProfileAvatar key={`${state.profile.id}:${state.profile.avatarUrl}`} profile={state.profile} />
              <View style={styles.identity}>
                <Text style={styles.name}>{state.profile.fullName}</Text>
                <Text style={styles.email}>{state.profile.email}</Text>
                <Text style={[styles.verification, !state.profile.emailVerified && styles.unverified]}>
                  {state.profile.emailVerified ? "✓ Email verified" : "Email not verified"}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.cards}>
            {cards.map((card) => (
              <Pressable key={card.title} disabled={card.icon !== "person" && card.icon !== "pin"} accessibilityRole="button"
                accessibilityState={{ disabled: card.icon !== "person" && card.icon !== "pin" }}
                onPress={() => {
                  router.setParams({ updated: undefined });
                  router.push(card.icon === "pin" ? "/addresses" : "/personal-information");
                }}
                accessibilityLabel={`${card.title}. ${card.subtitle}.${card.icon === "person" || card.icon === "pin" ? "" : " Coming soon."}`} style={styles.menuCard}>
                <View style={styles.iconTile}><ProfileIcon name={card.icon} /></View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                </View>
                <Text style={styles.chevron} accessible={false}>›</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.comingSoon}>More account features coming soon.</Text>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Home" style={styles.navItem} onPress={() => router.replace("/")}>
            <ProfileIcon name="home" color="#7E8AA4" /><Text style={styles.navLabel}>Home</Text>
          </Pressable>
          <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Services. Coming soon." style={styles.navItem}>
            <ProfileIcon name="grid" color="#7E8AA4" /><Text style={styles.navLabel}>Services</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Bookings" style={styles.navItem} onPress={() => router.push("/bookings")}>
            <ProfileIcon name="calendar" color="#7E8AA4" /><Text style={styles.navLabel}>Bookings</Text>
          </Pressable>
          <View accessible accessibilityRole="tab" accessibilityState={{ selected: true }} accessibilityLabel="Profile" style={[styles.navItem, styles.activeNav]}>
            <ProfileIcon name="person" /><Text style={[styles.navLabel, styles.activeLabel]}>Profile</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7FD" },
  page: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20, flexGrow: 1 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  backArrow: { color: "#8157FF", fontSize: 32, lineHeight: 36, marginTop: -3 },
  pressed: { opacity: 0.65 },
  title: { color: "#242E49", fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: "#7C879F", fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 44 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#EDE7FF", borderRadius: 28, padding: 18, minHeight: 106, marginBottom: 16 },
  success: { color: "#278B70", backgroundColor: "#E6F5EE", padding: 14, borderRadius: 14, marginBottom: 16, lineHeight: 21 },
  identity: { flex: 1, gap: 4 },
  name: { color: "#242E49", fontSize: 19, fontWeight: "800" },
  email: { color: "#77829C", fontSize: 13, lineHeight: 18, flexShrink: 1 },
  verification: { color: "#278B70", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  unverified: { color: "#986119" },
  stateCard: { justifyContent: "center", flexWrap: "wrap" },
  stateText: { color: "#59657F", fontSize: 14 },
  errorCard: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  errorText: { color: "#A13548", fontSize: 14, lineHeight: 21 },
  retry: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  retryText: { color: "#633CFF", fontWeight: "700" },
  cards: { gap: 14 },
  menuCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderColor: "#E6EAF3", borderWidth: 1, borderRadius: 22, padding: 13, minHeight: 74 },
  iconTile: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EEE8FF", alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#303B55" },
  cardSubtitle: { fontSize: 12, color: "#7D89A1", lineHeight: 18 },
  chevron: { color: "#8B97AE", fontSize: 27, alignSelf: "flex-start", lineHeight: 27 },
  comingSoon: { color: "#7D89A1", fontSize: 11, textAlign: "center", marginTop: 16 },
  bottomBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 32, padding: 6, marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: "#F0EEF8" },
  navItem: { flex: 1, minHeight: 54, paddingVertical: 6, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 3 },
  navLabel: { color: "#7E8AA4", fontSize: 10, fontWeight: "500" },
  activeNav: { backgroundColor: "#EEE8FF" },
  activeLabel: { color: "#8157FF", fontWeight: "700" },
});
