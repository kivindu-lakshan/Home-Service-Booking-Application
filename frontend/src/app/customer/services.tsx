import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { Card, Chip, Input } from '@/components/ui';
import { getCategories, getServices } from '@/api/catalogue';
import { useCatalogueData } from '@/hooks/useCatalogueData';
import { CatalogueImage, CatalogueState, CustomerPage, css, priceLabel } from '@/components/customer/CustomerUI';
import { CategoryTiles } from '@/components/customer/CustomerHome';
export default function ServicesScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; search?: string }>();
  const themed = useAccountStyles(); const [search, setSearch] = useState(params.search || '');
  const [query, setQuery] = useState(search); const categoryId = params.categoryId;
  const state = useCatalogueData(useCallback(async signal => {
    const [categories, services] = await Promise.all([getCategories(signal), getServices({ categoryId, search: query }, signal)]);
    return { categories, services };
  }, [categoryId, query]));
  return <CustomerPage title="Services" refreshing={state.refreshing} onRefresh={() => void state.load(true)}>
    <Input placeholder="Search for a service..." accessibilityLabel="Search services" value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => setQuery(search.trim())} />
    <Pressable accessibilityRole="button" onPress={() => setQuery(search.trim())}><Text style={themed(css.link)}>Search</Text></Pressable>
    <CatalogueState loading={state.loading} error={state.error} retry={() => void state.load()} />
    {state.data && <><ScrollView horizontal showsHorizontalScrollIndicator={false}><Pressable accessibilityRole="button" onPress={() => router.setParams({ categoryId: undefined })}><Chip active={!categoryId}>All</Chip></Pressable>{state.data.categories.map(c => <Pressable key={c._id} accessibilityRole="button" onPress={() => router.setParams({ categoryId: c._id })}><Chip active={categoryId === c._id}>{c.name}</Chip></Pressable>)}</ScrollView>
      {!categoryId && !query && <CategoryTiles categories={state.data.categories} />}
      <Text style={themed(css.heading)}>{state.data.categories.find(c => c._id === categoryId)?.name || 'All Services'}</Text>
      <View style={css.grid}>{state.data.services.map(s => <Pressable key={s._id} accessibilityRole="button" style={{ width: '47%' }} onPress={() => router.push({ pathname: '/customer/service', params: { serviceId: s._id } })}><Card><CatalogueImage key={s.imageUrl} uri={s.imageUrl} label={s.name} /><Text style={themed(css.heading)}>{s.name}</Text><Text style={themed(css.copy)}>{s.category?.name}</Text>{!!s.description && <Text numberOfLines={2} style={themed(css.copy)}>{s.description}</Text>}<Text style={themed(css.link)}>From {priceLabel(s.basePrice)}</Text></Card></Pressable>)}</View>
      {!state.data.services.length && <Text style={themed(css.copy)}>No services match your search.</Text>}
    </>}
  </CustomerPage>;
}
