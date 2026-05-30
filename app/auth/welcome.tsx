import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { UserCircle, Wrench } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import OkBabaLogo from "@/components/OkBabaLogo";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ar", label: "عر" },
  { code: "ur", label: "اردو" },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { t, language, setLanguage, isRTL } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: "#1A3A6B" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: Platform.OS === "android" ? 16 : 8,
          }}
        >
          {/* Language Switcher */}
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "flex-end",
              marginBottom: 32,
            }}
          >
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginLeft: isRTL ? 0 : 8,
                  marginRight: isRTL ? 8 : 0,
                  backgroundColor:
                    language === lang.code ? "#F5A623" : "rgba(255,255,255,0.15)",
                }}
              >
                <Text
                  style={{
                    color: language === lang.code ? "#1A3A6B" : "#FFFFFF",
                    fontWeight: language === lang.code ? "700" : "400",
                    fontSize: 13,
                  }}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logo Area */}
          <View style={{ alignItems: "center", marginBottom: 48 }}>
            <OkBabaLogo size={100} variant="full" dark={true} />
          </View>

          {/* Action Cards */}
          <View style={{ gap: 16, marginBottom: 32 }}>
            {/* Customer Card */}
            <TouchableOpacity
              onPress={() => router.push("/auth/register-customer")}
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.3)",
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: isRTL ? 0 : 16,
                  marginLeft: isRTL ? 16 : 0,
                }}
              >
                <UserCircle size={28} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#FFFFFF",
                    marginBottom: 4,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("iAmCustomer")}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("customerSubtitle")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Worker Card */}
            <TouchableOpacity
              onPress={() => router.push("/auth/register-technician")}
              style={{
                backgroundColor: "rgba(245,166,35,0.12)",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1.5,
                borderColor: "#F5A623",
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "rgba(245,166,35,0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: isRTL ? 0 : 16,
                  marginLeft: isRTL ? 16 : 0,
                }}
              >
                <Wrench size={28} color="#F5A623" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#F5A623",
                    marginBottom: 4,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("iAmWorker")}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(245,166,35,0.8)",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("workerSubtitle")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

        {/* Browse as Guest */}
<TouchableOpacity
  onPress={() => router.replace("/(customer)")}
  style={{
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  }}
>
  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" }}>
    تصفح بدون تسجيل 👀
  </Text>
</TouchableOpacity>
 {/* Sign In Link */}
          <View style={{ alignItems: "center", paddingBottom: 24 }}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              {t("alreadyHaveAccount")}{" "}
              <Text
                onPress={() => router.push("/auth/login")}
                style={{ color: "#F5A623", fontWeight: "700" }}
              >
                {t("signIn")}
              </Text>
            </Text>
          </View>

          {/* Terms & Privacy */}
          <View style={{ alignItems: "center", paddingBottom: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center" }}>
              {t("byClickingContinue")}{" "}
              <Text
                onPress={() => router.push("/legal/terms")}
                style={{ color: "rgba(245,166,35,0.8)", textDecorationLine: "underline" }}
              >
                {t("termsOfUse")}
              </Text>
              {"  &  "}
              <Text
                onPress={() => router.push("/legal/privacy")}
                style={{ color: "rgba(245,166,35,0.8)", textDecorationLine: "underline" }}
              >
                {t("privacyPolicy")}
              </Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
