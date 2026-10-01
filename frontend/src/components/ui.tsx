import { useAccountStyles } from "@/context/AccountThemeContext";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
import type { ReactNode } from "react";
export function Button({
  children,
  onPress,
  secondary = false,
}: {
  children: ReactNode;
  onPress: () => void;
  secondary?: boolean;
}) {
  const themed = useAccountStyles();
  return (
    <Pressable
      onPress={onPress}
      style={themed([styles.button, secondary && styles.secondary])}
    >
      <Text style={themed([styles.buttonText, secondary && styles.secondaryText])}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Card({ children }: { children: ReactNode }) {
  const themed = useAccountStyles();
  return <View style={themed(styles.card)}>{children}</View>;
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  const themed = useAccountStyles();
  return (
    <TextInput placeholderTextColor={themed({ placeholderTextColor: "#8890A5" }).placeholderTextColor} style={themed(styles.input)} {...props} />
  );
}
export function Chip({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const themed = useAccountStyles();
  return (
    <View style={themed([styles.chip, active && styles.activeChip])}>
      <Text style={themed([styles.chipText, active && styles.activeChipText])}>
        {children}
      </Text>
    </View>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const themed = useAccountStyles();
  return (
    <View style={themed(styles.status)}>
      <Text style={themed(styles.statusText)}>{status.replace("_", " ")}</Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#5B3DF5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  secondary: { backgroundColor: "#EDEBFF" },
  secondaryText: { color: "#5B3DF5" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 16px rgba(37, 33, 61, 0.08)" }
      : {
          shadowColor: "#25213D",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 3,
        }),
  },
  input: {
    backgroundColor: "#F4F5FA",
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#25213D",
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F0F1F7",
    marginRight: 8,
  },
  activeChip: { backgroundColor: "#5B3DF5" },
  chipText: { color: "#626980", fontWeight: "700" },
  activeChipText: { color: "#FFF" },
  status: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#DDF7F2",
  },
  statusText: {
    color: "#0F9D8A",
    fontWeight: "800",
    textTransform: "capitalize",
  },
});
