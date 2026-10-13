import {
  approveRefundRequest,
  getAdminRefundRequest,
  rejectRefundRequest,
  type RefundRequest,
} from "@/api/refunds";
import { ErrorState, LoadingState } from "@/components/DataState";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Mail,
  Phone,
  Receipt,
  ShieldCheck,
  User,
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

const STATUS_COLOURS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending Review" },
  approved: { bg: "#D1FAE5", text: "#065F46", label: "Approved" },
  rejected: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" },
  processing: { bg: "#DBEAFE", text: "#1E40AF", label: "Processing (Queued)" },
  processed: { bg: "#D1FAE5", text: "#065F46", label: "Processed & Settled" },
  failed: { bg: "#FEE2E2", text: "#991B1B", label: "Failed" },
};

export default function AdminRefundDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [req, setReq] = useState<RefundRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await getAdminRefundRequest(id);
      setReq(res.data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = () => {
    if (!req) return;
    Alert.alert(
      "Approve Refund Request",
      `Are you sure you want to approve this refund of LKR ${req.refundAmount.toLocaleString()}?\n\nThis will initiate processing with the payment provider.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Approval",
          style: "default",
          onPress: async () => {
            setBusy(true);
            try {
              await approveRefundRequest(req._id);
              Alert.alert("Approved", "Refund has been approved and moved to processing status.");
              await load();
            } catch (e) {
              const msg = isAxiosError(e) ? e.response?.data?.message : "Failed to approve refund.";
              Alert.alert("Error", msg || "Could not approve refund.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectSubmit = async () => {
    if (!req) return;
    if (!rejectReason.trim()) {
      Alert.alert("Reason Required", "Please provide a clear rejection reason for the customer.");
      return;
    }
    setBusy(true);
    try {
      await rejectRefundRequest(req._id, rejectReason.trim());
      setRejectModalOpen(false);
      Alert.alert("Rejected", "The refund request has been rejected and the reason has been recorded.");
      await load();
    } catch (e) {
      const msg = isAxiosError(e) ? e.response?.data?.message : "Failed to reject refund.";
      Alert.alert("Error", msg || "Could not reject refund.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading refund details..." />;
  if (error || !req) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        <ErrorState onRetry={() => void load()} />
      </View>
    );
  }

  const badgeInfo = STATUS_COLOURS[req.status] || {
    bg: "#F0F1F7",
    text: C.muted,
    label: req.status,
  };

  const booking = req.booking as any;
  const customer = req.customer as any;
  const payment = (req as any).payment as any;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/refunds" as any))}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={C.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Refund Request Details</Text>
          <Text style={styles.headerSubtitle}>ID: {req._id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeInfo.bg }]}>
          <Text style={[styles.statusText, { color: badgeInfo.text }]}>{badgeInfo.label}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      >
        {/* Financial Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Financial Breakdown</Text>
          <View style={styles.amountGrid}>
            <View style={styles.amountCol}>
              <Text style={styles.amountColLabel}>Original Service</Text>
              <Text style={styles.amountColVal}>LKR {req.serviceAmount?.toLocaleString()}</Text>
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amountColLabel}>Protection Fee (10%)</Text>
              <Text style={styles.amountColVal}>LKR {req.protectionFee?.toLocaleString()}</Text>
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amountColLabel}>Total Paid</Text>
              <Text style={styles.amountColVal}>LKR {req.totalPaid?.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.refundTargetRow}>
            <View>
              <Text style={styles.refundTargetLabel}>Refund Amount Requested</Text>
              <Text style={styles.refundPolicyNote}>
                10% protection fee is non-refundable. Eligible service fee is returned.
              </Text>
            </View>
            <Text style={styles.refundTargetVal}>LKR {req.refundAmount?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Eligibility Verification Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Eligibility Verification Evidence</Text>
          <View style={styles.evidenceItem}>
            <CheckCircle2 size={18} color={C.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.evidenceTitle}>Refund Protection Purchased</Text>
              <Text style={styles.evidenceSub}>
                Fee of LKR {req.protectionFee?.toLocaleString()} was paid during checkout.
              </Text>
            </View>
          </View>

          <View style={styles.evidenceItem}>
            <CheckCircle2 size={18} color={C.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.evidenceTitle}>Cancellation Before Provider Arrival</Text>
              <Text style={styles.evidenceSub}>
                {req.cancellationBeforeArrival
                  ? "Verified: Cancelled before provider marked status as arrived."
                  : "Cancelled after arrival."}
              </Text>
            </View>
          </View>

          <View style={styles.evidenceItem}>
            <CheckCircle2 size={18} color={C.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.evidenceTitle}>Prepaid Payment Confirmed</Text>
              <Text style={styles.evidenceSub}>
                Method: {req.paymentMethod || payment?.method || "Card"}
                {payment?.receiptNo ? ` (Receipt: ${payment.receiptNo})` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Customer Information</Text>
          <View style={styles.infoRow}>
            <User size={16} color={C.purple} />
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoVal}>{customer?.fullName || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Mail size={16} color={C.purple} />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoVal}>{customer?.email || "—"}</Text>
          </View>
          {customer?.phone && (
            <View style={styles.infoRow}>
              <Phone size={16} color={C.purple} />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoVal}>{customer?.phone}</Text>
            </View>
          )}
        </View>

        {/* Associated Booking Details */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Booking Information</Text>
          <View style={styles.infoRow}>
            <FileText size={16} color={C.purple} />
            <Text style={styles.infoLabel}>Reference:</Text>
            <Text style={[styles.infoVal, { fontWeight: "800", color: C.purple }]}>
              {booking?.bookingRef || "—"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Calendar size={16} color={C.purple} />
            <Text style={styles.infoLabel}>Service:</Text>
            <Text style={styles.infoVal}>{booking?.service?.name || "Home Service"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color={C.purple} />
            <Text style={styles.infoLabel}>Cancelled At:</Text>
            <Text style={styles.infoVal}>
              {req.cancelledAt
                ? new Date(req.cancelledAt).toLocaleString()
                : booking?.updatedAt
                ? new Date(booking.updatedAt).toLocaleString()
                : "—"}
            </Text>
          </View>
          {booking?.cancelledReason && (
            <View style={styles.infoRow}>
              <AlertCircle size={16} color={C.muted} />
              <Text style={styles.infoLabel}>Cancellation Reason:</Text>
              <Text style={styles.infoVal}>{booking.cancelledReason}</Text>
            </View>
          )}
        </View>

        {/* Payment Gateway & Settlement Tracking */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Gateway & Processing Audit</Text>
          <View style={styles.infoRow}>
            <CreditCard size={16} color={C.purple} />
            <Text style={styles.infoLabel}>Payment Status:</Text>
            <Text style={styles.infoVal}>{payment?.status || "paid"}</Text>
          </View>
          {req.providerRefundRef && (
            <View style={styles.infoRow}>
              <Receipt size={16} color={C.purple} />
              <Text style={styles.infoLabel}>Refund Reference:</Text>
              <Text style={[styles.infoVal, { fontWeight: "700" }]}>{req.providerRefundRef}</Text>
            </View>
          )}
          {req.providerRefundStatus && (
            <View style={styles.infoRow}>
              <Clock size={16} color={C.purple} />
              <Text style={styles.infoLabel}>Gateway Status:</Text>
              <Text style={styles.infoVal}>{req.providerRefundStatus}</Text>
            </View>
          )}
          {req.reviewedBy && (
            <View style={styles.infoRow}>
              <User size={16} color={C.purple} />
              <Text style={styles.infoLabel}>Reviewed By:</Text>
              <Text style={styles.infoVal}>{(req.reviewedBy as any)?.fullName || "Admin"}</Text>
            </View>
          )}
          {req.reviewedAt && (
            <View style={styles.infoRow}>
              <Clock size={16} color={C.purple} />
              <Text style={styles.infoLabel}>Reviewed At:</Text>
              <Text style={styles.infoVal}>{new Date(req.reviewedAt).toLocaleString()}</Text>
            </View>
          )}
          {req.rejectionReason && (
            <View style={styles.rejectionNotice}>
              <Text style={styles.rejectionNoticeLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionNoticeVal}>{req.rejectionReason}</Text>
            </View>
          )}
        </View>

        {/* Admin Action Buttons (only active if pending) */}
        {req.status === "pending" && (
          <View style={styles.actionSection}>
            <Pressable
              disabled={busy}
              onPress={handleApprove}
              style={[styles.primaryActionBtn, styles.approveActionBtn, busy && { opacity: 0.6 }]}
            >
              <CheckCircle2 size={18} color={C.white} />
              <Text style={styles.primaryActionText}>Approve Refund</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => setRejectModalOpen(true)}
              style={[styles.primaryActionBtn, styles.rejectActionBtn, busy && { opacity: 0.6 }]}
            >
              <XCircle size={18} color={C.white} />
              <Text style={styles.primaryActionText}>Reject Refund</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={rejectModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Refund Request</Text>
            <Text style={styles.modalSubtitle}>
              Please state why this request is being rejected. The customer will see this message.
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="e.g. Booking cancelled after service professional arrived..."
              placeholderTextColor={C.muted}
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setRejectModalOpen(false)}
                disabled={busy}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalSubmitRejectBtn]}
                onPress={handleRejectSubmit}
                disabled={busy}
              >
                <Text style={styles.modalSubmitRejectText}>
                  {busy ? "Submitting..." : "Confirm Rejection"}
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
    paddingHorizontal: 18,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: "800" },
  headerSubtitle: { color: C.muted, fontSize: 11, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: "800" },

  content: { padding: 18, gap: 14 },

  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: C.navy,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeading: {
    color: C.navy,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 14,
  },
  divider: { height: 1, backgroundColor: "#F0F1F7", marginVertical: 12 },

  amountGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountCol: { flex: 1 },
  amountColLabel: { color: C.muted, fontSize: 11, fontWeight: "600", marginBottom: 3 },
  amountColVal: { color: C.navy, fontSize: 13, fontWeight: "800" },

  refundTargetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refundTargetLabel: { color: C.navy, fontSize: 14, fontWeight: "800" },
  refundPolicyNote: { color: C.muted, fontSize: 11, maxWidth: 220, marginTop: 2 },
  refundTargetVal: { color: C.purple, fontSize: 18, fontWeight: "900" },

  evidenceItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  evidenceTitle: { color: C.navy, fontSize: 13, fontWeight: "800" },
  evidenceSub: { color: C.muted, fontSize: 12, marginTop: 2 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: { color: C.muted, fontSize: 12, width: 110 },
  infoVal: { color: C.navy, fontSize: 13, flex: 1, fontWeight: "600" },

  rejectionNotice: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  rejectionNoticeLabel: { color: "#991B1B", fontSize: 12, fontWeight: "800" },
  rejectionNoticeVal: { color: "#7F1D1D", fontSize: 13, marginTop: 4 },

  actionSection: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  approveActionBtn: { backgroundColor: C.success },
  rejectActionBtn: { backgroundColor: C.danger },
  primaryActionText: { color: C.white, fontSize: 14, fontWeight: "800" },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    gap: 14,
  },
  modalTitle: { color: C.navy, fontSize: 18, fontWeight: "900" },
  modalSubtitle: { color: C.muted, fontSize: 13, lineHeight: 18 },
  modalInput: {
    backgroundColor: "#F7F7FD",
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    color: C.navy,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalCancelBtn: { backgroundColor: "#F0F1F7" },
  modalCancelText: { color: C.navy, fontSize: 14, fontWeight: "700" },
  modalSubmitRejectBtn: { backgroundColor: C.danger },
  modalSubmitRejectText: { color: C.white, fontSize: 14, fontWeight: "800" },
});
