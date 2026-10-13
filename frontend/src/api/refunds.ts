import { api } from "./client";

export interface RefundRequest {
  _id: string;
  booking: {
    _id: string;
    bookingRef: string;
    service?: { _id: string; name: string };
    status: string;
    cancelledReason?: string;
    updatedAt: string;
  };
  customer?: { _id: string; fullName: string; email: string };
  serviceAmount: number;
  protectionFee: number;
  totalPaid: number;
  refundAmount: number;
  cancelledAt?: string;
  cancellationBeforeArrival: boolean;
  paymentMethod?: string;
  status: "pending" | "approved" | "rejected" | "processing" | "processed" | "failed";
  reviewedAt?: string;
  reviewedBy?: { _id: string; fullName: string };
  rejectionReason?: string;
  providerRefundRef?: string;
  providerRefundStatus?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundEligibilityInfo {
  bookingId: string;
  hasRequest: boolean;
  request?: RefundRequest | null;
  eligible: boolean;
  reason?: string | null;
  payment?: {
    amount: number;
    refundProtection?: boolean;
    refundProtectionFee?: number;
    totalAmount?: number;
    method?: string;
    status?: string;
  } | null;
}

// Customer
export const getRefundsEligibilitySummary = () =>
  api.get<{ success: boolean; data: Record<string, RefundEligibilityInfo>; message: string }>(
    "/refunds/eligibility-summary"
  );

export const checkBookingRefundEligibility = (bookingId: string) =>
  api.get<{ success: boolean; data: RefundEligibilityInfo; message: string }>(
    `/refunds/check/${encodeURIComponent(bookingId)}`
  );

export const getEligibleRefundBookings = () =>
  api.get<{ success: boolean; data: any[]; message: string }>(
    "/refunds/eligible-bookings"
  );

export const submitRefundRequest = (bookingId: string) =>
  api.post<{ success: boolean; data: RefundRequest; message: string }>(
    "/refunds/request",
    { bookingId }
  );

export const getMyRefundRequests = () =>
  api.get<{ success: boolean; data: RefundRequest[]; message: string }>(
    "/refunds/my-requests"
  );

export const getMyRefundRequest = (id: string) =>
  api.get<{ success: boolean; data: RefundRequest; message: string }>(
    `/refunds/my-requests/${encodeURIComponent(id)}`
  );

// Admin
export const getAdminRefundSummary = () =>
  api.get<{
    success: boolean;
    data: { pending: number; approved: number; rejected: number; total: number };
    message: string;
  }>("/refunds/admin/summary");

export const getAdminRefundRequests = (params?: { status?: string; search?: string }) =>
  api.get<{ success: boolean; data: RefundRequest[]; message: string }>(
    "/refunds/admin",
    { params }
  );

export const getAdminRefundRequest = (id: string) =>
  api.get<{ success: boolean; data: RefundRequest; message: string }>(
    `/refunds/admin/${encodeURIComponent(id)}`
  );

export const approveRefundRequest = (id: string) =>
  api.patch<{ success: boolean; data: RefundRequest; message: string }>(
    `/refunds/admin/${encodeURIComponent(id)}/approve`
  );

export const rejectRefundRequest = (id: string, reason: string) =>
  api.patch<{ success: boolean; data: RefundRequest; message: string }>(
    `/refunds/admin/${encodeURIComponent(id)}/reject`,
    { reason }
  );
