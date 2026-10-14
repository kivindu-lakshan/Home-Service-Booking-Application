import { Stack } from 'expo-router';
import { RoleGuard } from '@/components/auth/RoleGuard';
export default function Layout() {
  return (
    <RoleGuard role='admin'>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='dashboard' />
        <Stack.Screen name='provider-applications' />
        <Stack.Screen name='provider-application/[id]' />
        <Stack.Screen name='tickets' />
        <Stack.Screen name='ticket-details' />
        <Stack.Screen name='services' />
        <Stack.Screen name='service-form' />
        <Stack.Screen name='profile' />
        <Stack.Screen name='bookings' />
        <Stack.Screen name='assign-provider' />
        <Stack.Screen name='assign-service-provider' />
        <Stack.Screen name='jobs' />
      </Stack>
    </RoleGuard>
  );
}
