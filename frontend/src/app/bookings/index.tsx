import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { ProfileNavigation } from "@/components/profile/ProfileNavigation";
import { useAuth } from "@/context/AuthContext";
import { getMyBookings } from "@/api/domain";

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const response = await getMyBookings();
      setBookings(response.data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }
      let active = true;
      void Promise.resolve().then(() => {
        if (active) void load();
      });
      return () => {
        active = false;
      };
    }, [load, user?.role]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7FD" }}>
      <View
        style={{
          flex: 1,
          maxWidth: 520,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 22,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
        >
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#242E49" }}>
            My bookings
          </Text>
          <Text
            style={{ color: "#7C879F", marginTop: 8, marginBottom: 22 }}
          >
            Keep track of every service in one place.
          </Text>
          {loading ? (
            <LoadingState label="Loading bookings..." />
          ) : error ? (
            <ErrorState onRetry={() => void load()} />
          ) : bookings.length === 0 ? (
            <EmptyState label="No bookings found." />
          ) : (
            bookings.map((booking) => (
              <Card key={booking._id}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{ color: "#25213D", fontWeight: "900", fontSize: 18 }}
                  >
                    {booking.service?.name || "Service"}
                  </Text>
                  <Text
                    style={{
                      color: "#0F9D8A",
                      fontWeight: "800",
                      textTransform: "capitalize",
                    }}
                  >
                    {booking.status?.replace("_", " ")}
                  </Text>
                </View>
                <Text style={{ color: "#747B90", marginTop: 8 }}>
                  {booking.bookingRef} ·{" "}
                  {booking.scheduledDate
                    ? new Date(booking.scheduledDate).toLocaleDateString()
                    : "Date pending"}
                </Text>
                <Text
                  style={{
                    color: "#5B3DF5",
                    fontWeight: "900",
                    marginTop: 8,
                  }}
                >
                  LKR {Number(booking.totalPrice || 0).toLocaleString()}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 16, marginTop: 14 }}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/payment/details",
                        params: { bookingId: booking._id },
                      })
                    }
                  >
                    <Text style={{ color: "#5B3DF5", fontWeight: "800" }}>
                      Payment
                    </Text>
                  </Pressable>
                  {booking.status === "completed" && (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/reviews/rate",
                          params: { bookingId: booking._id },
                        })
                      }
                    >
                      <Text style={{ color: "#0F9D8A", fontWeight: "800" }}>
                        Rate provider
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            ))
          )}
        </ScrollView>
        <ProfileNavigation active="bookings" />
      </View>
    </SafeAreaView>
  );
}
