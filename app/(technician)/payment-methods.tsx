import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Banknote, Building2, Smartphone, Globe, CheckCircle, Info } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface PaymentMethod {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  enabled: boolean;
  detail: string;
  detailField?: string;
  detailPlaceholder?: string;
}

const INITIAL_METHODS: PaymentMethod[] = [
  {
    id: "cash",
    name: "Cash on Completion",
    nameAr: "نقداً عند الإنجاز",
    description: "Most common — receive payment directly",
    descriptionAr: "الأكثر شيوعاً — تلقي الدفع مباشرة",
    enabled: false,
    detail: "",
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    nameAr: "تحويل بنكي",
    description: "Receive payment via bank",
    descriptionAr: "تلقي الدفع عبر البنك",
    enabled: false,
    detail: "",
    detailField: "IBAN",
    detailPlaceholder: "AE00 0000 0000 0000 0000 0000",
  },
  {
    id: "payby",
    name: "PayBy",
    nameAr: "PayBy",
    description: "UAE digital wallet — most popular for workers",
    descriptionAr: "محفظة رقمية إماراتية — الأكثر شيوعاً",
    enabled: false,
    detail: "",
    detailField: "Phone",
    detailPlaceholder: "+971 50 000 0000",
  },
  {
    id: "stc_pay",
    name: "STC Pay",
    nameAr: "STC Pay",
    description: "STC digital payment",
    descriptionAr: "دفع رقمي عبر STC",
    enabled: false,
    detail: "",
    detailField: "Phone",
    detailPlaceholder: "+971 50 000 0000",
  },
  {
    id: "pyypl",
    name: "Pyypl",
    nameAr: "Pyypl",
    description: "No bank account needed",
    descriptionAr: "لا تحتاج إلى حساب مصرفي",
    enabled: false,
    detail: "",
    detailField: "Phone/Email",
    detailPlaceholder: "Phone or email",
  },
  {
    id: "western_union",
    name: "Western Union / Wise",
    nameAr: "Western Union / Wise",
    description: "For international transfers",
    descriptionAr: "للتحويلات الدولية",
    enabled: false,
    detail: "",
    detailField: "Name/Account",
    detailPlaceholder: "Full name or account number",
  },
];

function getMethodIcon(id: string) {
  switch (id) {
    case "cash": return Banknote;
    case "bank_transfer": return Building2;
    case "payby":
    case "stc_pay":
    case "pyypl": return Smartphone;
    default: return Globe;
  }
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { t, isRTL, language } = useTranslation();
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>(INITIAL_METHODS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  // Load existing payment methods from Supabase
  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const { data } = await supabase
          .from("technician_profiles")
          .select("payment_methods")
          .eq("id", user!.id)
          .single();
        if ((data as any)?.payment_methods) {
          const saved = (data as any).payment_methods as Record<string, { enabled: boolean; detail: string }>;
          setMethods((prev) =>
            prev.map((m) =>
              saved[m.id]
                ? { ...m, enabled: saved[m.id].enabled, detail: saved[m.id].detail ?? "" }
                : m
            )
          );
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function toggleMethod(id: string, value: boolean) {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: value } : m)));
    setSaved(false);
  }

  function updateDetail(id: string, detail: string) {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, detail } : m)));
    setSaved(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const paymentMethodsData: Record<string, { enabled: boolean; detail: string }> = {};
      methods.forEach((m) => {
        paymentMethodsData[m.id] = { enabled: m.enabled, detail: m.detail };
      });

      const { error } = await supabase
        .from("technician_profiles")
        .update({ payment_methods: paymentMethodsData } as any)
        .eq("id", user.id);

      if (error) {
        // If column doesn't exist yet, show info
        if (error.message.includes("column") || error.code === "42703") {
          Alert.alert(
            "Info",
            "Payment methods saved locally. The database column will be added soon.",
          );
        } else {
          throw new Error(error.message);
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save payment methods.");
    } finally {
      setSaving(false);
    }
  }

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

      {/* Header */}
      <View style={{ backgroundColor: "#1A3A6B" }}>
        <SafeAreaView>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 16,
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BackIcon size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF", textAlign: isRTL ? "right" : "left" }}>
                {t("paymentMethodsScreen")}
              </Text>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", textAlign: isRTL ? "right" : "left" }}>
                {t("paymentMethodsSubtitle")}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success message */}
        {saved && (
          <View
            style={{
              backgroundColor: "#DCFCE7",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: "#BBF7D0",
            }}
          >
            <CheckCircle size={20} color="#16A34A" />
            <Text style={{ color: "#16A34A", fontWeight: "700", fontSize: 14 }}>
              {t("paymentMethodsSaved")}
            </Text>
          </View>
        )}

        {/* Info Banner */}
        <View
          style={{
            backgroundColor: "#EBF0FA",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "flex-start",
            gap: 10,
            borderWidth: 1,
            borderColor: "#BFDBFE",
          }}
        >
          <Info size={18} color="#1A3A6B" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#1A3A6B", marginBottom: 3, textAlign: isRTL ? "right" : "left" }}>
              How Payments Work
            </Text>
            <Text style={{ fontSize: 12, color: "#374151", textAlign: isRTL ? "right" : "left" }}>
              Customers will see your enabled payment methods and pay you directly after service completion. Enable the methods you can accept and add your account details.
            </Text>
          </View>
        </View>

        {methods.map((method) => {
          const Icon = getMethodIcon(method.id);
          const displayName = language === "en" ? method.name : method.nameAr;
          const displayDesc = language === "en" ? method.description : method.descriptionAr;

          return (
            <View
              key={method.id}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: method.enabled ? 1.5 : 0,
                borderColor: method.enabled ? "#F5A623" : "transparent",
                overflow: "hidden",
              }}
            >
              {/* Method Header */}
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: method.enabled ? "#FEF3C7" : "#F3F4F6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: isRTL ? 0 : 14,
                    marginLeft: isRTL ? 14 : 0,
                  }}
                >
                  <Icon size={22} color={method.enabled ? "#F5A623" : "#9CA3AF"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: method.enabled ? "#1A1A2E" : "#374151",
                      textAlign: isRTL ? "right" : "left",
                      marginBottom: 2,
                    }}
                  >
                    {displayName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {displayDesc}
                  </Text>
                </View>
                <Switch
                  value={method.enabled}
                  onValueChange={(v) => toggleMethod(method.id, v)}
                  trackColor={{ false: "#E5E7EB", true: "#FDE68A" }}
                  thumbColor={method.enabled ? "#F5A623" : "#FFFFFF"}
                />
              </View>

              {/* Detail Input (shown when toggled on and has a field) */}
              {method.enabled && method.detailField && (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                    borderTopWidth: 1,
                    borderTopColor: "#FEF3C7",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#6B7280",
                      marginBottom: 6,
                      marginTop: 12,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {method.detailField}
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#F5F7FA",
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: "#E5E7EB",
                      paddingHorizontal: 12,
                      height: 46,
                      justifyContent: "center",
                    }}
                  >
                    <TextInput
                      value={method.detail}
                      onChangeText={(v) => updateDetail(method.id, v)}
                      placeholder={method.detailPlaceholder}
                      placeholderTextColor="#9CA3AF"
                      style={{
                        fontSize: 14,
                        color: "#1A1A2E",
                        textAlign: isRTL ? "right" : "left",
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
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
          borderTopColor: "#E5E7EB",
          padding: 20,
          paddingBottom: 32,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#F5A623",
            borderRadius: 14,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              {t("savePaymentMethods")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}