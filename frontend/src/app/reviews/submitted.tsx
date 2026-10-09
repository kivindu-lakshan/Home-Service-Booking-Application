import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, Star } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ReviewSubmitted() {
  const { rating, reviewText, bookingRef } = useLocalSearchParams<{
    rating: string;
    reviewText: string;
    bookingRef: string;
  }>();

  const stars = Number(rating || 0);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successCircle}>
          <CheckCircle2 size={52} color="#FFF" strokeWidth={2} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Review{"\n"}Submitted!</Text>
        <Text style={styles.subtitle}>
          Thank you for your{"\n"}valuable feedback
        </Text>

        {/* Star Rating Display */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((v) => (
            <Star
              key={v}
              size={28}
              color="#F29D38"
              fill={v <= stars ? "#F29D38" : "transparent"}
              strokeWidth={1.5}
            />
          ))}
        </View>

        {/* Review Preview */}
        {!!reviewText && (
          <View style={styles.reviewPreview}>
            <Text style={styles.reviewLabel}>Review Text</Text>
            <Text style={styles.reviewText} numberOfLines={4}>
              {reviewText}
            </Text>
          </View>
        )}

        {/* Booking Reference */}
        {!!bookingRef && (
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Booking reference</Text>
            <Text style={styles.refValue}>#{bookingRef}</Text>
          </View>
        )}

        {/* Back to Bookings */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace("/bookings")}
        >
          <Text style={styles.backBtnText}>Back to Bookings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F7FB",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },

  /* Success Circle */
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#5B3DF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#5B3DF5",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },

  /* Title */
  title: {
    color: "#25213D",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    color: "#747B90",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  /* Stars */
  starsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 24,
  },

  /* Review Preview */
  reviewPreview: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#25213D",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  reviewLabel: { color: "#747B90", fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  reviewText: { color: "#25213D", fontSize: 14, lineHeight: 20 },

  /* Booking Reference */
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
  },
  refLabel: { color: "#747B90", fontSize: 13 },
  refValue: { color: "#5B3DF5", fontSize: 13, fontWeight: "800" },

  /* Back Button */
  backBtn: {
    width: "100%",
    backgroundColor: "#5B3DF5",
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
