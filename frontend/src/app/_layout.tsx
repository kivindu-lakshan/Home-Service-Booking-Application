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
        <Stack.Screen name="bookings" options={{ title: "My bookings" }} />
        <Stack.Screen name="payment-details" options={{ title: "Payment details" }} />
        <Stack.Screen name="payment-success" options={{ title: "Payment successful" }} />
        <Stack.Screen name="rate-provider" options={{ title: "Rate provider" }} />
        <Stack.Screen name="review-submitted" options={{ title: "Review submitted" }} />
        <Stack.Screen name="provider-reviews" options={{ title: "Provider reviews" }} />
        <Stack.Screen name="admin/dashboard" options={{ title: "Admin dashboard" }} />
        <Stack.Screen name="admin/bookings" options={{ title: "Manage bookings" }} />
        <Stack.Screen name="admin/assign-provider" options={{ title: "Assign provider" }} />
        <Stack.Screen name="admin/jobs" options={{ title: "Job monitor" }} />
      </Stack>
    </AuthProvider>
  );
}
