import {
    cleanSupport,
    type SupportDraft,
    type SupportErrors,
} from "@/validation/support";
import { isAxiosError } from "axios";
import { api } from "./client";
export type SupportTicket = SupportDraft & {
  _id: string;
  status: "pending" | "in_progress" | "resolved" | "cancelled";
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
};
export const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};
type Envelope<T> = { success: boolean; data: T; message: string };
const path = (id: string) => `/support/tickets/${encodeURIComponent(id)}`;
export const getTickets = async (signal?: AbortSignal) =>
  (
    await api.get<Envelope<SupportTicket[]>>("/support/tickets", {
      signal,
      timeout: 15000,
    })
  ).data.data;
export const getTicket = async (id: string, signal?: AbortSignal) =>
  (await api.get<Envelope<SupportTicket>>(path(id), { signal, timeout: 15000 }))
    .data.data;
export const saveTicket = async (
  draft: SupportDraft,
  id?: string,
  signal?: AbortSignal,
) => {
  const response = id
    ? await api.patch<Envelope<SupportTicket>>(path(id), cleanSupport(draft), {
        signal,
        timeout: 15000,
      })
    : await api.post<Envelope<SupportTicket>>(
        "/support/tickets",
        cleanSupport(draft),
        { signal, timeout: 15000 },
      );
  return response.data.data;
};
export const cancelTicket = async (id: string, signal?: AbortSignal) =>
  (
    await api.post<Envelope<SupportTicket>>(
      `${path(id)}/cancel`,
      {},
      { signal, timeout: 15000 },
    )
  ).data.data;
export function supportError(error: unknown) {
  const fields: SupportErrors = {};
  let message =
    "Unable to complete this request. Check your connection and reload your requests before retrying.";
  const expired = isAxiosError(error) && error.response?.status === 401;
  if (expired) message = "Your session has expired. Please sign in again.";
  else if (
    isAxiosError(error) &&
    [400, 403, 404, 409].includes(error.response?.status || 0)
  ) {
    const data = error.response?.data;
    if (typeof data?.message === "string") message = data.message;
    if (Array.isArray(data?.data))
      for (const item of data.data) {
        if (
          ["category", "subject", "description"].includes(item.path) &&
          typeof item.msg === "string"
        )
          fields[item.path as keyof SupportDraft] = item.msg;
      }
  }
  return { message, fields, expired };
}
