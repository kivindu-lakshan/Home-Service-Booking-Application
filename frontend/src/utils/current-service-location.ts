import { Platform } from "react-native";
import * as Location from "expo-location";
import type { ServiceLocation } from "@/validation/service-location";
const denied = "Location permission was not granted. You can enter your area manually.";
function deadline<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Location lookup timed out. You can enter your area manually.")), milliseconds);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
export async function currentServiceLocation(): Promise<{ location: ServiceLocation; note: string }> {
  let coordinates: { latitude: number; longitude: number };
  try {
    if (Platform.OS === "web") {
      // getCurrentPosition prompts directly, including browsers without Permissions API.
      if (!globalThis.navigator?.geolocation) throw new Error("unavailable");
      const position = await deadline(new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 });
      }), 25000);
      coordinates = position.coords;
    } else {
      const permission = await deadline(Location.requestForegroundPermissionsAsync(), 30000);
      if (!permission.granted) throw new Error(denied);
      coordinates = (await deadline(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 20000)).coords;
    }
  } catch (error) {
    if ((error as { code?: number })?.code === 1 || error instanceof Error && error.message === denied) throw new Error(denied);
    throw new Error("We couldn't find your current location. Check your location settings or enter your area manually.");
  }
  const { latitude, longitude } = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("Location lookup returned invalid coordinates. Enter your area manually.");
  let areaCity = "";
  if (Platform.OS !== "web") {
    try {
      const [address] = await deadline(Location.reverseGeocodeAsync({ latitude, longitude }), 5000);
      if (address) areaCity = [...new Set([address.city || address.subregion || address.region, address.country].filter(Boolean))].join(", ");
    } catch { /* Coordinates remain usable; manual naming is always available. */ }
  }
  return {
    location: { areaCity, latitude, longitude, source: "current" },
    note: areaCity ? "Location found. Confirm it below." : "Current location detected. Please enter your area or city to continue.",
  };
}
