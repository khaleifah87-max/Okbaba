import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, Star, MapPin, Phone, CheckCircle, Ban } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface UserDetail {
  id: string;
  full_name: string;
  location: string | null;
  phone: string | null;
  user_type: string;
  created_at: string | null;
  profession?: string;
  rating?: number | null;
  total_reviews?: number | null;
  is_verified?: boolean | null;
  bio?: string | null;
}

async function logAdminAction(adminId: string, action: string, targetId: string, targetType: string) {
  await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action,
    target_id: targetId,
    target_type: targetType,
  });
}

export default function UserDetailScreen() {
  const { t, isRTL } = useTranslation();
  const { profile: adminProfile } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (!profileData) { setLoading(false); return; }

      const { data: techData } = await supabase
        .from("technician_profiles")
        .select("profession, rating, total_reviews, is_verified, bio")
        .eq("id", id)
        .maybeSingle();

      setUser({
        ...profileData,
        profession: techData?.profession,
        rating: techData?.rating,
        total_reviews: techData?.total_reviews,
        is_verified: techData?.is_verified,
        bio: techData?.bio,
      });
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleVerify() {
    if (!user) return;
    const { error } = await supabase.from("technician_profiles").update({ is_verified: true }).eq("id", user.id);
    if (!error) {
      if (adminProfile?.id) await logAdminAction(adminProfile.id, `توثيق الفني: ${user.full_name}`, user.id, "technician");
      setUser((prev) => prev ? { ...prev, is_verified: true } : prev);
      Alert.alert("✅", "تم التوثيق بنجاح");
    }
  }

  async function handleSuspend() {
    if (!user) return;
    Alert.alert("تعليق", t("suspendConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("suspendTech"),
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("profiles").update({ user_type: "suspended_technician" }).eq("id", user.id);
          if (!error) {
            if (adminProfile?.id) await logAdminAction(adminProfile.id, `تعليق الفني: ${user.full_name}`, user.id, "technician");
            setUser((prev) => prev ? { ...prev, user_type: "suspended_technician" } : prev);
            Alert.alert("🚫", "تم التعليق");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      <View style={{ backgroundColor: "#1A3A6B", paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
          >
            <BackIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFFFFF" }}>تفاصيل المستخدم</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1A3A6B" />
        </View>
      ) : !user ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#9CA3AF", fontSize: 15 }}>لم يتم العثور على المستخدم</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {/* Profile Card */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, alignItems: "center" }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#1A3A6B", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: "#F5A623" }}>
                {user.full_name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginBottom: 6 }}>{user.full_name}</Text>
            {user.profession && (
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 8 }}>{user.profession}</Text>
            )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{
                backgroundColor: user.user_type === "suspended_technician" ? "#FEF2F2" : user.is_verified ? "#ECFDF5" : "#FEF3C7",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: user.user_type === "suspended_technician" ? "#DC2626" : user.is_verified ? "#059669" : "#D97706",
                }}>
                  {user.user_type === "suspended_technician" ? "موقوف" : user.is_verified ? "موثّق" : "غير موثّق"}
                </Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12 }}>
            {user.location && (
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                <MapPin size={16} color="#1A3A6B" />
                <Text style={{ fontSize: 14, color: "#4B5563" }}>{user.location}</Text>
              </View>
            )}
            {user.phone && (
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                <Phone size={16} color="#1A3A6B" />
                <Text style={{ fontSize: 14, color: "#4B5563" }}>{user.phone}</Text>
              </View>
            )}
            {user.rating !== undefined && user.rating !== null && (
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                <Star size={16} color="#F5A623" />
                <Text style={{ fontSize: 14, color: "#4B5563" }}>{user.rating.toFixed(1)} ({user.total_reviews ?? 0} تقييم)</Text>
              </View>
            )}
            {user.bio && (
              <View style={{ backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 13, color: "#6B7280", textAlign: isRTL ? "right" : "left" }}>{user.bio}</Text>
              </View>
            )}
          </View>

          {/* Actions (only for technicians) */}
          {(user.user_type === "technician" || user.user_type === "suspended_technician") && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={handleVerify}
                disabled={user.is_verified === true}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: user.is_verified ? "#F0FDF4" : "#ECFDF5",
                  borderWidth: 1,
                  borderColor: "#6EE7B7",
                }}
              >
                <CheckCircle size={18} color="#059669" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#059669" }}>{t("verifyTech")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSuspend}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}
              >
                <Ban size={18} color="#DC2626" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#DC2626" }}>{t("suspendTech")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}