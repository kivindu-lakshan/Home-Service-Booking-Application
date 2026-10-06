import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { Button, Card } from '@/components/ui';
import { getService, getProviders } from '@/api/catalogue';
import { useCatalogueData } from '@/hooks/useCatalogueData';
import { CatalogueImage, CatalogueState, CustomerPage, ProviderCard, css, priceLabel } from '@/components/customer/CustomerUI';
export default function ServiceDetails() {
  const { serviceId = '' } = useLocalSearchParams<{ serviceId: string }>(); const themed = useAccountStyles();
  const state = useCatalogueData(useCallback(async signal => {
    const [service, providers] = await Promise.all([getService(serviceId, signal), getProviders(serviceId, {}, signal)]);
    return { service, providers: providers.providers };
  }, [serviceId]));
  const s = state.data?.service;
  return <CustomerPage title={s?.name || 'Service Details'} refreshing={state.refreshing} onRefresh={() => void state.load(true)}>
    <CatalogueState loading={state.loading} error={state.error} retry={() => void state.load()} />
    {s && <><CatalogueImage key={s.imageUrl} uri={s.imageUrl} label={s.name} /><Card><Text style={themed(css.heading)}>{s.name}</Text><Text style={themed(css.copy)}>{s.category?.name}</Text><Text style={themed(css.link)}>From {priceLabel(s.basePrice)}</Text>
      {!!s.reviewCount && s.ratingAvg !== undefined && <Text style={themed(css.copy)}>★ {s.ratingAvg.toFixed(1)} · {s.reviewCount} reviews</Text>}
      {!!s.description && <Text style={themed(css.copy)}>{s.description}</Text>}{!!s.estDurationHours && <Text style={themed(css.copy)}>Estimated time: {s.estDurationHours}</Text>}
      {!!s.serviceType && <Text style={themed(css.copy)}>Service type: {s.serviceType.replace('_', ' ')}</Text>}
      {!!s.inclusions?.length && <><Text style={themed(css.heading)}>What’s Included</Text>{s.inclusions.map((item,i) => <Text key={i} style={themed(css.copy)}>✓ {item}</Text>)}</>}
    </Card><Text style={themed(css.heading)}>Available Providers</Text>{state.data?.providers.slice(0, 3).map(p => <ProviderCard key={p._id} provider={p} serviceId={serviceId} />)}
      {!state.data?.providers.length && <Text style={themed(css.copy)}>No providers are currently available for this service.</Text>}
      <Button onPress={() => router.push({ pathname: '/customer/providers', params: { serviceId } })}>View Providers</Button>
    </>}
  </CustomerPage>;
}
