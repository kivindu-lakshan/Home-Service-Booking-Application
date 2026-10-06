import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "@/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { Card } from "@/components/ui";

function StarRating({ rating }: { rating: number }) {
  return (
    <Text style={styles.stars}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </Text>
  );
}

export default function MyReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get("/reviews/mine");
      setReviews(res.data.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.resolve().then(() => {
        if (active) void load();
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  if (loading) return <LoadingState label="Loading your reviews..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>My reviews</Text>
      {reviews.length === 0 ? (
        <EmptyState label="You haven't left any reviews yet." />
      ) : (
        reviews.map((review: any) => (
          <Card key={review._id}>
            <StarRating rating={review.rating} />
            {review.service?.name ? (
              <Text style={styles.service}>{review.service.name}</Text>
            ) : null}
            <Text style={styles.comment}>
              {review.comment || "No written comment."}
            </Text>
            <Text style={styles.date}>
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  content: { padding: 20 },
  heading: {
    fontSize: 30,
    fontWeight: "900",
    color: "#25213D",
    marginBottom: 16,
  },
  stars: { color: "#F29D38", fontSize: 22 },
  service: {
    color: "#25213D",
    fontWeight: "800",
    marginTop: 8,
    fontSize: 14,
  },
  comment: { color: "#747B90", marginTop: 8 },
  date: { color: "#8890A5", marginTop: 8, fontSize: 12 },
});
