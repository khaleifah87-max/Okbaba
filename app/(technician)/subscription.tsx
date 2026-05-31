import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Check, Star, Zap, Crown, AlertCircle, CheckCircle2 } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function fetchSubscription(techId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("technician_id", techId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const PLANS = [
    {
      key: "basic",
      name: t("basicPlan"),
      price: 19,
      icon: Zap,
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      borderColor: "#BFDBFE",
      features: [
        t("upTo15Requests"),
        t("profileListing"),
        t("emailSupport"),
      ],
    },
    {
      key: "pro",
      name: t("proPlan"),
      price: 39,
      icon: Star,
      color: "#F5A623",
      bgColor: "#FFFBEB",
      borderColor: "#F5A623",
      popular: true,
      features: [
        t("upTo60Requests"),
        t("priorityListing"),
        t("chatSupport"),
        t("featuredBadge"),
      ],
    },
    {
      key: "premium",
      name: t("premiumPlan"),
      price: 59,
      icon: Crown,
      color: "#7C3AED",
      bgColor: "#F5F3FF",
      borderColor: "#C4B5FD",
      features: [
        t("unlimitedRequests"),
        t("featuredBadge"),
        t("analytics"),
        t("phoneSupport"),
      ],
    },
  ];

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", profile?.id],
    queryFn: () => fetchSubscription(profile!.id),
    enabled: !!profile?.id,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: string) => {
      if (!profile?.id || !subscription?.id) return;
      const { error } = await supabase
        .from("subscriptions")
        .update({ plan })
        .eq("id", subscription.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", profile?.id] });
    },
  });

  const status = subscription?.status ?? "trial";
  const trialDays = daysUntil(subscription?.trial_ends_at ?? null);
  const currentPlan = subscription?.plan ?? "trial";

  const handleContactUs = async () => {
    if (subscription?.id) {
      updatePlanMutation.mutate(selectedPlan);
    }
    const waUrl =
      "https://wa.me/971500000000?text=Hi%2C%20I%20want%20to%20subscribe%20to%20the%20" +
      selectedPlan +
      "%20plan";
    const canOpen = await Linking.canOpenURL(waUrl);
    if (canOpen) {
      Linking.openURL(waUrl);
    } else {
      Alert.alert(t("subscription"), t("contactUsToSubscribe"), [{ text: t("ok") }]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#1A3A6B",
            paddingTop: 12,
            paddingBottom: 20,
            paddingHorizontal: 20,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF" }}>
            {t("subscription")}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 }}
        >
          {/* Status Banner */}
          {isLoading ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color="#1A3A6B" />
            </View>
          ) : status === "trial" ? (
            <View
              style={{
                backgroundColor: "#1A3A6B",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#F5A623",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 18 }}>{trialDays}</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "600" }}>
                  {t("daysRemaining")}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15, marginBottom: 4 }}>
                  {t("freeTiralActive")}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                  {trialDays} {t("trialDaysLeft")}
                </Text>
              </View>
            </View>
          ) : status === "active" ? (
            <View
              style={{
                backgroundColor: "#DCFCE7",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: "#86EFAC",
              }}
            >
              <CheckCircle2 size={28} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#059669", fontWeight: "700", fontSize: 15, marginBottom: 2 }}
                >
                  {t("activeSubscription")}
                </Text>
                <Text style={{ color: "#065F46", fontSize: 13, textTransform: "capitalize" }}>
                  {t("yourPlan")}: {currentPlan}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#059669",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>
                  {t("activeLabel")}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: "#FECACA",
              }}
            >
              <AlertCircle size={28} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#DC2626", fontWeight: "700", fontSize: 15, marginBottom: 2 }}
                >
                  {t("trialExpired")}
                </Text>
                <Text style={{ color: "#991B1B", fontSize: 13 }}>
                  {t("chooseToReceiveBookings")}
                </Text>
              </View>
            </View>
          )}

          {/* Title */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#1A1A2E",
              marginBottom: 6,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("choosePlan")}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginBottom: 20,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("growYourBusiness")}
          </Text>

          {/* Plan Cards */}
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.key;
            const isCurrent = currentPlan === plan.key && status === "active";
            return (
              <TouchableOpacity
                key={plan.key}
                activeOpacity={0.85}
                onPress={() => setSelectedPlan(plan.key)}
                style={{
                  backgroundColor: isSelected ? plan.bgColor : "#FFFFFF",
                  borderRadius: 18,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 2,
                  borderColor: isSelected ? plan.borderColor : "#E5E7EB",
                  shadowColor: "#000",
                  shadowOpacity: isSelected ? 0.08 : 0.04,
                  shadowRadius: 10,
                  elevation: isSelected ? 4 : 2,
                  marginTop: plan.popular ? 14 : 0,
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <View
                    style={{
                      position: "absolute",
                      top: -14,
                      alignSelf: "center",
                      backgroundColor: "#F5A623",
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>
                      {t("mostPopular")}
                    </Text>
                  </View>
                )}

                {isCurrent && (
                  <View
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      backgroundColor: "#059669",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 11 }}>
                      {t("currentPlanBadge")}
                    </Text>
                  </View>
                )}

                {/* Plan Header */}
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    marginTop: plan.popular ? 8 : 0,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: plan.color + "20",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={24} color={plan.color} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E" }}>
                        {plan.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>{t("perMonth")}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
                    <Text style={{ fontSize: 32, fontWeight: "900", color: plan.color }}>
                      {plan.price} AED
                    </Text>
                    <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{t("perMonth")}</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 14 }} />

                {/* Features */}
                {plan.features.map((feature, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: plan.color + "20",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={13} color={plan.color} strokeWidth={3} />
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#374151",
                        flex: 1,
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}

                {/* Select indicator */}
                <View
                  style={{
                    marginTop: 16,
                    backgroundColor: isSelected ? plan.color : "#F3F4F6",
                    borderRadius: 12,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isSelected ? "#FFFFFF" : "#6B7280",
                    }}
                  >
                    {isSelected ? t("selectedLabel") : t("selectPlan")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
{/* Payment Methods */}
<View style={{
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 20,
  marginBottom: 16,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
}}>
  <Text style={{
    fontSize: 16, fontWeight: "800", color: "#1A1A2E",
    marginBottom: 16, textAlign: isRTL ? "right" : "left",
  }}>
    طرق الدفع المتاحة 💳
  </Text>

  {/* PayBy */}
  <View style={{
    flexDirection: isRTL ? "row-reverse" : "row",
    alignItems: "center", gap: 12,
    backgroundColor: "#F0FDF4", borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: "#86EFAC",
  }}>
    <Text style={{ fontSize: 28 }}>💚</Text>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>PayBy</Text>
      <Text style={{ fontSize: 12, color: "#6B7280" }}>
        إيداع نقدي من أي بقالة • بدون بطاقة بنكية
      </Text>
    </View>
    <View style={{
      backgroundColor: "#059669", paddingHorizontal: 8,
      paddingVertical: 3, borderRadius: 8,
    }}>
      <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>الأشهر</Text>
    </View>
  </View>

  {/* Bank Transfer */}
  <View style={{
    flexDirection: isRTL ? "row-reverse" : "row",
    alignItems: "center", gap: 12,
    backgroundColor: "#EFF6FF", borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: "#BFDBFE",
  }}>
    <Text style={{ fontSize: 28 }}>🏦</Text>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>تحويل بنكي</Text>
      <Text style={{ fontSize: 12, color: "#6B7280" }}>
        Emirates NBD • FAB • ADCB
      </Text>
    </View>
  </View>

  {/* e& money */}
  <View style={{
    flexDirection: isRTL ? "row-reverse" : "row",
    alignItems: "center", gap: 12,
    backgroundColor: "#FFF7ED", borderRadius: 12,
    padding: 12,
    borderWidth: 1, borderColor: "#FED7AA",
  }}>
    <Text style={{ fontSize: 28 }}>📱</Text>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>e& money</Text>
      <Text style={{ fontSize: 12, color: "#6B7280" }}>
        محفظة etisalat الرقمية • سريع وسهل
      </Text>
    </View>
  </View>

  <Text style={{
    fontSize: 12, color: "#9CA3AF", textAlign: "center",
    marginTop: 12,
  }}>
    بعد الدفع أرسل إيصالك عبر واتساب لتفعيل اشتراكك فوراً ✅
  </Text>
</View>
          {/* Contact Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContactUs}
            disabled={updatePlanMutation.isPending}
            style={{
              backgroundColor: "#F5A623",
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              marginTop: 8,
              shadowColor: "#F5A623",
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {updatePlanMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
                {t("contactUsToSubscribe")}
              </Text>
            )}
          </TouchableOpacity>
          <Text
            style={{ color: "#9CA3AF", fontSize: 12, textAlign: "center", marginTop: 10 }}
          >
            {t("contactViaWhatsApp")}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
