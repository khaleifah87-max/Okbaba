import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, User, Mail, Lock, Eye, EyeOff, MapPin, Check } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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

import OkBabaLogo from "@/components/OkBabaLogo";

export default function RegisterCustomerScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCityModal, setShowCityModal] = useState(false);

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleRegister() {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }
    if (!validateEmail(email)) {
      setError(t("invalidEmail"));
      return;
    }
    if (!password) {
      setError(t("passwordRequired"));
      return;
    }
    if (password.length < 6) {
      setError(t("weakPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!location) {
      setError(t("selectCity"));
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered") ||
            signUpError.message.toLowerCase().includes("user already exists")) {
          setError("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Insert into profiles
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: name.trim(),
          phone: "",
          location: location,
          user_type: "customer",
        });

        if (profileError) {
          const isDuplicate =
            profileError.message.includes("duplicate") ||
            profileError.code === "23505";
          if (!isDuplicate) {
            setError(profileError.message);
            setLoading(false);
            return;
          }
        }

        await refreshProfile();
        router.replace("/(customer)");
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
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
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <ChevronLeft size={22} color="#1A3A6B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
              {/* Title */}
              {/* Logo */}
              <View style={{ alignItems: "center", marginBottom: 16, marginTop: 4 }}>
                <OkBabaLogo width={140} />
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: "#1A1A2E",
                  marginBottom: 6,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("iAmCustomer")}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: "#6B7280",
                  marginBottom: 32,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("customerSubtitle")}
              </Text>

              {/* Form Card */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                  marginBottom: 24,
                }}
              >
                {/* Full Name */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("fullName")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 14,
                    height: 52,
                    marginBottom: 16,
                  }}
                >
                  <User size={18} color="#1A3A6B" />
                  <TextInput
                    value={name}
                    onChangeText={(v) => { setName(v); setError(""); }}
                    placeholder={t("enterName")}
                    placeholderTextColor="#9CA3AF"
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: "#1A1A2E",
                      marginLeft: isRTL ? 0 : 10,
                      marginRight: isRTL ? 10 : 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                </View>

                {/* Email */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("email")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 14,
                    height: 52,
                    marginBottom: 16,
                  }}
                >
                  <Mail size={18} color="#1A3A6B" />
                  <TextInput
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(""); }}
                    placeholder={t("enterEmail")}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: "#1A1A2E",
                      marginLeft: isRTL ? 0 : 10,
                      marginRight: isRTL ? 10 : 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                </View>

                {/* Password */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("password")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 14,
                    height: 52,
                    marginBottom: 16,
                  }}
                >
                  <Lock size={18} color="#1A3A6B" />
                  <TextInput
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(""); }}
                    placeholder={t("enterPassword")}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: "#1A1A2E",
                      marginLeft: isRTL ? 0 : 10,
                      marginRight: isRTL ? 10 : 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={{ padding: 4 }}>
                    {showPassword ? <EyeOff size={18} color="#6B7280" /> : <Eye size={18} color="#6B7280" />}
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("confirmPassword")}
                </Text>
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 14,
                    height: 52,
                    marginBottom: 16,
                  }}
                >
                  <Lock size={18} color="#1A3A6B" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); setError(""); }}
                    placeholder={t("enterConfirmPassword")}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: "#1A1A2E",
                      marginLeft: isRTL ? 0 : 10,
                      marginRight: isRTL ? 10 : 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} style={{ padding: 4 }}>
                    {showConfirmPassword ? <EyeOff size={18} color="#6B7280" /> : <Eye size={18} color="#6B7280" />}
                  </TouchableOpacity>
                </View>

                {/* City Selector */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("selectCity")}
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: location ? "#1A3A6B" : "#E5E7EB",
                    paddingHorizontal: 14,
                    height: 52,
                  }}
                  onPress={() => setShowCityModal(true)}
                >
                  <MapPin size={18} color="#1A3A6B" />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: location ? "#1A1A2E" : "#9CA3AF",
                      marginLeft: isRTL ? 0 : 10,
                      marginRight: isRTL ? 10 : 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {location || t("selectCity")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error */}
              {!!error && (
                <View
                  style={{
                    backgroundColor: "#FEE2E2",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ color: "#DC2626", fontSize: 14, textAlign: isRTL ? "right" : "left" }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Primary Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: "#1A3A6B",
                  borderRadius: 14,
                  height: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#1A3A6B",
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 4,
                  opacity: loading ? 0.7 : 1,
                }}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>
                    {t("createAccount")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* City Modal */}
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
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 16, textAlign: isRTL ? "right" : "left" }}>
              {t("selectCity")}
            </Text>
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city}
                onPress={() => { setLocation(city); setShowCityModal(false); }}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <Text style={{ flex: 1, fontSize: 16, color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                  {city}
                </Text>
                {location === city && <Check size={20} color="#1A3A6B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}