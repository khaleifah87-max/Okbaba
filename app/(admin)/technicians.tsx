import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Search, CheckCircle, Ban, Eye, Star, Users } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterTab = "all" | "verified" | "unverified" | "suspended";

interface TechnicianItem {
  id: string;
  full_name: string;
  location: string | null;
  user_type: string;
  profession: string;
  rating: number | null;
  is_verified: boolean | null;
}

async function logAdminAction(adminId: string, action: string, targetId: string, targetType: string) {
  await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action,
    target_id: targetId,
    target_type: targetType,
  });
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = ["#1A3A6B", "#7C3AED", "#059669", "#0891B2", "#D97706", "#DC2626"];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Pending" },
  { key: "suspended", label: "Suspended" },
];

export default function TechniciansScreen() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

  async function fetchTechnicians() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          location,
          user_type,
          technician_profiles (
            profession,
            rating,
            is_verified
          )
        `)
        .in("user_type", ["technician", "suspended_technician"]);

      if (error) throw error;

      const items: TechnicianItem[] = (data ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        location: p.location,
        user_type: p.user_type,
        profession: p.technician_profiles?.[0]?.profession ?? p.technician_profiles?.profession ?? "—",
        rating: p.technician_profiles?.[0]?.rating ?? p.technician_profiles?.rating ?? null,
        is_verified: p.technician_profiles?.[0]?.is_verified ?? p.technician_profiles?.is_verified ?? false,
      }));

      setTechnicians(items);
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
      fetchTechnicians();
    }, [])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchTechnicians();
  }

  async function handleVerify(tech: TechnicianItem) {
    const { error } = await supabase
      .from("technician_profiles")
      .update({ is_verified: true })
      .eq("id", tech.id);

    if (!error) {
      if (profile?.id) {
        await logAdminAction(profile.id, `Verified technician: ${tech.full_name}`, tech.id, "technician");
      }
      setTechnicians((prev) =>
        prev.map((t) => (t.id === tech.id ? { ...t, is_verified: true } : t))
      );
      Alert.alert("Verified", `${tech.full_name} has been verified`);
    }
  }

  async function handleSuspend(tech: TechnicianItem) {
    Alert.alert(
      "Suspend Technician",
      `${t("suspendConfirm")}\n\n${tech.full_name}`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("suspendTech"),
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("profiles")
              .update({ user_type: "suspended_technician" })
              .eq("id", tech.id);

            if (!error) {
              if (profile?.id) {
                await logAdminAction(profile.id, `Suspended technician: ${tech.full_name}`, tech.id, "technician");
              }
              setTechnicians((prev) =>
                prev.map((t) => (t.id === tech.id ? { ...t, user_type: "suspended_technician" } : t))
              );
              Alert.alert("Suspended", `${tech.full_name} has been suspended`);
            }
          },
        },
      ]
    );
  }

  function getStatusForTech(tech: TechnicianItem): "verified" | "unverified" | "suspended" {
    if (tech.user_type === "suspended_technician") return "suspended";
    if (tech.is_verified) return "verified";
    return "unverified";
  }

  const STATUS_CONFIG = {
    verified: { label: "Verified", bg: "#ECFDF5", color: "#059669", borderColor: "#A7F3D0" },
    unverified: { label: "Pending", bg: "#FEF3C7", color: "#D97706", borderColor: "#FDE68A" },
    suspended: { label: "Suspended", bg: "#FEF2F2", color: "#DC2626", borderColor: "#FECACA" },
  };

  const filtered = technicians.filter((tech) => {
    const matchesSearch =
      !search.trim() ||
      tech.full_name.toLowerCase().includes(search.toLowerCase()) ||
      tech.profession.toLowerCase().includes(search.toLowerCase());

    const status = getStatusForTech(tech);
    const matchesFilter = filter === "all" || status === filter;

    return matchesSearch && matchesFilter;
  });

  const verifiedCount = technicians.filter((t) => getStatusForTech(t) === "verified").length;
  const pendingCount = technicians.filter((t) => getStatusForTech(t) === "unverified").length;
  const suspendedCount = technicians.filter((t) => getStatusForTech(t) === "suspended").length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Blue Header */}
      <View style={{
        backgroundColor: "#1A3A6B",
        paddingTop: insets.top + 16,
        paddingBottom: 20,
        paddingHorizontal: 20,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(245,166,35,0.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Users size={20} color="#F5A623" />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>
              Technicians
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              {technicians.length} registered technicians
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { label: "Verified", count: verifiedCount, color: "#10B981" },
            { label: "Pending", count: pendingCount, color: "#F5A623" },
            { label: "Suspended", count: suspendedCount, color: "#EF4444" },
          ].map((item) => (
            <View key={item.label} style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 12, padding: 10, alignItems: "center",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
            }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: item.color }}>{item.count}</Text>
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={{
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
      }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          backgroundColor: "#F5F7FA",
          borderRadius: 12,
          borderWidth: 1.5, borderColor: "#E5E7EB",
          paddingHorizontal: 12, height: 46, gap: 10,
        }}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or profession..."
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, fontSize: 14, color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
      }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            const count = tab.key === "all"
              ? technicians.length
              : technicians.filter((t) => {
                  const s = getStatusForTech(t);
                  return tab.key === "unverified" ? s === "unverified" : s === tab.key;
                }).length;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? "#1A3A6B" : "#F5F7FA",
                  borderWidth: 1.5,
                  borderColor: isActive ? "#1A3A6B" : "#E5E7EB",
                  flexDirection: "row", alignItems: "center", gap: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? "#FFFFFF" : "#6B7280" }}>
                  {tab.label}
                </Text>
                <View style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "#E5E7EB",
                  borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1,
                  minWidth: 20, alignItems: "center",
                }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: isActive ? "#FFFFFF" : "#6B7280" }}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#1A3A6B" />
          <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Loading technicians...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3A6B" />}
        >
          {filtered.length === 0 ? (
            <View style={{ paddingTop: 60, alignItems: "center", gap: 14 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                <Users size={32} color="#1A3A6B" />
              </View>
              <Text style={{ color: "#374151", fontSize: 16, fontWeight: "700" }}>No results found</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>Try adjusting your search or filter</Text>
            </View>
          ) : (
            filtered.map((tech) => {
              const status = getStatusForTech(tech);
              const statusConf = STATUS_CONFIG[status];
              const color = getAvatarColor(tech.id);
              return (
                <View
                  key={tech.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 18,
                    padding: 16,
                    shadowColor: "#1A3A6B",
                    shadowOpacity: 0.07,
                    shadowRadius: 12,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: status === "unverified" ? "#FDE68A" : "#F0F2F5",
                  }}
                >
                  {/* Top row */}
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <View style={{
                      width: 50, height: 50, borderRadius: 25,
                      backgroundColor: color,
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 2, borderColor: "#FFFFFF",
                      shadowColor: color, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>{getInitials(tech.full_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                        {tech.full_name}
                      </Text>
                      <Text style={{ fontSize: 13, color: "#6B7280", textAlign: isRTL ? "right" : "left", marginTop: 1 }}>
                        {tech.profession}
                      </Text>
                      {tech.location && (
                        <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: isRTL ? "right" : "left", marginTop: 1 }}>
                          {tech.location}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View style={{
                        backgroundColor: statusConf.bg,
                        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
                        borderWidth: 1, borderColor: statusConf.borderColor,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: statusConf.color }}>{statusConf.label}</Text>
                      </View>
                      {tech.rating !== null && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                          <Star size={11} color="#F5A623" fill="#F5A623" />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#D97706" }}>{tech.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 }} />

                  {/* Action buttons */}
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleVerify(tech)}
                      disabled={tech.is_verified === true && status !== "suspended"}
                      style={{
                        flex: 1,
                        flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 5, paddingVertical: 10, borderRadius: 11,
                        backgroundColor: tech.is_verified && status !== "suspended" ? "#F0FDF4" : "#ECFDF5",
                        borderWidth: 1, borderColor: tech.is_verified && status !== "suspended" ? "#BBF7D0" : "#6EE7B7",
                        opacity: tech.is_verified && status !== "suspended" ? 0.7 : 1,
                      }}
                    >
                      <CheckCircle size={13} color="#059669" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#059669" }}>{t("verifyTech")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleSuspend(tech)}
                      style={{
                        flex: 1,
                        flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 5, paddingVertical: 10, borderRadius: 11,
                        backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
                      }}
                    >
                      <Ban size={13} color="#DC2626" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#DC2626" }}>{t("suspendTech")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push(`/(admin)/user-detail?id=${tech.id}` as any)}
                      style={{
                        flex: 1,
                        flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 5, paddingVertical: 10, borderRadius: 11,
                        backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE",
                      }}
                    >
                      <Eye size={13} color="#4F46E5" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#4F46E5" }}>{t("viewProfile")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}