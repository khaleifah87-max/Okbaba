import "@/global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import "react-native-reanimated";
import { useRouter } from "expo-router";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import GluestackInitializer from "@/components/GluestackInitializer";
import useColorScheme from "@/hooks/useColorScheme";
import { Stack } from "expo-router";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OfflineBanner from "@/components/OfflineBanner";
import * as Notifications from "expo-notifications";

// Initialize CatDoes Watch for error tracking
// Set EXPO_PUBLIC_CATDOES_WATCH_KEY in your environment to enable
import { initCatDoesWatch } from "@/catdoes.watch";
initCatDoesWatch();

// Configure how notifications are presented when the app is in the foreground.
// Must be called before any listener is registered.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

/** Inner component that has access to auth context for push notifications */
function AppNavigator() {
  const { user } = useAuth();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // ── Notification received while app is in the foreground ──
    // We let the handler above show the system banner; no extra action needed here.
    notificationListener.current =
      Notifications.addNotificationReceivedListener((_notification) => {
        // Future: update badge count or show in-app toast here
      });

    // ── User taps a notification ──
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        const type = data?.type as string | undefined;
        if (type === "booking") {
          router.push("/(customer)/bookings");
        } else if (type === "chat") {
          router.push("/(customer)/chat");
        } else if (type === "request") {
          router.push("/(technician)/requests");
        }
      });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove?.();
      }
      if (notificationListener.current) {
        notificationListener.current.remove?.();
      }
    };
  }, []);

  // Register for push notifications whenever the authenticated user changes
  useEffect(() => {
    if (!user?.id) return;
    // Android channel is set up inside registerForPushNotifications
    import("@/lib/notifications")
      .then(({ registerForPushNotifications }) =>
        registerForPushNotifications(user.id)
      )
      .catch(() => {
        // Permission denied or Expo Go — silently skip
      });
  }, [user?.id]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F5F7FA" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(technician)" />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="onboarding" />
      </Stack>
      <StatusBar style="auto" />
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  /*
   * IMPORTANT: DO NOT REMOVE GluestackInitializer OR ErrorBoundary */
  return (
    <ErrorBoundary>
      <GluestackInitializer colorScheme={colorScheme}>
        <I18nProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <AppNavigator />
            </QueryClientProvider>
          </AuthProvider>
        </I18nProvider>
      </GluestackInitializer>
    </ErrorBoundary>
  );
}