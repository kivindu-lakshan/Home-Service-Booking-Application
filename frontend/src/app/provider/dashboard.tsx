import { router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { AddressPage, AddressButton } from '@/components/address/AddressUI';
export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  return <AddressPage title='Provider Dashboard' subtitle={`Welcome, ${user?.fullName}. Build your services with HomeHalo.`} onBack={() => router.canGoBack() ? router.back() : router.replace('/profile')}>
    <View style={styles.card}><Text style={styles.brand}>HOMEHALO</Text><Text style={styles.title}>Share your expertise.</Text><Text style={styles.copy}>Explore available services and send your qualifications for review.</Text></View>
    <View style={{ gap: 14 }}>
      <AddressButton title='Available Services' onPress={() => router.push('/services')} />
      <AddressButton title='My Service Applications' secondary onPress={() => router.push('/provider/applications')} />
      <AddressButton title='My profile' secondary onPress={() => router.push('/profile')} />
      <AddressButton title='My bookings' secondary onPress={() => router.push('/bookings')} />
      <AddressButton title='Support tickets' secondary onPress={() => router.push('/support')} />
      <AddressButton title='Log out' secondary onPress={() => void logout()} />
    </View>
  </AddressPage>;
}
const styles = StyleSheet.create({ card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 22, marginBottom: 24 }, brand: { color: '#633CFF', fontWeight: '800', fontSize: 12, letterSpacing: 1 }, title: { color: '#242E49', fontSize: 23, fontWeight: '800', marginVertical: 12 }, copy: { color: '#7C879F', lineHeight: 22 } });
