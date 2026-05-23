import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ArrowLeft, SendHorizonal } from "lucide-react-native";
import { MessageCircle } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string | null;
  read?: boolean;
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getDateLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const msgDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDay(msgDate, today)) return "Today";
    if (isSameDay(msgDate, yesterday)) return "Yesterday";
    return msgDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function TechnicianChatDetailScreen() {
  const router = useRouter();
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState("Customer");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at, read")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setMessages(data as Message[]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    supabase
      .from("bookings")
      .select(`
        customer_id,
        profiles!bookings_customer_id_fkey (full_name)
      `)
      .eq("id", bookingId)
      .single()
      .then(({ data }) => {
        if (data) {
          setOtherUserId((data as any).customer_id);
          setOtherUserName((data as any).profiles?.full_name ?? "Customer");
        }
      });
  }, [bookingId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`tech_messages_${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !user || !bookingId) return;
    setSending(true);
    setInputText("");
    try {
      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        content: text,
        read: false,
      });
      if (error) {
        setInputText(text);
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // Build messages with date separators
  const messagesWithSeparators: Array<
    { type: "message"; data: Message } | { type: "separator"; label: string; key: string }
  > = [];
  let lastDateLabel = "";
  for (const msg of messages) {
    const label = getDateLabel(msg.created_at);
    if (label && label !== lastDateLabel) {
      messagesWithSeparators.push({ type: "separator", label, key: `sep_${label}` });
      lastDateLabel = label;
    }
    messagesWithSeparators.push({ type: "message", data: msg });
  }

  const initials = getInitials(otherUserName);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#1A3A6B",
          paddingTop: Platform.OS === "android" ? 44 : 8,
          paddingBottom: 14,
          paddingHorizontal: 16,
          flexDirection: "row",
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

        {/* Avatar */}
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "#3B82F6",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.4)",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>{initials}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>{otherUserName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" }} />
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Online</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#1A3A6B" size="large" />
            <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 12 }}>Loading messages…</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 4 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#EBF0FA",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <MessageCircle size={32} color="#1A3A6B" />
                </View>
                <Text style={{ color: "#9CA3AF", fontSize: 15, fontWeight: "600" }}>No messages yet</Text>
                <Text style={{ color: "#C4C9D4", fontSize: 13, marginTop: 4 }}>Start the conversation!</Text>
              </View>
            )}

            {messagesWithSeparators.map((item) => {
              if (item.type === "separator") {
                return (
                  <View key={item.key} style={{ alignItems: "center", marginVertical: 12 }}>
                    <View
                      style={{
                        backgroundColor: "rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "600" }}>{item.label}</Text>
                    </View>
                  </View>
                );
              }

              const msg = item.data;
              const isMe = msg.sender_id === user?.id;
              const isUnread = !isMe && !msg.read;

              return (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    maxWidth: "78%",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: isMe ? "#1A3A6B" : "#FFFFFF",
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      shadowColor: "#000",
                      shadowOpacity: isMe ? 0.12 : 0.07,
                      shadowRadius: 6,
                      elevation: isMe ? 3 : 2,
                      borderWidth: isUnread ? 1.5 : 0,
                      borderColor: isUnread ? "#F5A623" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: isMe ? "#FFFFFF" : "#1A1A2E",
                        fontSize: 15,
                        fontWeight: isUnread ? "600" : "400",
                      }}
                    >
                      {msg.content}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                      marginTop: 3,
                      textAlign: isMe ? "right" : "left",
                      paddingHorizontal: 4,
                    }}
                  >
                    {formatTime(msg.created_at)}
                    {isMe && "  ✓✓"}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 12,
            paddingVertical: 10,
            paddingBottom: Platform.OS === "ios" ? 20 : 12,
            borderTopWidth: 1,
            borderTopColor: "#F0F2F5",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#F5F7FA",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingHorizontal: 16,
              paddingVertical: 8,
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              style={{
                fontSize: 15,
                color: "#1A1A2E",
                maxHeight: 100,
              }}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending || !inputText.trim()}
            activeOpacity={0.75}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: inputText.trim() ? "#F5A623" : "#E5E7EB",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: inputText.trim() ? "#F5A623" : "transparent",
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: inputText.trim() ? 4 : 0,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <SendHorizonal size={20} color={inputText.trim() ? "#FFFFFF" : "#9CA3AF"} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}