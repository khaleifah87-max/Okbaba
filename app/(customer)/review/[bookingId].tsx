import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { ArrowLeft, Star, Check, CheckCircle } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";

const QUALITY_TAGS = [
  "Professional",
  "Fast",
  "Clean",
  "Friendly",
  "On Time",
  "Great Value",
  "Skilled",
  "Careful",
];

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent!"];

async function fetchBookingForReview(bookingId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      service,
      scheduled_at,
      technician_id,
      profiles!bookings_technician_id_fkey (
        full_name
      )
    `)
    .eq("id", bookingId)
    .single();
  if (error) throw new Error("Failed to fetch booking");
  return data;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ["booking_review", bookingId],
    queryFn: () => fetchBookingForReview(bookingId!),
    enabled: !!bookingId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !booking) throw new Error("Not authenticated");
      if (rating === 0) throw new Error("Please select a rating");

      const technicianId = booking.technician_id;
      const commentWithTags =
        selectedTags.length > 0
          ? `[${selectedTags.join(", ")}] ${comment.trim()}`.trim()
          : comment.trim() || null;

      const { error: reviewError } = await supabase.from("reviews").insert({
        booking_id: booking.id,
        customer_id: user.id,
        technician_id: technicianId,
        rating,
        comment: commentWithTags,
      });
      if (reviewError) throw new Error(reviewError.message);

      const { data: techData } = await supabase
        .from("technician_profiles")
        .select("rating, total_reviews")
        .eq("id", technicianId)
        .single();

      if (techData) {
        const currentTotal = techData.total_reviews ?? 0;
        const currentRating = techData.rating ?? 0;
        const newTotal = currentTotal + 1;
        const newRating = ((currentRating * currentTotal) + rating) / newTotal;
        await supabase
          .from("technician_profiles")
          .update({ rating: Math.round(newRating * 10) / 10, total_reviews: newTotal })
          .eq("id", technicianId);
      }
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      if (err.message === "Please select a rating") {
        Alert.alert("Rating Required", "Please tap on a star to rate your experience.");
      } else {
        Alert.alert("Error", err.message || "Could not submit review. Please try again.");
      }
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const Header = () => (
    <View
      style={{
        backgroundColor: "#1A3A6B",
        paddingTop: Platform.OS === "android" ? 44 : 8,
        paddingBottom: 18,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 5,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: "rgba(255,255,255,0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ArrowLeft color="#FFFFFF" size={20} />
      </TouchableOpacity>
      <Text style={{ fontSize: 19, fontWeight: "700", color: "#FFFFFF" }}>Rate Your Experience</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#1A3A6B" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: "#DC2626", fontSize: 16, textAlign: "center" }}>
            Unable to load booking details.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: "#1A3A6B", fontWeight: "600" }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const techName = (booking as any).profiles?.full_name ?? "Technician";
  const initials = getInitials(techName);

  // Thank-you state
  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "#F0FDF4",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              borderWidth: 3,
              borderColor: "#BBF7D0",
            }}
          >
            <CheckCircle size={52} color="#059669" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#1A1A2E", textAlign: "center" }}>
            Thank You!
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#6B7280",
              textAlign: "center",
              marginTop: 10,
              marginBottom: 32,
            }}
          >
            Your review helps our community find great technicians.
          </Text>
          {/* Star display */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={32} color="#F5A623" fill={s <= rating ? "#F5A623" : "transparent"} />
            ))}
          </View>
          <TouchableOpacity
            onPress={() => router.replace("/(customer)/bookings")}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#1A3A6B",
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 40,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Back to Bookings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
      <SafeAreaView style={{ flex: 1 }}>
        <Header />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Technician Avatar Card */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 24,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 24,
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: "#1A3A6B",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#F5A623",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 26 }}>{initials}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>{techName}</Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{booking.service}</Text>
            <Text style={{ fontSize: 12, color: "#C4C9D4", marginTop: 2 }}>
              {formatDate(booking.scheduled_at)}
            </Text>
          </View>

          {/* Star Rating */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 24,
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1A1A2E", marginBottom: 20 }}>
              How was your experience?
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  activeOpacity={0.7}
                  onPress={() => setRating(star)}
                >
                  <Star
                    size={48}
                    color="#F5A623"
                    fill={star <= rating ? "#F5A623" : "transparent"}
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={{
                fontSize: 14,
                color: rating > 0 ? "#F5A623" : "#9CA3AF",
                fontWeight: rating > 0 ? "700" : "400",
                marginTop: 12,
              }}
            >
              {rating === 0 ? "Tap to rate" : RATING_LABELS[rating]}
            </Text>
          </View>

          {/* Quality Tags */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              shadowColor: "#000",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E", marginBottom: 14 }}>
              What stood out?
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {QUALITY_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isSelected ? "#1A3A6B" : "#F5F7FA",
                      borderWidth: 1.5,
                      borderColor: isSelected ? "#1A3A6B" : "#E5E7EB",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected ? "#FFFFFF" : "#6B7280",
                      }}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comment Input */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              shadowColor: "#000",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>
                Share your experience
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{comment.length}/300</Text>
            </View>
            <View
              style={{
                backgroundColor: "#F5F7FA",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: comment ? "#1A3A6B" : "#E5E7EB",
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 12,
              }}
            >
              <TextInput
                value={comment}
                onChangeText={(t) => setComment(t.slice(0, 300))}
                placeholder="Share details about your experience..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                style={{
                  fontSize: 15,
                  color: "#1A1A2E",
                  minHeight: 90,
                  textAlignVertical: "top",
                }}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Submit */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: Platform.OS === "ios" ? 34 : 20,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || rating === 0}
            style={{
              backgroundColor: rating > 0 ? "#F5A623" : "#D1D5DB",
              borderRadius: 14,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: rating > 0 ? "#F5A623" : "transparent",
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: rating > 0 ? 5 : 0,
            }}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  color: rating > 0 ? "#FFFFFF" : "#9CA3AF",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {t("submitReview")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}