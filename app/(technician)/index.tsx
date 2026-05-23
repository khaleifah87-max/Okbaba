import React, { useState, useEffect, useCallback } from "react";
import { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from "react-native";
import {
  Bell,
  Star,
  Briefcase,
  TrendingUp,
  MapPin,
  Check,
  X,
  BarChart2,
  Award,
  DollarSign,
  Clock,
  ChevronRight,
  Zap,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startLocationTracking, stopLocationTracking } from "@/lib/location";
import type * as LocationModule from "expo-location";

const AVATAR_COLORS = ["#7C3AED", "#059669", "#D97706", "#0891B2", "#DC2626", "#1A3A6B"];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

type Booking = {
  id: string;
  service: string;
  status: string;
  scheduled_at: string | null;
  address: string | null;
  amount: number | null;
  customer_id: string;
  customerName: string;
};

async function fetchTechnicianData(techId: string) {
  const [bookingsRes, subRes, profileRes, statsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
        id, service, status, scheduled_at, address, amount, customer_id,
        profiles!bookings_customer_id_fkey (full_name)
      `
      )
      .eq("technician_id", techId)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("technician_id", techId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("technician_profiles").select("rating, total_reviews").eq("id", techId).single(),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("technician_id", techId)
      .eq("status", "completed"),
  ]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [last7Res, completedRes, cancelledRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, scheduled_at, created_at, service")
      .eq("technician_id", techId)
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("bookings")
      .select("id, service, amount, created_at")
      .eq("technician_id", techId)
      .eq("status", "completed")
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("technician_id", techId)
      .eq("status", "cancelled")
      .gte("created_at", monthStart.toISOString()),
  ]);

  const bookings: Booking[] = (bookingsRes.data ?? []).map((b: any) => ({
    id: b.id,
    service: b.service,
    status: b.status,
    scheduled_at: b.scheduled_at,
    address: b.address,
    amount: b.amount,
    customer_id: b.customer_id,
    customerName: b.profiles?.full_name ?? "Customer",
  }));

  const subscription = subRes.data ?? null;
  const techProfile = profileRes.data ?? null;
  const totalCompleted = statsRes.count ?? 0;

  const last7Raw = last7Res.data ?? [];
  const last7Days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const count = last7Raw.filter((b: any) => {
      const bDate = (b.created_at ?? "").split("T")[0];
      return bDate === dateStr;
    }).length;
    last7Days.push({ label, count });
  }

  const completedBookings = completedRes.data ?? [];
  const serviceCounts: Record<string, number> = {};
  completedBookings.forEach((b: any) => {
    if (b.service) serviceCounts[b.service] = (serviceCounts[b.service] ?? 0) + 1;
  });
  const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const thisMonthCompleted = completedBookings.length;
  const thisMonthCancelled = cancelledRes.count ?? 0;
  const estimatedEarnings = thisMonthCompleted * 50;
  const completionRate =
    thisMonthCompleted + thisMonthCancelled > 0
      ? Math.round((thisMonthCompleted / (thisMonthCompleted + thisMonthCancelled)) * 100)
      : 0;

  return {
    bookings,
    subscription,
    techProfile,
    totalCompleted,
    analytics: {
      last7Days,
      estimatedEarnings,
      completionRate,
      topService,
      thisMonthCompleted,
    },
  };
}

export default function TechnicianDashboard() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(true);
  const locationSubscriptionRef = useRef<import("expo-location").LocationSubscription | null>(null);

  const handleAvailabilityToggle = useCallback(async (newValue: boolean) => {
    setIsAvailable(newValue);
    if (newValue && user) {
      // Going online — start location tracking
      const sub = await startLocationTracking(user.id);
      locationSubscriptionRef.current = sub;
    } else {
      // Going offline — stop location tracking
      stopLocationTracking(locationSubscriptionRef.current);
      locationSubscriptionRef.current = null;
    }
  }, [user]);

  // Clean up location subscription on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking(locationSubscriptionRef.current);
    };
  }, []);

  const [showAgreement, setShowAgreement] = useState(false);
  const [agreedChecked, setAgreedChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("technician_agreed_v1").then((val) => {
      if (val !== "true") {
        setShowAgreement(true);
      }
    });
  }, []);

  async function handleAcceptAgreement() {
    await AsyncStorage.setItem("technician_agreed_v1", "true");
    setShowAgreement(false);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["technician_dashboard", user?.id],
    queryFn: () => fetchTechnicianData(user!.id),
    enabled: !!user,
  });

  const bookings = data?.bookings ?? [];
  const subscription = data?.subscription;
  const techProfile = data?.techProfile;
  const totalCompleted = data?.totalCompleted ?? 0;
  const analytics = data?.analytics;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const todayCount = bookings.filter((b) => {
    if (!b.scheduled_at) return false;
    const d = new Date(b.scheduled_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const trialDaysLeft = daysUntil(subscription?.trial_ends_at ?? null);
  const subPlan = subscription?.plan ?? "trial";

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician_dashboard", user?.id] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to update booking.");
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tech_bookings_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `technician_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["technician_dashboard", user?.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ═══════════════ HEADER ═══════════════ */}
        <View style={{ backgroundColor: "#1A3A6B" }}>
          <SafeAreaView>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 }}>
              {/* Top Row: Logo + Name + Bell */}
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                  <Image
                    source={require("@/assets/images/1000219939.png")}
                    style={{ width: 44, height: 44, borderRadius: 12 }}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" }}>
                      {t("welcomeBack")}
                    </Text>
                    <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "800" }}>
                      {profile?.full_name ?? "Technician"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/(technician)/notifications")}
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
                  <Bell size={20} color="#FFFFFF" />
                  {pendingCount > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 9,
                        height: 9,
                        borderRadius: 5,
                        backgroundColor: "#F5A623",
                        borderWidth: 1.5,
                        borderColor: "#1A3A6B",
                      }}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Availability Toggle Pill */}
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: isAvailable ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.15)",
                }}
              >
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: isAvailable ? "#10B981" : "#9CA3AF",
                    }}
                  />
                  <View>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                      {isAvailable ? "Online — Accepting Jobs" : "Offline"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                      {t("setAvailability")}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={handleAvailabilityToggle}
                  trackColor={{ false: "rgba(255,255,255,0.2)", true: "rgba(16,185,129,0.6)" }}
                  thumbColor={isAvailable ? "#10B981" : "#9CA3AF"}
                />
              </View>

              {/* Stats Row */}
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
                {[
                  { label: t("totalJobs"), value: String(totalCompleted), icon: Briefcase, accent: "#F5A623" },
                  { label: "Today", value: String(todayCount), icon: Clock, accent: "#34D399" },
                  { label: t("rating"), value: techProfile?.rating?.toFixed(1) ?? "New", icon: Star, accent: "#FBBF24" },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        borderRadius: 14,
                        padding: 12,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.15)",
                      }}
                    >
                      <Icon size={16} color={stat.accent} />
                      <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 22, marginTop: 6 }}>
                        {stat.value}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, textAlign: "center", marginTop: 2 }}>
                        {stat.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ═══════════════ SUBSCRIPTION BANNER ═══════════════ */}
        <TouchableOpacity
          onPress={() => router.push("/(technician)/subscription")}
          activeOpacity={0.85}
          style={{
            marginHorizontal: 20,
            marginTop: 20,
            backgroundColor: "rgba(245,166,35,0.1)",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1.5,
            borderColor: "#F5A623",
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "#F5A623",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={{ color: "#1A3A6B", fontWeight: "700", fontSize: 14, textTransform: "capitalize" }}>
                {subPlan === "trial" ? t("freeTrial") : subPlan}
              </Text>
              {subscription?.trial_ends_at && subPlan === "trial" && (
                <Text style={{ color: "#6B7280", fontSize: 12 }}>
                  {trialDaysLeft} {t("daysRemaining")}
                </Text>
              )}
            </View>
          </View>
          <View
            style={{
              backgroundColor: "#1A3A6B",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#F5A623", fontWeight: "700", fontSize: 12 }}>{t("choosePlan")}</Text>
          </View>
        </TouchableOpacity>

        {/* ═══════════════ PENDING REQUESTS ═══════════════ */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>
              {t("todaysRequests")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              {pendingCount > 0 && (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#F5A623",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>{pendingCount}</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => router.push("/(technician)/requests")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#1A3A6B", fontWeight: "600", fontSize: 13 }}>See All</Text>
                <ChevronRight size={14} color="#1A3A6B" />
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator color="#1A3A6B" size="large" />
            </View>
          ) : bookings.length === 0 ? (
            <View
              style={{
                paddingVertical: 32,
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(26,58,107,0.08)",
              }}
            >
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
                <Briefcase size={24} color="#1A3A6B" />
              </View>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 15, marginBottom: 4 }}>
                No Pending Requests
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 13 }}>New requests will appear here</Text>
            </View>
          ) : (
            bookings.slice(0, 3).map((req) => {
              const color = getAvatarColor(req.customer_id);
              const initials = getInitials(req.customerName);
              return (
                <View
                  key={req.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: "#1A3A6B",
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: req.status === "pending" ? "rgba(245,166,35,0.2)" : "rgba(26,58,107,0.08)",
                  }}
                >
                  {/* Status Badge */}
                  <View
                    style={{
                      position: "absolute",
                      top: 14,
                      right: isRTL ? undefined : 14,
                      left: isRTL ? 14 : undefined,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: req.status === "pending" ? "#FEF3C7" : "#DBEAFE",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: req.status === "pending" ? "#D97706" : "#2563EB",
                          textTransform: "uppercase",
                        }}
                      >
                        {req.status}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Row */}
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      marginBottom: 12,
                      paddingRight: isRTL ? 0 : 70,
                      paddingLeft: isRTL ? 70 : 0,
                    }}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: color,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: isRTL ? 0 : 12,
                        marginLeft: isRTL ? 12 : 0,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontWeight: "700",
                          fontSize: 15,
                          color: "#1A1A2E",
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {req.customerName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#6B7280",
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {req.service}
                      </Text>
                    </View>
                  </View>

                  {/* Details Row */}
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      gap: 16,
                      marginBottom: 14,
                    }}
                  >
                    {req.address && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                        <MapPin size={12} color="#9CA3AF" />
                        <Text style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }} numberOfLines={1}>
                          {req.address}
                        </Text>
                      </View>
                    )}
                    {req.amount != null && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <DollarSign size={12} color="#1A3A6B" />
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#1A3A6B" }}>
                          AED {req.amount}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  {req.status === "pending" && (
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() =>
                          updateBookingMutation.mutate({ bookingId: req.id, status: "accepted" })
                        }
                        disabled={updateBookingMutation.isPending}
                        activeOpacity={0.85}
                        style={{
                          flex: 1,
                          backgroundColor: "#10B981",
                          borderRadius: 12,
                          height: 44,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          gap: 6,
                        }}
                      >
                        <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                          {t("accept")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          updateBookingMutation.mutate({ bookingId: req.id, status: "cancelled" })
                        }
                        disabled={updateBookingMutation.isPending}
                        activeOpacity={0.85}
                        style={{
                          flex: 1,
                          backgroundColor: "#FEE2E2",
                          borderRadius: 12,
                          height: 44,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          gap: 6,
                          borderWidth: 1,
                          borderColor: "#FECACA",
                        }}
                      >
                        <X size={16} color="#DC2626" strokeWidth={2.5} />
                        <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 14 }}>
                          {t("decline")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {req.status === "accepted" && (
                    <View
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                        borderWidth: 1,
                        borderColor: "#BFDBFE",
                      }}
                    >
                      <Check size={14} color="#2563EB" strokeWidth={2.5} />
                      <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 13 }}>
                        Confirmed
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ═══════════════ ANALYTICS ═══════════════ */}
        {analytics && (
          <View style={{ paddingHorizontal: 20, paddingTop: 8, marginBottom: 20 }}>
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <BarChart2 size={18} color="#1A3A6B" />
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>{t("analytics")}</Text>
            </View>

            {/* Earnings Card */}
            <View
              style={{
                backgroundColor: "#1A3A6B",
                borderRadius: 20,
                padding: 20,
                marginBottom: 14,
                shadowColor: "#1A3A6B",
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginBottom: 4 }}>
                {t("thisMonth")} · {t("estimatedEarnings")}
              </Text>
              <Text style={{ color: "#F5A623", fontSize: 32, fontWeight: "800" }}>
                AED {analytics.estimatedEarnings}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <TrendingUp size={13} color="rgba(255,255,255,0.5)" />
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  {analytics.thisMonthCompleted} completed × AED 50 avg
                </Text>
              </View>
            </View>

            {/* 7-Day Bar Chart */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: 18,
                marginBottom: 14,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 16 }}>
                Bookings — Last 7 Days
              </Text>
              {(() => {
                const maxVal = Math.max(...analytics.last7Days.map((d) => d.count), 1);
                return (
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80 }}>
                    {analytics.last7Days.map((day, idx) => {
                      const barH = Math.max(4, (day.count / maxVal) * 72);
                      return (
                        <View key={idx} style={{ flex: 1, alignItems: "center" }}>
                          <View
                            style={{
                              width: "100%",
                              height: barH,
                              backgroundColor: day.count > 0 ? "#1A3A6B" : "#E5E7EB",
                              borderRadius: 6,
                              marginBottom: 6,
                            }}
                          />
                          <Text style={{ fontSize: 10, color: "#9CA3AF" }}>{day.label}</Text>
                          {day.count > 0 && (
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#1A3A6B" }}>
                              {day.count}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>

            {/* Performance Stats */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 18,
                  padding: 16,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 5,
                    borderColor:
                      analytics.completionRate >= 80
                        ? "#10B981"
                        : analytics.completionRate >= 50
                          ? "#F5A623"
                          : "#EF4444",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#1A1A2E" }}>
                    {analytics.completionRate}%
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280", textAlign: "center" }}>
                  {t("completionRate")}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 18,
                  padding: 16,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#EBF0FA",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <Award size={28} color="#1A3A6B" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280", textAlign: "center" }}>
                  {t("topService")}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#1A3A6B",
                    textAlign: "center",
                    marginTop: 3,
                  }}
                  numberOfLines={2}
                >
                  {analytics.topService ?? "—"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ═══════════════ UPGRADE BANNER ═══════════════ */}
        {subPlan === "trial" && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            <TouchableOpacity
              onPress={() => router.push("/(technician)/subscription")}
              activeOpacity={0.85}
              style={{
                backgroundColor: "#1A3A6B",
                borderRadius: 20,
                padding: 20,
                shadowColor: "#1A3A6B",
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "#F5A623",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Zap size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
                    {t("choosePlan")}
                  </Text>
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                    {trialDaysLeft} {t("trialDaysLeft")}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                Unlock unlimited job requests and premium features
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ═══════════════ AGREEMENT MODAL ═══════════════ */}
      <Modal visible={showAgreement} transparent animationType="fade" statusBarTranslucent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 28,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            {/* Logo + Title */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Image
                source={require("@/assets/images/1000219939.png")}
                style={{ width: 70, height: 70, borderRadius: 18, marginBottom: 14 }}
                resizeMode="contain"
              />
              <Text
                style={{ fontSize: 20, fontWeight: "800", color: "#1A1A2E", textAlign: "center" }}
              >
                {t("technicianAgreement")}
              </Text>
            </View>

            {/* Agreement Points */}
            <View style={{ marginBottom: 20 }}>
              {[
                t("agreementPoint1"),
                t("agreementPoint2"),
                t("agreementPoint3"),
                t("agreementPoint4"),
                t("agreementPoint5"),
              ].map((point, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "flex-start",
                    marginBottom: 10,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#1A3A6B",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#F5A623" }}>{i + 1}</Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: "#374151",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {point}
                  </Text>
                </View>
              ))}
            </View>

            {/* Checkbox */}
            <TouchableOpacity
              onPress={() => setAgreedChecked((v) => !v)}
              activeOpacity={0.8}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: agreedChecked ? "#EBF0FA" : "#F9FAFB",
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: agreedChecked ? "#1A3A6B" : "#E5E7EB",
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: agreedChecked ? "#1A3A6B" : "#D1D5DB",
                  backgroundColor: agreedChecked ? "#1A3A6B" : "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {agreedChecked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: "600",
                  color: agreedChecked ? "#1A3A6B" : "#374151",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("agreeToAllTerms")}
              </Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              onPress={handleAcceptAgreement}
              disabled={!agreedChecked}
              activeOpacity={0.85}
              style={{
                backgroundColor: agreedChecked ? "#F5A623" : "#E5E7EB",
                borderRadius: 16,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: agreedChecked ? "#FFFFFF" : "#9CA3AF",
                }}
              >
                {t("startWorking")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}