import { api } from "./client";

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { fullName: string; email: string; phone: string; password: string };

export const login = (payload: LoginPayload) => api.post("/auth/login", payload);
export const register = (payload: RegisterPayload) => api.post("/auth/register", payload);
export const me = () => api.get("/auth/me");
export const forgotPassword = (email: string) => api.post("/auth/forgot-password", { email });