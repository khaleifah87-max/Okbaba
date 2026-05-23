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
  Modal,
  ActivityIndicator,
} from "react-native";
import { Image } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, User, Mail, Lock, Eye, EyeOff, MapPin, Briefcase, Camera, Check } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as ImagePicker from "expo-image-picker";

const PROFESSIONS = [
  "plumber",
  "electrician",
  "acTechnician",
  "cleaner",
  "carpenter",
  "painter",
  "handyman",
] as const;

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

export default function RegisterTechnicianScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState("");
  const [profession, setProfession] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showProfessionModal, setShowProfessionModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [emiratesIdUri, setEmiratesIdUri] = useState<string | null>(null);

  async function pickEmiratesId() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      // Try camera as fallback
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus.status !== "granted") {
        setError("يرجى السماح بالوصول إلى الصور أو الكاميرا");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [16, 9],
      });
      if (!result.canceled && result.assets[0]) {
        setEmiratesIdUri(result.assets[0].uri);
        setError("");
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setEmiratesIdUri(result.assets[0].uri);
      setError("");
    }
  }

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
    if (!profession) {
      setError(t("selectProfession"));
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
        if (
          signUpError.message.toLowerCase().includes("already registered") ||
          signUpError.message.toLowerCase().includes("user already exists")
        ) {
          setError("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        const userId = data.user.id;

        // Step 1: Insert into profiles
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          full_name: name.trim(),
          phone: "",
          location: location,
          user_type: "technician",
        });

        if (profileError) {
          const isDuplicate =
            profileError.message.includes("duplicate") ||
            profileError.code === "23505";
          if (!isDuplicate) {
            // Rollback: sign out so the user can retry
            await supabase.auth.signOut();
            setError("فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.");
            setLoading(false);
            return;
          }
        }

        // Step 2: Insert into technician_profiles (with rollback on failure)
        const { error: techError } = await supabase.from("technician_profiles").insert({
          id: userId,
          profession: profession,
          is_available: true,
          is_verified: false,
        });

        if (techError) {
          const isDuplicate =
            techError.message.includes("duplicate") ||
            techError.code === "23505";
          if (!isDuplicate) {
            // Rollback: delete the profiles row and sign out
            await supabase.from("profiles").delete().eq("id", userId);
            await supabase.auth.signOut();
            setError("فشل إنشاء ملف الفني. يرجى المحاولة مرة أخرى.");
            setLoading(false);
            return;
          }
        }

        // DB trigger will auto-create the 45-day trial subscription
        await refreshProfile();
        router.replace("/(technician)");
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
                {t("iAmWorker")}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: "#6B7280",
                  marginBottom: 24,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("workerSubtitle")}
              </Text>

              {/* Trial Banner */}
              <View
                style={{
                  backgroundColor: "rgba(245,166,35,0.12)",
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#F5A623",
                  marginBottom: 20,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 20, marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }}>🎁</Text>
                <Text style={{ fontSize: 14, color: "#1A1A2E", fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
                  {t("freeTrial")} — 45 {t("daysRemaining")}
                </Text>
              </View>

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
                {/* Name */}
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

                {/* Profession */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("profession")}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowProfessionModal(true)}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: profession ? "#1A3A6B" : "#E5E7EB",
                    paddingHorizontal: 14,
                    height: 52,
                    marginBottom: 16,
                  }}
                >
                  <Briefcase size={18} color="#1A3A6B" />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: profession ? "#1A1A2E" : "#9CA3AF",
                      marginLeft: isRTL ? 0 : 10,
                      marginRight: isRTL ? 10 : 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {profession ? t(profession as any) : t("selectProfession")}
                  </Text>
                </TouchableOpacity>

                {/* Location */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("selectCity")}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCityModal(true)}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: location ? "#1A3A6B" : "#E5E7EB",
                    paddingHorizontal: 14,
                    height: 52,
                    marginBottom: 16,
                  }}
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

                {/* Emirates ID (optional upload, UI only for now) */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                  {t("emiratesId")}
                </Text>
                <TouchableOpacity
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#F5F7FA",
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: emiratesIdUri ? "#1A3A6B" : "#E5E7EB",
                    borderStyle: "dashed",
                    height: 80,
                    gap: 6,
                  }}
                  onPress={pickEmiratesId}
                >
                  {emiratesIdUri ? (
                    <>
                      <Image
                        source={{ uri: emiratesIdUri }}
                        style={{ width: "100%", height: 76, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                    </>
                  ) : (
                    <>
                      <Camera size={24} color="#1A3A6B" />
                      <Text style={{ fontSize: 13, color: "#1A3A6B", fontWeight: "600" }}>
                        📷 اضغط لرفع صورة الهوية
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {/* end id upload */}
                {/* id uploaded */}
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
                  backgroundColor: "#F5A623",
                  borderRadius: 14,
                  height: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#F5A623",
                  shadowOpacity: 0.35,
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

      {/* Profession Modal */}
      <Modal
        visible={showProfessionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfessionModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setShowProfessionModal(false)}
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
              {t("selectProfession")}
            </Text>
            {PROFESSIONS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => { setProfession(p); setShowProfessionModal(false); }}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <Text style={{ flex: 1, fontSize: 16, color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                  {t(p as any)}
                </Text>
                {profession === p && <Check size={20} color="#1A3A6B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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