import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from "react-native";
import { MapPin, Clock, Check, X, CheckCheck, Flag, ClipboardList } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS = ["New", "Active", "Completed"];

const AVATAR_COLORS = ["#7C3AED", "#059669", "#D97706", "#0891B2", "#DC2626", "#1A3A6B"];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not scheduled";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
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

async function fetchTechBookings(techId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, service, status, scheduled_at, address, amount, customer_id,
      profiles!bookings_customer_id_fkey (full_name)
    `)
    .eq("technician_id", techId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((b: any) => ({
    id: b.id,
    service: b.service,
    status: b.status,
    scheduled_at: b.scheduled_at,
    address: b.address,
    amount: b.amount,
    customer_id: b.customer_id,
    customerName: b.profiles?.full_name ?? "Customer",
  }));
}

export default function RequestsScreen() {
  const { t, isRTL } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const queryClient = useQueryClient();

  const { data: allBookings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["tech_bookings", user?.id],
    queryFn: () => fetchTechBookings(user!.id),
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tech_requests_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `technician_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tech_bookings", user?.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const updateMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { bookingId, status }) => {
      queryClient.invalidateQueries({ queryKey: ["tech_bookings", user?.id] });
      // Notify the customer when technician accepts the booking
      if (status === "accepted") {
        const booking = allBookings.find((b) => b.id === bookingId);
        if (booking?.customer_id) {
          supabase.functions
            .invoke("send-push-notification", {
              body: {
                userId: booking.customer_id,
                title: "Technician Accepted!",
                body: "Your booking has been accepted. The technician is on their way.",
                data: { type: "booking", bookingId },
              },
            })
            .catch(() => {
              // Non-critical — don't block UI on notification failure
            });
        }
      }
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to update booking.");
    },
  });

  const newBookings = allBookings.filter((b) => b.status === "pending");
  const activeBookings = allBookings.filter((b) => b.status === "accepted");
  const completedBookings = allBookings.filter((b) => b.status === "completed");

  const filtered = activeTab === 0 ? newBookings : activeTab === 1 ? activeBookings : completedBookings;
  const tabCounts = [newBookings.length, activeBookings.length, completedBookings.length];

  function reportIssue(bookingId: string) {
    const booking = allBookings.find((b) => b.id === bookingId);
    const reportedUserId = booking?.customer_id;

    Alert.alert(
      t("reportIssue"),
      "",
      [
        { text: t("customerDidntShow"), onPress: () => submitReport(bookingId, reportedUserId ?? null, t("customerDidntShow")) },
        { text: t("paymentIssue"), onPress: () => submitReport(bookingId, reportedUserId ?? null, t("paymentIssue")) },
        { text: t("poorService"), onPress: () => submitReport(bookingId, reportedUserId ?? null, t("poorService")) },
        { text: t("cancel"), style: "cancel" },
      ]
    );
  }

  async function submitReport(bookingId: string, reportedUserId: string | null, reason: string) {
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
  }

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
            <ClipboardList size={20} color="#F5A623" />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>
              {t("requests")}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              {newBookings.length > 0 ? `${newBookings.length} new request${newBookings.length > 1 ? "s" : ""}` : "Manage customer requests"}
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
        shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
      }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6 }}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            const isNew = i === 0 && tabCounts[0] > 0;
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
                    backgroundColor: isActive ? "#F5A623" : (isNew ? "#EF4444" : "#E5E7EB"),
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    minWidth: 18,
                    alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>
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
        {isLoading ? (
          <View style={{ paddingTop: 80, alignItems: "center", gap: 12 }}>
            <ActivityIndicator color="#1A3A6B" size="large" />
            <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Loading requests...</Text>
          </View>
        ) : isError ? (
          <View style={{ paddingTop: 80, alignItems: "center" }}>
            <Text style={{ color: "#DC2626", fontSize: 14 }}>Unable to load requests. Please try again.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 70, paddingBottom: 40, gap: 14 }}>
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: "#EBF0FA",
              alignItems: "center", justifyContent: "center",
              borderWidth: 3, borderColor: "#C7D8F5",
            }}>
              <ClipboardList size={40} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E", textAlign: "center" }}>
              No {TABS[activeTab].toLowerCase()} requests
            </Text>
            <Text style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", maxWidth: 260 }}>
              {activeTab === 0 ? "New booking requests from customers will appear here" : ""}
            </Text>
          </View>
        ) : (
          filtered.map((req) => {
            const color = getAvatarColor(req.customer_id);
            const initials = getInitials(req.customerName);
            return (
              <View key={req.id} style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: 16,
                marginBottom: 14,
                shadowColor: "#1A3A6B",
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: req.status === "pending" ? "#BFDBFE" : "#F0F2F5",
              }}>
                {/* New badge */}
                {req.status === "pending" && (
                  <View style={{
                    position: "absolute", top: 12, right: 12,
                    backgroundColor: "#EF4444",
                    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>NEW</Text>
                  </View>
                )}

                {/* Customer row */}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 14, paddingRight: req.status === "pending" ? 48 : 0 }}>
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
                      {req.customerName}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                      {req.service}
                    </Text>
                  </View>
                  {req.amount != null && (
                    <View style={{ backgroundColor: "#EBF0FA", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#1A3A6B" }}>AED {req.amount}</Text>
                    </View>
                  )}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 }} />

                {/* Info */}
                <View style={{ flexDirection: "row", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                      <Clock size={13} color="#1A3A6B" />
                    </View>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>{formatDate(req.scheduled_at)}</Text>
                  </View>
                  {req.address && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                        <MapPin size={13} color="#1A3A6B" />
                      </View>
                      <Text style={{ fontSize: 12, color: "#6B7280", flex: 1 }} numberOfLines={1}>{req.address}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {req.status === "pending" && (
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => updateMutation.mutate({ bookingId: req.id, status: "accepted" })}
                      disabled={updateMutation.isPending}
                      style={{
                        flex: 1, backgroundColor: "#059669",
                        borderRadius: 12, height: 46,
                        alignItems: "center", justifyContent: "center",
                        flexDirection: "row", gap: 7,
                        shadowColor: "#059669", shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
                      }}
                    >
                      <Check size={16} color="#FFFFFF" />
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{t("accept")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateMutation.mutate({ bookingId: req.id, status: "cancelled" })}
                      disabled={updateMutation.isPending}
                      style={{
                        flex: 1, backgroundColor: "#FEE2E2",
                        borderRadius: 12, height: 46,
                        alignItems: "center", justifyContent: "center",
                        flexDirection: "row", gap: 7,
                        borderWidth: 1, borderColor: "#FECACA",
                      }}
                    >
                      <X size={16} color="#DC2626" />
                      <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 14 }}>{t("decline")}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {req.status === "accepted" && (
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => updateMutation.mutate({ bookingId: req.id, status: "completed" })}
                      disabled={updateMutation.isPending}
                      style={{
                        flex: 1, backgroundColor: "#1A3A6B",
                        borderRadius: 12, height: 46,
                        alignItems: "center", justifyContent: "center",
                        flexDirection: "row", gap: 7,
                        shadowColor: "#1A3A6B", shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
                      }}
                    >
                      <CheckCheck size={16} color="#FFFFFF" />
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Mark Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateMutation.mutate({ bookingId: req.id, status: "cancelled" })}
                      disabled={updateMutation.isPending}
                      style={{
                        flex: 1, backgroundColor: "#FEE2E2",
                        borderRadius: 12, height: 46,
                        alignItems: "center", justifyContent: "center",
                        flexDirection: "row", gap: 7,
                        borderWidth: 1, borderColor: "#FECACA",
                      }}
                    >
                      <X size={16} color="#DC2626" />
                      <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {req.status === "completed" && (
                  <View style={{ backgroundColor: "#DCFCE7", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CheckCheck size={15} color="#059669" />
                    <Text style={{ color: "#059669", fontSize: 13, fontWeight: "600" }}>Job completed</Text>
                  </View>
                )}

                {/* Report Issue */}
                <TouchableOpacity
                  onPress={() => reportIssue(req.id)}
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