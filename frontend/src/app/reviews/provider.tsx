import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { ScrollView, Text } from "react-native";
import { Button, Card } from "@/components/ui";
import { getProviderReviews } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
export default function ProviderReviews() {
  const { providerId = "", serviceId } = useLocalSearchParams<{ providerId: string; serviceId?: string }>();
  const request = useRef<AbortController | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>();
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setError(false);
    try {
      const response = await getProviderReviews(providerId, serviceId, controller.signal, page);
      if (!controller.signal.aborted) setData(response.data.data);
    } catch {
      if (!controller.signal.aborted) setError(true);
    }
  }, [providerId, serviceId, page]);
  useFocusEffect(useCallback(() => {
    let active = true; void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; request.current?.abort(); };
  }, [load]));
  if (!data && !error)
    return <LoadingState label="Loading provider reviews..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;
  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        Provider reviews
      </Text>
      <Text
        style={{
          color: "#F29D38",
          fontSize: 22,
          fontWeight: "900",
          marginVertical: 12,
        }}
      >
        ★ {Number(data.provider?.ratingAvg || 0).toFixed(1)} ·{" "}
        {data.provider?.reviewCount || 0} reviews
      </Text>
      {data.reviews.length === 0 ? (
        <EmptyState label="No reviews yet." />
      ) : (
        data.reviews.map((review: any) => (
          <Card key={review._id}>
            <Text style={{ color: "#F29D38", fontSize: 22 }}>
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </Text>
            <Text style={{ color: "#25213D", fontWeight: "800", marginTop: 8 }}>
              {review.customer?.fullName || "Customer"}
            </Text>
            <Text style={{ color: "#747B90", marginTop: 8 }}>
              {review.comment || "No written comment."}
            </Text>
            <Text style={{ color: "#8890A5", marginTop: 8 }}>
              {new Date(review.createdAt).toLocaleDateString()}
            </Text>
          </Card>
        ))
      )}
      {page > 1 && <Button secondary onPress={() => setPage(n => n - 1)}>Previous reviews</Button>}
      {page * (data.pageSize || 20) < data.total && <Button secondary onPress={() => setPage(n => n + 1)}>More reviews</Button>}
    </ScrollView>
  );
}
