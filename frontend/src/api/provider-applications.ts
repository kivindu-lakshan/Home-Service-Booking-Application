import { api } from './client';
import { Platform } from 'react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
export type ApplicationLocation = { address: string; latitude: number; longitude: number };
export type ApplicationInput = { service: string; professionalName: string; phone: string; yearsExperience: number; aboutMe: string; qualifications: string; skills: string; priceFrom?: number; location: ApplicationLocation };
export type ProviderApplication = { _id: string; service: { _id: string; name: string } | null; status: 'pending' | 'approved' | 'rejected'; createdAt: string; rejectionReason?: string; reviewedAt?: string; location: ApplicationLocation | null; documents: { _id: string; name: string; mimeType: string; size: number }[] };
export async function getApplications(signal?: AbortSignal): Promise<ProviderApplication[]> { return (await api.get('/provider/applications', { signal })).data.data; }
export async function searchApplicationLocations(address: string): Promise<ApplicationLocation[]> { return (await api.get('/provider/location-search', { params: { address }, timeout: 12000 })).data.data; }
export async function submitApplication(application: ApplicationInput, documents: DocumentPickerAsset[]) {
  const form = new FormData(); form.append('application', JSON.stringify(application));
  for (const document of documents) {
    if (Platform.OS === 'web') {
      if (!document.file) throw new Error('Please select your documents again.');
      form.append('documents', document.file, document.name);
    } else {
      form.append('documents', { uri: document.uri, name: document.name, type: document.mimeType } as unknown as Blob);
    }
  }
  return (await api.post('/provider/applications', form, { timeout: 90000, headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
}
export function applicationProblem(data: ApplicationInput, count: number): string {
  if (data.professionalName.trim().length < 2 || data.professionalName.length > 120) return 'Enter your professional name (2–120 characters).';
  if (!/^[+\d\s()-]{7,30}$/.test(data.phone)) return 'Enter a valid phone number.';
  if (!Number.isFinite(data.yearsExperience) || data.yearsExperience < 0 || data.yearsExperience > 80) return 'Enter experience between 0 and 80 years.';
  if (data.aboutMe.trim().length < 10 || data.aboutMe.length > 2000 || data.qualifications.trim().length < 3 || data.qualifications.length > 2000 || data.skills.trim().length < 3 || data.skills.length > 1000) return 'Complete your description, qualifications and skills.';
  if (data.priceFrom !== undefined && (!Number.isFinite(data.priceFrom) || data.priceFrom < 0 || data.priceFrom > 10000000)) return 'Enter a valid starting price.';
  if (data.location.address.trim().length < 3 || data.location.address.length > 300 || !Number.isFinite(data.location.latitude) || Math.abs(data.location.latitude) > 90 || !Number.isFinite(data.location.longitude) || Math.abs(data.location.longitude) > 180) return 'Confirm an address with valid coordinates.';
  if (!count || count > 5) return 'Attach between one and five certificates.';
  return '';
}
