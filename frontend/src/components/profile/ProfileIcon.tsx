import { useAccountStyles } from "@/context/AccountThemeContext";
import { StyleSheet, View } from "react-native";
import { AccountText as Text } from "@/components/settings/AccountText";

export type ProfileIconName = "person" | "pin" | "grid" | "heart" | "home" | "calendar";

// Small outline icons drawn with native views: no new font or native dependency.
export function ProfileIcon({ name, color = "#8157FF" }: {
  name: ProfileIconName;
  color?: string;
}) {
  const themed = useAccountStyles();
  const stroke = { borderColor: color };
  return (
    <View style={themed(styles.canvas)} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === "person" && <>
        <View style={themed([styles.head, stroke])} />
        <View style={themed([styles.shoulders, stroke])} />
      </>}
      {name === "pin" && <>
        <View style={themed([styles.pin, stroke])} />
        <View style={themed([styles.pinDot, stroke])} />
      </>}
      {name === "grid" && <View style={themed(styles.grid)}>
        {[0, 1, 2, 3].map((item) => <View key={item} style={themed([styles.square, stroke])} />)}
      </View>}
      {name === "heart" && <Text style={themed([styles.heart, { color }])}>♡</Text>}
      {name === "home" && <>
        <View style={themed([styles.roof, stroke])} />
        <View style={themed([styles.house, stroke])} />
        <View style={themed([styles.door, stroke])} />
      </>}
      {name === "calendar" && <>
        <View style={themed([styles.calendar, stroke])} />
        <View style={themed([styles.calendarLine, { backgroundColor: color }])} />
        <View style={themed([styles.ring, { left: 7, backgroundColor: color }])} />
        <View style={themed([styles.ring, { right: 7, backgroundColor: color }])} />
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  head: { position: "absolute", top: 3, width: 7, height: 7, borderWidth: 1.7, borderRadius: 4 },
  shoulders: { position: "absolute", top: 12, width: 14, height: 10, borderWidth: 1.7, borderBottomWidth: 0, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  pin: { position: "absolute", top: 3, width: 14, height: 14, borderWidth: 1.7, borderRadius: 8, borderBottomRightRadius: 2, transform: [{ rotate: "45deg" }] },
  pinDot: { position: "absolute", top: 7, width: 5, height: 5, borderWidth: 1.5, borderRadius: 3 },
  grid: { width: 18, height: 18, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  square: { width: 7, height: 7, borderWidth: 1.5, borderRadius: 2 },
  heart: { fontSize: 29, lineHeight: 30, marginTop: -3 },
  roof: { position: "absolute", top: 4, width: 12, height: 12, borderLeftWidth: 1.7, borderTopWidth: 1.7, transform: [{ rotate: "45deg" }] },
  house: { position: "absolute", top: 10, width: 15, height: 11, borderWidth: 1.7, borderTopWidth: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  door: { position: "absolute", bottom: 3, width: 5, height: 7, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  calendar: { width: 18, height: 15, marginTop: 3, borderWidth: 1.5, borderRadius: 3 },
  calendarLine: { position: "absolute", top: 10, width: 17, height: 1.5 },
  ring: { position: "absolute", top: 3, width: 1.5, height: 5, borderRadius: 1 },
});
