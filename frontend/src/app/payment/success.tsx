import { getPayment } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, Download, Eye } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PaymentSuccess() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [data, setData] = useState<any>();
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setData((await getPayment(bookingId)).data.data);
    } catch {
      setError(true);
    }
  }, [bookingId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (!data && !error) return <LoadingState label="Loading receipt..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;

  const payment = data.payment;
  const booking = data.booking;

  const receiptRows = [
    { label: "Booking ID", value: booking.bookingRef },
    { label: "Service", value: booking.service?.name || "Home Service" },
    { label: "Provider", value: booking.provider?.name || "—" },
    {
      label: "Amount Paid",
      value: `LKR ${Number(payment?.amount || booking.totalPrice || 0).toLocaleString()}`,
      highlight: true,
    },
    {
      label: "Paid Via",
      value: payment?.method
        ? payment.method === "demo_card"
          ? `Visa **** ${payment.card?.last4 || "4829"}`
          : payment.method.replace(/_/g, " ")
        : "—",
    },
    {
      label: "Date & Time",
      value: payment?.paidAt
        ? new Date(payment.paidAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
    },
    {
      label: "Reference No.",
      value: payment?.receiptNo || booking.bookingRef,
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace("/bookings")}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Payment!</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Success Icon */}
        <View style={styles.successCircle}>
          <CheckCircle2 size={52} color="#FFF" strokeWidth={2} />
        </View>

        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>
          Your booking has been confirmed
        </Text>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Receipt Details</Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>PAID</Text>
            </View>
          </View>
          <View style={styles.receiptDivider} />
          {receiptRows.map((row, i) => (
            <View key={i} style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{row.label}</Text>
              <Text
                style={[styles.receiptValue, row.highlight && styles.receiptValueHighlight]}
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.replace("/bookings")}
        >
          <Eye size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>View Booking</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn}>
          <Download size={18} color="#5B3DF5" />
          <Text style={styles.secondaryBtnText}>Download Receipt</Text>
        </Pressable>
      </ScrollView>
    </View>
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
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#25213D",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  backArrow: { color: "#5B3DF5", fontSize: 28, lineHeight: 32, marginTop: -2 },
  headerTitle: { color: "#25213D", fontSize: 18, fontWeight: "800" },

  /* Success Icon */
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#0F9D8A",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
    shadowColor: "#0F9D8A",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  successTitle: {
    color: "#25213D",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    color: "#747B90",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 28,
  },

  /* Receipt Card */
  receiptCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#25213D",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  receiptTitle: { color: "#25213D", fontSize: 16, fontWeight: "900" },
  paidBadge: {
    backgroundColor: "#DDF7F2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: { color: "#0F9D8A", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  receiptDivider: { height: 1, backgroundColor: "#F0F1F7", marginBottom: 14 },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8FC",
  },
  receiptLabel: { color: "#747B90", fontSize: 12, flex: 1 },
  receiptValue: { color: "#25213D", fontSize: 12, fontWeight: "700", textAlign: "right", flex: 1.2 },
  receiptValueHighlight: { color: "#5B3DF5", fontSize: 14, fontWeight: "900" },

  /* Buttons */
  primaryBtn: {
    backgroundColor: "#5B3DF5",
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#E8E5FF",
  },
  secondaryBtnText: { color: "#5B3DF5", fontSize: 15, fontWeight: "700" },
});
