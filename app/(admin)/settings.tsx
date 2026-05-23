import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Bell, ClipboardList, LogOut, Clock, ChevronRight, ChevronLeft } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

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
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعة`;
  return `${Math.floor(hours / 24)} يوم`;
}

export default function AdminSettings() {
  const { t, isRTL } = useTranslation();
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLogs() {
    try {
      const { data } = await supabase
        .from("admin_logs")
        .select("id, action, created_at, target_type")
        .order("created_at", { ascending: false })
        .limit(20);
      setLogs(data ?? []);
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
      fetchLogs();
    }, [])
  );

  async function handleLogout() {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد من تسجيل الخروج؟",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("logout"),
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/auth/login" as any);
          },
        },
      ]
    );
  }

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Header */}
      <View style={{ backgroundColor: "#1A3A6B", paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF", textAlign: isRTL ? "right" : "left" }}>
          {t("adminSettings")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(); }} tintColor="#1A3A6B" />}
      >
        {/* Admin Profile Card */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#1A3A6B", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#F5A623" }}>
                {(profile?.full_name ?? "A").substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                {profile?.full_name ?? "المدير"}
              </Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <View style={{ backgroundColor: "#F5A623", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#1A3A6B" }}>
                    {profile?.user_type === "admin" ? "مدير" : profile?.user_type === "support" ? "دعم" : "مالية"}
                  </Text>
                </View>
                {profile?.phone && (
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>{profile.phone}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <TouchableOpacity
            onPress={() => router.push("/(admin)/send-notification" as any)}
            style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 14 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
              <Bell size={20} color="#1A3A6B" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
              إرسال إشعار جماعي
            </Text>
            <ChevronIcon size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Action Log */}
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A3A6B", textAlign: isRTL ? "right" : "left" }}>
          {t("actionLog")}
        </Text>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator color="#1A3A6B" />
            </View>
          ) : logs.length === 0 ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>لا يوجد سجل إجراءات</Text>
            </View>
          ) : (
            logs.map((log, i) => (
              <View
                key={log.id}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  padding: 14,
                  borderBottomWidth: i < logs.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                  gap: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={16} color="#1A3A6B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>{log.action}</Text>
                  {log.target_type && (
                    <Text style={{ fontSize: 11, color: "#9CA3AF", textAlign: isRTL ? "right" : "left" }}>{log.target_type}</Text>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{timeAgo(log.created_at)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FEF2F2",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: "#FECACA",
            gap: 10,
          }}
        >
          <LogOut size={20} color="#DC2626" />
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#DC2626" }}>{t("logout")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}