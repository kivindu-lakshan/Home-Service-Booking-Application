import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "@/api/client";
import { Button, Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
export default function ChangePassword() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    if (newPassword !== confirm) return setError("Passwords do not match.");
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setMessage("Password changed.");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to change password.");
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
        Change password
      </Text>
      <ErrorText>{error}</ErrorText>
      {message ? (
        <Text style={{ color: "#0F9D8A", marginBottom: 16 }}>{message}</Text>
      ) : null}
      <Input
        placeholder="Current password"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrent}
      />
      <Input
        placeholder="New password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNew}
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
        Change password
      </Button>
    </View>
  );
}
