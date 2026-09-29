import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { getAdminDashboard } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
export default function AdminDashboard() {
  const [data, setData] = useState<any>();
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      setData((await getAdminDashboard()).data.data);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!data && !error)
    return <LoadingState label="Loading admin dashboard..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;
  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void load()} />
      }
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Admin dashboard
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginVertical: 18,
        }}
      >
        {[
          ["Total bookings", data.totalBookings],
          ["Pending", data.pending],
          ["Ongoing", data.ongoing],
          ["Completed", data.completed],
          ["Available providers", data.availableProviders],
          ["Complaints", data.complaints],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <Text style={{ color: "#747B90" }}>{label}</Text>
            <Text
              style={{
                color: "#5B3DF5",
                fontSize: 28,
                fontWeight: "900",
                marginTop: 6,
              }}
            >
              {value}
            </Text>
          </Card>
        ))}
      </View>
      <Text
        onPress={() => router.push("/admin/bookings")}
        style={{ color: "#5B3DF5", fontWeight: "900", marginBottom: 18 }}
      >
        Manage bookings ›
      </Text>
      <Text
        onPress={() => router.push("/admin/jobs")}
        style={{ color: "#0F9D8A", fontWeight: "900", marginBottom: 18 }}
      >
        Monitor jobs ›
      </Text>
      <Text
        style={{
          color: "#25213D",
          fontSize: 20,
          fontWeight: "900",
          marginBottom: 10,
        }}
      >
        Recent activities
      </Text>
      {data.recentActivity?.length ? (
        data.recentActivity.map((activity: any) => (
          <Card key={activity._id}>
            <Text style={{ color: "#25213D", fontWeight: "800" }}>
              {activity.action}
            </Text>
            <Text style={{ color: "#8890A5", marginTop: 6 }}>
              {new Date(activity.createdAt).toLocaleString()}
            </Text>
          </Card>
        ))
      ) : (
        <EmptyState label="No recent activities." />
      )}
    </ScrollView>
  );
}
