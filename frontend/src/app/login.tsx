import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { Button, Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
import { useAuth } from "@/context/AuthContext";
export default function Login() {
  const { login } = useAuth();
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
      await login(email, password);
      router.replace("/");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <Text style={styles.eyebrow}>HOME SERVICE</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to manage your account.</Text>
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
      <Text style={styles.link} onPress={() => router.push("/forgot-password")}>
        Forgot password?
      </Text>
      <Button
        onPress={() => {
          void submit();
        }}
      >
        {busy ? <ActivityIndicator color="#FFF" /> : "Sign in"}
      </Button>
      <Text style={styles.footer}>
        New here?{" "}
        <Text style={styles.link} onPress={() => router.push("/register")}>
          Create account
        </Text>
      </Text>
    </KeyboardAvoidingView>
  );
}
const styles = {
  page: {
    flex: 1,
    backgroundColor: "#F7F7FB",
    padding: 24,
    justifyContent: "center" as const,
  },
  eyebrow: { color: "#0F9D8A", fontWeight: "900" as const, letterSpacing: 1.5 },
  title: {
    color: "#25213D",
    fontSize: 32,
    fontWeight: "900" as const,
    marginTop: 8,
  },
  subtitle: { color: "#747B90", marginVertical: 10 },
  link: { color: "#5B3DF5", fontWeight: "800" as const, marginBottom: 18 },
  footer: { color: "#747B90", textAlign: "center" as const, marginTop: 20 },
};
