import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
} from "react-native";
import {
  Bell,
  MapPin,
  Search,
  Star,
  Wrench,
  Zap,
  Wind,
  Sparkles,
  Hammer,
  Grid2x2,
  ChevronRight,
  SlidersHorizontal,
  X,
  Check,
  Shield,
  Clock,
  Phone,
  CalendarCheck,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { TechnicianSkeletonList } from "@/components/TechnicianCardSkeleton";

const CATEGORIES = [
  { key: "plumber", icon: Wrench, color: "#3B82F6", bg: "#DBEAFE" },
  { key: "electrician", icon: Zap, color: "#F59E0B", bg: "#FEF3C7" },
  { key: "acTechnician", icon: Wind, color: "#06B6D4", bg: "#CFFAFE" },
  { key: "cleaner", icon: Sparkles, color: "#10B981", bg: "#D1FAE5" },
  { key: "carpenter", icon: Hammer, color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "more", icon: Grid2x2, color: "#6B7280", bg: "#F3F4F6" },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Choose a Service", desc: "Pick from our professional categories", icon: Search },
  { step: "2", title: "Book a Technician", desc: "Select availability and confirm booking", icon: CalendarCheck },
  { step: "3", title: "Job Done!", desc: "Relax while the expert handles it", icon: Shield },
];

const CITIES = ["All", "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Al Ain"];
const SORT_OPTIONS = [
  { key: "default", label: "Default" },
  { key: "rating", label: "Highest Rated" },
  { key: "jobs", label: "Most Jobs" },
  { key: "newest", label: "Newest" },
];

const AVATAR_COLORS = ["#1A3A6B", "#7C3AED", "#059669", "#0891B2", "#D97706", "#DC2626", "#0D9488"];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
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

type TechnicianWithProfile = {
  id: string;
  full_name: string;
  location: string | null;
  profession: string;
  rating: number | null;
  total_reviews: number | null;
  hourly_rate: number | null;
  is_available: boolean | null;
};

async function fetchTechnicians(): Promise<TechnicianWithProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      location,
      technician_profiles!inner (
        profession,
        rating,
        total_reviews,
        hourly_rate,
        is_available
      )
    `
    )
    .eq("user_type", "technician");

  if (error) throw new Error("Failed to fetch technicians");

  return (data ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    location: p.location,
    profession: p.technician_profiles?.profession ?? "",
    rating: p.technician_profiles?.rating ?? null,
    total_reviews: p.technician_profiles?.total_reviews ?? null,
    hourly_rate: p.technician_profiles?.hourly_rate ?? null,
    is_available: p.technician_profiles?.is_available ?? null,
  }));
}

export default function CustomerHomeScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  // Filter state
  const [selectedCity, setSelectedCity] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [minRating, setMinRating] = useState(0);
  const [pendingCity, setPendingCity] = useState("All");
  const [pendingSort, setPendingSort] = useState("default");
  const [pendingMinRating, setPendingMinRating] = useState(0);

  const { data: technicians = [], isLoading, isError } = useQuery({
    queryKey: ["technicians"],
    queryFn: fetchTechnicians,
  });

  const hasActiveFilters = selectedCity !== "All" || sortBy !== "default" || minRating > 0;

  const filtered = useMemo(() => {
    let list = technicians.filter((tech) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        tech.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tech.profession.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory ||
        selectedCategory === "more" ||
        tech.profession.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesCity =
        selectedCity === "All" ||
        (tech.location?.toLowerCase().includes(selectedCity.toLowerCase()) ?? false);
      const matchesRating = minRating === 0 || (tech.rating !== null && tech.rating >= minRating);
      return matchesSearch && matchesCategory && matchesCity && matchesRating;
    });

    if (sortBy === "rating") {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "jobs") {
      list = [...list].sort((a, b) => (b.total_reviews ?? 0) - (a.total_reviews ?? 0));
    }

    return list;
  }, [technicians, searchQuery, selectedCategory, selectedCity, sortBy, minRating]);

  const displayName = profile?.full_name?.split(" ")[0] ?? "there";

  const openFilter = () => {
    setPendingCity(selectedCity);
    setPendingSort(sortBy);
    setPendingMinRating(minRating);
    setShowFilter(true);
  };

  const applyFilter = () => {
    setSelectedCity(pendingCity);
    setSortBy(pendingSort);
    setMinRating(pendingMinRating);
    setShowFilter(false);
  };

  const clearFilters = () => {
    setSelectedCity("All");
    setSortBy("default");
    setMinRating(0);
    setPendingCity("All");
    setPendingSort("default");
    setPendingMinRating(0);
    setShowFilter(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* ═══════════════ HEADER ═══════════════ */}
        <View style={{ backgroundColor: "#1A3A6B" }}>
          <SafeAreaView>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 }}>
              {/* Logo + Top Row */}
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                {/* Logo + Greeting */}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                  <Image
                    source={require("@/assets/images/1000219939.png")}
                    style={{ width: 44, height: 44, borderRadius: 12 }}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" }}>
                      {t("goodMorning")} 👋
                    </Text>
                    <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "800" }}>
                      {displayName}
                    </Text>
                  </View>
                </View>

                {/* Notification Bell */}
                <TouchableOpacity
                  onPress={() => router.push("/(customer)/notifications")}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <Bell size={20} color="#FFFFFF" />
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: "#F5A623",
                      borderWidth: 1.5,
                      borderColor: "#1A3A6B",
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* Location Pill */}
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  alignSelf: "flex-start",
                  marginBottom: 16,
                }}
              >
                <MapPin size={13} color="#F5A623" />
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
                  {profile?.location ?? "UAE"}
                </Text>
              </View>

              {/* Search Bar */}
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  height: 52,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 6,
                  gap: 10,
                }}
              >
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t("searchTechnicians")}
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: "#1A1A2E",
                    textAlign: isRTL ? "right" : "left",
                  }}
                />
                <TouchableOpacity
                  onPress={openFilter}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: hasActiveFilters ? "#1A3A6B" : "#F0F4FF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <SlidersHorizontal size={17} color={hasActiveFilters ? "#F5A623" : "#6B7280"} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ═══════════════ CATEGORIES ═══════════════ */}
        <View style={{ backgroundColor: "#FFFFFF", paddingTop: 20, paddingBottom: 20 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E" }}>Our Services</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/(customer)/search")}>
              <Text style={{ fontSize: 13, color: "#1A3A6B", fontWeight: "600" }}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.key)}
                  activeOpacity={0.7}
                  style={{ alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 18,
                      backgroundColor: isSelected ? "#1A3A6B" : cat.bg,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isSelected ? 0 : 1.5,
                      borderColor: isSelected ? "transparent" : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Icon size={26} color={isSelected ? "#F5A623" : cat.color} />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: isSelected ? "700" : "600",
                      color: isSelected ? "#1A3A6B" : "#374151",
                      textAlign: "center",
                    }}
                  >
                    {t(cat.key as any)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <View style={{ backgroundColor: "#F0F4FF", paddingVertical: 24, paddingHorizontal: 20, marginTop: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 16 }}>
            How It Works
          </Text>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
            {HOW_IT_WORKS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <View
                  key={idx}
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 14,
                    alignItems: "center",
                    shadowColor: "#1A3A6B",
                    shadowOpacity: 0.07,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#1A3A6B",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Icon size={18} color="#F5A623" />
                  </View>
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "#F5A623",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>{step.step}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#1A1A2E", textAlign: "center", marginBottom: 4 }}>
                    {step.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#6B7280", textAlign: "center" }}>
                    {step.desc}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ═══════════════ RESULTS + FILTER CHIPS ═══════════════ */}
        <View style={{ paddingTop: 20, paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 13, color: "#6B7280" }}>
              <Text style={{ fontWeight: "700", color: "#1A1A2E" }}>
                {isLoading ? "..." : filtered.length}
              </Text>
              {"  "}
              {t("resultsFound")}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={clearFilters}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                activeOpacity={0.7}
              >
                <X size={13} color="#DC2626" />
                <Text style={{ color: "#DC2626", fontWeight: "600", fontSize: 13 }}>{t("clearFilters")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasActiveFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {selectedCity !== "All" && (
                <View
                  style={{
                    backgroundColor: "#EBF0FA",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <MapPin size={11} color="#1A3A6B" />
                  <Text style={{ color: "#1A3A6B", fontSize: 12, fontWeight: "600" }}>{selectedCity}</Text>
                </View>
              )}
              {sortBy !== "default" && (
                <View
                  style={{
                    backgroundColor: "#EBF0FA",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: "#1A3A6B", fontSize: 12, fontWeight: "600" }}>
                    {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
                  </Text>
                </View>
              )}
              {minRating > 0 && (
                <View
                  style={{
                    backgroundColor: "#FEF3C7",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Star size={11} color="#F5A623" fill="#F5A623" />
                  <Text style={{ color: "#D97706", fontSize: 12, fontWeight: "600" }}>{minRating}+ stars</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* ═══════════════ NEARBY TECHNICIANS ═══════════════ */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>
              {t("nearbyTechnicians")}
            </Text>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              activeOpacity={0.7}
              onPress={() => router.push("/(customer)/search")}
            >
              <Text style={{ color: "#1A3A6B", fontWeight: "600", fontSize: 13 }}>{t("seeAll")}</Text>
              <ChevronRight size={14} color="#1A3A6B" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <TechnicianSkeletonList count={4} />
          ) : isError ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <Text style={{ color: "#DC2626", fontSize: 14 }}>Unable to load technicians. Please try again.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>No technicians found</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 14 }}
            >
              {filtered.map((tech) => {
                const color = getAvatarColor(tech.id);
                const initials = getInitials(tech.full_name);
                return (
                  <TouchableOpacity
                    key={tech.id}
                    onPress={() => router.push(`/(customer)/technician/${tech.id}`)}
                    activeOpacity={0.85}
                    style={{
                      width: 180,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 20,
                      padding: 16,
                      shadowColor: "#1A3A6B",
                      shadowOpacity: 0.1,
                      shadowRadius: 12,
                      elevation: 4,
                    }}
                  >
                    {/* Avatar + Availability */}
                    <View style={{ position: "relative", width: 56, marginBottom: 12 }}>
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: color,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18 }}>{initials}</Text>
                      </View>
                      {tech.is_available && (
                        <View
                          style={{
                            position: "absolute",
                            bottom: 2,
                            right: -2,
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: "#10B981",
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                          }}
                        />
                      )}
                    </View>

                    <Text
                      style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E", marginBottom: 2 }}
                      numberOfLines={1}
                    >
                      {tech.full_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                      {tech.profession}
                    </Text>

                    {/* Rating */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <Star size={12} color="#F5A623" fill="#F5A623" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
                        {tech.rating?.toFixed(1) ?? "New"}
                      </Text>
                      {tech.total_reviews != null && (
                        <Text style={{ fontSize: 11, color: "#9CA3AF" }}>({tech.total_reviews})</Text>
                      )}
                    </View>

                    {tech.location && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 }}>
                        <MapPin size={11} color="#9CA3AF" />
                        <Text style={{ fontSize: 11, color: "#9CA3AF" }} numberOfLines={1}>
                          {tech.location}
                        </Text>
                      </View>
                    )}

                    {/* Rate + Book Button */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#1A3A6B" }}>
                        {tech.hourly_rate != null ? `AED ${tech.hourly_rate}/hr` : "Ask"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => router.push(`/(customer)/technician/${tech.id}`)}
                        activeOpacity={0.85}
                        style={{
                          backgroundColor: "#F5A623",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>{t("bookNow")}</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ═══════════════ FEATURED TECHNICIANS ═══════════════ */}
        {!isLoading && !isError && filtered.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12 }}>
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>
                {t("featuredTechnicians")}
              </Text>
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: "#D97706", fontWeight: "700" }}>⭐ Top Rated</Text>
              </View>
            </View>

            {filtered.slice(0, 3).map((tech) => {
              const color = getAvatarColor(tech.id);
              const initials = getInitials(tech.full_name);
              return (
                <TouchableOpacity
                  key={tech.id}
                  onPress={() => router.push(`/(customer)/technician/${tech.id}`)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    shadowColor: "#1A3A6B",
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: "rgba(26,58,107,0.06)",
                  }}
                >
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 29,
                      backgroundColor: color,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: isRTL ? 0 : 14,
                      marginLeft: isRTL ? 14 : 0,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18 }}>{initials}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>
                        {tech.full_name}
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#EBF0FA",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 9, color: "#1A3A6B", fontWeight: "700" }}>
                          {t("verified")}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
                      {tech.profession}
                    </Text>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Star size={12} color="#F5A623" fill="#F5A623" />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
                          {tech.rating?.toFixed(1) ?? "New"}
                        </Text>
                      </View>
                      {tech.location && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MapPin size={12} color="#9CA3AF" />
                          <Text style={{ fontSize: 12, color: "#9CA3AF" }} numberOfLines={1}>
                            {tech.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#1A3A6B", marginBottom: 8 }}>
                      {tech.hourly_rate != null ? `AED ${tech.hourly_rate}/hr` : "Ask for rate"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/(customer)/technician/${tech.id}`)}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: "#1A3A6B",
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>{t("bookNow")}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ═══════════════ RECENT BOOKINGS PREVIEW ═══════════════ */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>Recent Bookings</Text>
            <TouchableOpacity
              onPress={() => router.push("/(customer)/bookings")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#1A3A6B", fontWeight: "600", fontSize: 13 }}>View All</Text>
              <ChevronRight size={14} color="#1A3A6B" />
            </TouchableOpacity>
          </View>

          {/* Placeholder booking cards */}
          <TouchableOpacity
            onPress={() => router.push("/(customer)/bookings")}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              padding: 16,
              marginBottom: 10,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              shadowColor: "#1A3A6B",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 2,
              borderWidth: 1,
              borderColor: "rgba(26,58,107,0.06)",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#EBF0FA",
                alignItems: "center",
                justifyContent: "center",
                marginRight: isRTL ? 0 : 14,
                marginLeft: isRTL ? 14 : 0,
              }}
            >
              <Wrench size={20} color="#1A3A6B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E" }}>Plumbing Service</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <Clock size={11} color="#9CA3AF" />
                <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Yesterday, 3:00 PM</Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: "#D1FAE5",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#059669" }}>Completed</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(customer)/bookings")}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              padding: 16,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              shadowColor: "#1A3A6B",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              elevation: 2,
              borderWidth: 1,
              borderColor: "rgba(26,58,107,0.06)",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#FEF3C7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: isRTL ? 0 : 14,
                marginLeft: isRTL ? 14 : 0,
              }}
            >
              <Zap size={20} color="#F5A623" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E" }}>Electrical Repair</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <Clock size={11} color="#9CA3AF" />
                <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Today, 10:00 AM</Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: "#DBEAFE",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#2563EB" }}>Upcoming</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ═══════════════ FILTER BOTTOM SHEET ═══════════════ */}
      <Modal
        visible={showFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          activeOpacity={1}
          onPress={() => setShowFilter(false)}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: "85%",
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#E5E7EB",
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1A1A2E" }}>{t("filterResults")}</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)} activeOpacity={0.7}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* City Selector */}
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 12 }}>City</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    onPress={() => setPendingCity(city)}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: pendingCity === city ? "#1A3A6B" : "#E5E7EB",
                      backgroundColor: pendingCity === city ? "#EBF0FA" : "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: pendingCity === city ? "#1A3A6B" : "#6B7280",
                      }}
                    >
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort By */}
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 12 }}>
                {t("sortBy")}
              </Text>
              <View style={{ gap: 8, marginBottom: 24 }}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => setPendingSort(option.key)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: pendingSort === option.key ? "#1A3A6B" : "#E5E7EB",
                      backgroundColor: pendingSort === option.key ? "#EBF0FA" : "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: pendingSort === option.key ? "#1A3A6B" : "#374151",
                        fontWeight: pendingSort === option.key ? "700" : "500",
                      }}
                    >
                      {option.label}
                    </Text>
                    {pendingSort === option.key && <Check size={16} color="#1A3A6B" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Min Rating */}
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 12 }}>
                Minimum Rating
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setPendingMinRating(r)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: pendingMinRating === r ? "#F5A623" : "#E5E7EB",
                      backgroundColor: pendingMinRating === r ? "#FEF3C7" : "#FFFFFF",
                    }}
                  >
                    {r === 0 ? (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: pendingMinRating === r ? "#D97706" : "#9CA3AF",
                        }}
                      >
                        Any
                      </Text>
                    ) : (
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <Star
                          size={14}
                          color="#F5A623"
                          fill={pendingMinRating === r ? "#F5A623" : "transparent"}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: pendingMinRating === r ? "#D97706" : "#9CA3AF",
                          }}
                        >
                          {r}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={clearFilters}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#6B7280" }}>{t("clearFilters")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyFilter}
                activeOpacity={0.85}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: "#1A3A6B",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}