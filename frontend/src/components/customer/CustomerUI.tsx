import type { ReactNode } from 'react';
import { serviceImageUri } from '@/utils/service-image';
import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { AccountText as Text } from '@/components/settings/AccountText';
import { ProfileIcon, type ProfileIconName } from '@/components/profile/ProfileIcon';
import { Button, Card } from '@/components/ui';
import { LoadingState } from '@/components/DataState';
import type { Provider } from '@/api/catalogue';
export function CustomerNav({ active }: { active: 'Home' | 'Services' | 'Bookings' | 'Profile' }) {
  const themed = useAccountStyles();
  const tabs: { name: typeof active; icon: ProfileIconName; path: '/' | '/customer/services' | '/bookings' | '/profile' }[] = [
    { name: 'Home', icon: 'home', path: '/' }, { name: 'Services', icon: 'grid', path: '/customer/services' },
    { name: 'Bookings', icon: 'calendar', path: '/bookings' }, { name: 'Profile', icon: 'person', path: '/profile' },
  ];
  return <View style={themed(css.nav)}>{tabs.map(t => <Pressable key={t.name} accessibilityRole="tab" accessibilityState={{ selected: active === t.name }} onPress={() => router.replace(t.path)} style={themed([css.navItem, active === t.name && css.active])}>
    <ProfileIcon name={t.icon} color={active === t.name ? '#8157FF' : '#7E8AA4'} /><Text style={themed({ color: active === t.name ? '#8157FF' : '#7E8AA4', fontSize: 11 })}>{t.name}</Text>
  </Pressable>)}</View>;
}
export function CustomerPage({ title, children, home = false, refreshing = false, onRefresh }: { title: string; children: ReactNode; home?: boolean; refreshing?: boolean; onRefresh?: () => void }) {
  const themed = useAccountStyles();
  return <SafeAreaView style={themed(css.safe)}><View style={css.page}>
    <ScrollView contentContainerStyle={css.content} keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>
      {!home && <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={themed(css.back)}><Text style={themed(css.link)}>‹ Back</Text></Pressable>}
      <Text accessibilityRole="header" style={themed(css.title)}>{title}</Text>{children}
    </ScrollView><CustomerNav active={home ? 'Home' : 'Services'} />
  </View></SafeAreaView>;
}
export function CustomerGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/login" />;
  if (user.role !== 'customer') return <Redirect href="/" />;
  return <>{children}</>;
}
export function CatalogueState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  const themed = useAccountStyles();
  if (loading) return <LoadingState />;
  if (!error) return null;
  return <Card><Text accessibilityRole="alert" style={themed(css.error)}>{error}</Text><Button secondary onPress={retry}>Try again</Button>{error.includes('session has expired') && <Button onPress={() => router.replace('/auth/login')}>Sign in</Button>}</Card>;
}
export function CatalogueImage({ uri, label, avatar = false }: { uri?: string; label: string; avatar?: boolean }) {
  const themed = useAccountStyles(); const [failed, setFailed] = useState(false);
  const imageUri = avatar ? uri : serviceImageUri(uri);
  if (imageUri && !failed) return <Image accessibilityLabel={label} source={{ uri: imageUri }} resizeMode='cover' onError={() => setFailed(true)} style={avatar ? css.avatar : css.image} />;
  return <View style={themed([avatar ? css.avatar : css.image, css.placeholder])}><Text style={themed(css.placeholderText)}>{avatar ? label.slice(0, 1).toUpperCase() : '⌂'}</Text></View>;
}
export const priceLabel = (price?: number) => Number.isFinite(price) ? `LKR ${price!.toLocaleString()}` : 'Price on request';
export function ProviderCard({ provider, serviceId }: { provider: Provider; serviceId: string }) {
  const themed = useAccountStyles();
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/customer/provider', params: { providerId: provider._id, serviceId } })}><Card>
    <View style={css.row}><CatalogueImage key={provider.user?.avatarUrl} uri={provider.user?.avatarUrl} label={provider.user?.fullName || 'Provider'} avatar /><View style={{ flex: 1 }}>
      <Text style={themed(css.heading)}>{provider.user?.fullName || 'Provider'}</Text>
      {provider.isVerified === true && <Text style={themed(css.link)}>✓ Verified</Text>}
      {!!provider.reviewCount && provider.ratingAvg !== undefined && <Text style={themed(css.copy)}>★ {provider.ratingAvg.toFixed(1)} · {provider.reviewCount} reviews</Text>}
      {provider.yearsExperience !== undefined && <Text style={themed(css.copy)}>{provider.yearsExperience} years experience</Text>}
      {!!provider.location.city && <Text style={themed(css.copy)}>{provider.location.city}</Text>}
      {provider.distanceKm !== undefined && <Text style={themed(css.copy)}>{provider.distanceKm.toFixed(1)} km away</Text>}
      {provider.isAvailable !== undefined && <Text style={themed(css.copy)}>{provider.isAvailable ? 'Accepting bookings' : 'Currently unavailable'}</Text>}
    </View></View><Text style={themed(css.link)}>From {priceLabel(provider.priceFrom)}  ›</Text>
  </Card></Pressable>;
}
export const css = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FD' }, page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  content: { padding: 22, flexGrow: 1 }, title: { color: '#242E49', fontSize: 28, fontWeight: '800', marginBottom: 20 },
  heading: { color: '#303B55', fontSize: 18, fontWeight: '700', marginVertical: 8 }, copy: { color: '#7D89A1', fontSize: 14, lineHeight: 22, marginBottom: 8 },
  link: { color: '#633CFF', fontWeight: '700', fontSize: 14, marginVertical: 8 }, error: { color: '#A13548', marginBottom: 14, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 16 },
  tile: { width: '47%', minHeight: 125, padding: 16, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EAF3' },
  icon: { color: '#8157FF', fontSize: 30 }, image: { width: '100%', height: 190, borderRadius: 18, marginBottom: 12 }, avatar: { width: 74, height: 74, borderRadius: 24 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE8FF' }, placeholderText: { color: '#8157FF', fontSize: 36, fontWeight: '700' },
  banner: { padding: 24, borderRadius: 26, backgroundColor: '#5B3DF5', marginBottom: 20 }, bannerTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginBottom: 10 }, bannerCopy: { color: '#FFFFFF', fontSize: 14, lineHeight: 22 },
  nav: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 32, padding: 6, marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: '#F0EEF8' },
  navItem: { flex: 1, minHeight: 54, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 4 }, active: { backgroundColor: '#EEE8FF' }, back: { alignSelf: 'flex-start', minHeight: 44 },
});
