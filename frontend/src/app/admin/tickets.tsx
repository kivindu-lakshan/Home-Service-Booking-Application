import {
    deleteTicketResponse,
    getAdminTickets,
    respondToTicket,
} from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { Button, Input } from "@/components/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<"in_progress" | "resolved">(
    "in_progress",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setTickets((await getAdminTickets()).data.data);
      setError("");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);
  const save = async (id: string) => {
    if (!response.trim()) return setError("Write a response first.");
    try {
      await respondToTicket(id, { adminResponse: response, status });
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to save response.");
    }
  };
  const remove = (id: string) =>
    Alert.alert(
      "Delete response?",
      "The customer will see the ticket as open again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTicketResponse(id);
            await load();
          },
        },
      ],
    );
  if (loading) return <LoadingState label="Loading support tickets..." />;
  if (error && !tickets.length)
    return <ErrorState onRetry={() => void load()} />;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Support tickets</Text>
      <Text style={styles.subtitle}>
        Resolve customer issues from one focused queue.
      </Text>
      <ErrorText>{error}</ErrorText>
      {!tickets.length ? (
        <EmptyState label="No customer tickets found." />
      ) : (
        tickets.map((ticket) => {
          const isEditing = editing === ticket._id;
          return (
            <View key={ticket._id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.subject}>{ticket.subject}</Text>
                <Text
                  style={[
                    styles.status,
                    ticket.status === "resolved" && styles.resolved,
                  ]}
                >
                  {ticket.status.replace("_", " ")}
                </Text>
              </View>
              <Text style={styles.customer}>
                {ticket.customer?.fullName || "Customer"}
              </Text>
              <Text style={styles.message}>{ticket.message}</Text>
              {isEditing ? (
                <>
                  <Input
                    placeholder="Write your response"
                    value={response}
                    onChangeText={setResponse}
                    multiline
                    style={{
                      minHeight: 90,
                      textAlignVertical: "top",
                      marginTop: 12,
                    }}
                  />
                  <View style={styles.editStatusRow}>
                    <Text
                      onPress={() => setStatus("in_progress")}
                      style={[
                        styles.action,
                        status !== "in_progress" && styles.inactiveAction,
                      ]}
                    >
                      In progress
                    </Text>
                    <Text
                      onPress={() => setStatus("resolved")}
                      style={[
                        styles.resolvedAction,
                        status !== "resolved" && styles.inactiveAction,
                      ]}
                    >
                      Resolved
                    </Text>
                  </View>
                  <Button onPress={() => void save(ticket._id)}>
                    Save response
                  </Button>
                </>
              ) : ticket.adminResponse ? (
                <Text style={styles.response}>
                  Response: {ticket.adminResponse}
                </Text>
              ) : (
                <Text style={styles.awaiting}>Awaiting response</Text>
              )}
              <View style={styles.actions}>
                <Text
                  onPress={() => {
                    setEditing(isEditing ? null : ticket._id);
                    setResponse(ticket.adminResponse || "");
                    setStatus(
                      ticket.status === "resolved" ? "resolved" : "in_progress",
                    );
                  }}
                  style={styles.action}
                >
                  {isEditing
                    ? "Cancel"
                    : ticket.adminResponse
                      ? "Edit response"
                      : "Reply"}
                </Text>
                {ticket.adminResponse ? (
                  <Text
                    onPress={() => remove(ticket._id)}
                    style={styles.deleteAction}
                  >
                    Delete response
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  content: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 34,
  },
  heading: {
    color: "#25213D",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "900",
    marginBottom: 7,
  },
  subtitle: {
    color: "#747B90",
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 10,
  },
  ticketCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 23,
    marginBottom: 18,
    shadowColor: "#25213D",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
  },
  subject: {
    color: "#25213D",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    flex: 1,
  },
  status: {
    color: "#F29D38",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    textTransform: "lowercase",
  },
  resolved: { color: "#0F9D8A" },
  customer: { color: "#747B90", fontSize: 16, marginTop: 8 },
  message: { color: "#25213D", fontSize: 16, lineHeight: 22, marginTop: 19 },
  response: { color: "#25213D", fontSize: 16, lineHeight: 22, marginTop: 18 },
  awaiting: { color: "#F29D38", fontSize: 16, lineHeight: 22, marginTop: 18 },
  actions: { flexDirection: "row", gap: 25, marginTop: 18 },
  action: { color: "#5B3DF5", fontSize: 16, fontWeight: "800" },
  resolvedAction: { color: "#0F9D8A", fontSize: 16, fontWeight: "800" },
  deleteAction: { color: "#C0392B", fontSize: 16, fontWeight: "800" },
  inactiveAction: { color: "#747B90" },
  editStatusRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 14,
    marginBottom: 12,
  },
});
