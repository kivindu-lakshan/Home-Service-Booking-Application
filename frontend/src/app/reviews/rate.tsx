import {
  createReview,
  getBooking,
  getBookingReview,
  updateReview,
} from "@/api/domain";
import ErrorText from "@/components/ErrorText";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  Star,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RATING_FEEDBACK: Record<number, { title: string; subtitle: string; color: string; bg: string }> = {
  1: {
    title: "Disappointing",
    subtitle: "We're sorry it didn't meet your expectations.",
    color: "#E11D48",
    bg: "#FFE4E6",
  },
  2: {
    title: "Needs Improvement",
    subtitle: "Tell us how the provider could do better.",
    color: "#EA580C",
    bg: "#FFEDD5",
  },
  3: {
    title: "Good Experience",
    subtitle: "Met the core service standards.",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  4: {
    title: "Very Good!",
    subtitle: "High quality work and professional conduct.",
    color: "#059669",
    bg: "#D1FAE5",
  },
  5: {
    title: "Outstanding & Exceptional!",
    subtitle: "Exceeded all expectations with flawless service.",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
};

const COMPLIMENT_CHIPS = [
  "⏱️ On Time",
  "🧹 Spotless Clean",
  "💼 Highly Professional",
  "💬 Friendly & Polite",
  "⚡ Fast & Efficient",
  "💎 Great Quality",
];

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

    void Promise.all([
      getBooking(bookingId).catch(() => null),
      getBookingReview(bookingId).catch(() => null),
    ]).then(([bookingRes, reviewRes]) => {
      if (!active) return;
      if (bookingRes?.data?.data) {
        setBooking(bookingRes.data.data);
      }
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

  const addChipToComment = (chipText: string) => {
    const cleanTag = chipText.replace(/^[^\w\s]+\s*/, ""); // remove emoji for clean text insertion or keep emoji
    if (comment.includes(cleanTag)) return;
    setComment((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${cleanTag}` : `${cleanTag} service!`;
    });
  };

  const submit = async () => {
    if (busy || loadingReview) return;
    if (!rating) return setError("Please select a rating between 1 and 5 stars.");
    setBusy(true);
    setError("");
    try {
      if (reviewId) {
        await updateReview(reviewId, { rating, comment: comment.trim() });
        router.replace({
          pathname: "/reviews/submitted",
          params: {
            rating: String(rating),
            reviewText: comment.trim(),
            bookingRef: booking?.bookingRef || bookingId,
            updated: "true",
          },
        });
        return;
      }

      const response = await createReview({
        bookingId,
        rating,
        comment: comment.trim(),
      });

      router.replace({
        pathname: "/reviews/submitted",
        params: {
          rating: String(response.data.data.rating),
          reviewText: comment.trim(),
          bookingRef: booking?.bookingRef || bookingId,
        },
      });
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to save your review.");
    } finally {
      setBusy(false);
    }
  };

  const provider = booking?.provider;
  const service = booking?.service;
  const isCompleted = booking?.status === "completed";
  const feedback = rating > 0 ? RATING_FEEDBACK[rating] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backBtn}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/bookings")
            }
          >
            <ArrowLeft size={20} color="#1E1B4B" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.headerTitle}>
              {reviewId ? "Edit Your Review" : "Rate Your Experience"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {service?.name || "Home Service Provider"}
            </Text>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Provider Card */}
          <View style={styles.providerCard}>
            <View style={styles.providerAvatarContainer}>
              <View style={styles.providerAvatar}>
                <Text style={styles.avatarInitials}>
                  {(provider?.user?.fullName || provider?.name || "P")
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.verifiedIconBadge}>
                <CheckCircle2 size={14} color="#FFF" />
              </View>
            </View>

            <View style={styles.providerDetails}>
              <View style={styles.providerHeaderRow}>
                <Text style={styles.providerName}>
                  {provider?.user?.fullName || provider?.name || "Assigned Provider"}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    isCompleted ? styles.statusPillCompleted : styles.statusPillProgress,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isCompleted ? styles.statusTextCompleted : styles.statusTextProgress,
                    ]}
                  >
                    {isCompleted ? "✓ Completed" : "⚡ In Progress"}
                  </Text>
                </View>
              </View>

              <Text style={styles.serviceText}>
                {service?.name || "Professional Home Service"}
              </Text>

              {booking?.bookingRef && (
                <View style={styles.bookingRefRow}>
                  <Text style={styles.bookingRefBadge}>
                    Ref #{booking.bookingRef}
                  </Text>
                  {booking?.scheduledDate && (
                    <Text style={styles.bookingDateText}>
                      •{" "}
                      {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Interactive Star Rating */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingHeaderRow}>
              <Sparkles size={18} color="#F59E0B" />
              <Text style={styles.ratingCardTitle}>Overall Satisfaction</Text>
            </View>
            <Text style={styles.ratingCardHint}>
              Tap a star to express how your service went
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((starValue) => {
                const filled = starValue <= rating;
                return (
                  <Pressable
                    key={starValue}
                    onPress={() => setRating(starValue)}
                    style={({ pressed }) => [
                      styles.starButton,
                      pressed && { transform: [{ scale: 1.15 }] },
                    ]}
                    hitSlop={8}
                  >
                    <Star
                      size={42}
                      color={filled ? "#F59E0B" : "#D1D5DB"}
                      fill={filled ? "#F59E0B" : "transparent"}
                      strokeWidth={1.8}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Dynamic Rating Feedback Banner */}
            {feedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  { backgroundColor: feedback.bg, borderColor: feedback.color + "40" },
                ]}
              >
                <Text style={[styles.feedbackTitle, { color: feedback.color }]}>
                  {feedback.title}
                </Text>
                <Text style={styles.feedbackSubtitle}>{feedback.subtitle}</Text>
              </View>
            )}
          </View>

          {/* Quick Compliment Tags */}
          <View style={styles.chipsSection}>
            <Text style={styles.sectionHeading}>What stood out most?</Text>
            <View style={styles.chipsWrap}>
              {COMPLIMENT_CHIPS.map((chip) => (
                <Pressable
                  key={chip}
                  onPress={() => addChipToComment(chip)}
                  style={({ pressed }) => [
                    styles.chip,
                    comment.includes(chip.replace(/^[^\w\s]+\s*/, "")) &&
                      styles.chipSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      comment.includes(chip.replace(/^[^\w\s]+\s*/, "")) &&
                        styles.chipTextSelected,
                    ]}
                  >
                    {chip}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Detailed Feedback Textarea */}
          <View style={styles.commentSection}>
            <View style={styles.commentHeader}>
              <Text style={styles.sectionHeading}>Write a Detailed Review</Text>
              <Text style={styles.charCounter}>{comment.length} / 1000</Text>
            </View>
            <TextInput
              placeholder="What made this service special? Any details that would help others..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={comment}
              onChangeText={setComment}
              maxLength={1000}
              style={styles.commentInput}
              textAlignVertical="top"
            />
          </View>

          <ErrorText>{error}</ErrorText>

          {/* Submit Action Button */}
          <Pressable
            onPress={() => void submit()}
            disabled={busy || loadingReview}
            style={({ pressed }) => [
              styles.submitBtn,
              (busy || loadingReview) && { opacity: 0.65 },
              pressed && { opacity: 0.9 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {reviewId ? "Update Review" : "Submit Review"}
                </Text>
                <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
              </>
            )}
          </Pressable>

          {/* Skip / Return Button */}
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/bookings")
            }
            style={styles.skipBtn}
          >
            <Text style={styles.skipBtnText}>Cancel and return</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  /* Top Navigation Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
  headerRightPlaceholder: { width: 42 },

  /* Provider Card */
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  providerAvatarContainer: { position: "relative" },
  providerAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#633CFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#633CFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  verifiedIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  providerDetails: { flex: 1 },
  providerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillCompleted: { backgroundColor: "#DCFCE7" },
  statusPillProgress: { backgroundColor: "#FEF3C7" },
  statusPillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  statusTextCompleted: { color: "#15803D" },
  statusTextProgress: { color: "#B45309" },
  serviceText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  bookingRefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  bookingRefBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#633CFF",
    backgroundColor: "#F3EEFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bookingDateText: { fontSize: 11, color: "#94A3B8" },

  /* Rating Card */
  ratingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  ratingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  ratingCardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  ratingCardHint: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 18,
  },
  starsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  feedbackBanner: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  feedbackSubtitle: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
  },

  /* Compliment Chips */
  chipsSection: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#633CFF",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  chipTextSelected: {
    color: "#4F2BE8",
  },

  /* Comment Area */
  commentSection: {
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  commentInput: {
    minHeight: 125,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  /* Submit Button */
  submitBtn: {
    backgroundColor: "#633CFF",
    borderRadius: 18,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#633CFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  /* Skip Button */
  skipBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
});
