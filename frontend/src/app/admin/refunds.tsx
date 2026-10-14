import {
  approveRefundRequest,
  getAdminRefundRequests,
  rejectRefundRequest,
  type RefundRequest,
} from "@/api/refunds";
import { ErrorState, LoadingState } from "@/components/DataState";
import { isAxiosError } from "axios";
import { router } from "expo-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  navy: "#1A1A2E",
  purple: "#5B3DF5",
  border: "#D1D1D6",
  gold: "#FBBF24",
  white: "#FFFFFF",
  muted: "#8E8E9A",
  bg: "#F7F7FD",
  success: "#0F9D8A",
  danger: "#C0392B",
};

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  approved: { bg: "#D1FAE5", text: "#065F46" },
  rejected: { bg: "#FEE2E2", text: "#991B1B" },
  processing: { bg: "#DBEAFE", text: "#1E40AF" },
  processed: { bg: "#D1FAE5", text: "#065F46" },
  failed: { bg: "#FEE2E2", text: "#991B1B" },
};

function StatusBadge({ status }: { status: string }) {
  const col = STATUS_COLOURS[status] || { bg: "#F0F1F7", text: "#747B90" };
  return (
    <View style={[styles.badge, { backgroundColor: col.bg }]}>
      <Text style={[styles.badgeText, { color: col.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

function RequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: RefundRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/admin/refund-detail" as any,
          params: { id: req._id },
        })
      }
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>
            {(req.customer as any)?.fullName || "Customer"}
          </Text>
          <Text style={styles.refLabel}>
            {(req.booking as any)?.bookingRef || "—"}
          </Text>
          <Text style={styles.serviceName}>
            {(req.booking as any)?.service?.name || "Service"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={req.status} />
          <ChevronRight size={16} color={C.muted} />
        </View>
      </View>
      <View style={styles.amountRow}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Service</Text>
          <Text style={styles.amountValue}>
            LKR {req.serviceAmount.toLocaleString()}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Protection fee</Text>
          <Text style={styles.amountValue}>
            LKR {req.protectionFee.toLocaleString()}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Refund amount</Text>
          <Text style={[styles.amountValue, { color: C.purple }]}>
            LKR {req.refundAmount.toLocaleString()}
          </Text>
        </View>
      </View>
      <Text style={styles.dateText}>
        Requested: {new Date(req.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </Text>
      {req.status === "pending" && (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove(req._id)}
          >
            <CheckCircle2 size={14} color="#FFF" />
            <Text style={styles.actionBtnText}>Approve</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject(req._id)}
          >
            <XCircle size={14} color="#FFF" />
            <Text style={styles.actionBtnText}>Reject</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "processing", "processed", "failed"];

export default function AdminRefunds() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await getAdminRefundRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setRequests(res.data.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = (id: string) => {
    Alert.alert(
      "Approve Refund",
      "Are you sure you want to approve this refund request? This will queue the refund for processing.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            setBusy(true);
            try {
              await approveRefundRequest(id);
              await load();
              Alert.alert("Success", "Refund approved and queued for processing.");
            } catch (e) {
              const msg = isAxiosError(e) ? e.response?.data?.message : "An error occurred.";
              Alert.alert("Error", msg || "Could not approve refund.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectOpen = (id: string) => {
    setRejectReason("");
    setRejectModal(id);
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      Alert.alert("Required", "Please enter a rejection reason.");
      return;
    }
    setBusy(true);
    try {
      await rejectRefundRequest(rejectModal, rejectReason.trim());
      setRejectModal(null);
      await load();
    } catch (e) {
      const msg = isAxiosError(e) ? e.response?.data?.message : "An error occurred.";
      Alert.alert("Error", msg || "Could not reject refund.");
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Refund Requests</Text>
            {pendingCount > 0 && (
              <Text style={styles.headerSub}>
                {pendingCount} pending review
              </Text>
            )}
          </View>
          <Pressable onPress={() => void load(true)} style={styles.refreshBtn}>
            <RefreshCw size={18} color={C.white} />
          </Pressable>
        </View>
        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={16} color={C.muted} />
          <TextInput
            placeholder="Search by customer, booking ref..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => void load()}
            style={styles.searchInput}
          />
        </View>
        {/* Status filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingState label="Loading refund requests..." />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          contentContainerStyle={styles.list}
        >
          {requests.length === 0 ? (
            <View style={styles.empty}>
              <ShieldCheck size={44} color={C.border} />
              <Text style={styles.emptyTitle}>No refund requests</Text>
              <Text style={styles.emptySub}>No requests match the current filter.</Text>
            </View>
          ) : (
            requests.map((req) => (
              <RequestCard
                key={req._id}
                req={req}
                onApprove={handleApprove}
                onReject={handleRejectOpen}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Reject Modal */}
      <Modal
        visible={!!rejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Refund Request</Text>
            <Text style={styles.modalSub}>
              Please provide a clear reason. This will be shown to the customer.
            </Text>
            <TextInput
              placeholder="Rejection reason..."
              placeholderTextColor={C.muted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              style={styles.reasonInput}
            />
            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setRejectModal(null)}
                style={[styles.modalBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleRejectSubmit()}
                disabled={busy}
                style={[styles.modalBtn, styles.rejectBtn2, busy && { opacity: 0.6 }]}
              >
                <XCircle size={15} color="#FFF" />
                <Text style={styles.actionBtnText}>
                  {busy ? "Rejecting..." : "Reject"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#FFF", fontSize: 26, lineHeight: 30, marginTop: -2 },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  headerSub: { color: C.gold, fontSize: 11, fontWeight: "700", marginTop: 2 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 13,
    height: 44,
  },
  filterRow: { gap: 8, paddingBottom: 2 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  filterChipActive: { backgroundColor: C.purple, borderColor: C.purple },
  filterChipText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
  list: { padding: 18, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8E5F2",
    shadowColor: "#25213D",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  customerName: { color: C.navy, fontSize: 16, fontWeight: "900" },
  refLabel: { color: C.muted, fontSize: 11, marginTop: 2 },
  serviceName: { color: C.purple, fontSize: 12, fontWeight: "700", marginTop: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
  amountRow: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F0EEF8",
    paddingVertical: 10,
  },
  amountItem: { flex: 1, alignItems: "center" },
  amountLabel: { color: C.muted, fontSize: 10, fontWeight: "700", marginBottom: 4 },
  amountValue: { color: C.navy, fontSize: 13, fontWeight: "900" },
  dateText: { color: C.muted, fontSize: 11, marginBottom: 10 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  approveBtn: { backgroundColor: "#0F9D8A" },
  rejectBtn: { backgroundColor: "#C0392B" },
  rejectBtn2: { backgroundColor: "#C0392B", flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { color: C.navy, fontSize: 18, fontWeight: "900" },
  emptySub: { color: C.muted, fontSize: 13, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { color: C.navy, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  modalSub: { color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 20 },
  reasonInput: {
    backgroundColor: "#F4F5FA",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: C.navy,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 18,
  },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14 },
  cancelBtn: { backgroundColor: "#F4F5FA" },
  cancelBtnText: { color: C.navy, fontSize: 14, fontWeight: "800" },
});
