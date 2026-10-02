import { authError } from "@/api/auth-error";
import { AuthButton, AuthField, AuthFooter, AuthLink, AuthPage } from "@/components/auth/AuthUI";
import ErrorText from "@/components/ErrorText";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { useRef, useState } from "react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const submit = async () => {
    if (lock.current) return;
    const nextFields: typeof fields = {};
    if (!email.trim()) nextFields.email = "Email is required.";
    if (!password) nextFields.password = "Password is required.";
    setFields(nextFields);
    setError("");
    if (Object.keys(nextFields).length) return;
    lock.current = true;
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/");
    } catch (failure) {
      const details = authError(failure, "Unable to sign in. Please try again.");
      setError(details.message);
      setFields(details.fields);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthPage
      title={"Welcome\nhome again."}
      subtitle="Your next helping hand is a tap away."
      back="/onboarding/landing"
      busy={busy}
    >
      <AuthField label="Email address" value={email} editable={!busy} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={fields.email} onChangeText={(value) => { setEmail(value); setFields((current) => ({ ...current, email: undefined })); }} />
      <AuthField label="Password" value={password} editable={!busy} password autoComplete="current-password" textContentType="password" error={fields.password} onChangeText={(value) => { setPassword(value); setFields((current) => ({ ...current, password: undefined })); }} />
      <AuthLink title="Forgot password?" disabled={busy} onPress={() => router.push("/auth/forgot-password")} />
      <ErrorText>{error}</ErrorText>
      <AuthFooter>
        <AuthButton title="Sign In" busy={busy} onPress={() => void submit()} />
        <AuthButton title="Create an account" secondary disabled={busy} onPress={() => router.push("/auth/register")} />
      </AuthFooter>
    </AuthPage>
  );
}
