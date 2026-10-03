import { isAxiosError } from "axios";
import { api } from "./client";
export type NotificationPreferences = { bookingConfirmations: boolean; arrivalStatusUpdates: boolean; bookingReminders: boolean };
export const preferenceFields: { key: keyof NotificationPreferences; title: string; hint: string }[] = [
  { key: "bookingConfirmations", title: "Booking confirmations", hint: "Know when your booking is confirmed." },
  { key: "arrivalStatusUpdates", title: "Arrival & status updates", hint: "Follow your provider's progress." },
  { key: "bookingReminders", title: "Booking reminders", hint: "A heads-up before your appointment." },
];
type Envelope = { success: boolean; data: NotificationPreferences; message: string };
const path = "/auth/me/notification-preferences";
export function isNotificationPreferences(value: unknown): value is NotificationPreferences {
  return !!value && typeof value === "object" && preferenceFields.every(({ key }) => typeof (value as Record<string, unknown>)[key] === "boolean");
}
function checked(value: unknown): NotificationPreferences {
  if (!isNotificationPreferences(value)) throw new Error("Invalid notification preferences.");
  return { bookingConfirmations: value.bookingConfirmations, arrivalStatusUpdates: value.arrivalStatusUpdates, bookingReminders: value.bookingReminders };
}
export async function getNotificationPreferences(signal?: AbortSignal) {
  return checked((await api.get<Envelope>(path, { signal, timeout: 15000 })).data.data);
}
export async function saveNotificationPreferences(values: NotificationPreferences, signal?: AbortSignal) {
  return checked((await api.patch<Envelope>(path, checked(values), { signal, timeout: 15000 })).data.data);
}
export function notificationError(error: unknown) {
  const expired = isAxiosError(error) && error.response?.status === 401;
  return { expired, message: expired ? "Your session has expired. Please sign in again." : "Unable to load or save your preferences. Check your connection and try again." };
}
