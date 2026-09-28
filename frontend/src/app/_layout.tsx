import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{ headerBackTitle: "Back", headerTintColor: "#5B3DF5" }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="register" options={{ title: "Create account" }} />
        <Stack.Screen
          name="forgot-password"
          options={{ title: "Forgot password" }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ title: "Reset password" }}
        />
        <Stack.Screen name="verify-email" options={{ title: "Verify email" }} />
        <Stack.Screen
          name="change-password"
          options={{ title: "Change password" }}
        />
      </Stack>
    </AuthProvider>
  );
}
