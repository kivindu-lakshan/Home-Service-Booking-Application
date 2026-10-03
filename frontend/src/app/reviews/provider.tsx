import { getProviderReviews } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { Card } from "@/components/ui";
import { useLocalSearchParams } from "expo-router";
import { Star } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
export default function ProviderReviews() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const [data, setData] = useState<any>();
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      setData((await getProviderReviews(providerId)).data.data);
    } catch {
      setError(true);
    }
  }, [providerId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
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
        <Star size={20} color="#FBBF24" fill="#FBBF24" />{" "}
        {Number(data.provider?.ratingAvg || 0).toFixed(1)} ·{" "}
        {data.provider?.reviewCount || 0} reviews
      </Text>
      {data.reviews.length === 0 ? (
        <EmptyState label="No reviews yet." />
      ) : (
        data.reviews.map((review: any) => (
          <Card key={review._id}>
            <Text style={{ color: "#F29D38", fontSize: 22 }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  size={18}
                  color="#FBBF24"
                  fill={value <= review.rating ? "#FBBF24" : "#FFFFFF"}
                />
              ))}
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
    </ScrollView>
  );
}
