import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { AddressPage, AddressButton } from '@/components/address/AddressUI';
import { getApplications, type ProviderApplication } from '@/api/provider-applications';
import { serviceError } from '@/api/services';
import { LoadingState, EmptyState } from '@/components/DataState';
import ErrorText from '@/components/ErrorText';
export default function Applications() {
  const [items, setItems] = useState<ProviderApplication[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { const controller = new AbortController(); setLoading(true); setError(''); getApplications(controller.signal).then(data => { if (!controller.signal.aborted) setItems(data); }).catch(e => { if (!controller.signal.aborted) setError(serviceError(e, 'Unable to load applications.')); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []));
  return <AddressPage title='My Service Applications' subtitle='Track the status of your service requests.' onBack={() => router.replace('/provider/dashboard')}>
    <ErrorText>{error}</ErrorText>
    {loading ? <LoadingState label='Loading applications...' /> : !error && !items.length ? <EmptyState label='You have not applied for a service yet.' /> : items.map(item => <View key={item._id} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, gap: 12 }}>
      <Text style={{ color: '#242E49', fontSize: 18, fontWeight: '800' }}>{item.service?.name || 'Service no longer available'}</Text>
      <Text style={{ color: '#7C879F' }}>Submitted {new Date(item.createdAt).toLocaleDateString()}</Text>
      <Text style={{ color: item.status === 'approved' ? '#278B70' : item.status === 'rejected' ? '#B73248' : '#633CFF', backgroundColor: item.status === 'approved' ? '#E6F5EE' : item.status === 'rejected' ? '#FCE9EC' : '#EDE7FF', padding: 10, borderRadius: 16, alignSelf: 'flex-start', fontWeight: '700' }}>{item.status[0].toUpperCase() + item.status.slice(1)}</Text>
      <Text style={{ color: '#7C879F' }}>{item.location.address}</Text>
      <Text style={{ color: '#7C879F' }}>{item.documents.length} supporting document{item.documents.length === 1 ? '' : 's'}</Text>
    </View>)}
    <AddressButton title='Available Services' onPress={() => router.push('/services')} />
  </AddressPage>;
}
