import {
    deleteTicketResponse,
    getAdminTickets,
    respondToTicket,
} from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { Button, Input } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import {
    MoreVertical,
    Pencil,
    Star,
    UserRound
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AdminTicketDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<"in_progress" | "resolved">(
    "in_progress",
  );
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const items = (await getAdminTickets()).data.data;
      const found = items.find((item: any) => item._id === id);
      setTicket(found || null);
      if (found) {
        setResponse(found.adminResponse || "");
        setStatus(found.status === "resolved" ? "resolved" : "in_progress");
      }
      setError(found ? "" : "Ticket not found.");
    } catch (failure: any) {
      setError(failure.response?.data?.message || "Unable to load ticket.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    if (!response.trim()) {
      setError("Write a response first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await respondToTicket(id, { adminResponse: response, status });
      setEditing(false);
      await load();
    } catch (failure: any) {
      setError(failure.response?.data?.message || "Unable to save response.");
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    Alert.alert(
      "Delete response?",
      "The customer will see the ticket as pending again.",
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
  if (loading) return <LoadingState label="Loading ticket details..." />;
  if (error && !ticket)
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  if (!ticket) return null;
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text onPress={() => router.back()} style={styles.back}>
            ‹
          </Text>
          <Text style={styles.headerTitle}>Ticket Details</Text>
          <View style={styles.headerActions}>
            <Star size={20} color="#25213D" />
            <Pencil size={18} color="#25213D" />
            <MoreVertical size={20} color="#25213D" />
          </View>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Ticket Info</Text>
          <Info label="Ticket ID" value={`#${String(ticket._id).slice(-4)}`} />
          <Info
            label="Created"
            value={new Date(ticket.createdAt).toLocaleDateString()}
          />
          <Info
            label="Last Message"
            value={new Date(
              ticket.updatedAt || ticket.createdAt,
            ).toLocaleDateString()}
          />
          <Info label="Status" value={ticket.status.replace("_", " ")} />
          <Info
            label="Priority"
            value={
              ticket.status === "resolved"
                ? "Low"
                : ticket.status === "in_progress"
                  ? "High"
                  : "Medium"
            }
          />
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Responsibility</Text>
          <Info label="Team" value="Default Team" action="Change" />
          <View style={styles.rule} />
          <Info label="Agent" value="Admin support" action="Change" />
          <View style={styles.agent}>
            <View style={styles.smallAvatar}>
              <UserRound size={15} color="#5B3DF5" />
            </View>
            <Text style={styles.agentName}>
              {ticket.customer?.fullName || "Assigned admin"}
            </Text>
          </View>
          <View style={styles.rule} />
          <Info label="Followers (0)" value="" action="Follow    Edit" />
          <Text style={styles.muted}>
            No followers assigned to this ticket.
          </Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Requester</Text>
          <Info label="Details" value="" action="Change" />
          <View style={styles.agent}>
            <View style={styles.smallAvatar}>
              <UserRound size={15} color="#5B3DF5" />
            </View>
            <Text style={styles.agentName}>
              {ticket.customer?.fullName || "Customer"}
            </Text>
          </View>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Message</Text>
          <Text style={styles.message}>{ticket.message}</Text>
          {ticket.adminResponse && !editing ? (
            <Text style={styles.response}>
              Response: {ticket.adminResponse}
            </Text>
          ) : null}
          {editing ? (
            <>
              <Input
                value={response}
                onChangeText={setResponse}
                multiline
                placeholder="Write your response"
                style={styles.input}
              />
              <View style={styles.statusRow}>
                <Text
                  onPress={() => setStatus("in_progress")}
                  style={[
                    styles.action,
                    status !== "in_progress" && styles.muted,
                  ]}
                >
                  In progress
                </Text>
                <Text
                  onPress={() => setStatus("resolved")}
                  style={[
                    styles.actionResolved,
                    status !== "resolved" && styles.muted,
                  ]}
                >
                  Resolved
                </Text>
              </View>
              <Button onPress={() => void save()}>
                {busy ? "Saving..." : "Save response"}
              </Button>
            </>
          ) : (
            <View style={styles.actions}>
              <Text onPress={() => setEditing(true)} style={styles.action}>
                {ticket.adminResponse ? "Edit response" : "Reply"}
              </Text>
              {ticket.adminResponse ? (
                <Text onPress={remove} style={styles.delete}>
                  Delete response
                </Text>
              ) : null}
            </View>
          )}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.cancel}>
        <Text style={styles.cancelText}>Slide to cancel the ticket ›</Text>
      </View>
    </View>
  );
}
function Info({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: string;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{action || label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  content: { padding: 16, paddingBottom: 30 },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  back: { color: "#25213D", fontSize: 34, lineHeight: 36, width: 36 },
  headerTitle: { color: "#25213D", fontSize: 17, fontWeight: "900", flex: 1 },
  headerActions: { flexDirection: "row", gap: 16, alignItems: "center" },
  panel: {
    backgroundColor: "#EDEBFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  panelTitle: {
    color: "#5B3DF5",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 12,
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 27,
    gap: 15,
  },
  infoValue: { color: "#25213D", fontSize: 13, flex: 1 },
  infoLabel: { color: "#747B90", fontSize: 12, textAlign: "right" },
  rule: { height: 1, backgroundColor: "#DDE2F0", marginVertical: 8 },
  agent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  smallAvatar: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  agentName: { color: "#25213D", fontSize: 13, fontWeight: "800" },
  muted: { color: "#747B90", fontSize: 12 },
  message: { color: "#25213D", lineHeight: 22 },
  response: { color: "#25213D", lineHeight: 22, marginTop: 14 },
  input: { minHeight: 100, marginTop: 12, textAlignVertical: "top" },
  statusRow: { flexDirection: "row", gap: 18, marginVertical: 12 },
  actions: { flexDirection: "row", gap: 22, marginTop: 15 },
  action: { color: "#5B3DF5", fontWeight: "900" },
  actionResolved: { color: "#0F9D8A", fontWeight: "900" },
  delete: { color: "#C0392B", fontWeight: "900" },
  error: { color: "#C0392B", marginTop: 10 },
  cancel: {
    marginHorizontal: 45,
    marginBottom: 14,
    backgroundColor: "#5B3DF5",
    minHeight: 46,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#FFF", fontWeight: "800" },
});
