import { isAxiosError } from "axios";
import { api } from "./client";
import { cleanAddress, type AddressDraft, type AddressErrors } from "@/validation/address";

export type SavedAddress = AddressDraft & { _id: string; createdAt: string | null; updatedAt: string | null };
type Response<T> = { success: boolean; data: T; message: string };
const options = (signal?: AbortSignal) => ({ signal, timeout: 15000 });
export async function getAddresses(signal?: AbortSignal) {
  return (await api.get<Response<SavedAddress[]>>("/addresses", options(signal))).data.data;
}
export async function getAddress(id: string, signal?: AbortSignal) {
  return (await api.get<Response<SavedAddress>>(`/addresses/${encodeURIComponent(id)}`, options(signal))).data.data;
}
export async function createAddress(draft: AddressDraft, signal?: AbortSignal) {
  return (await api.post<Response<SavedAddress>>("/addresses", cleanAddress(draft), options(signal))).data.data;
}
export async function updateAddress(id: string, draft: AddressDraft, signal?: AbortSignal) {
  return (await api.patch<Response<SavedAddress>>(`/addresses/${encodeURIComponent(id)}`, cleanAddress(draft), options(signal))).data.data;
}
export async function deleteAddress(id: string, signal?: AbortSignal) {
  await api.delete(`/addresses/${encodeURIComponent(id)}`, options(signal));
}

export function addressError(error: unknown, fallback: string) {
  const fields: AddressErrors = {};
  let message = fallback;
  let sessionExpired = false;
  if (isAxiosError<{ message?: string; data?: { path?: string; msg?: string }[] }>(error)) {
    sessionExpired = error.response?.status === 401;
    if (sessionExpired) message = "Your session has expired. Please sign in again.";
    else if ([400, 404, 409].includes(error.response?.status || 0)) {
      message = error.response?.data?.message || fallback;
      const details = error.response?.data?.data;
      if (Array.isArray(details)) for (const detail of details) {
        if (typeof detail.msg === "string" &&
            (detail.path === "label" || detail.path === "line1" || detail.path === "areaCity" || detail.path === "landmark")) {
          fields[detail.path] = detail.msg;
        }
      }
    }
  }
  return { fields, message, sessionExpired };
}
