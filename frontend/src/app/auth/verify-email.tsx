import { useRef, useState } from "react";
import { Redirect, router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { AddressPage, AddressNotice, addressStyles } from "@/components/address/AddressUI";
import { AuthButton, AuthField, AuthFooter, AuthLink } from "@/components/auth/AuthUI";
import { AccountText as Text } from "@/components/settings/AccountText";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { LoadingState } from "@/components/DataState";
import { authError } from "@/api/auth-error";
export default function VerifyEmail() {
  const { user, loading, verificationCode, verifyEmail, resendVerification } = useAuth();
  const themed = useAccountStyles();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const perform = async (resend: boolean) => {
    if (lock.current) return;
    setError(""); setMessage("");
    if (!resend && !/^[0-9]{6}$/.test(code.trim())) { setError("Enter a 6-digit verification code."); return; }
    lock.current = true; setBusy(true);
    try {
      if (resend) { await resendVerification(); setCode(""); setMessage("New demo code generated. Previous codes no longer work."); }
      else { await verifyEmail(code.trim()); router.replace("/"); }
    } catch (failure) { setError(authError(failure, "Unable to verify. Please try again.").message); }
    finally { lock.current = false; setBusy(false); }
  };
  if (loading) return <LoadingState label="Checking your session..." />;
  if (!user) return <Redirect href="/auth/login" />;
  if (user.emailVerified) return <Redirect href="/" />;
  return <AddressPage title="Verify your email" subtitle="Enter the 6-digit verification code." busy={busy} onBack={() => router.replace("/")}>
    <AddressNotice>This is a student demo. No email is sent, and this does not prove ownership of your email address.</AddressNotice>
    <Text style={themed([addressStyles.label, { marginTop: 20, marginBottom: 20 }])}>
      {verificationCode ? `Demo verification code: ${verificationCode}` : "Tap Resend code to generate and display a new demo code."}
    </Text>
    <AuthField label="6-digit code" value={code} onChangeText={(value) => { setCode(value); setError(""); }}
      keyboardType="number-pad" maxLength={6} autoCapitalize="none" autoCorrect={false} editable={!busy} error={error} placeholder="123456" />
    {!!message && <AddressNotice>{message}</AddressNotice>}
    <Text style={themed(addressStyles.hint)}>Codes expire after 24 hours. After refreshing this page, use Resend code to display a new one.</Text>
    <AuthFooter>
      <AuthButton title="Verify email" busy={busy} onPress={() => void perform(false)} />
      <AuthLink title="Didn't receive a code? Resend code" disabled={busy} onPress={() => void perform(true)} />
    </AuthFooter>
  </AddressPage>;
}
