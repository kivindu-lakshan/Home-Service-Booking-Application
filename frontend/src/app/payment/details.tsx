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
  const [refundProtection, setRefundProtection] = useState(false);
  const [showProtectionInfo, setShowProtectionInfo] = useState(false);

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
    void load();
  }, [load]);

  // Automatically add "/" after entering the expiry month.
  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);

    if (digits.length > 2) {
      setExpiryDate(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setExpiryDate(digits);
    }
  };

  // Expiry must be at least one month ahead of the current date.
  const isValidExpiry = (value: string) => {
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) {
      return false;
    }

    const [month, year] = value.split("/").map(Number);
    const expiryEnd = new Date(
      2000 + year,
      month,
      0,
      23,
      59,
      59,
      999,
    );

    const minimumExpiry = new Date();
    minimumExpiry.setMonth(minimumExpiry.getMonth() + 1);
    minimumExpiry.setDate(1);
    minimumExpiry.setHours(0, 0, 0, 0);

    return expiryEnd >= minimumExpiry;
  };

  const submit = async () => {
    const needsCard = method === "card" || method === "demo_card";

    if (method === "card" && !selectedMethod) {
      setError(
        "Select a saved payment method or choose Pay Now to enter card details.",
      );
      return;
    }

    if (
      method === "demo_card" &&
      (!cardholderName.trim() ||
        !/^\d{16}$/.test(cardNumber) ||
        !isValidExpiry(expiryDate) ||
        !/^\d{3,4}$/.test(cvv))
    ) {
      setError(
        "Enter a name, a 16-digit card number, a valid expiry date, and a 3 or 4 digit CVV.",
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await createPayment(bookingId, {
        method,
        paymentMethodId: selectedMethod,
        refundProtection: needsCard ? refundProtection : false,
        ...(method === "demo_card"
          ? {
            card: {
              cardholderName,
              cardNumber,
              expiryDate,
              cvv,
            },
          }
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

  if (loading) {
    return <LoadingState label="Loading payment details..." />;
  }

  if (!data) {
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  }

  const booking = data.booking;
  const serviceFee = Number(booking.totalPrice || 0);
  const platformFee = Math.round(serviceFee * 0.05);
  const tax = Math.round(serviceFee * 0.08);
  const isCardPayment = method === "demo_card" || method === "card";

  const protectionFee =
    isCardPayment && refundProtection
      ? Math.round(serviceFee * 0.1)
      : 0;

  const totalAmount =
    serviceFee + platformFee + tax + protectionFee;

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
              router.canGoBack()
                ? router.back()
                : router.replace("/bookings")
            }
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Booking reference */}
        <View style={styles.refRow}>
          <Text style={styles.refBadge}>{booking.bookingRef}</Text>
          <Text style={styles.serviceTypeBadge}>
            {booking.service?.name || "Home Service"}
          </Text>
        </View>

        {/* Booking and payment summary */}
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
                {new Date(booking.scheduledDate).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
                {booking.scheduledTime
                  ? ` • ${booking.scheduledTime}`
                  : ""}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

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
            <Text style={styles.feeValue}>
              LKR {tax.toLocaleString()}
            </Text>
          </View>

          {isCardPayment && refundProtection && (
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, styles.purpleBold]}>
                Refund Protection (10%)
              </Text>

              <Text style={[styles.feeValue, styles.purpleBold]}>
                + LKR {protectionFee.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.feeRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              LKR {totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Optional refund protection */}
        {isCardPayment && (
          <View style={styles.protectionCard}>
            <View style={styles.protectionHeader}>
              <ShieldCheck size={20} color="#5B3DF5" />

              <Text style={styles.protectionTitle}>
                Refund Protection — Add 10%
              </Text>

              <Pressable
                onPress={() =>
                  setShowProtectionInfo((value) => !value)
                }
                style={styles.infoBtn}
                accessibilityLabel="Refund protection info"
              >
                <Text style={styles.infoBtnText}>ⓘ</Text>
              </Pressable>
            </View>

            <Text style={styles.protectionDescription}>
              Add optional refund protection for an additional 10% of
              your booking amount. If you cancel before your service
              provider arrives, you may request a refund of your
              eligible booking payment.
            </Text>

            {showProtectionInfo && (
              <View style={styles.protectionInfoBox}>
                <Text style={styles.protectionInfoText}>
                  • Eligibility: You must cancel before the provider
                  arrives.{"\n"}
                  • Fee: The 10% protection fee itself is
                  non-refundable.{"\n"}
                  • Review: Refund requests are reviewed by an
                  administrator and are not automatic or guaranteed.
                </Text>
              </View>
            )}

            <Pressable
              onPress={() =>
                setRefundProtection((value) => !value)
              }
              style={styles.protectionRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: refundProtection }}
            >
              <View
                style={[
                  styles.checkbox,
                  refundProtection && styles.checkboxActive,
                ]}
              >
                {refundProtection && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.protectionLabel}>
                  Add Refund Protection (+LKR{" "}
                  {Math.round(serviceFee * 0.1).toLocaleString()})
                </Text>

                <Text style={styles.protectionSub}>
                  Optional additional charge. Select this to become
                  eligible to request a refund if the booking meets
                  the refund rules.
                </Text>
              </View>
            </Pressable>

            {refundProtection && (
              <View style={styles.protectionFeeRow}>
                <Text style={styles.protectionFeeLabel}>
                  Protection fee added (10%)
                </Text>

                <Text style={styles.protectionFeeValue}>
                  + LKR {protectionFee.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Payment type */}
        <View style={styles.payToggleRow}>
          {(
            ["demo_card", "cash_on_completion"] as const
          ).map((value) => (
            <Pressable
              key={value}
              onPress={() => {
                setMethod(value);
                setSelectedMethod(undefined);
                setError("");
              }}
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
                {value === "demo_card"
                  ? "Pay Now"
                  : "Pay on Completion"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Saved payment methods */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <View style={styles.addNewBtn}>
            <Plus size={14} color="#5B3DF5" />
            <Text style={styles.addNewText}>Add New</Text>
          </View>
        </View>

        {methods.length > 0 &&
          methods.map((saved) => (
            <Pressable
              key={saved._id}
              onPress={() => {
                setMethod("card");
                setSelectedMethod(saved._id);
                setRefundProtection(false);
              }}
              style={[
                styles.savedCard,
                selectedMethod === saved._id &&
                styles.savedCardActive,
              ]}
            >
              <View style={styles.cardIconWrap}>
                <CreditCard size={20} color="#5B3DF5" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.savedCardBrand}>
                  {saved.brand || "Card"} ending in {saved.last4}
                </Text>

                <Text style={styles.savedCardExpiry}>
                  Expires {saved.expMonth}/{saved.expYear}
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  selectedMethod === saved._id &&
                  styles.radioOuterActive,
                ]}
              >
                {selectedMethod === saved._id && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </Pressable>
          ))}

        {/* Card details */}
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
              autoCapitalize="words"
              style={styles.input}
            />

            <TextInput
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#B0B6C9"
              value={cardNumber}
              onChangeText={(value) =>
                setCardNumber(
                  value.replace(/\D/g, "").slice(0, 16),
                )
              }
              keyboardType="number-pad"
              maxLength={16}
              style={styles.input}
            />

            <View style={styles.inputRow}>
              <TextInput
                placeholder="MM/YY"
                placeholderTextColor="#B0B6C9"
                value={expiryDate}
                onChangeText={handleExpiryChange}
                keyboardType="number-pad"
                maxLength={5}
                style={[styles.input, styles.inputHalf]}
              />

              <TextInput
                placeholder="CVV"
                placeholderTextColor="#B0B6C9"
                value={cvv}
                onChangeText={(value) =>
                  setCvv(value.replace(/\D/g, "").slice(0, 4))
                }
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                style={[styles.input, styles.inputHalf]}
              />
            </View>
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.securityRow}>
          <ShieldCheck size={14} color="#0F9D8A" />

          <Text style={styles.securityText}>
            Demo payment form — no real card charge is processed
          </Text>
        </View>
      </ScrollView>

      {/* Sticky payment button */}
      <View style={styles.stickyFooter}>
        <Pressable
          onPress={() => void submit()}
          disabled={busy}
          style={[
            styles.payNowBtn,
            busy && { opacity: 0.7 },
          ]}
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
  screen: {
    flex: 1,
    backgroundColor: "#F7F7FB",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 110,
  },
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
  backArrow: {
    color: "#5B3DF5",
    fontSize: 28,
    lineHeight: 32,
    marginTop: -2,
  },
  headerTitle: {
    color: "#25213D",
    fontSize: 18,
    fontWeight: "800",
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
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
  serviceName: {
    color: "#25213D",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  providerName: {
    color: "#747B90",
    fontSize: 13,
    marginBottom: 10,
  },
  scheduledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  scheduledLabel: {
    fontSize: 12,
  },
  scheduledText: {
    color: "#747B90",
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F1F7",
    marginVertical: 14,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  feeLabel: {
    color: "#747B90",
    fontSize: 13,
  },
  feeValue: {
    color: "#25213D",
    fontSize: 13,
    fontWeight: "700",
  },
  totalLabel: {
    color: "#25213D",
    fontSize: 15,
    fontWeight: "900",
  },
  totalValue: {
    color: "#5B3DF5",
    fontSize: 18,
    fontWeight: "900",
  },
  purpleBold: {
    color: "#5B3DF5",
    fontWeight: "800",
  },
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
  payToggleBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#25213D",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  payToggleText: {
    color: "#747B90",
    fontSize: 13,
    fontWeight: "700",
  },
  payToggleTextActive: {
    color: "#5B3DF5",
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#25213D",
    fontSize: 16,
    fontWeight: "900",
  },
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addNewText: {
    color: "#5B3DF5",
    fontSize: 13,
    fontWeight: "700",
  },
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
  savedCardActive: {
    borderColor: "#5B3DF5",
    backgroundColor: "#F8F7FF",
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  savedCardBrand: {
    color: "#25213D",
    fontWeight: "800",
    fontSize: 14,
  },
  savedCardExpiry: {
    color: "#747B90",
    fontSize: 11,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D0CBEA",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: "#5B3DF5",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5B3DF5",
  },
  cardInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardInputTitle: {
    color: "#25213D",
    fontSize: 15,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#F4F5FA",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#25213D",
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputHalf: {
    flex: 1,
    marginBottom: 0,
  },
  errorText: {
    color: "#B73248",
    marginBottom: 10,
    fontSize: 13,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  securityText: {
    color: "#0F9D8A",
    fontSize: 11,
    fontWeight: "600",
  },
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
  payNowText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  protectionCard: {
    backgroundColor: "#F8F6FF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D6CCFF",
    padding: 16,
    marginBottom: 14,
  },
  protectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  protectionTitle: {
    flex: 1,
    color: "#25213D",
    fontSize: 14,
    fontWeight: "800",
  },
  infoBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtnText: {
    color: "#5B3DF5",
    fontSize: 17,
    fontWeight: "700",
  },
  protectionDescription: {
    color: "#554A78",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  protectionInfoBox: {
    backgroundColor: "#EDE8FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  protectionInfoText: {
    color: "#4A3A7A",
    fontSize: 12,
    lineHeight: 19,
  },
  protectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#B0A8D4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  checkboxActive: {
    backgroundColor: "#5B3DF5",
    borderColor: "#5B3DF5",
  },
  checkmark: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  protectionLabel: {
    color: "#25213D",
    fontSize: 13,
    fontWeight: "800",
  },
  protectionSub: {
    color: "#747B90",
    fontSize: 11,
    marginTop: 2,
  },
  protectionFeeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#D6CCFF",
  },
  protectionFeeLabel: {
    color: "#5B3DF5",
    fontSize: 12,
    fontWeight: "700",
  },
  protectionFeeValue: {
    color: "#5B3DF5",
    fontSize: 14,
    fontWeight: "900",
  },
});