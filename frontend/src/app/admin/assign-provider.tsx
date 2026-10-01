import { assignProvider, getAvailableProviders } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { Button, Card } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import { Star } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
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
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
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
              <Text style={{ color: "#8E8E9A", marginTop: 6 }}>
                <Star size={14} color="#FBBF24" fill="#FBBF24" />{" "}
                {Number(provider.ratingAvg || 0).toFixed(1)} ·{" "}
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
        disabled={!selected}
        onPress={() => {
          void submit();
        }}
      >
        Save assignment
      </Button>
    </ScrollView>
  );
}
