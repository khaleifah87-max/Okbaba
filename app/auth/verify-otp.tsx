import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import OkBabaLogo from "@/components/OkBabaLogo";

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { phone, mode, name, location } = useLocalSearchParams<{
    phone: string;
    mode: "login" | "register";
    name?: string;
    location?: string;
  }>();
  const { isRTL } = useTranslation();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(text: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join("");
    if (code.length < 6) {
      setError("أدخل الرمز المكون من 6 أرقام");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone,
        token: code,
        type: "sms",
      });

      if (verifyError) {
        setError("الرمز غير صحيح أو انتهت صلاحيته");
        setLoading(false);
        return;
      }

      if (data.user) {
        if (mode === "register") {
          // إنشاء profile جديد
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              full_name: name ?? "",
              phone: phone,
              location: location ?? "",
              user_type: "customer",
            });

          if (profileError && !profileError.message.includes("duplicate")) {
            setError(profileError.message);
            setLoading(false);
            return;
          }
          router.replace("/(customer)");
        } else {
          // تسجيل دخول - تحقق من نوع المستخدم
          const { data: profileData } = await supabase
            .from("profiles")
            .select("user_type")
            .eq("id", data.user.id)
            .single();

          if (profileData?.user_type === "technician") {
            router.replace("/(technician)");
          } else if (["admin", "support", "finance"].includes(profileData?.user_type)) {
            router.replace("/(admin)");
          } else {
            router.replace("/(customer)");
          }
        }
      }
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    await supabase.auth.signInWithOtp({ phone });
    setError("");
    setOtp(["", "", "", "", "", ""]);
    inputs.current[0]?.focus();
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", paddingHorizontal: 16,
          paddingTop: 16, paddingBottom: 8,
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
            <OkBabaLogo width={150} />
          </View>

          <Text style={{
            fontSize: 26, fontWeight: "800", color: "#1A1A2E",
            marginBottom: 8, textAlign: "center",
          }}>
            أدخل رمز التحقق
          </Text>
          <Text style={{
            fontSize: 15, color: "#6B7280", marginBottom: 8,
            textAlign: "center",
          }}>
            تم إرسال رمز مكون من 6 أرقام إلى
          </Text>
          <Text style={{
            fontSize: 16, fontWeight: "700", color: "#1A3A6B",
            marginBottom: 40, textAlign: "center",
          }}>
            {phone}
          </Text>

          {/* OTP Inputs */}
          <View style={{
            flexDirection: "row", justifyContent: "center",
            gap: 10, marginBottom: 32,
          }}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputs.current[index] = ref; }}
                value={digit}
                onChangeText={(text) => handleChange(text.slice(-1), index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                style={{
                  width: 48, height: 56, borderRadius: 12,
                  backgroundColor: "#FFFFFF", textAlign: "center",
                  fontSize: 22, fontWeight: "700", color: "#1A1A2E",
                  borderWidth: 2,
                  borderColor: digit ? "#1A3A6B" : "#E5E7EB",
                  elevation: 2,
                }}
              />
            ))}
          </View>

          {!!error && (
            <View style={{
              backgroundColor: "#FEE2E2", borderRadius: 10,
              padding: 12, marginBottom: 16,
            }}>
              <Text style={{ color: "#DC2626", fontSize: 14, textAlign: "center" }}>
                {error}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: "#F5A623", borderRadius: 14,
              height: 54, alignItems: "center", justifyContent: "center",
              elevation: 4, opacity: loading ? 0.7 : 1, marginBottom: 16,
            }}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>
                تحقق
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} style={{ alignItems: "center" }}>
            <Text style={{ color: "#1A3A6B", fontSize: 14, fontWeight: "600" }}>
              إعادة إرسال الرمز
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
