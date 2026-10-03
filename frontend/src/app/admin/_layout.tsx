import { Stack } from 'expo-router';
import { RoleGuard } from '@/components/auth/RoleGuard';
export default function Layout() {
  return <RoleGuard role='admin'><Stack>
    <Stack.Screen name='dashboard' options={{ headerShown: false }} />
    <Stack.Screen name='provider-applications' options={{ headerShown: false }} />
    <Stack.Screen name='provider-application/[id]' options={{ headerShown: false }} />
  </Stack></RoleGuard>;
}
