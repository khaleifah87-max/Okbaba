import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  BarChart2,
  Settings,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, loading } = useAuth();

  // Protect admin routes — redirect non-admins to customer area
  if (!loading && profile && profile.user_type !== "admin") {
    return <Redirect href="/(customer)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F5A623",
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
          title: "لوحة التحكم",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="technicians"
        options={{
          title: "الفنيون",
          tabBarIcon: ({ color, size }) => <Wrench size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "البلاغات",
          tabBarIcon: ({ color, size }) => <AlertTriangle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "الإحصائيات",
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="send-notification" options={{ href: null }} />
      <Tabs.Screen name="user-detail" options={{ href: null }} />
    </Tabs>
  );
}