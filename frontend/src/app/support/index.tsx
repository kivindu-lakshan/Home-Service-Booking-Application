import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { getTickets, statusLabels } from "@/api/support";
import { useSupportData } from "@/hooks/useSupportData";
import { EmptyState, LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { Card } from "@/components/ui";
import { AddressPage as Page, AddressButton as Button, AddressNotice as Notice, addressStyles as styles } from "@/components/address/AddressUI";
const messages: Record<string, string> = { created: "Your support request has been submitted.", updated: "Your support request has been updated.", cancelled: "Your support request has been cancelled." };
export default function SupportScreen() {
  const state = useSupportData(getTickets);
  const { result } = useLocalSearchParams<{ result?: string }>();
  if (!state.authLoading && !state.user) return <Redirect href="/auth/login" />;
  const open = (id?: string) => { router.setParams({ result: undefined }); router.push(id ? { pathname: "/support/details", params: { id } } : "/support/form"); };
  return <Page title="Help & support" subtitle="We're here to help. Tell us what you need." onBack={() => router.dismissTo("/profile")}>
    {result && messages[result] && <Notice>{messages[result]}</Notice>}
    {state.user && state.user.role !== "customer" ? <ErrorText>Support requests are available to customer accounts.</ErrorText> : <>
      <Button title="Create support request" disabled={state.authLoading || state.expired} onPress={() => open()} />
      <Text accessibilityRole="header" style={[styles.label, { marginTop: 28, marginBottom: 16 }]}>My requests</Text>
      {state.loading ? <LoadingState label="Loading your requests..." /> : state.error ? <View><ErrorText>{state.error}</ErrorText><Button secondary title={state.expired ? "Sign in" : "Try again"} onPress={() => state.expired ? router.replace("/auth/login") : void state.load()} /></View>
        : !state.data?.length ? <EmptyState label="No support requests yet. Create a request when you need a hand." />
        : state.data.map((ticket) => <Pressable key={ticket._id} accessibilityRole="button" accessibilityLabel={`View ${ticket.subject}`} onPress={() => open(ticket._id)}>
          <Card><Text style={styles.label}>{ticket.subject}</Text><Text>{ticket.category}</Text><Text style={styles.hint}>{statusLabels[ticket.status]} ? {new Date(ticket.createdAt).toLocaleDateString()}</Text></Card>
        </Pressable>)}
    </>}
  </Page>;
}
