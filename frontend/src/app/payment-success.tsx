import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text } from "react-native";
import { Button, Card } from "@/components/ui";
import { getPayment } from "@/api/domain";
import { ErrorState, LoadingState } from "@/components/DataState";
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
    void load();
  }, [load]);
  if (!data && !error) return <LoadingState label="Loading receipt..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;
  const payment = data.payment;
  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{
        padding: 24,
        justifyContent: "center",
        flexGrow: 1,
      }}
    >
      <Text style={{ color: "#0F9D8A", fontWeight: "900", letterSpacing: 1 }}>
        PAYMENT RECORDED
      </Text>
      <Text
        style={{
          color: "#25213D",
          fontSize: 30,
          fontWeight: "900",
          marginTop: 8,
        }}
      >
        Payment successful
      </Text>
      <Card>
        <Text style={{ color: "#747B90" }}>Booking</Text>
        <Text style={{ color: "#25213D", fontWeight: "900", marginTop: 5 }}>
          {data.booking.bookingRef}
        </Text>
        <Text style={{ color: "#747B90", marginTop: 18 }}>Amount</Text>
        <Text style={{ color: "#5B3DF5", fontSize: 24, fontWeight: "900" }}>
          LKR{" "}
          {Number(
            payment?.amount || data.booking.totalPrice || 0,
          ).toLocaleString()}
        </Text>
        <Text style={{ color: "#747B90", marginTop: 14 }}>
          Status: {payment?.status || "pending"}
        </Text>
        {payment?.receiptNo ? (
          <Text style={{ color: "#747B90", marginTop: 6 }}>
            Receipt: {payment.receiptNo}
          </Text>
        ) : null}
        {payment?.paidAt ? (
          <Text style={{ color: "#747B90", marginTop: 6 }}>
            {new Date(payment.paidAt).toLocaleString()}
          </Text>
        ) : null}
      </Card>
      <Button onPress={() => router.replace("/bookings")}>
        Back to bookings
      </Button>
    </ScrollView>
  );
}
