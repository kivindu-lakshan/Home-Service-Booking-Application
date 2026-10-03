import { api } from "./client";

export const getMyBookings = () => api.get("/payments/bookings");
export const getBooking = (bookingId: string) =>
  api.get(`/bookings/${bookingId}`);
export const getPayment = (bookingId: string) =>
  api.get(`/payments/booking/${bookingId}`);
export const getPaymentMethods = () => api.get("/payments/methods");
export const createPayment = (
  bookingId: string,
  payload: { method: string; paymentMethodId?: string },
) => api.post(`/payments/booking/${bookingId}`, payload);
export const getProviderReviews = (providerId: string, serviceId?: string, signal?: AbortSignal, page = 1) =>
  api.get(`/reviews/provider/${encodeURIComponent(providerId)}`, { params: { serviceId, page }, signal, timeout: 15000 });
export const getBookingReview = (bookingId: string) =>
  api.get(`/reviews/booking/${bookingId}`);
export const createReview = (payload: {
  bookingId: string;
  rating: number;
  comment?: string;
}) => api.post("/reviews", payload);
export const getAdminDashboard = () => api.get("/admin/dashboard");
export const getAdminBookings = (params: {
  status?: string;
  search?: string;
}) => api.get("/admin/bookings", { params });
export const getAvailableProviders = (bookingId: string) =>
  api.get(`/admin/bookings/${bookingId}/available-providers`);
export const assignProvider = (bookingId: string, providerId: string) =>
  api.post(`/admin/bookings/${bookingId}/assign`, { providerId });
export const getAdminJobs = (params: { status?: string; search?: string }) =>
  api.get("/admin/jobs", { params });
export const updateAdminJobStatus = (
  bookingId: string,
  status: string,
  etaMinutes?: number,
) => api.patch(`/admin/jobs/${bookingId}/status`, { status, etaMinutes });
