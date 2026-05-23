import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Phone, MapPin, Wrench, Clock } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AVATAR_COLORS = [
  "#1A3A6B",
  "#7C3AED",
  "#059669",
  "#0891B2",
  "#D97706",
  "#DC2626",
];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function statusStyle(status: string): { color: string; bg: string; label: string } {
  switch (status) {
    case "pending":
      return { color: "#D97706", bg: "#FEF3C7", label: "Pending" };
    case "accepted":
      return { color: "#2563EB", bg: "#DBEAFE", label: "Confirmed" };
    case "in_progress":
      return { color: "#7C3AED", bg: "#EDE9FE", label: "In Progress" };
    case "completed":
      return { color: "#059669", bg: "#DCFCE7", label: "Completed" };
    default:
      return { color: "#6B7280", bg: "#F3F4F6", label: status };
  }
}

type BookingInfo = {
  id: string;
  service: string;
  status: string;
  address: string | null;
  scheduled_at: string | null;
  technician_id: string;
  techName: string;
  techPhone: string | null;
};

type TechLocation = {
  latitude: number;
  longitude: number;
} | null;

export default function TrackingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [techLocation, setTechLocation] = useState<TechLocation>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select(
            `
            id, service, status, address, scheduled_at, technician_id,
            profiles!bookings_technician_id_fkey (full_name, phone)
          `
          )
          .eq("id", bookingId)
          .single();

        if (bookingError || !bookingData) {
          throw new Error(bookingError?.message ?? "Booking not found");
        }

        const techProfile = bookingData.profiles as any;
        const mapped: BookingInfo = {
          id: bookingData.id,
          service: bookingData.service,
          status: bookingData.status,
          address: bookingData.address,
          scheduled_at: bookingData.scheduled_at,
          technician_id: bookingData.technician_id,
          techName: techProfile?.full_name ?? "Technician",
          techPhone: techProfile?.phone ?? null,
        };
        setBooking(mapped);

        // Fetch technician location
        const { data: tpData } = await supabase
          .from("technician_profiles")
          .select("latitude, longitude")
          .eq("id", bookingData.technician_id)
          .single();

        if (tpData?.latitude != null && tpData?.longitude != null) {
          setTechLocation({
            latitude: tpData.latitude,
            longitude: tpData.longitude,
          });
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to load tracking data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [bookingId]);

  // ─── Real-time location subscription ─────────────────────────────────────
  useEffect(() => {
    if (!booking?.technician_id) return;

    const channel = supabase
      .channel(`tech_location_${booking.technician_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "technician_profiles",
          filter: `id=eq.${booking.technician_id}`,
        },
        (payload: any) => {
          const newRow = payload.new;
          if (newRow?.latitude != null && newRow?.longitude != null) {
            setTechLocation({
              latitude: newRow.latitude,
              longitude: newRow.longitude,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking?.technician_id]);

  // ─── Animate map to technician when location changes ─────────────────────
  useEffect(() => {
    if (techLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: techLocation.latitude,
          longitude: techLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800
      );
    }
  }, [techLocation]);

  const handleCall = () => {
    if (!booking?.techPhone) {
      Alert.alert("No phone number", "The technician's phone number is not available.");
      return;
    }
    Linking.openURL(`tel:${booking.techPhone}`).catch(() => {
      Alert.alert("Error", "Unable to make a call from this device.");
    });
  };

  const st = booking ? statusStyle(booking.status) : null;
  const avatarColor = booking ? getAvatarColor(booking.technician_id) : "#1A3A6B";
  const initials = booking ? getInitials(booking.techName) : "T";

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
        <ActivityIndicator size="large" color="#1A3A6B" />
        <Text style={styles.loadingText}>Loading tracking data…</Text>
      </View>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error || !booking) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />
        <MapPin size={48} color="#DC2626" />
        <Text style={styles.errorText}>{error ?? "Booking not found"}</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initialRegion = techLocation
    ? {
        latitude: techLocation.latitude,
        longitude: techLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        // Default to Dubai if no location
        latitude: 25.2048,
        longitude: 55.2708,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ─── Map ─────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Technician marker */}
        {techLocation && (
          <Marker
            coordinate={techLocation}
            title={booking.techName}
            description="Technician's current location"
            pinColor="#1A3A6B"
          />
        )}
      </MapView>

      {/* ─── Back button (floating) ───────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.85}
        style={[
          styles.floatingBack,
          { top: insets.top + 12 },
        ]}
      >
        <ArrowLeft size={20} color="#1A3A6B" />
      </TouchableOpacity>

      {/* ─── No-location overlay ─────────────────────────────────────────── */}
      {!techLocation && (
        <View style={styles.noLocationOverlay}>
          <View style={styles.noLocationCard}>
            <MapPin size={28} color="#6B7280" />
            <Text style={styles.noLocationTitle}>Location Not Available</Text>
            <Text style={styles.noLocationSub}>
              The technician hasn't shared their location yet. Check back soon.
            </Text>
          </View>
        </View>
      )}

      {/* ─── Bottom card ─────────────────────────────────────────────────── */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
        {/* Technician row */}
        <View style={styles.techRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.techInfo}>
            <Text style={styles.techName}>{booking.techName}</Text>
            <Text style={styles.techService}>{booking.service}</Text>
          </View>
          {st && (
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Info row */}
        <View style={styles.infoRow}>
          {booking.scheduled_at && (
            <View style={styles.infoChip}>
              <Clock size={13} color="#1A3A6B" />
              <Text style={styles.infoChipText}>
                {new Date(booking.scheduled_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
          {booking.address && (
            <View style={styles.infoChip}>
              <MapPin size={13} color="#1A3A6B" />
              <Text style={styles.infoChipText} numberOfLines={1}>
                {booking.address}
              </Text>
            </View>
          )}
        </View>

        {/* Live indicator */}
        {techLocation && (
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live tracking active</Text>
          </View>
        )}

        {/* Call button */}
        <TouchableOpacity
          onPress={handleCall}
          activeOpacity={0.85}
          style={styles.callButton}
        >
          <Phone size={16} color="#FFFFFF" />
          <Text style={styles.callButtonText}>Call Technician</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  backBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#1A3A6B",
    borderRadius: 12,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  floatingBack: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  noLocationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  noLocationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 32,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  noLocationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    textAlign: "center",
  },
  noLocationSub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    shadowColor: "#1A3A6B",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  techService: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EBF0FA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: "65%",
  },
  infoChipText: {
    fontSize: 12,
    color: "#1A3A6B",
    fontWeight: "500",
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  callButton: {
    backgroundColor: "#F5A623",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#F5A623",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 6,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});