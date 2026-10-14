import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Star, User, Sparkles } from "lucide-react-native";
import { Button, Card } from "@/components/ui";
import { getProviderReviews } from "@/api/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";

export default function ProviderReviews() {
  const { providerId = "", serviceId } = useLocalSearchParams<{
    providerId: string;
    serviceId?: string;
  }>();
  const request = useRef<AbortController | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>();
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(false);
    try {
      const response = await getProviderReviews(
        providerId,
        serviceId,
        controller.signal,
        page,
      );
      if (!controller.signal.aborted) setData(response.data.data);
    } catch {
      if (!controller.signal.aborted) setError(true);
    }
  }, [providerId, serviceId, page]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.resolve().then(() => {
        if (active) void load();
      });
      return () => {
        active = false;
        request.current?.abort();
      };
    }, [load]),
  );

  if (!data && !error)
    return <LoadingState label="Loading provider reviews..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;

  const ratingAvg = Number(data?.provider?.ratingAvg || 0);
  const reviewCount = Number(data?.provider?.reviewCount || 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/bookings")}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={styles.headerTitle}>Customer Reviews</Text>
            <Text style={styles.headerSubtitle}>Verified service feedback</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Provider Rating Overview Card */}
          <View style={styles.overviewCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreNumber}>{ratingAvg.toFixed(1)}</Text>
              <View style={styles.scoreStars}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star
                      key={v}
                      size={20}
                      color={v <= Math.round(ratingAvg) ? "#F59E0B" : "#D1D5DB"}
                      fill={v <= Math.round(ratingAvg) ? "#F59E0B" : "transparent"}
                      strokeWidth={1.8}
                    />
                  ))}
                </View>
                <Text style={styles.reviewCountText}>
                  Based on {reviewCount} verified {reviewCount === 1 ? "review" : "reviews"}
                </Text>
              </View>
            </View>
          </View>

          {data.reviews.length === 0 ? (
            <EmptyState label="No customer reviews for this provider yet." />
          ) : (
            data.reviews.map((review: any) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.customerRow}>
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>
                        {(review.customer?.fullName || "C").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.customerName}>
                        {review.customer?.fullName || "Customer"}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ratingBadge}>
                    <Star size={13} color="#D97706" fill="#F59E0B" />
                    <Text style={styles.ratingBadgeText}>{review.rating}.0</Text>
                  </View>
                </View>

                {/* Stars Graphic */}
                <View style={styles.itemStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      color={s <= review.rating ? "#F59E0B" : "#E2E8F0"}
                      fill={s <= review.rating ? "#F59E0B" : "transparent"}
                      strokeWidth={1.5}
                    />
                  ))}
                </View>

                <Text style={styles.commentText}>
                  {review.comment?.trim() || "No written comment provided."}
                </Text>
              </View>
            ))
          )}

          {page > 1 && (
            <View style={{ marginTop: 12 }}>
              <Button secondary onPress={() => setPage((n) => n - 1)}>
                Previous Reviews
              </Button>
            </View>
          )}
          {page * (data.pageSize || 20) < data.total && (
            <View style={{ marginTop: 12 }}>
              <Button secondary onPress={() => setPage((n) => n + 1)}>
                More Reviews
              </Button>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },

  /* Overview Card */
  overviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -1,
  },
  scoreStars: {
    flex: 1,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  reviewCountText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  /* Review Card */
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#633CFF",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  reviewDate: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },
  itemStarsRow: {
    flexDirection: "row",
    gap: 3,
    marginBottom: 10,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#334155",
  },
});
