import { api } from "./client";

export interface BookingCustomer {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface BookingProvider {
  _id: string;
  city?: string;
  ratingAvg?: number;
  user?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
}

export interface BookingService {
  _id: string;
  name: string;
  description?: string;
  basePrice?: number;
  estDurationHours?: string;
  imageUrl?: string;
  category?: {
    _id: string;
    name: string;
  };
}

export interface BookingStatusHistory {
  status: string;
  changedBy?: {
    _id: string;
    fullName: string;
    role?: string;
  };
  note?: string;
  at: string;
}

export interface Booking {
  _id: string;
  bookingRef: string;
  customer: BookingCustomer;
  provider?: BookingProvider;
  service: BookingService;
  addressSnapshot: string;
  scheduledDate: string;
  timePeriod: "morning" | "afternoon" | "evening";
  scheduledTime: string;
  durationHours: string;
  serviceFee: number;
  bookingCharge: number;
  tax: number;
  totalPrice: number;
  paymentMode: "pay_now" | "pay_on_completion";
  status:
    | "pending"
    | "confirmed"
    | "assigned"
    | "en_route"
    | "arrived"
    | "in_progress"
    | "completed"
    | "cancelled";
  etaMinutes?: number;
  notes?: string;
  cancelledReason?: string;
  statusHistory?: BookingStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  serviceId: string;
  scheduledDate: string;
  timePeriod: "morning" | "afternoon" | "evening";
  scheduledTime?: string;
  addressSnapshot: string;
  notes?: string;
  paymentMode?: "pay_now" | "pay_on_completion";
}

export interface RescheduleBookingPayload {
  scheduledDate: string;
  timePeriod?: "morning" | "afternoon" | "evening";
  scheduledTime?: string;
  notes?: string;
}

export const createBooking = (payload: CreateBookingPayload) =>
  api.post<{ success: boolean; data: Booking; message: string }>("/bookings", payload);

export const getBookings = (params?: {
  status?: string;
  filter?: "all" | "upcoming" | "active" | "completed" | "cancelled";
  search?: string;
}) =>
  api.get<{ success: boolean; data: Booking[]; message: string }>("/bookings", {
    params,
  });

export const getBookingById = (id: string) =>
  api.get<{
    success: boolean;
    data: { booking: Booking; payment: any };
    message: string;
  }>(`/bookings/${id}`);

export const rescheduleBooking = (
  id: string,
  payload: RescheduleBookingPayload,
) =>
  api.patch<{ success: boolean; data: Booking; message: string }>(
    `/bookings/${id}/reschedule`,
    payload,
  );

export const cancelBooking = (id: string, reason: string) =>
  api.patch<{ success: boolean; data: Booking; message: string }>(
    `/bookings/${id}/cancel`,
    { reason },
  );

export const updateBookingStatus = (
  id: string,
  payload: { status: string; etaMinutes?: number; note?: string },
) =>
  api.patch<{ success: boolean; data: Booking; message: string }>(
    `/bookings/${id}/status`,
    payload,
  );

export const getAvailableSlots = (date?: string) =>
  api.get<{
    success: boolean;
    data: {
      date: string;
      slots: {
        id: string;
        period: "morning" | "afternoon" | "evening";
        label: string;
        timeRange: string;
        defaultTime: string;
        available: boolean;
      }[];
    };
  }>("/bookings/slots", { params: { date } });
