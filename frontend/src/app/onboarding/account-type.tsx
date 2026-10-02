import { router } from "expo-router";
import { View } from "react-native";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { AccountText as Text } from "@/components/settings/AccountText";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { addressStyles } from "@/components/address/AddressUI";
import { AuthPage, AuthButton, AuthFooter } from "@/components/auth/AuthUI";
export default function AccountTypeScreen() {
  const themed = useAccountStyles();
  return <AuthPage title="How can we help?" subtitle="Choose the account that's right for you." back="/onboarding/welcome">
    <View style={{ gap: 16 }}>
      <SettingsCard title="Find a service" subtitle="Book trusted professionals for your home." icon="home" onPress={() => router.push("/auth/register")} />
      <SettingsCard title="Offer a service" subtitle="Find local customers and grow your business. Provider registration is not available yet." icon="person" placeholder />
    </View><Text style={themed(addressStyles.hint)}>Already part of HomeHalo?</Text>
    <AuthFooter><AuthButton title="Sign in" secondary onPress={() => router.push("/auth/login")} /></AuthFooter>
  </AuthPage>;
}
