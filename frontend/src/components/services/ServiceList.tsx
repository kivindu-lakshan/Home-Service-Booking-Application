import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { ChevronLeft, Layers } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { AddressButton } from '@/components/address/AddressUI';
import { LoadingState, EmptyState } from '@/components/DataState';
import ErrorText from '@/components/ErrorText';
import { deleteService, getServices, serviceError, type Service } from '@/api/services';
import { useAuth } from '@/context/AuthContext';
import { ServiceCard, ServiceAction, serviceStyles } from './ServiceUI';
export default function ServiceList({ admin = false }: { admin?: boolean }) {
  const themed = useAccountStyles();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [notice, setNotice] = useState('');
  const visibleServices = services.filter(service => admin && showInactive ? !service.isActive : service.isActive);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Service | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const lock = useRef(false);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(async (refresh = false) => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    if (refresh) setRefreshing(true);
    try { const result = await getServices(admin, controller.signal); if (!controller.signal.aborted) { setServices(result); setError(''); } }
    catch (failure) { if (!controller.signal.aborted) setError(serviceError(failure, 'Unable to load services.')); }
    finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [admin]);
  useFocusEffect(useCallback(() => { void load(); return () => active.current?.abort(); }, [load]));
  const remove = async () => {
    if (!selected || lock.current) return;
    lock.current = true; setRemoving(true); setDeleteError('');
    try {
      const id = selected._id;
      await deleteService(id);
      setServices(current => current.map(service => service._id === id ? { ...service, isActive: false } : service));
      setSelected(null);
      setNotice('Service deleted. You can restore it from Inactive services.');
      await load(true);
    }
    catch (failure) { setDeleteError(serviceError(failure, 'Unable to delete this service.')); }
    finally { lock.current = false; setRemoving(false); }
  };
  return <SafeAreaView style={themed(serviceStyles.safe)}>
    <ScrollView contentContainerStyle={serviceStyles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <View style={serviceStyles.topBar}>
        <Pressable accessibilityRole='button' accessibilityLabel='Go back' onPress={() => admin ? router.replace('/admin/dashboard') : router.canGoBack() ? router.back() : router.replace('/')} style={themed(serviceStyles.back)}><ChevronLeft size={24} color='#633CFF' strokeWidth={2.4} /></Pressable>
        <Text style={themed(serviceStyles.brand)}>HOMEHALO</Text>
        <View style={themed(serviceStyles.brandIcon)}><Layers size={20} color='#633CFF' /></View>
      </View>
      <Text accessibilityRole='header' style={themed(serviceStyles.heading)}>{admin ? 'Service Management' : 'Available services'}</Text>
      <Text style={themed(serviceStyles.copy)}>{admin ? 'Manage services offered through HomeHalo.' : 'Explore services offered through HomeHalo.'}</Text>
      {admin && <View style={serviceStyles.toolbar}><Text style={themed(serviceStyles.sectionLabel)}>{visibleServices.length} {showInactive ? 'inactive' : 'active'} services</Text><ServiceAction title='+ Add Service' label='Add service' icon='add' primary onPress={() => router.push('/admin/service-form')} /></View>}
      {admin && <View style={{ alignItems: 'flex-start', marginBottom: 20 }}><ServiceAction title={showInactive ? 'View active services' : `View inactive services (${services.filter(service => !service.isActive).length})`} label={showInactive ? 'Back to active services' : `Inactive services Â· ${services.filter(service => !service.isActive).length}`} icon='archive' onPress={() => { setShowInactive(current => !current); setNotice(''); }} /></View>}
      {!!notice && <Text accessibilityRole='alert' style={themed(serviceStyles.copy)}>{notice}</Text>}
      <ErrorText>{error}</ErrorText>
      {!!error && <AddressButton title='Try again' secondary onPress={() => void load(true)} />}
      {loading ? <LoadingState label='Loading services...' /> : !error && !visibleServices.length ? <EmptyState label={showInactive ? 'No inactive services.' : 'No active services are available yet.'} /> : visibleServices.map(service => <ServiceCard key={`${service._id}:${service.imageUrl || ''}`} service={service}>
        {!admin && user?.role === 'provider' && <ServiceAction title='Apply for this Service' icon='add' primary onPress={() => router.push({ pathname: '/provider/apply', params: { serviceId: service._id } })} />}
        {admin && <View style={serviceStyles.row}>
          <View style={{ flex: 1 }}><ServiceAction title='Edit' icon='edit' onPress={() => router.push({ pathname: '/admin/service-form', params: { id: service._id } })} /></View>
          {service.isActive && <View style={{ flex: 1 }}><ServiceAction title='Delete' icon='delete' danger onPress={() => { setDeleteError(''); setSelected(service); }} /></View>}
        </View>}
      </ServiceCard>)}
      {!loading && <ServiceAction title='Refresh services' icon='refresh' disabled={refreshing} onPress={() => void load(true)} />}
    </ScrollView>
    <Modal visible={!!selected} transparent animationType='fade' onRequestClose={() => { if (!removing) setSelected(null); }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,20,40,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 }}>
          <Text accessibilityRole='header' style={serviceStyles.title}>Are you sure you want to delete this service?</Text>
          <Text style={serviceStyles.copy}>{selected?.name} will become inactive and be hidden from available services. Existing bookings will remain intact.</Text>
          <ErrorText>{deleteError}</ErrorText>
          <View style={serviceStyles.row}>
            <View style={{ flex: 1 }}><AddressButton title='Cancel' secondary disabled={removing} onPress={() => setSelected(null)} /></View>
            <View style={{ flex: 1 }}><AddressButton title='Delete' danger busy={removing} onPress={() => void remove()} /></View>
          </View>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}
