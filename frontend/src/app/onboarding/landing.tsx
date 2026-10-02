import { Redirect, router } from "expo-router";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
import { ProfileIcon } from "@/components/profile/ProfileIcon";
import { LoadingState } from "@/components/DataState";
import { addressStyles as styles } from "@/components/address/AddressUI";
import { AuthButton, AuthFooter, AuthLink, HomeIllustration } from "@/components/auth/AuthUI";
export default function LandingScreen() {
  const { user, loading } = useAuth(); const themed = useAccountStyles();
  if (!loading && user) return <Redirect href="/" />;
  return <SafeAreaView style={themed(styles.safeArea)}><View style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    {loading ? <LoadingState label="Checking your session..." /> : <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 }}><ProfileIcon name="home" /><Text style={themed({ color: "#633CFF", fontSize: 23, fontWeight: "800" })}>HomeHalo</Text></View>
      <HomeIllustration /><Text accessibilityRole="header" style={themed([styles.title, { fontSize: 34, lineHeight: 42 }])}>{"Happy home.\nLess hassle."}</Text>
      <Text style={themed(styles.subtitle)}>Find trusted help for the little fixes and the big clean-ups.</Text>
      <AuthFooter><AuthButton title="Get started" onPress={() => router.push("/onboarding/welcome")} /><AuthLink title="Already a member? Sign in" onPress={() => router.push("/auth/login")} /></AuthFooter>
    </>}
  </ScrollView></View></SafeAreaView>;
}
