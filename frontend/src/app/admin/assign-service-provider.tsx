import { assignServiceProviders, getServiceProviders } from "@/api/services";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { AddressButton } from "@/components/address/AddressUI";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type Provider = {
  _id: string;
  user?: { fullName?: string; email?: string };
  city?: string;
  assigned: boolean;
  ratingAvg?: number;
};

export default function AssignServiceProvider() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await getServiceProviders(serviceId);
      const items = response.data.data as Provider[];
      setProviders(items);
      setSelected(
        items
          .filter((provider) => provider.assigned)
          .map((provider) => provider._id),
      );
      setError("");
    } catch (failure: any) {
      setError(failure.response?.data?.message || "Unable to load providers.");
    } finally {
      setLoading(false);
    }
  }, [serviceId]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await assignServiceProviders(serviceId, selected);
      router.replace("/admin/services");
    } catch (failure: any) {
      setError(
        failure.response?.data?.message ||
          "Unable to update service providers.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <LoadingState label="Loading providers..." />;
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
      <Text style={{ fontSize: 28, fontWeight: "900", color: "#25213D" }}>
        Assign providers
      </Text>
      <Text style={{ color: "#747B90", marginVertical: 8 }}>
        Choose the active providers who offer this service.
      </Text>
      {providers.length === 0 ? (
        <EmptyState label="No active providers are available." />
      ) : (
        providers.map((provider) => {
          const checked = selected.includes(provider._id);
          return (
            <Pressable
              key={provider._id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() =>
                setSelected((current) =>
                  checked
                    ? current.filter((id) => id !== provider._id)
                    : [...current, provider._id],
                )
              }
              style={{
                backgroundColor: checked ? "#EEE8FF" : "#FFFFFF",
                borderWidth: 1,
                borderColor: checked ? "#633CFF" : "#E8E6F0",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text
                style={{ color: "#25213D", fontSize: 17, fontWeight: "800" }}
              >
                {provider.user?.fullName || "Provider"}
              </Text>
              <Text style={{ color: "#747B90", marginTop: 5 }}>
                {provider.city || "Location not set"} ·{" "}
                {Number(provider.ratingAvg || 0).toFixed(1)} stars
              </Text>
            </Pressable>
          );
        })
      )}
      {!!error && (
        <Text style={{ color: "#C0392B", marginBottom: 12 }}>{error}</Text>
      )}
      <View style={{ gap: 12 }}>
        <AddressButton
          title="Save assignments"
          busy={busy}
          disabled={busy}
          onPress={() => void save()}
        />
        <AddressButton
          title="Cancel"
          secondary
          disabled={busy}
          onPress={() => router.replace("/admin/services")}
        />
      </View>
    </ScrollView>
  );
}
