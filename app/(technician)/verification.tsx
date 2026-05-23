import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  IdCard,
  Camera,
  Award,
  Star,
  Search,
  MessageCircle,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VerificationStatus = "verified" | "pending" | "not_verified";

export default function VerificationScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<VerificationStatus>("not_verified");
  const [loading, setLoading] = useState(true);

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const { data } = await supabase
          .from("technician_profiles")
          .select("is_verified")
          .eq("id", user!.id)
          .single();
        if (data?.is_verified === true) {
          setStatus("verified");
        } else if (data?.is_verified === false) {
          setStatus("not_verified");
        } else {
          setStatus("not_verified");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function openWhatsApp() {
    const name = profile?.full_name ?? "Technician";
    const message = encodeURIComponent(
      `السلام عليكم، أريد التحقق من حسابي في أوك بابا.\nاسمي: ${name}\nبريدي الإلكتروني: ${user?.email ?? ""}\n\nHello, I would like to verify my Ok Baba account.\nName: ${name}`
    );
    const url = `https://wa.me/971501234567?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open WhatsApp.");
    });
  }

  const statusConfig = {
    verified: {
      bg: "#DCFCE7",
      border: "#86EFAC",
      iconColor: "#16A34A",
      textColor: "#15803D",
      label: t("verified2"),
      icon: CheckCircle,
    },
    pending: {
      bg: "#FEF3C7",
      border: "#FDE68A",
      iconColor: "#D97706",
      textColor: "#B45309",
      label: t("pendingReview"),
      icon: Clock,
    },
    not_verified: {
      bg: "#FEE2E2",
      border: "#FCA5A5",
      iconColor: "#DC2626",
      textColor: "#B91C1C",
      label: t("notVerified"),
      icon: XCircle,
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const DOCUMENTS = [
    { icon: IdCard, label: t("emiratesIdPassport") },
    { icon: FileText, label: t("professionalLicense") },
    { icon: Camera, label: t("profilePhoto") },
  ];

  const BENEFITS = [
    { icon: Award, label: t("benefitBadge") },
    { icon: Star, label: t("benefitTrust") },
    { icon: Search, label: t("benefitPriority") },
  ];

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
      <View style={{
        backgroundColor: "#1A3A6B",
        paddingTop: insets.top + 14,
        paddingBottom: 24,
        paddingHorizontal: 16,
      }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <BackIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF" }}>
              {t("verificationStatus")}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              Get verified to unlock more bookings
            </Text>
          </View>
        </View>

        {/* Progress steps */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {["Submit Docs", "Under Review", "Verified"].map((step, i) => {
            const isCompleted = status === "verified" ? true : i < 1;
            const isActive = status === "pending" ? i === 1 : status === "verified" ? false : i === 0;
            return (
              <View key={step} style={{ flex: 1, alignItems: "center", gap: 5 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, width: "100%" }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: isCompleted ? "#F5A623" : isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                    alignItems: "center", justifyContent: "center",
                    borderWidth: isActive ? 2 : 0, borderColor: "#F5A623",
                  }}>
                    {isCompleted ? (
                      <CheckCircle size={12} color="#FFFFFF" />
                    ) : (
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.8)" }}>{i + 1}</Text>
                    )}
                  </View>
                  {i < 2 && <View style={{ flex: 1, height: 2, backgroundColor: isCompleted ? "#F5A623" : "rgba(255,255,255,0.15)", borderRadius: 1 }} />}
                </View>
                <Text style={{ fontSize: 10, color: isCompleted ? "#F5A623" : "rgba(255,255,255,0.5)", fontWeight: isCompleted || isActive ? "600" : "400" }}>
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Status Badge */}
        <View
          style={{
            backgroundColor: currentStatus.bg,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1.5,
            borderColor: currentStatus.border,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          <StatusIcon size={40} color={currentStatus.iconColor} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: currentStatus.textColor,
                textAlign: isRTL ? "right" : "left",
                marginBottom: 4,
              }}
            >
              {currentStatus.label}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: currentStatus.textColor,
                opacity: 0.75,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {status === "verified"
                ? "حسابك موثّق بالكامل"
                : status === "pending"
                ? "جاري مراجعة مستنداتك"
                : "لم يتم التحقق من حسابك بعد"}
            </Text>
          </View>
        </View>

        {/* Required Documents */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#1A1A2E",
            marginBottom: 12,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {t("requiredDocuments")}
        </Text>
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            marginBottom: 20,
          }}
        >
          {DOCUMENTS.map((doc, i) => {
            const DocIcon = doc.icon;
            return (
              <View
                key={i}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i < DOCUMENTS.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: status === "verified" ? "#DCFCE7" : "#EBF0FA",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DocIcon size={18} color={status === "verified" ? "#16A34A" : "#1A3A6B"} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#1A1A2E",
                    fontWeight: "500",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {doc.label}
                </Text>
                {status === "verified" ? (
                  <CheckCircle size={18} color="#16A34A" />
                ) : (
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 2,
                      borderColor: "#E5E7EB",
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* How to Verify Card */}
        {status !== "verified" && (
          <View
            style={{
              backgroundColor: "#1A3A6B",
              borderRadius: 16,
              padding: 18,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#F5A623",
                marginBottom: 10,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("howToVerify")}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("howToVerifyBody")}
            </Text>
          </View>
        )}

        {/* Benefits of Verification */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#1A1A2E",
            marginBottom: 12,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {t("verificationBenefits")}
        </Text>
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            marginBottom: 24,
          }}
        >
          {BENEFITS.map((benefit, i) => {
            const BenIcon = benefit.icon;
            return (
              <View
                key={i}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i < BENEFITS.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "#FEF3C7",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BenIcon size={18} color="#F5A623" />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#374151",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {benefit.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Contact Support Button */}
        <TouchableOpacity
          onPress={openWhatsApp}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#25D366",
            borderRadius: 14,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: isRTL ? "row-reverse" : "row",
            gap: 10,
          }}
        >
          <MessageCircle size={20} color="#FFFFFF" />
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
            {t("contactSupportWhatsApp")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}