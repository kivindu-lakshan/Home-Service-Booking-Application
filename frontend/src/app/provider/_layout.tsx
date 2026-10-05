import { Stack } from "expo-router";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function ProviderLayout() {
  return (
    <RoleGuard role="provider">
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
