import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { AuthField } from '@/components/auth/AuthUI';
import { AddressPage, AddressButton, AddressNotice } from '@/components/address/AddressUI';
import { LoadingState } from '@/components/DataState';
import ErrorText from '@/components/ErrorText';
import { getServices, serviceError, type Service } from '@/api/services';
import { applicationProblem, searchApplicationLocations, submitApplication, type ApplicationLocation } from '@/api/provider-applications';
import { currentServiceLocation } from '@/utils/current-service-location';
export default function Apply() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>(); const { user } = useAuth();
  const [service, setService] = useState<Service>(); const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user?.fullName || ''); const [phone, setPhone] = useState(user?.phone || '');
  const [experience, setExperience] = useState(''); const [about, setAbout] = useState(''); const [qualifications, setQualifications] = useState(''); const [skills, setSkills] = useState(''); const [price, setPrice] = useState('');
  const [address, setAddress] = useState(''); const [latitude, setLatitude] = useState(''); const [longitude, setLongitude] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const [matches, setMatches] = useState<ApplicationLocation[]>([]); const [documents, setDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [error, setError] = useState(''); const [locationNote, setLocationNote] = useState(''); const [busy, setBusy] = useState(false); const [locating, setLocating] = useState(false); const lock = useRef(false);
  useEffect(() => { const controller = new AbortController(); getServices(false, controller.signal).then(list => { const selected = list.find(item => item._id === serviceId); if (!selected) throw new Error('This service is no longer available.'); if (!controller.signal.aborted) setService(selected); }).catch(e => { if (!controller.signal.aborted) setError(serviceError(e, 'Unable to load service.')); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [serviceId]);
  const choose = (location: ApplicationLocation) => { setAddress(location.address); setLatitude(String(location.latitude)); setLongitude(String(location.longitude)); setConfirmed(false); setMatches([]); };
  const locate = async (search: boolean) => { setLocating(true); setLocationNote(''); try { if (search) { const found = await searchApplicationLocations(address); setMatches(found); if (!found.length) setLocationNote('No matching address found. Try a more specific address.'); } else { const result = await currentServiceLocation(); choose({ address: result.location.areaCity || address, latitude: result.location.latitude!, longitude: result.location.longitude! }); setLocationNote(result.note); } } catch (e) { setLocationNote(serviceError(e, e instanceof Error ? e.message : 'Location unavailable.')); } finally { setLocating(false); } };
  const attach = async () => { try { const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], multiple: true, copyToCacheDirectory: true, base64: false }); if (result.canceled) return;
    const files = [...documents, ...result.assets]; if (files.length > 5 || files.some(file => !file.size || file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimeType || ''))) { setError('Select up to five PDF, PNG or JPEG files, each no larger than 5 MB.'); return; } setDocuments(files); setError('');
  } catch { setError('Unable to select documents. Please try again.'); } };
  const submit = async () => { if (lock.current || !service) return; const data = { service: service._id, professionalName: name, phone, yearsExperience: experience.trim() ? Number(experience) : NaN, aboutMe: about, qualifications, skills, ...(price.trim() ? { priceFrom: Number(price) } : {}), location: { address, latitude: latitude.trim() ? Number(latitude) : NaN, longitude: longitude.trim() ? Number(longitude) : NaN } };
    const problem = applicationProblem(data, documents.length); if (problem || !confirmed) { setError(problem || 'Confirm your service location before submitting.'); return; }
    lock.current = true; setBusy(true); setError(''); try { await submitApplication(data, documents); router.replace('/provider/applications'); } catch (e) { setError(serviceError(e, 'Unable to submit application. Please try again.')); } finally { lock.current = false; setBusy(false); }
  };
  const section = (title: string) => <Text style={{ color: '#242E49', fontSize: 19, fontWeight: '800', marginTop: 12, marginBottom: 18 }}>{title}</Text>;
  return <AddressPage title='Service application' subtitle='HomeHalo · Share your expertise and qualifications.' busy={busy} onBack={() => router.canGoBack() ? router.back() : router.replace('/services')}>
    <ErrorText>{error}</ErrorText>
    {loading ? <LoadingState label='Loading selected service...' /> : service && <>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20 }}><Text style={{ color: '#7C879F', marginBottom: 8 }}>Applying for</Text><Text style={{ color: '#633CFF', fontWeight: '800', fontSize: 21 }}>{service.name}</Text></View>
      {section('Professional details')}
      <AuthField label='Professional / display name' value={name} onChangeText={setName} maxLength={120} editable={!busy} />
      <AuthField label='Phone number' value={phone} onChangeText={setPhone} keyboardType='phone-pad' maxLength={30} editable={!busy} />
      <AuthField label='Years of experience' value={experience} onChangeText={setExperience} keyboardType='decimal-pad' editable={!busy} />
      <AuthField label='About me' value={about} onChangeText={setAbout} multiline maxLength={2000} editable={!busy} />
      <AuthField label='Qualifications' value={qualifications} onChangeText={setQualifications} multiline maxLength={2000} editable={!busy} />
      <AuthField label='Relevant skills' value={skills} onChangeText={setSkills} multiline maxLength={1000} editable={!busy} />
      <AuthField label='Starting price (LKR, optional)' value={price} onChangeText={setPrice} keyboardType='decimal-pad' editable={!busy} />
      {section('Supporting certificates')}
      <Text style={{ color: '#7C879F', marginBottom: 16 }}>Attach 1–5 PDF, PNG or JPEG files. Maximum 5 MB per file.</Text>
      {documents.map((file, index) => <View key={`${file.uri}:${index}`} style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginBottom: 12 }}><Text style={{ color: '#242E49', marginBottom: 10 }}>{file.name}</Text><AddressButton title={`Remove ${file.name}`} secondary disabled={busy} onPress={() => setDocuments(current => current.filter((_, i) => i !== index))} /></View>)}
      <AddressButton title='Attach certificates' secondary disabled={busy || documents.length >= 5} onPress={() => void attach()} />
      {section('Service location')}
      <AuthField label='Service address' value={address} maxLength={300} editable={!busy} onChangeText={value => { setAddress(value); setConfirmed(false); setMatches([]); }} />
      <View style={{ gap: 12, marginBottom: 18 }}><AddressButton title='Search address' secondary disabled={busy || locating || address.trim().length < 3} onPress={() => void locate(true)} /><AddressButton title='Use current location' secondary busy={locating} disabled={busy} onPress={() => void locate(false)} /></View>
      {!!locationNote && <Text accessibilityRole='alert' style={{ color: '#7C879F', marginBottom: 16 }}>{locationNote}</Text>}
      {matches.map((match, index) => <View key={index} style={{ marginBottom: 12 }}><AddressButton title={match.address} secondary onPress={() => choose(match)} /></View>)}
      <Text style={{ color: '#7C879F', marginBottom: 14 }}>Use GPS, select an address search result, or enter the exact coordinates manually. Review the pin before confirming.</Text>
      <AuthField label='Latitude' value={latitude} keyboardType='numbers-and-punctuation' editable={!busy} onChangeText={value => { setLatitude(value); setConfirmed(false); }} />
      <AuthField label='Longitude' value={longitude} keyboardType='numbers-and-punctuation' editable={!busy} onChangeText={value => { setLongitude(value); setConfirmed(false); }} />
      <View style={{ gap: 12, marginBottom: 24 }}><AddressButton title='View pin in Google Maps' secondary disabled={busy || !latitude.trim() || !longitude.trim() || !Number.isFinite(Number(latitude)) || Math.abs(Number(latitude)) > 90 || !Number.isFinite(Number(longitude)) || Math.abs(Number(longitude)) > 180} onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`)} />
        <AddressButton title={confirmed ? 'Location confirmed' : 'Confirm location'} secondary disabled={busy || address.trim().length < 3 || !latitude.trim() || !longitude.trim() || !Number.isFinite(Number(latitude)) || Math.abs(Number(latitude)) > 90 || !Number.isFinite(Number(longitude)) || Math.abs(Number(longitude)) > 180} onPress={() => setConfirmed(true)} /></View>
      <AddressNotice>Your application will be Pending until reviewed. Your account remains a Provider.</AddressNotice>
      <AddressButton title='Submit application' busy={busy} disabled={locating} onPress={() => void submit()} />
    </>}
  </AddressPage>;
}
