import { useCallback } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { Button, Card } from '@/components/ui';
import { getProvider } from '@/api/catalogue';
import { useCatalogueData } from '@/hooks/useCatalogueData';
import { CatalogueImage, CatalogueState, CustomerPage, css, priceLabel } from '@/components/customer/CustomerUI';
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export default function ProviderDetails() {
  const { providerId = '', serviceId = '' } = useLocalSearchParams<{ providerId: string; serviceId: string }>(); const themed = useAccountStyles();
  const state = useCatalogueData(useCallback(signal => getProvider(providerId, serviceId, signal), [providerId, serviceId])); const p = state.data;
  const selectedService = p?.services.find(offering => offering.service._id === serviceId);
  return <CustomerPage title="Provider Details" refreshing={state.refreshing} onRefresh={() => void state.load(true)}>
    <CatalogueState loading={state.loading} error={state.error} retry={() => void state.load()} />
    {p && <><View style={{ alignItems: 'center', marginBottom: 16 }}><CatalogueImage key={p.user?.avatarUrl} uri={p.user?.avatarUrl} label={p.user?.fullName || 'Provider'} large /></View><Card><Text style={themed(css.heading)}>{p.user?.fullName || 'Provider'}</Text>
      {p.isVerified === true && <Text style={themed(css.link)}>✓ Verified provider</Text>}{!!p.reviewCount && p.ratingAvg !== undefined && <Text style={themed(css.copy)}>★ {p.ratingAvg.toFixed(1)} · {p.reviewCount} reviews</Text>}
      {p.yearsExperience !== undefined && <Text style={themed(css.copy)}>{p.yearsExperience} years experience</Text>}{!!p.location.city && <Text style={themed(css.copy)}>{p.location.city}</Text>}
      {selectedService && <><Text style={themed(css.heading)}>{selectedService.service.name}</Text><Text style={themed(css.link)}>From {priceLabel(p.priceFrom)}</Text></>}
      {!!p.skills && <Text style={themed(css.copy)}>Skills: {p.skills}</Text>}
      {!!p.aboutMe && <><Text style={themed(css.heading)}>About Me</Text><Text style={themed(css.copy)}>{p.aboutMe}</Text></>}
    </Card><Card><Text style={themed(css.heading)}>Services Offered</Text>{p.services.map(o => <Text key={o.service._id} style={themed(css.copy)}>{o.service.name} · {priceLabel(o.priceFrom ?? o.service.basePrice)}</Text>)}</Card>
      <Button secondary onPress={() => router.push({ pathname: '/reviews/provider', params: { providerId, serviceId } })}>View Reviews</Button>
      <Card><Text style={themed(css.heading)}>Availability</Text>{!p.availability?.length && <Text style={themed(css.copy)}>No availability schedule published. Confirm a time when booking.</Text>}{p.availability?.map((a,i) => <Text key={i} style={themed(css.copy)}>{days[a.dayOfWeek]}: {a.isAvailable ? `${a.startTime}–${a.endTime}` : 'Unavailable'}</Text>)}</Card>
      {p.isAvailable === false ? <Text style={themed(css.copy)}>This provider is currently unavailable.</Text> : <Button onPress={() => router.push({ pathname: '/bookings/new', params: { serviceId } })}>Book This Provider</Button>}
    </>}
  </CustomerPage>;
}
