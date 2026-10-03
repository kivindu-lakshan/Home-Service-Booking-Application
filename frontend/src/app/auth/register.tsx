import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
import { addressStyles } from "@/components/address/AddressUI";
import {
  AuthPage,
  AuthField,
  AuthButton,
  AuthFooter,
  AuthLink,
} from "@/components/auth/AuthUI";
import ErrorText from "@/components/ErrorText";
import {
  validateRegistration,
  type RegistrationDraft,
  type AuthErrors,
} from "@/validation/auth";
import { authError } from "@/api/auth-error";

export default function Register() {
  const params = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<"customer" | "provider">(
    params.role === "provider" ? "provider" : "customer",
  );
  const { register } = useAuth();
  const themed = useAccountStyles();
  const [form, setForm] = useState<RegistrationDraft>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<AuthErrors>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const update = (key: keyof RegistrationDraft, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    setError("");
    const errors = validateRegistration(next);
    setFields((current) => ({
      ...current,
      [key]: errors[key],
      ...(key === "password" && next.confirm ? { confirm: errors.confirm } : {}),
    }));
  };

  const submit = async () => {
    if (lock.current) return;
    const invalid = validateRegistration(form);
    setFields(invalid);
    setError("");
    if (Object.keys(invalid).length) return;

    lock.current = true;
    setBusy(true);
    try {
      await register(
        form.fullName.trim(),
        form.email.trim().toLowerCase(),
        form.phone.trim(),
        form.password,
        role,
      );
    } catch (failure) {
      const details = authError(
        failure,
        "Unable to create account. Please try again.",
      );
      setError(details.message);
      setFields(details.fields);
      return;
    } finally {
      lock.current = false;
      setBusy(false);
    }
    router.replace("/");
  };

  return (
    <AuthPage
      afterAuth="/"
      title={"Your home journey\nstarts here."}
      subtitle="Create your HomeHalo account."
      back="/onboarding/account-type"
      busy={busy}
    >
      <AuthField
        label="Full name"
        value={form.fullName}
        editable={!busy}
        autoComplete="name"
        textContentType="name"
        error={fields.fullName}
        onChangeText={(value) => update("fullName", value)}
      />
      <AuthField
        label="Email address"
        value={form.email}
        editable={!busy}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={fields.email}
        onChangeText={(value) => update("email", value)}
      />
      <AuthField
        label="Phone number"
        value={form.phone}
        editable={!busy}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={fields.phone}
        onChangeText={(value) => update("phone", value)}
      />
      <AuthField
        label="Password"
        value={form.password}
        editable={!busy}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        error={fields.password}
        onChangeText={(value) => update("password", value)}
      />
      <Text style={themed([addressStyles.hint, { marginTop: 0, marginBottom: 16 }])}>
        Use at least 8 characters, including a letter and a number.
      </Text>
      <AuthField
        label="Confirm password"
        value={form.confirm}
        editable={!busy}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        error={fields.confirm}
        onChangeText={(value) => update("confirm", value)}
      />
      <Text style={themed(addressStyles.label)}>Register as</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Register as"
        style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}
      >
        {(["customer", "provider"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={
              value === "customer" ? "Customer" : "Service Provider"
            }
            accessibilityState={{ checked: role === value, disabled: busy }}
            disabled={busy}
            onPress={() => setRole(value)}
            style={themed({
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: role === value ? "#633CFF" : "#EDE7FF",
            })}
          >
            <Text
              style={themed({
                color: role === value ? "#FFFFFF" : "#303B55",
                fontSize: 12,
                fontWeight: "800",
              })}
            >
              {value === "customer" ? "Customer" : "Service Provider"}
            </Text>
          </Pressable>
        ))}
      </View>
      <AuthLink title="Terms of service & privacy (coming soon)" disabled />
      <ErrorText>{error}</ErrorText>
      <AuthFooter>
        <AuthButton
          title="Agree & create account"
          busy={busy}
          onPress={() => void submit()}
        />
        <AuthLink
          title="Already have an account? Sign in"
          disabled={busy}
          onPress={() => router.replace("/auth/login")}
        />
      </AuthFooter>
    </AuthPage>
  );
}
