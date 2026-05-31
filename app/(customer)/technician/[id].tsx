import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,Linking,
} from "react-native";

import { KeyboardAvoidingView } from "react-native";
import {
  ArrowLeft, Star, MapPin, CheckCircle, Clock,
  Wrench, DollarSign, MessageSquare, Shield, Phone,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#1A3A6B", "#7C3AED", "#059669", "#0891B2", "#D97706", "#DC2626", "#0D9488"];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ReviewStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} color="#F5A623" fill={s <= rating ? "#F5A623" : "transparent"} strokeWidth={1.5} />
      ))}
    </View>
  );
}

async function fetchTechnicianDetail(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      location,
      phone,
      technician_profiles (
        profession,
        rating,
        total_reviews,
        hourly_rate,
        bio,
        is_available,
        is_verified
      )
    `)
    .eq("id", id)
    .single();
  if (error) throw new Error("Failed to fetch technician");
  return data;
}

async function fetchTechnicianReviews(techId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      profiles!reviews_customer_id_fkey (
        full_name
      )
    `)
    .eq("technician_id", techId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return data ?? [];
}

export default function TechnicianDetailScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [showBookModal, setShowBookModal] = useState(false);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const timeSlots = [
    "8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM",
    "1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM",
  ];
  if (!user) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#1A1A2E", marginBottom: 8, textAlign: "center" }}>
        سجل دخولك أولاً
      </Text>
      <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 32, textAlign: "center" }}>
        للتواصل مع الفنيين يجب تسجيل الدخول
      </Text>
      <TouchableOpacity
        onPress={() => router.replace("/auth/welcome")}
        style={{ backgroundColor: "#1A3A6B", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>تسجيل الدخول</Text>
      </TouchableOpacity>
    </View>
  );
  }
  function buildISO(): string | null {
    if (selectedDay === null || !selectedTime) return null;
    const d = new Date(days[selectedDay]);
    const [time, ampm] = selectedTime.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  const { data: tech, isLoading, isError } = useQuery({
    queryKey: ["technician", id],
    queryFn: () => fetchTechnicianDetail(id!),
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["technician_reviews", id],
    queryFn: () => fetchTechnicianReviews(id!),
    enabled: !!id,
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!user || !tech) throw new Error("Not authenticated");
      if (selectedDay === null || !selectedTime) {
        throw new Error(t("selectDateTime"));
      }
      if (!address.trim()) {
        throw new Error(t("addressRequired"));
      }
      const tp = (tech as any).technician_profiles;
      const { error } = await supabase.from("bookings").insert({
        customer_id: user.id,
        technician_id: tech.id,
        service: tp?.profession ?? "General Service",
        address: address || null,
        notes: notes || null,
        scheduled_at: buildISO(),
        status: "pending",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setShowBookModal(false);
      Alert.alert("Booking Sent!", "Your booking request has been sent to the technician.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert("Booking Failed", err.message || "Unable to create booking. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        <View style={{
          backgroundColor: "#1A3A6B",
          paddingTop: insets.top + 16,
          paddingBottom: 20, paddingHorizontal: 20,
          flexDirection: "row", alignItems: "center", gap: 12,
        }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF" }}>Technician</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#1A3A6B" size="large" />
        </View>
      </View>
    );
  }

  if (isError || !tech) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        <View style={{
          backgroundColor: "#1A3A6B",
          paddingTop: insets.top + 16,
          paddingBottom: 20, paddingHorizontal: 20,
          flexDirection: "row", alignItems: "center", gap: 12,
        }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF" }}>Technician</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ color: "#DC2626", fontSize: 16 }}>Unable to load technician details.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: "#1A3A6B", fontWeight: "600" }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tp = (tech as any).technician_profiles;
  const color = getAvatarColor(tech.id);
  const initials = getInitials(tech.full_name);

  const avgRating =
    reviews.length > 0
      ? (reviews as any[]).reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      {/* Sticky scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={{ backgroundColor: "#1A3A6B", paddingTop: insets.top, paddingBottom: 40 }}>
          {/* Back button */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <ArrowLeft color="#FFFFFF" size={20} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF", flex: 1 }}>Technician Profile</Text>
          </View>

          {/* Avatar + Name */}
          <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
            <View style={{
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: color,
              alignItems: "center", justifyContent: "center",
              borderWidth: 4, borderColor: "rgba(255,255,255,0.3)",
              marginBottom: 14,
              shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
            }}>
              <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "800" }}>{initials}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>{tech.full_name}</Text>
              {tp?.is_verified && (
                <View style={{ backgroundColor: "#F5A623", borderRadius: 10, padding: 3 }}>
                  <Shield size={12} color="#FFFFFF" />
                </View>
              )}
            </View>

            <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
              {tp?.profession ?? "Technician"}
            </Text>

            {/* Availability badge */}
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: tp?.is_available ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
              borderWidth: 1, borderColor: tp?.is_available ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tp?.is_available ? "#10B981" : "#EF4444" }} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: tp?.is_available ? "#6EE7B7" : "#FCA5A5" }}>
                {tp?.is_available ? "Available Now" : "Currently Unavailable"}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row — pulled up from blue section */}
        <View style={{
          marginHorizontal: 20,
          marginTop: -20,
          backgroundColor: "#FFFFFF",
          borderRadius: 18,
          padding: 20,
          flexDirection: "row",
          shadowColor: "#1A3A6B",
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center", marginBottom: 4 }}>
              <Star color="#F5A623" size={16} fill="#F5A623" />
              <Text style={{ fontWeight: "800", fontSize: 20, color: "#1A1A2E" }}>
                {tp?.rating?.toFixed(1) ?? "—"}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Rating</Text>
          </View>
          <View style={{ width: 1, backgroundColor: "#F3F4F6" }} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontWeight: "800", fontSize: 20, color: "#1A1A2E", marginBottom: 4 }}>
              {tp?.total_reviews ?? 0}
            </Text>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>Reviews</Text>
          </View>
          <View style={{ width: 1, backgroundColor: "#F3F4F6" }} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 4 }}>
              <Text style={{ fontWeight: "800", fontSize: 18, color: "#1A3A6B" }}>
                {tp?.hourly_rate != null ? `${tp.hourly_rate}` : "—"}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>AED/hr</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
          {/* Location */}
          {tech.location && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14,
              shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={16} color="#1A3A6B" />
              </View>
              <View>
                <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginBottom: 2 }}>Location</Text>
                <Text style={{ color: "#374151", fontSize: 14, fontWeight: "600" }}>{tech.location}</Text>
              </View>
            </View>
          )}

          {/* Bio */}
          {tp?.bio ? (
            <View style={{
              backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
              shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={15} color="#1A3A6B" />
                </View>
                <Text style={{ fontWeight: "700", color: "#1A1A2E", fontSize: 15 }}>About</Text>
              </View>
              <Text style={{ color: "#6B7280", fontSize: 14 }}>{tp.bio}</Text>
            </View>
          ) : null}

          {/* Service Chips */}
          {tp?.profession && (
            <View style={{
              backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
              shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center" }}>
                  <Wrench size={15} color="#1A3A6B" />
                </View>
                <Text style={{ fontWeight: "700", color: "#1A1A2E", fontSize: 15 }}>Services Offered</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View style={{
                  backgroundColor: "#EBF0FA",
                  paddingHorizontal: 14, paddingVertical: 7,
                  borderRadius: 20, borderWidth: 1, borderColor: "#C7D8F5",
                }}>
                  <Text style={{ color: "#1A3A6B", fontWeight: "700", fontSize: 13 }}>{tp.profession}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Pricing */}
          {tp?.hourly_rate != null && (
            <View style={{
              backgroundColor: "#1A3A6B", borderRadius: 16, padding: 16,
              flexDirection: "row", alignItems: "center", gap: 12,
            }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(245,166,35,0.2)", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={20} color="#F5A623" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 2 }}>Hourly Rate</Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#F5A623" }}>AED {tp.hourly_rate}</Text>
              </View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>per hour</Text>
            </View>
          )}

          {/* Reviews Section */}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E" }}>Reviews</Text>
              {avgRating !== null && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Star size={13} color="#F5A623" fill="#F5A623" />
                  <Text style={{ fontWeight: "700", color: "#D97706", fontSize: 13 }}>
                    {avgRating.toFixed(1)}
                  </Text>
                  <Text style={{ color: "#D97706", fontSize: 12 }}>({reviews.length})</Text>
                </View>
              )}
            </View>

            {reviews.length === 0 ? (
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center",
                shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
                gap: 10,
              }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F5F7FA", alignItems: "center", justifyContent: "center" }}>
                  <Star size={24} color="#D1D5DB" />
                </View>
                <Text style={{ color: "#9CA3AF", fontSize: 14, fontWeight: "500" }}>{t("noReviews")}</Text>
                <Text style={{ color: "#D1D5DB", fontSize: 12, textAlign: "center" }}>
                  Be the first to review this technician
                </Text>
              </View>
            ) : (
              (reviews as any[]).map((review: any) => {
                const customerName = review.profiles?.full_name ?? "Customer";
                const reviewInitials = customerName
                  .split(" ")
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                const dateStr = review.created_at
                  ? new Date(review.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "";
                return (
                  <View
                    key={review.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 2,
                      borderWidth: 1,
                      borderColor: "#F0F2F5",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <View style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: "#1A3A6B",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>{reviewInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", color: "#1A1A2E", fontSize: 14 }}>{customerName}</Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{dateStr}</Text>
                      </View>
                      <ReviewStars rating={review.rating} />
                    </View>
                    {review.comment ? (
                      <View style={{ backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10 }}>
                        <Text style={{ color: "#6B7280", fontSize: 13 }}>{review.comment}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
{/* WhatsApp Button */}
{tech?.phone && (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => Linking.openURL(`https://wa.me/${tech.phone?.replace(/\D/g, "")}`)}
    style={{
      backgroundColor: "#25D366",
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      marginBottom: 10,
    }}
  >
    <Phone size={18} color="#FFFFFF" />
    <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>
      واتساب
    </Text>
  </TouchableOpacity>
)}
      {/* Sticky Book Now Button */}
      <View style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom + 16,
        borderTopWidth: 1, borderTopColor: "#F3F4F6",
        shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
      }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowBookModal(true)}
          style={{
            backgroundColor: "#1A3A6B", borderRadius: 16, paddingVertical: 17,
            alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10,
            shadowColor: "#1A3A6B", shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
          }}
        >
          <Wrench size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Booking Modal */}
      <Modal visible={showBookModal} transparent animationType="slide" onRequestClose={() => setShowBookModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
            activeOpacity={1}
            onPress={() => setShowBookModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <ScrollView
                style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                contentContainerStyle={{ padding: 24, paddingBottom: 50 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 }} />
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#1A1A2E", marginBottom: 20 }}>
                  {t("bookWith")} {tech.full_name}
                </Text>

                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>{t("serviceAddress")}</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t("addressPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  style={{ backgroundColor: "#F5F7FA", borderRadius: 10, padding: 14, fontSize: 15, color: "#1A1A2E", marginBottom: 18, borderWidth: 1.5, borderColor: "#E5E7EB" }}
                />

                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>{t("chooseDay")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                  {days.map((d, i) => {
                    const isSelected = selectedDay === i;
                    const dayName = i === 0 ? t("today") : i === 1 ? t("tomorrow") : d.toLocaleDateString("en", { weekday: "short" });
                    const dayNum = d.getDate();
                    const month = d.toLocaleDateString("en", { month: "short" });
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setSelectedDay(i)}
                        style={{
                          width: 60, paddingVertical: 10, borderRadius: 14, alignItems: "center",
                          backgroundColor: isSelected ? "#1A3A6B" : "#F3F4F6",
                          borderWidth: 2, borderColor: isSelected ? "#1A3A6B" : "transparent",
                        }}
                      >
                        <Text style={{ fontSize: 11, color: isSelected ? "rgba(255,255,255,0.8)" : "#9CA3AF", fontWeight: "600" }}>{dayName}</Text>
                        <Text style={{ fontSize: 20, fontWeight: "800", color: isSelected ? "#FFFFFF" : "#1A1A2E", marginVertical: 2 }}>{dayNum}</Text>
                        <Text style={{ fontSize: 11, color: isSelected ? "#F5A623" : "#6B7280", fontWeight: "600" }}>{month}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>{t("chooseTime")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        onPress={() => setSelectedTime(slot)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: isSelected ? "#F5A623" : "#F3F4F6",
                          borderWidth: 2, borderColor: isSelected ? "#F5A623" : "transparent",
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: isSelected ? "#FFFFFF" : "#374151" }}>{slot}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedDay !== null && selectedTime && (
                  <View style={{ backgroundColor: "#EBF0FA", borderRadius: 12, padding: 14, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Clock size={16} color="#1A3A6B" />
                    <Text style={{ fontSize: 13, color: "#1A3A6B", fontWeight: "600", flex: 1 }}>
                      {days[selectedDay].toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })} — {selectedTime}
                    </Text>
                  </View>
                )}

                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>Notes (optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Describe the issue..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  style={{ backgroundColor: "#F5F7FA", borderRadius: 10, padding: 14, fontSize: 15, color: "#1A1A2E", marginBottom: 20, borderWidth: 1, borderColor: "#E5E7EB", minHeight: 80, textAlignVertical: "top" }}
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => bookingMutation.mutate()}
                  disabled={bookingMutation.isPending}
                  style={{
                    backgroundColor: "#1A3A6B", borderRadius: 14, paddingVertical: 16, alignItems: "center",
                    shadowColor: "#1A3A6B", shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
                  }}
                >
                  {bookingMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{t("confirmBooking")}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
