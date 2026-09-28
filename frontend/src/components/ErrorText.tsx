import { Text } from "react-native";
export default function ErrorText({ children }: { children?: string }) {
  return children ? (
    <Text
      accessibilityRole="alert"
      style={{ color: "#C0392B", marginBottom: 10 }}
    >
      {children}
    </Text>
  ) : null;
}
