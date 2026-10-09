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
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reviews/submitted"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reviews/provider"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reviews/mine"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="provider" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />

        </Stack>
      </AccountThemeProvider>
    </AuthProvider>
  );
}
