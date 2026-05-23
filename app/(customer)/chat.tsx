import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { MessageCircle, Plus, X } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";

const AVATAR_COLORS = ["#1A3A6B", "#7C3AED", "#059669", "#0891B2", "#D97706", "#DC2626"];
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
function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

type ChatConversation = {
  bookingId: string;
  technicianId: string;
  technicianName: string;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
};

type Technician = {
  id: string;
  full_name: string;
  profession: string;
  location: string | null;
};

async function fetchConversations(userId: string): Promise<ChatConversation[]> {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      technician_id,
      profiles!bookings_technician_id_fkey (
        full_name
      )
    `)
    .eq("customer_id", userId)
    .in("status", ["pending", "accepted", "completed"]);

  if (error) throw new Error(error.message);
  if (!bookings || bookings.length === 0) return [];

  const conversations: ChatConversation[] = [];

  for (const booking of bookings as any[]) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("content, created_at, sender_id, read")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!msgs || msgs.length === 0) continue;

    const lastMsg = msgs[0];

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("booking_id", booking.id)
      .eq("read", false)
      .neq("sender_id", userId);

    conversations.push({
      bookingId: booking.id,
      technicianId: booking.technician_id,
      technicianName: booking.profiles?.full_name ?? "Technician",
      lastMessage: lastMsg.content,
      lastMessageTime: lastMsg.created_at,
      unreadCount: count ?? 0,
    });
  }

  conversations.sort((a, b) => {
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
  });

  return conversations;
}

async function fetchAvailableTechnicians(): Promise<Technician[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, full_name, location,
       technician_profiles!inner (
         profession, is_available
       )`
    )
    .eq("user_type", "technician");

  if (error) return [];

  return (data ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    profession: p.technician_profiles?.profession ?? "",
    location: p.location,
  }));
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

export default function ChatScreen() {
  const { t, isRTL } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const { data: conversations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["customer_conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const openNewChat = async () => {
    setShowNewChat(true);
    setLoadingTechs(true);
    const techs = await fetchAvailableTechnicians();
    setTechnicians(techs);
    setLoadingTechs(false);
  };

  const startChatWithTechnician = async (tech: Technician) => {
    if (!user) return;
    setStartingChat(tech.id);
    try {
      // Check if there's already a "Chat Inquiry" booking with this technician
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("customer_id", user.id)
        .eq("technician_id", tech.id)
        .eq("service", "Chat Inquiry")
        .maybeSingle();

      let bookingId: string;

      if (existing?.id) {
        bookingId = existing.id;
      } else {
        // Create a new booking
        const { data: newBooking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            customer_id: user.id,
            technician_id: tech.id,
            service: "Chat Inquiry",
            status: "pending",
          })
          .select("id")
          .single();

        if (bookingError || !newBooking) {
          Alert.alert("خطأ", "تعذر إنشاء المحادثة. يرجى المحاولة مرة أخرى.");
          return;
        }
        bookingId = newBooking.id;
      }

      setShowNewChat(false);
      router.push(`/(customer)/chat/${bookingId}`);
    } catch {
      Alert.alert("خطأ", "تعذر إنشاء المحادثة. يرجى المحاولة مرة أخرى.");
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#1A1A2E" }}>{t("chat")}</Text>
          <TouchableOpacity
            onPress={openNewChat}
            activeOpacity={0.85}
            style={{ backgroundColor: "#1A3A6B", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>{t("newChat")}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#1A3A6B" size="large" />
          </View>
        ) : isError ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#DC2626", fontSize: 14 }}>Unable to load chats</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#EBF0FA", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MessageCircle size={40} color="#1A3A6B" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 8, textAlign: "center" }}>
              {t("noChats")}
            </Text>
            <Text style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", marginBottom: 24 }}>
              {t("chatsAppearHere")}
            </Text>
            <TouchableOpacity
              onPress={openNewChat}
              activeOpacity={0.85}
              style={{ backgroundColor: "#1A3A6B", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>{t("newChat")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
            {conversations.map((chat) => {
              const color = getAvatarColor(chat.technicianId);
              const initials = getInitials(chat.technicianName);
              return (
                <TouchableOpacity
                  key={chat.bookingId}
                  onPress={() => router.push(`/(customer)/chat/${chat.bookingId}`)}
                  style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
                >
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color, alignItems: "center", justifyContent: "center", marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 18 }}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>{chat.technicianName}</Text>
                    <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{chat.lastMessage}</Text>
                  </View>
                  <View style={{ alignItems: isRTL ? "flex-start" : "flex-end", gap: 6 }}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{formatTime(chat.lastMessageTime)}</Text>
                    {chat.unreadCount > 0 && (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#1A3A6B", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>{chat.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* New Chat Modal */}
      <Modal visible={showNewChat} transparent animationType="slide" onRequestClose={() => setShowNewChat(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingBottom: 40 }}>
            <View style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>اختر فنياً</Text>
              <TouchableOpacity onPress={() => setShowNewChat(false)} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {loadingTechs ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color="#1A3A6B" size="large" />
              </View>
            ) : technicians.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 15 }}>لا يوجد فنيون متاحون حالياً</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                {technicians.map((tech) => {
                  const color = getAvatarColor(tech.id);
                  const initials = getInitials(tech.full_name);
                  const isStarting = startingChat === tech.id;
                  return (
                    <TouchableOpacity
                      key={tech.id}
                      onPress={() => startChatWithTechnician(tech)}
                      disabled={!!startingChat}
                      activeOpacity={0.85}
                      style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F5F7FA", borderRadius: 14, padding: 14, marginBottom: 10 }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>{tech.full_name}</Text>
                        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{PROFESSION_LABELS[tech.profession] ?? tech.profession}</Text>
                        {tech.location ? <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>{tech.location}</Text> : null}
                      </View>
                      {isStarting ? (
                        <ActivityIndicator color="#1A3A6B" size="small" />
                      ) : (
                        <View style={{ backgroundColor: "#1A3A6B", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
                          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>محادثة</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}