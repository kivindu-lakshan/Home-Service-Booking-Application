import { isAxiosError } from "axios";
import type { AuthErrors } from "@/validation/auth";
export function authError(error: unknown, fallback: string): { message: string; fields: AuthErrors } {
  const fields: AuthErrors = {};
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (Array.isArray(data?.data)) for (const item of data.data) {
      if (["fullName", "email", "phone", "password", "confirm"].includes(item.path) && typeof item.msg === "string") fields[item.path as keyof AuthErrors] = item.msg;
    }
    return { fields, message: typeof data?.message === "string" ? data.message : "Unable to reach the service. Check your connection and try again." };
  }
  return { fields, message: fallback };
}
