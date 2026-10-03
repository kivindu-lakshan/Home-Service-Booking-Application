import { router } from "expo-router";
import { Image, ScrollView, Text } from "react-native";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
export default function RoleDashboard({ role }: { role: "admin" | "provider" }) {
  const { user, logout } = useAuth();
  return <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, gap: 16 }}>
    <Image source={require("../../../assets/images/homehalo-logo.png")} accessibilityLabel="HomeHalo logo" resizeMode="contain" style={{ width: 200, height: 120, alignSelf: "center" }} />
    <Text style={{ fontSize: 28, fontWeight: "800" }}>{role === "admin" ? "Admin Dashboard" : "Welcome Provider"}</Text>
    <Text>Welcome, {user?.fullName}</Text>
    <Card><Text>{role === "admin" ? "Admin" : "Provider"} navigation â€” more tools coming soon.</Text></Card>
    <Button secondary onPress={() => router.push("/profile")}>My profile</Button>
    <Button secondary onPress={() => router.push("/auth/change-password")}>Change password</Button>
    <Button secondary onPress={() => router.push("/bookings")}>My bookings</Button>
    {role === "admin" && <Button secondary onPress={() => router.push("/admin/provider-applications")}>Provider Applications</Button>}
    {role === "admin" && <Button secondary onPress={() => router.push("/admin/dashboard")}>Existing admin tools</Button>}
    <Button onPress={async () => { await logout(); router.replace("/auth/login"); }}>Log out</Button>
  </ScrollView>;
}
