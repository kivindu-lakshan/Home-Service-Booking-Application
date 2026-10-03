import { api } from "./client";

export const getMyBookings = () => api.get("/payments/bookings");
export const createBooking = (payload: {
  serviceId: string;
  providerId: string;
  scheduledDate: string;
  timePeriod: "morning" | "afternoon" | "evening";
  scheduledTime: string;
}) => api.post("/bookings", payload);
export const getBooking = (bookingId: string) =>
  api.get(`/bookings/${bookingId}`);
export const getPayment = (bookingId: string) =>
  api.get(`/payments/booking/${bookingId}`);
export const getPaymentMethods = () => api.get("/payments/methods");
export const createPayment = (
  bookingId: string,
  payload: {
    method: "card" | "demo_card" | "cash_on_arrival" | "cash_on_completion";
    paymentMethodId?: string;
    card?: {
      cardholderName: string;
      cardNumber: string;
      expiryDate: string;
      cvv: string;
    };
  },
) => api.post(`/payments/booking/${bookingId}`, payload);
export const getProviderReviews = (providerId: string) =>
  api.get(`/reviews/provider/${providerId}`);
export const getBookingReview = (bookingId: string) =>
  api.get(`/reviews/booking/${bookingId}`);
export const createReview = (payload: {
  bookingId: string;
  rating: number;
  comment?: string;
}) => api.post("/reviews", payload);
export const getMyReviews = () => api.get("/reviews/mine");
export const updateReview = (
  reviewId: string,
  payload: { rating: number; comment?: string },
) => api.patch(`/reviews/${reviewId}`, payload);
export const deleteReview = (reviewId: string) =>
  api.delete(`/reviews/${reviewId}`);
export const getMyTickets = () => api.get("/tickets/mine");
export const createTicket = (payload: { subject: string; message: string }) =>
  api.post("/tickets", payload);
export const getAdminTickets = () => api.get("/tickets/admin");
export const respondToTicket = (
  ticketId: string,
  payload: { adminResponse: string; status: "in_progress" | "resolved" },
) => api.patch(`/tickets/admin/${ticketId}`, payload);
export const deleteTicketResponse = (ticketId: string) =>
  api.delete(`/tickets/admin/${ticketId}/response`);
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
