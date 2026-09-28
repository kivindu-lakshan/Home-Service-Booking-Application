import { api } from "./client";
export const login = (email, password) =>
  api.post("/auth/login", { email, password });
export const register = (payload) => api.post("/auth/register", payload);
export const me = () => api.get("/auth/me");
export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });
