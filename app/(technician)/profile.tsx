import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  User,
  MapPin,
  Globe,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  Briefcase,
  Crown,
  MessageSquare,
} from "lucide-react-native";
import { CreditCard, Shield } from "lucide-react-native";
import { FileText } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { Language } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "EN" },
  { code: "ar", label: "العربية", native: "عر" },
  { code: "ur", label: "اردو", native: "اردو" },
];

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function fetchTechDetails(techId: string) {
  const [tpRes, subRes, statsRes] = await Promise.all([
    supabase
      .from("technician_profiles")
      .select("profession, rating, total_reviews, bio, hourly_rate")
      .eq("id", techId)
      .single(),
    supabase
      .from("subscriptions")
      .select("plan, status, trial_ends_at, current_period_end")
      .eq("technician_id", techId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("technician_id", techId)
      .eq("status", "completed"),
  ]);
  return {
    techProfile: tpRes.data,
    subscription: subRes.data,
    totalCompleted: statsRes.count ?? 0,
  };
}

async function fetchMyReviews(techId: string) {
  const { data } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      profiles!reviews_customer_id_fkey (
        full_name
      )
    `)
    .eq("technician_id", techId)
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

function ReviewStarsMini({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          color="#F5A623"
          fill={s <= rating ? "#F5A623" : "transparent"}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

export default function TechnicianProfileScreen() {
  const { t, isRTL, language, setLanguage } = useTranslation();
  const router = useRouter();
  const { signOut, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["tech_profile_detail", profile?.id],
    queryFn: () => fetchTechDetails(profile!.id),
    enabled: !!profile?.id,
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ["my_reviews", profile?.id],
    queryFn: () => fetchMyReviews(profile!.id),
    enabled: !!profile?.id,
  });

  const techProfile = data?.techProfile;
  const subscription = data?.subscription;
  const totalCompleted = data?.totalCompleted ?? 0;
  const trialDays = daysUntil(subscription?.trial_ends_at ?? null);
  const subPlan = subscription?.plan ?? "trial";

  const displayName = profile?.full_name ?? "Technician";
  const initial = displayName.charAt(0).toUpperCase();

  const openEdit = () => {
    setEditName(profile?.full_name ?? "");
    setEditCity(profile?.location ?? "");
    setShowEditModal(true);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim(), location: editCity.trim() || null })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      setShowEditModal(false);
    } catch (err: any) {
      Alert.alert(t("updateFailed"), err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    router.replace("/auth/welcome");
  };

  const MENU_SECTIONS = [
    {
      title: t("sectionMyAccount"),
      iconBg: "#FFF8E7",
      iconColor: "#F5A623",
      items: [
        { icon: User, label: t("editProfileTitle"), onPress: openEdit },
        { icon: Briefcase, label: t("myServices"), onPress: () => router.push("/(technician)/my-services") },
        { icon: MapPin, label: t("serviceArea"), onPress: () => router.push("/(technician)/service-area") },
      ],
    },
    {
      title: t("sectionPayments"),
      iconBg: "#EBF0FA",
      iconColor: "#1A3A6B",
      items: [
        { icon: CreditCard, label: t("paymentMethodsScreen"), onPress: () => router.push("/(technician)/payment-methods") },
        { icon: Crown, label: t("subscription"), onPress: () => router.push("/(technician)/subscription") },
        { icon: Shield, label: t("verificationStatus"), onPress: () => router.push("/(technician)/verification") },
      ],
    },
    {
      title: t("sectionSettings"),
      iconBg: "#F3F4F6",
      iconColor: "#6B7280",
      items: [
        { icon: Bell, label: t("notifications"), onPress: () => Alert.alert("قريباً | Coming Soon", t("comingSoon")) },
        { icon: Globe, label: t("language"), onPress: () => setShowLangModal(true), value: LANGUAGES.find((l) => l.code === language)?.label },
        { icon: HelpCircle, label: t("helpSupport"), onPress: () => Alert.alert("قريباً | Coming Soon", t("comingSoon")) },
      ],
    },
    {
      title: t("sectionLegal"),
      iconBg: "#F0FDF4",
      iconColor: "#10B981",
      items: [
        { icon: FileText, label: t("privacyPolicyMenu"), onPress: () => router.push("/legal/privacy") },
        { icon: FileText, label: t("termsOfUseMenu"), onPress: () => router.push("/legal/terms") },
      ],
    },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Blue Header */}
          <View style={{
            backgroundColor: "#1A3A6B",
            paddingTop: insets.top + 20,
            paddingBottom: 50,
            alignItems: "center",
          }}>
            {/* Verified badge */}
            <View style={{ position: "absolute", top: insets.top + 16, right: 20 }}>
              <View style={{ backgroundColor: "rgba(245,166,35,0.25)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Shield size={12} color="#F5A623" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#F5A623" }}>Pro</Text>
              </View>
            </View>
            <View style={{
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: "#F5A623",
              alignItems: "center", justifyContent: "center",
              marginBottom: 14,
              borderWidth: 4, borderColor: "rgba(255,255,255,0.3)",
              shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
            }}>
              <Text style={{ fontSize: 34, fontWeight: "900", color: "#FFFFFF" }}>{initial}</Text>
            </View>
            <Text style={{ fontSize: 21, fontWeight: "800", color: "#FFFFFF", marginBottom: 4 }}>
              {displayName}
            </Text>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
              {techProfile?.profession ?? "Technician"}
              {profile?.location ? ` · ${profile.location}` : ""}
            </Text>
            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 0, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20 }}>
              <View style={{ alignItems: "center", paddingHorizontal: 16 }}>
                <Text style={{ color: "#F5A623", fontWeight: "900", fontSize: 20 }}>
                  {techProfile?.rating?.toFixed(1) ?? "—"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 }}>Rating</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
              <View style={{ alignItems: "center", paddingHorizontal: 16 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 20 }}>
                  {totalCompleted}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 }}>{t("jobsDone")}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
              <View style={{ alignItems: "center", paddingHorizontal: 16 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 20 }}>{trialDays}</Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 }}>
                  {t("trialDaysLabel")}
                </Text>
              </View>
            </View>
          </View>

          {/* Subscription Banner */}
          <TouchableOpacity
            onPress={() => router.push("/(technician)/subscription")}
            style={{
              marginHorizontal: 20,
              marginTop: -16,
              backgroundColor: "#F5A623",
              borderRadius: 14,
              padding: 14,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#F5A623",
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Crown size={20} color="#FFFFFF" />
              <Text
                style={{
                  fontWeight: "700",
                  color: "#FFFFFF",
                  fontSize: 14,
                  textTransform: "capitalize",
                }}
              >
                {subPlan === "trial" ? t("upgradeToUnlock") : subPlan + " plan"}
              </Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Menu */}
          {MENU_SECTIONS.map((section) => (
            <View key={section.title}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginHorizontal: 20,
                  marginTop: 20,
                  marginBottom: 8,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {section.title}
              </Text>
              <View
                style={{
                  marginHorizontal: 20,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 3,
                  overflow: "hidden",
                }}
              >
                {section.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      onPress={item.onPress}
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        paddingHorizontal: 18,
                        paddingVertical: 14,
                        borderBottomWidth: i < section.items.length - 1 ? 1 : 0,
                        borderBottomColor: "#F3F4F6",
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: section.iconBg,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: isRTL ? 0 : 14,
                          marginLeft: isRTL ? 14 : 0,
                        }}
                      >
                        <Icon size={18} color={section.iconColor} />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: "#1A1A2E",
                          fontWeight: "500",
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {item.label}
                      </Text>
                      {"value" in item && item.value ? (
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#9CA3AF",
                            marginRight: isRTL ? 0 : 8,
                            marginLeft: isRTL ? 8 : 0,
                          }}
                        >
                          {item.value}
                        </Text>
                      ) : null}
                      <ChevronRight size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Logout */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogout}
            style={{
              marginHorizontal: 20,
              marginTop: 20,
              backgroundColor: "#FEE2E2",
              borderRadius: 14,
              padding: 16,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <LogOut size={20} color="#DC2626" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#DC2626" }}>{t("logout")}</Text>
          </TouchableOpacity>
          {/* My Reviews */}
          <View style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E" }}>
                {t("noReviews").includes("No") ? "My Reviews" : t("noReviews")}
              </Text>
              {myReviews.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Star size={13} color="#F5A623" fill="#F5A623" />
                  <Text style={{ fontWeight: "700", color: "#374151", fontSize: 13 }}>
                    {(
                      (myReviews as any[]).reduce(
                        (s: number, r: any) => s + r.rating,
                        0
                      ) / myReviews.length
                    ).toFixed(1)}
                  </Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>({myReviews.length})</Text>
                </View>
              )}
            </View>
            {myReviews.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 20,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <MessageSquare size={28} color="#E5E7EB" />
                <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 8 }}>
                  {t("noReviews")}
                </Text>
              </View>
            ) : (
              (myReviews as any[]).map((review: any) => {
                const customerName = review.profiles?.full_name ?? "Customer";
                const initials = customerName
                  .split(" ")
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                const dateStr = review.created_at
                  ? new Date(review.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })
                  : "";
                return (
                  <View
                    key={review.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: "#1A3A6B",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 11 }}>
                          {initials}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", color: "#1A1A2E", fontSize: 13 }}>
                          {customerName}
                        </Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 11 }}>{dateStr}</Text>
                      </View>
                      <ReviewStarsMini rating={review.rating} />
                    </View>
                    {review.comment ? (
                      <Text style={{ color: "#6B7280", fontSize: 13 }}>{review.comment}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#E5E7EB",
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 16 }}>
              {t("language")}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLangModal(false);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: language === lang.code ? "#F5A623" : "#F5F7FA",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Text
                    style={{
                      color: language === lang.code ? "#FFFFFF" : "#6B7280",
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {lang.native}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: "#1A1A2E" }}>{lang.label}</Text>
                {language === lang.code && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "#F5A623",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 12 }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#E5E7EB",
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            <Text
              style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 20 }}
            >
              {t("editProfileTitle")}
            </Text>

            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}
            >
              {t("fullNameRequired")}
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder={t("enterName")}
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#F5F7FA",
                borderRadius: 10,
                padding: 14,
                fontSize: 15,
                color: "#1A1A2E",
                marginBottom: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                textAlign: isRTL ? "right" : "left",
              }}
            />

            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}
            >
              {t("cityEmirate")}
            </Text>
            <TextInput
              value={editCity}
              onChangeText={setEditCity}
              placeholder="e.g. Dubai, UAE"
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#F5F7FA",
                borderRadius: 10,
                padding: 14,
                fontSize: 15,
                color: "#1A1A2E",
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                textAlign: isRTL ? "right" : "left",
              }}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={saveProfile}
              disabled={saving}
              style={{
                backgroundColor: "#F5A623",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                  {t("saveChanges")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}