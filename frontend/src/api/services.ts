import { isAxiosError } from "axios";
import type { DocumentPickerAsset } from "expo-document-picker";
import { Platform } from "react-native";
import { api } from "./client";
export type ServiceCategory = {
  _id: string;
  name: string;
  isActive: boolean;
  icon?: string;
};
export type Service = {
  _id: string;
  name: string;
  category: ServiceCategory | null;
  description?: string;
  basePrice?: number;
  imageUrl?: string;
  estDurationHours?: string;
  serviceType?: "on_site" | "workshop";
  inclusions?: string[];
  isActive: boolean;
  assignedProviders?: {
    _id: string;
    user?: { fullName?: string };
    city?: string;
    ratingAvg?: number;
    reviewCount?: number;
  }[];
};
export type ServiceInput = {
  name: string;
  category: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  estDurationHours: string;
  serviceType?: "on_site" | "workshop";
  inclusions: string[];
  isActive: boolean;
};
export async function getServices(
  admin = false,
  signal?: AbortSignal,
): Promise<Service[]> {
  return (await api.get(admin ? "/admin/services" : "/services", { signal }))
    .data.data;
}
export async function getService(
  id: string,
  signal?: AbortSignal,
): Promise<Service> {
  return (
    await api.get(`/admin/services/${encodeURIComponent(id)}`, { signal })
  ).data.data;
}
export async function getServiceCategories(
  signal?: AbortSignal,
): Promise<ServiceCategory[]> {
  return (await api.get("/services/categories", { signal })).data.data;
}
export async function uploadServiceImage(
  image: DocumentPickerAsset,
): Promise<string> {
  const form = new FormData();
  if (Platform.OS === "web") {
    if (!image.file) throw new Error("Select your image again.");
    form.append("image", image.file, image.name);
  } else
    form.append("image", {
      uri: image.uri,
      name: image.name,
      type: image.mimeType,
    } as unknown as Blob);
  return (
    await api.post("/admin/services/images", form, {
      timeout: 60000,
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data.data.imageUrl;
}
export const createService = (payload: ServiceInput) =>
  api.post("/admin/services", payload);
export const updateService = (id: string, payload: ServiceInput) =>
  api.patch(`/admin/services/${encodeURIComponent(id)}`, payload);
export const deleteService = (id: string) =>
  api.delete(`/admin/services/${encodeURIComponent(id)}`);
export const getServiceProviders = (id: string) =>
  api.get(`/admin/services/${encodeURIComponent(id)}/providers`);
export const assignServiceProviders = (id: string, providerIds: string[]) =>
  api.put(`/admin/services/${encodeURIComponent(id)}/providers`, {
    providerIds,
  });
export function serviceError(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (error.response?.status === 401)
    return "Your session has expired. Please sign in again.";
  if (error.response?.status === 403)
    return "You do not have permission to manage services.";
  return error.response?.data?.message || fallback;
}
