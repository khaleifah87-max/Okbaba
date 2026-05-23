import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Check, ChevronRight, Globe, Info, Shield, FileText, Headphones, Star, X, Lock, Trash2 } from "lucide-react-native";
import { useTranslation, Language } from "@/lib/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const LANG_STORAGE_KEY = "app_language";
const APP_VERSION = "1.0.0";

const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو" },
];

interface SettingsScreenProps {
  accentColor?: string;
}

export default function SettingsScreen({ accentColor = "#1A3A6B" }: SettingsScreenProps) {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);
  const router = useRouter();
  const { signOut } = useAuth();

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // Delete Account state
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Persist language selection
  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((stored) => {
      if (stored && stored !== language) {
        setLanguage(stored as Language);
      }
    });
  }, []);

  const handleSetLanguage = async (lang: Language) => {
    setLanguage(lang);
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const handleContactSupport = () => {
    const url = "https://wa.me/971501234567";
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open WhatsApp.");
    });
  };

  const handleRateApp = () => {
    Alert.alert(t("rateApp"), t("comingSoon"));
  };

  const handleChangePassword = () => {
    setNewPassword("");
    setConfirmPwd("");
    setPwdError("");
    setShowPasswordModal(true);
  };

  const handleSubmitPassword = async () => {
    if (!newPassword.trim()) {
      setPwdError(t("passwordRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setPwdError(t("weakPassword"));
      return;
    }
    if (newPassword !== confirmPwd) {
      setPwdError(t("passwordMismatch"));
      return;
    }
    setPwdLoading(true);
    setPwdError("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setShowPasswordModal(false);
      Alert.alert("✅", t("passwordChanged"));
    } catch (e: any) {
      setPwdError(e.message ?? "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("deleteAccount"),
      t("confirmDelete"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("deleteAccount"),
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              const { error } = await supabase.rpc("delete_user_account");
              if (error) throw new Error(error.message);
              await signOut();
              Alert.alert("✅", t("accountDeleted"));
            } catch (e: any) {
              Alert.alert("❌", e.message ?? "Failed to delete account.");
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ]
    );
  };

  const openModal = (title: string, body: string) => {
    setModalContent({ title, body });
  };

  const PRIVACY_TEXT = `Privacy Policy

Last updated: January 2025

Ok Baba ("we", "our", or "us") is committed to protecting your personal information.

Information We Collect
We collect information you provide directly, such as your name, phone number, location, and payment information when you use our services.

How We Use Your Information
We use the information to provide and improve our services, process transactions, communicate with you, and comply with legal obligations.

Data Security
We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.

Contact Us
If you have questions about this Privacy Policy, contact us at: support@okbaba.ae`;

  const TERMS_TEXT = `Terms of Service

Last updated: January 2025

Welcome to Ok Baba. By using our platform, you agree to these terms.

1. Service Description
Ok Baba connects customers with professional technicians for home and business services in the UAE.

2. User Responsibilities
Users must provide accurate information, treat service providers respectfully, and pay for services rendered.

3. Technician Responsibilities
Technicians must maintain valid licenses, provide quality service, and adhere to agreed schedules.

4. Payment Terms
Payments are processed securely. Disputes must be raised within 48 hours of service completion.

5. Limitation of Liability
Ok Baba acts as an intermediary and is not liable for the quality of services provided by independent technicians.

Contact: support@okbaba.ae`;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      {/* Header */}
      <View style={{ backgroundColor: accentColor, paddingBottom: 20 }}>
        <SafeAreaView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>{t("settings")}</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Language Section */}
        <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Globe size={16} color="#6B7280" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("language")}
            </Text>
          </View>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            {LANGUAGES.map((lang, idx) => {
              const isActive = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleSetLanguage(lang.code)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: idx < LANGUAGES.length - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                    backgroundColor: isActive ? "#EBF0FA" : "#FFFFFF",
                  }}
                >
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isActive ? accentColor : "#F3F4F6",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: isActive ? "#FFFFFF" : "#6B7280" }}>
                        {lang.code.toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: isActive ? accentColor : "#1A1A2E" }}>
                        {lang.nativeLabel}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{lang.label}</Text>
                    </View>
                  </View>
                  {isActive && <Check size={18} color={accentColor} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* App Info Section */}
        <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Info size={16} color="#6B7280" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("appVersion")}
            </Text>
          </View>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            {/* App Version */}
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomColor: "#F3F4F6",
              borderBottomWidth: 1,
            }}>
              <Text style={{ fontSize: 15, color: "#1A1A2E", fontWeight: "500" }}>{t("appVersion")}</Text>
              <Text style={{ fontSize: 14, color: "#9CA3AF", fontWeight: "600" }}>v{APP_VERSION}</Text>
            </View>

            {/* Privacy Policy */}
            <TouchableOpacity
              onPress={() => router.push("/legal/privacy")}
              activeOpacity={0.7}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomColor: "#F3F4F6",
                borderBottomWidth: 1,
              }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <Shield size={18} color="#6B7280" />
                <Text style={{ fontSize: 15, color: "#1A1A2E", fontWeight: "500" }}>{t("privacyPolicy")}</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Terms of Service */}
            <TouchableOpacity
              onPress={() => router.push("/legal/terms")}
              activeOpacity={0.7}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomColor: "#F3F4F6",
                borderBottomWidth: 1,
              }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <FileText size={18} color="#6B7280" />
                <Text style={{ fontSize: 15, color: "#1A1A2E", fontWeight: "500" }}>{t("termsOfService")}</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Contact Support */}
            <TouchableOpacity
              onPress={handleContactSupport}
              activeOpacity={0.7}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomColor: "#F3F4F6",
                borderBottomWidth: 1,
              }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <Headphones size={18} color="#6B7280" />
                <Text style={{ fontSize: 15, color: "#1A1A2E", fontWeight: "500" }}>{t("contactSupport")}</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Rate the App */}
            <TouchableOpacity
              onPress={handleRateApp}
              activeOpacity={0.7}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <Star size={18} color="#F5A623" />
                <Text style={{ fontSize: 15, color: "#1A1A2E", fontWeight: "500" }}>{t("rateApp")}</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App branding footer */}
        <View style={{ alignItems: "center", marginTop: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: accentColor }}>Ok Baba</Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Your trusted service marketplace in the UAE</Text>
          <Text style={{ fontSize: 11, color: "#D1D5DB", marginTop: 8 }}>© 2025 Ok Baba. All rights reserved.</Text>
        </View>

        {/* Account Management Section */}
        <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Lock size={16} color="#6B7280" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("changePassword")}
            </Text>
          </View>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <TouchableOpacity
              onPress={handleChangePassword}
              activeOpacity={0.7}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <Lock size={18} color="#6B7280" />
                <Text style={{ fontSize: 15, color: "#1A1A2E", fontWeight: "500" }}>{t("changePassword")}</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Account */}
        <View style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 32 }}>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deleteLoading}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: "#FCA5A5",
            }}
          >
            {deleteLoading ? (
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <>
                <Trash2 size={18} color="#DC2626" />
                <Text style={{ color: "#DC2626", fontSize: 15, fontWeight: "700" }}>{t("deleteAccount")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={!!modalContent}
        transparent
        animationType="slide"
        onRequestClose={() => setModalContent(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "85%",
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E" }}>
                {modalContent?.title}
              </Text>
              <TouchableOpacity onPress={() => setModalContent(null)} activeOpacity={0.7}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {/* Modal Body */}
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <Text style={{ fontSize: 14, color: "#374151", textAlign: isRTL ? "right" : "left" }}>
                {modalContent?.body}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E" }}>{t("changePassword")}</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} activeOpacity={0.7}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>{t("newPassword")}</Text>
            <TextInput
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); setPwdError(""); }}
              placeholder={t("newPassword")}
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              style={{ backgroundColor: "#F5F7FA", borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", paddingHorizontal: 14, height: 50, fontSize: 15, color: "#1A1A2E", marginBottom: 14 }}
            />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>{t("confirmPassword")}</Text>
            <TextInput
              value={confirmPwd}
              onChangeText={(v) => { setConfirmPwd(v); setPwdError(""); }}
              placeholder={t("confirmPassword")}
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              style={{ backgroundColor: "#F5F7FA", borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", paddingHorizontal: 14, height: 50, fontSize: 15, color: "#1A1A2E", marginBottom: pwdError ? 8 : 20 }}
            />
            {!!pwdError && (
              <View style={{ backgroundColor: "#FEE2E2", borderRadius: 8, padding: 10, marginBottom: 14 }}>
                <Text style={{ color: "#DC2626", fontSize: 13 }}>{pwdError}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleSubmitPassword}
              disabled={pwdLoading}
              activeOpacity={0.85}
              style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
            >
              {pwdLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{t("changePassword")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}