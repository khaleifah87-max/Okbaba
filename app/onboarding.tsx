import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Wrench, CalendarCheck, BadgeCheck } from "lucide-react-native";
import OkBabaLogo from "@/components/OkBabaLogo";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "@/lib/i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const ONBOARDING_KEY = "onboarding_seen";

const SLIDES = [
  {
    id: "1",
    title: "Find Trusted Technicians",
    titleAr: "ابحث عن فنيين موثوقين",
    subtitle: "Book electricians, plumbers, AC technicians and more in the UAE",
    Icon: Wrench,
    iconColor: "#1A3A6B",
    bgColor: "#EBF0FA",
    dotColor: "#1A3A6B",
  },
  {
    id: "2",
    title: "Fast & Reliable Bookings",
    titleAr: "حجوزات سريعة وموثوقة",
    subtitle: "Get your job done same-day with verified professionals",
    Icon: CalendarCheck,
    iconColor: "#F5A623",
    bgColor: "#FEF9EE",
    dotColor: "#F5A623",
  },
  {
    id: "3",
    title: "Are You a Technician?",
    titleAr: "هل أنت فني؟",
    subtitle: "Join Ok Baba, get 45 days free, grow your business",
    Icon: BadgeCheck,
    iconColor: "#1A3A6B",
    bgColor: "#EBF0FA",
    dotColor: "#1A3A6B",
  },
];

export default function OnboardingScreen() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isRTL = language === "ar" || language === "ur";
  const isLastSlide = currentIndex === SLIDES.length - 1;

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/auth/welcome");
  };

  const goNext = () => {
    if (isLastSlide) {
      finishOnboarding();
    } else {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const onMomentumScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => {
    const Icon = item.Icon;
    const title = (language === "ar") ? item.titleAr : item.title;

    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        {/* Icon with decorative circles */}
        <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 48 }}>
          {/* Outer decorative circle */}
          <View style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: item.bgColor,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}>
            {/* Inner decorative circle */}
            <View style={{
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: item.iconColor + "15",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Icon size={80} color={item.iconColor} />
            </View>
          </View>
          {/* Decorative dots */}
          <View style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: item.dotColor + "40",
          }} />
          <View style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: item.dotColor + "60",
          }} />
        </View>

        {/* Title */}
        <Text style={{
          fontSize: 26,
          fontWeight: "800",
          color: "#1A1A2E",
          textAlign: "center",
          marginBottom: 16,
        }}>
          {title}
        </Text>

        {/* Subtitle */}
        <Text style={{
          fontSize: 16,
          color: "#6B7280",
          textAlign: "center",
          paddingHorizontal: 8,
        }}>
          {item.subtitle}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Skip button */}
        <View style={{ flexDirection: "row", justifyContent: isRTL ? "flex-start" : "flex-end", paddingHorizontal: 20, paddingTop: 8 }}>
          {/* Brand logo at top */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <OkBabaLogo width={120} />
          </View>
          <TouchableOpacity onPress={finishOnboarding} activeOpacity={0.7}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#6B7280" }}>{t("skip")}</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={renderSlide}
          style={{ flex: 1 }}
        />

        {/* Bottom: dots + button */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          {/* Dot indicators */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 28 }}>
            {SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={{
                  width: idx === currentIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: idx === currentIndex ? "#1A3A6B" : "#D1D5DB",
                }}
              />
            ))}
          </View>

          {/* Next / Get Started button */}
          <TouchableOpacity
            onPress={goNext}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#1A3A6B",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              shadowColor: "#1A3A6B",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>
              {isLastSlide ? t("getStarted") : "Next →"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}