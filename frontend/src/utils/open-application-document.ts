import { Platform } from 'react-native';
import { api, getStoredToken } from '@/api/client';
export async function openApplicationDocument(applicationId: string, document: { _id: string; name: string; mimeType: string }) {
  const endpoint = `/admin/provider-applications/${applicationId}/documents/${document._id}`;
  if (Platform.OS === 'web') {
    const response = await api.get(endpoint, { responseType: 'blob', timeout: 20000 });
    const url = URL.createObjectURL(response.data);
    const link = globalThis.document.createElement('a'); link.href = url; link.download = document.name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000); return;
  }
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  if (!await Sharing.isAvailableAsync()) throw new Error('No document viewer is available on this device.');
  const token = await getStoredToken();
  if (!token) throw new Error('Please sign in again.');
  const extension = document.mimeType === 'application/pdf' ? 'pdf' : document.mimeType === 'image/png' ? 'png' : 'jpg';
  const destination = new File(Paths.cache, `application-${document._id}-${Date.now()}.${extension}`);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const { fetch } = await import('expo/fetch');
    const response = await fetch(`${api.defaults.baseURL?.replace(/\/$/, '')}${endpoint}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    if (!response.ok) throw new Error(response.status === 404 ? 'Document file unavailable.' : 'Unable to open document. Please sign in again or retry.');
    const bytes = await response.bytes(); destination.create(); destination.write(bytes); clearTimeout(timer);
    await Sharing.shareAsync(destination.uri, { mimeType: document.mimeType, dialogTitle: 'Open supporting document' });
  } finally { clearTimeout(timer); if (destination.exists) destination.delete(); }
}
