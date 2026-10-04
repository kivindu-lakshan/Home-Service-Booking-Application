import { AccountThemeProvider } from "@/context/AccountThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { Stack } from "expo-router";
export default function RootLayout() {
  return (
    <AuthProvider>
      <AccountThemeProvider>
        <Stack
          screenOptions={{
            headerBackTitle: "Back",
            headerTintColor: "#5B3DF5",
          }}
        >
          <Stack.Screen
            name="onboarding/landing"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/welcome"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/account-type"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="customer" options={{ headerShown: false }} />
          <Stack.Screen
            name="services/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/account-security"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/appearance"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/privacy"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/notifications"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="support/index" options={{ headerShown: false }} />
          <Stack.Screen name="support/form" options={{ headerShown: false }} />
          <Stack.Screen
            name="support/details"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="personal-information"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="addresses/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="addresses/form"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
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
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="auth/change-password"
            options={{ title: "Change password" }}
          />
          <Stack.Screen
            name="bookings/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="bookings/new" options={{ headerShown: false }} />
          <Stack.Screen name="bookings/[id]" options={{ headerShown: false }} />
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
          <Stack.Screen
            name="admin/tickets"
            options={{ title: "Support tickets" }}
          />
          <Stack.Screen
            name="admin/services"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="admin/service-form"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="admin/dashboard"
            options={{ headerShown: false }}
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
      </AccountThemeProvider>
    </AuthProvider>
  );
}
