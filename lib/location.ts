import * as Location from "expo-location";
import { supabase } from "./supabase";

/**
 * Starts foreground location tracking for a technician.
 * Updates the technician_profiles table every 30 seconds or 50 metres.
 * Returns the subscription so the caller can remove it when going offline.
 */
export async function startLocationTracking(
  technicianId: string
): Promise<Location.LocationSubscription | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 50,
    },
    async (loc) => {
      await supabase
        .from("technician_profiles")
        .update({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        })
        .eq("id", technicianId);
    }
  );

  return subscription;
}

/**
 * Stops an active location subscription.
 */
export function stopLocationTracking(
  subscription: Location.LocationSubscription | null
): void {
  if (subscription) {
    subscription.remove();
  }
}