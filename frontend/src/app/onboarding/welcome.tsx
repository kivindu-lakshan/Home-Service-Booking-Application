import { router } from "expo-router";
import { View } from "react-native";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { AuthPage, AuthButton, AuthFooter, AuthLink } from "@/components/auth/AuthUI";
export default function WelcomeScreen() {
  return <AuthPage title={"A little help.\nA lot more living."} subtitle="Your next home service, beautifully simple." back="/onboarding/landing">
    <View style={{ gap: 14 }}>
      <SettingsCard title="Find your people" subtitle="Browse services and compare trusted local professionals." icon="person" />
      <SettingsCard title="Make time for life" subtitle="Choose a time that fits around your day." icon="calendar" />
      <SettingsCard title="Stay in the know" subtitle="Follow booking updates from start to finish." icon="bell" />
    </View>
    <AuthFooter><AuthButton title="Let's get started" onPress={() => router.push("/onboarding/account-type")} /><AuthLink title="Skip introduction" onPress={() => router.push("/onboarding/account-type")} /></AuthFooter>
  </AuthPage>;
}
