import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Bell, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";

type NotificationItem = {
  id: string;
  bookingId: string;
  title: string;
  subtitle: string;
  type: "new_request" | "completed" | "cancelled" | "accepted";
  createdAt: string | null;
};

async function fetchTechnicianNotifications(techId: string): Promise<NotificationItem[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      service,
      created_at,
      profiles!bookings_customer_id_fkey (
        full_name
      )
    `)
    .eq("technician_id", techId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as any[]).map((b) => {
    const customerName = b.profiles?.full_name ?? "Customer";
    let title = "";
    let type: NotificationItem["type"] = "new_request";

    switch (b.status) {
      case "pending":
        title = `New booking request from ${customerName}`;
        type = "new_request";
        break;
      case "accepted":
        title = `Booking confirmed with ${customerName}`;
        type = "accepted";
        break;
      case "completed":
        title = `Job completed for ${customerName}`;
        type = "completed";
        break;
      case "cancelled":
        title = `Booking cancelled by ${customerName}`;
        type = "cancelled";
        break;
      default:
        title = `Booking update from ${customerName}`;
    }

    return {
      id: b.id + "_" + b.status,
      bookingId: b.id,
      title,
      subtitle: b.service,
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

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  const size = 22;
  switch (type) {
    case "new_request":
      return <Bell size={size} color="#1A3A6B" />;
    case "accepted":
      return <CheckCircle size={size} color="#059669" />;
    case "completed":
      return <CheckCircle size={size} color="#F5A623" />;
    case "cancelled":
      return <XCircle size={size} color="#DC2626" />;
    default:
      return <AlertCircle size={size} color="#6B7280" />;
  }
}

function notificationBg(type: NotificationItem["type"]): string {
  switch (type) {
    case "new_request": return "#EBF0FA";
    case "accepted": return "#DCFCE7";
    case "completed": return "#FEF3C7";
    case "cancelled": return "#FEE2E2";
    default: return "#F3F4F6";
  }
}

export default function TechnicianNotificationsScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["tech_notifications", user?.id],
    queryFn: () => fetchTechnicianNotifications(user!.id),
    enabled: !!user?.id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ backgroundColor: "#1A3A6B", paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#FFFFFF", textAlign: isRTL ? "right" : "left" }}>
            {t("notifications")}
          </Text>
          {notifications.length > 0 && (
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 }}>
              {notifications.length} updates in the last 30 days
            </Text>
          )}
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#1A3A6B" size="large" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
            <Bell size={56} color="#E5E7EB" />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#9CA3AF", marginTop: 16 }}>
              {t("noNotifications")}
            </Text>
            <Text style={{ fontSize: 14, color: "#D1D5DB", marginTop: 8, textAlign: "center" }}>
              Booking activity will appear here
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 }}>
            {notifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                activeOpacity={0.8}
                onPress={() => router.push("/(technician)/requests")}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 12,
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: notificationBg(notif.type), alignItems: "center", justifyContent: "center" }}>
                  <NotificationIcon type={notif.type} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}
                    numberOfLines={2}
                  >
                    {notif.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                    {notif.subtitle}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }}>
                  {formatTime(notif.createdAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}