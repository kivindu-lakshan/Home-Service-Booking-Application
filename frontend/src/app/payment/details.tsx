import { createPayment, getPayment, getPaymentMethods } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
import { Button, Card, Input } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function PaymentDetails() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [data, setData] = useState<any>();
  const [methods, setMethods] = useState<any[]>([]);
  const [method, setMethod] = useState("cash_on_completion");
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
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to load payment details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
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
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await createPayment(bookingId, {
        method,
        paymentMethodId: selectedMethod,
        ...(!selectedMethod && method === "card"
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
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
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
          onPress={() => {
            setMethod("card");
            setSelectedMethod(saved._id);
          }}
        >
          <Card>
            <Text
              style={{
                color:
                  method === "card" && selectedMethod === saved._id
                    ? "#5B3DF5"
                    : "#25213D",
                fontWeight: "800",
              }}
            >
              {saved.brand || "Card"} ending {saved.last4}
            </Text>
          </Card>
        </Pressable>
      ))}
      <Pressable
        onPress={() => {
          setMethod("card");
          setSelectedMethod(undefined);
        }}
      >
        <Card>
          <Text
            style={{
              color:
                method === "card" && !selectedMethod ? "#5B3DF5" : "#25213D",
              fontWeight: "800",
            }}
          >
            Use a new card
          </Text>
        </Card>
      </Pressable>
      {method === "card" && !selectedMethod ? (
        <Card>
          <Text
            style={{ color: "#25213D", fontWeight: "900", marginBottom: 12 }}
          >
            Card details
          </Text>
          <Input
            placeholder="Card owner's name"
            value={cardholderName}
            onChangeText={setCardholderName}
            autoCapitalize="words"
          />
          <Input
            placeholder="Card number (16 digits)"
            value={cardNumber}
            onChangeText={(value) =>
              setCardNumber(value.replace(/\D/g, "").slice(0, 16))
            }
            keyboardType="number-pad"
            maxLength={16}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Input
              placeholder="MM/YY"
              value={expiryDate}
              onChangeText={(value) =>
                setExpiryDate(value.replace(/[^\d/]/g, "").slice(0, 5))
              }
              keyboardType="number-pad"
              maxLength={5}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="CVV"
              value={cvv}
              onChangeText={(value) =>
                setCvv(value.replace(/\D/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={{ flex: 1 }}
            />
          </View>
          <Text style={{ color: "#747B90", fontSize: 12 }}>
            Your full card number and CVV are used only to authorize this
            payment.
          </Text>
        </Card>
      ) : null}
      <Pressable
        onPress={() => {
          setMethod("cash_on_completion");
          setSelectedMethod(undefined);
        }}
      >
        <Card>
          <Text
            style={{
              color: method === "cash_on_completion" ? "#5B3DF5" : "#25213D",
              fontWeight: "800",
            }}
          >
            Pay on completion
          </Text>
        </Card>
      </Pressable>
      {error ? (
        <Text style={{ color: "#C0392B", marginBottom: 12 }}>{error}</Text>
      ) : null}
      <Button
        onPress={() => {
          void submit();
        }}
      >
        {busy
          ? "Saving..."
          : method === "card"
            ? `Pay now - LKR ${Number(booking.totalPrice || 0).toLocaleString()}`
            : "Confirm pay on completion"}
      </Button>
      {payment ? (
        <Text style={{ color: "#747B90", textAlign: "center", marginTop: 14 }}>
          Current payment status: {payment.status}
        </Text>
      ) : null}
    </ScrollView>
  );
}
