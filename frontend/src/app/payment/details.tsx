import { createPayment, getPayment, getPaymentMethods } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { CreditCard, Lock, Plus, ShieldCheck } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function PaymentDetails() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [data, setData] = useState<any>();
  const [methods, setMethods] = useState<any[]>([]);
  const [method, setMethod] = useState<
    "demo_card" | "card" | "cash_on_completion"
  >("demo_card");
  const [selectedMethod, setSelectedMethod] = useState<string>();
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [payment, saved] = await Promise.all([
        getPayment(bookingId),
        getPaymentMethods(),
      ]);
      setData(payment.data.data);
      setMethods(saved.data.data);
      setError("");
    } catch (failure) {
      setError(
        isAxiosError(failure) &&
          typeof failure.response?.data?.message === "string"
          ? failure.response.data.message
          : "Unable to load payment details.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const submit = async () => {
    const needsCard = method === "card" || method === "demo_card";
    if (method === "card" && !selectedMethod) {
      setError("Select a saved payment method.");
      return;
    }
    let isFutureDate = false;
    if (/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
      const [month, year] = expiryDate.split("/").map(Number);
      const expiry = new Date(2000 + year, month, 0, 23, 59, 59);
      if (expiry >= new Date()) isFutureDate = true;
    }

    if (
      method === "demo_card" &&
      (!cardholderName.trim() ||
        !/^\d{16}$/.test(cardNumber) ||
        !isFutureDate ||
        !/^\d{3}$/.test(cvv))
    ) {
      setError("Enter valid demo card details.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await createPayment(bookingId, {
        method,
        paymentMethodId: selectedMethod,
        ...(!selectedMethod && needsCard
          ? { card: { cardholderName, cardNumber, expiryDate, cvv } }
          : {}),
      });
      router.replace({
        pathname: "/payment/success",
        params: {
          bookingId,
          receipt: response.data.data.payment.receiptNo || "pending",
        },
      });
    } catch (failure) {
      setError(
        isAxiosError(failure) &&
          typeof failure.response?.data?.message === "string"
          ? failure.response.data.message
          : "Unable to save payment.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading payment details..." />;
  if (!data)
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );

  const booking = data.booking;
  const serviceFee = Number(booking.totalPrice || 0);
  const platformFee = Math.round(serviceFee * 0.05);
  const tax = Math.round(serviceFee * 0.08);
  const totalAmount = serviceFee + platformFee + tax;

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
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/bookings")
            }
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Booking Reference Badge */}
        <View style={styles.refRow}>
          <Text style={styles.refBadge}>{booking.bookingRef}</Text>
          <Text style={styles.serviceTypeBadge}>
            {booking.service?.name || "Home Service"}
          </Text>
        </View>

        {/* Service Summary Card */}
        <View style={styles.card}>
          <Text style={styles.serviceName}>
            {booking.service?.name || "Home Service"}
          </Text>
          <Text style={styles.providerName}>
            {booking.provider?.name || "Provider"}
          </Text>
          {booking.scheduledDate && (
            <View style={styles.scheduledRow}>
              <Text style={styles.scheduledLabel}>📅</Text>
              <Text style={styles.scheduledText}>
                Scheduled:{" "}
                {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {booking.scheduledTime ? ` • ${booking.scheduledTime}` : ""}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          {/* Fee Breakdown */}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Service Fee</Text>
            <Text style={styles.feeValue}>
              LKR {serviceFee.toLocaleString()}
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Platform Fee</Text>
            <Text style={styles.feeValue}>
              LKR {platformFee.toLocaleString()}
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Tax (8%)</Text>
            <Text style={styles.feeValue}>LKR {tax.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feeRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              LKR {totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Pay Now / Pay on Completion toggle */}
        <View style={styles.payToggleRow}>
          {(["demo_card", "cash_on_completion"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setMethod(value)}
              style={[
                styles.payToggleBtn,
                method === value && styles.payToggleBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.payToggleText,
                  method === value && styles.payToggleTextActive,
                ]}
              >
                {value === "demo_card" ? "Pay Now" : "Pay on Completion"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Payment Method Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Pressable style={styles.addNewBtn}>
            <Plus size={14} color="#5B3DF5" />
            <Text style={styles.addNewText}>Add New</Text>
          </Pressable>
        </View>

        {/* Saved Card */}
        {methods.length > 0 &&
          methods.map((saved) => (
            <Pressable
              key={saved._id}
              onPress={() => {
                setMethod("card");
                setSelectedMethod(saved._id);
              }}
              style={[
                styles.savedCard,
                selectedMethod === saved._id && styles.savedCardActive,
              ]}
            >
              <View style={styles.cardIconWrap}>
                <CreditCard size={20} color="#5B3DF5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedCardBrand}>
                  {saved.brand || "Visa"} ending in {saved.last4}
                </Text>
                <Text style={styles.savedCardExpiry}>
                  Expires {saved.expMonth}/{saved.expYear}
                </Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selectedMethod === saved._id && styles.radioOuterActive,
                ]}
              >
                {selectedMethod === saved._id && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </Pressable>
          ))}

        {/* Demo Card Input */}
        {method === "demo_card" && (
          <View style={styles.card}>
            <View style={styles.cardInputHeader}>
              <CreditCard size={18} color="#5B3DF5" />
              <Text style={styles.cardInputTitle}>Card Details</Text>
            </View>
            <TextInput
              placeholder="Cardholder name"
              placeholderTextColor="#B0B6C9"
              value={cardholderName}
              onChangeText={setCardholderName}
              style={styles.input}
            />
            <TextInput
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#B0B6C9"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="number-pad"
              maxLength={16}
              style={styles.input}
            />
            <View style={styles.inputRow}>
              <TextInput
                placeholder="MM/YY"
                placeholderTextColor="#B0B6C9"
                value={expiryDate}
                onChangeText={setExpiryDate}
                style={[styles.input, styles.inputHalf]}
              />
              <TextInput
                placeholder="CVV"
                placeholderTextColor="#B0B6C9"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                style={[styles.input, styles.inputHalf]}
              />
            </View>
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Security note */}
        <View style={styles.securityRow}>
          <ShieldCheck size={14} color="#0F9D8A" />
          <Text style={styles.securityText}>
            Secured by 256-bit SSL encryption
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Pay Now Button */}
      <View style={styles.stickyFooter}>
        <Pressable
          onPress={() => void submit()}
          disabled={busy}
          style={[styles.payNowBtn, busy && { opacity: 0.7 }]}
        >
          <Lock size={16} color="#FFF" />
          <Text style={styles.payNowText}>
            {busy
              ? "Processing..."
              : method === "cash_on_completion"
                ? "Confirm Booking"
                : `Pay Now — LKR ${totalAmount.toLocaleString()}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 110 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
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

  /* Ref Row */
  refRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  refBadge: {
    backgroundColor: "#EDEBFF",
    color: "#5B3DF5",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceTypeBadge: {
    backgroundColor: "#F0F1F7",
    color: "#747B90",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  /* Card */
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#25213D",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  serviceName: { color: "#25213D", fontSize: 18, fontWeight: "900", marginBottom: 4 },
  providerName: { color: "#747B90", fontSize: 13, marginBottom: 10 },
  scheduledRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  scheduledLabel: { fontSize: 12 },
  scheduledText: { color: "#747B90", fontSize: 12 },
  divider: { height: 1, backgroundColor: "#F0F1F7", marginVertical: 14 },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  feeLabel: { color: "#747B90", fontSize: 13 },
  feeValue: { color: "#25213D", fontSize: 13, fontWeight: "700" },
  totalLabel: { color: "#25213D", fontSize: 15, fontWeight: "900" },
  totalValue: { color: "#5B3DF5", fontSize: 18, fontWeight: "900" },

  /* Pay Toggle */
  payToggleRow: {
    flexDirection: "row",
    backgroundColor: "#EDEBFF",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  payToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
  },
  payToggleBtnActive: { backgroundColor: "#FFF", shadowColor: "#25213D", shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  payToggleText: { color: "#747B90", fontSize: 13, fontWeight: "700" },
  payToggleTextActive: { color: "#5B3DF5", fontWeight: "800" },

  /* Section Header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { color: "#25213D", fontSize: 16, fontWeight: "900" },
  addNewBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addNewText: { color: "#5B3DF5", fontSize: 13, fontWeight: "700" },

  /* Saved Card */
  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#F0EEF8",
  },
  savedCardActive: { borderColor: "#5B3DF5", backgroundColor: "#F8F7FF" },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  savedCardBrand: { color: "#25213D", fontWeight: "800", fontSize: 14 },
  savedCardExpiry: { color: "#747B90", fontSize: 11, marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D0CBEA",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: "#5B3DF5" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#5B3DF5" },

  /* Card Input */
  cardInputHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardInputTitle: { color: "#25213D", fontSize: 15, fontWeight: "800" },
  input: {
    backgroundColor: "#F4F5FA",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#25213D",
    marginBottom: 10,
  },
  inputRow: { flexDirection: "row", gap: 10 },
  inputHalf: { flex: 1, marginBottom: 0 },

  errorText: { color: "#B73248", marginBottom: 10, fontSize: 13 },

  /* Security */
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6, marginBottom: 4 },
  securityText: { color: "#0F9D8A", fontSize: 11, fontWeight: "600" },

  /* Sticky Footer */
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#F0EEF8",
  },
  payNowBtn: {
    backgroundColor: "#5B3DF5",
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payNowText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
