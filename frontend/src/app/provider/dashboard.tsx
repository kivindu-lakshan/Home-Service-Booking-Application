import { useCallback, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, BriefcaseBusiness, ChevronRight, ClipboardList, House, LogOut, ShieldCheck, Sparkles, UserRound, Headphones } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { getApplications } from '@/api/provider-applications';

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<{ total: number; pending: number } | null>(null);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    getApplications(controller.signal).then(items => {
      if (!controller.signal.aborted) { setSummary({ total: items.length, pending: items.filter(item => item.status === 'pending').length }); setError(false); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []));
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'there';
  const initials = user?.fullName?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'P';
  const tabs: { label: string; route: Href; Icon: typeof House; active?: boolean }[] = [
    { label: 'Home', route: '/provider/dashboard', Icon: House, active: true },
    { label: 'Services', route: '/services', Icon: BriefcaseBusiness },
    { label: 'Applications', route: '/provider/applications', Icon: ClipboardList },
    { label: 'Profile', route: '/profile', Icon: UserRound },
  ];
  return <SafeAreaView style={styles.safe}>
    <View style={styles.shell}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandRow}><View style={styles.logo}><House size={23} color='#633CFF' strokeWidth={2.4} /></View><View><Text style={styles.brand}>HomeHalo</Text><Text style={styles.brandCaption}>PROVIDER WORKSPACE</Text></View></View>
          <Pressable accessibilityRole='button' accessibilityLabel='Open my profile' onPress={() => router.push('/profile')} style={styles.avatar}><Text style={styles.initials}>{initials}</Text></Pressable>
        </View>
        <Text style={styles.greeting}>Welcome back, {firstName}</Text>
        <Text accessibilityRole='header' style={styles.heading}>Your next opportunity.</Text>
        <Text style={styles.subtitle}>Manage your services and grow with HomeHalo.</Text>
        <View style={styles.hero}>
          <View style={styles.heroTop}><View style={styles.heroPill}><Sparkles size={14} color='#FFFFFF' /><Text style={styles.heroPillText}>PUT YOUR SKILLS TO WORK</Text></View><View style={styles.heroIcon}><BriefcaseBusiness size={25} color='#FFFFFF' /></View></View>
          <Text style={styles.heroTitle}>Great service starts{ '\n' }with you.</Text>
          <Text style={styles.heroCopy}>Find a service that fits your expertise and send your qualifications for review.</Text>
          <Pressable accessibilityRole='button' accessibilityLabel='Available Services' onPress={() => router.push('/services')} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}><Text style={styles.heroButtonText}>Explore services</Text><ArrowUpRight size={19} color='#633CFF' /></Pressable>
        </View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your workspace</Text><ShieldCheck size={18} color='#633CFF' /></View>
        <View style={styles.grid}>
          <Pressable accessibilityRole='button' accessibilityLabel='My Service Applications' onPress={() => router.push('/provider/applications')} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <View style={styles.tileTop}><View style={styles.tileIcon}><ClipboardList size={22} color='#633CFF' /></View><ArrowUpRight size={17} color='#8A91A5' /></View>
            <Text style={styles.tileTitle}>Applications</Text><Text style={styles.tileCopy}>Track your requests</Text>
            <Text style={styles.tileDetail}>{error ? 'View your status' : summary ? `${summary.pending} pending · ${summary.total} submitted` : 'Loading status…'}</Text>
          </Pressable>
          <Pressable accessibilityRole='button' accessibilityLabel='My bookings' onPress={() => router.push('/bookings')} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <View style={styles.tileTop}><View style={[styles.tileIcon, styles.mintIcon]}><BriefcaseBusiness size={22} color='#168A76' /></View><ArrowUpRight size={17} color='#8A91A5' /></View>
            <Text style={styles.tileTitle}>Bookings</Text><Text style={styles.tileCopy}>Your scheduled work</Text><Text style={[styles.tileDetail, { color: '#168A76' }]}>View bookings</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole='button' accessibilityLabel='Support tickets' onPress={() => router.push('/support')} style={({ pressed }) => [styles.support, pressed && styles.pressed]}>
          <View style={styles.tileIcon}><Headphones size={22} color='#633CFF' /></View><View style={{ flex: 1 }}><Text style={styles.supportTitle}>Here to help</Text><Text style={styles.tileCopy}>Get support from the HomeHalo team</Text></View><ChevronRight size={20} color='#8A91A5' />
        </Pressable>
        <Pressable accessibilityRole='button' accessibilityLabel='Log out' onPress={() => void logout()} style={styles.logout}><LogOut size={17} color='#7C879F' /><Text style={styles.logoutText}>Log out</Text></Pressable>
      </ScrollView>
      <View accessibilityRole='tablist' accessibilityLabel='Provider navigation' style={styles.nav}>
        {tabs.map(({ label, route, Icon, active }) => <Pressable key={label} accessibilityRole='tab' accessibilityLabel={label} accessibilityState={{ selected: !!active }} onPress={() => { if (!active) router.push(route); }} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
          <View style={[styles.navIcon, active && styles.navIconActive]}><Icon size={22} color={active ? '#633CFF' : '#8A91A5'} strokeWidth={active ? 2.4 : 1.8} /></View><Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
        </Pressable>)}
      </View>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FD' }, shell: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' }, content: { padding: 22, paddingTop: 18, paddingBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, brandRow: { flexDirection: 'row', gap: 10, alignItems: 'center' }, logo: { width: 43, height: 43, backgroundColor: '#EDE7FF', borderRadius: 14, justifyContent: 'center', alignItems: 'center' }, brand: { color: '#242E49', fontSize: 20, fontWeight: '800', letterSpacing: -0.6 }, brandCaption: { color: '#8A91A5', fontSize: 8, fontWeight: '700', letterSpacing: 1.4, marginTop: 3 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E6F5', alignItems: 'center', justifyContent: 'center' }, initials: { color: '#633CFF', fontWeight: '800', fontSize: 14 },
  greeting: { color: '#7C879F', fontSize: 13, marginBottom: 8 }, heading: { color: '#242E49', fontSize: 27, fontWeight: '800', letterSpacing: -1 }, subtitle: { color: '#7C879F', fontSize: 12, lineHeight: 20, marginTop: 8, marginBottom: 22 },
  hero: { backgroundColor: '#633CFF', borderRadius: 24, padding: 22, marginBottom: 27 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6 }, heroPillText: { color: '#E6DEFF', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 }, heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#7955FF', alignItems: 'center', justifyContent: 'center' }, heroTitle: { color: '#FFFFFF', fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.6, marginTop: 12 }, heroCopy: { color: '#E4DCFF', fontSize: 12, lineHeight: 20, marginTop: 10, marginBottom: 20 }, heroButton: { backgroundColor: '#FFFFFF', minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }, heroButtonText: { color: '#633CFF', fontWeight: '800', fontSize: 13 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, sectionTitle: { color: '#242E49', fontSize: 17, fontWeight: '800' }, grid: { flexDirection: 'row', gap: 12, marginBottom: 16 }, tile: { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#EEEDF5' }, tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, tileIcon: { width: 42, height: 42, backgroundColor: '#F0EBFF', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, mintIcon: { backgroundColor: '#E7F6F1' }, tileTitle: { color: '#242E49', fontSize: 14, fontWeight: '800', marginBottom: 6 }, tileCopy: { color: '#8A91A5', fontSize: 10, lineHeight: 17 }, tileDetail: { color: '#633CFF', fontWeight: '700', fontSize: 10, lineHeight: 17, marginTop: 12 },
  support: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEDF5' }, supportTitle: { color: '#242E49', fontWeight: '800', fontSize: 13, marginBottom: 3 }, logout: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 12 }, logoutText: { color: '#7C879F', fontSize: 12, fontWeight: '600' },
  nav: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#EEEDF5', paddingTop: 8, paddingBottom: 10, paddingHorizontal: 10 }, navItem: { flex: 1, alignItems: 'center', minHeight: 56, justifyContent: 'center', gap: 3 }, navIcon: { width: 48, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, navIconActive: { backgroundColor: '#EEE8FF' }, navLabel: { color: '#8A91A5', fontSize: 10, fontWeight: '600' }, navLabelActive: { color: '#633CFF', fontWeight: '800' }, pressed: { opacity: 0.65 },
});
