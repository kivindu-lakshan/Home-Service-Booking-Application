import { isAxiosError } from "axios";
import { api } from "./client";
import { cleanServiceLocation, type ServiceLocation } from "@/validation/service-location";
const path = "/auth/me/service-location";
export async function getServiceLocation(signal?: AbortSignal): Promise<ServiceLocation | null> {
  return (await api.get(path, { signal, timeout: 15000 })).data.data;
}
export async function saveServiceLocation(location: ServiceLocation, signal?: AbortSignal): Promise<ServiceLocation> {
  return (await api.patch(path, cleanServiceLocation(location), { signal, timeout: 15000 })).data.data;
}
export function serviceLocationError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return "Your session has expired. Please sign in again.";
    const data = error.response?.data;
    if (error.response?.status === 400 && Array.isArray(data?.data)) return data.data.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ");
  }
  return "Unable to load or save your service location. Check your connection and try again.";
}
