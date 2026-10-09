import { router, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Star,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReviewSubmitted() {
  const { rating, reviewText, bookingRef, updated } = useLocalSearchParams<{
    rating: string;
    reviewText: string;
    bookingRef: string;
    updated?: string;
  }>();

  const stars = Number(rating || 0);
  const isUpdate = updated === "true";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.content}>
          {/* Animated/Glowing Success Icon */}
          <View style={styles.successHalo}>
            <View style={styles.successCircle}>
              <CheckCircle2 size={48} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>

          {/* Heading */}
          <View style={styles.badgeRow}>
            <Sparkles size={16} color="#633CFF" />
            <Text style={styles.badgeText}>
              {isUpdate ? "REVIEW UPDATED" : "REVIEW PUBLISHED"}
            </Text>
          </View>

          <Text style={styles.title}>
            {isUpdate ? "Feedback\nUpdated!" : "Thank You For\nYour Review!"}
          </Text>
          <Text style={styles.subtitle}>
            Your feedback helps our community discover top-rated service
            professionals.
          </Text>

          {/* Star Rating Card */}
          <View style={styles.summaryCard}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <Star
                  key={v}
                  size={26}
                  color={v <= stars ? "#F59E0B" : "#D1D5DB"}
                  fill={v <= stars ? "#F59E0B" : "transparent"}
                  strokeWidth={1.8}
                />
              ))}
            </View>

            {/* Review Comment Preview */}
            {!!reviewText && (
              <View style={styles.commentBox}>
                <Text style={styles.commentQuote}>“</Text>
                <Text style={styles.commentText} numberOfLines={3}>
                  {reviewText}
                </Text>
              </View>
            )}

            {/* Booking Reference Pill */}
            {!!bookingRef && (
              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Booking Reference</Text>
                <Text style={styles.refValue}>#{bookingRef}</Text>
              </View>
            )}
          </View>

          {/* Primary Action: Go to My Reviews */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to My Reviews"
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => router.replace("/reviews/mine")}
          >
            <View style={styles.btnContent}>
              <MessageSquare size={18} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.primaryBtnText}>Go to My Reviews</Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" />
          </Pressable>

          {/* Secondary Action: Return to Bookings */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Bookings"
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.replace("/bookings")}
          >
            <CalendarDays size={18} color="#4F46E5" />
            <Text style={styles.secondaryBtnText}>Back to My Bookings</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  /* Success Icon Badge */
  successHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#633CFF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#633CFF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Badge Row */
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3EEFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    color: "#633CFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* Typography */
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 24,
  },

  /* Summary Card */
  summaryCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    alignItems: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  commentBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
    position: "relative",
    marginBottom: 12,
  },
  commentQuote: {
    position: "absolute",
    left: 8,
    top: -2,
    fontSize: 22,
    color: "#CBD5E1",
    fontWeight: "900",
  },
  commentText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
    paddingLeft: 10,
  },
  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  refLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  refValue: {
    fontSize: 13,
    color: "#633CFF",
    fontWeight: "800",
  },

  /* Action Buttons */
  primaryBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#633CFF",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    shadowColor: "#633CFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 12,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#EEF2FF",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  secondaryBtnText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "800",
  },
});
