import { useAccountStyles } from "@/context/AccountThemeContext";
import { AccountText as Text } from "@/components/settings/AccountText";
export default function ErrorText({ children }: { children?: string }) {
  const themed = useAccountStyles();
  return children ? (
    <Text
      accessibilityRole="alert"
      style={themed({ color: "#C0392B", marginBottom: 10 })}
    >
      {children}
    </Text>
  ) : null;
}
