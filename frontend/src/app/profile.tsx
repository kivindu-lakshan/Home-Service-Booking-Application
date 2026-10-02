import { useAccountStyles } from "@/context/AccountThemeContext";
import { useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMyProfile, type MyProfile } from "@/api/profile";
import { useAuth } from "@/context/AuthContext";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileBackButton, ProfileNavigation } from "@/components/profile/ProfileNavigation";

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
  const themed = useAccountStyles();
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
    <SafeAreaView style={themed(styles.safeArea)}>
      <View style={themed(styles.page)}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ProfileBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />
          <Text style={themed(styles.title)} accessibilityRole="header">Your little corner.</Text>
          <Text style={themed(styles.subtitle)}>Everything for your account, in one place.</Text>
          {updated === "1" && (
            <Text accessibilityRole="alert" style={themed(styles.success)}>Your profile changes have been saved.</Text>
          )}

          {authLoading || state.status === "loading" ? (
            <View style={themed([styles.profileCard, styles.stateCard])} accessibilityLiveRegion="polite">
              <ActivityIndicator color={themed({ color: "#633CFF" }).color} />
              <Text style={themed(styles.stateText)}>Loading your profile...</Text>
            </View>
          ) : state.status === "error" ? (
            <View style={themed([styles.profileCard, styles.errorCard])}>
              <Text style={themed(styles.errorText)} accessibilityRole="alert">
                {state.sessionExpired ? "Your session has expired. Please sign in again." : "Unable to load your profile. Please try again."}
              </Text>
              <Pressable accessibilityRole="button"
                onPress={() => state.sessionExpired ? router.replace("/auth/login") : void loadProfile()}
                style={themed(styles.retry)}>
                <Text style={themed(styles.retryText)}>{state.sessionExpired ? "Sign in" : "Try again"}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={themed(styles.profileCard)}>
              <ProfileAvatar key={`${state.profile.id}:${state.profile.avatarUrl}`} profile={state.profile} />
              <View style={themed(styles.identity)}>
                <Text style={themed(styles.name)}>{state.profile.fullName}</Text>
                <Text style={themed(styles.email)}>{state.profile.email}</Text>
                <Text style={themed([styles.verification, !state.profile.emailVerified && styles.unverified])}>
                  {state.profile.emailVerified ? "✓ Email verified" : "Email not verified"}
                </Text>
              </View>
            </View>
          )}

          <View style={themed(styles.cards)}>
            {cards.map((card) => (
              <Pressable key={card.title} accessibilityRole="button"
                onPress={() => {
                  router.setParams({ updated: undefined });
                  router.push(card.icon === "grid" ? "/settings" : card.icon === "heart" ? "/support" : card.icon === "pin" ? "/addresses" : "/personal-information");
                }}
                accessibilityLabel={`${card.title}. ${card.subtitle}.`} style={themed(styles.menuCard)}>
                <View style={themed(styles.iconTile)}><ProfileIcon name={card.icon} /></View>
                <View style={themed(styles.cardCopy)}>
                  <Text style={themed(styles.cardTitle)}>{card.title}</Text>
                  <Text style={themed(styles.cardSubtitle)}>{card.subtitle}</Text>
                </View>
                <Text style={themed(styles.chevron)} accessible={false}>›</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ProfileNavigation active="profile" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7FD" },
  page: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20, flexGrow: 1 },
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
});
