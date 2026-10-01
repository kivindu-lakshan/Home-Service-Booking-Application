import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{ headerBackTitle: "Back", headerTintColor: "#5B3DF5" }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="support/index" options={{ headerShown: false }} />
        <Stack.Screen name="support/form" options={{ headerShown: false }} />
        <Stack.Screen name="support/details" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="personal-information" options={{ headerShown: false }} />
        <Stack.Screen name="addresses/index" options={{ headerShown: false }} />
        <Stack.Screen name="addresses/form" options={{ headerShown: false }} />
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
        <Stack.Screen
          name="admin/dashboard"
          options={{ title: "Admin dashboard" }}
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
