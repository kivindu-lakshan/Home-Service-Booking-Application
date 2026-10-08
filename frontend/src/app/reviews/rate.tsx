import { createReview, getBooking, getBookingReview } from "@/api/domain";
import ErrorText from "@/components/ErrorText";
import { router, useLocalSearchParams } from "expo-router";
import { Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function RateProvider() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [loadingReview, setLoadingReview] = useState(true);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    let active = true;

    // Load booking info and existing review in parallel
    void Promise.all([
      getBooking(bookingId).catch(() => null),
      getBookingReview(bookingId).catch(() => null),
    ]).then(([bookingRes, reviewRes]) => {
      if (!active) return;
      if (bookingRes?.data?.data) setBooking(bookingRes.data.data);
      const review = reviewRes?.data?.data;
      if (review) {
        setReviewId(review._id);
        setRating(review.rating);
        setComment(review.comment || "");
      }
      setLoadingReview(false);
    });

    return () => {
      active = false;
    };
  }, [bookingId]);

  const submit = async () => {
    if (busy || loadingReview) return;
    if (!rating) return setError("Please select a rating from 1 to 5 stars.");
    setBusy(true);
    setError("");
    try {
      if (reviewId) {
        router.replace({
          pathname: "/reviews/submitted",
          params: { rating: String(rating), bookingRef: booking?.bookingRef || bookingId },
        });
        return;
      }
      const response = await createReview({ bookingId, rating, comment });
      router.replace({
        pathname: "/reviews/submitted",
        params: {
          rating: String(response.data.data.rating),
          reviewText: comment,
          bookingRef: booking?.bookingRef || bookingId,
        },
      });
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to submit review.");
    } finally {
      setBusy(false);
    }
  };

  const provider = booking?.provider;
  const service = booking?.service;
  const completedAt = booking?.completedAt || booking?.scheduledDate;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/bookings")
            }
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Rate Your Experience</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Completed Badge */}
        <View style={styles.completedRow}>
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>✓ COMPLETED</Text>
          </View>
          {booking?.bookingRef && (
            <Text style={styles.bookingRefText}>Booking #{booking.bookingRef}</Text>
          )}
        </View>

        {/* Provider Card */}
        <View style={styles.providerCard}>
          <View style={styles.providerAvatar}>
            <Text style={styles.providerAvatarText}>
              {(provider?.name || "P").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>
              {provider?.name || "Your Provider"}
            </Text>
            <Text style={styles.providerTitle}>
              {service?.name || "Home Cleaning Specialist"}
            </Text>
            {completedAt && (
              <Text style={styles.completedOn}>
                Completed on{" "}
                {new Date(completedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {booking?.scheduledTime ? ` • ${booking.scheduledTime}` : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingQuestion}>How was your experience?</Text>
          <Text style={styles.ratingHint}>Tap a star to rate 1–5</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                style={styles.starBtn}
                hitSlop={6}
              >
                <Star
                  size={36}
                  color="#F29D38"
                  fill={value <= rating ? "#F29D38" : "transparent"}
                  strokeWidth={1.5}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Written Review */}
        <Text style={styles.reviewLabel}>Leave a written review</Text>
        <TextInput
          placeholder="Tell us about your experience with the provider..."
          placeholderTextColor="#B0B6C9"
          multiline
          value={comment}
          onChangeText={setComment}
          style={styles.reviewInput}
          textAlignVertical="top"
          maxLength={750}
        />
        <Text style={styles.charCount}>{comment.length} / 750 characters</Text>

        <ErrorText>{error}</ErrorText>

        {/* Submit Button */}
        <Pressable
          onPress={() => void submit()}
          disabled={busy || loadingReview}
          style={[styles.submitBtn, (busy || loadingReview) && { opacity: 0.6 }]}
        >
          <Text style={styles.submitBtnText}>
            {loadingReview
              ? "Loading..."
              : busy
                ? "Submitting..."
                : reviewId
                  ? "Update Review"
                  : "Submit Review"}
          </Text>
        </Pressable>

        {/* Skip */}
        <Pressable
          onPress={() => router.replace("/bookings")}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#25213D",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  backArrow: { color: "#5B3DF5", fontSize: 28, lineHeight: 32, marginTop: -2 },
  headerTitle: { color: "#25213D", fontSize: 16, fontWeight: "800" },

  /* Completed Badge */
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  completedBadge: {
    backgroundColor: "#DDF7F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedBadgeText: { color: "#0F9D8A", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  bookingRefText: { color: "#747B90", fontSize: 12 },

  /* Provider Card */
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    shadowColor: "#25213D",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  providerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#5B3DF5",
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  providerInfo: { flex: 1 },
  providerName: { color: "#25213D", fontSize: 16, fontWeight: "800" },
  providerTitle: { color: "#747B90", fontSize: 12, marginTop: 2 },
  completedOn: { color: "#8890A5", fontSize: 11, marginTop: 4 },

  /* Rating Card */
  ratingCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#25213D",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  ratingQuestion: {
    color: "#25213D",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "center",
  },
  ratingHint: { color: "#747B90", fontSize: 12, marginBottom: 16, textAlign: "center" },
  starsRow: { flexDirection: "row", gap: 8 },
  starBtn: { padding: 4 },

  /* Written Review */
  reviewLabel: {
    color: "#25213D",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  reviewInput: {
    minHeight: 120,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    color: "#25213D",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
    shadowColor: "#25213D",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  charCount: { color: "#B0B6C9", fontSize: 11, textAlign: "right", marginBottom: 16 },

  /* Submit */
  submitBtn: {
    backgroundColor: "#5B3DF5",
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  /* Skip */
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { color: "#747B90", fontSize: 14, fontWeight: "600" },
});
