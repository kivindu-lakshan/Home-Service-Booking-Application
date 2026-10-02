import { isAxiosError } from 'axios';
import { api } from './client';
export type Category = { _id: string; name: string; icon?: string };
export type Service = { _id: string; name: string; category: Category; description?: string; imageUrl?: string; basePrice?: number; estDurationHours?: string; serviceType?: string; inclusions?: string[]; ratingAvg?: number; reviewCount?: number };
export type Provider = { _id: string; user: { _id: string; fullName: string; avatarUrl?: string } | null; aboutMe?: string; yearsExperience?: number; isVerified?: boolean; ratingAvg?: number; reviewCount?: number; isAvailable?: boolean; priceFrom?: number; distanceKm?: number; location: { city?: string; latitude?: number; longitude?: number }; services: { service: Service; priceFrom?: number }[]; availability?: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[] };
export type ProviderFilter = 'all' | 'top_rated' | 'nearest' | 'lowest_price';
type Envelope<T> = { data: T; message: string };
const get = async <T>(path: string, signal?: AbortSignal, params?: object) => (await api.get<Envelope<T>>(`/catalogue${path}`, { signal, params, timeout: 15000 })).data.data;
const id = encodeURIComponent;
export const getCategories = (signal?: AbortSignal) => get<Category[]>('/categories', signal);
export const getServices = (params: { categoryId?: string; search?: string }, signal?: AbortSignal) => get<Service[]>('/services', signal, params);
export const getService = (serviceId: string, signal?: AbortSignal) => get<Service>(`/services/${id(serviceId)}`, signal);
export const getProviders = (serviceId: string, params: { search?: string; filter?: ProviderFilter }, signal?: AbortSignal) => get<{ providers: Provider[]; nearestSupported: boolean }>(`/services/${id(serviceId)}/providers`, signal, params);
export const getProvider = (providerId: string, serviceId: string, signal?: AbortSignal) => get<Provider>(`/providers/${id(providerId)}`, signal, { serviceId });
export const requestBooking = async (payload: { serviceId: string; providerId: string; addressId: string; scheduledDate: string; scheduledTime: string; notes?: string }) => (await api.post<Envelope<{ _id: string }>>('/bookings', payload, { timeout: 15000 })).data.data;
export function catalogueError(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (isAxiosError(error) && [400, 403, 404, 409, 422].includes(error.response?.status || 0) && typeof error.response?.data?.message === 'string') return error.response.data.message as string;
  return 'Unable to load this information. Check your connection and try again.';
}
