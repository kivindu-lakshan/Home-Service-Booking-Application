import { useAccountStyles } from "@/context/AccountThemeContext";
import { ActivityIndicator, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
export function LoadingState({ label = "Loading..." }: { label?: string }) {
  const themed = useAccountStyles();
  return (
    <View style={themed({ padding: 28, alignItems: "center" })}>
      <ActivityIndicator color={themed({ color: "#5B3DF5" }).color} />
      <Text style={themed({ color: "#747B90", marginTop: 10 })}>{label}</Text>
    </View>
  );
}
export function EmptyState({ label }: { label: string }) {
  const themed = useAccountStyles();
  return (
    <View style={themed({ padding: 28, alignItems: "center" })}>
      <Text style={themed({ color: "#747B90", textAlign: "center" })}>{label}</Text>
    </View>
  );
}
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const themed = useAccountStyles();
  return (
    <View style={themed({ padding: 28, alignItems: "center" })}>
      <Text style={themed({ color: "#C0392B", textAlign: "center", marginBottom: 12 })}>
        Unable to load data. Please try again.
      </Text>
      <Text onPress={onRetry} style={themed({ color: "#5B3DF5", fontWeight: "800" })}>
        Try again
      </Text>
    </View>
  );
}
