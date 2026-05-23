import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  Users,
  Wrench,
  CalendarCheck,
  AlertTriangle,
  Plus,
  Bell,
  Clock,
  TrendingUp,
  ChevronRight,
  BarChart2,
  Settings,
  Shield,
  DollarSign,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface Stats {
  totalUsers: number;
  activeTechnicians: number;
  todaysBookings: number;
  pendingReports: number;
}

interface AdminLog {
  id: string;
  action: string;
  created_at: string | null;
  target_type: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const QUICK_ACTIONS = [
  { icon: Wrench, label: "Technicians", route: "/(admin)/technicians", color: "#059669", bg: "#ECFDF5" },
  { icon: BarChart2, label: "Reports", route: "/(admin)/reports", color: "#7C3AED", bg: "#F5F3FF" },
  { icon: BarChart2, label: "Stats", route: "/(admin)/stats", color: "#0891B2", bg: "#CFFAFE" },
  { icon: Settings, label: "Settings", route: "/(admin)/settings", color: "#6B7280", bg: "#F3F4F6" },
];

export default function AdminDashboard() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeTechnicians: 0,
    todaysBookings: 0,
    pendingReports: 0,
  });
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [usersRes, techRes, bookingsRes, reportsRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_type", "technician"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("admin_logs")
          .select("id, action, created_at, target_type")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        activeTechnicians: techRes.count ?? 0,
        todaysBookings: bookingsRes.count ?? 0,
        pendingReports: reportsRes.count ?? 0,
      });

      setLogs(logsRes.data ?? []);
    } catch (e) {
      // Silent fail — show zeros
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const statCards = [
    {
      icon: Users,
      label: t("totalUsers"),
      value: stats.totalUsers,
      color: "#1A3A6B",
      bg: "#EEF2FF",
      trend: "+12%",
      trendUp: true,
    },
    {
      icon: Wrench,
      label: t("activeTechnicians"),
      value: stats.activeTechnicians,
      color: "#059669",
      bg: "#ECFDF5",
      trend: "+5%",
      trendUp: true,
    },
    {
      icon: CalendarCheck,
      label: t("todaysBookings"),
      value: stats.todaysBookings,
      color: "#7C3AED",
      bg: "#F5F3FF",
      trend: "+8%",
      trendUp: true,
    },
    {
      icon: AlertTriangle,
      label: t("pendingReports"),
      value: stats.pendingReports,
      color: "#DC2626",
      bg: "#FEF2F2",
      trend: "-3%",
      trendUp: false,
    },
  ];

  const roleLabel =
    profile?.user_type === "admin"
      ? "Admin"
      : profile?.user_type === "support"
        ? "Support"
        : "Finance";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <View style={{ backgroundColor: "#1A3A6B", paddingBottom: 28 }}>
        <View style={{ paddingTop: 52, paddingHorizontal: 20 }}>
          {/* Logo row */}
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
              <Image
                source={require("@/assets/images/1000219939.png")}
                style={{ width: 48, height: 48, borderRadius: 14 }}
                resizeMode="contain"
              />
              <View>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" }}>
                  Control Center
                </Text>
                <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>
                  Ok Baba Admin
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(admin)/send-notification" as any)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <Bell size={20} color="#F5A623" />
            </TouchableOpacity>
          </View>

          {/* Admin Profile Strip */}
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#F5A623",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                {profile?.full_name ?? "Administrator"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                Signed in as {roleLabel}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: "#F5A623",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#1A3A6B" }}>{roleLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3A6B" />
        }
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#1A3A6B" />
            <Text style={{ color: "#6B7280", fontSize: 14, marginTop: 12 }}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            {/* ═══════════════ STATS GRID ═══════════════ */}
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E" }}>
                Overview
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Today</Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
              {statCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      minWidth: "44%",
                      backgroundColor: "#FFFFFF",
                      borderRadius: 20,
                      padding: 18,
                      shadowColor: "#1A3A6B",
                      shadowOpacity: 0.08,
                      shadowRadius: 10,
                      elevation: 3,
                      borderWidth: 1,
                      borderColor: "rgba(26,58,107,0.06)",
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: card.bg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                        alignSelf: isRTL ? "flex-end" : "flex-start",
                      }}
                    >
                      <Icon size={22} color={card.color} />
                    </View>
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: "800",
                        color: "#1A1A2E",
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {card.value}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 4,
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {card.label}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 8,
                        alignSelf: isRTL ? "flex-end" : "flex-start",
                      }}
                    >
                      <TrendingUp
                        size={11}
                        color={card.trendUp ? "#10B981" : "#DC2626"}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: card.trendUp ? "#10B981" : "#DC2626",
                        }}
                      >
                        {card.trend}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ═══════════════ QUICK ACTIONS ═══════════════ */}
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 14 }}>
              Quick Actions
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => Alert.alert("Coming Soon", "This feature will be added soon.")}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  backgroundColor: "#1A3A6B",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: "#1A3A6B",
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Plus size={18} color="#F5A623" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>Add Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(admin)/send-notification" as any)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  backgroundColor: "#F5A623",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: "#F5A623",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Bell size={18} color="#1A3A6B" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B" }}>
                  {t("sendNotification")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nav Shortcuts */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => router.push(action.route as any)}
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      minWidth: "44%",
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 14,
                      alignItems: "center",
                      flexDirection: isRTL ? "row-reverse" : "row",
                      gap: 10,
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 2,
                      borderWidth: 1,
                      borderColor: "rgba(26,58,107,0.06)",
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: action.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={18} color={action.color} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", flex: 1 }}>
                      {action.label}
                    </Text>
                    <ChevronRight size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ═══════════════ RECENT ACTIVITY ═══════════════ */}
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E" }}>
                {t("recentActivity")}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(admin)/reports" as any)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, color: "#1A3A6B", fontWeight: "600" }}>View All</Text>
                <ChevronRight size={14} color="#1A3A6B" />
              </TouchableOpacity>
            </View>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                overflow: "hidden",
                shadowColor: "#1A3A6B",
                shadowOpacity: 0.07,
                shadowRadius: 10,
                elevation: 3,
                borderWidth: 1,
                borderColor: "rgba(26,58,107,0.06)",
              }}
            >
              {logs.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center" }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#EBF0FA",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Clock size={24} color="#1A3A6B" />
                  </View>
                  <Text style={{ color: "#374151", fontWeight: "700", fontSize: 15, marginBottom: 4 }}>
                    No Recent Activity
                  </Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
                    Admin actions will appear here
                  </Text>
                </View>
              ) : (
                logs.map((log, i) => (
                  <View
                    key={log.id}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      padding: 16,
                      borderBottomWidth: i < logs.length - 1 ? 1 : 0,
                      borderBottomColor: "#F3F4F6",
                      gap: 12,
                    }}
                  >
                    {/* Timeline Dot */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: "#EBF0FA",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Clock size={16} color="#1A3A6B" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: "#1A1A2E",
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {log.action}
                      </Text>
                      {log.target_type && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 3,
                            justifyContent: isRTL ? "flex-end" : "flex-start",
                          }}
                        >
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: "#1A3A6B",
                            }}
                          />
                          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{log.target_type}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "500" }}>
                      {timeAgo(log.created_at)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}