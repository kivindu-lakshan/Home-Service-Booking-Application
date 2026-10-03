import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import CustomerHome from "@/components/customer/CustomerHome";
import { LoadingState } from "@/components/DataState";

export default function HomeScreen() {
<<<<<<< HEAD
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/login" />;
  if (user.role === "customer") return <CustomerHome />;
  if (user.role === "provider") return <Redirect href="/provider/dashboard" />;
  if (user.role === "admin") return <Redirect href="/admin/home" />;
  return <Redirect href="/auth/login" />;
=======
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
>>>>>>> origin-02/feature/payment,review,admin
}
