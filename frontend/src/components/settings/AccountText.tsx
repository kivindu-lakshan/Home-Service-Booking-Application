import { Text, type TextProps } from "react-native";
import { useAccountStyles } from "@/context/AccountThemeContext";
export function AccountText(props: TextProps) {
  const themed = useAccountStyles();
  const foreground = themed({ color: "#303B55" });
  return <Text {...props} style={[foreground.color !== "#303B55" ? foreground : undefined, props.style]} />;
}
