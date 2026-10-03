import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Modal, Text, TextInput, View } from 'react-native';
import { AddressPage, AddressButton, addressStyles } from '@/components/address/AddressUI';
import { LoadingState } from '@/components/DataState';
import ErrorText from '@/components/ErrorText';
import ApplicationStatus from '@/components/admin/ApplicationStatus';
import { getAdminApplication, reviewApplication, type AdminApplication } from '@/api/admin-provider-applications';
import { serviceError } from '@/api/services';
import { openApplicationDocument } from '@/utils/open-application-document';
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E6EAF3', marginBottom: 14, gap: 10 }}><Text style={{ color: '#242E49', fontSize: 16, fontWeight: '800' }}>{title}</Text>{children}</View>;
}
export default function ApplicationReview() {
  const { id = '' } = useLocalSearchParams<{ id: string }>(); const [item, setItem] = useState<AdminApplication | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [refresh, setRefresh] = useState(0);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null); const [reason, setReason] = useState(''); const [opening, setOpening] = useState(false);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setItem(null);
    getAdminApplication(id, controller.signal).then(data => { if (!controller.signal.aborted) setItem(data); }).catch(e => { if (!controller.signal.aborted) setError(serviceError(e, 'Unable to load application.')); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  // Retry deliberately changes the callback identity to reload a focused screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refresh]));
  const review = async () => {
    if (!decision || !item || busy) return; setBusy(true); setError('');
    try { setItem(await reviewApplication(item._id, decision, reason.trim())); setDecision(null); }
    catch (e) { setError(serviceError(e, 'Unable to review application.')); setDecision(null); }
    finally { setBusy(false); }
  };
  return <AddressPage title='Application Review' subtitle='Review the provider for this specific service.' busy={busy} onBack={() => router.replace('/admin/provider-applications')}>
    <ErrorText>{error}</ErrorText>
    {loading ? <LoadingState label='Loading application...' /> : !item ? <AddressButton title='Try Again' onPress={() => setRefresh(n => n + 1)} /> : <>
      <Section title='Application Information'><ApplicationStatus status={item.status} /><Text>Submitted {new Date(item.createdAt).toLocaleString()}</Text>{item.reviewedAt && <Text>Reviewed {new Date(item.reviewedAt).toLocaleString()} by {item.reviewedBy?.fullName || 'Admin'}</Text>}{!!item.rejectionReason && <Text>Reason: {item.rejectionReason}</Text>}</Section>
      <Section title='Provider Information'><Text>{item.provider?.user?.fullName || item.professionalName}</Text><Text>{item.provider?.user?.email || 'Email unavailable'}</Text><Text>{item.phone || item.provider?.user?.phone || 'Phone unavailable'}</Text></Section>
      <Section title='Requested Service'><Text>{item.service?.name || 'Service unavailable'}</Text><Text>{item.service?.category?.name || 'Category unavailable'}</Text></Section>
      <Section title='Professional Information'><Text>Professional name: {item.professionalName}</Text><Text>{item.yearsExperience} years of experience</Text><Text style={{ fontWeight: '700' }}>Qualifications</Text><Text>{item.qualifications}</Text><Text style={{ fontWeight: '700' }}>Skills</Text><Text>{item.skills}</Text><Text style={{ fontWeight: '700' }}>About</Text><Text>{item.aboutMe}</Text>{item.priceFrom !== undefined && <Text>Starting price: LKR {item.priceFrom.toLocaleString()}</Text>}</Section>
      <Section title='Supporting Documents'>{!item.documents.length && <Text>No supporting documents available.</Text>}{item.documents.map(document => <AddressButton key={document._id} title={`Open ${document.name}`} secondary disabled={opening || busy} onPress={() => { setOpening(true); setError(''); void openApplicationDocument(item._id, document).catch(e => setError(serviceError(e, 'Document unavailable.'))).finally(() => setOpening(false)); }} />)}{opening && <LoadingState label='Opening document...' />}</Section>
      <Section title='Service Location'><Text>{item.location?.address || 'Service location unavailable'}</Text></Section>
      {item.status === 'pending' && <View style={{ gap: 12 }}><AddressButton title='Approve Provider' disabled={busy} onPress={() => { setReason(''); setDecision('approve'); }} /><AddressButton title='Reject Application' danger disabled={busy} onPress={() => { setReason(''); setDecision('reject'); }} /></View>}
      {!!error && <View style={{ marginTop: 14 }}><AddressButton title='Refresh Application' secondary onPress={() => setRefresh(n => n + 1)} /></View>}
    </>}
    <Modal visible={!!decision} transparent animationType='fade' onRequestClose={() => { if (!busy) setDecision(null); }}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(20,20,40,0.45)', padding: 24 }}><View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 22, width: '100%', maxWidth: 500, alignSelf: 'center', gap: 16 }}><Text style={{ color: '#242E49', fontSize: 20, fontWeight: '800' }}>{decision === 'approve' ? `Approve this provider for ${item?.service?.name || 'this service'}?` : 'Reject this application?'}</Text>
        {decision === 'reject' && <><Text>Reason for rejection (optional)</Text><TextInput accessibilityLabel='Reason for rejection' multiline maxLength={2000} editable={!busy} value={reason} onChangeText={setReason} style={[addressStyles.input, { minHeight: 100 }]} /></>}
        <AddressButton title={decision === 'approve' ? 'Approve' : 'Reject'} danger={decision === 'reject'} busy={busy} onPress={() => void review()} /><AddressButton title='Cancel' secondary disabled={busy} onPress={() => setDecision(null)} />
      </View></View>
    </Modal>
  </AddressPage>;
}
