import { useCallback, useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { getTicket, saveTicket } from "@/api/support";
import { useSupportData } from "@/hooks/useSupportData";
import { useSupportMutation } from "@/hooks/useSupportMutation";
import { emptySupport, supportCategories, validateSupport, type SupportDraft } from "@/validation/support";
import { LoadingState } from "@/components/DataState";
import { Input } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
import { AddressPage as Page, AddressButton as Button, addressStyles as styles } from "@/components/address/AddressUI";
export default function SupportFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const loader = useCallback(async (signal: AbortSignal) => id !== undefined ? getTicket(id, signal) : { ...emptySupport(), status: "pending" }, [id]);
  const state = useSupportData(loader);
  if (!state.authLoading && !state.user) return <Redirect href="/auth/login" />;
  if (state.data && !state.loading && !state.error && state.user?.role === "customer") {
    if (state.data.status === "pending") return <SupportForm key={`${id || "new"}:${state.user.id}`} initial={state.data} id={id} />;
    return <Page title="Support request" subtitle="Only pending requests can be edited." onBack={() => router.dismissTo("/support")}><Button title="View request" onPress={() => router.replace({ pathname: "/support/details", params: { id: id! } })} /></Page>;
  }
  return <Page title={id ? "Edit request" : "Create support request"} subtitle="A few details help us understand the issue." onBack={() => router.dismissTo("/support")}>
    {state.user && state.user.role !== "customer" ? <ErrorText>Support requests are available to customer accounts.</ErrorText> : state.loading ? <LoadingState /> : <><ErrorText>{state.error}</ErrorText><Button title={state.expired ? "Sign in" : "Try again"} onPress={() => state.expired ? router.replace("/auth/login") : void state.load()} /></>}
  </Page>;
}
function SupportForm({ initial, id }: { initial: SupportDraft; id?: string }) {
  const [draft, setDraft] = useState<SupportDraft>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof SupportDraft, boolean>>>({});
  const mutation = useSupportMutation();
  const errors = validateSupport(draft);
  const change = (key: keyof SupportDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setTouched((current) => ({ ...current, [key]: true }));
    mutation.setFields((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    setTouched({ category: true, subject: true, description: true });
    if (!Object.keys(errors).length) void mutation.run((signal) => saveTicket(draft, id, signal), id ? "updated" : "created");
  };
  return <Page title={id ? "Edit request" : "Create support request"} subtitle="A few details help us understand the issue." busy={mutation.busy} onBack={() => router.dismissTo("/support")}>
    <Text style={styles.label}>Category</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      {supportCategories.map((category) => <Pressable key={category} accessibilityRole="radio" accessibilityState={{ checked: draft.category === category, disabled: mutation.busy }} disabled={mutation.busy} onPress={() => change("category", category)} style={{ padding: 12, borderRadius: 16, backgroundColor: draft.category === category ? "#633CFF" : "#EDE7FF" }}><Text style={{ color: draft.category === category ? "white" : "#633CFF" }}>{category}</Text></Pressable>)}
    </View>
    <ErrorText>{mutation.fields.category || (touched.category ? errors.category : undefined)}</ErrorText>
    {(["subject", "description"] as const).map((key) => <View key={key} style={styles.field}>
      <Text style={styles.label}>{key === "subject" ? "Subject" : "Description"}</Text>
      <Input accessibilityLabel={key === "subject" ? "Subject" : "Description"} value={draft[key]} editable={!mutation.busy} multiline={key === "description"} textAlignVertical={key === "description" ? "top" : "center"}
        style={[styles.input, key === "description" && { minHeight: 160 }, (mutation.fields[key] || touched[key] && errors[key]) && styles.invalid]}
        onChangeText={(value) => change(key, value)} onBlur={() => setTouched((current) => ({ ...current, [key]: true }))} />
      <ErrorText>{mutation.fields[key] || (touched[key] ? errors[key] : undefined)}</ErrorText>
    </View>)}
    <ErrorText>{mutation.error}</ErrorText>
    {mutation.expired && <Button secondary title="Sign in" onPress={() => router.replace("/auth/login")} />}
    <View style={styles.footer}><Button title={id ? "Save changes" : "Submit request"} busy={mutation.busy} disabled={mutation.expired || Object.keys(errors).length > 0 || Object.values(mutation.fields).some(Boolean)} onPress={submit} /></View>
  </Page>;
}
