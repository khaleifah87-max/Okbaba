/**
 * Push Notifications setup for Ok Baba
 *
 * DATABASE NOTE:
 * The `push_token TEXT` column must be added to `public.profiles` before tokens
 * can be persisted. Run the following migration in Supabase SQL editor:
 *
 *   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
 *
 * The save operation below is wrapped in a try/catch and will silently fail
 * until the column exists.
 */

// NOTE: expo-notifications is imported lazily inside the function below to
// prevent crashes in Expo Go (SDK 53+ removed push notification support from
// Expo Go). Any top-level import or call would crash the app on startup.

import * as Device from "expo-device";
import { supabase } from "./supabase";
import { Platform } from "react-native";

export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  // Only works on real devices (not simulators/emulators)
  if (!Device.isDevice) {
    console.log("[Notifications] Skipping: not a physical device.");
    return null;
  }

  // Lazy import to avoid crashing in Expo Go
  let Notifications: typeof import("expo-notifications");
  try {
    Notifications = await import("expo-notifications");
  } catch {
    console.warn("[Notifications] expo-notifications not available (Expo Go?).");
    return null;
  }

  // Configure how notifications appear when the app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1A3A6B",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted.");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "130cc294-a25d-4d6b-9147-ad17d2975782",
    });
    const token = tokenData.data;

    // Attempt to save the token to Supabase profiles.
    // Silently catches errors in case push_token column doesn't exist yet.
    try {
      await supabase
        .from("profiles")
        .update({ push_token: token } as any)
        .eq("id", userId);
    } catch (dbError) {
      console.warn("[Notifications] Could not save push token to DB:", dbError);
    }

    return token;
  } catch (err) {
    console.warn("[Notifications] Failed to get push token:", err);
    return null;
  }
}