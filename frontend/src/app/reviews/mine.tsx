import { deleteReview, getMyReviews, updateReview } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import ErrorText from "@/components/ErrorText";
import { Button, Card, Input } from "@/components/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

export default function MyReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setReviews((await getMyReviews()).data.data);
      setError("");
    } catch {
      setError("Unable to load your reviews.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const save = async (id: string) => {
    if (!rating) return setError("Choose a rating from 1 to 5.");
    try {
      await updateReview(id, { rating, comment });
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to update review.");
    }
  };
  const remove = (id: string) =>
    Alert.alert("Delete review?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteReview(id);
          await load();
        },
      },
    ]);
  if (loading) return <LoadingState label="Loading your reviews..." />;
  if (error && !reviews.length)
    return <ErrorState onRetry={() => void load()} />;
  return (
    <ScrollView
      style={{ backgroundColor: "#F7F7FB" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#25213D" }}>
        My reviews
      </Text>
      <Text style={{ color: "#747B90", marginVertical: 8 }}>
        Keep your feedback current.
      </Text>
      <ErrorText>{error}</ErrorText>
      {!reviews.length ? (
        <EmptyState label="You have not written any reviews yet." />
      ) : (
        reviews.map((review) => {
          const isEditing = editing === review._id;
          return (
            <Card key={review._id}>
              <Text
                style={{ color: "#25213D", fontWeight: "900", fontSize: 17 }}
              >
                {review.provider?.user?.fullName || "Your provider"}
              </Text>
              <Text style={{ color: "#F29D38", fontSize: 22, marginTop: 8 }}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </Text>
              {isEditing ? (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginVertical: 12,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Pressable key={value} onPress={() => setRating(value)}>
                        <Text
                          style={{
                            fontSize: 26,
                            color: value <= rating ? "#FBBF24" : "#D1D1D6",
                          }}
                        >
                          ★
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Input
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Your review"
                    multiline
                  />
                  <Button onPress={() => void save(review._id)}>
                    Save changes
                  </Button>
                </>
              ) : (
                <Text style={{ color: "#747B90", marginTop: 8 }}>
                  {review.comment || "No written comment."}
                </Text>
              )}
              <View style={{ flexDirection: "row", gap: 20, marginTop: 14 }}>
                <Text
                  onPress={() => {
                    setEditing(isEditing ? null : review._id);
                    setRating(review.rating);
                    setComment(review.comment || "");
                  }}
                  style={{ color: "#5B3DF5", fontWeight: "800" }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Text>
                <Text
                  onPress={() => remove(review._id)}
                  style={{ color: "#C0392B", fontWeight: "800" }}
                >
                  Delete
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
