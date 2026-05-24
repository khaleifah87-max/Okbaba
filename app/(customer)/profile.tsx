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
  Switch,
} from "react-native";
import {
  User,
  MapPin,
  CreditCard,
  Bell,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Check,
  Phone,
} from "lucide-react-native";
import { Shield, FileText } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "EN" },
  { code: "ar", label: "العربية", native: "عر" },
  { code: "ur", label: "اردو", native: "اردو" },
];

const CITIES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
  "Al Ain",
];

export default function ProfileScreen() {
  const { t, isRTL, language, setLanguage } = useTranslation();
  const router = useRouter();
  const { signOut, user, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [showLangModal, setShowLangModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [addressText, setAddressText] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const openEdit = () => {
    setEditName(profile?.full_name ?? "");
    setEditPhone(profile?.phone ?? "");
    setEditCity(profile?.location ?? "");
    setSaveSuccess(false);
    setShowEditModal(true);
  };

  const openAddress = () => {
    setAddressText((profile as any)?.address ?? (profile as any)?.location ?? "");
    setShowAddressModal(true);
  };

  const saveAddress = async () => {
    if (!user) return;
    setSavingAddress(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ location: addressText.trim() })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      setShowAddressModal(false);
    } catch (err: any) {
      Alert.alert("خطأ", err.message || "تعذر حفظ العنوان");
    } finally {
      setSavingAddress(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!editName.trim()) {
      Alert.alert("Validation", "Full name is required.");
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          location: editCity || null,
        })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => {
        setShowEditModal(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err.message || "Unable to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.full_name ?? user?.email ?? "User";
  const displayPhone = profile?.phone ?? "";
  const displayCity = profile?.location ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  // Stats query
  const { data: statsData } = useQuery({
    queryKey: ["customer_profile_stats", user?.id],
    queryFn: async () => {
      if (!user) return { bookings: 0, reviews: 0 };
      const [bookingsRes, reviewsRes] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
      ]);
      return {
        bookings: bookingsRes.count ?? 0,
        reviews: reviewsRes.count ?? 0,
      };
    },
    enabled: !!user?.id,
  });

  const MENU_ITEMS = [
    { icon: User, label: t("profile"), color: "#1A3A6B", onPress: openEdit },
    { icon: MapPin, label: t("myAddress"), color: "#1A3A6B", onPress: openAddress },
    { icon: CreditCard, label: t("paymentMethods"), color: "#1A3A6B", onPress: () => setShowPaymentModal(true) },
    { icon: Bell, label: t("notifications"), color: "#1A3A6B", onPress: () => setShowNotifModal(true) },
    {
      icon: Globe,
      label: t("language"),
      color: "#1A3A6B",
      onPress: () => setShowLangModal(true),
      value: LANGUAGES.find((l) => l.code === language)?.label,
    },
    { icon: HelpCircle, label: t("helpSupport"), color: "#1A3A6B", onPress: () => setShowHelpModal(true) },
  ];

  const LEGAL_ITEMS = [
    { icon: Shield, label: t("privacyPolicy"), color: "#6B7280", onPress: () => router.push("/legal/privacy") },
    { icon: FileText, label: t("termsOfUse"), color: "#6B7280", onPress: () => router.push("/legal/terms") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Blue Header */}
          <View style={{
            backgroundColor: "#1A3A6B",
            paddingTop: insets.top + 20,
            paddingBottom: 44,
            alignItems: "center",
          }}>
            <View style={{
              width: 88, height: 88, borderRadius: 44,
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
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
              {user?.email ?? ""}
            </Text>
            {displayPhone ? (
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                {displayPhone}
              </Text>
            ) : null}
            {displayCity ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <MapPin size={12} color="rgba(255,255,255,0.6)" />
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{displayCity}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats Row — pulled up from header */}
          <View style={{
            marginHorizontal: 20,
            marginTop: -24,
            backgroundColor: "#FFFFFF",
            borderRadius: 18,
            padding: 18,
            flexDirection: "row",
            shadowColor: "#1A3A6B",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
            marginBottom: 16,
          }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#1A3A6B", marginBottom: 3 }}>
                {statsData?.bookings ?? 0}
              </Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Bookings</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#F3F4F6" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#1A3A6B", marginBottom: 3 }}>
                {statsData?.reviews ?? 0}
              </Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Reviews</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#F3F4F6" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#F5A623", marginBottom: 3 }}>
                0
              </Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Saved</Text>
            </View>
          </View>

          {/* Menu Card */}
          <View
            style={{
              marginHorizontal: 20,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              overflow: "hidden",
            }}
          >
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    borderBottomWidth: i < MENU_ITEMS.length - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#EBF0FA",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: isRTL ? 0 : 14,
                      marginLeft: isRTL ? 14 : 0,
                    }}
                  >
                    <Icon size={18} color={item.color} />
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
                  {item.value && (
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
                  )}
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={async () => {
              await signOut();
              router.replace("/auth/welcome");
            }}
            activeOpacity={0.8}
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              backgroundColor: "#FEE2E2",
              borderRadius: 14,
              padding: 16,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <LogOut size={20} color="#DC2626" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#6B7280" }}>{t("logout")}</Text>
          </TouchableOpacity>

          {/* Legal Section */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
              overflow: "hidden",
            }}
          >
            {LEGAL_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    borderBottomWidth: i < LEGAL_ITEMS.length - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#F3F4F6",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: isRTL ? 0 : 14,
                      marginLeft: isRTL ? 14 : 0,
                    }}
                  >
                    <Icon size={18} color={item.color} />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: "#6B7280",
                      fontWeight: "500",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {item.label}
                  </Text>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
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
                    backgroundColor: language === lang.code ? "#1A3A6B" : "#F5F7FA",
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
                  <Check size={20} color="#1A3A6B" />
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
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 20 }}>
              Edit Profile
            </Text> 

            {/* Full Name */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
              Full Name *
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F5F7FA",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 12,
                marginBottom: 14,
                gap: 8,
              }}
            >
              <User size={16} color="#1A3A6B" />
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor="#9CA3AF"
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 15,
                  color: "#1A1A2E",
                  textAlign: isRTL ? "right" : "left",
                }}
              />
            </View>

            {/* Phone */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
              Phone Number
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F5F7FA",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 12,
                marginBottom: 14,
                gap: 8,
              }}
            >
              <Phone size={16} color="#1A3A6B" />
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+971 50 000 0000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 15,
                  color: "#1A1A2E",
                  textAlign: isRTL ? "right" : "left",
                }}
              />
            </View>

            {/* City Picker */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
              City / Emirate
            </Text>
            <TouchableOpacity
              onPress={() => setShowCityModal(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F5F7FA",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: editCity ? "#1A3A6B" : "#E5E7EB",
                paddingHorizontal: 12,
                paddingVertical: 14,
                marginBottom: 20,
                gap: 8,
              }}
            >
              <MapPin size={16} color="#1A3A6B" />
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: editCity ? "#1A1A2E" : "#9CA3AF",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {editCity || "Select emirate..."}
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Success Message */}
            {saveSuccess && (
              <View
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Check size={16} color="#059669" />
                <Text style={{ color: "#059669", fontSize: 14, fontWeight: "600" }}>
                  Profile updated successfully!
                </Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={saveProfile}
              disabled={saving}
              style={{
                backgroundColor: "#1A3A6B",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={showCityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setShowCityModal(false)}
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
              Select Emirate
            </Text>
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city}
                onPress={() => {
                  setEditCity(city);
                  setShowCityModal(false);
                }}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: editCity === city ? "#EBF0FA" : "#F5F7FA",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: isRTL ? 0 : 12,
                    marginLeft: isRTL ? 12 : 0,
                  }}
                >
                  <MapPin size={14} color={editCity === city ? "#1A3A6B" : "#9CA3AF"} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: editCity === city ? "#1A3A6B" : "#1A1A2E",
                    fontWeight: editCity === city ? "700" : "400",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {city}
                </Text>
                {editCity === city && <Check size={20} color="#1A3A6B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Address Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowAddressModal(false)}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 16 }}>عنواني</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>العنوان الكامل</Text>
            <View style={{ backgroundColor: "#F5F7FA", borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", padding: 4, marginBottom: 20 }}>
              <TextInput
                value={addressText}
                onChangeText={setAddressText}
                placeholder="أدخل عنوانك الكامل..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={{ padding: 10, fontSize: 15, color: "#1A1A2E", textAlignVertical: "top", minHeight: 80 }}
              />
            </View>
            <TouchableOpacity
              onPress={saveAddress}
              disabled={savingAddress}
              activeOpacity={0.85}
              style={{ backgroundColor: "#1A3A6B", borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
            >
              {savingAddress ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>حفظ العنوان</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowPaymentModal(false)}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, alignItems: "center" }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 }} />
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <CreditCard size={30} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 10 }}>طرق الدفع</Text>
            <Text style={{ fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 24 }}>سيتم إضافة طرق الدفع قريباً</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)} activeOpacity={0.85} style={{ backgroundColor: "#1A3A6B", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>حسناً</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifModal} transparent animationType="slide" onRequestClose={() => setShowNotifModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowNotifModal(false)}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 20 }}>الإشعارات</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", marginBottom: 20 }}>
              <Text style={{ fontSize: 15, color: "#1A1A2E", fontWeight: "500" }}>تفعيل الإشعارات</Text>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: "#E5E7EB", true: "#1A3A6B" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowNotifModal(false)}
              activeOpacity={0.85}
              style={{ backgroundColor: "#1A3A6B", borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Help & Support Modal */}
      <Modal visible={showHelpModal} transparent animationType="slide" onRequestClose={() => setShowHelpModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowHelpModal(false)}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 20 }}>المساعدة والدعم</Text>
            <View style={{ backgroundColor: "#F5F7FA", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                <HelpCircle size={20} color="#1A3A6B" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>البريد الإلكتروني</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1A1A2E" }}>support@okbaba.ae</Text>
              </View>
            </View>
            <View style={{ backgroundColor: "#F5F7FA", borderRadius: 14, padding: 16, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                <Phone size={20} color="#1A3A6B" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>الهاتف</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1A1A2E" }}>+971 4 000 0000</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowHelpModal(false)} activeOpacity={0.85} style={{ backgroundColor: "#1A3A6B", borderRadius: 14, paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}