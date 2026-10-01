import { AuthProvider } from "@/context/AuthContext";
import { Stack } from "expo-router";
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{ headerBackTitle: "Back", headerTintColor: "#5B3DF5" }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: "Sign in" }} />
        <Stack.Screen
          name="auth/register"
          options={{ title: "Create account" }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{ title: "Forgot password" }}
        />
        <Stack.Screen
          name="auth/reset-password"
          options={{ title: "Reset password" }}
        />
        <Stack.Screen
          name="auth/verify-email"
          options={{ title: "Verify email" }}
        />
        <Stack.Screen
          name="auth/change-password"
          options={{ title: "Change password" }}
        />
        <Stack.Screen
          name="bookings/index"
          options={{ title: "My bookings" }}
        />
        <Stack.Screen
          name="payment/details"
          options={{ title: "Payment details" }}
        />
        <Stack.Screen
          name="payment/success"
          options={{ title: "Payment successful" }}
        />
        <Stack.Screen
          name="reviews/rate"
          options={{ title: "Rate provider" }}
        />
        <Stack.Screen
          name="reviews/submitted"
          options={{ title: "Review submitted" }}
        />
        <Stack.Screen
          name="reviews/provider"
          options={{ title: "Provider reviews" }}
        />
        <Stack.Screen name="reviews/mine" options={{ title: "My reviews" }} />
        <Stack.Screen name="support" options={{ title: "Support" }} />
        <Stack.Screen
          name="admin/tickets"
          options={{ title: "Support tickets" }}
        />
        <Stack.Screen
          name="admin/dashboard"
          options={{ title: "Admin dashboard" }}
        />
        <Stack.Screen
          name="admin/profile"
          options={{ title: "Admin profile" }}
        />
        <Stack.Screen
          name="admin/bookings"
          options={{ title: "Manage bookings" }}
        />
        <Stack.Screen
          name="admin/assign-provider"
          options={{ title: "Assign provider" }}
        />
        <Stack.Screen name="admin/jobs" options={{ title: "Job monitor" }} />
      </Stack>
    </AuthProvider>
  );
}
