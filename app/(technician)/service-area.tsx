import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const EMIRATES = [
  { id: "abu_dhabi", labelAr: "أبوظبي", labelEn: "Abu Dhabi" },
  { id: "dubai", labelAr: "دبي", labelEn: "Dubai" },
  { id: "sharjah", labelAr: "الشارقة", labelEn: "Sharjah" },
  { id: "ajman", labelAr: "عجمان", labelEn: "Ajman" },
  { id: "fujairah", labelAr: "الفجيرة", labelEn: "Fujairah" },
  { id: "ras_al_khaimah", labelAr: "رأس الخيمة", labelEn: "Ras Al Khaimah" },
  { id: "umm_al_quwain", labelAr: "أم القيوين", labelEn: "Umm Al Quwain" },
];

const DISTANCE_OPTIONS = [
  { id: "5", label: "5 km" },
  { id: "10", label: "10 km" },
  { id: "20", label: "20 km" },
  { id: "30", label: "30 km" },
  { id: "50", label: "50 km" },
  { id: "unlimited", label: "unlimited" }, // replaced at render time
];

interface ServiceAreaData {
  emirates: string[];
  distance: string;
  note: string;
}

const DEFAULT_DATA: ServiceAreaData = {
  emirates: [],
  distance: "20",
  note: "",
};

export default function ServiceAreaScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();

  const [data, setData] = useState<ServiceAreaData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const storageKey = `tech_service_area_${profile?.id ?? "unknown"}`;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Try Supabase first
      if (profile?.id) {
        const { data: techProfile } = await supabase
          .from("technician_profiles")
          .select("service_area")
          .eq("id", profile.id)
          .single();
        if (techProfile?.service_area && typeof techProfile.service_area === "object") {
          setData({ ...DEFAULT_DATA, ...(techProfile.service_area as unknown as ServiceAreaData) });
          setLoading(false);
          return;
        }
      }
      // Fallback to AsyncStorage
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...DEFAULT_DATA, ...parsed });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleEmirate = (id: string) => {
    setData((prev) => {
      const already = prev.emirates.includes(id);
      return {
        ...prev,
        emirates: already ? prev.emirates.filter((e) => e !== id) : [...prev.emirates, id],
      };
    });
  };

  const setDistance = (id: string) => {
    setData((prev) => ({ ...prev, distance: id }));
  };

  const setNote = (note: string) => {
    setData((prev) => ({ ...prev, note }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      // Save to Supabase
      if (profile?.id) {
        const { error } = await supabase
          .from("technician_profiles")
          .update({ service_area: data as any })
          .eq("id", profile.id);
        if (error) {
          throw new Error(error.message);
        }
      }
      Alert.alert("✅", t("serviceAreaSaved"));
    } catch {
      Alert.alert("❌", t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

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
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#1A3A6B",
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 12,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#FFFFFF",
              flex: 1,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("serviceAreaTitle")}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Emirates Section */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#1A3A6B",
              marginBottom: 12,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("emiratesIWorkIn")}
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {EMIRATES.map((emirate) => {
              const selected = data.emirates.includes(emirate.id);
              return (
                <TouchableOpacity
                  key={emirate.id}
                  activeOpacity={0.75}
                  onPress={() => toggleEmirate(emirate.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: selected ? "#F5A623" : "#E5E7EB",
                    backgroundColor: selected ? "#FFF8E7" : "#FFFFFF",
                    shadowColor: "#000",
                    shadowOpacity: selected ? 0.08 : 0.03,
                    shadowRadius: 4,
                    elevation: selected ? 2 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: selected ? "700" : "400",
                      color: selected ? "#F5A623" : "#374151",
                    }}
                  >
                    {emirate.labelAr}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: selected ? "#D4850A" : "#9CA3AF",
                      textAlign: "center",
                    }}
                  >
                    {emirate.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Distance Section */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#1A3A6B",
              marginBottom: 12,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("serviceDistance")}
          </Text>

          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {DISTANCE_OPTIONS.map((opt) => {
              const selected = data.distance === opt.id;
              const displayLabel = opt.id === "unlimited" ? t("unlimited") : opt.label;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.75}
                  onPress={() => setDistance(opt.id)}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: selected ? "#F5A623" : "#E5E7EB",
                    backgroundColor: selected ? "#F5A623" : "#FFFFFF",
                    shadowColor: "#000",
                    shadowOpacity: selected ? 0.1 : 0.03,
                    shadowRadius: 4,
                    elevation: selected ? 2 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: selected ? "#FFFFFF" : "#374151",
                    }}
                  >
                    {displayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional Note Section */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#1A3A6B",
              marginBottom: 12,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("additionalNote")}
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
              marginBottom: 16,
            }}
          >
            <TextInput
              value={data.note}
              onChangeText={setNote}
              placeholder={t("noteplaceholder")}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{
                padding: 14,
                fontSize: 14,
                color: "#1A1A2E",
                textAlign: isRTL ? "right" : "left",
                minHeight: 80,
              }}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            padding: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
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
                {t("saveServiceArea")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}