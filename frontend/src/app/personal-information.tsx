import { useAccountStyles } from "@/context/AccountThemeContext";
import { useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Redirect, router, useFocusEffect } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMyProfile, updateMyProfile, type MyProfile } from "@/api/profile";
import { Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { normalizeProfilePhone, profilePhoneForForm, validateProfileFields } from "@/validation/profile";

type FieldErrors = { fullName?: string; phone?: string };
type ApiError = { message?: string; data?: { path?: string; msg?: string }[] };

export default function PersonalInformationScreen() {
  const themed = useAccountStyles();
  const { user, loading: authLoading, syncProfile } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const request = useRef<AbortController | null>(null);
  const savingLock = useRef(false);
  const clientErrors = validateProfileFields(fullName, phone);
  const nameError = fieldErrors.fullName || clientErrors.fullName;
  const phoneError = fieldErrors.phone || clientErrors.phone;
  const formInvalid = Boolean(nameError || phoneError);

  const loadProfile = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    savingLock.current = false;
    setSaving(false);
    setLoading(true);
    setError("");
    setSessionExpired(false);
    setFieldErrors({});
    try {
      const current = await getMyProfile(controller.signal);
      if (controller.signal.aborted) return;
      setProfile(current);
      setFullName(current.fullName);
      setPhone(profilePhoneForForm(current.phone || ""));
    } catch (failure) {
      if (controller.signal.aborted) return;
      setProfile(null);
      const expired = isAxiosError(failure) && failure.response?.status === 401;
      setSessionExpired(expired);
      setError(expired
        ? "Your session has expired. Please sign in again."
        : "Unable to load your details. Check your connection and try again.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (authLoading || !userId) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void loadProfile();
    });
    return () => {
      active = false;
      request.current?.abort();
    };
  }, [authLoading, userId, loadProfile]));

  const save = async () => {
    if (savingLock.current || loading || !profile || sessionExpired) return;
    const name = fullName.trim();
    const number = normalizeProfilePhone(phone);
    const errors = validateProfileFields(fullName, phone);
    setFieldErrors(errors);
    setError("");
    if (Object.keys(errors).length) return;

    // A synchronous lock also blocks a second tap before React renders disabled state.
    savingLock.current = true;
    setSaving(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const updated = await updateMyProfile({ fullName: name, phone: number }, controller.signal);
      if (controller.signal.aborted) return;
      syncProfile(updated);
      router.dismissTo({ pathname: "/profile", params: { updated: "1" } });
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isAxiosError<ApiError>(failure)) {
        if (failure.response?.status === 401) {
          setSessionExpired(true);
          setError("Your session has expired. Please sign in again.");
        } else if (failure.response?.status === 400 || failure.response?.status === 422) {
          const details = failure.response.data?.data;
          const errors: FieldErrors = {};
          if (Array.isArray(details)) {
            for (const detail of details) {
              if ((detail.path === "fullName" || detail.path === "phone") && typeof detail.msg === "string") {
                errors[detail.path] = detail.msg;
              }
            }
          }
          setFieldErrors(errors);
          setError("Please check your details and try again.");
        } else {
          setError(failure.response
            ? "Unable to save your changes right now. Please try again."
            : "We couldn't confirm the save. Check your connection, then try again or reopen your profile to check.");
        }
      } else {
        setError("Unable to save your changes. Please try again.");
      }
    } finally {
      if (request.current === controller) {
        savingLock.current = false;
        if (!controller.signal.aborted) setSaving(false);
      }
    }
  };

  if (!authLoading && !user) return <Redirect href="/auth/login" />;

  return (
    <SafeAreaView style={themed(styles.safeArea)}>
      <KeyboardAvoidingView style={themed(styles.page)} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel="Back to My Profile"
            disabled={saving} accessibilityState={{ disabled: saving }}
            onPress={() => router.dismissTo("/profile")}
            style={themed(({ pressed }) => [styles.back, (pressed || saving) && styles.disabled])}>
            <Text style={themed(styles.backArrow)}>‹</Text>
          </Pressable>
          <Text style={themed(styles.title)} accessibilityRole="header">Personal information</Text>
          <Text style={themed(styles.subtitle)}>A few details that make this space yours.</Text>

          {authLoading || loading ? (
            <View style={themed(styles.loading)} accessibilityLiveRegion="polite">
              <ActivityIndicator color={themed({ color: "#633CFF" }).color} />
              <Text style={themed(styles.hint)}>Loading your details...</Text>
            </View>
          ) : !profile ? (
            <View style={themed(styles.form)}>
              <ErrorText>{error}</ErrorText>
              <Pressable accessibilityRole="button" style={themed(styles.saveButton)}
                onPress={() => sessionExpired ? router.replace("/auth/login") : void loadProfile()}>
                <Text style={themed(styles.saveText)}>{sessionExpired ? "Sign in" : "Try again"}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={themed(styles.profileCard)}>
                <ProfileAvatar key={`${profile.id}:${profile.avatarUrl}`} profile={profile} />
                <View style={themed(styles.identity)}>
                  <Text style={themed(styles.name)}>{profile.fullName}</Text>
                  <Text style={themed(styles.hint)}>Your profile photo</Text>
                </View>
              </View>

              <View style={themed(styles.form)}>
                <Text style={themed(styles.label)}>Full name</Text>
                <Input accessibilityLabel="Full name" value={fullName}
                  editable={!saving && !sessionExpired} autoComplete="name" autoCapitalize="words"
                  style={themed([styles.input, !!nameError && styles.invalid])}
                  onChangeText={(value) => {
                    setFullName(value);
                    setFieldErrors((current) => ({ ...current, fullName: undefined }));
                    setError("");
                  }} />
                <ErrorText>{nameError}</ErrorText>

                <Text style={themed(styles.label)}>Email address</Text>
                <View style={themed(styles.readOnly)}>
                  <Text selectable style={themed(styles.email)} accessibilityLabel={`Email address, read only: ${profile.email}`}>{profile.email}</Text>
                </View>
                <Text style={themed(styles.help)}>Your sign-in email is read-only.</Text>

                <Text style={themed(styles.label)}>Phone number</Text>
                <Input accessibilityLabel="Phone number" value={phone}
                  editable={!saving && !sessionExpired} keyboardType="phone-pad" autoComplete="tel"
                  placeholder="e.g. 0771234567"
                  style={themed([styles.input, !!phoneError && styles.invalid])}
                  onChangeText={(value) => {
                    setPhone(value);
                    setFieldErrors((current) => ({ ...current, phone: undefined }));
                    setError("");
                  }} />
                <ErrorText>{phoneError}</ErrorText>
                <Text style={themed(styles.help)}>Use a 10-digit Sri Lankan mobile number starting with 07. Spaces are removed when saving.</Text>

                <ErrorText>{error}</ErrorText>
                {sessionExpired ? (
                  <Pressable accessibilityRole="button" style={themed(styles.saveButton)} onPress={() => router.replace("/auth/login")}>
                    <Text style={themed(styles.saveText)}>Sign in again</Text>
                  </Pressable>
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel={saving ? "Saving changes" : "Save changes"}
                    accessibilityState={{ disabled: saving || formInvalid, busy: saving }} disabled={saving || formInvalid}
                    onPress={() => void save()}
                    style={themed(({ pressed }) => [styles.saveButton, (saving || formInvalid || pressed) && styles.disabled])}>
                    {saving && <ActivityIndicator color={themed({ color: "#FFFFFF" }).color} />}
                    <Text style={themed(styles.saveText)}>{saving ? "Saving changes..." : "Save changes"}</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7FD" },
  page: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { padding: 22, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  backArrow: { color: "#8157FF", fontSize: 32, lineHeight: 36, marginTop: -3 },
  title: { color: "#242E49", fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: "#7C879F", fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 28 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#EDE7FF", borderRadius: 28, padding: 18, marginBottom: 20 },
  identity: { flex: 1, gap: 6 },
  name: { color: "#242E49", fontSize: 19, fontWeight: "800" },
  hint: { color: "#77829C", fontSize: 13, lineHeight: 20 },
  loading: { minHeight: 140, backgroundColor: "#EDE7FF", borderRadius: 28, alignItems: "center", justifyContent: "center", gap: 12 },
  form: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#E6EAF3" },
  label: { color: "#303B55", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  input: { backgroundColor: "#F7F7FD", borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#242E49", borderWidth: 1, borderColor: "#E6EAF3", marginBottom: 12 },
  invalid: { borderColor: "#C0392B" },
  readOnly: { backgroundColor: "#F0F0F6", borderRadius: 14, padding: 14, minHeight: 52, justifyContent: "center" },
  email: { color: "#66728C", fontSize: 16, lineHeight: 23 },
  help: { color: "#7C879F", fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 22 },
  saveButton: { minHeight: 52, borderRadius: 16, backgroundColor: "#633CFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, padding: 14 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
