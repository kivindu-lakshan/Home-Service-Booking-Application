import { api } from "./client";
export type ThemeMode = "light" | "dark";
function checked(value: unknown): ThemeMode {
  if (value !== "light" && value !== "dark") throw new Error("Invalid appearance response.");
  return value;
}
export async function getAppearance(signal?: AbortSignal): Promise<ThemeMode> {
  return checked((await api.get("/auth/me/appearance", { signal, timeout: 15000 })).data.data.theme);
}
export async function saveAppearance(theme: ThemeMode, signal?: AbortSignal): Promise<ThemeMode> {
  return checked((await api.patch("/auth/me/appearance", { theme: checked(theme) }, { signal, timeout: 15000 })).data.data.theme);
}
