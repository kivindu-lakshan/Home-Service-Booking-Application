import { ActivityIndicator, Text, View } from "react-native";
export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={{ padding: 28, alignItems: "center" }}>
      <ActivityIndicator color="#5B3DF5" />
      <Text style={{ color: "#747B90", marginTop: 10 }}>{label}</Text>
    </View>
  );
}
export function EmptyState({ label }: { label: string }) {
  return (
    <View style={{ padding: 28, alignItems: "center" }}>
      <Text style={{ color: "#747B90", textAlign: "center" }}>{label}</Text>
    </View>
  );
}
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ padding: 28, alignItems: "center" }}>
      <Text style={{ color: "#C0392B", textAlign: "center", marginBottom: 12 }}>
        Unable to load data. Please try again.
      </Text>
      <Text onPress={onRetry} style={{ color: "#5B3DF5", fontWeight: "800" }}>
        Try again
      </Text>
    </View>
  );
}
