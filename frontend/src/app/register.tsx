import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Button, Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
import { useAuth } from "@/context/AuthContext";
export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key: string, value: string) =>
    setForm({ ...form, [key]: value });
  const submit = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.password)
      return setError("Complete all fields.");
    if (
      !/[A-Za-z]/.test(form.password) ||
      !/[0-9]/.test(form.password) ||
      form.password.length < 8
    )
      return setError(
        "Password must be at least 8 characters and include a letter and a number.",
      );
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    setBusy(true);
    try {
      await register(form.fullName, form.email, form.phone, form.password);
      router.replace("/");
    } catch (e: any) {
      const details = e.response?.data?.data;
      setError(
        Array.isArray(details)
          ? details.map((item) => item.msg).join(" ")
          : e.response?.data?.message || "Unable to create account.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 24,
        backgroundColor: "#F7F7FB",
        flexGrow: 1,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 30,
          fontWeight: "900",
          color: "#25213D",
          marginBottom: 8,
        }}
      >
        Create account
      </Text>
      <Text style={{ color: "#747B90", marginBottom: 18 }}>
        Your home service journey starts here.
      </Text>
      <ErrorText>{error}</ErrorText>
      {[
        ["fullName", "Full name"],
        ["email", "Email"],
        ["phone", "Phone"],
        ["password", "Password"],
        ["confirm", "Confirm password"],
      ].map(([key, placeholder]) => (
        <Input
          key={key}
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          secureTextEntry={key === "password" || key === "confirm"}
          autoCapitalize={key === "email" ? "none" : "sentences"}
          value={form[key as keyof typeof form]}
          onChangeText={(v) => update(key, v)}
        />
      ))}
      <Button
        onPress={() => {
          void submit();
        }}
      >
        {busy ? "Creating..." : "Create account"}
      </Button>
    </ScrollView>
  );
}
