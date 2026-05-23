import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  TrendingUp, DollarSign, Calendar, ArrowUpRight,
  Wallet, ArrowDownToLine,
} from "lucide-react-native";
import { useTranslation } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TRANSACTIONS = [
  { id: "1", customer: "Sarah Al Mansoori", service: "Pipe Leak Fix", date: "Today, 2:30 PM", amount: 250, initials: "SM", color: "#7C3AED" },
  { id: "2", customer: "Omar Abdullah", service: "Water Heater", date: "Yesterday, 10:00 AM", amount: 350, initials: "OA", color: "#059669" },
  { id: "3", customer: "Layla Hassan", service: "Drain Unclog", date: "May 18", amount: 180, initials: "LH", color: "#D97706" },
  { id: "4", customer: "Yusuf Al Marzouqi", service: "Full Bathroom Fix", date: "May 15", amount: 600, initials: "YM", color: "#0891B2" },
  { id: "5", customer: "Aisha Khalid", service: "Kitchen Pipe", date: "May 12", amount: 300, initials: "AK", color: "#DC2626" },
];

// Simple bar chart bars
const WEEKLY_DATA = [
  { day: "Mon", amount: 320 },
  { day: "Tue", amount: 180 },
  { day: "Wed", amount: 450 },
  { day: "Thu", amount: 260 },
  { day: "Fri", amount: 590 },
  { day: "Sat", amount: 720 },
  { day: "Sun", amount: 0 },
];
const MAX_BAR = Math.max(...WEEKLY_DATA.map((d) => d.amount), 1);

export default function EarningsScreen() {
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activePeriod, setActivePeriod] = useState(1);

  const PERIODS = [t("thisWeek"), t("thisMonth"), t("thisYear")];

  const totalBalance = 3240;
  const thisMonth = 1680;
  const growth = "+23%";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3A6B" />

      {/* Blue Header with balance */}
      <View style={{
        backgroundColor: "#1A3A6B",
        paddingTop: insets.top + 16,
        paddingBottom: 32,
        paddingHorizontal: 20,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(245,166,35,0.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Wallet size={20} color="#F5A623" />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>
              {t("earnings")}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              Your financial overview
            </Text>
          </View>
        </View>

        {/* Total Balance */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Total Balance
          </Text>
          <Text style={{ fontSize: 42, fontWeight: "900", color: "#F5A623" }}>
            AED {totalBalance.toLocaleString()}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
            <TrendingUp size={14} color="#10B981" />
            <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>{growth} this month</Text>
          </View>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={{
            backgroundColor: "#F5A623",
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: "#F5A623",
            shadowOpacity: 0.4,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <ArrowDownToLine size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 }}>
        {/* Stats Cards */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginBottom: 20 }}>
          <View style={{
            flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
            shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
            borderTopWidth: 3, borderTopColor: "#059669",
          }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Calendar size={18} color="#059669" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E" }}>AED {thisMonth.toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{t("thisMonth")}</Text>
          </View>

          <View style={{
            flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
            shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
            borderTopWidth: 3, borderTopColor: "#F5A623",
          }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <DollarSign size={18} color="#F5A623" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1A1A2E" }}>{TRANSACTIONS.length}</Text>
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>Completed Jobs</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginBottom: 20,
          shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A2E" }}>Weekly Overview</Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>AED</Text>
          </View>

          {/* Bar chart */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80 }}>
            {WEEKLY_DATA.map((item, i) => {
              const barHeight = item.amount > 0 ? Math.max((item.amount / MAX_BAR) * 72, 4) : 4;
              const isToday = i === 4; // Friday
              return (
                <View key={item.day} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <View style={{
                    width: "100%", height: barHeight,
                    backgroundColor: isToday ? "#F5A623" : item.amount > 0 ? "#1A3A6B" : "#E5E7EB",
                    borderRadius: 6,
                    opacity: item.amount === 0 ? 0.4 : 1,
                  }} />
                  <Text style={{ fontSize: 10, color: isToday ? "#F5A623" : "#9CA3AF", fontWeight: isToday ? "700" : "400" }}>
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Period Filter */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          marginBottom: 20,
        }}>
          {PERIODS.map((p, i) => (
            <TouchableOpacity
              key={p}
              onPress={() => setActivePeriod(i)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: activePeriod === i ? "#1A3A6B" : "transparent",
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "600",
                color: activePeriod === i ? "#FFFFFF" : "#6B7280",
              }}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions */}
        <Text style={{
          fontSize: 16, fontWeight: "700", color: "#1A1A2E",
          marginBottom: 12, textAlign: isRTL ? "right" : "left",
        }}>
          {t("recentTransactions")}
        </Text>

        {TRANSACTIONS.map((tx, index) => (
          <View
            key={tx.id}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 14,
              marginBottom: 10,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: 1,
              borderColor: "#F0F2F5",
            }}
          >
            <View style={{
              width: 46, height: 46, borderRadius: 23,
              backgroundColor: tx.color,
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
              borderWidth: 2, borderColor: "#FFFFFF",
              shadowColor: tx.color, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
            }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>{tx.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A2E", textAlign: isRTL ? "right" : "left" }}>
                {tx.customer}
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                {tx.service} · {tx.date}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
              <ArrowUpRight size={13} color="#059669" />
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#059669" }}>+AED {tx.amount}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}