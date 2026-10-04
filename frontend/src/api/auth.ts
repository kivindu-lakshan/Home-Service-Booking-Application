import { api } from "./client";

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export const login = (
  payload: LoginPayload & { role?: "customer" | "provider" | "admin" },
) => api.post("/auth/login", payload);
export const register = (payload: RegisterPayload) =>
  api.post("/auth/register", payload);
export const verifyEmail = (code: string) =>
  api.post("/auth/verify-email", { code });
export const resendVerification = () => api.post("/auth/resend-verification");
export const me = () => api.get("/auth/me");
export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });
