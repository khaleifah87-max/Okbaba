import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";

function SectionCard({ title, body }: { title: string; body: string }) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#1A3A6B",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: "#374151",
        }}
      >
        {body}
      </Text>
    </View>
  );
}

export default function TermsOfUseScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

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
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, flex: 1 }}>
              <FileText size={20} color="#F5A623" />
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF" }}>
                {t("termsOfUse")}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Last updated */}
        <Text
          style={{
            fontSize: 12,
            color: "#9CA3AF",
            marginBottom: 20,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {t("lastUpdated")}: يناير 2025 — January 2025
        </Text>

        {/* Intro */}
        <View
          style={{
            backgroundColor: "#EBF0FA",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            borderLeftWidth: isRTL ? 0 : 4,
            borderRightWidth: isRTL ? 4 : 0,
            borderLeftColor: "#F5A623",
            borderRightColor: "#F5A623",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: "#1A3A6B",
              fontWeight: "500",
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("termsIntro")}
          </Text>
        </View>

        <SectionCard title={t("termsPlatformTitle")} body={t("termsPlatformBody")} />
        <SectionCard title={t("termsContractorsTitle")} body={t("termsContractorsBody")} />
        <SectionCard title={t("termsPaymentsTitle")} body={t("termsPaymentsBody")} />
        <SectionCard title={t("termsQualityTitle")} body={t("termsQualityBody")} />
        <SectionCard title={t("termsSuspensionTitle")} body={t("termsSuspensionBody")} />

        {/* Governing law */}
        <View
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: "#92400E",
              fontWeight: "500",
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("termsGoverningLaw")}
          </Text>
        </View>
      </ScrollView>

      {/* Accept button */}
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
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#F5A623",
            borderRadius: 14,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
            {t("acceptAndContinue")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}