import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, Text, View, TextInput, Pressable } from "react-native";
import { api } from "@/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { Card } from "@/components/ui";
import { Search } from "lucide-react-native";

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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "5" | "4" | "3">("all");

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

  const visibleReviews = useMemo(() => {
    let filtered = reviews;
    if (filter !== "all") {
      filtered = filtered.filter((r) => r.rating === parseInt(filter));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((r) => {
        const providerName = r.provider?.user?.fullName || "";
        const serviceName = r.service?.name || "";
        const comment = r.comment || "";
        return (
          providerName.toLowerCase().includes(q) ||
          serviceName.toLowerCase().includes(q) ||
          comment.toLowerCase().includes(q)
        );
      });
    }
    // Sort top rated to the top
    return filtered.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reviews, query, filter]);

  if (loading) return <LoadingState label="Loading your reviews..." />;
  if (error) return <ErrorState onRetry={() => void load()} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>My reviews</Text>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Search size={20} color="#8B98B2" />
        <TextInput
          placeholder="Search providers or reviews..."
          placeholderTextColor="#8B98B2"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {(["all", "5", "4", "3"] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "all" ? "All" : `${f} Stars`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {visibleReviews.length === 0 ? (
        <EmptyState label={query || filter !== "all" ? "No matching reviews." : "You haven't left any reviews yet."} />
      ) : (
        visibleReviews.map((review: any) => (
          <Card key={review._id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <StarRating rating={review.rating} />
              {review.provider?.user?.fullName && (
                <Text style={styles.providerName}>{review.provider.user.fullName}</Text>
              )}
            </View>
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
  providerName: {
    color: "#5B3DF5",
    fontWeight: "700",
    fontSize: 13,
  },
  comment: { color: "#747B90", marginTop: 8 },
  date: { color: "#8890A5", marginTop: 8, fontSize: 12 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E3E6F0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#25213D",
  },
  filterScroll: { flexGrow: 0, marginBottom: 20 },
  filterContent: { gap: 10 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E3E6F0",
  },
  filterChipActive: { backgroundColor: "#5B3DF5" },
  filterText: { color: "#5F6B84", fontSize: 13, fontWeight: "700" },
  filterTextActive: { color: "#FFF" },
});
