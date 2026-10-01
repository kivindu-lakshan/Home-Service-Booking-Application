import { useAccountStyles } from "@/context/AccountThemeContext";
import { StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";
export function SettingsIcon({ name }: { name: "lock" | "bell" | "sparkle" | "eye" }) {
  const themed = useAccountStyles();
  return <View style={themed(styles.canvas)} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {name === "sparkle" ? <Text style={themed(styles.sparkle)}>{"\u2727"}</Text> : name === "eye" ? <><View style={themed(styles.eye)} /><View style={themed(styles.pupil)} /></> : name === "lock" ? <><View style={themed(styles.shackle)} /><View style={themed(styles.lock)} /><View style={themed(styles.keyhole)} /></> : <><View style={themed(styles.bell)} /><View style={themed(styles.rim)} /><View style={themed(styles.clapper)} /></>}
  </View>;
}
const styles = StyleSheet.create({
  eye: { width: 20, height: 13, borderWidth: 1.5, borderColor: "#8157FF", borderRadius: 10 },
  pupil: { position: "absolute", width: 6, height: 6, borderWidth: 1.5, borderColor: "#8157FF", borderRadius: 3 },
  canvas: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  sparkle: { fontSize: 28, color: "#8157FF", lineHeight: 30 },
  shackle: { position: "absolute", top: 3, width: 9, height: 10, borderWidth: 1.5, borderColor: "#8157FF", borderRadius: 5 },
  lock: { position: "absolute", top: 10, width: 14, height: 11, borderWidth: 1.5, borderColor: "#8157FF", borderRadius: 3, backgroundColor: "#EEE8FF" },
  keyhole: { position: "absolute", top: 14, width: 2, height: 3, borderRadius: 1, backgroundColor: "#8157FF" },
  bell: { position: "absolute", top: 4, width: 12, height: 13, borderWidth: 1.5, borderColor: "#8157FF", borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  rim: { position: "absolute", top: 16, width: 16, height: 2, borderRadius: 1, backgroundColor: "#8157FF" },
  clapper: { position: "absolute", top: 20, width: 4, height: 2, borderRadius: 1, backgroundColor: "#8157FF" },
});
