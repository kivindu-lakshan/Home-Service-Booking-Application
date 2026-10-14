import {
  deleteTicketResponse,
  getAdminTicket,
  getAdminTickets,
  respondToTicket,
} from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { Button, Input } from "@/components/ui";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Check,
  CheckCircle2,
  Clock,
  MessageCircle,
  MoreVertical,
  Trash2,
  UserRound,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";


const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "#FFE5E9", text: "#B73248" },
  pending: { bg: "#FFE5E9", text: "#B73248" },
  in_progress: { bg: "#FFF4E5", text: "#E07C00" },
  resolved: { bg: "#E5F8F5", text: "#0F9D8A" },
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    open: "Open",
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
  };
  return map[status] || status;
}

export default function AdminTicketDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<"in_progress" | "resolved">("in_progress");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getAdminTicket(id);
      const found = res.data.data;
      setTicket(found || null);
      if (found) {
        setResponse(found.adminResponse || "");
        setStatus(found.status === "resolved" ? "resolved" : "in_progress");
      }
      setError(found ? "" : "Ticket not found.");
    } catch {
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
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    type: "update" | "delete";
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    type: "update",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const executeSave = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await respondToTicket(id, {
        adminResponse: response.trim(),
        status,
      });
      const savedTicket = updated.data.data;
      setTicket(savedTicket);
      setResponse(savedTicket.adminResponse || "");
      setEditing(false);
    } catch (failure: any) {
      setError(failure.response?.data?.message || "Unable to save response.");
    } finally {
      setBusy(false);
    }
  };

  const handleSavePress = () => {
    if (!response.trim()) {
      setError("Write a response first.");
      return;
    }
    setConfirmConfig({
      visible: true,
      type: "update",
      title: "Are you sure want to update this reply?",
      message: "The customer will see this updated reply for their complaint.",
      onConfirm: () => void executeSave(),
    });
  };

  const executeRemove = async () => {
    setBusy(true);
    try {
      const updated = await deleteTicketResponse(id);
      const savedTicket = updated.data.data;
      setTicket(savedTicket);
      setResponse("");
      setEditing(false);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to delete response.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePress = () => {
    setConfirmConfig({
      visible: true,
      type: "delete",
      title: "Are you sure want to delete this reply?",
      message: "This reply will be permanently deleted and the ticket will return to pending.",
      onConfirm: () => void executeRemove(),
    });
  };


  if (loading && !ticket)
    return <LoadingState label="Loading ticket details..." />;
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

  const sc = STATUS_COLORS[ticket.status] || { bg: "#F0F1F7", text: "#747B90" };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ticket Details</Text>
        <Pressable style={styles.moreBtn}>
          <MoreVertical size={18} color="#25213D" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.ticketIdText}>
                #{String(ticket._id).slice(-6).toUpperCase()}
              </Text>
              <Text style={styles.ticketDateText}>
                {new Date(ticket.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>
                {statusLabel(ticket.status)}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.userRow}>
            <View style={styles.avatarWrap}>
              <UserRound size={20} color="#5B3DF5" />
            </View>
            <View>
              <Text style={styles.userName}>
                {ticket.customer?.fullName || "Customer"}
              </Text>
              <Text style={styles.userSub}>Requester</Text>
            </View>
          </View>
        </View>

        {/* Complaint Section */}
        <Text style={styles.sectionTitle}>Customer Complaint</Text>
        <View style={styles.complaintCard}>
          <View style={styles.messageHeader}>
            <MessageCircle size={16} color="#747B90" />
            <Text style={styles.subjectText}>
              {ticket.subject || "No Subject"}
            </Text>
          </View>
          <Text style={styles.messageText}>{ticket.description}</Text>
        </View>

        {/* Admin Reply Section */}
        {ticket.adminResponse && !editing ? (
          <>
            <Text style={styles.sectionTitle}>Admin Reply</Text>
            <View style={styles.replyCard}>
              <Text style={styles.replyText}>{ticket.adminResponse}</Text>
              <View style={styles.replyFooter}>
                <Pressable onPress={() => setEditing(true)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>Edit Reply</Text>
                </Pressable>
                <Pressable onPress={handleRemovePress} style={styles.actionBtnDestructive}>
                  <Trash2 size={14} color="#C0392B" />
                  <Text style={styles.actionTextDestructive}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {/* Edit / Write Reply Section */}
        {(!ticket.adminResponse || editing) && (
          <View style={styles.editSection}>
            <Text style={styles.sectionTitle}>
              {ticket.adminResponse ? "Edit Reply" : "Write a Reply"}
            </Text>
            <Input
              value={response}
              onChangeText={setResponse}
              multiline
              placeholder="Type your response here..."
              style={styles.replyInput}
            />

            <Text style={styles.statusLabel}>Set ticket status:</Text>
            <View style={styles.statusSelectorRow}>
              <Pressable
                onPress={() => setStatus("in_progress")}
                style={[
                  styles.statusSelectBtn,
                  status === "in_progress" && styles.statusSelectBtnActive,
                ]}
              >
                <Clock
                  size={16}
                  color={status === "in_progress" ? "#FFF" : "#747B90"}
                />
                <Text
                  style={[
                    styles.statusSelectText,
                    status === "in_progress" && styles.statusSelectTextActive,
                  ]}
                >
                  In Progress
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStatus("resolved")}
                style={[
                  styles.statusSelectBtn,
                  status === "resolved" && styles.statusSelectBtnActiveResolved,
                ]}
              >
                <CheckCircle2
                  size={16}
                  color={status === "resolved" ? "#FFF" : "#747B90"}
                />
                <Text
                  style={[
                    styles.statusSelectText,
                    status === "resolved" && styles.statusSelectTextActive,
                  ]}
                >
                  Resolved
                </Text>
              </Pressable>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={{ marginTop: 10 }}>
              <Button
                onPress={handleSavePress}
                disabled={busy}
              >
                {busy ? "Saving..." : ticket.adminResponse ? "Update Reply" : "Save Response"}
              </Button>
            </View>
            {editing && ticket.adminResponse && (
              <Pressable
                onPress={() => {
                  setEditing(false);
                  setResponse(ticket.adminResponse);
                  setStatus(ticket.status === "resolved" ? "resolved" : "in_progress");
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel Edit</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal with Greeny Touch */}
      <Modal
        visible={confirmConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmConfig((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmBadge}>
              {confirmConfig.type === "delete" ? (
                <Trash2 size={28} color="#059669" strokeWidth={2.2} />
              ) : (
                <CheckCircle2 size={28} color="#059669" strokeWidth={2.2} />
              )}
            </View>

            <Text style={styles.confirmTitle}>{confirmConfig.title}</Text>
            <Text style={styles.confirmMessage}>{confirmConfig.message}</Text>

            <View style={styles.confirmActionsRow}>
              <Pressable
                style={styles.confirmNoBtn}
                onPress={() => setConfirmConfig((prev) => ({ ...prev, visible: false }))}
              >
                <X size={16} color="#047857" strokeWidth={2.5} />
                <Text style={styles.confirmNoText}>No, Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmYesBtn}
                onPress={() => {
                  const run = confirmConfig.onConfirm;
                  setConfirmConfig((prev) => ({ ...prev, visible: false }));
                  run();
                }}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.confirmYesText}>
                  {confirmConfig.type === "delete" ? "Yes, Delete" : "Yes, Update"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF8",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#5B3DF5", fontSize: 28, lineHeight: 32, marginTop: -2 },
  headerTitle: { color: "#25213D", fontSize: 18, fontWeight: "800" },
  moreBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Card */
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#25213D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketIdText: { color: "#25213D", fontSize: 16, fontWeight: "900" },
  ticketDateText: { color: "#8B98B2", fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#F0F1F7", marginVertical: 14 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { color: "#25213D", fontSize: 15, fontWeight: "800" },
  userSub: { color: "#747B90", fontSize: 12, marginTop: 2 },

  sectionTitle: {
    color: "#25213D",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 8,
  },

  /* Complaint */
  complaintCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0EEF8",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  subjectText: { color: "#25213D", fontSize: 14, fontWeight: "800" },
  messageText: { color: "#5F6B84", fontSize: 14, lineHeight: 22 },

  /* Reply */
  replyCard: {
    backgroundColor: "#EDEBFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#5B3DF5",
  },
  replyText: { color: "#25213D", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  replyFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(91, 61, 245, 0.1)",
  },
  actionBtn: { padding: 6 },
  actionText: { color: "#5B3DF5", fontSize: 13, fontWeight: "800" },
  actionBtnDestructive: { flexDirection: "row", alignItems: "center", gap: 4, padding: 6 },
  actionTextDestructive: { color: "#C0392B", fontSize: 13, fontWeight: "800" },

  /* Edit Section */
  editSection: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginTop: 10,
  },
  replyInput: {
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#F4F5FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    marginBottom: 20,
  },
  statusLabel: { color: "#747B90", fontSize: 13, fontWeight: "600", marginBottom: 10 },
  statusSelectorRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statusSelectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F0F1F7",
  },
  statusSelectBtnActive: { backgroundColor: "#E07C00" },
  statusSelectBtnActiveResolved: { backgroundColor: "#0F9D8A" },
  statusSelectText: { color: "#747B90", fontSize: 13, fontWeight: "800" },
  statusSelectTextActive: { color: "#FFF" },
  cancelBtn: { marginTop: 16, alignItems: "center", paddingVertical: 10 },
  cancelBtnText: { color: "#747B90", fontSize: 14, fontWeight: "700" },
  errorText: { color: "#B73248", marginBottom: 10, fontSize: 13, textAlign: "center" },

  /* Confirmation Modal with Greeny Touch */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D1FAE5",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  confirmMessage: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmNoBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmNoText: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmYesBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmYesText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

