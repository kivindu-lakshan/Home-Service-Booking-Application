import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/DataState';
export default function ProviderLayout() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label='Checking your session...' />;
  if (!user) return <Redirect href='/auth/login' />;
  if (user.role !== 'provider') return <Redirect href='/' />;
  return <Slot />;
}
