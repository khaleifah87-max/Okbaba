import React, { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";

const AVATAR_COLORS = ["#7C3AED", "#059669", "#D97706", "#0891B2", "#DC2626", "#1A3A6B"];
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
  customerId: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
};

async function fetchTechConversations(userId: string): Promise<ChatConversation[]> {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_id,
      profiles!bookings_customer_id_fkey (full_name)
    `)
    .eq("technician_id", userId)
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
      customerId: booking.customer_id,
      customerName: booking.profiles?.full_name ?? "Customer",
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

export default function TechnicianChatScreen() {
  const { t, isRTL } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const { data: conversations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["tech_conversations", user?.id],
    queryFn: () => fetchTechConversations(user!.id),
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>{t("chat")}</Text>
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <MessageCircle size={48} color="#9CA3AF" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280" }}>No conversations yet</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
            {conversations.map((chat) => {
              const color = getAvatarColor(chat.customerId);
              const initials = getInitials(chat.customerName);
              return (
                <TouchableOpacity
                  key={chat.bookingId}
                  onPress={() => router.push(`/(technician)/chat/${chat.bookingId}` as any)}
                  style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
                >
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color, alignItems: "center", justifyContent: "center", marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 18 }}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>{chat.customerName}</Text>
                    <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{chat.lastMessage}</Text>
                  </View>
                  <View style={{ alignItems: isRTL ? "flex-start" : "flex-end", gap: 6 }}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{formatTime(chat.lastMessageTime)}</Text>
                    {chat.unreadCount > 0 && (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#F5A623", alignItems: "center", justifyContent: "center" }}>
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
    </View>
  );
}