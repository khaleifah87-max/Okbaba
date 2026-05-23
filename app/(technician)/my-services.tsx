import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
} from "react-native";
import {
  ChevronLeft, Wrench, Zap, Wind, Sparkles, Hammer,
  PaintBucket, Home, Key, Droplets, Package, Plus,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ALL_SERVICES = [
  { id: "plumbing", icon: Wrench, color: "#2563EB", bg: "#DBEAFE", labelAr: "سباكة", labelEn: "Plumbing" },
  { id: "electrical", icon: Zap, color: "#D97706", bg: "#FEF3C7", labelAr: "كهرباء", labelEn: "Electrical" },
  { id: "ac", icon: Wind, color: "#0891B2", bg: "#CFFAFE", labelAr: "تكييف", labelEn: "AC/HVAC" },
  { id: "cleaning", icon: Sparkles, color: "#059669", bg: "#DCFCE7", labelAr: "تنظيف", labelEn: "Cleaning" },
  { id: "carpentry", icon: Hammer, color: "#7C3AED", bg: "#EDE9FE", labelAr: "نجارة", labelEn: "Carpentry" },
  { id: "painting", icon: PaintBucket, color: "#DC2626", bg: "#FEE2E2", labelAr: "دهانات", labelEn: "Painting" },
  { id: "maintenance", icon: Home, color: "#1A3A6B", bg: "#EBF0FA", labelAr: "صيانة عامة", labelEn: "General Maintenance" },
  { id: "locksmith", icon: Key, color: "#0D9488", bg: "#CCFBF1", labelAr: "أعمال حدادة", labelEn: "Locksmith" },
  { id: "water_heater", icon: Droplets, color: "#0891B2", bg: "#E0F2FE", labelAr: "سخانات", labelEn: "Water Heater" },
  { id: "moving", icon: Package, color: "#7C3AED", bg: "#F3E8FF", labelAr: "نقل أثاث", labelEn: "Moving" },
];

interface ServiceState {
  enabled: boolean;
  price: string;
}

export default function MyServicesScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [serviceStates, setServiceStates] = useState<Record<string, ServiceState>>(
    Object.fromEntries(ALL_SERVICES.map((s) => [s.id, { enabled: false, price: "" }]))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const storageKey = `tech_services_${profile?.id ?? "unknown"}`;

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      if (profile?.id) {
        const { data: techProfile } = await supabase
          .from("technician_profiles")
          .select("services")
          .eq("id", profile.id)
          .single();
        if (techProfile?.services && typeof techProfile.services === "object") {
          setServiceStates((prev) => ({ ...prev, ...(techProfile.services as unknown as Record<string, ServiceState>) }));
          setLoading(false);
          return;
        }
      }
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setServiceStates((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (id: string) => {
    setServiceStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const setPrice = (id: string, price: string) => {
    setServiceStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], price },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(serviceStates));
      if (profile?.id) {
        const { error } = await supabase
          .from("technician_profiles")
          .update({ services: serviceStates as any })
          .eq("id", profile.id);
        if (error) {
          throw new Error(error.message);
        }
      }
      Alert.alert("Saved", t("serviceSaved"));
    } catch {
      Alert.alert("Error", t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(serviceStates).filter((s) => s.enabled).length;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F7FA", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#1A3A6B" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Blue Header */}
      <View style={{
        backgroundColor: "#1A3A6B",
        paddingTop: insets.top + 14,
        paddingBottom: 20,
        paddingHorizontal: 16,
      }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF" }}>
              {t("myServicesTitle")}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              {enabledCount > 0 ? `${enabledCount} service${enabledCount > 1 ? "s" : ""} active` : "Manage your offered services"}
            </Text>
          </View>
          {enabledCount > 0 && (
            <View style={{ backgroundColor: "#F5A623", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>{enabledCount}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {ALL_SERVICES.map((service) => {
          const state = serviceStates[service.id];
          const ServiceIcon = service.icon;
          return (
            <View
              key={service.id}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                marginBottom: 12,
                shadowColor: state.enabled ? "#F5A623" : "#000",
                shadowOpacity: state.enabled ? 0.12 : 0.05,
                shadowRadius: state.enabled ? 12 : 8,
                elevation: state.enabled ? 4 : 2,
                borderWidth: state.enabled ? 2 : 1,
                borderColor: state.enabled ? "#F5A623" : "#F0F2F5",
                overflow: "hidden",
              }}
            >
              {/* Service Row */}
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 16,
                gap: 14,
              }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: state.enabled ? service.bg : "#F5F7FA",
                  alignItems: "center", justifyContent: "center",
                  borderWidth: state.enabled ? 0 : 1,
                  borderColor: "#E5E7EB",
                }}>
                  <ServiceIcon size={22} color={state.enabled ? service.color : "#9CA3AF"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 15, fontWeight: "700",
                    color: state.enabled ? "#1A1A2E" : "#6B7280",
                    textAlign: isRTL ? "right" : "left",
                  }}>
                    {service.labelAr}
                  </Text>
                  <Text style={{
                    fontSize: 12, color: "#9CA3AF",
                    textAlign: isRTL ? "right" : "left",
                    marginTop: 2,
                  }}>
                    {service.labelEn}
                    {state.enabled && state.price ? ` · AED ${state.price}/hr` : ""}
                  </Text>
                </View>
                <Switch
                  value={state.enabled}
                  onValueChange={() => toggleService(service.id)}
                  trackColor={{ false: "#E5E7EB", true: "#F5A623" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Price Input (shown when enabled) */}
              {state.enabled && (
                <View style={{
                  paddingHorizontal: 16, paddingBottom: 14,
                  borderTopWidth: 1, borderTopColor: "#FFF3CD",
                  backgroundColor: "#FFFDF7",
                }}>
                  <Text style={{
                    fontSize: 12, fontWeight: "600", color: "#D97706",
                    marginTop: 10, marginBottom: 8,
                    textAlign: isRTL ? "right" : "left",
                  }}>
                    {t("pricePerHour")}
                  </Text>
                  <View style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12, borderWidth: 1.5, borderColor: "#F5A623",
                    paddingHorizontal: 14,
                    height: 46,
                  }}>
                    <TextInput
                      value={state.price}
                      onChangeText={(v) => setPrice(service.id, v)}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      style={{
                        flex: 1, fontSize: 16, fontWeight: "700",
                        color: "#1A1A2E",
                        textAlign: isRTL ? "right" : "left",
                      }}
                    />
                    <Text style={{ fontSize: 13, color: "#9CA3AF", fontWeight: "600" }}>AED/hr</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky Save Button */}
      <View style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1, borderTopColor: "#F3F4F6",
        paddingHorizontal: 16, paddingTop: 14,
        paddingBottom: insets.bottom + 14,
        shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
      }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: enabledCount > 0 ? "#F5A623" : "#1A3A6B",
            borderRadius: 16, paddingVertical: 16, alignItems: "center",
            shadowColor: enabledCount > 0 ? "#F5A623" : "#1A3A6B",
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>
              {t("saveServices")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}