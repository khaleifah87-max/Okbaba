import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StatusBar,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  AlertTriangle, CheckCircle, XCircle, Eye,
  Flag, ShieldAlert,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

interface ReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: string | null;
  created_at: string | null;
  reporter_name: string;
  admin_note: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getStatusConfig(status: string | null) {
  switch (status) {
    case "reviewing": return { label: "Reviewing", bg: "#EEF2FF", color: "#4F46E5", borderColor: "#C7D2FE" };
    case "resolved": return { label: "Resolved", bg: "#ECFDF5", color: "#059669", borderColor: "#6EE7B7" };
    case "dismissed": return { label: "Dismissed", bg: "#F5F5F5", color: "#6B7280", borderColor: "#E5E7EB" };
    default: return { label: "Pending", bg: "#FEF3C7", color: "#D97706", borderColor: "#FDE68A" };
  }
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

const FILTER_TABS: { key: ReportStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "reviewing", label: "Reviewing" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];

export default function ReportsScreen() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ReportStatus>("pending");

  const [resolveModal, setResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [resolveTarget, setResolveTarget] = useState<ReportItem | null>(null);

  async function fetchReports() {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id, reason, details, status, created_at, admin_note, reporter_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reporterIds = [...new Set((data ?? []).map((r) => r.reporter_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (reporterIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", reporterIds as string[]);
        (profiles ?? []).forEach((p) => { profileMap[p.id] = p.full_name; });
      }

      setReports(
        (data ?? []).map((r) => ({
          ...r,
          reporter_name: r.reporter_id ? (profileMap[r.reporter_id] ?? "Unknown") : "Unknown",
        }))
      );
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
      fetchReports();
    }, [])
  );

  async function updateStatus(report: ReportItem, newStatus: string, note?: string) {
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus, admin_note: note ?? report.admin_note, resolved_by: profile?.id })
      .eq("id", report.id);

    if (!error) {
      if (profile?.id) {
        await logAdminAction(profile.id, `Report status changed to: ${newStatus}`, report.id, "report");
      }
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: newStatus, admin_note: note ?? r.admin_note } : r));
    }
  }

  async function handleResolve() {
    if (!resolveTarget) return;
    await updateStatus(resolveTarget, "resolved", resolveNote);
    setResolveModal(false);
    setResolveNote("");
    setResolveTarget(null);
  }

  const filtered = reports.filter((r) => (r.status ?? "pending") === filter);
  const pendingCount = reports.filter((r) => (r.status ?? "pending") === "pending").length;

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
            backgroundColor: pendingCount > 0 ? "rgba(239,68,68,0.2)" : "rgba(245,166,35,0.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <ShieldAlert size={20} color={pendingCount > 0 ? "#FCA5A5" : "#F5A623"} />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>
              Reports
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              {pendingCount > 0 ? `${pendingCount} pending review` : "All reports managed"}
            </Text>
          </View>
        </View>

        {/* Summary chips */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          {FILTER_TABS.map((tab) => {
            const count = reports.filter((r) => (r.status ?? "pending") === tab.key).length;
            if (count === 0) return null;
            const cfg = getStatusConfig(tab.key);
            return (
              <View key={tab.key} style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: 10,
                paddingHorizontal: 10, paddingVertical: 5,
                flexDirection: "row", alignItems: "center", gap: 5,
              }}>
                <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}>{tab.label}</Text>
                <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: cfg.color }}>{count}</Text>
                </View>
              </View>
            );
          })}
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
            const count = reports.filter((r) => (r.status ?? "pending") === tab.key).length;
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
                {count > 0 && (
                  <View style={{
                    backgroundColor: isActive ? "#F5A623" : "#E5E7EB",
                    borderRadius: 8, width: 18, height: 18, alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: isActive ? "#FFFFFF" : "#6B7280" }}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#1A3A6B" />
          <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Loading reports...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReports(); }}
              tintColor="#1A3A6B"
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={{ paddingTop: 60, alignItems: "center", gap: 14 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={32} color="#1A3A6B" />
              </View>
              <Text style={{ color: "#374151", fontSize: 16, fontWeight: "700" }}>No {filter} reports</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>
                Reports with this status will appear here
              </Text>
            </View>
          ) : (
            filtered.map((report) => {
              const statusConf = getStatusConfig(report.status);
              const initials = getInitials(report.reporter_name);
              return (
                <View
                  key={report.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 18,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: report.status === "pending" ? "#FDE68A" : "#F0F2F5",
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: "#1A3A6B",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#F5A623" }}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                        {report.reporter_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 1, textAlign: isRTL ? "right" : "left" }}>
                        {report.reason}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 5 }}>
                      <View style={{
                        backgroundColor: statusConf.bg,
                        borderRadius: 10,
                        paddingHorizontal: 10, paddingVertical: 4,
                        borderWidth: 1, borderColor: statusConf.borderColor,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: statusConf.color }}>{statusConf.label}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{timeAgo(report.created_at)}</Text>
                    </View>
                  </View>

                  {report.details && (
                    <View style={{ backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#F3F4F6" }}>
                      <Text style={{ fontSize: 13, color: "#4B5563", textAlign: isRTL ? "right" : "left" }}>{report.details}</Text>
                    </View>
                  )}

                  {report.admin_note && (
                    <View style={{ backgroundColor: "#ECFDF5", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#A7F3D0" }}>
                      <Text style={{ fontSize: 12, color: "#059669", fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
                        Admin note: {report.admin_note}
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => updateStatus(report, "reviewing")}
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 5, paddingVertical: 9, borderRadius: 10,
                        backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE",
                      }}
                    >
                      <Eye size={13} color="#4F46E5" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#4F46E5" }}>Review</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => { setResolveTarget(report); setResolveModal(true); }}
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 5, paddingVertical: 9, borderRadius: 10,
                        backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#6EE7B7",
                      }}
                    >
                      <CheckCircle size={13} color="#059669" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#059669" }}>{t("resolveReport")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => updateStatus(report, "dismissed")}
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 5, paddingVertical: 9, borderRadius: 10,
                        backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
                      }}
                    >
                      <XCircle size={13} color="#DC2626" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#DC2626" }}>{t("dismissReport")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Resolve Modal */}
      <Modal visible={resolveModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{
              backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
              paddingBottom: insets.bottom + 24,
            }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 }} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginBottom: 6, textAlign: "center" }}>
                Resolve Report
              </Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginBottom: 20 }}>
                Add an optional admin note before resolving
              </Text>
              <TextInput
                value={resolveNote}
                onChangeText={setResolveNote}
                placeholder="Add a note..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: "#F5F7FA", borderRadius: 12,
                  borderWidth: 1.5, borderColor: "#E5E7EB",
                  padding: 14, fontSize: 14, color: "#1A1A2E",
                  textAlignVertical: "top", minHeight: 80, marginBottom: 20,
                }}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => { setResolveModal(false); setResolveNote(""); setResolveTarget(null); }}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: 14,
                    backgroundColor: "#F5F7FA", alignItems: "center",
                    borderWidth: 1, borderColor: "#E5E7EB",
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#6B7280" }}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResolve}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: 14,
                    backgroundColor: "#059669", alignItems: "center",
                    shadowColor: "#059669", shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>Confirm Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}