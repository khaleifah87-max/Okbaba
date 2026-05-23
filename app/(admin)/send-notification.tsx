import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Bell, Send } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Target = "all" | "customers" | "technicians";

export default function SendNotificationScreen() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();

  const [target, setTarget] = useState<Target>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  async function handleSend() {
    if (!title.trim()) {
      Alert.alert("خطأ", "يرجى إدخال عنوان الإشعار");
      return;
    }
    if (!message.trim()) {
      Alert.alert("خطأ", "يرجى إدخال نص الإشعار");
      return;
    }

    setSending(true);
    try {
      // Log the notification action
      if (profile?.id) {
        await supabase.from("admin_logs").insert({
          admin_id: profile.id,
          action: `إرسال إشعار جماعي: ${title}`,
          target_type: target,
          details: { title, message, target } as any,
        });
      }

      // Show success — notifications table doesn't exist in schema yet
      Alert.alert(
        "✅ تم الإرسال",
        "تم إرسال الإشعار بنجاح (محاكاة)",
        [{ text: "حسناً", onPress: () => { setTitle(""); setMessage(""); } }]
      );
    } catch (e) {
      Alert.alert("خطأ", "فشل إرسال الإشعار. يرجى المحاولة مرة أخرى.");
    } finally {
      setSending(false);
    }
  }

  const targetOptions: { key: Target; label: string }[] = [
    { key: "all", label: t("sendToAll") },
    { key: "customers", label: t("sendToCustomers") },
    { key: "technicians", label: t("sendToTechnicians") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Header */}
      <View style={{ backgroundColor: "#1A3A6B", paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
          >
            <BackIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFFFFF" }}>
            {t("sendNotification")}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Target Selection */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B", marginBottom: 12, textAlign: isRTL ? "right" : "left" }}>
              إرسال إلى
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {targetOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setTarget(opt.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: target === opt.key ? "#1A3A6B" : "#F5F7FA",
                    borderWidth: 1.5,
                    borderColor: target === opt.key ? "#1A3A6B" : "#E5E7EB",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: target === opt.key ? "#FFFFFF" : "#6B7280" }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title Input */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B", marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
              {t("notificationTitle")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="مثال: تحديث جديد!"
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#F5F7FA",
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
                padding: 14,
                fontSize: 15,
                color: "#1A1A2E",
                textAlign: isRTL ? "right" : "left",
              }}
            />
          </View>

          {/* Message Input */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A3A6B", marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
              {t("notificationMessage")}
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="اكتب رسالتك هنا..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              style={{
                backgroundColor: "#F5F7FA",
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
                padding: 14,
                fontSize: 15,
                color: "#1A1A2E",
                textAlign: isRTL ? "right" : "left",
                textAlignVertical: "top",
                minHeight: 120,
              }}
            />
          </View>

          {/* Preview */}
          {(title.trim() || message.trim()) && (
            <View style={{ backgroundColor: "#EEF2FF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#C7D2FE" }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Bell size={16} color="#1A3A6B" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#1A3A6B" }}>معاينة الإشعار</Text>
              </View>
              {title.trim() && (
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>{title}</Text>
              )}
              {message.trim() && (
                <Text style={{ fontSize: 13, color: "#4B5563", marginTop: 4, textAlign: isRTL ? "right" : "left" }}>{message}</Text>
              )}
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            style={{
              backgroundColor: "#F5A623",
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              shadowColor: "#F5A623",
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 4,
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#1A3A6B" />
            ) : (
              <>
                <Send size={20} color="#1A3A6B" />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#1A3A6B" }}>
                  {t("sendNotification")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}