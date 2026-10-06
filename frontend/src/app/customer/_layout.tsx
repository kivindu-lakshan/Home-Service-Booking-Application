import { Stack } from 'expo-router';
import { CustomerGuard } from '@/components/customer/CustomerUI';
export default function CustomerLayout() { return <CustomerGuard><Stack screenOptions={{ headerShown: false }} /></CustomerGuard>; }
