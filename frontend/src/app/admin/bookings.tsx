import { getAdminBookings } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { Card, Chip } from "@/components/ui";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";
export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(
        (await getAdminBookings({ status, search: search || undefined })).data
          .data,
      );
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status, search]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Manage bookings
      </Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => void load()}
        placeholder="Search booking or location"
        placeholderTextColor="#8890A5"
        style={{
          backgroundColor: "#FFF",
          borderRadius: 14,
          padding: 15,
          marginVertical: 14,
        }}
      />
      <ScrollView horizontal>
        {[
          "all",
          "pending",
          "assigned",
          "in_progress",
          "completed",
          "cancelled",
        ].map((item) => (
          <Chip key={item} active={status === item}>
            <Text onPress={() => setStatus(item)}>
              {item.replace("_", " ")}
            </Text>
          </Chip>
        ))}
      </ScrollView>
      {loading ? (
        <LoadingState label="Loading bookings..." />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : bookings.length === 0 ? (
        <EmptyState label="No bookings found." />
      ) : (
        bookings.map((booking) => (
          <Card key={booking._id}>
            <Text style={{ color: "#25213D", fontWeight: "900", fontSize: 18 }}>
              {booking.bookingRef}
            </Text>
            <Text style={{ color: "#747B90", marginTop: 8 }}>
              {booking.service?.name || "Service"} ·{" "}
              {booking.customer?.fullName || "Customer"}
            </Text>
            <Text style={{ color: "#747B90", marginTop: 6 }}>
              {booking.provider?.city || "Provider not assigned"} · LKR{" "}
              {Number(booking.totalPrice || 0).toLocaleString()}
            </Text>
            <Text
              style={{
                color: "#0F9D8A",
                fontWeight: "800",
                marginTop: 8,
                textTransform: "capitalize",
              }}
            >
              {booking.status?.replace("_", " ")}
            </Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/admin/assign-provider",
                  params: { bookingId: booking._id },
                })
              }
            >
              <Text
                style={{ color: "#5B3DF5", fontWeight: "900", marginTop: 12 }}
              >
                Assign provider <ChevronRight size={16} color="#5B3DF5" />
              </Text>
            </Pressable>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
