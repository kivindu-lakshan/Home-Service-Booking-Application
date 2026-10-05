import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { Button, Card } from "@/components/ui";
import { assignProvider, getAvailableProviders } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
export default function AssignProvider() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [providers, setProviders] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setProviders((await getAvailableProviders(bookingId)).data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to load providers.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);
  useEffect(() => {
    void load();
  }, [load]);
  const submit = async () => {
    try {
      await assignProvider(bookingId, selected);
      router.replace("/admin/bookings");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to assign provider.");
    }
  };
  if (loading) return <LoadingState label="Loading available providers..." />;
  if (error && !providers.length)
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Assign provider
      </Text>
      {providers.length === 0 ? (
        <EmptyState label="No eligible providers found." />
      ) : (
        providers.map((provider) => (
          <Pressable
            key={provider._id}
            onPress={() => setSelected(provider._id)}
          >
            <Card>
              <Text
                style={{
                  color: selected === provider._id ? "#5B3DF5" : "#25213D",
                  fontWeight: "900",
                  fontSize: 18,
                }}
              >
                {provider.user?.fullName || "Provider"}
              </Text>
              <Text style={{ color: "#F29D38", marginTop: 6 }}>
                ★ {Number(provider.ratingAvg || 0).toFixed(1)} ·{" "}
                {provider.city || "Location not set"}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
      {error ? (
        <Text style={{ color: "#C0392B", marginBottom: 12 }}>{error}</Text>
      ) : null}
      <Button
        onPress={() => {
          void submit();
        }}
      >
        Save assignment
      </Button>
    </ScrollView>
  );
}
