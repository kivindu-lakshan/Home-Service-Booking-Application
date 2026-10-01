import {
    deleteTicketResponse,
    getAdminTickets,
    respondToTicket,
} from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { Button, Card, Input } from "@/components/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

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
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Support tickets
      </Text>
      <Text style={{ color: "#747B90", marginVertical: 8 }}>
        Resolve customer issues from one focused queue.
      </Text>
      <ErrorText>{error}</ErrorText>
      {!tickets.length ? (
        <EmptyState label="No customer tickets found." />
      ) : (
        tickets.map((ticket) => {
          const isEditing = editing === ticket._id;
          return (
            <Card key={ticket._id}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "#25213D", fontWeight: "900", flex: 1 }}>
                  {ticket.subject}
                </Text>
                <Text
                  style={{
                    color: ticket.status === "resolved" ? "#0F9D8A" : "#F29D38",
                    fontWeight: "800",
                  }}
                >
                  {ticket.status.replace("_", " ")}
                </Text>
              </View>
              <Text style={{ color: "#747B90", marginTop: 6 }}>
                {ticket.customer?.fullName || "Customer"}
              </Text>
              <Text style={{ color: "#25213D", marginTop: 12 }}>
                {ticket.message}
              </Text>
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
                  <View
                    style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}
                  >
                    <Text
                      onPress={() => setStatus("in_progress")}
                      style={{
                        color: status === "in_progress" ? "#5B3DF5" : "#747B90",
                        fontWeight: "800",
                      }}
                    >
                      In progress
                    </Text>
                    <Text
                      onPress={() => setStatus("resolved")}
                      style={{
                        color: status === "resolved" ? "#0F9D8A" : "#747B90",
                        fontWeight: "800",
                      }}
                    >
                      Resolved
                    </Text>
                  </View>
                  <Button onPress={() => void save(ticket._id)}>
                    Save response
                  </Button>
                </>
              ) : ticket.adminResponse ? (
                <Text style={{ color: "#25213D", marginTop: 12 }}>
                  Response: {ticket.adminResponse}
                </Text>
              ) : (
                <Text style={{ color: "#F29D38", marginTop: 12 }}>
                  Awaiting response
                </Text>
              )}
              <View style={{ flexDirection: "row", gap: 20, marginTop: 14 }}>
                <Text
                  onPress={() => {
                    setEditing(isEditing ? null : ticket._id);
                    setResponse(ticket.adminResponse || "");
                    setStatus(
                      ticket.status === "resolved" ? "resolved" : "in_progress",
                    );
                  }}
                  style={{ color: "#5B3DF5", fontWeight: "800" }}
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
                    style={{ color: "#C0392B", fontWeight: "800" }}
                  >
                    Delete response
                  </Text>
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
