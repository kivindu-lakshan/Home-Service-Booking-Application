import { useCallback, useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Modal, Text, View } from "react-native";
import { cancelTicket, getTicket, statusLabels } from "@/api/support";
import { useSupportData } from "@/hooks/useSupportData";
import { useSupportMutation } from "@/hooks/useSupportMutation";
import { LoadingState } from "@/components/DataState";
import { Card } from "@/components/ui";
import ErrorText from "@/components/ErrorText";
import { AddressPage as Page, AddressButton as Button, addressStyles as styles } from "@/components/address/AddressUI";
export default function SupportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const loader = useCallback((signal: AbortSignal) => getTicket(id || "invalid", signal), [id]);
  const state = useSupportData(loader);
  const mutation = useSupportMutation();
  const [confirm, setConfirm] = useState(false);
  if (!state.authLoading && !state.user) return <Redirect href="/auth/login" />;
  const ticket = state.data;
  return <Page title="Support request" subtitle="Your request details and current status." busy={mutation.busy} onBack={() => router.dismissTo("/support")}>
    {state.user && state.user.role !== "customer" ? <ErrorText>Support requests are available to customer accounts.</ErrorText> : state.loading ? <LoadingState /> : state.error ? <><ErrorText>{state.error}</ErrorText><Button title={state.expired ? "Sign in" : "Try again"} onPress={() => state.expired ? router.replace("/auth/login") : void state.load()} /></> : ticket && <>
      <Card><Text style={styles.label}>{ticket.subject}</Text><Text>{ticket.category}</Text><Text style={styles.hint}>{statusLabels[ticket.status]} ? {new Date(ticket.createdAt).toLocaleDateString()}</Text><Text style={{ marginTop: 20, lineHeight: 24, color: "#303B55" }}>{ticket.description}</Text></Card>
      <ErrorText>{mutation.error}</ErrorText>
      {mutation.expired ? <Button title="Sign in" onPress={() => router.replace("/auth/login")} /> : ticket.status === "pending" ? <View style={styles.footer}>
        <Button title="Edit request" disabled={mutation.busy} onPress={() => router.push({ pathname: "/support/form", params: { id: ticket._id } })} />
        <Button title="Cancel request" secondary disabled={mutation.busy} onPress={() => setConfirm(true)} />
      </View> : <Text style={styles.hint}>This request is {statusLabels[ticket.status].toLowerCase()} and can no longer be edited or cancelled.</Text>}
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => { if (!mutation.busy) setConfirm(false); }}>
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 24 }}><View accessibilityViewIsModal style={{ backgroundColor: "#F7F7FD", borderRadius: 24, padding: 24, gap: 16 }}>
          <Text accessibilityRole="header" style={styles.label}>Cancel this request?</Text><Text>Your request will remain in your history as Cancelled. You cannot edit or reopen it.</Text>
          <Button title="Keep request" secondary disabled={mutation.busy} onPress={() => setConfirm(false)} />
          <Button title="Confirm cancellation" danger busy={mutation.busy} onPress={() => { void mutation.run((signal) => cancelTicket(ticket._id, signal), "cancelled").finally(() => setConfirm(false)); }} />
        </View></View>
      </Modal>
    </>}
  </Page>;
}
