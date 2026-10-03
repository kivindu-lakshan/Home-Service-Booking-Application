import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { serviceImageUri } from '@/utils/service-image';
import { Image, Pressable, Switch, TextInput, View } from 'react-native';
import { AccountText as Text } from '@/components/settings/AccountText';
import { useAccountStyles } from '@/context/AccountThemeContext';
import { AddressPage, AddressButton, addressStyles } from '@/components/address/AddressUI';
import { LoadingState } from '@/components/DataState';
import ErrorText from '@/components/ErrorText';
import { ServiceGuard } from '@/components/services/ServiceUI';
import { uploadServiceImage, createService, updateService, getService, getServiceCategories, serviceError, type ServiceCategory } from '@/api/services';
import { emptyService, servicePayload, validateService, type ServiceDraft, type ServiceErrors } from '@/validation/service';

export default function ServiceFormRoute() { return <ServiceGuard admin><ServiceForm /></ServiceGuard>; }
function ServiceForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const themed = useAccountStyles();
  const [form, setForm] = useState<ServiceDraft>({ ...emptyService });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [fields, setFields] = useState<ServiceErrors>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const preview = image?.uri || serviceImageUri(form.imageUrl);
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setLoadFailed(false); setError('');
    try {
      const [options, service] = await Promise.all([getServiceCategories(controller.signal), id ? getService(id, controller.signal) : Promise.resolve(null)]);
      if (controller.signal.aborted) return;
      setCategories(options);
      if (service) setForm({ name: service.name || '', category: service.category?._id || '', description: service.description || '', basePrice: service.basePrice === undefined ? '' : String(service.basePrice), imageUrl: service.imageUrl || '', estDurationHours: service.estDurationHours || '', serviceType: service.serviceType, inclusions: (service.inclusions || []).join('\n'), isActive: service.isActive });
      else setForm({ ...emptyService });
    } catch (failure) { if (!controller.signal.aborted) { setLoadFailed(true); setError(serviceError(failure, 'Unable to load the service form.')); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); request.current?.abort(); }; }, [load]);
  const update = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => {
    if (key === 'imageUrl') { setImage(null); setImageFailed(false); }
    setForm(current => ({ ...current, [key]: value })); setFields(current => ({ ...current, [key]: undefined }));
  };
  const selectImage = async () => {
    try {
      const selected = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg'], multiple: false, copyToCacheDirectory: true, base64: false });
      if (selected.canceled) return;
      const asset = selected.assets[0];
      const mimeType = asset.mimeType || (/\.png$/i.test(asset.name) ? 'image/png' : /\.jpe?g$/i.test(asset.name) ? 'image/jpeg' : '');
      if (asset.size === 0 || (asset.size !== undefined && asset.size > 5 * 1024 * 1024) || !['image/png', 'image/jpeg'].includes(mimeType)) { setError('Select one PNG or JPEG image, maximum 5 MB.'); return; }
      setImage({ ...asset, mimeType }); setImageFailed(false); setError('');
    } catch { setError('Unable to select an image. Please try again.'); }
  };
  const save = async () => {
    if (lock.current) return;
    const invalid = validateService(form); setFields(invalid); setError('');
    if (Object.keys(invalid).length) return;
    lock.current = true; setBusy(true);
    try {
      const payload = servicePayload(form);
      if (image) { payload.imageUrl = await uploadServiceImage(image); update('imageUrl', payload.imageUrl); setImage(null); setImageFailed(false); }
      if (id) await updateService(id, payload); else await createService(payload);
      router.replace('/admin/services');
    } catch (failure) {
      setError(serviceError(failure, 'Unable to save this service.'));
      if (isAxiosError(failure) && Array.isArray(failure.response?.data?.data)) {
        const errors: ServiceErrors = {};
        for (const item of failure.response.data.data) if (typeof item.path === 'string' && Object.hasOwn(emptyService, item.path)) errors[item.path as keyof ServiceDraft] = item.msg;
        setFields(errors);
      }
    } finally { lock.current = false; setBusy(false); }
  };
  const textField = (key: 'name' | 'description' | 'basePrice' | 'imageUrl' | 'estDurationHours' | 'inclusions', label: string, multiline = false) => <View style={addressStyles.field} key={key}>
    <Text style={themed(addressStyles.label)}>{label}</Text>
    <TextInput accessibilityLabel={label} value={form[key]} editable={!busy} multiline={multiline} keyboardType={key === 'basePrice' ? 'decimal-pad' : key === 'imageUrl' ? 'url' : 'default'} autoCapitalize={key === 'imageUrl' ? 'none' : 'sentences'} autoCorrect={key !== 'imageUrl'} onChangeText={value => update(key, value)} style={themed([addressStyles.input, multiline && { minHeight: 100, textAlignVertical: 'top' }, !!fields[key] && addressStyles.invalid])} />
    <ErrorText>{fields[key]}</ErrorText>
  </View>;
  return <AddressPage title={id ? 'Edit service' : 'Add service'} subtitle='Manage services offered through HomeHalo.' busy={busy} onBack={() => router.replace('/admin/services')}>
    {loading ? <LoadingState label='Loading service categories...' /> : loadFailed ? <><ErrorText>{error}</ErrorText><AddressButton title='Try again' onPress={() => void load()} /></> : <>
      {textField('name', 'Service name')}
      <Text style={themed(addressStyles.label)}>Service category</Text>
      <View accessibilityRole='radiogroup' accessibilityLabel='Service category' style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {categories.map(category => <Pressable key={category._id} accessibilityRole='radio' accessibilityLabel={category.name} accessibilityState={{ checked: form.category === category._id, disabled: busy }} disabled={busy} onPress={() => update('category', category._id)} style={themed({ padding: 12, borderRadius: 14, backgroundColor: form.category === category._id ? '#633CFF' : '#EDE7FF' })}>
          <Text style={themed({ color: form.category === category._id ? '#FFFFFF' : '#303B55', fontWeight: '700' })}>{category.name}{!category.isActive ? ' (inactive)' : ''}</Text>
        </Pressable>)}
      </View>
      {!categories.length && <Text style={themed(addressStyles.hint)}>No categories are available. An existing service category is required before saving.</Text>}
      <ErrorText>{fields.category}</ErrorText>
      {textField('description', 'Description', true)}
      {textField('basePrice', 'Starting price (LKR)')}
      {textField('estDurationHours', 'Estimated duration')}
      <View style={addressStyles.field}>
        <Text style={themed(addressStyles.label)}>Service Image</Text>
        {!!preview && !imageFailed && <Image key={preview} accessibilityLabel='Service image preview' source={{ uri: preview }} resizeMode='cover' onError={() => setImageFailed(true)} style={{ width: '100%', height: 170, borderRadius: 14, marginBottom: 12 }} />}
        {imageFailed && <Text style={themed(addressStyles.hint)}>Image preview unavailable. Select another image or check the URL.</Text>}
        <AddressButton title={preview ? 'Replace Service Image' : 'Select Service Image'} secondary disabled={busy} onPress={() => void selectImage()} />
        <Text style={themed(addressStyles.hint)}>PNG or JPEG, maximum 5 MB. The image uploads when you save the service.</Text>
        {!!preview && <AddressButton title='Remove Service Image' secondary disabled={busy} onPress={() => { setImage(null); setImageFailed(false); update('imageUrl', ''); }} />}
      </View>
      {textField('imageUrl', 'Service image URL')}
      <Text style={themed(addressStyles.label)}>Service type</Text>
      <View accessibilityRole='radiogroup' accessibilityLabel='Service type' style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        {(['on_site', 'workshop'] as const).map(value => <Pressable key={value} accessibilityRole='radio' accessibilityState={{ checked: form.serviceType === value, disabled: busy }} disabled={busy} onPress={() => update('serviceType', value)} style={themed({ padding: 12, borderRadius: 14, backgroundColor: form.serviceType === value ? '#633CFF' : '#EDE7FF' })}>
          <Text style={themed({ color: form.serviceType === value ? '#FFFFFF' : '#303B55', fontWeight: '700' })}>{value === 'on_site' ? 'On site' : 'Workshop'}</Text>
        </Pressable>)}
      </View>
      <ErrorText>{fields.serviceType}</ErrorText>
      {textField('inclusions', 'Inclusions (one per line)', true)}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={themed(addressStyles.label)}>Active service</Text>
        <Switch accessibilityLabel='Active service' value={form.isActive} disabled={busy} onValueChange={value => update('isActive', value)} trackColor={{ true: '#633CFF' }} />
      </View>
      <Text style={themed(addressStyles.hint)}>Only active services in active categories are shown to customers and providers.</Text>
      <ErrorText>{fields.isActive}</ErrorText>
      <ErrorText>{error}</ErrorText>
      <View style={addressStyles.footer}>
        <AddressButton title='Save service' busy={busy} disabled={!categories.length} onPress={() => void save()} />
        <AddressButton title='Cancel' secondary disabled={busy} onPress={() => router.replace('/admin/services')} />
      </View>
    </>}
  </AddressPage>;
}
