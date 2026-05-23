import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Tabs, useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  MessageCircle,
  User,
  Crown,
  Settings2,
  AlertTriangle,
  X,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

function SubscriptionWarningBanner({
  daysLeft,
  onDismiss,
}: {
  daysLeft: number;
  onDismiss: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderBottomWidth: 1,
        borderBottomColor: "#F5A623",
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        <AlertTriangle size={16} color="#D97706" />
        <Text style={{ color: "#92400E", fontSize: 13, fontWeight: "600", flex: 1 }}>
          Your trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Choose a plan to continue.
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
        <X size={16} color="#92400E" />
      </TouchableOpacity>
    </View>
  );
}

export default function TechnicianLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Check if user is already on the subscription screen to avoid infinite redirect
  const isOnSubscriptionScreen = segments.includes("subscription" as never);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function checkSubscription() {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, trial_ends_at, plan")
        .eq("technician_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      // Hard redirect if subscription is expired
      if (data?.status === "expired" && !isOnSubscriptionScreen) {
        router.replace("/(technician)/subscription");
        return;
      }

      // Show dismissible warning banner if trial has < 7 days left
      if (data?.status === "trial" && data?.trial_ends_at) {
        const diff = new Date(data.trial_ends_at).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        if (days < 7) {
          setTrialDaysLeft(days);
          setShowBanner(true);
        }
      }
    }

    checkSubscription();
    return () => {
      cancelled = true;
    };
  }, [user, isOnSubscriptionScreen]);

  return (
    <>
      {showBanner && trialDaysLeft !== null && (
        <SubscriptionWarningBanner
          daysLeft={trialDaysLeft}
          onDismiss={() => setShowBanner(false)}
        />
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#F5A623",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
            elevation: 12,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("dashboard"),
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: t("requests"),
            tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: t("earnings"),
            tabBarIcon: ({ color, size }) => <DollarSign size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: t("chat"),
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("profile"),
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="subscription"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="chat/[id]" options={{ href: null }} />
        <Tabs.Screen name="payment-methods" options={{ href: null }} />
        <Tabs.Screen name="verification" options={{ href: null }} />
        <Tabs.Screen name="my-services" options={{ href: null }} />
        <Tabs.Screen name="service-area" options={{ href: null }} />
      </Tabs>
    </>
  );
}