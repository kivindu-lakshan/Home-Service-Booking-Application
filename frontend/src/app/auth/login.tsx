import ErrorText from "@/components/ErrorText";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { BriefcaseBusiness, ShieldCheck, UserRound } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";

type Role = "customer" | "provider" | "admin";
const roles: { id: Role; label: string; icon: typeof UserRound }[] = [
  { id: "customer", label: "Sign in as customer", icon: UserRound },
  { id: "provider", label: "Sign in as provider", icon: BriefcaseBusiness },
  { id: "admin", label: "Sign in as admin", icon: ShieldCheck },
];
const colors = {
  navy: "#1A1A2E",
  purple: "#5B3DF5",
  border: "#D1D1D6",
  gold: "#FBBF24",
  white: "#FFFFFF",
  muted: "#8E8E9A",
};

export default function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError("");
    if (!email || !password)
      return setError("Email and password are required.");
    setBusy(true);
    try {
      await login(email, password, role);
      router.replace("/");
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          "Invalid credentials for the selected account type.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <View style={styles.brand}>
        <ShieldCheck size={22} color={colors.gold} />
        <Text style={styles.eyebrow}>HOME SERVICE</Text>
      </View>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Choose your account type to continue.</Text>
      <View style={styles.roleList}>
        {roles.map(({ id, label, icon: Icon }) => (
          <Pressable
            key={id}
            onPress={() => setRole(id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: role === id }}
            style={[styles.role, role === id && styles.roleActive]}
          >
            <Icon size={20} color={role === id ? colors.white : colors.navy} />
            <Text
              style={[styles.roleText, role === id && styles.roleTextActive]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      <Input
        accessibilityLabel="Email"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        accessibilityLabel="Password"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Text
        style={styles.link}
        onPress={() => router.push("/auth/forgot-password")}
      >
        Forgot password?
      </Text>
      <Button
        onPress={() => {
          void submit();
        }}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          `Sign in as ${role}`
        )}
      </Button>
      <Text style={styles.footer}>
        New here?{" "}
        <Text style={styles.link} onPress={() => router.push("/auth/register")}>
          Create account
        </Text>
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = {
  page: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 24,
    justifyContent: "center" as const,
  },
  brand: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  eyebrow: {
    color: colors.navy,
    fontWeight: "900" as const,
    letterSpacing: 1.5,
  },
  title: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: "900" as const,
    marginTop: 12,
  },
  subtitle: { color: colors.muted, marginVertical: 10 },
  roleList: { gap: 8, marginVertical: 16 },
  role: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  roleActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  roleText: { color: colors.navy, fontWeight: "800" as const },
  roleTextActive: { color: colors.white },
  link: { color: colors.purple, fontWeight: "800" as const, marginBottom: 18 },
  footer: { color: colors.muted, textAlign: "center" as const, marginTop: 20 },
};
