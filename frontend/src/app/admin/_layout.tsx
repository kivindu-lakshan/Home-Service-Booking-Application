import { Stack } from 'expo-router';
import { RoleGuard } from '@/components/auth/RoleGuard';
export default function Layout() {
  return (
    <RoleGuard role='admin'>
      <Stack>
        <Stack.Screen name='dashboard' options={{ headerShown: false }} />
        <Stack.Screen name='provider-applications' options={{ headerShown: false }} />
        <Stack.Screen name='provider-application/[id]' options={{ headerShown: false }} />
        <Stack.Screen name='tickets' options={{ title: 'Support tickets' }} />
        <Stack.Screen name='ticket-details' options={{ title: 'Ticket details' }} />
        <Stack.Screen name='services' options={{ headerShown: false }} />
        <Stack.Screen name='service-form' options={{ headerShown: false }} />
        <Stack.Screen name='profile' options={{ title: 'Admin profile' }} />
        <Stack.Screen name='bookings' options={{ headerShown: false }} />
        <Stack.Screen name='assign-provider' options={{ headerShown: false }} />
        <Stack.Screen name='assign-service-provider' options={{ title: 'Assign service provider' }} />
        <Stack.Screen name='jobs' options={{ headerShown: false }} />
      </Stack>
    </RoleGuard>
  );
}
