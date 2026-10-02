import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import CustomerHome from "@/components/customer/CustomerHome";
export default function HomeScreen() {
  const { user, loading, logout } = useAuth();
  useEffect(() => {
    if (!loading && !user) router.replace("/onboarding/landing");
  }, [loading, user]);
  if (loading || !user)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#5B3DF5" />
      </View>
    );
  if (user.role === "customer") return <CustomerHome />;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F7F7FB",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#0F9D8A", fontWeight: "900", letterSpacing: 1 }}>
        HOME SERVICE
      </Text>
      <Text
        style={{
          color: "#25213D",
          fontSize: 30,
          fontWeight: "900",
          marginTop: 8,
        }}
      >
        Welcome, {user.fullName}
      </Text>
      <Card>
        <Text style={{ color: "#747B90" }}>{user.email}</Text>
        <Text
          style={{
            color: user.emailVerified ? "#0F9D8A" : "#F29D38",
            fontWeight: "800",
            marginTop: 12,
          }}
        >
          {user.emailVerified ? "Email verified" : "Email not verified"}
        </Text>
      </Card>
      {!user.emailVerified && (
        <Button onPress={() => router.push("/auth/verify-email")}>
          Verify email
        </Button>
      )}
      <View style={{ height: 12 }} />
      <Button secondary onPress={() => router.push("/profile")}>
        My profile
      </Button>
      <View style={{ height: 12 }} />
      <Button secondary onPress={() => router.push("/auth/change-password")}>
        Change password
      </Button>
      <View style={{ height: 12 }} />
      <Button secondary onPress={() => router.push("/bookings")}>
        My bookings
      </Button>
      {user.role === "admin" ? (
        <>
          <View style={{ height: 12 }} />
          <Button secondary onPress={() => router.push("/admin/dashboard")}>
            Admin dashboard
          </Button>
        </>
      ) : null}
      <View style={{ height: 12 }} />
      <Button
        secondary
        onPress={() => {
          void logout();
        }}
      >
        Log out
      </Button>
    </View>
  );
}
