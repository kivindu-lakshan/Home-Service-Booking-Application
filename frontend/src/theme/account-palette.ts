// Account-only compatibility palette: retain every original light style while
// mapping the existing module's colours to one set of dark semantic colours.
export const darkPalette = {
  background: "#12121C", surface: "#20202E", raised: "#292939", border: "#444459",
  text: "#F2EFFA", muted: "#BBB6CC", accent: "#B29AFF", accentSurface: "#30264D",
  success: "#79DBBA", successSurface: "#183A32", danger: "#FFADB9", warning: "#F1C779",
};
export function accountRoute(path: string) {
  return ["/onboarding", "/auth/login", "/auth/register", "/profile", "/personal-information", "/addresses", "/support", "/settings"].some((route) => path === route || path.startsWith(`${route}/`));
}
export function darkColor(value: string, property: string): string {
  const key = value.toUpperCase();
  if (property === "backgroundColor") {
    if (["#F7F7FD", "#F7F7FB"].includes(key)) return darkPalette.background;
    if (["WHITE", "#FFF", "#FFFFFF"].includes(key)) return darkPalette.surface;
    if (["#F4F5FA", "#F0F0F6", "#F0F1F7"].includes(key)) return darkPalette.raised;
    if (["#EDE7FF", "#EEE8FF", "#EDEBFF"].includes(key)) return darkPalette.accentSurface;
    if (["#E6F5EE", "#DDF7F2"].includes(key)) return darkPalette.successSurface;
    if (["#FFF0CD"].includes(key)) return "#443820";
  }
  if (property.toLowerCase().includes("border") && ["#E6EAF3", "#F0EEF8"].includes(key)) return darkPalette.border;
  if (property === "color" || property === "placeholderTextColor" || property === "borderColor") {
    if (["#242E49", "#303B55", "#25213D"].includes(key)) return darkPalette.text;
    if (["#7C879F", "#77829C", "#7D89A1", "#8B97AE", "#7E8AA4", "#59657F", "#66728C", "#747B90", "#626980", "#8890A5"].includes(key)) return darkPalette.muted;
    if (["#8157FF", "#633CFF", "#5B3DF5"].includes(key)) return darkPalette.accent;
    if (["#278B70", "#0F9D8A"].includes(key)) return darkPalette.success;
    if (["#C0392B", "#A13548"].includes(key)) return darkPalette.danger;
    if (key === "#986119") return darkPalette.warning;
  }
  return value;
}
// Handles arrays, Pressable style callbacks and nested style objects without
// changing layout, typography, handlers or the original shared styles.
export function darkStyle<T>(value: T): T {
  if (typeof value === "function") return ((...args: unknown[]) => darkStyle(value(...args))) as T;
  if (Array.isArray(value)) return value.map(darkStyle) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    typeof item === "string" ? darkColor(item, key) : item])) as T;
}
