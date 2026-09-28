import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "@/api/client";
import { Button, Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    if (password !== confirm) return setError("Passwords do not match.");
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      router.replace("/login");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to reset password.");
    }
  };
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#F7F7FB",
      }}
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Reset password
      </Text>
      <Text style={{ color: "#747B90", marginVertical: 12 }}>
        Paste the token printed by the backend.
      </Text>
      <ErrorText>{error}</ErrorText>
      <Input placeholder="Reset token" value={token} onChangeText={setToken} />
      <Input
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Input
        placeholder="Confirm password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <Button
        onPress={() => {
          void submit();
        }}
      >
        Reset password
      </Button>
    </View>
  );
}
