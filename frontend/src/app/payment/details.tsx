import { createPayment, getPayment, getPaymentMethods } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { ProfileBackButton } from "@/components/profile/ProfileNavigation";
import { Button, Card, Input } from "@/components/ui";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

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
    void load();
  }, [load]);

  const submit = async () => {
    const needsCard = method === "card" || method === "demo_card";
    if (method === "card" && !selectedMethod) {
      setError("Select a saved payment method.");
      return;
    }
    if (
      method === "demo_card" &&
      (!cardholderName.trim() ||
        !/^\d{16}$/.test(cardNumber) ||
        !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate) ||
        !/^\d{3,4}$/.test(cvv))
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
        <Text style={{ color: "#747B90", marginTop: 16 }}>Total</Text>
        <Text style={{ color: "#5B3DF5", fontSize: 20, fontWeight: "900" }}>
          LKR {Number(booking.totalPrice || 0).toLocaleString()}
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
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {(["demo_card", "cash_on_completion"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setMethod(value)}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: method === value ? "#5B3DF5" : "#EDEBFF",
            }}
          >
            <Text
              style={{
                color: method === value ? "#FFF" : "#5B3DF5",
                fontWeight: "800",
              }}
            >
              {value === "demo_card" ? "Card" : "Pay on completion"}
            </Text>
          </Pressable>
        ))}
      </View>
      {method === "card" &&
        methods.map((saved) => (
          <Pressable
            key={saved._id}
            onPress={() => setSelectedMethod(saved._id)}
            style={{
              padding: 14,
              marginBottom: 8,
              borderRadius: 12,
              backgroundColor:
                selectedMethod === saved._id ? "#EDEBFF" : "#FFF",
            }}
          >
            <Text>
              {saved.brand || "Card"} ending in {saved.last4}
            </Text>
          </Pressable>
        ))}
      {method === "demo_card" && (
        <Card>
          <Input
            placeholder="Cardholder name"
            value={cardholderName}
            onChangeText={setCardholderName}
          />
          <Input
            placeholder="16-digit card number"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="number-pad"
          />
          <Input
            placeholder="MM/YY"
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
          <Input
            placeholder="CVV"
            value={cvv}
            onChangeText={setCvv}
            keyboardType="number-pad"
            secureTextEntry
          />
        </Card>
      )}
      {!!error && (
        <Text style={{ color: "#B73248", marginBottom: 14 }}>{error}</Text>
      )}
      <Button disabled={busy} onPress={() => void submit()}>
        {busy ? "Saving..." : "Continue"}
      </Button>
    </ScrollView>
  );
}
