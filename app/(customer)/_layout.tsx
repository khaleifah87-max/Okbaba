import { Tabs } from "expo-router";
import { House, Search, CalendarCheck, MessageCircle, User, Settings2 } from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CustomerLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A3A6B",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("search"),
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("bookings"),
          tabBarIcon: ({ color, size }) => <CalendarCheck size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("chat"),
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ color, size }) => <Settings2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="booking/new" options={{ href: null }} />
      <Tabs.Screen name="technician/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="review/[bookingId]" options={{ href: null }} />
      <Tabs.Screen name="tracking/[bookingId]" options={{ href: null }} />
    </Tabs>
  );
}