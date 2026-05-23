import React, { useState, useMemo } from "react";
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
  StatusBar,
} from "react-native";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  Check,
  Star,
  User,
  ChevronRight,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM",
];

const STEPS = [
  { num: 1, label: "Date" },
  { num: 2, label: "Time" },
  { num: 3, label: "Details" },
];

function getNext7Days(): { label: string; shortDay: string; date: Date }[] {
  const days: { label: string; shortDay: string; date: Date }[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  for (let i = 0; i < 9; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      shortDay: i === 0 ? "Today" : i === 1 ? "Tmr" : dayNames[d.getDay()],
      date: d,
    });
  }
  return days;
}

function timeSlotToDate(dateObj: Date, timeSlot: string): string {
  const [timePart, meridiem] = timeSlot.split(" ");
  const [hourStr, minStr] = timePart.split(":");
  let hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  const result = new Date(dateObj);
  result.setHours(hour, min, 0, 0);
  return result.toISOString();
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getActiveStep(selectedTime: string | null, address: string): number {
  if (!selectedTime) return 1;
  if (!address.trim()) return 3;
  return 3;
}

export default function NewBookingScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    technicianId?: string;
    service?: string;
    technicianName?: string;
    rating?: string;
    price?: string;
  }>();

  const days = useMemo(() => getNext7Days(), []);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const technicianId = params.technicianId ?? "";
  const service = params.service ?? "General Service";
  const technicianName = params.technicianName ?? "Technician";
  const ratingVal = parseFloat(params.rating ?? "0");
  const estimatedPrice = params.price ?? null;

  const canBook = selectedTime !== null && address.trim().length > 0 && technicianId;

  const currentStep = selectedTime === null ? 1 : address.trim().length === 0 ? 2 : 3;

  const handleBook = async () => {
    if (!canBook || !user) return;
    if (!selectedTime) {
      Alert.alert("Select Time", "Please select a time slot.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Address Required", "Please enter your service address.");
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = timeSlotToDate(days[selectedDayIndex].date, selectedTime);
      const { data: insertedBooking, error } = await supabase
        .from("bookings")
        .insert({
        customer_id: user.id,
        technician_id: technicianId,
        service,
        scheduled_at: scheduledAt,
        address: address.trim(),
        notes: notes.trim() || null,
        status: "pending",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      // Notify the technician about the new booking request (non-blocking)
      if (insertedBooking?.id) {
        supabase.functions
          .invoke("send-push-notification", {
            body: {
              userId: technicianId,
              title: "New Booking Request",
              body: "You have a new service request. Tap to review and accept.",
              data: { type: "request", bookingId: insertedBooking.id },
            },
          })
          .catch(() => {
            // Non-critical — don't block the booking flow on notification failure
          });
      }

      Alert.alert(
        "Booking Confirmed!",
        "Your booking has been submitted. The technician will confirm shortly.",
        [{ text: "OK", onPress: () => router.replace("/(customer)/bookings") }]
      );
    } catch (err: any) {
      Alert.alert("Booking Failed", err.message || "Unable to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initials = getInitials(technicianName);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#1A3A6B",
          paddingTop: Platform.OS === "android" ? 44 : 8,
          paddingBottom: 18,
          paddingHorizontal: 20,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
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
        <Text style={{ fontSize: 19, fontWeight: "700", color: "#FFFFFF" }}>Book a Service</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Technician Card */}
        <View style={{ marginHorizontal: 20, marginTop: 20 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              shadowColor: "#000",
              shadowOpacity: 0.07,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#1A3A6B",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#F5A623",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18 }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1A1A2E" }}>{technicianName}</Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{service}</Text>
              {ratingVal > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Star size={13} color="#F5A623" fill="#F5A623" />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#F5A623" }}>{ratingVal.toFixed(1)}</Text>
                </View>
              )}
            </View>
            {estimatedPrice && (
              <View
                style={{
                  backgroundColor: "#EBF0FA",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 11, color: "#1A3A6B", fontWeight: "600" }}>Est. Price</Text>
                <Text style={{ fontSize: 15, color: "#1A3A6B", fontWeight: "800" }}>{estimatedPrice} AED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Step Indicator */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 20,
            marginTop: 24,
            marginBottom: 4,
          }}
        >
          {STEPS.map((step, idx) => {
            const isDone = currentStep > step.num;
            const isActive = currentStep === step.num;
            return (
              <React.Fragment key={step.num}>
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isDone ? "#059669" : isActive ? "#1A3A6B" : "#E5E7EB",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isDone ? (
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: isActive ? "#FFFFFF" : "#9CA3AF",
                        }}
                      >
                        {step.num}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isActive ? "#1A3A6B" : isDone ? "#059669" : "#9CA3AF",
                      marginTop: 4,
                    }}
                  >
                    {step.label}
                  </Text>
                </View>
                {idx < STEPS.length - 1 && (
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor: currentStep > step.num ? "#059669" : "#E5E7EB",
                      marginHorizontal: 8,
                      marginBottom: 18,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* STEP 1 — Date Picker */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              paddingHorizontal: 20,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#EBF0FA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarDays size={15} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>Select Date</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            {days.map((day, index) => {
              const isSelected = selectedDayIndex === index;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedDayIndex(index)}
                  activeOpacity={0.8}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 14,
                    backgroundColor: isSelected ? "#1A3A6B" : "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: isSelected ? "#1A3A6B" : "#E5E7EB",
                    minWidth: 68,
                    shadowColor: "#000",
                    shadowOpacity: isSelected ? 0.15 : 0.04,
                    shadowRadius: 6,
                    elevation: isSelected ? 4 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isSelected ? "rgba(255,255,255,0.75)" : "#9CA3AF",
                      marginBottom: 4,
                    }}
                  >
                    {day.shortDay}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: isSelected ? "#FFFFFF" : "#1A1A2E",
                    }}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* STEP 2 — Time Slots */}
        <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#EBF0FA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={15} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>Select Time</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedTime(slot)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isSelected ? "#F5A623" : "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: isSelected ? "#F5A623" : "#E5E7EB",
                    shadowColor: "#000",
                    shadowOpacity: isSelected ? 0.12 : 0.03,
                    shadowRadius: 4,
                    elevation: isSelected ? 3 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: isSelected ? "#FFFFFF" : "#374151",
                    }}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected summary */}
        {selectedTime ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              backgroundColor: "#F0FDF4",
              borderRadius: 10,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: "#BBF7D0",
            }}
          >
            <Check size={16} color="#059669" />
            <Text style={{ fontSize: 13, color: "#059669", fontWeight: "600" }}>
              {days[selectedDayIndex].shortDay}, {days[selectedDayIndex].label} at {selectedTime}
            </Text>
          </View>
        ) : null}

        {/* STEP 3 — Address */}
        <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#EBF0FA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPin size={15} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>Service Address</Text>
          </View>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: address ? "#1A3A6B" : "#E5E7EB",
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your full address..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              style={{
                fontSize: 15,
                color: "#1A1A2E",
                textAlign: isRTL ? "right" : "left",
                minHeight: 50,
              }}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#EBF0FA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={15} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>Notes (Optional)</Text>
          </View>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions or details..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{
                fontSize: 15,
                color: "#1A1A2E",
                textAlign: isRTL ? "right" : "left",
                minHeight: 72,
              }}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
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
        {canBook && (
          <Text
            style={{
              fontSize: 12,
              color: "#6B7280",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {days[selectedDayIndex].shortDay}, {days[selectedDayIndex].label} • {selectedTime}
          </Text>
        )}
        <TouchableOpacity
          onPress={handleBook}
          disabled={!canBook || loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: canBook ? "#F5A623" : "#D1D5DB",
            borderRadius: 14,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: canBook ? "#F5A623" : "transparent",
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: canBook ? 5 : 0,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: canBook ? "#FFFFFF" : "#9CA3AF" }}>
              {canBook ? "Confirm Booking" : "Select Date, Time & Address"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}