import { api } from './client';
import type { ProviderApplication } from './provider-applications';
export type ApplicationStatus = ProviderApplication['status'];
export type AdminApplication = ProviderApplication & {
  professionalName: string; phone: string; yearsExperience: number; aboutMe: string; qualifications: string; skills: string; priceFrom?: number;
  provider: { _id: string; user: { fullName: string; email: string; phone?: string } | null } | null;
  service: (NonNullable<ProviderApplication['service']> & { category?: { name: string } | null }) | null;
  reviewedBy?: { fullName: string } | null;
};
export type ApplicationPage = { items: AdminApplication[]; total: number; page: number; pageSize: number; pendingCount: number };
export async function listAdminApplications(status: ApplicationStatus | 'all', page = 1, signal?: AbortSignal): Promise<ApplicationPage> {
  return (await api.get('/admin/provider-applications', { params: { status, page }, signal, timeout: 15000 })).data.data;
}
export async function getAdminApplication(id: string, signal?: AbortSignal): Promise<AdminApplication> {
  return (await api.get(`/admin/provider-applications/${id}`, { signal, timeout: 15000 })).data.data;
}
export async function reviewApplication(id: string, decision: 'approve' | 'reject', rejectionReason?: string): Promise<AdminApplication> {
  return (await api.patch(`/admin/provider-applications/${id}/${decision}`, decision === 'reject' ? { rejectionReason } : {}, { timeout: 20000 })).data.data;
}
