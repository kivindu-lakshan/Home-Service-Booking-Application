import { api } from "./client";

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { fullName: string; email: string; phone: string; password: string; role: "customer" | "provider" };

export const login = ({ email, password }: LoginPayload) => api.post("/auth/login", { email, password });
export const register = (payload: RegisterPayload) => api.post("/auth/register", payload);
export const me = () => api.get("/auth/me");
export const forgotPassword = (email: string) => api.post("/auth/forgot-password", { email });
