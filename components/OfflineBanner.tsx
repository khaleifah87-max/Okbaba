import React, { useState, useEffect, useRef } from "react";
import { View, Text, Animated, AppState, AppStateStatus } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";

const HEALTH_CHECK_URL = "https://www.google.com/generate_204";
const CHECK_INTERVAL_MS = 5000;

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(HEALTH_CHECK_URL, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showBanner = (offline: boolean) => {
    setIsOffline(offline);
    Animated.timing(translateY, {
      toValue: offline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const runCheck = async () => {
    const online = await checkConnectivity();
    showBanner(!online);
  };

  useEffect(() => {
    runCheck();

    intervalRef.current = setInterval(runCheck, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          runCheck();
        }
        appState.current = nextState;
      }
    );

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform: [{ translateY }],
        zIndex: 9999,
      }}
    >
      <View
        style={{
          backgroundColor: "#1F2937",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 10,
          paddingHorizontal: 16,
          gap: 8,
        }}
      >
        <WifiOff size={16} color="#F5A623" />
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
          {t("noInternet")}
        </Text>
      </View>
    </Animated.View>
  );
}