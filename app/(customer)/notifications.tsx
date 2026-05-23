import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Bell, CheckCircle, XCircle, Star, Clock } from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NotificationItem = {
  id: string;
  bookingId: string;
  title: string;
  subtitle: string;
  type: "accepted" | "completed" | "cancelled" | "pending";
  createdAt: string | null;
};

async function fetchCustomerNotifications(customerId: string): Promise<NotificationItem[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      service,
      created_at,
      profiles!bookings_technician_id_fkey (
        full_name
      )
    `)
    .eq("customer_id", customerId)
    .in("status", ["accepted", "completed", "cancelled"])
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as any[]).map((b) => {
    const techName = b.profiles?.full_name ?? "Technician";
    let title = "";
    let type: NotificationItem["type"] = "accepted";

    switch (b.status) {
      case "accepted":
        title = `Your booking was accepted by ${techName}`;
        type = "accepted";
        break;
      case "completed":
        title = "Job completed! Rate your experience";
        type = "completed";
        break;
      case "cancelled":
        title = "Your booking was cancelled";
        type = "cancelled";
        break;
      default:
        title = "Booking update";
    }

    return {
      id: b.id + "_" + b.status,
      bookingId: b.id,
      title,
      subtitle: `${b.service} · ${techName}`,
      type,
      createdAt: b.created_at,
    };
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

const NOTIF_CONFIG = {
  accepted: {
    bg: "#EBF5FF",
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    borderColor: "#BFDBFE",
    Icon: CheckCircle,
  },
  completed: {
    bg: "#FFFBEB",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    borderColor: "#FDE68A",
    Icon: Star,
  },
  cancelled: {
    bg: "#FFF5F5",
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    borderColor: "#FECACA",
    Icon: XCircle,
  },
  pending: {
    bg: "#F9FAFB",
    iconBg: "#F3F4F6",
    iconColor: "#6B7280",
    borderColor: "#E5E7EB",
    Icon: Clock,
  },
};

export default function CustomerNotificationsScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["customer_notifications", user?.id],
    queryFn: () => fetchCustomerNotifications(user!.id),
    enabled: !!user?.id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleNotificationPress = (notif: NotificationItem) => {
    if (notif.type === "completed") {
      router.push(`/(customer)/review/${notif.bookingId}`);
    } else {
      router.push("/(customer)/bookings");
    }
  };

  const todayNotifs = notifications.filter((n) => isToday(n.createdAt));
  const earlierNotifs = notifications.filter((n) => !isToday(n.createdAt));

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Blue Header */}
      <View style={{
        backgroundColor: "#1A3A6B",
        paddingTop: insets.top + 16,
        paddingBottom: 24,
        paddingHorizontal: 20,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(245,166,35,0.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Bell size={20} color="#F5A623" />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>
              {t("notifications")}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              {notifications.length > 0
                ? `${notifications.length} updates in the last 30 days`
                : "Stay up to date with your bookings"}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color="#1A3A6B" size="large" />
          <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
          <View style={{
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: "#EBF0FA",
            alignItems: "center", justifyContent: "center",
            borderWidth: 3, borderColor: "#C7D8F5",
          }}>
            <Bell size={40} color="#1A3A6B" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E", textAlign: "center" }}>
            No notifications yet
          </Text>
          <Text style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", maxWidth: 260 }}>
            Booking updates will appear here when they are accepted or completed
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 }}>
          {todayNotifs.length > 0 && (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F5A623" }} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Today
                </Text>
              </View>
              {todayNotifs.map((notif) => {
                const cfg = NOTIF_CONFIG[notif.type];
                const Icon = cfg.Icon;
                return (
                  <TouchableOpacity
                    key={notif.id}
                    activeOpacity={0.8}
                    onPress={() => handleNotificationPress(notif)}
                    style={{
                      backgroundColor: cfg.bg,
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 10,
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: 1,
                      borderColor: cfg.borderColor,
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <View style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: cfg.iconBg,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={22} color={cfg.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: "600", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}
                        numberOfLines={2}
                      >
                        {notif.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 3, textAlign: isRTL ? "right" : "left" }}>
                        {notif.subtitle}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#1A3A6B" }} />
                      <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {formatTime(notif.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {earlierNotifs.length > 0 && (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginTop: todayNotifs.length > 0 ? 8 : 0 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D1D5DB" }} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Earlier
                </Text>
              </View>
              {earlierNotifs.map((notif) => {
                const cfg = NOTIF_CONFIG[notif.type];
                const Icon = cfg.Icon;
                return (
                  <TouchableOpacity
                    key={notif.id}
                    activeOpacity={0.8}
                    onPress={() => handleNotificationPress(notif)}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 10,
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: 1,
                      borderColor: "#F0F2F5",
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <View style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: cfg.iconBg,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={22} color={cfg.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: "600", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}
                        numberOfLines={2}
                      >
                        {notif.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, textAlign: isRTL ? "right" : "left" }}>
                        {notif.subtitle}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {formatTime(notif.createdAt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}