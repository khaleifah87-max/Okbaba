import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Mail, Lock, Eye, EyeOff, AlertTriangle, Phone } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_ATTEMPTS = 5;
import OkBabaLogo from "@/components/OkBabaLogo";
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const LOCKOUT_KEY = "login_lockout";

interface LockoutData {
  attempts: number;
  lockedUntil: number | null;
}

export default function LoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Brute force protection
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load lockout state on mount
  useEffect(() => {
    AsyncStorage.getItem(LOCKOUT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const data: LockoutData = JSON.parse(raw);
        setAttempts(data.attempts);
        if (data.lockedUntil && data.lockedUntil > Date.now()) {
          setLockedUntil(data.lockedUntil);
        } else if (data.lockedUntil && data.lockedUntil <= Date.now()) {
          // Lockout expired — reset
          const reset: LockoutData = { attempts: 0, lockedUntil: null };
          AsyncStorage.setItem(LOCKOUT_KEY, JSON.stringify(reset));
          setAttempts(0);
          setLockedUntil(null);
        }
      } catch {}
    });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) {
      if (timerRef.current) clearInterval(timerRef.current);
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        const reset: LockoutData = { attempts: 0, lockedUntil: null };
        AsyncStorage.setItem(LOCKOUT_KEY, JSON.stringify(reset));
        if (timerRef.current) clearInterval(timerRef.current);
        setSecondsLeft(0);
      } else {
        setSecondsLeft(remaining);
      }
    };

    update();
    timerRef.current = setInterval(update, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockedUntil]);

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function recordFailedAttempt() {
    const newAttempts = attempts + 1;
    let newLockedUntil: number | null = null;

    if (newAttempts >= MAX_ATTEMPTS) {
      newLockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      setLockedUntil(newLockedUntil);
    }

    setAttempts(newAttempts);

    const data: LockoutData = { attempts: newAttempts, lockedUntil: newLockedUntil };
    await AsyncStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
  }

  async function clearLockout() {
    setAttempts(0);
    setLockedUntil(null);
    await AsyncStorage.removeItem(LOCKOUT_KEY);
  }

  async function handleLogin() {
    // Check lockout
    if (lockedUntil && lockedUntil > Date.now()) {
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

    setError("");
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        // Friendly error messages
        const msg = signInError.message.toLowerCase();
        if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong")) {
          setError(t("loginErrorInvalidCredentials"));
        } else if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setError(t("loginErrorEmailNotConfirmed"));
        } else if (msg.includes("network") || msg.includes("fetch")) {
          setError(t("loginErrorNetwork"));
        } else {
          setError(signInError.message);
        }

        await recordFailedAttempt();
        setLoading(false);
        return;
      }

      if (data.user) {
        // Successful login — clear lockout
        await clearLockout();

        // Fetch profile to determine user_type
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profileData) {
          setError(t("loginErrorInvalidCredentials"));
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (profileData.user_type === "technician") {
          router.replace("/(technician)");
        } else if (
          profileData.user_type === "admin" ||
          profileData.user_type === "support" ||
          profileData.user_type === "finance"
        ) {
          router.replace("/(admin)");
        } else {
          router.replace("/(customer)");
        }
      }
    } catch (e: any) {
      const msg = (e.message ?? "").toLowerCase();
      if (msg.includes("network") || msg.includes("fetch")) {
        setError(t("loginErrorNetwork"));
      } else {
        setError(e.message ?? "Something went wrong");
      }
      await recordFailedAttempt();
    } finally {
      setLoading(false);
    }
  }

  const isLocked = !!(lockedUntil && lockedUntil > Date.now());
  const minutesLeft = Math.floor(secondsLeft / 60);
  const secsLeft = secondsLeft % 60;
  const attemptsRemaining = MAX_ATTEMPTS - attempts;
  const showWarning = attempts >= 3 && !isLocked;

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

            {/* Content */}
            <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
              {/* Logo circle */}
              {/* Logo */}
              <View style={{ alignItems: "center", marginBottom: 24, marginTop: 4 }}>
                <OkBabaLogo width={170} />
              </View>
              {/* Sign-in heading */}
              <View style={{ alignItems: isRTL ? "flex-end" : "flex-start", marginBottom: 32 }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "800",
                    color: "#1A1A2E",
                    marginBottom: 8,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("signIn")}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: "#6B7280",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("enterEmail")}
                </Text>
              </View>

              {/* Lockout Banner */}
              {isLocked && (
                <View
                  style={{
                    backgroundColor: "#FEF2F2",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: "#FCA5A5",
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <AlertTriangle size={22} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#DC2626",
                        fontWeight: "700",
                        fontSize: 14,
                        textAlign: isRTL ? "right" : "left",
                        marginBottom: 4,
                      }}
                    >
                      {t("accountLocked")}
                    </Text>
                    <Text
                      style={{
                        color: "#EF4444",
                        fontSize: 13,
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {t("lockedMinutes")}{" "}
                      {minutesLeft > 0 ? `${minutesLeft} ${t("minutes")} ` : ""}
                      {secsLeft} {t("seconds")}
                    </Text>
                  </View>
                </View>
              )}

              {/* Attempt Warning */}
              {showWarning && (
                <View
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: "#FDE68A",
                  }}
                >
                  <Text
                    style={{
                      color: "#D97706",
                      fontSize: 13,
                      fontWeight: "600",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {attemptsRemaining} {t("attemptsRemaining")}
                  </Text>
                </View>
              )}

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
                  opacity: isLocked ? 0.5 : 1,
                }}
              >
                {/* Email Field */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#6B7280",
                    marginBottom: 8,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
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
                    editable={!isLocked}
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

                {/* Password Field */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#6B7280",
                    marginBottom: 8,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
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
                  }}
                >
                  <Lock size={18} color="#1A3A6B" />
                  <TextInput
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(""); }}
                    placeholder={t("enterPassword")}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    editable={!isLocked}
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
                    {showPassword ? (
                      <EyeOff size={18} color="#6B7280" />
                    ) : (
                      <Eye size={18} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                </View>
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
                  backgroundColor: isLocked ? "#9CA3AF" : "#F5A623",
                  borderRadius: 14,
                  height: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#F5A623",
                  shadowOpacity: isLocked ? 0 : 0.35,
                  shadowRadius: 10,
                  elevation: isLocked ? 0 : 4,
                  marginBottom: 24,
                  opacity: loading ? 0.7 : 1,
                }}
                onPress={handleLogin}
                disabled={loading || isLocked}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>
                    {isLocked ? `${minutesLeft}:${String(secsLeft).padStart(2, "0")}` : t("signIn")}
                  </Text>
                )}
              </TouchableOpacity>

             {/* Phone Login Button */}
<TouchableOpacity
  style={{
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1A3A6B",
    marginBottom: 24,
    flexDirection: "row",
    gap: 8,
  }}
  onPress={() => router.push("/auth/phone-login")}
>
  <Phone size={20} color="#1A3A6B" />
  <Text style={{ fontSize: 16, fontWeight: "700", color: "#1A3A6B" }}>
    تسجيل الدخول برقم الهاتف
  </Text>
</TouchableOpacity> {/* Register Link */}
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#6B7280", fontSize: 14 }}>
                  {t("alreadyHaveAccount")}{" "}
                  <Text
                    onPress={() => router.push("/auth/welcome")}
                    style={{ color: "#1A3A6B", fontWeight: "700" }}
                  >
                    {t("register")}
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
