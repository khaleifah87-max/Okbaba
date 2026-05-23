import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Users, Wrench, CalendarCheck, Star, CreditCard, TrendingUp, BarChart3 } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface StatsData {
  totalCustomers: number;
  totalTechnicians: number;
  newThisWeek: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  acceptedBookings: number;
  cancelledBookings: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  topTechnicians: { id: string; name: string; profession: string; rating: number; total_reviews: number }[];
}

function StatCard({
  icon: Icon, label, value, color, bg, accent,
}: {
  icon: any; label: string; value: number | string; color: string; bg: string; accent?: string;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
      borderTopWidth: 3, borderTopColor: accent ?? color,
    }}>
      <View style={{
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: bg,
        alignItems: "center", justifyContent: "center",
        marginBottom: 10,
      }}>
        <Icon size={18} color={color} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: "900", color: "#1A1A2E" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontWeight: "500" }}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStats() {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [
        customersRes, techRes, newUsersRes,
        allBookingsRes, completedRes, pendingRes, acceptedRes, cancelledRes,
        activeSubsRes, trialSubsRes, expiredSubsRes, topTechsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "customer"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "technician"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trial"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"),
        supabase.from("technician_profiles").select("id, profession, rating, total_reviews").not("rating", "is", null).order("rating", { ascending: false }).limit(5),
      ]);

      const techIds = (topTechsRes.data ?? []).map((t: any) => t.id);
      let nameMap: Record<string, string> = {};
      if (techIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", techIds);
        (profiles ?? []).forEach((p) => { nameMap[p.id] = p.full_name; });
      }

      setData({
        totalCustomers: customersRes.count ?? 0,
        totalTechnicians: techRes.count ?? 0,
        newThisWeek: newUsersRes.count ?? 0,
        totalBookings: allBookingsRes.count ?? 0,
        completedBookings: completedRes.count ?? 0,
        pendingBookings: pendingRes.count ?? 0,
        acceptedBookings: acceptedRes.count ?? 0,
        cancelledBookings: cancelledRes.count ?? 0,
        activeSubscriptions: activeSubsRes.count ?? 0,
        trialSubscriptions: trialSubsRes.count ?? 0,
        expiredSubscriptions: expiredSubsRes.count ?? 0,
        topTechnicians: (topTechsRes.data ?? []).map((t: any) => ({
          id: t.id,
          name: nameMap[t.id] ?? "—",
          profession: t.profession ?? "—",
          rating: t.rating ?? 0,
          total_reviews: t.total_reviews ?? 0,
        })),
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStats();
    }, [])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F7FA", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1A3A6B" />
      </View>
    );
  }

  const completionRate = data && data.totalBookings > 0
    ? Math.round((data.completedBookings / data.totalBookings) * 100)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Blue Header */}
      <View style={{
        backgroundColor: "#1A3A6B",
        paddingTop: insets.top + 16,
        paddingBottom: 28,
        paddingHorizontal: 20,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(245,166,35,0.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <BarChart3 size={20} color="#F5A623" />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>Platform Stats</Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              Complete platform overview
            </Text>
          </View>
        </View>

        {/* Key metrics summary row */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{
            flex: 1, backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 14, padding: 14, alignItems: "center",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
          }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#F5A623" }}>
              {(data?.totalCustomers ?? 0) + (data?.totalTechnicians ?? 0)}
            </Text>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>Total Users</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 14, padding: 14, alignItems: "center",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
          }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#F5A623" }}>
              {data?.totalBookings ?? 0}
            </Text>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>Total Bookings</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 14, padding: 14, alignItems: "center",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
          }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#F5A623" }}>
              {completionRate}%
            </Text>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>Completion</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchStats(); }}
            tintColor="#1A3A6B"
          />
        }
      >
        {/* Section label helper */}
        {[
          {
            icon: Users, label: "Users", color: "#1A3A6B",
            cards: [
              { icon: Users, label: "Customers", value: data?.totalCustomers ?? 0, color: "#1A3A6B", bg: "#EEF2FF", accent: "#1A3A6B" },
              { icon: Wrench, label: "Technicians", value: data?.totalTechnicians ?? 0, color: "#059669", bg: "#ECFDF5", accent: "#059669" },
              { icon: TrendingUp, label: "New This Week", value: data?.newThisWeek ?? 0, color: "#7C3AED", bg: "#F5F3FF", accent: "#7C3AED" },
            ],
          },
        ].map((section) => (
          <View key={section.label}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                <section.icon size={14} color={section.color} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {section.label}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {section.cards.map((card, i) => (
                <StatCard key={i} icon={card.icon} label={card.label} value={card.value} color={card.color} bg={card.bg} accent={card.accent} />
              ))}
            </View>
          </View>
        ))}

        {/* Bookings */}
        <View>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
              <CalendarCheck size={14} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Bookings
            </Text>
          </View>

          {/* Booking breakdown visual */}
          <View style={{
            backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18,
            marginBottom: 12,
            shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
          }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E", marginBottom: 14 }}>Booking Status Breakdown</Text>
            {[
              { label: "Completed", value: data?.completedBookings ?? 0, color: "#059669", bg: "#DCFCE7" },
              { label: "Pending", value: data?.pendingBookings ?? 0, color: "#D97706", bg: "#FEF3C7" },
              { label: "Accepted", value: data?.acceptedBookings ?? 0, color: "#2563EB", bg: "#DBEAFE" },
              { label: "Cancelled", value: data?.cancelledBookings ?? 0, color: "#DC2626", bg: "#FEE2E2" },
            ].map((item) => {
              const total = data?.totalBookings ?? 1;
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <View key={item.label} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>{item.label}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: item.color }}>{item.value}</Text>
                      <Text style={{ fontSize: 11, color: "#9CA3AF" }}>({pct.toFixed(0)}%)</Text>
                    </View>
                  </View>
                  <View style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                    <View style={{
                      height: 8,
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: item.color,
                      borderRadius: 4,
                    }} />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard icon={CalendarCheck} label="Total Bookings" value={data?.totalBookings ?? 0} color="#1A3A6B" bg="#EEF2FF" />
            <StatCard icon={CalendarCheck} label="Completed" value={data?.completedBookings ?? 0} color="#059669" bg="#ECFDF5" />
          </View>
        </View>

        {/* Subscriptions */}
        <View>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={14} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Subscriptions
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard icon={CreditCard} label="Active" value={data?.activeSubscriptions ?? 0} color="#059669" bg="#ECFDF5" />
            <StatCard icon={CreditCard} label="Trial" value={data?.trialSubscriptions ?? 0} color="#D97706" bg="#FEF3C7" />
            <StatCard icon={CreditCard} label="Expired" value={data?.expiredSubscriptions ?? 0} color="#DC2626" bg="#FEF2F2" />
          </View>
        </View>

        {/* Top Technicians */}
        <View>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" }}>
              <Star size={14} color="#F5A623" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Top Technicians
            </Text>
          </View>

          <View style={{
            backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden",
            shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
            borderWidth: 1, borderColor: "#F0F2F5",
          }}>
            {(data?.topTechnicians ?? []).length === 0 ? (
              <View style={{ padding: 24, alignItems: "center", gap: 10 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#F5F7FA", alignItems: "center", justifyContent: "center" }}>
                  <Star size={20} color="#D1D5DB" />
                </View>
                <Text style={{ color: "#9CA3AF", fontSize: 14 }}>No technicians yet</Text>
              </View>
            ) : (
              (data?.topTechnicians ?? []).map((tech, i) => (
                <View
                  key={tech.id}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    padding: 14,
                    borderBottomWidth: i < (data?.topTechnicians?.length ?? 0) - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                    gap: 12,
                    backgroundColor: i === 0 ? "#FFFBEB" : "#FFFFFF",
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: i === 0 ? "#F5A623" : i === 1 ? "#EEF2FF" : "#F5F7FA",
                    alignItems: "center", justifyContent: "center",
                    borderWidth: i === 0 ? 2 : 0, borderColor: "#FFFFFF",
                  }}>
                    <Text style={{
                      fontSize: 14, fontWeight: "800",
                      color: i === 0 ? "#FFFFFF" : "#6B7280",
                    }}>
                      #{i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                      {tech.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6B7280", textAlign: isRTL ? "right" : "left", marginTop: 1 }}>
                      {tech.profession}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Star size={12} color="#F5A623" fill="#F5A623" />
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#D97706" }}>{tech.rating.toFixed(1)}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{tech.total_reviews} reviews</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}