import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { Button, Card, Input } from '@/components/ui';
import { getCategories, type Category } from '@/api/catalogue';
import { useCatalogueData } from '@/hooks/useCatalogueData';
import { CatalogueImage, CatalogueState, CustomerPage, css } from './CustomerUI';
const icons: Record<string, string> = { plumber: '⚒', cleaner: '✧', 'ac-repair': '❄' };
export function CategoryTiles({ categories }: { categories: Category[] }) {
  const themed = useAccountStyles();
  return <View style={css.grid}>{categories.map(c => <Pressable key={c._id} accessibilityRole="button" onPress={() => router.push({ pathname: '/customer/services', params: { categoryId: c._id } })} style={themed(css.tile)}>
    {c.icon?.startsWith('https://') || c.icon?.startsWith('http://') ? <CatalogueImage uri={c.icon} label={c.name} avatar /> : <Text style={themed(css.icon)}>{icons[c.icon || ''] || '⌂'}</Text>}
    <Text style={themed(css.heading)}>{c.name}</Text>
  </Pressable>)}</View>;
}
export default function CustomerHome() {
  const themed = useAccountStyles(); const [search, setSearch] = useState('');
  const state = useCatalogueData(useCallback(signal => getCategories(signal), []));
  const browse = () => router.push({ pathname: '/customer/services', params: { search: search.trim() } });
  return <CustomerPage home title={`Hello, ${state.user?.fullName.split(' ')[0] || 'there'} 👋`} refreshing={state.refreshing} onRefresh={() => void state.load(true)}>
    <Text style={themed(css.copy)}>A helping hand for your home.</Text>
    <View style={themed(css.banner)}><Text style={themed(css.bannerTitle)}>Your home, taken care of.</Text><Text style={themed(css.bannerCopy)}>Find a service, meet your provider and book a time that works for you.</Text><Button secondary onPress={() => router.push('/customer/services')}>Explore services</Button></View>
    <Input accessibilityLabel="Search for a service" placeholder="Search for a service..." value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={browse} />
    <Button secondary onPress={browse}>Search services</Button>
    <View style={[css.row, { justifyContent: 'space-between', marginTop: 20 }]}><Text style={themed(css.heading)}>Service Categories</Text><Pressable accessibilityRole="button" onPress={() => router.push('/customer/services')}><Text style={themed(css.link)}>See All</Text></Pressable></View>
    <CatalogueState loading={state.loading} error={state.error} retry={() => void state.load()} />
    {state.data && <><CategoryTiles categories={state.data} />{!state.data.length && <Text style={themed(css.copy)}>No service categories are available yet.</Text>}</>}
    <Card><Text style={themed(css.heading)}>Need a Custom Service?</Text><Text style={themed(css.copy)}>Tell our support team what your home needs.</Text><Button secondary onPress={() => router.push('/support/form')}>Contact support</Button></Card>
    <Text style={themed(css.heading)}>Why Choose Us</Text><Card><Text style={themed(css.heading)}>Choose with confidence</Text><Text style={themed(css.copy)}>Compare provider profiles and published prices. Keep your bookings and payments together in one place.</Text></Card>
  </CustomerPage>;
}
