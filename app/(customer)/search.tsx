import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  Search,
  Star,
  Wrench,
  Zap,
  Wind,
  Sparkles,
  Hammer,
  Grid2x2,
  SlidersHorizontal,
  SearchX,
  CheckCircle,
  X,
  MapPin,
  Check,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ─── Categories ─────────────────────────────────── */
const CATEGORIES = [
  { key: "all",          label: "الكل",      icon: Grid2x2,  color: "#1A3A6B" },
  { key: "plumber",      label: "سباك",      icon: Wrench,   color: "#2563EB" },
  { key: "electrician",  label: "كهربائي",   icon: Zap,      color: "#D97706" },
  { key: "acTechnician", label: "مكيف",      icon: Wind,     color: "#0891B2" },
  { key: "cleaner",      label: "تنظيف",     icon: Sparkles, color: "#059669" },
  { key: "carpenter",    label: "نجار",      icon: Hammer,   color: "#7C3AED" },
];

const CITIES = [
  "الكل", "Dubai", "Abu Dhabi", "Sharjah", "Ajman",
  "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Al Ain",
];

const SORT_OPTIONS = [
  { key: "default", label: "الافتراضي" },
  { key: "rating",  label: "الأعلى تقييماً" },
  { key: "price_asc", label: "السعر: الأقل أولاً" },
  { key: "price_desc", label: "السعر: الأعلى أولاً" },
];

const AVATAR_COLORS = ["#1A3A6B", "#7C3AED", "#059669", "#0891B2", "#D97706", "#DC2626"];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const PROFESSION_LABELS: Record<string, string> = {
  plumber: "سباك",
  electrician: "كهربائي",
  acTechnician: "فني مكيفات",
  cleaner: "عامل نظافة",
  carpenter: "نجار",
  painter: "دهان",
  handyman: "فني صيانة",
};

type Technician = {
  id: string;
  full_name: string;
  location: string | null;
  profession: string;
  rating: number | null;
  total_reviews: number | null;
  hourly_rate: number | null;
  is_available: boolean | null;
};

async function fetchTechnicians(): Promise<Technician[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, full_name, location, technician_profiles!inner (profession, rating, total_reviews, hourly_rate, is_available)`)
    .eq("user_type", "technician");

  if (error) throw new Error(error.message);
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

export default function SearchScreen() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /* ── state ── */
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  // filter state (applied)
  const [selectedCity, setSelectedCity] = useState("الكل");
  const [sortBy, setSortBy] = useState("default");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  // pending (inside modal before Apply)
  const [pendingCity, setPendingCity] = useState("الكل");
  const [pendingSort, setPendingSort] = useState("default");
  const [pendingAvailable, setPendingAvailable] = useState(false);

  const { data: technicians = [], isLoading, refetch } = useQuery({
    queryKey: ["search_technicians"],
    queryFn: fetchTechnicians,
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const hasActiveFilters = selectedCity !== "الكل" || sortBy !== "default" || onlyAvailable;

  const filtered = useMemo(() => {
    let list = technicians;

    // category
    if (activeCategory !== "all") {
      list = list.filter((t) => t.profession === activeCategory);
    }
    // text search
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.full_name.toLowerCase().includes(q) ||
          t.profession.toLowerCase().includes(q) ||
          (PROFESSION_LABELS[t.profession] ?? "").toLowerCase().includes(q)
      );
    }
    // city filter
    if (selectedCity !== "الكل") {
      list = list.filter((t) => t.location?.toLowerCase().includes(selectedCity.toLowerCase()));
    }
    // availability
    if (onlyAvailable) {
      list = list.filter((t) => t.is_available === true);
    }
    // sort
    if (sortBy === "rating") {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "price_asc") {
      list = [...list].sort((a, b) => (a.hourly_rate ?? 0) - (b.hourly_rate ?? 0));
    } else if (sortBy === "price_desc") {
      list = [...list].sort((a, b) => (b.hourly_rate ?? 0) - (a.hourly_rate ?? 0));
    }

    return list;
  }, [technicians, query, activeCategory, selectedCity, sortBy, onlyAvailable]);

  function openFilter() {
    setPendingCity(selectedCity);
    setPendingSort(sortBy);
    setPendingAvailable(onlyAvailable);
    setShowFilter(true);
  }
  function applyFilter() {
    setSelectedCity(pendingCity);
    setSortBy(pendingSort);
    setOnlyAvailable(pendingAvailable);
    setShowFilter(false);
  }
  function resetFilter() {
    setPendingCity("الكل");
    setPendingSort("default");
    setPendingAvailable(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Blue Header with search */}
      <View style={{
        backgroundColor: "#1A3A6B",
        paddingTop: insets.top + 14,
        paddingBottom: 20,
        paddingHorizontal: 16,
      }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: 12, textAlign: isRTL ? "right" : "left" }}>
          {t("search")}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <View style={{
            flex: 1, flexDirection: "row", alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingHorizontal: 14,
            height: 50, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", gap: 10,
          }}>
            <Search size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث عن فني..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={{ flex: 1, fontSize: 15, color: "#FFFFFF", textAlign: isRTL ? "right" : "left" }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
                <X size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={openFilter}
            activeOpacity={0.8}
            style={{
              width: 50, height: 50,
              backgroundColor: hasActiveFilters ? "#F5A623" : "rgba(255,255,255,0.15)",
              borderRadius: 14, alignItems: "center", justifyContent: "center",
              borderWidth: hasActiveFilters ? 0 : 1.5, borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            <SlidersHorizontal size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

        {/* ── Category Chips ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setActiveCategory(cat.key)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: isActive ? cat.color : "#FFFFFF",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: isActive ? cat.color : "#D1D5DB",
                    elevation: isActive ? 3 : 1,
                  }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : `${cat.color}22`,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={18} color={isActive ? "#FFFFFF" : cat.color} />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: isActive ? "#FFFFFF" : "#111827",
                  }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Active filter chips ── */}
        {hasActiveFilters && (
          <View style={{ paddingHorizontal: 20, marginBottom: 8, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {selectedCity !== "الكل" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EBF0FA", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                <MapPin size={11} color="#1A3A6B" />
                <Text style={{ color: "#1A3A6B", fontSize: 12, fontWeight: "600" }}>{selectedCity}</Text>
              </View>
            )}
            {sortBy !== "default" && (
              <View style={{ backgroundColor: "#EBF0FA", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                <Text style={{ color: "#1A3A6B", fontSize: 12, fontWeight: "600" }}>{SORT_OPTIONS.find(s => s.key === sortBy)?.label}</Text>
              </View>
            )}
            {onlyAvailable && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                <CheckCircle size={11} color="#059669" />
                <Text style={{ color: "#059669", fontSize: 12, fontWeight: "600" }}>متاح فقط</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => { setSelectedCity("الكل"); setSortBy("default"); setOnlyAvailable(false); }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                <X size={11} color="#DC2626" />
                <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "600" }}>مسح</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Results ── */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#1A3A6B" size="large" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 12, textAlign: isRTL ? "right" : "left" }}>
              <Text style={{ fontWeight: "700", color: "#1A1A2E" }}>{filtered.length}</Text> نتيجة
            </Text>

            {filtered.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <SearchX size={36} color="#1A3A6B" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 8, textAlign: "center" }}>لا توجد نتائج</Text>
                <Text style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>لم يتم العثور على فنيين يطابقون بحثك</Text>
              </View>
            ) : (
              filtered.map((tech) => {
                const color = getAvatarColor(tech.id);
                const initials = getInitials(tech.full_name);
                const profLabel = PROFESSION_LABELS[tech.profession] ?? tech.profession;
                return (
                  <TouchableOpacity
                    key={tech.id}
                    onPress={() => router.push(`/(customer)/technician/${tech.id}`)}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12,
                      flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
                      shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
                    }}
                  >
                    <View style={{
                      width: 56, height: 56, borderRadius: 28, backgroundColor: color,
                      alignItems: "center", justifyContent: "center",
                      marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0,
                    }}>
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 18 }}>{initials}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>{tech.full_name}</Text>
                        {tech.is_available && <CheckCircle size={14} color="#059669" />}
                      </View>
                      <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>{profLabel}</Text>
                      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        {tech.rating != null && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Star size={12} color="#F5A623" fill="#F5A623" />
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{tech.rating.toFixed(1)}</Text>
                            {tech.total_reviews != null && (
                              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>({tech.total_reviews})</Text>
                            )}
                          </View>
                        )}
                        {tech.location && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <MapPin size={11} color="#9CA3AF" />
                            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{tech.location}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      {tech.hourly_rate != null && (
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#1A3A6B" }}>{tech.hourly_rate} د.إ/س</Text>
                      )}
                      <View style={{
                        backgroundColor: tech.is_available ? "#F5A623" : "#E5E7EB",
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
                      }}>
                        <Text style={{ color: tech.is_available ? "#FFFFFF" : "#9CA3AF", fontSize: 12, fontWeight: "700" }}>
                          {tech.is_available ? "احجز" : "غير متاح"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}

      {/* ════════════════════════════════════
          FILTER MODAL
      ════════════════════════════════════ */}
      <Modal visible={showFilter} animationType="slide" transparent onRequestClose={() => setShowFilter(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 40 }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 16 }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E" }}>التصفية</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {/* City */}
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E", marginBottom: 10 }}>المدينة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                {CITIES.map((city) => {
                  const isSelected = pendingCity === city;
                  return (
                    <TouchableOpacity
                      key={city}
                      onPress={() => setPendingCity(city)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
                        backgroundColor: isSelected ? "#1A3A6B" : "#F3F4F6",
                        borderWidth: 2, borderColor: isSelected ? "#1A3A6B" : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: isSelected ? "#FFFFFF" : "#374151" }}>{city}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Sort */}
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E", marginBottom: 10 }}>الترتيب</Text>
              <View style={{ gap: 8, marginBottom: 20 }}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = pendingSort === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setPendingSort(opt.key)}
                      style={{
                        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                        padding: 14, borderRadius: 12,
                        backgroundColor: isSelected ? "#EBF0FA" : "#F9FAFB",
                        borderWidth: 2, borderColor: isSelected ? "#1A3A6B" : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: isSelected ? "#1A3A6B" : "#374151" }}>{opt.label}</Text>
                      {isSelected && <Check size={16} color="#1A3A6B" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Available only */}
              <TouchableOpacity
                onPress={() => setPendingAvailable(!pendingAvailable)}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  padding: 14, borderRadius: 12, marginBottom: 24,
                  backgroundColor: pendingAvailable ? "#DCFCE7" : "#F9FAFB",
                  borderWidth: 2, borderColor: pendingAvailable ? "#059669" : "transparent",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: pendingAvailable ? "#059669" : "#374151" }}>الفنيون المتاحون فقط</Text>
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: pendingAvailable ? "#059669" : "#E5E7EB",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {pendingAvailable && <Check size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={resetFilter}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: "#1A3A6B", alignItems: "center" }}
                >
                  <Text style={{ color: "#1A3A6B", fontWeight: "700", fontSize: 15 }}>إعادة تعيين</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={applyFilter}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#1A3A6B", alignItems: "center" }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>تطبيق</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}