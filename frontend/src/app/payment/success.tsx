import { getPayment } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { Button } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import {
    CheckCircle2,
    ChevronLeft,
    FileText,
    MoreVertical,
    Share2,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (!data && !error) return <LoadingState label="Loading receipt..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;
  const payment = data.payment;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerButton}>
          <ChevronLeft size={20} color="#25213D" />
        </View>
        <Text style={styles.headerTitle}>Payment successful</Text>
        <View style={styles.headerButton}>
          <MoreVertical size={19} color="#25213D" />
        </View>
      </View>
      <View style={styles.successIcon}>
        <CheckCircle2 size={48} color="#FFF" strokeWidth={2.5} />
      </View>
      <Text style={styles.title}>Payment successful!</Text>
      <Text style={styles.subtitle}>
        Your payment has been recorded. Confirmation sent to your account.
      </Text>
      <View style={styles.actions}>
        <View style={styles.action}>
          <FileText size={14} color="#5B3DF5" />
          <Text style={styles.actionText}>PDF receipt</Text>
        </View>
        <View style={styles.action}>
          <Share2 size={14} color="#5B3DF5" />
          <Text style={styles.actionText}>Share</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Payment details</Text>
      <View style={styles.panel}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>
            LKR{" "}
            {Number(
              payment?.amount || data.booking.totalPrice || 0,
            ).toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Reference code</Text>
          <Text style={styles.value}>
            {payment?.receiptNo || data.booking.bookingRef}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Payment status</Text>
          <Text style={styles.successValue}>
            {payment?.status || "pending"}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Service details</Text>
      <View style={styles.panel}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>
            {data.booking.service?.name || "Home service"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Booking</Text>
          <Text style={styles.value}>{data.booking.bookingRef}</Text>
        </View>
        {payment?.paidAt && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Paid at</Text>
            <Text style={styles.value}>
              {new Date(payment.paidAt).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
      <Button onPress={() => router.replace("/bookings")}>
        Back to bookings
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  content: { padding: 20, paddingBottom: 34 },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 23,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#25213D", fontSize: 16, fontWeight: "800" },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#0F9D8A",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 24,
  },
  title: {
    color: "#25213D",
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 18,
  },
  subtitle: {
    color: "#747B90",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  actions: { flexDirection: "row", gap: 10, marginBottom: 25 },
  action: {
    flex: 1,
    minHeight: 44,
    backgroundColor: "#FFF",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  actionIcon: { color: "#5B3DF5", fontSize: 14 },
  actionText: { color: "#25213D", fontSize: 12, fontWeight: "800" },
  sectionTitle: {
    color: "#25213D",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 9,
  },
  panel: {
    backgroundColor: "#FFF",
    borderRadius: 17,
    padding: 16,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    paddingVertical: 8,
  },
  label: { color: "#747B90", fontSize: 12, flex: 1 },
  value: {
    color: "#25213D",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
  },
  successValue: {
    color: "#0F9D8A",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
});
