import { isAxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { Button, Card } from "@/components/ui";
import { createPayment, getPayment, getPaymentMethods } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
<<<<<<< HEAD
import { ProfileBackButton } from "@/components/profile/ProfileNavigation";

type PaymentMethod = {
  _id: string;
  brand?: string;
  last4: string;
};
=======
import { Button, Input } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import {
    Check,
    ChevronLeft,
    CreditCard,
    MoreVertical,
    ShieldCheck,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
>>>>>>> origin/origin-02/feature/payment,review,admin

export default function PaymentDetails() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [data, setData] = useState<any>();
<<<<<<< HEAD
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [method, setMethod] = useState("cash_on_completion");
=======
  const [methods, setMethods] = useState<any[]>([]);
  const [method, setMethod] = useState<
    "demo_card" | "card" | "cash_on_completion"
  >("demo_card");
>>>>>>> origin/origin-02/feature/payment,review,admin
  const [selectedMethod, setSelectedMethod] = useState<string>();
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
        isAxiosError(failure) && typeof failure.response?.data?.message === "string"
          ? failure.response.data.message
          : "Unable to load payment details.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const submit = async () => {
    if (method === "card" && !selectedMethod) {
      setError("Select a saved payment method.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await createPayment(bookingId, {
        method,
        paymentMethodId: selectedMethod,
      });
      await getPayment(bookingId);
      router.replace({
        pathname: "/payment/success",
        params: {
          bookingId,
          receipt: response.data.data.payment.receiptNo || "pending",
        },
      });
    } catch (failure) {
      setError(
        isAxiosError(failure) && typeof failure.response?.data?.message === "string"
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
  const payment = data.payment;
<<<<<<< HEAD

  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <ProfileBackButton
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/bookings")
        }
      />
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Payment details
      </Text>
      <Card>
        <Text style={{ color: "#747B90" }}>Booking reference</Text>
        <Text
          style={{
            color: "#25213D",
            fontWeight: "900",
            fontSize: 18,
            marginTop: 6,
          }}
        >
          {booking.bookingRef}
        </Text>
        <Text style={{ color: "#747B90", marginTop: 16 }}>Service charge</Text>
        <Text style={{ color: "#25213D", fontWeight: "800" }}>
          LKR {Number(booking.serviceFee || 0).toLocaleString()}
        </Text>
        <Text style={{ color: "#747B90", marginTop: 10 }}>Tax</Text>
        <Text style={{ color: "#25213D", fontWeight: "800" }}>
          LKR {Number(booking.tax || 0).toLocaleString()}
        </Text>
        <Text
          style={{
            color: "#5B3DF5",
            fontSize: 20,
            fontWeight: "900",
            marginTop: 16,
          }}
        >
          Total LKR {Number(booking.totalPrice || 0).toLocaleString()}
        </Text>
      </Card>
      <Text
        style={{
          color: "#25213D",
          fontWeight: "900",
          fontSize: 18,
          marginBottom: 10,
        }}
      >
        Payment method
      </Text>
      {methods.map((saved) => (
        <Pressable
          key={saved._id}
          accessibilityRole="radio"
          accessibilityState={{
            checked: method === "card" && selectedMethod === saved._id,
          }}
          onPress={() => {
            setMethod("card");
            setSelectedMethod(saved._id);
          }}
=======
  const submit = async () => {
    if ((method === "card" || method === "demo_card") && !selectedMethod) {
      if (!cardholderName.trim()) {
        setError("Enter the card owner's name.");
        return;
      }
      if (!/^\d{16}$/.test(cardNumber)) {
        setError("Card number must contain exactly 16 digits.");
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
        setError("Enter the expiry date in MM/YY format.");
        return;
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        setError("CVV must contain 3 or 4 digits.");
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const response = await createPayment(bookingId, {
        method,
        paymentMethodId: selectedMethod,
        ...(!selectedMethod && (method === "card" || method === "demo_card")
          ? { card: { cardholderName, cardNumber, expiryDate, cvv } }
          : {}),
      });
      await getPayment(bookingId);
      router.replace({
        pathname: "/payment/success",
        params: {
          bookingId,
          receipt: response.data.data.payment.receiptNo || "pending",
        },
      });
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to save payment.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/bookings")
          }
          style={styles.headerButton}
>>>>>>> origin/origin-02/feature/payment,review,admin
        >
          <ChevronLeft size={20} color="#25213D" />
        </Pressable>
<<<<<<< HEAD
      ))}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{
          checked: method === "cash_on_completion",
        }}
=======
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerButton}>
          <MoreVertical size={19} color="#25213D" />
        </View>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>Current balance</Text>
          <View style={styles.cardMark}>
            <View style={styles.cardMarkRed} />
            <View style={styles.cardMarkYellow} />
          </View>
        </View>
        <Text style={styles.balanceAmount}>
          LKR {Number(booking.totalPrice || 0).toLocaleString()}
        </Text>
        <View style={styles.balanceBottom}>
          <Text style={styles.cardNumber}>Booking {booking.bookingRef}</Text>
          <Text style={styles.cardDate}>Payment</Text>
        </View>
      </View>
      <View style={styles.carousel}>
        <View />
        <View style={styles.carouselActive} />
        <View />
      </View>

      <Pressable style={styles.voucherRow}>
        <Text style={styles.voucherText}>Voucher code...</Text>
        <Check size={16} color="#747B90" />
      </Pressable>
      <View style={styles.demoPanel}>
        <CreditCard size={22} color="#5B3DF5" />
        <View style={styles.demoCopy}>
          <Text style={styles.demoTitle}>Demo card details</Text>
          <Text style={styles.demoText}>
            Enter these safe test values: 4242 4242 4242 4242, 12/34, CVV 123,
            Demo Customer.
          </Text>
        </View>
      </View>
      {method === "demo_card" && (
        <>
          <Text style={styles.sectionTitle}>Card number</Text>
          <View style={styles.cardInputRow}>
            <Input
              accessibilityLabel="Card number, exactly 16 digits"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChangeText={(value) =>
                setCardNumber(value.replace(/\D/g, "").slice(0, 16))
              }
              keyboardType="number-pad"
              maxLength={16}
              style={styles.cardInput}
            />
            <CreditCard size={22} color="#5B3DF5" />
          </View>
          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              <Text style={styles.fieldLabel}>Expiry date</Text>
              <Input
                accessibilityLabel="Card expiry date, MM slash YY"
                placeholder="12/34"
                value={expiryDate}
                onChangeText={(value) =>
                  setExpiryDate(value.replace(/[^\d/]/g, "").slice(0, 5))
                }
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            <View style={styles.formColumn}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <Input
                accessibilityLabel="Card CVV"
                placeholder="123"
                value={cvv}
                onChangeText={(value) =>
                  setCvv(value.replace(/\D/g, "").slice(0, 4))
                }
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
              />
            </View>
          </View>
          <Text style={styles.sectionTitle}>Cardholder name</Text>
          <Input
            accessibilityLabel="Card owner's name"
            placeholder="Demo Customer"
            value={cardholderName}
            onChangeText={setCardholderName}
            autoCapitalize="words"
          />
        </>
      )}
      <Text style={styles.reference}>
        Booking {booking.bookingRef} - Service charge LKR{" "}
        {Number(booking.serviceFee || 0).toLocaleString()} - Tax LKR{" "}
        {Number(booking.tax || 0).toLocaleString()}
      </Text>
      {methods.length > 0 && (
        <View style={styles.savedMethods}>
          {methods.map((saved) => (
            <Pressable
              key={saved._id}
              onPress={() => {
                setMethod("card");
                setSelectedMethod(saved._id);
              }}
            >
              <Text style={styles.savedMethod}>
                {saved.brand || "Card"} ending {saved.last4}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
>>>>>>> origin/origin-02/feature/payment,review,admin
        onPress={() => {
          setMethod("cash_on_completion");
          setSelectedMethod(undefined);
        }}
        style={styles.cashRow}
      >
        <Text style={styles.cashText}>Pay on completion</Text>
        <Text style={styles.cashHint}>
          {method === "cash_on_completion" ? "Selected" : "Select"}
        </Text>
      </Pressable>
<<<<<<< HEAD
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: "#C0392B", marginBottom: 12 }}
        >
          {error}
        </Text>
      ) : null}
      <Button onPress={() => void submit()} disabled={busy}>
=======
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        onPress={() => {
          void submit();
        }}
      >
>>>>>>> origin/origin-02/feature/payment,review,admin
        {busy
          ? "Saving..."
          : method === "cash_on_completion"
            ? "Confirm pay on completion"
            : "Pay with demo card"}
      </Button>
      <View style={styles.secure}>
        <ShieldCheck size={15} color="#0F9D8A" />
        <Text style={styles.secureText}>
          Secure payment · {payment?.status || "Ready to pay"}
        </Text>
      </View>
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
    marginBottom: 18,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#25213D", fontSize: 17, fontWeight: "800" },
  balanceCard: {
    backgroundColor: "#5B3DF5",
    borderRadius: 18,
    padding: 18,
    minHeight: 164,
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { color: "#FFF", fontSize: 11, opacity: 0.9 },
  balanceAmount: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },
  balanceBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 42,
  },
  cardNumber: { color: "#FFF", fontSize: 11, opacity: 0.9 },
  cardDate: { color: "#FFF", fontSize: 11, opacity: 0.9 },
  cardMark: { width: 36, height: 18, flexDirection: "row" },
  cardMarkRed: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#C0392B",
    opacity: 0.9,
  },
  cardMarkYellow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F4F5FA",
    marginLeft: -7,
    opacity: 0.9,
  },
  carousel: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginVertical: 10,
  },
  carouselActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#5B3DF5",
  },
  voucherRow: {
    minHeight: 48,
    backgroundColor: "#FFF",
    borderRadius: 13,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  voucherText: { color: "#747B90", fontSize: 13 },
  sectionTitle: {
    color: "#25213D",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardInputRow: {
    backgroundColor: "#F4F5FA",
    borderRadius: 14,
    minHeight: 50,
    paddingRight: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  cardInput: { flex: 1, marginBottom: 0, backgroundColor: "transparent" },
  formRow: { flexDirection: "row", gap: 10 },
  formColumn: { flex: 1 },
  fieldLabel: { color: "#747B90", fontSize: 11, marginBottom: 6 },
  reference: {
    color: "#747B90",
    fontSize: 11,
    lineHeight: 18,
    marginBottom: 12,
  },
  demoPanel: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#EDEBFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
  },
  demoCopy: { flex: 1 },
  demoTitle: { color: "#25213D", fontWeight: "800", marginBottom: 4 },
  demoText: { color: "#747B90", fontSize: 11, lineHeight: 17 },
  savedMethods: {
    backgroundColor: "#EDEBFF",
    borderRadius: 13,
    padding: 12,
    marginBottom: 12,
  },
  savedMethod: {
    color: "#5B3DF5",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 4,
  },
  cashRow: {
    minHeight: 48,
    backgroundColor: "#FFF",
    borderRadius: 13,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cashText: { color: "#25213D", fontWeight: "800" },
  cashHint: { color: "#0F9D8A", fontSize: 12, fontWeight: "800" },
  error: { color: "#C0392B", marginBottom: 12 },
  secure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 15,
  },
  secureText: { color: "#747B90", fontSize: 11 },
});
