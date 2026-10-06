import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AddressPage, AddressButton } from '@/components/address/AddressUI';
import { LoadingState, EmptyState } from '@/components/DataState';
import ErrorText from '@/components/ErrorText';
import ApplicationStatus from '@/components/admin/ApplicationStatus';
import { listAdminApplications, type ApplicationPage, type ApplicationStatus as Status } from '@/api/admin-provider-applications';
import { serviceError } from '@/api/services';
export default function ProviderApplications() {
  const [status, setStatus] = useState<Status | 'all'>('pending'); const [page, setPage] = useState(1);
  const [data, setData] = useState<ApplicationPage | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [refresh, setRefresh] = useState(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    listAdminApplications(status, page, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(e => { if (!controller.signal.aborted) setError(serviceError(e, 'Unable to load provider applications.')); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  // Retry deliberately changes the callback identity to reload a focused screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, refresh]));
  return <AddressPage title='Provider Applications' subtitle='Review professionals applying to offer HomeHalo services.' onBack={() => router.replace('/admin/dashboard')}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>{(['all', 'pending', 'approved', 'rejected'] as const).map(tab => <Pressable key={tab} accessibilityRole='button' accessibilityState={{ selected: status === tab }} onPress={() => { setStatus(tab); setPage(1); }} style={{ backgroundColor: status === tab ? '#5B3DF5' : '#EEE9FF', borderRadius: 20, padding: 10 }}><Text style={{ color: status === tab ? '#FFFFFF' : '#5B3DF5', fontWeight: '700' }}>{tab[0].toUpperCase() + tab.slice(1)}</Text></Pressable>)}</View>
    <ErrorText>{error}</ErrorText>
    {loading ? <LoadingState label='Loading applications...' /> : error ? <AddressButton title='Try Again' onPress={() => setRefresh(n => n + 1)} /> : <>
      {!data?.items.length && <EmptyState label={status === 'all' ? 'No provider applications.' : `No ${status} provider applications.`} />}
      {data?.items.map(item => <Pressable key={item._id} accessibilityRole='button' accessibilityLabel={`Review ${item.professionalName}`} onPress={() => router.push({ pathname: '/admin/provider-application/[id]', params: { id: item._id } })} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6EAF3', padding: 20, marginBottom: 14, gap: 10 }}>
        <ApplicationStatus status={item.status} /><Text style={{ fontSize: 18, fontWeight: '800', color: '#242E49' }}>{item.provider?.user?.fullName || item.professionalName}</Text><Text style={{ color: '#5B3DF5', fontWeight: '700' }}>{item.service?.name || 'Service unavailable'}</Text><Text style={{ color: '#7C879F' }}>{item.location?.address || 'Location unavailable'}</Text><Text style={{ color: '#7C879F', fontSize: 12 }}>Submitted {new Date(item.createdAt).toLocaleDateString()}</Text><Text style={{ color: '#5B3DF5' }}>Review application ›</Text>
      </Pressable>)}
      <View style={{ gap: 10 }}>{page > 1 && <AddressButton title='Previous Page' secondary onPress={() => setPage(n => n - 1)} />}{data && page * data.pageSize < data.total && <AddressButton title='Next Page' secondary onPress={() => setPage(n => n + 1)} />}</View>
    </>}
  </AddressPage>;
}
