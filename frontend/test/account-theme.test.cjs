const assert = require("node:assert/strict");
const { test } = require("node:test");
const { accountRoute, darkColor, darkStyle, darkPalette } = require("../src/theme/account-palette.ts");
test("only account module routes opt in", () => {
 for (const route of ["/onboarding/landing", "/auth/login", "/auth/register", "/profile", "/personal-information", "/addresses/form", "/support/details", "/settings/appearance"]) assert.equal(accountRoute(route), true);
 for (const route of ["/", "/auth/change-password", "/bookings", "/admin/dashboard", "/payment/details", "/provider", "/settings-other"]) assert.equal(accountRoute(route), false);
});
test("dark style maps surfaces, text, borders and preserves layout and button contrast", () => {
 const source = { backgroundColor: "#FFFFFF", color: "#303B55", borderColor: "#E6EAF3", padding: 12 };
 assert.deepEqual(darkStyle(source), { backgroundColor: darkPalette.surface, color: darkPalette.text, borderColor: darkPalette.border, padding: 12 });
 assert.equal(source.backgroundColor, "#FFFFFF"); assert.equal(darkColor("#FFFFFF", "color"), "#FFFFFF"); assert.equal(darkColor("#633CFF", "backgroundColor"), "#633CFF");
});
test("style arrays and Pressable callbacks preserve disabled styles", () => {
 const result = darkStyle(({ pressed }) => [{ backgroundColor: "white" }, pressed && { opacity: 0.5 }]);
 assert.deepEqual(result({ pressed: true }), [{ backgroundColor: darkPalette.surface }, { opacity: 0.5 }]);
});
function luminance(hex) { const values = hex.slice(1).match(/../g).map((v) => parseInt(v,16)/255).map((v) => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4); return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722; }
test("dark primary and secondary text achieve 4.5:1 contrast on all main surfaces", () => {
 for (const foreground of [darkPalette.text, darkPalette.muted, darkPalette.accent]) for (const background of [darkPalette.background, darkPalette.surface, darkPalette.raised]) {
   const ratio = (luminance(foreground)+0.05)/(luminance(background)+0.05); assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio}`);
 }
});
