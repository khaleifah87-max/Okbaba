import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Phone } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import OkBabaLogo from "@/components/OkBabaLogo";

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOTP() {
    const cleaned = phone.trim();
    if (!cleaned) {
      setError("أدخل رقم الهاتف");
      return;
    }
    // تأكد أن الرقم يبدأ بـ +
    const formatted = cleaned.startsWith("+") ? cleaned : `+971${cleaned}`;

    setError("");
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formatted,
      });
      if (otpError) {
        setError(otpError.message);
        return;
      }
      // انتقل لشاشة التحقق
      router.push({
        pathname: "/auth/verify-otp",
        params: { phone: formatted, mode: "login" },
      });
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 8,
            }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: "#FFFFFF", alignItems: "center",
                  justifyContent: "center", elevation: 2,
                }}
              >
                <ChevronLeft size={22} color="#1A3A6B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <OkBabaLogo width={170} />
              </View>

              <Text style={{
                fontSize: 28, fontWeight: "800", color: "#1A1A2E",
                marginBottom: 8, textAlign: isRTL ? "right" : "left",
              }}>
                تسجيل الدخول برقم الهاتف
              </Text>
              <Text style={{
                fontSize: 15, color: "#6B7280", marginBottom: 32,
                textAlign: isRTL ? "right" : "left",
              }}>
                سنرسل لك رمز تحقق عبر SMS
              </Text>

              {/* Form */}
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 16,
                padding: 20, elevation: 3, marginBottom: 24,
              }}>
                <Text style={{
                  fontSize: 13, fontWeight: "600", color: "#6B7280",
                  marginBottom: 8, textAlign: isRTL ? "right" : "left",
                }}>
                  رقم الهاتف
                </Text>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", backgroundColor: "#F5F7FA",
                  borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB",
                  paddingHorizontal: 14, height: 52,
                }}>
                  <Phone size={18} color="#1A3A6B" />
                  <TextInput
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setError(""); }}
                    placeholder="+971501234567"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    style={{
                      flex: 1, fontSize: 15, color: "#1A1A2E",
                      marginLeft: isRTL ? 0 : 10,
                      marginRight: isRTL ? 10 : 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                </View>
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>
                  مثال: +971501234567 أو 0501234567
                </Text>
              </View>

              {!!error && (
                <View style={{
                  backgroundColor: "#FEE2E2", borderRadius: 10,
                  padding: 12, marginBottom: 16,
                }}>
                  <Text style={{ color: "#DC2626", fontSize: 14 }}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={{
                  backgroundColor: "#F5A623", borderRadius: 14,
                  height: 54, alignItems: "center", justifyContent: "center",
                  elevation: 4, opacity: loading ? 0.7 : 1, marginBottom: 24,
                }}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>
                    إرسال رمز التحقق
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
