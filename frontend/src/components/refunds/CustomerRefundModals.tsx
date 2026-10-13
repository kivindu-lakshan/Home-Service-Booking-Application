import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AlertCircle,
  Receipt,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { isAxiosError } from "axios";
import {
  submitRefundRequest,
  type RefundRequest,
} from "@/api/refunds";
import type { Booking } from "@/api/bookings";

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

export const REFUND_STATUS_DISPLAY: Record<
  string,
  { label: string; bg: string; text: string; description: string }
> = {
  pending: {
    label: "Refund Requested",
    bg: "#FEF3C7",
    text: "#92400E",
    description: "Your request has been submitted and is awaiting administrator review.",
  },
  processing: {
    label: "Refund Under Review",
    bg: "#DBEAFE",
    text: "#1E40AF",
    description: "Your request has been approved and is being processed with the payment provider.",
  },
  approved: {
    label: "Refund Approved",
    bg: "#D1FAE5",
    text: "#065F46",
    description: "Your refund has been approved and queued for fund settlement.",
  },
  rejected: {
    label: "Refund Rejected",
    bg: "#FEE2E2",
    text: "#991B1B",
    description: "Your refund request was reviewed and could not be approved.",
  },
  processed: {
    label: "Refund Processed",
    bg: "#D1FAE5",
    text: "#065F46",
    description: "The refund settlement has been completed.",
  },
  failed: {
    label: "Processing Failed",
    bg: "#FEE2E2",
    text: "#991B1B",
    description: "Payment provider reported an issue processing this refund.",
  },
};

/**
 * Modal 1: Request Refund Confirmation Dialog
 */
export function RefundRequestConfirmModal({
  visible,
  booking,
  paymentInfo,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  booking: Booking | null;
  paymentInfo?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  const serviceAmount = Number(
    paymentInfo?.protectedServiceAmount ||
      booking.totalPrice ||
      booking.serviceFee ||
      0
  );
  const protectionFee = Number(
    paymentInfo?.refundProtectionFee || Math.round(serviceAmount * 0.1)
  );
  const totalPaid = Number(paymentInfo?.totalAmount || serviceAmount + protectionFee);
  const refundAmount = serviceAmount; // Protection fee is non-refundable

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitRefundRequest(booking._id);
      Alert.alert(
        "Refund Requested",
        "Your refund request has been submitted successfully. Our team will verify your cancellation timing and process your eligible service refund."
      );
      onSuccess();
      onClose();
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message
        : "Failed to submit refund request.";
      Alert.alert("Unable to Submit", msg || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelledEntry = (booking.statusHistory || []).find(
    (h) => h.status === "cancelled"
  );
  const cancellationDateStr = cancelledEntry?.at || booking.updatedAt;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={24} color={C.purple} />
              <Text style={styles.sheetTitle}>Request Booking Refund</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} disabled={submitting}>
              <X size={20} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            {/* Booking Details Summary */}
            <View style={styles.infoCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking Reference</Text>
                <Text style={[styles.detailValue, { color: C.purple, fontWeight: "800" }]}>
                  {booking.bookingRef}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>
                  {booking.service?.name || "Home Service"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cancelled On</Text>
                <Text style={styles.detailValue}>
                  {cancellationDateStr
                    ? new Date(cancellationDateStr).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </Text>
              </View>
            </View>

            {/* Refund Financial Calculation */}
            <View style={styles.calculationCard}>
              <Text style={styles.cardHeading}>Refund Amount Calculation</Text>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Original Service Amount</Text>
                <Text style={styles.calcValue}>LKR {serviceAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Refund Protection Fee Paid (10%)</Text>
                <Text style={styles.calcValue}>LKR {protectionFee.toLocaleString()}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Total Amount Paid</Text>
                <Text style={styles.calcValue}>LKR {totalPaid.toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.highlightRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.highlightLabel}>Refund Amount to be Returned</Text>
                  <Text style={styles.highlightSub}>
                    Original service amount. The 10% protection fee is non-refundable.
                  </Text>
                </View>
                <Text style={styles.highlightAmount}>
                  LKR {refundAmount.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Explanation of Review Process */}
            <View style={styles.reviewExplanationBox}>
              <Text style={styles.explanationTitle}>How the Refund Review Works</Text>
              <Text style={styles.explanationText}>
                • <Text style={{ fontWeight: "700" }}>Cancellation Verification:</Text> Our administrators verify from server audit records that your cancellation occurred before the provider arrived.{"\n"}
                • <Text style={{ fontWeight: "700" }}>Processing:</Text> Once approved, the refund is initiated through the original payment method.{"\n"}
                • <Text style={{ fontWeight: "700" }}>Policy:</Text> The 10% Refund Protection fee (LKR {protectionFee.toLocaleString()}) covers the protection guarantee and is non-refundable.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.sheetActions}>
            <Pressable
              onPress={onClose}
              style={[styles.actionBtn, styles.cancelBtn]}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Back</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              style={[styles.actionBtn, styles.confirmBtn, submitting && { opacity: 0.6 }]}
              disabled={submitting}
            >
              <Text style={styles.confirmBtnText}>
                {submitting ? "Submitting..." : "Confirm & Submit Request"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Modal 2: Customer Refund Request Details & History View
 */
export function RefundDetailsHistoryModal({
  visible,
  request,
  onClose,
}: {
  visible: boolean;
  request: RefundRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;

  const statusMeta = REFUND_STATUS_DISPLAY[request.status] || {
    label: request.status,
    bg: "#F0F1F7",
    text: C.muted,
    description: "",
  };

  const booking = request.booking as any;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Receipt size={22} color={C.purple} />
              <Text style={styles.sheetTitle}>Refund Request Details</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            {/* Status Hero Card */}
            <View style={[styles.statusHeroCard, { backgroundColor: statusMeta.bg }]}>
              <View style={styles.statusBadgeRow}>
                <Text style={[styles.statusHeroTitle, { color: statusMeta.text }]}>
                  {statusMeta.label}
                </Text>
              </View>
              <Text style={[styles.statusHeroDescription, { color: statusMeta.text }]}>
                {statusMeta.description}
              </Text>
            </View>

            {/* If Rejected: Clear Rejection Reason Box */}
            {request.status === "rejected" && !!request.rejectionReason && (
              <View style={styles.rejectionBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <AlertCircle size={16} color="#991B1B" />
                  <Text style={styles.rejectionTitle}>Reason for Rejection</Text>
                </View>
                <Text style={styles.rejectionReasonText}>{request.rejectionReason}</Text>
              </View>
            )}

            {/* Financial Details */}
            <View style={styles.infoCard}>
              <Text style={styles.cardHeading}>Financial Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Requested Refund Amount</Text>
                <Text style={[styles.detailValue, { color: C.purple, fontWeight: "900", fontSize: 16 }]}>
                  LKR {request.refundAmount?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Original Service Amount</Text>
                <Text style={styles.detailValue}>
                  LKR {request.serviceAmount?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Protection Fee Paid (10%)</Text>
                <Text style={styles.detailValue}>
                  LKR {request.protectionFee?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount Paid</Text>
                <Text style={styles.detailValue}>
                  LKR {request.totalPaid?.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Timeline & Metadata */}
            <View style={styles.infoCard}>
              <Text style={styles.cardHeading}>Request Timeline</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted On</Text>
                <Text style={styles.detailValue}>
                  {request.createdAt
                    ? new Date(request.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </Text>
              </View>
              {request.reviewedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reviewed On</Text>
                  <Text style={styles.detailValue}>
                    {new Date(request.reviewedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              )}
              {request.providerRefundRef && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Refund Reference</Text>
                  <Text style={[styles.detailValue, { fontWeight: "700" }]}>
                    {request.providerRefundRef}
                  </Text>
                </View>
              )}
              {request.processedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Settlement Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(request.processedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              )}
            </View>

            {/* Booking Association */}
            <View style={styles.infoCard}>
              <Text style={styles.cardHeading}>Associated Booking</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking Ref</Text>
                <Text style={styles.detailValue}>{booking?.bookingRef || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>
                  {booking?.service?.name || "Home Service"}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetActions}>
            <Pressable onPress={onClose} style={[styles.actionBtn, styles.closeFullBtn]}>
              <Text style={styles.closeFullBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 46, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    gap: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sheetTitle: {
    color: C.navy,
    fontSize: 18,
    fontWeight: "900",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F1F7",
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    backgroundColor: "#F7F7FD",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAEAF4",
  },
  cardHeading: {
    color: C.navy,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: { color: C.muted, fontSize: 13 },
  detailValue: { color: C.navy, fontSize: 13, fontWeight: "600" },

  calculationCard: {
    backgroundColor: "#F9F8FE",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E3DCFF",
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  calcLabel: { color: "#554A78", fontSize: 12 },
  calcValue: { color: C.navy, fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#E3DCFF", marginVertical: 10 },
  highlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  highlightLabel: { color: C.navy, fontSize: 13, fontWeight: "800" },
  highlightSub: { color: C.muted, fontSize: 11, marginTop: 2, maxWidth: 210 },
  highlightAmount: { color: C.purple, fontSize: 18, fontWeight: "900" },

  reviewExplanationBox: {
    backgroundColor: "#EDEBFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  explanationTitle: { color: C.purple, fontSize: 12, fontWeight: "800", marginBottom: 4 },
  explanationText: { color: "#4A3A7A", fontSize: 12, lineHeight: 18 },

  statusHeroCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  statusBadgeRow: { marginBottom: 4 },
  statusHeroTitle: { fontSize: 16, fontWeight: "900" },
  statusHeroDescription: { fontSize: 12, lineHeight: 17, opacity: 0.9 },

  rejectionBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  rejectionTitle: { color: "#991B1B", fontSize: 12, fontWeight: "800" },
  rejectionReasonText: { color: "#7F1D1D", fontSize: 13, lineHeight: 18 },

  sheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { backgroundColor: "#F0F1F7" },
  cancelBtnText: { color: C.navy, fontSize: 14, fontWeight: "700" },
  confirmBtn: { backgroundColor: C.purple },
  confirmBtnText: { color: C.white, fontSize: 14, fontWeight: "800" },
  closeFullBtn: { backgroundColor: C.navy },
  closeFullBtnText: { color: C.white, fontSize: 14, fontWeight: "800" },
});
