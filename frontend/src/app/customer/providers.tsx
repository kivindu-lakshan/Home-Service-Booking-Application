import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { Chip, Input } from '@/components/ui';
import { getService, getProviders, type ProviderFilter } from '@/api/catalogue';
import { useCatalogueData } from '@/hooks/useCatalogueData';
import { CatalogueState, CustomerPage, ProviderCard, css } from '@/components/customer/CustomerUI';
const filters: { label: string; value: ProviderFilter }[] = [{ label: 'All', value: 'all' }, { label: 'Top Rated', value: 'top_rated' }, { label: 'Nearest', value: 'nearest' }, { label: 'Lowest Price', value: 'lowest_price' }];
export default function ProvidersScreen() {
  const { serviceId = '' } = useLocalSearchParams<{ serviceId: string }>(); const themed = useAccountStyles();
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [filter, setFilter] = useState<ProviderFilter>('all');
  const state = useCatalogueData(useCallback(async signal => {
    const [service, result] = await Promise.all([getService(serviceId, signal), getProviders(serviceId, { search: query, filter }, signal)]);
    return { service, ...result };
  }, [serviceId, query, filter]));
  return <CustomerPage title={`Available ${state.data?.service.name || 'Providers'}`} refreshing={state.refreshing} onRefresh={() => void state.load(true)}>
    <Input placeholder="Search providers..." accessibilityLabel="Search providers" value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => setQuery(search.trim())} /><Pressable accessibilityRole="button" onPress={() => setQuery(search.trim())}><Text style={themed(css.link)}>Search</Text></Pressable>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>{filters.map(f => <Pressable key={f.value} accessibilityRole="button" accessibilityState={{ selected: filter === f.value }} onPress={() => setFilter(f.value)}><Chip active={f.value === filter}>{f.label}</Chip></Pressable>)}</ScrollView>
    <CatalogueState loading={state.loading} error={state.error} retry={() => void state.load()} />
    {state.data && <>{!state.data.nearestSupported && <Text style={themed(css.copy)}>Nearest needs coordinates on your saved address and provider locations.</Text>}{state.data.providers.map(p => <ProviderCard key={p._id} provider={p} serviceId={serviceId} />)}{!state.data.providers.length && <Text style={themed(css.copy)}>No matching providers found.</Text>}</>}
  </CustomerPage>;
}
