import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  CalendarX,
  Users,
  Bell,
  Star,
  Search,
  Inbox,
  AlertCircle,
} from "lucide-react-native";

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  CalendarX,
  Users,
  Bell,
  Star,
  Search,
  Inbox,
  AlertCircle,
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
}

export default function EmptyState({
  icon = "Inbox",
  title,
  subtitle,
  actionLabel,
  onAction,
  iconColor = "#9CA3AF",
}: EmptyStateProps) {
  const IconComponent = ICON_MAP[icon] ?? Inbox;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 }}>
      {/* Icon container */}
      <View style={{
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      }}>
        <IconComponent size={44} color={iconColor} />
      </View>

      {/* Title */}
      <Text style={{
        fontSize: 18,
        fontWeight: "700",
        color: "#1A1A2E",
        textAlign: "center",
        marginBottom: 8,
      }}>
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle ? (
        <Text style={{
          fontSize: 14,
          color: "#6B7280",
          textAlign: "center",
          marginBottom: 24,
        }}>
          {subtitle}
        </Text>
      ) : null}

      {/* Action button */}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#1A3A6B",
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}