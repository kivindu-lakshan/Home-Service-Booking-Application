import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "@/api/client";
import { Button, Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
import { useAuth } from "@/context/AuthContext";
export default function VerifyEmail() {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const verify = async () => {
    try {
      await api.post("/auth/verify-email", { token });
      setMessage("Email verified. Sign in again to refresh your session.");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to verify email.");
    }
  };
  const resend = async () => {
    try {
      await api.post("/auth/resend-verification");
      setMessage(
        `A new token was generated for ${user?.email}. Check the server console.`,
      );
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to resend token.");
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
        Verify your email
      </Text>
      <Text style={{ color: "#747B90", marginVertical: 12 }}>
        Paste the simulated token from the backend console.
      </Text>
      <ErrorText>{error}</ErrorText>
      {message ? (
        <Text style={{ color: "#0F9D8A", marginBottom: 16 }}>{message}</Text>
      ) : null}
      <Input
        placeholder="Verification token"
        value={token}
        onChangeText={setToken}
      />
      <Button
        onPress={() => {
          void verify();
        }}
      >
        Verify email
      </Button>
      <View style={{ height: 12 }} />
      <Button
        secondary
        onPress={() => {
          void resend();
        }}
      >
        Resend token
      </Button>
    </View>
  );
}
