import { Button, Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { ShieldCheck, UserRound } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function AdminProfile() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.replace("/auth/login");
    }
  }, [loading, user]);

  if (loading || !user || user.role !== "admin") return null;

  return (
    <View style={styles.page}>
      <View style={styles.avatar}>
        <UserRound size={34} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>{user.fullName}</Text>
      <Text style={styles.subtitle}>Administrator account</Text>
      <Card>
        <View style={styles.detailRow}>
          <ShieldCheck size={20} color="#5B3DF5" />
          <View>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <ShieldCheck size={20} color="#0F9D8A" />
          <View>
            <Text style={styles.label}>Account status</Text>
            <Text style={styles.value}>Active administrator</Text>
          </View>
        </View>
      </Card>
      <Button
        secondary
        onPress={() => {
          void logout().then(() => router.replace("/auth/login"));
        }}
      >
        Log out
      </Button>
    </View>
  );
}

const styles = {
  page: {
    flex: 1,
    backgroundColor: "#F7F7FB",
    padding: 24,
    alignItems: "center" as const,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#5B3DF5",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 18,
  },
  title: {
    color: "#25213D",
    fontSize: 26,
    fontWeight: "900" as const,
    marginTop: 14,
  },
  subtitle: { color: "#747B90", marginTop: 4, marginBottom: 22 },
  detailRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 18,
  },
  label: { color: "#747B90", fontSize: 12 },
  value: { color: "#25213D", fontWeight: "800" as const, marginTop: 3 },
};
