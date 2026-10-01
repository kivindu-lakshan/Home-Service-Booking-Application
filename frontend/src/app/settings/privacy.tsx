import { useAccountStyles } from "@/context/AccountThemeContext";
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { useAuth } from "@/context/AuthContext";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { LoadingState } from "@/components/DataState";
import { AddressPage as Page, addressStyles as styles } from "@/components/address/AddressUI";
export default function PrivacyScreen() {
  const themed = useAccountStyles();
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/auth/login" />;
  return <Page title="Your privacy matters." subtitle="Know what's shared. Stay in control." onBack={() => router.dismissTo("/settings")}>
    {loading ? <LoadingState /> : <><View style={themed({ gap: 12 })}>
      <SettingsCard title="Your personal details" subtitle="We use account details to manage access and fulfil bookings." icon="person" onPress={() => router.push("/personal-information")} />
      <SettingsCard title={"Location \u00b7 Optional"} subtitle="Used to find nearby services. Manual address entry is always available." icon="pin" onPress={() => router.push("/addresses")} />
      <SettingsCard title="Notifications" subtitle="Choose how to receive booking updates." icon="bell" onPress={() => router.push("/settings/notifications")} />
      <SettingsCard title="Terms & privacy" subtitle="Read how information is used." icon="lock" placeholder />
    </View><Text style={themed(styles.hint)}>Device permissions can also be changed in your phone&apos;s Settings.</Text></>}
  </Page>;
}
