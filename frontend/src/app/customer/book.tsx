import { useCallback, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { Button, Card, Chip, Input } from '@/components/ui';
import { catalogueError, getProvider, getService, requestBooking } from '@/api/catalogue';
import { getAddresses } from '@/api/addresses';
import { useCatalogueData } from '@/hooks/useCatalogueData';
import { CatalogueState, CustomerPage, css, priceLabel } from '@/components/customer/CustomerUI';
export default function BookProvider() {
  const { providerId = '', serviceId = '' } = useLocalSearchParams<{ providerId: string; serviceId: string }>(); const themed = useAccountStyles();
  const [addressId, setAddressId] = useState(''); const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const state = useCatalogueData(useCallback(async signal => {
    const [provider, service, addresses] = await Promise.all([getProvider(providerId, serviceId, signal), getService(serviceId, signal), getAddresses(signal)]);
    return { provider, service, addresses };
  }, [providerId, serviceId]));
  const selectedAddress = addressId || state.data?.addresses.find(a => a.isDefault)?._id || state.data?.addresses[0]?._id || '';
  const submit = async () => {
    if (lock.current) return;
    setError('');
    if (!selectedAddress || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setError('Select a saved address and enter a date (YYYY-MM-DD) and 24-hour time (HH:mm).'); return; }
    lock.current = true; setBusy(true);
    try { const booking = await requestBooking({ serviceId, providerId, addressId: selectedAddress, scheduledDate: date, scheduledTime: time, notes }); router.replace({ pathname: '/payment/details', params: { bookingId: booking._id } }); }
    catch (e) { setError(catalogueError(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <CustomerPage title="Book This Provider"><CatalogueState loading={state.loading} error={state.error} retry={() => void state.load()} />
    {state.data && <><Card><Text style={themed(css.heading)}>{state.data.service.name}</Text><Text style={themed(css.copy)}>{state.data.provider.user?.fullName}</Text><Text style={themed(css.link)}>{priceLabel(state.data.provider.priceFrom)}</Text><Text style={themed(css.copy)}>Pay on completion. Your request remains pending until confirmed. Times are in Sri Lanka time.</Text></Card>
      <Text style={themed(css.heading)}>Service Address</Text>{state.data.addresses.map(a => <Pressable disabled={busy} key={a._id} accessibilityRole="button" onPress={() => setAddressId(a._id)} style={{ marginBottom: 10 }}><Chip active={selectedAddress === a._id}>{a.label}: {a.line1}, {a.areaCity}</Chip></Pressable>)}
      <Button secondary onPress={() => router.push('/addresses')}>{state.data.addresses.length ? 'Manage saved addresses' : 'Add a saved address'}</Button>
      <Text style={themed(css.heading)}>Appointment</Text><Input editable={!busy} accessibilityLabel="Appointment date YYYY-MM-DD" placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} /><Input editable={!busy} accessibilityLabel="Appointment time HH:mm" placeholder="24-hour time (HH:mm)" value={time} onChangeText={setTime} />
      <Input editable={!busy} accessibilityLabel="Booking notes" placeholder="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={2000} multiline />
      {!!error && <Text accessibilityRole="alert" style={themed(css.error)}>{error}</Text>}<Button disabled={busy || !state.data.addresses.length || state.data.provider.isAvailable === false} onPress={() => void submit()}>{busy ? 'Requesting booking...' : 'Request Booking'}</Button>
    </>}
  </CustomerPage>;
}
