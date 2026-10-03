export type ServiceLocation = { areaCity: string; source: "manual" | "current"; latitude?: number; longitude?: number };
export function validateServiceLocation(location: ServiceLocation): string {
  const area = location.areaCity.trim();
  if (!area) return "Enter your area or city.";
  if (Array.from(area).length > 120) return "Area or city must be 120 characters or fewer.";
  if (/[\u0000-\u001f\u007f]/u.test(area)) return "Area or city contains invalid characters.";
  if (location.source !== "manual" && location.source !== "current") return "Choose manual or current location.";
  if (location.source === "current" && (typeof location.latitude !== "number" || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || typeof location.longitude !== "number" || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180)) return "Unable to use these coordinates. Enter your area manually.";
  return "";
}
export function cleanServiceLocation(location: ServiceLocation): ServiceLocation {
  return { areaCity: location.areaCity.trim(), source: location.source, ...(location.source === "current" ? { latitude: location.latitude, longitude: location.longitude } : {}) };
}
export function requiresServiceLocation(role: string, location: ServiceLocation | null): boolean {
  return role === "customer" && (!location || !!validateServiceLocation(location));
}
