import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "@/api/client";
import { Button, Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    try {
      await api.post("/auth/forgot-password", { email });
      setMessage(
        "If an account exists, reset instructions have been sent. Check the server console for the simulated token.",
      );
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to submit request.");
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
        Forgot password?
      </Text>
      <Text style={{ color: "#747B90", marginVertical: 12 }}>
        Enter your email and we will generate a reset token.
      </Text>
      <ErrorText>{error}</ErrorText>
      {message ? (
        <Text style={{ color: "#0F9D8A", marginBottom: 18 }}>{message}</Text>
      ) : (
        <>
          <Input
            placeholder="Email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Button
            onPress={() => {
              void submit();
            }}
          >
            Send reset token
          </Button>
        </>
      )}
      <Text
        onPress={() => router.push("/auth/reset-password")}
        style={{ color: "#5B3DF5", fontWeight: "800", marginTop: 20 }}
      >
        I have a token
      </Text>
    </View>
  );
}
