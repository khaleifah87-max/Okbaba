import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  opacity,
}: {
  width: number;
  height: number;
  borderRadius?: number;
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "#E5E7EB",
        opacity,
      }}
    />
  );
}

export function TechnicianCardSkeleton() {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animValue]);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View
      style={{
        width: 180,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        gap: 8,
      }}
    >
      {/* Avatar */}
      <SkeletonBox width={56} height={56} borderRadius={28} opacity={opacity} />
      {/* Name */}
      <SkeletonBox width={120} height={14} opacity={opacity} />
      {/* Profession */}
      <SkeletonBox width={80} height={12} opacity={opacity} />
      {/* Stars row */}
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
        <SkeletonBox width={60} height={12} opacity={opacity} />
        <SkeletonBox width={30} height={12} opacity={opacity} />
      </View>
      {/* Location */}
      <SkeletonBox width={100} height={12} opacity={opacity} />
      {/* Book button area */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <SkeletonBox width={70} height={14} opacity={opacity} />
        <SkeletonBox width={52} height={30} borderRadius={8} opacity={opacity} />
      </View>
    </View>
  );
}

interface TechnicianSkeletonListProps {
  count?: number;
}

export function TechnicianSkeletonList({ count = 4 }: TechnicianSkeletonListProps) {
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <TechnicianCardSkeleton key={idx} />
      ))}
    </View>
  );
}