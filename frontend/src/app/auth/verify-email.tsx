import { resendVerification, verifyEmail } from "@/api/auth";
import ErrorText from "@/components/ErrorText";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { SafeAreaView, Text, TextInput, View } from "react-native";

export default function VerifyEmail() {
  const { user, loading } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  if (!loading && !user) return <Redirect href="/auth/login" />;

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit verification code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await verifyEmail(code);
      router.replace("/");
    } catch (failure: any) {
      setError(
        failure.response?.data?.message ||
          "Invalid or expired verification code.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    setResent(false);
    try {
      const response = await resendVerification();
      setCode(response.data.data.verificationCode || "");
      setResent(true);
    } catch (failure: any) {
      setError(
        failure.response?.data?.message ||
          "Unable to resend the verification code.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7FD" }}>
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
          padding: 22,
          gap: 16,
        }}
      >
        <Text
          style={{
            color: "#633CFF",
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 2,
          }}
        >
          VERIFY YOUR EMAIL
        </Text>
        <Text style={{ color: "#242E49", fontSize: 30, fontWeight: "800" }}>
          One last step.
        </Text>
        <Text style={{ color: "#7C879F", fontSize: 15, lineHeight: 23 }}>
          Enter the six-digit code sent to {user?.email}.
        </Text>
        <TextInput
          value={code}
          onChangeText={(value) =>
            setCode(value.replace(/\D/g, "").slice(0, 6))
          }
          keyboardType="number-pad"
          maxLength={6}
          editable={!busy}
          placeholder="000000"
          placeholderTextColor="#8890A5"
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E6EAF3",
            borderRadius: 15,
            minHeight: 56,
            paddingHorizontal: 16,
            color: "#242E49",
            fontSize: 24,
            letterSpacing: 6,
          }}
          accessibilityLabel="Email verification code"
        />
        <ErrorText>{error}</ErrorText>
        {resent && (
          <Text style={{ color: "#278B70" }}>
            A new verification code was generated.
          </Text>
        )}
        <Button disabled={busy} onPress={() => void submit()}>
          {busy ? "Checking..." : "Verify email"}
        </Button>
        <Button secondary disabled={busy} onPress={() => void resend()}>
          Resend code
        </Button>
      </View>
    </SafeAreaView>
  );
}
