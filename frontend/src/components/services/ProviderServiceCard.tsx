import { useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight, BriefcaseBusiness, Check, Clock, MapPin } from 'lucide-react-native';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import type { Service } from '@/api/services';
import { serviceImageUri } from '@/utils/service-image';

export default function ProviderServiceCard({ service }: { service: Service }) {
  const themed = useAccountStyles(); const [failedImage, setFailedImage] = useState(false);
  const imageUri = serviceImageUri(service.imageUrl);
  return <View style={themed(styles.card)}>
    {!!imageUri && !failedImage && <Image source={{ uri: imageUri }} accessibilityLabel={service.name} resizeMode="cover" onError={() => setFailedImage(true)} style={styles.image} />}
    <View style={styles.top}><View style={themed(styles.icon)}><BriefcaseBusiness size={21} color='#633CFF' /></View><Text style={themed(styles.category)}>{service.category?.name || 'Service'}</Text><View style={styles.available}><Check size={11} color='#217A62' /><Text style={styles.availableText}>Available</Text></View></View>
    <Text accessibilityRole='header' style={themed(styles.title)}>{service.name}</Text>
    {!!service.description && <Text style={themed(styles.description)}>{service.description}</Text>}
    <View style={styles.details}>
      {!!service.estDurationHours && <View style={themed(styles.detail)}><Clock size={13} color='#7C879F' /><Text style={themed(styles.detailText)}>{service.estDurationHours}</Text></View>}
      {!!service.serviceType && <View style={themed(styles.detail)}><MapPin size={13} color='#7C879F' /><Text style={themed(styles.detailText)}>{service.serviceType === 'on_site' ? 'On site' : 'Workshop'}</Text></View>}
    </View>
    {!!service.inclusions?.length && <Text style={themed(styles.inclusions)}>{service.inclusions.join(' · ')}</Text>}
    <View style={themed(styles.footer)}><View><Text style={themed(styles.priceLabel)}>Starting price</Text><Text style={themed(styles.price)}>{service.basePrice === undefined ? 'Not specified' : `LKR ${service.basePrice.toLocaleString()}`}</Text></View><Text style={themed(styles.note)}>Per service</Text></View>
    <Pressable accessibilityRole='button' accessibilityLabel={`Apply for this Service: ${service.name}`} onPress={() => router.push({ pathname: '/provider/apply', params: { serviceId: service._id } })} style={({ pressed }) => [styles.button, pressed && { opacity: 0.75 }]}><Text style={styles.buttonText}>Apply for this Service</Text><ArrowUpRight size={19} color='#FFFFFF' /></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEDF5', borderRadius: 22, padding: 20, marginBottom: 18 }, image: { width: '100%', height: 160, borderRadius: 15, marginBottom: 18 }, top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }, icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F0EBFF', justifyContent: 'center', alignItems: 'center' }, category: { flex: 1, color: '#633CFF', fontSize: 12, fontWeight: '700' }, available: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#EAF7F1', borderRadius: 20 }, availableText: { color: '#217A62', fontSize: 10, fontWeight: '700' }, title: { color: '#242E49', fontSize: 20, fontWeight: '800', letterSpacing: -0.5, lineHeight: 27, marginBottom: 8 }, description: { color: '#7C879F', fontSize: 12, lineHeight: 20, marginBottom: 15 }, details: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }, detail: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 7, backgroundColor: '#F7F7FB', borderRadius: 8 }, detailText: { color: '#7C879F', fontSize: 11 }, inclusions: { color: '#8A91A4', fontSize: 11, lineHeight: 18, marginBottom: 6 }, footer: { borderTopWidth: 1, borderColor: '#F0EEF6', paddingTop: 16, marginTop: 8, marginBottom: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, priceLabel: { color: '#8A91A4', fontSize: 10, marginBottom: 5 }, price: { color: '#242E49', fontWeight: '800', fontSize: 22, letterSpacing: -0.5 }, note: { color: '#8A91A4', fontSize: 10, marginBottom: 3 }, button: { minHeight: 48, backgroundColor: '#633CFF', borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
