import { Button } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import { Star } from "lucide-react-native";
import { Text, View } from "react-native";
export default function ReviewSubmitted() {
  const { rating } = useLocalSearchParams<{ rating: string }>();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F7F7FB",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#0F9D8A", fontWeight: "900", letterSpacing: 1 }}>
        THANK YOU
      </Text>
      <Text
        style={{
          color: "#25213D",
          fontSize: 30,
          fontWeight: "900",
          marginTop: 8,
        }}
      >
        Review submitted
      </Text>
      <Text style={{ color: "#F29D38", fontSize: 38, marginVertical: 20 }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            size={30}
            color="#FBBF24"
            fill={value <= Number(rating || 0) ? "#FBBF24" : "#FFFFFF"}
          />
        ))}
      </Text>
      <Text style={{ color: "#747B90", marginBottom: 22 }}>
        Your feedback was saved to MongoDB and will help other customers.
      </Text>
      <Button onPress={() => router.replace("/bookings")}>
        Back to bookings
      </Button>
    </View>
  );
}
