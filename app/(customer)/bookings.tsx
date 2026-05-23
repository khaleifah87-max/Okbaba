import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from "react-native";
import { MapPin, Clock, Star, CalendarX, Flag, CalendarDays } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS = ["Active", "Completed", "Cancelled"];

type Booking = {
  id: string;
  service: string;
  status: string;
  scheduled_at: string | null;
  address: string | null;
  amount: number | null;
  technician_id: string;
  techName: string;
  isReviewed?: boolean;
};

function statusStyle(status: string): { color: string; bg: string; label: string } {
  switch (status) {
    case "pending": return { color: "#D97706", bg: "#FEF3C7", label: "Pending" };
    case "accepted": return { color: "#2563EB", bg: "#DBEAFE", label: "Confirmed" };
    case "completed": return { color: "#059669", bg: "#DCFCE7", label: "Completed" };
    case "cancelled": return { color: "#6B7280", bg: "#F3F4F6", label: "Cancelled" };
    default: return { color: "#6B7280", bg: "#F3F4F6", label: status };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not scheduled";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#1A3A6B", "#7C3AED", "#059669", "#0891B2", "#D97706", "#DC2626"];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function BookingsScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, reviewsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(`
            id,
            service,
            status,
            scheduled_at,
            address,
            amount,
            technician_id,
            profiles!bookings_technician_id_fkey (
              full_name
            )
          `)
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("booking_id")
          .eq("customer_id", user.id),
      ]);

      if (bookingsRes.error) throw new Error(bookingsRes.error.message);

      const reviewed = new Set<string>((reviewsRes.data ?? []).map((r: any) => r.booking_id));
      setReviewedBookingIds(reviewed);

      const mapped: Booking[] = (bookingsRes.data ?? []).map((b: any) => ({
        id: b.id,
        service: b.service,
        status: b.status,
        scheduled_at: b.scheduled_at,
        address: b.address,
        amount: b.amount,
        technician_id: b.technician_id,
        techName: b.profiles?.full_name ?? "Technician",
      }));

      setBookings(mapped);
    } catch (err: any) {
      setError("Unable to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    Alert.alert(
      t("cancelConfirmTitle"),
      t("cancelConfirmMsg"),
      [
        { text: "لا", style: "cancel" },
        {
          text: "نعم، إلغاء",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("bookings")
              .update({ status: "cancelled" })
              .eq("id", bookingId);
            if (error) {
              Alert.alert("خطأ", "تعذر إلغاء الحجز. يرجى المحاولة مرة أخرى.");
            } else {
              fetchBookings();
            }
          },
        },
      ]
    );
  }, [fetchBookings]);

  const markComplete = useCallback(async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);
    if (error) {
      Alert.alert("خطأ", "تعذر تحديث الحجز. يرجى المحاولة مرة أخرى.");
    } else {
      fetchBookings();
    }
  }, [fetchBookings]);

  const reportIssue = useCallback((bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    const reportedUserId = booking?.technician_id;

    Alert.alert(
      t("reportIssue"),
      "",
      [
        {
          text: t("technicianDidntShow"),
          onPress: () => submitReport(bookingId, reportedUserId ?? null, t("technicianDidntShow")),
        },
        {
          text: t("paymentIssue"),
          onPress: () => submitReport(bookingId, reportedUserId ?? null, t("paymentIssue")),
        },
        {
          text: t("poorService"),
          onPress: () => submitReport(bookingId, reportedUserId ?? null, t("poorService")),
        },
        { text: t("cancel"), style: "cancel" },
      ]
    );
  }, [t, bookings]);

  const submitReport = useCallback(async (bookingId: string, reportedUserId: string | null, reason: string) => {
    if (!user) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      booking_id: bookingId,
      reason,
      status: "pending",
    });
    if (error) {
      Alert.alert("Error", error.message || "Failed to submit report.");
    } else {
      Alert.alert("Done", t("reportSent"));
    }
  }, [user, t]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("customer_bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBookings]);

  const activeBookings = bookings.filter((b) => b.status === "pending" || b.status === "accepted");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  const currentList = activeTab === 0 ? activeBookings : activeTab === 1 ? completedBookings : cancelledBookings;

  const tabCounts = [activeBookings.length, completedBookings.length, cancelledBookings.length];

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(245,166,35,0.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <CalendarDays size={20} color="#F5A623" />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>
              {t("bookings")}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              {bookings.length > 0 ? `${bookings.length} total bookings` : "Manage your bookings"}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6 }}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: isActive ? "#1A3A6B" : "#F5F7FA",
                  borderWidth: isActive ? 0 : 1,
                  borderColor: "#E5E7EB",
                  gap: 2,
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: isActive ? "#FFFFFF" : "#6B7280",
                }}>
                  {tab}
                </Text>
                {tabCounts[i] > 0 && (
                  <View style={{
                    backgroundColor: isActive ? "#F5A623" : "#E5E7EB",
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    minWidth: 18,
                    alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: isActive ? "#FFFFFF" : "#9CA3AF" }}>
                      {tabCounts[i]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <View style={{ paddingTop: 80, alignItems: "center", gap: 12 }}>
            <ActivityIndicator color="#1A3A6B" size="large" />
            <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Loading bookings...</Text>
          </View>
        ) : error ? (
          <View style={{ paddingTop: 80, alignItems: "center", gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
              <CalendarX size={28} color="#DC2626" />
            </View>
            <Text style={{ color: "#DC2626", fontSize: 14, textAlign: "center" }}>{error}</Text>
          </View>
        ) : currentList.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 70, paddingBottom: 40 }}>
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: "#EBF0FA",
              alignItems: "center", justifyContent: "center",
              marginBottom: 20,
              borderWidth: 3, borderColor: "#C7D8F5",
            }}>
              <CalendarX size={40} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginBottom: 8, textAlign: "center" }}>
              {activeTab === 0 ? t("noActiveBookings") : activeTab === 1 ? t("noCompletedBookings") : t("noCancelledBookings")}
            </Text>
            <Text style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", maxWidth: 260 }}>
              {activeTab === 0 ? t("startBookingHint") : activeTab === 1 ? "Completed bookings will appear here" : "No cancelled bookings yet"}
            </Text>
          </View>
        ) : (
          currentList.map((b) => {
            const st = statusStyle(b.status);
            const color = getAvatarColor(b.technician_id);
            const initials = getInitials(b.techName);
            return (
              <View key={b.id} style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: 16,
                marginBottom: 14,
                shadowColor: "#1A3A6B",
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: "#F0F2F5",
              }}>
                {/* Header row */}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 14 }}>
                  <View style={{
                    width: 50, height: 50, borderRadius: 25,
                    backgroundColor: color,
                    alignItems: "center", justifyContent: "center",
                    marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                    borderWidth: 2, borderColor: "#FFFFFF",
                    shadowColor: color, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
                  }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                      {b.techName}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                      {b.service}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: st.bg,
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 10,
                  }}>
                    <Text style={{ color: st.color, fontWeight: "700", fontSize: 12 }}>{st.label}</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 }} />

                {/* Info row */}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 14, marginBottom: 4, flexWrap: "wrap" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                      <Clock size={13} color="#1A3A6B" />
                    </View>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>{formatDate(b.scheduled_at)}</Text>
                  </View>
                  {b.address && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                        <MapPin size={13} color="#1A3A6B" />
                      </View>
                      <Text style={{ fontSize: 12, color: "#6B7280", flex: 1 }} numberOfLines={1}>{b.address}</Text>
                    </View>
                  )}
                </View>

                {/* Amount */}
                {b.amount != null && (
                  <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "500" }}>Total Amount</Text>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: "#1A3A6B" }}>
                      AED {b.amount}
                    </Text>
                  </View>
                )}

                {/* Rate now */}
                {b.status === "completed" && !reviewedBookingIds.has(b.id) && (
                  <TouchableOpacity
                    onPress={() => router.push(`/(customer)/review/${b.id}`)}
                    style={{
                      marginTop: 14,
                      backgroundColor: "#F5A623",
                      borderRadius: 12,
                      paddingVertical: 11,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 7,
                      shadowColor: "#F5A623",
                      shadowOpacity: 0.35,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    activeOpacity={0.85}
                  >
                    <Star size={15} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{t("rateNow")}</Text>
                  </TouchableOpacity>
                )}

                {b.status === "completed" && reviewedBookingIds.has(b.id) && (
                  <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DCFCE7", padding: 8, borderRadius: 10 }}>
                    <Star size={13} color="#10B981" fill="#10B981" />
                    <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "600" }}>Review submitted — Thank you!</Text>
                  </View>
                )}

                {/* Actions for pending/accepted */}
                {(b.status === "pending" || b.status === "accepted") && (
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                    {b.status === "accepted" && (
                      <TouchableOpacity
                        onPress={() => markComplete(b.id)}
                        activeOpacity={0.85}
                        style={{
                          flex: 1, backgroundColor: "#059669",
                          borderRadius: 12, paddingVertical: 11,
                          alignItems: "center",
                          shadowColor: "#059669", shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => cancelBooking(b.id)}
                      activeOpacity={0.85}
                      style={{
                        flex: 1, backgroundColor: "#FEE2E2",
                        borderRadius: 12, paddingVertical: 11,
                        alignItems: "center",
                        borderWidth: 1, borderColor: "#FCA5A5",
                      }}
                    >
                      <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 13 }}>{t("cancelBooking")}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Track Technician */}
                {(b.status === "accepted" || b.status === "in_progress") && (
                  <TouchableOpacity
                    onPress={() => router.push(`/(customer)/tracking/${b.id}`)}
                    activeOpacity={0.85}
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: "#1A3A6B",
                      backgroundColor: "#EBF0FA",
                    }}
                  >
                    <MapPin size={14} color="#1A3A6B" />
                    <Text style={{ color: "#1A3A6B", fontWeight: "700", fontSize: 13 }}>
                      Track Technician
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Report Issue */}
                <TouchableOpacity
                  onPress={() => reportIssue(b.id)}
                  activeOpacity={0.7}
                  style={{
                    marginTop: 10,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: "#F9FAFB",
                    borderWidth: 1,
                    borderColor: "#EBEBEB",
                  }}
                >
                  <Flag size={12} color="#9CA3AF" />
                  <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "600" }}>
                    {t("reportIssue")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}